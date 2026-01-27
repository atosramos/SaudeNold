from fastapi import FastAPI, HTTPException, Depends, Security, status, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import Float
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from config.redis_config import get_redis_connection_string, is_redis_available, reset_redis_connection
import os
import logging
import hashlib
import secrets
from typing import Optional
from dotenv import load_dotenv
from database import SessionLocal, engine, Base
import models
import schemas
from auth import (
    authenticate_user,
    create_access_token,
    get_user_from_token,
    decode_token_payload,
    hash_password,
    create_refresh_token,
    verify_refresh_token,
    revoke_refresh_token,
    revoke_all_refresh_tokens,
    create_email_verification_token,
    create_password_reset_token,
    hash_token,
    cleanup_expired_refresh_tokens,
    cleanup_revoked_refresh_tokens,
    REQUIRE_EMAIL_VERIFICATION,
    ALLOW_EMAIL_DEBUG,
)
from services.token_blacklist import add_to_blacklist, is_blacklisted
from services.csrf_service import generate_and_store_csrf_token
from services.encryption_service import EncryptionService
from services.rate_limit_service import (
    check_email_rate_limit,
    reset_email_rate_limit,
    check_user_email_daily_limit,
)
from middleware.validation_middleware import ValidationMiddleware
from routes.audit_routes import router as compliance_router
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, ec, rsa
from cryptography.hazmat.primitives.serialization import load_pem_public_key
import base64
import textwrap
from email_service import send_email, smtp_configured
from session_service import (
    upsert_session,
    revoke_sessions,
    mark_session_trusted,
    mark_session_blocked,
    is_device_blocked,
    log_login_event
)
from notification_service import (
    send_login_notification,
    send_login_blocked_alert,
    send_failed_login_alert,
    send_suspicious_login_alert,
    send_mass_download_alert,
    send_session_revoked_alert
)
from session_tokens import (
    create_session_action_token,
    verify_session_action_token,
    create_biometric_challenge_token,
    verify_biometric_challenge_token
)
from login_security import (
    record_failed_login,
    clear_failed_logins,
    get_failed_attempts_count,
    has_suspicious_login_pattern,
    MAX_ATTEMPTS,
    WINDOW_MINUTES,
    SUSPICIOUS_LOGIN_WINDOW_MINUTES
)
from download_security import (
    record_download,
    get_recent_download_count,
    DOWNLOAD_WINDOW_MINUTES,
    DOWNLOAD_THRESHOLD
)
import asyncio
from ocr_service import perform_ocr
from data_extraction import extract_data_from_ocr_text
from license_generator import generate_license_key, validate_license_key, LICENSE_DURATIONS
from datetime import datetime as dt, timedelta, timezone
from alert_service import alert_service, AlertType

# Carregar variáveis de ambiente do .env
load_dotenv()

# Whitelist de emails para ignorar detecção de login suspeito (usuários de teste)
SUSPICIOUS_LOGIN_WHITELIST = os.getenv("SUSPICIOUS_LOGIN_WHITELIST", "").split(",") if os.getenv("SUSPICIOUS_LOGIN_WHITELIST") else []
SUSPICIOUS_LOGIN_WHITELIST = [email.strip().lower() for email in SUSPICIOUS_LOGIN_WHITELIST if email.strip()]

# Configurar Sentry (se habilitado)
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=0.1,  # 10% das transacoes
            environment=os.getenv("ENVIRONMENT", "production"),
        )
        logging.info("Sentry configurado com sucesso")
    except ImportError:
        logging.warning("Sentry SDK nao instalado. Execute: pip install sentry-sdk")
    except Exception as e:
        logging.error(f"Erro ao configurar Sentry: {str(e)}")

# Configurar logging de segurança
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
security_logger = logging.getLogger("security")
logger = logging.getLogger(__name__)

# Criar tabelas (apenas se não estiver em modo de teste)
# Em testes, as tabelas são criadas pelo conftest.py
if not os.getenv("TESTING"):
    try:
        from migrate_family_profiles import migrate as migrate_family_profiles
        migrate_family_profiles()
        logging.info("Migracao de perfis familiares concluida.")
    except Exception as exc:
        logging.error(f"Falha ao migrar perfis familiares: {exc}")
        raise
    Base.metadata.create_all(bind=engine)

app = FastAPI(title="SaudeNold API", version="1.0.0")

# Adicionar middleware CSRF (após criar app, antes de rotas)
from middleware.csrf_middleware import CSRFMiddleware
from middleware.validation_middleware import ValidationMiddleware
app.add_middleware(CSRFMiddleware)
app.add_middleware(ValidationMiddleware)

REFRESH_TOKEN_CLEANUP_MINUTES = int(os.getenv("REFRESH_TOKEN_CLEANUP_MINUTES", "60"))
DISABLE_TOKEN_CLEANUP = os.getenv("DISABLE_TOKEN_CLEANUP", "false").lower() == "true"

# Rate Limiting
def get_rate_limit_key(request: Request) -> str:
    ip = get_remote_address(request)
    if ip in {"127.0.0.1", "::1"}:
        return "local-bypass"
    return ip

# Resetar conexão Redis para garantir que tente conectar novamente
reset_redis_connection()
redis_host = os.getenv('REDIS_HOST', 'localhost')
redis_port = os.getenv('REDIS_PORT', '6379')
security_logger.info(f"Tentando conectar ao Redis em {redis_host}:{redis_port}")

# Configurar Limiter com Redis se disponível, caso contrário usar memória
try:
    # Forçar tentativa de conexão antes de verificar disponibilidade
    from config.redis_config import get_redis_client
    test_client = get_redis_client()
    if test_client:
        # Verificar se realmente funciona
        try:
            test_client.ping()
            redis_uri = get_redis_connection_string()
            limiter = Limiter(key_func=get_rate_limit_key, storage_uri=redis_uri)
            security_logger.info(f"Rate limiting usando Redis em {redis_host}:{redis_port}")
        except Exception as ping_error:
            security_logger.warning(f"Redis ping falhou após conexão: {ping_error}. Usando memória.")
            limiter = Limiter(key_func=get_rate_limit_key)
    else:
        limiter = Limiter(key_func=get_rate_limit_key)
        security_logger.warning(f"Rate limiting usando memória (Redis não disponível em {redis_host}:{redis_port})")
except Exception as e:
    security_logger.warning(f"Erro ao configurar Redis para rate limiting: {e}. Usando memória.")
    limiter = Limiter(key_func=get_rate_limit_key)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    security_logger.error(f"Erro de validacao em {request.url.path}: {exc.errors()}")
    # Converter erros para formato serializável (ValueError precisa ser convertido para string)
    errors = []
    for error in exc.errors():
        error_copy = error.copy()
        # Converter ValueError em string se presente no contexto
        if 'ctx' in error_copy and 'error' in error_copy['ctx']:
            ctx_error = error_copy['ctx']['error']
            if isinstance(ctx_error, ValueError):
                error_copy['ctx']['error'] = str(ctx_error)
        errors.append(error_copy)
    return JSONResponse(
        status_code=422,
        content={"detail": errors, "body": str(exc.body) if hasattr(exc, 'body') else None}
    )

# CORS - Restringir origins permitidas
default_origins = [
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:8082",
    "exp://*",
]
env_origins = os.getenv("CORS_ORIGINS", "")
raw_origins = default_origins + ([origin for origin in env_origins.split(",")] if env_origins else [])
cors_origins = []
for origin in raw_origins:
    cleaned = origin.strip()
    if cleaned and cleaned not in cors_origins:
        cors_origins.append(cleaned)

cors_origin_regex = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"^https?://localhost(:\d+)?$|"
    r"^https?://127\.0\.0\.1(:\d+)?$|"
    r"^https?://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$|"
    r"^https?://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$|"
    r"^https?://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$|"
    r"^exp://.*$"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    path = request.url.path or ""
    if path.startswith("/docs") or path.startswith("/redoc") or path.startswith("/openapi.json"):
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data:; "
            "font-src 'self' https://cdn.jsdelivr.net"
        )
    else:
        response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response


async def refresh_token_cleanup_loop():
    if os.getenv("TESTING"):
        return
    while True:
        await asyncio.sleep(REFRESH_TOKEN_CLEANUP_MINUTES * 60)
        try:
            db = SessionLocal()
            removed_expired = cleanup_expired_refresh_tokens(db)
            removed_revoked = cleanup_revoked_refresh_tokens(db)
            if removed_expired or removed_revoked:
                security_logger.info(
                    f"Cleanup refresh tokens: expirados {removed_expired}, revogados {removed_revoked}"
                )
        except Exception as e:
            security_logger.error(f"Erro no cleanup de refresh tokens: {str(e)}")
        finally:
            try:
                db.close()
            except Exception:
                pass


@app.on_event("startup")
async def start_background_tasks():
    if not DISABLE_TOKEN_CLEANUP:
        asyncio.create_task(refresh_token_cleanup_loop())

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Autenticação simples baseada em API Key
security = HTTPBearer()
API_KEY = os.getenv("API_KEY", secrets.token_urlsafe(32))

def verify_api_key(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    """Verifica a API key fornecida"""
    token = credentials.credentials
    if token == API_KEY:
        return token

    # Permitir JWT valido como autenticacao
    try:
        user = get_user_from_token(db, token)
        payload = decode_token_payload(token)
        device_id = payload.get("device_id")
        user_id = payload.get("sub")
        if device_id and user_id:
            session = db.query(models.UserSession).filter(
                models.UserSession.user_id == int(user_id),
                models.UserSession.device_id == device_id,
                models.UserSession.revoked_at.is_(None)
            ).first()
            if not session or session.blocked:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
        profile_id = request.headers.get("X-Profile-Id") if request else None
        if profile_id and user.family_id:
            try:
                profile_id_int = int(profile_id)
            except ValueError:
                security_logger.warning("Profile ID invalido no header, ignorando para validacao")
            else:
                profile = db.query(models.FamilyProfile).filter(
                    models.FamilyProfile.id == profile_id_int,
                    models.FamilyProfile.family_id == user.family_id
                ).first()
                if not profile:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Perfil nao autorizado")
        return token
    except HTTPException:
        security_logger.warning("Tentativa de acesso com token invalido")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
            headers={"WWW-Authenticate": "Bearer"},
        )

def safe_db_commit(db: Session):
    """Helper function para fazer commit seguro com tratamento de exceções"""
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        security_logger.error(f"Database integrity error: {str(e)}")
        raise HTTPException(status_code=400, detail="Database integrity error. Check your data.")
    except SQLAlchemyError as e:
        db.rollback()
        security_logger.error(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# Funções de validação e sanitização
def validate_base64_image_size(base64_string: Optional[str], max_size_mb: int = 5) -> bool:
    """Valida o tamanho de uma imagem base64"""
    if not base64_string:
        return True
    
    # Remover prefixo data:image se existir
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    # Calcular tamanho aproximado (base64 é ~33% maior que o original)
    size_bytes = len(base64_string) * 3 / 4
    size_mb = size_bytes / (1024 * 1024)
    
    if size_mb > max_size_mb:
        security_logger.warning(f"Tentativa de upload de imagem muito grande: {size_mb:.2f}MB")
        return False
    return True


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitiza strings removendo caracteres perigosos e limitando tamanho"""
    if not value:
        return value
    # Remover caracteres de controle e limitar tamanho
    sanitized = ''.join(char for char in value if ord(char) >= 32 or char in '\n\r\t')
    # Aplicar limite de tamanho após sanitização
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    return sanitized.strip()


MAX_FAMILY_PROFILES = int(os.getenv("MAX_FAMILY_PROFILES", "10"))

# Import RBAC utilities
try:
    from utils.rbac import ACCOUNT_PERMISSIONS, build_permissions
    from services.permission_service import check_permission, check_profile_access
except ImportError:
    # Fallback for backward compatibility
    ACCOUNT_PERMISSIONS = {
        "family_admin": {
            "can_manage_profiles": True,
            "can_view_family_data": True,
            "can_edit_family_data": True
        },
        "adult_member": {
            "can_manage_profiles": False,
            "can_view_family_data": True,
            "can_edit_family_data": True
        },
        "child": {
            "can_manage_profiles": False,
            "can_view_family_data": False,
            "can_edit_family_data": False
        },
        "elder_under_care": {
            "can_manage_profiles": False,
            "can_view_family_data": True,
            "can_edit_family_data": False
        }
    }
    
    def build_permissions(account_type: str) -> dict:
        return ACCOUNT_PERMISSIONS.get(account_type, {})
    
    def check_permission(user, action, resource_owner_id, db, resource_type=None):
        # Fallback to old ensure_profile_access
        from fastapi import HTTPException
        ensure_profile_access(user, db, resource_owner_id, 
                            write_access=(action == "edit"), 
                            delete_access=(action == "delete"))
        return True
    
    def check_profile_access(user, profile_id, db, write_access=False, delete_access=False):
        ensure_profile_access(user, db, profile_id, write_access, delete_access)
        return True


def ensure_family_for_user(db: Session, user: models.User) -> models.Family:
    if user.family_id:
        family = db.query(models.Family).filter(models.Family.id == user.family_id).first()
        if family:
            return family
    family_name = f"Familia de {user.email.split('@')[0]}"
    family = models.Family(name=family_name, admin_user_id=user.id)
    db.add(family)
    safe_db_commit(db)
    db.refresh(family)
    user.family_id = family.id
    user.account_type = user.account_type or "family_admin"
    safe_db_commit(db)
    return family


def ensure_admin_profile(db: Session, user: models.User, family: models.Family) -> models.FamilyProfile:
    profile = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == family.id,
        models.FamilyProfile.account_type == "family_admin",
        models.FamilyProfile.created_by == user.id
    ).first()
    if profile:
        return profile
    profile = models.FamilyProfile(
        family_id=family.id,
        name=user.email.split('@')[0],
        account_type="family_admin",
        created_by=user.id,
        permissions=build_permissions("family_admin"),
        allow_quick_access=False
    )
    db.add(profile)
    safe_db_commit(db)
    db.refresh(profile)
    return profile


def calculate_age(birth_date: dt) -> int:
    today = dt.now().date()
    return today.year - birth_date.date().year - (
        (today.month, today.day) < (birth_date.date().month, birth_date.date().day)
    )


# Helpers de sessao/dispositivo
def get_request_meta(request: Request):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip_address, user_agent


def get_bearer_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("authorization") or ""
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return None


def get_profile_context(request: Request, db: Session) -> Optional[int]:
    token = get_bearer_token(request)
    profile_id_header = request.headers.get("X-Profile-Id") if request else None
    
    # Em modo de teste, aceitar profile_id do header mesmo com API_KEY
    if os.getenv("TESTING") == "1" and token == API_KEY and profile_id_header:
        try:
            profile_id = int(profile_id_header)
            # Verificar se perfil existe
            profile = db.query(models.FamilyProfile).filter(
                models.FamilyProfile.id == profile_id
            ).first()
            if profile:
                return profile_id
        except ValueError:
            pass
    
    if not token or token == API_KEY:
        return None
    user = get_user_from_token(db, token)
    if not user or not user.family_id:
        return None
    profile_id = None
    if profile_id_header:
        try:
            profile_id = int(profile_id_header)
        except ValueError:
            profile_id = None
    if profile_id:
        profile = db.query(models.FamilyProfile).filter(
            models.FamilyProfile.id == profile_id,
            models.FamilyProfile.family_id == user.family_id
        ).first()
        if not profile:
            # CRÍTICO: Verificar se há FamilyDataShare que permite acesso a este perfil
            user_profile = db.query(models.FamilyProfile).filter(
                models.FamilyProfile.family_id == user.family_id,
                models.FamilyProfile.created_by == user.id
            ).first()
            if user_profile:
                data_share = db.query(models.FamilyDataShare).filter(
                    models.FamilyDataShare.family_id == user.family_id,
                    models.FamilyDataShare.from_profile_id == profile_id,  # Perfil que compartilha
                    models.FamilyDataShare.to_profile_id == user_profile.id,  # Perfil do usuário atual
                    models.FamilyDataShare.revoked_at.is_(None)
                ).first()
                if data_share:
                    # Há compartilhamento, permitir acesso
                    return profile_id
            raise HTTPException(status_code=403, detail="Perfil nao autorizado")
        return profile_id

    profiles = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == user.family_id
    ).all()
    if len(profiles) == 1:
        return profiles[0].id

    admin_profile = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == user.family_id,
        models.FamilyProfile.account_type == "family_admin",
        models.FamilyProfile.created_by == user.id
    ).first()
    if admin_profile:
        return admin_profile.id

    raise HTTPException(status_code=400, detail="Profile ID requerido")


def check_user_has_active_pro_license(db: Session, user: models.User) -> bool:
    """
    Verifica se o usuário tem uma licença PRO ativa.
    Retorna True se houver licença ativa e não expirada, False caso contrário.
    """
    try:
        now = dt.now(timezone.utc)
        active_license = db.query(models.License).filter(
            models.License.user_id == str(user.id),
            models.License.is_active == True,
            models.License.expiration_date > now
        ).first()
        
        if active_license:
            security_logger.info(f"Usuário {user.id} tem licença PRO ativa (expira em {active_license.expiration_date})")
            return True
        
        security_logger.info(f"Usuário {user.id} não tem licença PRO ativa")
        return False
    except Exception as e:
        security_logger.error(f"Erro ao verificar licença PRO do usuário {user.id}: {str(e)}", exc_info=True)
        return False


def ensure_profile_access(user: models.User, db: Session, profile_id: int, write_access: bool = False, delete_access: bool = False) -> None:
    """
    Backward compatibility wrapper for check_profile_access.
    Now uses the centralized permission service.
    """
    # Em modo de teste, permitir acesso se perfil existe
    if os.getenv("TESTING") == "1":
        profile = db.query(models.FamilyProfile).filter(
            models.FamilyProfile.id == profile_id
        ).first()
        if profile:
            return  # Permitir acesso em modo de teste
    
    # Use centralized permission service
    check_profile_access(user, profile_id, db, write_access, delete_access)


def get_request_user(request: Request, db: Session) -> Optional[models.User]:
    token = get_bearer_token(request)
    if not token:
        return None
    # Em modo de teste, aceitar API_KEY como autenticação válida
    # Criar ou buscar usuário de teste
    if os.getenv("TESTING") == "1" and token == API_KEY:
        # Buscar ou criar usuário de teste
        test_user = db.query(models.User).filter(models.User.email == "test@test.com").first()
        if not test_user:
            from auth import hash_password
            test_user = models.User(
                email="test@test.com",
                password_hash=hash_password("test"),
                is_active=True,
                email_verified=True
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
        return test_user
    if token == API_KEY:
        return None
    return get_user_from_token(db, token)


# ========== AUTENTICACAO ==========
@app.post("/api/auth/register", response_model=schemas.AuthTokenResponse)
@limiter.limit("3/hour")
def register_user(request: Request, user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    email = user_data.email.strip().lower()
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        security_logger.warning(f"Tentativa de cadastro com email existente: {email}")
        raise HTTPException(status_code=400, detail="Email ja cadastrado")

    verification_token = create_email_verification_token()
    new_user = models.User(
        email=email,
        password_hash=hash_password(user_data.password),
        is_active=True,
        role="family_admin",
        account_type="family_admin",
        email_verified=False,
        email_verification_token_hash=hash_token(verification_token),
        email_verification_sent_at=dt.now(timezone.utc)
    )
    db.add(new_user)
    safe_db_commit(db)
    db.refresh(new_user)

    family = ensure_family_for_user(db, new_user)
    ensure_admin_profile(db, new_user, family)

    # Verificar limite diário de emails por usuário (10 emails/dia)
    is_email_allowed, email_remaining_seconds = check_user_email_daily_limit(
        user_id=new_user.id,
        max_emails=10
    )
    
    if not is_email_allowed:
        hours_remaining = email_remaining_seconds // 3600 if email_remaining_seconds else 24
        security_logger.warning(f"Limite diário de emails excedido para novo usuário {new_user.id}")
        # Não bloquear registro, apenas não enviar email
        logger.warning(f"Registro concluído mas email não enviado devido ao limite diário")
    elif smtp_configured():
        frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
        link = f"{frontend_url}/auth/verify?email={email}&token={verification_token}" if frontend_url else None
        email_body = (
            "Seu token de verificacao de email:\n"
            f"{verification_token}\n\n"
            + (f"Acesse: {link}\n" if link else "")
        )
        send_email(email, "Verificacao de email - SaudeNold", email_body)
    security_logger.info(f"Token de verificacao gerado para {email}")

    if REQUIRE_EMAIL_VERIFICATION:
        return schemas.AuthTokenResponse(
            access_token=None,
            refresh_token=None,
            user=new_user,
            verification_required=True,
            verification_token=verification_token if ALLOW_EMAIL_DEBUG else None
        )

    device_id = user_data.device.device_id if user_data.device else None
    ip_address, user_agent = get_request_meta(request)
    if device_id:
        session, is_new = upsert_session(db, new_user.id, user_data.device, ip_address, user_agent)
        if is_new:
            action_token = create_session_action_token(new_user.id, device_id, "block", expires_minutes=30)
            base_url = str(request.base_url).rstrip("/")
            block_link = f"{base_url}/api/auth/sessions/block-link?token={action_token}"
            send_login_notification(
                new_user.email,
                session.device_name if session else None,
                session.os_name if session else None,
                session.os_version if session else None,
                session.ip_address if session else None,
                session.user_agent if session else None,
                block_link=block_link,
                push_token=session.push_token if session else None,
                location_lat=session.location_lat if session else None,
                location_lon=session.location_lon if session else None,
                location_accuracy_km=session.location_accuracy_km if session else None
            )
    log_login_event(db, new_user.id, device_id, ip_address, user_agent)

    token_payload = {
        "sub": str(new_user.id),
        "email": new_user.email,
        "role": new_user.role,
        "family_id": new_user.family_id,
        "account_type": new_user.account_type
    }
    if device_id:
        token_payload["device_id"] = device_id
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(db, new_user.id, device_id)
    return schemas.AuthTokenResponse(access_token=access_token, refresh_token=refresh_token, user=new_user)


@app.post("/api/auth/login", response_model=schemas.AuthTokenResponse)
@limiter.limit("5/15minute")
def login_user(request: Request, login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    email = login_data.email.strip().lower()
    ip_address, user_agent = get_request_meta(request)
    failed_count = get_failed_attempts_count(db, email, ip_address, WINDOW_MINUTES)
    if failed_count >= MAX_ATTEMPTS:
        user_for_alert = db.query(models.User).filter(models.User.email == email).first()
        if user_for_alert:
            send_login_blocked_alert(user_for_alert.email, ip_address, user_agent)
        raise HTTPException(
            status_code=429,
            detail="Muitas tentativas. Tente novamente em 15 minutos."
        )

    user = authenticate_user(db, email, login_data.password)
    if not user:
        record_failed_login(db, email, ip_address, user_agent)
        failed_after = get_failed_attempts_count(db, email, ip_address, WINDOW_MINUTES)
        if failed_after == 3:
            user_for_alert = db.query(models.User).filter(models.User.email == email).first()
            if user_for_alert:
                send_failed_login_alert(user_for_alert.email, failed_after, WINDOW_MINUTES, ip_address, user_agent)
        security_logger.warning(f"Tentativa de login falhou para {login_data.email}")
        raise HTTPException(status_code=401, detail="Email ou senha invalidos")
    if REQUIRE_EMAIL_VERIFICATION and not user.email_verified:
        raise HTTPException(status_code=403, detail="Email nao verificado")

    if not user.family_id:
        family = ensure_family_for_user(db, user)
        ensure_admin_profile(db, user, family)

    user.last_login_at = dt.now(timezone.utc)
    safe_db_commit(db)
    db.refresh(user)

    clear_failed_logins(db, email, ip_address)
    device_id = login_data.device.device_id if login_data.device else None
    if device_id and is_device_blocked(db, user.id, device_id):
        raise HTTPException(status_code=403, detail="Dispositivo bloqueado")
    if device_id:
        session, is_new = upsert_session(db, user.id, login_data.device, ip_address, user_agent)
        if is_new:
            action_token = create_session_action_token(user.id, device_id, "block", expires_minutes=30)
            base_url = str(request.base_url).rstrip("/")
            block_link = f"{base_url}/api/auth/sessions/block-link?token={action_token}"
            send_login_notification(
                user.email,
                session.device_name if session else None,
                session.os_name if session else None,
                session.os_version if session else None,
                session.ip_address if session else None,
                session.user_agent if session else None,
                block_link=block_link,
                push_token=session.push_token if session else None,
                location_lat=session.location_lat if session else None,
                location_lon=session.location_lon if session else None,
                location_accuracy_km=session.location_accuracy_km if session else None
            )
    log_login_event(db, user.id, device_id, ip_address, user_agent)
    # Verificar login suspeito apenas se o email não estiver na whitelist
    if user.email.lower() not in SUSPICIOUS_LOGIN_WHITELIST:
        if has_suspicious_login_pattern(db, user.id, ip_address, SUSPICIOUS_LOGIN_WINDOW_MINUTES):
            security_logger.warning(f"Login suspeito para {user.email} (IP {ip_address})")
            send_suspicious_login_alert(user.email, ip_address, user_agent)

    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "family_id": user.family_id,
        "account_type": user.account_type
    }
    if device_id:
        token_payload["device_id"] = device_id
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(db, user.id, device_id)
    return schemas.AuthTokenResponse(access_token=access_token, refresh_token=refresh_token, user=user)


@app.post("/api/auth/refresh", response_model=schemas.RefreshTokenResponse)
@limiter.limit("10/15minute")
def refresh_token(request: Request, data: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    token_record = verify_refresh_token(db, data.refresh_token)
    if not token_record:
        raise HTTPException(status_code=401, detail="Refresh token invalido")

    user = db.query(models.User).filter(models.User.id == token_record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario invalido")

    if token_record.device_id:
        session = db.query(models.UserSession).filter(
            models.UserSession.user_id == user.id,
            models.UserSession.device_id == token_record.device_id,
            models.UserSession.revoked_at.is_(None)
        ).first()
        if not session or session.blocked:
            raise HTTPException(status_code=401, detail="Sessao revogada")
        session.last_activity_at = dt.now(timezone.utc)
        safe_db_commit(db)

    # Rotacionar refresh token
    revoke_refresh_token(db, hash_token(data.refresh_token))
    new_refresh_token = create_refresh_token(db, user.id, token_record.device_id)
    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "family_id": user.family_id,
        "account_type": user.account_type
    }
    if token_record.device_id:
        token_payload["device_id"] = token_record.device_id
    access_token = create_access_token(token_payload)
    return schemas.RefreshTokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@app.post("/api/auth/revoke")
@limiter.limit("10/minute")
def revoke_refresh(request: Request, data: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    token_record = verify_refresh_token(db, data.refresh_token)
    revoke_refresh_token(db, hash_token(data.refresh_token))
    if token_record and token_record.device_id:
        revoke_sessions(db, token_record.user_id, device_id=token_record.device_id)
    return {"success": True}


@app.post("/api/auth/revoke-all")
@limiter.limit("5/minute")
def revoke_all_tokens(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    user = get_user_from_token(db, token)
    
    # Adicionar token atual à blacklist
    try:
        payload = decode_token_payload(token)
        exp = payload.get("exp")
        if exp:
            now = datetime.now(timezone.utc).timestamp()
            expires_in = int(exp - now)
            if expires_in > 0:
                add_to_blacklist(token, expires_in)
    except Exception as e:
        security_logger.warning(f"Erro ao adicionar token à blacklist: {e}")
    
    revoke_all_refresh_tokens(db, user.id)
    revoke_sessions(db, user.id)
    return {"success": True}


@app.get("/api/csrf-token")
@limiter.limit("10/minute")
def get_csrf_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    """
    Endpoint para obter token CSRF.
    Requer autenticação para associar token à sessão do usuário.
    """
    token = credentials.credentials
    
    # Obter user_id do token para usar como session_id
    session_id = None
    try:
        payload = decode_token_payload(token)
        session_id = payload.get("sub")
    except:
        pass
    
    csrf_token = generate_and_store_csrf_token(session_id)
    
    # generate_and_store_csrf_token sempre retorna um token agora (mesmo sem Redis)
    # Mas ainda verificamos por segurança
    if not csrf_token:
        logger.error("Falha crítica ao gerar token CSRF")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate CSRF token"
        )
    
    return {"csrf_token": csrf_token}


@app.get("/api/auth/sessions", response_model=list[schemas.SessionResponse])
def list_sessions(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db),
    limit: int = 20,
    offset: int = 0
):
    token = credentials.credentials
    user = get_user_from_token(db, token)
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    sessions = db.query(models.UserSession).filter(
        models.UserSession.user_id == user.id
    ).order_by(models.UserSession.last_activity_at.desc()).offset(offset).limit(limit).all()
    now = dt.now(timezone.utc)
    updated = False
    for session in sessions:
        if session.trusted and session.trust_expires_at and session.trust_expires_at < now:
            session.trusted = False
            session.trust_expires_at = None
            updated = True
    if updated:
        safe_db_commit(db)
    return sessions


@app.post("/api/auth/sessions/revoke")
def revoke_session(
    data: schemas.SessionRevokeRequest,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    user = get_user_from_token(db, token)
    if not data.session_id and not data.device_id:
        raise HTTPException(status_code=400, detail="Informe session_id ou device_id")
    sessions_to_revoke = db.query(models.UserSession).filter(
        models.UserSession.user_id == user.id,
        models.UserSession.revoked_at.is_(None)
    )
    if data.session_id:
        sessions_to_revoke = sessions_to_revoke.filter(models.UserSession.id == data.session_id)
    if data.device_id:
        sessions_to_revoke = sessions_to_revoke.filter(models.UserSession.device_id == data.device_id)
    sessions_list = sessions_to_revoke.all()

    revoked_count = revoke_sessions(db, user.id, session_id=data.session_id, device_id=data.device_id)
    if data.device_id:
        db.query(models.RefreshToken).filter(
            models.RefreshToken.user_id == user.id,
            models.RefreshToken.device_id == data.device_id
        ).update({"revoked": True})
        db.commit()
    for session in sessions_list:
        send_session_revoked_alert(user.email, session.device_id, session.ip_address)
    return {"success": True, "revoked": revoked_count}


@app.post("/api/auth/sessions/revoke-others")
def revoke_other_sessions(
    data: schemas.SessionRevokeRequest,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    user = get_user_from_token(db, token)
    payload = decode_token_payload(token)
    current_device_id = data.device_id or payload.get("device_id")
    if not current_device_id:
        raise HTTPException(status_code=400, detail="Device_id nao informado")
    sessions_to_revoke = db.query(models.UserSession).filter(
        models.UserSession.user_id == user.id,
        models.UserSession.revoked_at.is_(None),
        models.UserSession.device_id != current_device_id
    ).all()
    revoked_count = revoke_sessions(db, user.id, exclude_device_id=current_device_id)
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user.id,
        models.RefreshToken.device_id != current_device_id
    ).update({"revoked": True})
    db.commit()
    for session in sessions_to_revoke:
        send_session_revoked_alert(user.email, session.device_id, session.ip_address)
    return {"success": True, "revoked": revoked_count}


@app.post("/api/auth/sessions/trust")
def trust_session(
    data: schemas.SessionTrustRequest,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    user = get_user_from_token(db, token)
    session = mark_session_trusted(
        db,
        user.id,
        session_id=data.session_id,
        device_id=data.device_id,
        trusted=data.trusted
    )
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    return {"success": True, "trusted": session.trusted}


@app.post("/api/auth/sessions/block")
def block_session(
    data: schemas.SessionBlockRequest,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    user = get_user_from_token(db, token)
    if not data.session_id and not data.device_id:
        raise HTTPException(status_code=400, detail="Informe session_id ou device_id")
    session = mark_session_blocked(
        db,
        user.id,
        session_id=data.session_id,
        device_id=data.device_id,
        blocked=data.blocked
    )
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    if session.device_id:
        db.query(models.RefreshToken).filter(
            models.RefreshToken.user_id == user.id,
            models.RefreshToken.device_id == session.device_id
        ).update({"revoked": True})
        db.commit()
    return {"success": True, "blocked": session.blocked}


@app.get("/api/auth/sessions/block-link", response_class=HTMLResponse)
@limiter.limit("10/hour")
def block_session_link(request: Request, token: str, db: Session = Depends(get_db)):
    payload = verify_session_action_token(token)
    if payload.get("action") != "block":
        return HTMLResponse(status_code=400, content="<h3>Acao invalida.</h3>")
    user_id = payload.get("sub")
    device_id = payload.get("device_id")
    if not user_id or not device_id:
        return HTMLResponse(status_code=400, content="<h3>Token invalido.</h3>")
    session = mark_session_blocked(db, int(user_id), session_id=None, device_id=device_id, blocked=True)
    if not session:
        return HTMLResponse(status_code=404, content="<h3>Sessao nao encontrada.</h3>")
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == int(user_id),
        models.RefreshToken.device_id == device_id
    ).update({"revoked": True})
    db.commit()
    return HTMLResponse(
        status_code=200,
        content=(
            "<h3>Dispositivo bloqueado com sucesso.</h3>"
            "<p>Se nao foi voce, recomendamos alterar sua senha imediatamente.</p>"
        )
    )


@app.get("/api/auth/sessions/history", response_model=list[schemas.LoginEventResponse])
def login_history(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db),
    days: int = 90,
    limit: int = 20,
    offset: int = 0
):
    token = credentials.credentials
    user = get_user_from_token(db, token)
    days = max(1, min(days, 365))
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    cutoff = dt.now(timezone.utc) - timedelta(days=days)
    events = db.query(models.UserLoginEvent).filter(
        models.UserLoginEvent.user_id == user.id,
        models.UserLoginEvent.created_at >= cutoff
    ).order_by(models.UserLoginEvent.created_at.desc()).offset(offset).limit(limit).all()
    return events


@app.post("/api/auth/verify-email")
@limiter.limit("5/hour")
def verify_email(request: Request, data: schemas.VerifyEmailRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    if user.email_verified:
        return {"success": True, "message": "Email ja verificado"}

    token_hash = hash_token(data.token)
    if user.email_verification_token_hash != token_hash:
        raise HTTPException(status_code=400, detail="Token invalido")

    user.email_verified = True
    user.email_verification_token_hash = None
    safe_db_commit(db)
    return {"success": True}


@app.post("/api/auth/resend-verification")
@limiter.limit("3/hour")
def resend_verification(request: Request, data: schemas.ResendVerificationRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    if user.email_verified:
        return {"success": True, "message": "Email ja verificado"}

    # Verificar limite diário de emails por usuário (10 emails/dia)
    is_email_allowed, email_remaining_seconds = check_user_email_daily_limit(
        user_id=user.id,
        max_emails=10
    )
    
    if not is_email_allowed:
        hours_remaining = email_remaining_seconds // 3600 if email_remaining_seconds else 24
        security_logger.warning(f"Limite diário de emails excedido para usuário {user.id}")
        raise HTTPException(
            status_code=429,
            detail=f"Limite diário de emails atingido. Tente novamente em {hours_remaining} horas."
        )
    
    verification_token = create_email_verification_token()
    user.email_verification_token_hash = hash_token(verification_token)
    user.email_verification_sent_at = dt.now(timezone.utc)
    safe_db_commit(db)
    if smtp_configured():
        frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
        link = f"{frontend_url}/auth/verify?email={email}&token={verification_token}" if frontend_url else None
        email_body = (
            "Seu token de verificacao de email:\n"
            f"{verification_token}\n\n"
            + (f"Acesse: {link}\n" if link else "")
        )
        send_email(email, "Verificacao de email - SaudeNold", email_body)
    security_logger.info(f"Reenvio de token de verificacao para {email}")
    return {
        "success": True,
        "verification_token": verification_token if ALLOW_EMAIL_DEBUG else None
    }


@app.post("/api/auth/forgot-password")
@limiter.limit("3/hour")  # Rate limit por IP (complementar)
def forgot_password(request: Request, data: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    
    # Rate limiting por email (3 tentativas por email/hora)
    is_allowed, remaining_seconds = check_email_rate_limit(
        email=email,
        endpoint="forgot-password",
        max_attempts=3,
        window_minutes=60
    )
    
    if not is_allowed:
        minutes_remaining = remaining_seconds // 60 if remaining_seconds else 60
        security_logger.warning(f"Rate limit excedido para forgot-password: {email}")
        raise HTTPException(
            status_code=429,
            detail=f"Muitas tentativas de recuperação de senha. Tente novamente em {minutes_remaining} minutos."
        )
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Não revelar se email existe ou não (segurança)
        return {"success": True}
    
    # Verificar limite diário de emails por usuário (10 emails/dia)
    is_email_allowed, email_remaining_seconds = check_user_email_daily_limit(
        user_id=user.id,
        max_emails=10
    )
    
    if not is_email_allowed:
        hours_remaining = email_remaining_seconds // 3600 if email_remaining_seconds else 24
        security_logger.warning(f"Limite diário de emails excedido para usuário {user.id}")
        raise HTTPException(
            status_code=429,
            detail=f"Limite diário de emails atingido. Tente novamente em {hours_remaining} horas."
        )

    reset_token = create_password_reset_token()
    user.password_reset_token_hash = hash_token(reset_token)
    user.password_reset_expires_at = dt.now(timezone.utc) + timedelta(hours=1)
    safe_db_commit(db)
    if smtp_configured():
        frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
        link = f"{frontend_url}/auth/reset?email={email}&token={reset_token}" if frontend_url else None
        email_body = (
            "Seu token de reset de senha:\n"
            f"{reset_token}\n\n"
            + (f"Acesse: {link}\n" if link else "")
        )
        send_email(email, "Reset de senha - SaudeNold", email_body)
    security_logger.info(f"Token de reset gerado para {email}")
    return {
        "success": True,
        "reset_token": reset_token if ALLOW_EMAIL_DEBUG else None
    }


@app.post("/api/auth/reset-password")
@limiter.limit("5/hour")
def reset_password(request: Request, data: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not user.password_reset_token_hash:
        raise HTTPException(status_code=400, detail="Token invalido")
    if not user.password_reset_expires_at or user.password_reset_expires_at < dt.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expirado")
    if user.password_reset_token_hash != hash_token(data.token):
        raise HTTPException(status_code=400, detail="Token invalido")

    user.password_hash = hash_password(data.new_password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    safe_db_commit(db)
    return {"success": True}


def _decode_b64(value: str) -> bytes:
    padded = value + "=" * (-len(value) % 4)
    try:
        return base64.urlsafe_b64decode(padded.encode("utf-8"))
    except Exception:
        return base64.b64decode(padded.encode("utf-8"))


def _normalize_public_key(public_key: str) -> str:
    if "BEGIN PUBLIC KEY" in public_key:
        return public_key
    cleaned = public_key.strip().replace("\n", "")
    wrapped = "\n".join(textwrap.wrap(cleaned, 64))
    return f"-----BEGIN PUBLIC KEY-----\n{wrapped}\n-----END PUBLIC KEY-----"


def _verify_biometric_signature(public_key_pem: str, message: bytes, signature_b64: str) -> None:
    public_key = load_pem_public_key(public_key_pem.encode("utf-8"))
    signature = _decode_b64(signature_b64)
    if isinstance(public_key, rsa.RSAPublicKey):
        public_key.verify(signature, message, padding.PKCS1v15(), hashes.SHA256())
        return
    if isinstance(public_key, ec.EllipticCurvePublicKey):
        public_key.verify(signature, message, ec.ECDSA(hashes.SHA256()))
        return
    raise HTTPException(status_code=400, detail="Chave publica invalida")


@app.post("/api/auth/biometric/challenge", response_model=schemas.BiometricChallengeResponse)
def biometric_challenge(
    data: schemas.BiometricChallengeRequest,
    db: Session = Depends(get_db)
):
    logger.info(f"Biometric challenge request for device_id: {data.device_id}")
    device = db.query(models.BiometricDevice).filter(
        models.BiometricDevice.device_id == data.device_id,
        models.BiometricDevice.revoked_at.is_(None)
    ).first()
    if not device:
        logger.warning(f"Biometric device not found or revoked: {data.device_id}")
        raise HTTPException(status_code=404, detail="Dispositivo nao encontrado")
    logger.info(f"Biometric device found for user_id: {device.user_id}, device_id: {device.device_id}")
    challenge = create_biometric_challenge_token(device.device_id)
    logger.info(f"Biometric challenge created successfully for device_id: {data.device_id}")
    return schemas.BiometricChallengeResponse(
        device_id=device.device_id,
        challenge=challenge,
        expires_in_minutes=5
    )


@app.post("/api/auth/biometric", response_model=schemas.AuthTokenResponse)
def biometric_login(
    request: Request,
    data: schemas.BiometricAuthRequest,
    db: Session = Depends(get_db)
):
    logger.info(f"Biometric login attempt for device_id: {data.device_id}")
    try:
        challenge_payload = verify_biometric_challenge_token(data.challenge)
        logger.info(f"Challenge token verified, device_id from token: {challenge_payload.get('device_id')}")
        if challenge_payload.get("device_id") != data.device_id:
            logger.error(f"Device ID mismatch: token={challenge_payload.get('device_id')}, request={data.device_id}")
            raise HTTPException(status_code=400, detail="Token invalido")
        device = db.query(models.BiometricDevice).filter(
            models.BiometricDevice.device_id == data.device_id,
            models.BiometricDevice.revoked_at.is_(None)
        ).first()
        if not device:
            logger.error(f"Biometric device not found or revoked: {data.device_id}")
            raise HTTPException(status_code=404, detail="Dispositivo nao encontrado")
        logger.info(f"Biometric device found for user_id: {device.user_id}")
        try:
            _verify_biometric_signature(device.public_key, data.challenge.encode("utf-8"), data.signature)
            logger.info(f"Biometric signature verified successfully for device_id: {data.device_id}")
        except InvalidSignature as e:
            logger.error(f"Invalid biometric signature for device_id: {data.device_id}, error: {str(e)}")
            raise HTTPException(status_code=401, detail="Assinatura invalida")
        user = db.query(models.User).filter(models.User.id == device.user_id).first()
        if not user or not user.is_active:
            logger.error(f"User not found or inactive: user_id={device.user_id}, is_active={user.is_active if user else None}")
            raise HTTPException(status_code=401, detail="Usuario invalido")
        if REQUIRE_EMAIL_VERIFICATION and not user.email_verified:
            logger.warning(f"Email not verified for user_id: {device.user_id}")
            raise HTTPException(status_code=403, detail="Email nao verificado")
        
        # Garantir que família e perfil existam
        if not user.family_id:
            family = ensure_family_for_user(db, user)
            ensure_admin_profile(db, user, family)

        # Atualizar último login
        user.last_login_at = dt.now(timezone.utc)
        safe_db_commit(db)
        db.refresh(user)

        # Verificar se dispositivo está bloqueado
        if is_device_blocked(db, user.id, data.device_id):
            logger.warning(f"Biometric login blocked for user {user.id} with device {data.device_id}")
            raise HTTPException(status_code=403, detail="Dispositivo bloqueado")

        # Criar/atualizar sessão (crítico para validação posterior)
        ip_address, user_agent = get_request_meta(request)
        device_info = schemas.DeviceInfo(
            device_id=data.device_id,
            device_name="Biometric Device",
            os_name="Unknown",
            os_version="Unknown"
        )
        session, is_new = upsert_session(db, user.id, device_info, ip_address, user_agent)
        logger.info(f"Session {'created' if is_new else 'updated'} for user {user.id} with device {data.device_id}")

        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "family_id": user.family_id,
            "account_type": user.account_type,
            "device_id": data.device_id
        }
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(db, user.id, data.device_id)
        return schemas.AuthTokenResponse(access_token=access_token, refresh_token=refresh_token, user=user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in biometric login: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@app.post("/api/user/biometric/register", response_model=schemas.BiometricDeviceResponse)
def register_biometric_device(
    data: schemas.BiometricRegisterRequest,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    try:
        token = credentials.credentials
        user = get_user_from_token(db, token)
        device = db.query(models.BiometricDevice).filter(
            models.BiometricDevice.user_id == user.id,
            models.BiometricDevice.device_id == data.device_id
        ).first()
        now = dt.now(timezone.utc)
        if device:
            device.public_key = _normalize_public_key(data.public_key)
            device.device_name = data.device_name
            device.revoked_at = None
        else:
            device = models.BiometricDevice(
                user_id=user.id,
                device_id=data.device_id,
                device_name=data.device_name,
                public_key=_normalize_public_key(data.public_key)
            )
            db.add(device)
        safe_db_commit(db)
        db.refresh(device)
        return device
    except Exception as e:
        logger.error(f"Erro ao registrar biometria: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao registrar biometria no servidor: {str(e)}")


@app.get("/api/user/biometric/devices", response_model=list[schemas.BiometricDeviceResponse])
def list_biometric_devices(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    user = get_user_from_token(db, token)
    devices = db.query(models.BiometricDevice).filter(
        models.BiometricDevice.user_id == user.id
    ).order_by(models.BiometricDevice.created_at.desc()).all()
    return devices


@app.delete("/api/user/biometric/device/{device_id}")
def revoke_biometric_device(
    device_id: str,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    user = get_user_from_token(db, token)
    device = db.query(models.BiometricDevice).filter(
        models.BiometricDevice.user_id == user.id,
        models.BiometricDevice.device_id == device_id
    ).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo nao encontrado")
    device.revoked_at = dt.now(timezone.utc)
    safe_db_commit(db)
    return {"success": True}


@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(credentials: HTTPAuthorizationCredentials = Security(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    if token == API_KEY:
        raise HTTPException(status_code=403, detail="API key not allowed for this endpoint")
    return get_user_from_token(db, token)


# ========== FAMILIA E PERFIS ==========
INVITE_EXPIRES_DAYS = int(os.getenv("INVITE_EXPIRES_DAYS", "7"))


def _generate_invite_code(db: Session) -> str:
    for _ in range(5):
        code = secrets.token_urlsafe(8)
        existing = db.query(models.FamilyInvite).filter(models.FamilyInvite.invite_code == code).first()
        if not existing:
            return code
    raise HTTPException(status_code=500, detail="Nao foi possivel gerar convite")


def _invite_response(invite: models.FamilyInvite) -> schemas.FamilyInviteResponse:
    data = {
        "id": invite.id,
        "family_id": invite.family_id,
        "inviter_user_id": invite.inviter_user_id,
        "invitee_email": invite.invitee_email,
        "invite_code": invite.invite_code if ALLOW_EMAIL_DEBUG else None,
        "status": invite.status,
        "expires_at": invite.expires_at,
        "accepted_at": invite.accepted_at,
        "accepted_by_user_id": invite.accepted_by_user_id,
        "created_at": invite.created_at,
    }
    return schemas.FamilyInviteResponse(**data)
@app.get("/api/family/profiles", response_model=list[schemas.FamilyProfileResponse])
@limiter.limit("100/minute")
def list_family_profiles(
    request: Request,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """Lista perfis da família do usuário autenticado"""
    user = get_request_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario nao autenticado")
    family = ensure_family_for_user(db, user)
    profiles = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == family.id
    ).order_by(models.FamilyProfile.created_at.desc()).all()
    return profiles


@app.get("/api/family/invites", response_model=list[schemas.FamilyInviteResponse])
def list_family_invites(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(db, credentials.credentials)
    family = ensure_family_for_user(db, user)
    invites = db.query(models.FamilyInvite).filter(
        models.FamilyInvite.family_id == family.id
    ).order_by(models.FamilyInvite.created_at.desc()).all()
    return [_invite_response(invite) for invite in invites]


@app.delete("/api/family/profiles/{profile_id}")
@limiter.limit("10/minute")
def delete_family_profile(
    request: Request,
    profile_id: int,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    """Deleta um perfil da família (apenas family_admin)"""
    user = get_user_from_token(db, credentials.credentials)
    if user.account_type != "family_admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar perfis")
    
    family = ensure_family_for_user(db, user)
    profile = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.id == profile_id,
        models.FamilyProfile.family_id == family.id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil nao encontrado")
    
    # Não permitir deletar o próprio perfil do admin
    if profile.created_by == user.id and profile.account_type == "family_admin":
        # Verificar se há outros admins na família
        other_admins = db.query(models.FamilyProfile).filter(
            models.FamilyProfile.family_id == family.id,
            models.FamilyProfile.account_type == "family_admin",
            models.FamilyProfile.id != profile_id
        ).count()
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="Nao e possivel deletar o ultimo administrador da familia")
    
    # Deletar relacionamentos
    db.query(models.FamilyCaregiver).filter(
        models.FamilyCaregiver.profile_id == profile_id
    ).delete(synchronize_session=False)
    
    db.query(models.FamilyProfileLink).filter(
        (models.FamilyProfileLink.source_profile_id == profile_id) |
        (models.FamilyProfileLink.target_profile_id == profile_id)
    ).delete(synchronize_session=False)
    
    db.query(models.FamilyDataShare).filter(
        (models.FamilyDataShare.from_profile_id == profile_id) |
        (models.FamilyDataShare.to_profile_id == profile_id)
    ).delete(synchronize_session=False)
    
    # Deletar o perfil
    db.delete(profile)
    safe_db_commit(db)
    
    return {"success": True, "message": "Perfil deletado com sucesso"}


@app.post("/api/family/add-child", response_model=schemas.FamilyProfileResponse)
@limiter.limit("10/minute")
def add_family_child(
    request: Request,
    data: schemas.FamilyMemberCreate,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    """Adiciona uma criança à família (apenas family_admin)"""
    user = get_user_from_token(db, credentials.credentials)
    if user.account_type != "family_admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem adicionar familiares")
    
    family = ensure_family_for_user(db, user)
    
    # Verificar limite de perfis por família
    profile_count = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == family.id
    ).count()
    
    if profile_count >= MAX_FAMILY_PROFILES:
        raise HTTPException(
            status_code=400,
            detail=f"Limite de {MAX_FAMILY_PROFILES} perfis por família atingido"
        )
    
    # Validar idade (deve ser menor de 18 anos)
    age = calculate_age(data.birth_date)
    if age >= 18:
        raise HTTPException(status_code=400, detail="Criança deve ter menos de 18 anos")
    
    # Verificar duplicatas (mesmo nome e data de nascimento)
    existing = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == family.id,
        models.FamilyProfile.name == data.name.strip(),
        models.FamilyProfile.birth_date == data.birth_date
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um familiar com este nome e data de nascimento")
    
    # Criar perfil da criança
    profile = models.FamilyProfile(
        family_id=family.id,
        name=data.name.strip(),
        account_type="child",
        birth_date=data.birth_date,
        gender=data.gender.strip() if data.gender else None,
        blood_type=data.blood_type.strip().upper() if data.blood_type else None,
        created_by=user.id,
        permissions=build_permissions("child"),
        allow_quick_access=True  # Crianças podem ter acesso rápido por padrão
    )
    db.add(profile)
    safe_db_commit(db)
    db.refresh(profile)
    
    # Adicionar criador como cuidador com acesso 'full'
    caregiver = models.FamilyCaregiver(
        profile_id=profile.id,
        caregiver_user_id=user.id,
        access_level="full"
    )
    db.add(caregiver)
    safe_db_commit(db)
    
    return profile


@app.post("/api/family/add-adult", response_model=schemas.FamilyProfileResponse)
@limiter.limit("10/minute")
def add_family_adult(
    request: Request,
    data: schemas.FamilyMemberCreate,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    """Adiciona um adulto à família (apenas family_admin)"""
    user = get_user_from_token(db, credentials.credentials)
    if user.account_type != "family_admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem adicionar familiares")
    
    family = ensure_family_for_user(db, user)
    
    # Verificar limite de perfis por família
    profile_count = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == family.id
    ).count()
    
    if profile_count >= MAX_FAMILY_PROFILES:
        raise HTTPException(
            status_code=400,
            detail=f"Limite de {MAX_FAMILY_PROFILES} perfis por família atingido"
        )
    
    # Validar idade (deve ser maior ou igual a 18 anos)
    age = calculate_age(data.birth_date)
    if age < 18:
        raise HTTPException(status_code=400, detail="Adulto deve ter 18 anos ou mais")
    
    # Verificar duplicatas
    existing = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == family.id,
        models.FamilyProfile.name == data.name.strip(),
        models.FamilyProfile.birth_date == data.birth_date
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um familiar com este nome e data de nascimento")
    
    # Criar perfil do adulto
    profile = models.FamilyProfile(
        family_id=family.id,
        name=data.name.strip(),
        account_type="adult_member",
        birth_date=data.birth_date,
        gender=data.gender.strip() if data.gender else None,
        blood_type=data.blood_type.strip().upper() if data.blood_type else None,
        created_by=user.id,
        permissions=build_permissions("adult_member"),
        allow_quick_access=False
    )
    db.add(profile)
    safe_db_commit(db)
    db.refresh(profile)
    
    return profile


@app.post("/api/family/add-elder", response_model=schemas.FamilyProfileResponse)
@limiter.limit("10/minute")
def add_family_elder(
    request: Request,
    data: schemas.FamilyMemberCreate,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    """Adiciona um idoso sob cuidados à família (apenas family_admin)"""
    user = get_user_from_token(db, credentials.credentials)
    if user.account_type != "family_admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem adicionar familiares")
    
    family = ensure_family_for_user(db, user)
    
    # Verificar limite de perfis por família
    profile_count = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == family.id
    ).count()
    
    if profile_count >= MAX_FAMILY_PROFILES:
        raise HTTPException(
            status_code=400,
            detail=f"Limite de {MAX_FAMILY_PROFILES} perfis por família atingido"
        )
    
    # Verificar duplicatas
    existing = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == family.id,
        models.FamilyProfile.name == data.name.strip(),
        models.FamilyProfile.birth_date == data.birth_date
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um familiar com este nome e data de nascimento")
    
    # Criar perfil do idoso
    profile = models.FamilyProfile(
        family_id=family.id,
        name=data.name.strip(),
        account_type="elder_under_care",
        birth_date=data.birth_date,
        gender=data.gender.strip() if data.gender else None,
        blood_type=data.blood_type.strip().upper() if data.blood_type else None,
        created_by=user.id,
        permissions=build_permissions("elder_under_care"),
        allow_quick_access=False
    )
    db.add(profile)
    safe_db_commit(db)
    db.refresh(profile)
    
    # Adicionar criador como cuidador com acesso 'full'
    caregiver = models.FamilyCaregiver(
        profile_id=profile.id,
        caregiver_user_id=user.id,
        access_level="full"
    )
    db.add(caregiver)
    safe_db_commit(db)
    
    return profile


@app.post("/api/family/invite-adult", response_model=schemas.FamilyInviteResponse)
@limiter.limit("5/minute")
def create_family_invite(
    request: Request,
    data: schemas.FamilyInviteCreate,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    try:
        security_logger.info(f"Criando convite - invitee_email recebido: {repr(data.invitee_email)}")
        user = get_user_from_token(db, credentials.credentials)
        # Permitir que family_admin e adult_member possam criar convites
        if user.account_type not in ["family_admin", "adult_member"]:
            raise HTTPException(status_code=403, detail="Sem permissao para convidar")
        
        # CRÍTICO: Verificar se usuário tem licença PRO ativa para criar convites quando dados estão no servidor
        has_pro_license = check_user_has_active_pro_license(db, user)
        if not has_pro_license:
            security_logger.warning(f"Tentativa de criar convite sem licença PRO - usuário {user.id}")
            raise HTTPException(
                status_code=403,
                detail="Licença PRO necessária para criar convites quando dados estão armazenados no servidor. Adquira uma licença PRO para continuar."
            )
        
        family = ensure_family_for_user(db, user)
        
        # Tratar invitee_email de forma segura
        invitee_email = None
        if data.invitee_email:
            invitee_email = data.invitee_email.strip().lower()
            if not invitee_email:  # Se após strip ficar vazio
                invitee_email = None
        
        security_logger.info(f"Convite processado - invitee_email final: {repr(invitee_email)}")
        
        if invitee_email:
            existing_user = db.query(models.User).filter(models.User.email == invitee_email).first()
            # Apenas verificar se o usuário já está na mesma família (evitar duplicatas)
            if existing_user and existing_user.family_id == family.id:
                security_logger.warning(f"Tentativa de convite para usuario ja na familia: {invitee_email}")
                raise HTTPException(status_code=400, detail="Usuario ja esta na familia")
            # PERMITIR convite mesmo se usuário pertence a outra família (conforme solicitado pelo usuário)

        code = _generate_invite_code(db)
        expires_at = dt.now(timezone.utc) + timedelta(days=INVITE_EXPIRES_DAYS)
        
        # Definir permissões padrão se não fornecidas
        permissions = data.permissions or {"can_view": True, "can_edit": False, "can_delete": False}
        
        invite = models.FamilyInvite(
            family_id=family.id,
            inviter_user_id=user.id,
            invitee_email=invitee_email,
            invite_code=code,
            status="pending",
            expires_at=expires_at,
            permissions=permissions
        )
        db.add(invite)
        safe_db_commit(db)
        db.refresh(invite)

        if invitee_email and smtp_configured():
            email_body = (
                "Convite para entrar na familia SaudeNold.\n"
                f"Codigo: {code}\n"
                f"Expira em {INVITE_EXPIRES_DAYS} dias."
            )
            send_email(invitee_email, "Convite de familia - SaudeNold", email_body)

        response = _invite_response(invite)
        if invitee_email is None:
            response.invite_code = code
        return response
    except HTTPException:
        raise
    except Exception as e:
        security_logger.error(f"Erro ao criar convite: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Erro ao criar convite: {str(e)}")


@app.delete("/api/family/invite/{invite_id}", response_model=schemas.FamilyInviteResponse)
def cancel_family_invite(
    invite_id: int,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(db, credentials.credentials)
    family = ensure_family_for_user(db, user)
    invite = db.query(models.FamilyInvite).filter(
        models.FamilyInvite.id == invite_id,
        models.FamilyInvite.family_id == family.id
    ).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Convite nao encontrado")
    invite.status = "cancelled"
    safe_db_commit(db)
    db.refresh(invite)
    return _invite_response(invite)


@app.post("/api/family/invite/{invite_id}/resend", response_model=schemas.FamilyInviteResponse)
@limiter.limit("5/minute")
def resend_family_invite(
    request: Request,
    invite_id: int,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(db, credentials.credentials)
    if user.account_type != "family_admin":
        raise HTTPException(status_code=403, detail="Sem permissao para reenviar")
    family = ensure_family_for_user(db, user)
    invite = db.query(models.FamilyInvite).filter(
        models.FamilyInvite.id == invite_id,
        models.FamilyInvite.family_id == family.id
    ).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Convite nao encontrado")
    if invite.status != "pending":
        raise HTTPException(status_code=400, detail="Convite nao esta pendente")
    invite.expires_at = dt.now(timezone.utc) + timedelta(days=INVITE_EXPIRES_DAYS)
    safe_db_commit(db)
    db.refresh(invite)
    if invite.invitee_email and smtp_configured():
        email_body = (
            "Convite para entrar na familia SaudeNold.\n"
            f"Codigo: {invite.invite_code}\n"
            f"Expira em {INVITE_EXPIRES_DAYS} dias."
        )
        send_email(invite.invitee_email, "Convite de familia - SaudeNold", email_body)
    return _invite_response(invite)


@app.post("/api/family/accept-invite", response_model=schemas.FamilyInviteResponse)
def accept_family_invite(
    data: schemas.FamilyInviteAccept,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(db, credentials.credentials)
    invite = db.query(models.FamilyInvite).filter(
        models.FamilyInvite.invite_code == data.code
    ).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Convite nao encontrado")
    if invite.status != "pending":
        raise HTTPException(status_code=400, detail="Convite nao esta pendente")
    if invite.expires_at and invite.expires_at < dt.now(timezone.utc):
        invite.status = "expired"
        safe_db_commit(db)
        raise HTTPException(status_code=400, detail="Convite expirado")
    if invite.invitee_email and invite.invitee_email != user.email:
        raise HTTPException(status_code=403, detail="Convite nao pertence a este email")
    if user.family_id and user.family_id != invite.family_id:
        existing_members = db.query(models.User).filter(models.User.family_id == user.family_id).count()
        if existing_members > 1:
            raise HTTPException(status_code=400, detail="Usuario ja pertence a outra familia")
        old_family_id = user.family_id
        old_profiles = db.query(models.FamilyProfile).filter(
            models.FamilyProfile.family_id == old_family_id
        ).all()
        old_profile_ids = [profile.id for profile in old_profiles]
        if old_profile_ids:
            db.query(models.FamilyCaregiver).filter(
                models.FamilyCaregiver.profile_id.in_(old_profile_ids)
            ).delete(synchronize_session=False)
        db.query(models.FamilyProfileLink).filter(
            models.FamilyProfileLink.family_id == old_family_id
        ).delete(synchronize_session=False)
        db.query(models.FamilyDataShare).filter(
            models.FamilyDataShare.family_id == old_family_id
        ).delete(synchronize_session=False)
        db.query(models.FamilyProfile).filter(
            models.FamilyProfile.family_id == old_family_id
        ).delete(synchronize_session=False)
        db.query(models.Family).filter(models.Family.id == old_family_id).delete(synchronize_session=False)
        safe_db_commit(db)

    user.family_id = invite.family_id
    user.account_type = "adult_member"
    user.created_by = invite.inviter_user_id
    safe_db_commit(db)

    profile = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == invite.family_id,
        models.FamilyProfile.created_by == user.id,
        models.FamilyProfile.account_type == "adult_member"
    ).first()
    if not profile:
        profile = models.FamilyProfile(
            family_id=invite.family_id,
            name=user.email.split('@')[0],
            account_type="adult_member",
            created_by=user.id,
            permissions=build_permissions("adult_member"),
            allow_quick_access=False
        )
        db.add(profile)
        safe_db_commit(db)

    # CRÍTICO: Criar FamilyDataShare com as permissões do convite
    # O perfil do convidante (inviter) compartilha seus dados com o perfil do convidado
    inviter_profile = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == invite.family_id,
        models.FamilyProfile.created_by == invite.inviter_user_id
    ).first()
    
    # CRÍTICO: Criar FamilyDataShare com as permissões do convite
    # O perfil do convidante (inviter) compartilha seus dados com o perfil do convidado
    if inviter_profile:
        # Usar permissões do convite se disponíveis, senão usar padrão (view only)
        permissions = invite.permissions if invite.permissions else {"can_view": True, "can_edit": False, "can_delete": False}
        
        # Verificar se já existe um compartilhamento
        existing_share = db.query(models.FamilyDataShare).filter(
            models.FamilyDataShare.family_id == invite.family_id,
            models.FamilyDataShare.from_profile_id == inviter_profile.id,
            models.FamilyDataShare.to_profile_id == profile.id,
            models.FamilyDataShare.revoked_at.is_(None)
        ).first()
        
        if not existing_share:
            data_share = models.FamilyDataShare(
                family_id=invite.family_id,
                from_profile_id=inviter_profile.id,
                to_profile_id=profile.id,
                permissions=permissions
            )
            db.add(data_share)
            safe_db_commit(db)

    invite.status = "accepted"
    invite.accepted_at = dt.now(timezone.utc)
    invite.accepted_by_user_id = user.id
    safe_db_commit(db)
    db.refresh(invite)
    return _invite_response(invite)


def _create_family_profile(
    db: Session,
    user: models.User,
    family: models.Family,
    data: schemas.FamilyMemberCreate,
    account_type: str,
    allow_quick_access: bool
):
    count = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == family.id
    ).count()
    if count >= MAX_FAMILY_PROFILES:
        raise HTTPException(status_code=400, detail=f"Limite de {MAX_FAMILY_PROFILES} perfis atingido")

    duplicate = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.family_id == family.id,
        models.FamilyProfile.name == data.name,
        models.FamilyProfile.birth_date == data.birth_date
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Perfil duplicado para este familiar")

    profile = models.FamilyProfile(
        family_id=family.id,
        name=sanitize_string(data.name, 255),
        account_type=account_type,
        birth_date=data.birth_date,
        gender=sanitize_string(data.gender, 50) if data.gender else None,
        blood_type=sanitize_string(data.blood_type, 10) if data.blood_type else None,
        created_by=user.id,
        permissions=build_permissions(account_type),
        allow_quick_access=allow_quick_access
    )
    db.add(profile)
    safe_db_commit(db)
    db.refresh(profile)

    if account_type in {"child", "elder_under_care"}:
        caregiver = models.FamilyCaregiver(
            profile_id=profile.id,
            caregiver_user_id=user.id,
            access_level="full"
        )
        db.add(caregiver)
        safe_db_commit(db)

    return profile


@app.get("/api/family/links", response_model=list[schemas.FamilyLinkResponse])
def list_family_links(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(db, credentials.credentials)
    family = ensure_family_for_user(db, user)
    links = db.query(models.FamilyProfileLink).filter(
        models.FamilyProfileLink.family_id == family.id
    ).order_by(models.FamilyProfileLink.created_at.desc()).all()
    return links


@app.post("/api/family/links", response_model=schemas.FamilyLinkResponse)
def create_family_link(
    request: Request,
    data: schemas.FamilyLinkCreate,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(db, credentials.credentials)
    if user.account_type != "family_admin":
        raise HTTPException(status_code=403, detail="Sem permissao para vincular perfis")
    family = ensure_family_for_user(db, user)
    source_profile_id = get_profile_context(request, db)
    if not source_profile_id:
        raise HTTPException(status_code=400, detail="Profile ID requerido")
    target_profile = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.id == data.target_profile_id,
        models.FamilyProfile.family_id == family.id
    ).first()
    if not target_profile:
        raise HTTPException(status_code=404, detail="Perfil alvo nao encontrado")
    if data.target_profile_id == source_profile_id:
        raise HTTPException(status_code=400, detail="Perfis devem ser diferentes")
    existing = db.query(models.FamilyProfileLink).filter(
        models.FamilyProfileLink.family_id == family.id,
        models.FamilyProfileLink.source_profile_id == source_profile_id,
        models.FamilyProfileLink.target_profile_id == data.target_profile_id,
        models.FamilyProfileLink.status != "rejected"
    ).first()
    if existing:
        return existing
    link = models.FamilyProfileLink(
        family_id=family.id,
        source_profile_id=source_profile_id,
        target_profile_id=data.target_profile_id,
        status="pending"
    )
    db.add(link)
    safe_db_commit(db)
    db.refresh(link)
    return link


@app.post("/api/family/links/{link_id}/accept", response_model=schemas.FamilyLinkResponse)
def accept_family_link(
    request: Request,
    link_id: int,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(db, credentials.credentials)
    family = ensure_family_for_user(db, user)
    profile_id = get_profile_context(request, db)
    link = db.query(models.FamilyProfileLink).filter(
        models.FamilyProfileLink.id == link_id,
        models.FamilyProfileLink.family_id == family.id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Vinculo nao encontrado")
    if profile_id and link.target_profile_id != profile_id and user.account_type != "family_admin":
        raise HTTPException(status_code=403, detail="Sem permissao para aceitar vinculo")
    link.status = "accepted"
    link.approved_at = dt.now(timezone.utc)
    safe_db_commit(db)
    db.refresh(link)
    return link


@app.get("/api/family/data-shares", response_model=list[schemas.FamilyDataShareResponse])
def list_family_data_shares(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(db, credentials.credentials)
    family = ensure_family_for_user(db, user)
    profile_id = get_profile_context(request, db)
    query = db.query(models.FamilyDataShare).filter(
        models.FamilyDataShare.family_id == family.id,
        models.FamilyDataShare.revoked_at.is_(None)
    )
    if profile_id:
        query = query.filter(
            (models.FamilyDataShare.from_profile_id == profile_id) |
            (models.FamilyDataShare.to_profile_id == profile_id)
        )
    return query.order_by(models.FamilyDataShare.created_at.desc()).all()


@app.post("/api/family/data-shares", response_model=schemas.FamilyDataShareResponse)
def create_family_data_share(
    request: Request,
    data: schemas.FamilyDataShareCreate,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(db, credentials.credentials)
    if user.account_type != "family_admin":
        raise HTTPException(status_code=403, detail="Sem permissao para compartilhar dados")
    family = ensure_family_for_user(db, user)
    from_profile_id = get_profile_context(request, db)
    if not from_profile_id:
        raise HTTPException(status_code=400, detail="Profile ID requerido")
    target_profile = db.query(models.FamilyProfile).filter(
        models.FamilyProfile.id == data.to_profile_id,
        models.FamilyProfile.family_id == family.id
    ).first()
    if not target_profile:
        raise HTTPException(status_code=404, detail="Perfil alvo nao encontrado")
    share = models.FamilyDataShare(
        family_id=family.id,
        from_profile_id=from_profile_id,
        to_profile_id=data.to_profile_id,
        permissions=data.permissions or {}
    )
    db.add(share)
    safe_db_commit(db)
    db.refresh(share)
    return share


@app.delete("/api/family/data-shares/{share_id}")
def revoke_family_data_share(
    request: Request,
    share_id: int,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(db, credentials.credentials)
    family = ensure_family_for_user(db, user)
    profile_id = get_profile_context(request, db)
    share = db.query(models.FamilyDataShare).filter(
        models.FamilyDataShare.id == share_id,
        models.FamilyDataShare.family_id == family.id,
        models.FamilyDataShare.revoked_at.is_(None)
    ).first()
    if not share:
        raise HTTPException(status_code=404, detail="Compartilhamento nao encontrado")
    if user.account_type != "family_admin" and profile_id != share.from_profile_id:
        raise HTTPException(status_code=403, detail="Sem permissao para revogar")
    share.revoked_at = dt.now(timezone.utc)
    safe_db_commit(db)
    return {"success": True}


# ========== MEDICAMENTOS ==========
@app.get("/api/medications")
@limiter.limit("100/minute")
def get_medications(request: Request, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso GET /api/medications de {get_remote_address(request)}")
    db = next(get_db())
    user = get_request_user(request, db)
    
    # CRÍTICO: Exigir autenticação JWT válida (não aceitar apenas API_KEY)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticacao requerida")
    
    profile_id = get_profile_context(request, db)
    if profile_id:
        ensure_profile_access(user, db, profile_id, write_access=False)
        query = db.query(models.Medication).filter(models.Medication.profile_id == profile_id)
    else:
        # Se não há profile_id, retornar vazio (não retornar todos os medicamentos)
        query = db.query(models.Medication).filter(False)  # Query que sempre retorna vazio
    
    medications = query.all()
    
    # Log de auditoria - visualização
    if user and profile_id:
        try:
            log_view_action(db, user, RESOURCE_MEDICATION, None, profile_id, request)
        except Exception as e:
            security_logger.warning(f"Erro ao registrar log de auditoria: {e}")
    
    # Retornar incluindo encrypted_data se presente
    result = []
    for m in medications:
        response = schemas.MedicationResponse.model_validate(m).model_dump()
        if m.encrypted_data:
            response['encrypted_data'] = m.encrypted_data
        result.append(response)
    return result


@app.post("/api/medications")
@limiter.limit("20/minute")
def create_medication(request: Request, medication: schemas.MedicationCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso POST /api/medications de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if medication.image_base64 and not validate_base64_image_size(medication.image_base64):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (5MB)")
    
    # Sanitizar dados
    medication.name = sanitize_string(medication.name, 200)
    if medication.dosage:
        medication.dosage = sanitize_string(medication.dosage, 100)
    if medication.notes:
        medication.notes = sanitize_string(medication.notes, 5000)
    
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True)
    try:
        medication_data = medication.model_dump()
        
        # Se encrypted_data foi fornecido, validar formato e armazenar diretamente
        encrypted_data = medication_data.pop('encrypted_data', None)
        if encrypted_data:
            if not EncryptionService.validate_encrypted_format(encrypted_data):
                raise HTTPException(status_code=400, detail="Formato de dados criptografados inválido")
            medication_data['encrypted_data'] = encrypted_data
        
        db_medication = models.Medication(**medication_data, profile_id=profile_id)
        db.add(db_medication)
        safe_db_commit(db)
        db.refresh(db_medication)
        
        # Log de auditoria - criação
        if user and profile_id:
            try:
                from services.audit_service import log_audit_event, ACTION_CREATE
                log_audit_event(
                    db=db,
                    user_id=user.id,
                    action_type=ACTION_CREATE,
                    resource_type=RESOURCE_MEDICATION,
                    resource_id=db_medication.id,
                    profile_id=profile_id,
                    ip_address=get_remote_address(request),
                    user_agent=request.headers.get("user-agent"),
                    device_id=request.headers.get("x-device-id")
                )
            except Exception as e:
                security_logger.warning(f"Erro ao registrar log de auditoria: {e}")
        
        # Retornar resposta incluindo encrypted_data se presente
        response = schemas.MedicationResponse.model_validate(db_medication).model_dump()
        if db_medication.encrypted_data:
            response['encrypted_data'] = db_medication.encrypted_data
        return response
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error creating medication: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/api/medications/{medication_id}")
@limiter.limit("20/minute")
def update_medication(request: Request, medication_id: int, medication: schemas.MedicationCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso PUT /api/medications/{medication_id} de {get_remote_address(request)}")
    
    # Validar encrypted_data se fornecido
    if medication.encrypted_data:
        if not EncryptionService.validate_encrypted_format(medication.encrypted_data.model_dump()):
            raise HTTPException(status_code=400, detail="Formato de dados criptografados inválido")
    
    # Validar tamanho da imagem
    if medication.image_base64 and not validate_base64_image_size(medication.image_base64):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (5MB)")
    
    # Sanitizar dados
    medication.name = sanitize_string(medication.name, 200)
    if medication.dosage:
        medication.dosage = sanitize_string(medication.dosage, 100)
    if medication.notes:
        medication.notes = sanitize_string(medication.notes, 5000)
    
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True)
    query = db.query(models.Medication).filter(models.Medication.id == medication_id)
    if profile_id:
        query = query.filter(models.Medication.profile_id == profile_id)
    db_medication = query.first()
    if not db_medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    try:
        # Capturar valores antigos para auditoria
        old_values = {
            "name": db_medication.name,
            "dosage": db_medication.dosage,
            "active": db_medication.active
        }
        
        medication_data = medication.model_dump()
        
        # Validar encrypted_data se fornecido
        if 'encrypted_data' in medication_data and medication_data['encrypted_data']:
            if not EncryptionService.validate_encrypted_format(medication_data['encrypted_data']):
                raise HTTPException(status_code=400, detail="Formato de dados criptografados inválido")
        
        for key, value in medication_data.items():
            setattr(db_medication, key, value)
        
        safe_db_commit(db)
        db.refresh(db_medication)
        
        # Log de auditoria - edição
        if user and profile_id:
            try:
                new_values = {
                    "name": db_medication.name,
                    "dosage": db_medication.dosage,
                    "active": db_medication.active
                }
                log_edit_action(
                    db, user, RESOURCE_MEDICATION, medication_id, profile_id, request,
                    old_values=old_values, new_values=new_values
                )
            except Exception as e:
                security_logger.warning(f"Erro ao registrar log de auditoria: {e}")
        
        # Retornar resposta incluindo encrypted_data se presente
        response = schemas.MedicationResponse.model_validate(db_medication).model_dump()
        if db_medication.encrypted_data:
            response['encrypted_data'] = db_medication.encrypted_data
        return response
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error updating medication: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/api/medications/{medication_id}")
@limiter.limit("20/minute")
def delete_medication(request: Request, medication_id: int, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso DELETE /api/medications/{medication_id} de {get_remote_address(request)}")
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True, delete_access=True)
    query = db.query(models.Medication).filter(models.Medication.id == medication_id)
    if profile_id:
        query = query.filter(models.Medication.profile_id == profile_id)
    db_medication = query.first()
    if not db_medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    try:
        # Log de auditoria - exclusão (antes de deletar)
        if user and profile_id:
            try:
                log_delete_action(
                    db, user, RESOURCE_MEDICATION, medication_id, profile_id, request
                )
            except Exception as e:
                security_logger.warning(f"Erro ao registrar log de auditoria: {e}")
        
        db.delete(db_medication)
        safe_db_commit(db)
        return {"message": "Medication deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error deleting medication: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========== MEDICATION LOGS ==========
@app.get("/api/medication-logs")
@limiter.limit("100/minute")
def get_medication_logs(request: Request, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso GET /api/medication-logs de {get_remote_address(request)}")
    db = next(get_db())
    user = get_request_user(request, db)
    
    # CRÍTICO: Exigir autenticação JWT válida (não aceitar apenas API_KEY)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticacao requerida")
    
    profile_id = get_profile_context(request, db)
    if profile_id:
        ensure_profile_access(user, db, profile_id, write_access=False)
        query = db.query(models.MedicationLog).filter(models.MedicationLog.profile_id == profile_id)
    else:
        # Se não há profile_id, retornar vazio (não retornar todos os logs)
        query = db.query(models.MedicationLog).filter(False)  # Query que sempre retorna vazio
    
    logs = query.all()
    return [schemas.MedicationLogResponse.model_validate(l).model_dump() for l in logs]


@app.post("/api/medication-logs")
@limiter.limit("30/minute")
def create_medication_log(request: Request, log: schemas.MedicationLogCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso POST /api/medication-logs de {get_remote_address(request)}")
    
    # Sanitizar dados
    log.medication_name = sanitize_string(log.medication_name, 200)
    if log.status not in ["taken", "skipped", "postponed"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be: taken, skipped, or postponed")
    
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True)
    try:
        db_log = models.MedicationLog(**log.model_dump(), profile_id=profile_id)
        db.add(db_log)
        safe_db_commit(db)
        db.refresh(db_log)
        return schemas.MedicationLogResponse.model_validate(db_log).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error creating medication log: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========== CONTATOS DE EMERGÊNCIA ==========
@app.get("/api/emergency-contacts")
@limiter.limit("100/minute")
def get_emergency_contacts(request: Request, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso GET /api/emergency-contacts de {get_remote_address(request)}")
    db = next(get_db())
    user = get_request_user(request, db)
    
    # CRÍTICO: Exigir autenticação JWT válida (não aceitar apenas API_KEY)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticacao requerida")
    
    profile_id = get_profile_context(request, db)
    if profile_id:
        ensure_profile_access(user, db, profile_id, write_access=False)
        query = db.query(models.EmergencyContact).filter(models.EmergencyContact.profile_id == profile_id)
    else:
        # Se não há profile_id, retornar vazio (não retornar todos os contatos)
        query = db.query(models.EmergencyContact).filter(False)  # Query que sempre retorna vazio
    
    contacts = query.order_by(models.EmergencyContact.order).all()
    return [schemas.EmergencyContactResponse.model_validate(c).model_dump() for c in contacts]


@app.post("/api/emergency-contacts")
@limiter.limit("20/minute")
def create_emergency_contact(request: Request, contact: schemas.EmergencyContactCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso POST /api/emergency-contacts de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if contact.photo_base64 and not validate_base64_image_size(contact.photo_base64):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (5MB)")
    
    # Sanitizar dados
    contact.name = sanitize_string(contact.name, 200)
    contact.phone = sanitize_string(contact.phone, 20)
    if contact.relation:
        contact.relation = sanitize_string(contact.relation, 100)
    
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True)
    
    # Verificar limite de 5 contatos
    count_query = db.query(models.EmergencyContact)
    if profile_id:
        count_query = count_query.filter(models.EmergencyContact.profile_id == profile_id)
    count = count_query.count()
    if count >= 5:
        raise HTTPException(status_code=400, detail="Maximum of 5 emergency contacts allowed")
    
    try:
        db_contact = models.EmergencyContact(**contact.model_dump(), profile_id=profile_id)
        db.add(db_contact)
        safe_db_commit(db)
        db.refresh(db_contact)
        return schemas.EmergencyContactResponse.model_validate(db_contact).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error creating emergency contact: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/api/emergency-contacts/{contact_id}")
@limiter.limit("20/minute")
def update_emergency_contact(request: Request, contact_id: int, contact: schemas.EmergencyContactCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso PUT /api/emergency-contacts/{contact_id} de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if contact.photo_base64 and not validate_base64_image_size(contact.photo_base64):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (5MB)")
    
    # Sanitizar dados
    contact.name = sanitize_string(contact.name, 200)
    contact.phone = sanitize_string(contact.phone, 20)
    if contact.relation:
        contact.relation = sanitize_string(contact.relation, 100)
    
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True)
    query = db.query(models.EmergencyContact).filter(models.EmergencyContact.id == contact_id)
    if profile_id:
        query = query.filter(models.EmergencyContact.profile_id == profile_id)
    db_contact = query.first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    try:
        for key, value in contact.model_dump().items():
            setattr(db_contact, key, value)
        
        safe_db_commit(db)
        db.refresh(db_contact)
        return schemas.EmergencyContactResponse.model_validate(db_contact).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error updating emergency contact: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/api/emergency-contacts/{contact_id}")
@limiter.limit("20/minute")
def delete_emergency_contact(request: Request, contact_id: int, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso DELETE /api/emergency-contacts/{contact_id} de {get_remote_address(request)}")
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True, delete_access=True)
    query = db.query(models.EmergencyContact).filter(models.EmergencyContact.id == contact_id)
    if profile_id:
        query = query.filter(models.EmergencyContact.profile_id == profile_id)
    db_contact = query.first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    try:
        db.delete(db_contact)
        safe_db_commit(db)
        return {"message": "Contact deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error deleting emergency contact: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========== VISITAS AO MÉDICO ==========
@app.get("/api/doctor-visits")
@limiter.limit("100/minute")
def get_doctor_visits(request: Request, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso GET /api/doctor-visits de {get_remote_address(request)}")
    db = next(get_db())
    user = get_request_user(request, db)
    
    # CRÍTICO: Exigir autenticação JWT válida (não aceitar apenas API_KEY)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticacao requerida")
    
    profile_id = get_profile_context(request, db)
    if profile_id:
        ensure_profile_access(user, db, profile_id, write_access=False)
        query = db.query(models.DoctorVisit).filter(models.DoctorVisit.profile_id == profile_id)
    else:
        # Se não há profile_id, retornar vazio (não retornar todas as visitas)
        query = db.query(models.DoctorVisit).filter(False)  # Query que sempre retorna vazio
    
    visits = query.order_by(models.DoctorVisit.visit_date.desc()).all()
    return [schemas.DoctorVisitResponse.model_validate(v).model_dump() for v in visits]


@app.post("/api/doctor-visits")
@limiter.limit("20/minute")
def create_doctor_visit(request: Request, visit: schemas.DoctorVisitCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso POST /api/doctor-visits de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if visit.prescription_image and not validate_base64_image_size(visit.prescription_image):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (5MB)")
    
    # Sanitizar dados
    visit.doctor_name = sanitize_string(visit.doctor_name, 200)
    visit.specialty = sanitize_string(visit.specialty, 200)
    if visit.notes:
        visit.notes = sanitize_string(visit.notes, 5000)
    
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True)
    try:
        db_visit = models.DoctorVisit(**visit.model_dump(), profile_id=profile_id)
        db.add(db_visit)
        safe_db_commit(db)
        db.refresh(db_visit)
        return schemas.DoctorVisitResponse.model_validate(db_visit).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error creating doctor visit: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/api/doctor-visits/{visit_id}")
@limiter.limit("20/minute")
def update_doctor_visit(request: Request, visit_id: int, visit: schemas.DoctorVisitCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso PUT /api/doctor-visits/{visit_id} de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if visit.prescription_image and not validate_base64_image_size(visit.prescription_image):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (5MB)")
    
    # Sanitizar dados
    visit.doctor_name = sanitize_string(visit.doctor_name, 200)
    visit.specialty = sanitize_string(visit.specialty, 200)
    if visit.notes:
        visit.notes = sanitize_string(visit.notes, 5000)
    
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True)
    query = db.query(models.DoctorVisit).filter(models.DoctorVisit.id == visit_id)
    if profile_id:
        query = query.filter(models.DoctorVisit.profile_id == profile_id)
    db_visit = query.first()
    if not db_visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    try:
        for key, value in visit.model_dump().items():
            setattr(db_visit, key, value)
        
        safe_db_commit(db)
        db.refresh(db_visit)
        return schemas.DoctorVisitResponse.model_validate(db_visit).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error updating doctor visit: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/api/doctor-visits/{visit_id}")
@limiter.limit("20/minute")
def delete_doctor_visit(request: Request, visit_id: int, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso DELETE /api/doctor-visits/{visit_id} de {get_remote_address(request)}")
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True, delete_access=True)
    query = db.query(models.DoctorVisit).filter(models.DoctorVisit.id == visit_id)
    if profile_id:
        query = query.filter(models.DoctorVisit.profile_id == profile_id)
    db_visit = query.first()
    if not db_visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    try:
        db.delete(db_visit)
        safe_db_commit(db)
        return {"message": "Visit deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error deleting doctor visit: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========== EXAMES MÉDICOS ==========
def process_exam_ocr(exam_id: int):
    """Função para processar OCR em background"""
    db = SessionLocal()
    try:
        exam = db.query(models.MedicalExam).filter(models.MedicalExam.id == exam_id).first()
        if not exam:
            return
        
        # Atualizar status para processing
        exam.processing_status = "processing"
        db.commit()
        
        try:
            # Verificar se o exame já tem dados extraídos (do frontend com Gemini)
            if exam.extracted_data and exam.extracted_data.get('parameters'):
                # Se já tem dados extraídos, não precisa fazer OCR
                logger.info(f"Exame {exam_id} já tem dados extraídos, pulando OCR")
                exam.processing_status = "completed"
                db.commit()
                return
            
            # Realizar OCR apenas se necessário (suporta imagem e PDF)
            file_type = exam.file_type or 'image'
            try:
                ocr_text = perform_ocr(exam.image_base64, file_type=file_type)
                exam.raw_ocr_text = ocr_text[:50000]  # Limitar tamanho do texto
                
                # Extrair dados
                extracted_data = extract_data_from_ocr_text(ocr_text)
                exam.extracted_data = extracted_data
            except Exception as ocr_error:
                # Se OCR falhar, marcar como erro mas não quebrar o processamento
                logger.warning(f"OCR falhou para exame {exam_id}: {str(ocr_error)}")
                exam.processing_error = f"OCR não disponível: {str(ocr_error)[:200]}"
                exam.processing_status = "error"
                db.commit()
                return
            
            # Se encontrou data, usar ela
            if extracted_data.get('exam_date'):
                try:
                    exam.exam_date = dt.fromisoformat(extracted_data['exam_date'])
                except:
                    pass
            
            # Se encontrou tipo, usar ele
            if extracted_data.get('exam_type'):
                exam.exam_type = extracted_data['exam_type']
            
            # Salvar data points no banco
            exam_date = exam.exam_date or exam.created_at
            for param in extracted_data.get('parameters', []):
                data_point = models.ExamDataPoint(
                    exam_id=exam.id,
                    profile_id=exam.profile_id,
                    parameter_name=param['name'],
                    value=param['value'],
                    numeric_value=param.get('numeric_value'),
                    unit=param.get('unit'),
                    reference_range_min=param.get('reference_range_min'),
                    reference_range_max=param.get('reference_range_max'),
                    exam_date=exam_date
                )
                db.add(data_point)
            
            exam.processing_status = "completed"
            db.commit()
        except Exception as e:
            exam.processing_status = "error"
            exam.processing_error = str(e)[:500]  # Limitar tamanho do erro
            db.commit()
            security_logger.error(f"Erro ao processar OCR do exame {exam_id}: {str(e)}")
    finally:
        db.close()


@app.post("/api/medical-exams")
@limiter.limit("10/minute")
def create_medical_exam(
    request: Request,
    background_tasks: BackgroundTasks,
    exam: schemas.MedicalExamCreate,
    api_key: str = Depends(verify_api_key)
):
    security_logger.info(f"Acesso POST /api/medical-exams de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if not validate_base64_image_size(exam.image_base64, max_size_mb=10):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (10MB)")
    
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True)
    try:
        # Criar exame com status pending
        db_exam = models.MedicalExam(
            exam_date=exam.exam_date,
            exam_type=exam.exam_type,
            image_base64=exam.image_base64,
            file_type=exam.file_type or 'image',
            processing_status="pending",
            profile_id=profile_id
        )
        db.add(db_exam)
        safe_db_commit(db)
        db.refresh(db_exam)
        
        # Adicionar tarefa de processamento em background
        background_tasks.add_task(process_exam_ocr, db_exam.id)
        
        return schemas.MedicalExamResponse.model_validate(db_exam).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error creating medical exam: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/medical-exams")
@limiter.limit("100/minute")
def get_medical_exams(request: Request, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso GET /api/medical-exams de {get_remote_address(request)}")
    db = next(get_db())
    user = get_request_user(request, db)
    
    # CRÍTICO: Exigir autenticação JWT válida (não aceitar apenas API_KEY)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticacao requerida")
    
    profile_id = get_profile_context(request, db)
    if profile_id:
        ensure_profile_access(user, db, profile_id, write_access=False)
        query = db.query(models.MedicalExam).filter(models.MedicalExam.profile_id == profile_id)
    else:
        # Se não há profile_id, retornar vazio (não retornar todos os exames)
        query = db.query(models.MedicalExam).filter(False)  # Query que sempre retorna vazio
    
    exams = query.order_by(models.MedicalExam.created_at.desc()).all()
    
    # Não retornar image_base64 na lista (muito grande)
    result = []
    for exam in exams:
        exam_dict = schemas.MedicalExamResponse.model_validate(exam).model_dump()
        exam_dict['image_base64'] = None  # Remover imagem para economizar banda
        result.append(exam_dict)
    
    return result


@app.get("/api/medical-exams/{exam_id}")
@limiter.limit("100/minute")
def get_medical_exam(request: Request, exam_id: int, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso GET /api/medical-exams/{exam_id} de {get_remote_address(request)}")
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True)
    query = db.query(models.MedicalExam).filter(models.MedicalExam.id == exam_id)
    if profile_id:
        query = query.filter(models.MedicalExam.profile_id == profile_id)
    exam = query.first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    token = get_bearer_token(request)
    user = None
    if token:
        try:
            user = get_user_from_token(db, token)
        except HTTPException:
            user = None
    if user:
        ip_address, user_agent = get_request_meta(request)
        record_download(db, user.id, "medical_exam", str(exam_id), ip_address, user_agent)
        recent_count = get_recent_download_count(db, user.id, DOWNLOAD_WINDOW_MINUTES)
        if recent_count == DOWNLOAD_THRESHOLD:
            security_logger.warning(f"Download em massa detectado para {user.email} ({recent_count} em {DOWNLOAD_WINDOW_MINUTES}m)")
            send_mass_download_alert(user.email, recent_count, DOWNLOAD_WINDOW_MINUTES, ip_address, user_agent)
    return schemas.MedicalExamResponse.model_validate(exam).model_dump()


@app.put("/api/medical-exams/{exam_id}")
@limiter.limit("20/minute")
def update_medical_exam(
    request: Request,
    exam_id: int,
    exam_update: schemas.MedicalExamUpdate,
    api_key: str = Depends(verify_api_key)
):
    security_logger.info(f"Acesso PUT /api/medical-exams/{exam_id} de {get_remote_address(request)}")
    
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True)
    query = db.query(models.MedicalExam).filter(models.MedicalExam.id == exam_id)
    if profile_id:
        query = query.filter(models.MedicalExam.profile_id == profile_id)
    db_exam = query.first()
    if not db_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    try:
        if exam_update.exam_date:
            db_exam.exam_date = exam_update.exam_date
        if exam_update.exam_type:
            db_exam.exam_type = sanitize_string(exam_update.exam_type, 200)
        
        safe_db_commit(db)
        db.refresh(db_exam)
        return schemas.MedicalExamResponse.model_validate(db_exam).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error updating medical exam: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/api/medical-exams/{exam_id}")
@limiter.limit("20/minute")
def delete_medical_exam(request: Request, exam_id: int, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso DELETE /api/medical-exams/{exam_id} de {get_remote_address(request)}")
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=True, delete_access=True)
    query = db.query(models.MedicalExam).filter(models.MedicalExam.id == exam_id)
    if profile_id:
        query = query.filter(models.MedicalExam.profile_id == profile_id)
    db_exam = query.first()
    if not db_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    try:
        # Deletar data points associados
        db.query(models.ExamDataPoint).filter(models.ExamDataPoint.exam_id == exam_id).delete()
        db.delete(db_exam)
        safe_db_commit(db)
        return {"message": "Exam deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error deleting medical exam: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/medical-exams/{exam_id}/timeline/{parameter_name}")
@limiter.limit("100/minute")
def get_parameter_timeline(
    request: Request,
    exam_id: int,
    parameter_name: str,
    api_key: str = Depends(verify_api_key)
):
    """Retorna dados temporais de um parâmetro específico para gráfico"""
    security_logger.info(f"Acesso GET /api/medical-exams/{exam_id}/timeline/{parameter_name} de {get_remote_address(request)}")
    
    db = next(get_db())
    user = get_request_user(request, db)
    profile_id = get_profile_context(request, db)
    if user and profile_id:
        ensure_profile_access(user, db, profile_id, write_access=False)
    
    # Buscar todos os data points deste parâmetro (não apenas do exame atual)
    query = db.query(models.ExamDataPoint).filter(
        models.ExamDataPoint.parameter_name.ilike(f"%{parameter_name}%")
    )
    if profile_id:
        query = query.filter(models.ExamDataPoint.profile_id == profile_id)
    data_points = query.order_by(models.ExamDataPoint.exam_date.asc()).all()
    
    if not data_points:
        raise HTTPException(status_code=404, detail="Parameter data not found")
    
    # Preparar dados para gráfico
    timeline_data = {
        "parameter_name": parameter_name,
        "unit": data_points[0].unit if data_points else None,
        "reference_range_min": data_points[0].reference_range_min if data_points else None,
        "reference_range_max": data_points[0].reference_range_max if data_points else None,
        "data_points": [
            {
                "exam_date": point.exam_date.isoformat(),
                "value": point.value,
                "numeric_value": point.numeric_value,
                "exam_id": point.exam_id
            }
            for point in data_points
        ]
    }
    
    return timeline_data


# ========== LICENÇAS PRO ==========

# Funções auxiliares de segurança
def check_suspicious_activity(db: Session, ip_address: str, license_key: str, time_window_minutes: int = 15) -> bool:
    """Verifica se há atividade suspeita (muitas tentativas falhas)"""
    cutoff_time = dt.now() - timedelta(minutes=time_window_minutes)
    
    # Contar tentativas inválidas nos últimos 15 minutos
    failed_attempts = db.query(models.LicenseValidationLog).filter(
        models.LicenseValidationLog.ip_address == ip_address,
        models.LicenseValidationLog.validation_result == 'invalid',
        models.LicenseValidationLog.created_at >= cutoff_time
    ).count()
    
    # Se mais de 5 tentativas falhas em 15 minutos, é suspeito
    return failed_attempts >= 5


def check_device_limit(db: Session, license_key: str, max_devices: int = 3) -> tuple[bool, int]:
    """Verifica se a licença já atingiu o limite de dispositivos"""
    license = db.query(models.License).filter(
        models.License.license_key == license_key
    ).first()
    
    if not license:
        return True, 0  # Licença não existe, pode ativar
    
    # Buscar todas as licenças ativas com esta chave
    active_licenses = db.query(models.License).filter(
        models.License.license_key == license_key,
        models.License.device_id.isnot(None),
        models.License.is_active == True
    ).all()
    
    # Contar dispositivos únicos
    unique_devices = set(lic.device_id for lic in active_licenses if lic.device_id)
    device_count = len(unique_devices)
    
    return device_count < max_devices, device_count


def log_validation_attempt(
    db: Session,
    license_key: str,
    device_id: Optional[str],
    ip_address: str,
    user_agent: str,
    validation_result: str,
    error_message: Optional[str] = None,
    is_suspicious: bool = False
):
    """Registra tentativa de validação no log"""
    # Mascarar parte da chave para privacidade (mostrar apenas primeiros 10 caracteres)
    masked_key = license_key[:10] + "..." if len(license_key) > 10 else license_key
    
    log_entry = models.LicenseValidationLog(
        license_key=masked_key,
        device_id=device_id,
        ip_address=ip_address,
        user_agent=user_agent[:500] if user_agent else None,  # Limitar tamanho
        validation_result=validation_result,
        error_message=error_message,
        is_suspicious=is_suspicious
    )
    
    db.add(log_entry)
    try:
        db.commit()
    except Exception as e:
        security_logger.error(f"Erro ao salvar log de validação: {str(e)}")
        db.rollback()


@app.post("/api/validate-license", response_model=schemas.LicenseValidateResponse)
@limiter.limit("10/15minute")  # 10 tentativas a cada 15 minutos
def validate_license(
    request: Request,
    license_data: schemas.LicenseValidateRequest,
    api_key: str = Depends(verify_api_key)
):
    """Valida uma chave de licença PRO com medidas de segurança"""
    ip_address = get_remote_address(request)
    user_agent = request.headers.get("user-agent", "Unknown")
    
    security_logger.info(f"Validação de licença solicitada de {ip_address}")
    
    db = next(get_db())
    
    # Normalizar chave (remover espaços e hífens, converter para maiúsculas)
    normalized_key = license_data.key.upper().replace(' ', '').replace('-', '')
    
    # Validar formato básico
    if len(normalized_key) != 45 or not normalized_key.startswith('PRO'):
        log_validation_attempt(
            db, normalized_key, license_data.device_id, ip_address, user_agent,
            'invalid', 'Formato de chave inválido'
        )
        return schemas.LicenseValidateResponse(
            valid=False,
            error='Formato de chave inválido'
        )
    
    # Verificar atividade suspeita
    is_suspicious = check_suspicious_activity(db, ip_address, normalized_key)
    
    try:
        # Validar chave usando o gerador (HMAC-SHA256)
        validation_result = validate_license_key(normalized_key)
        
        if not validation_result.get('valid'):
            log_validation_attempt(
                db, normalized_key, license_data.device_id, ip_address, user_agent,
                'invalid', validation_result.get('error', 'Chave inválida'), is_suspicious
            )
            
            if is_suspicious:
                security_logger.warning(f"Tentativa suspeita de validação de {ip_address} - múltiplas tentativas falhas")
                # Enviar alerta de atividade suspeita
                alert_service.alert_suspicious_activity(
                    f"Multiplas tentativas falhas de validacao de {ip_address}",
                    ip_address,
                    count=5
                )
            
            return schemas.LicenseValidateResponse(
                valid=False,
                error=validation_result.get('error', 'Chave inválida')
            )
        
        # Verificar se a chave já foi registrada
        existing_license = db.query(models.License).filter(
            models.License.license_key == normalized_key
        ).first()
        
        if existing_license:
            # Verificar se foi revogada
            if not existing_license.is_active:
                log_validation_attempt(
                    db, normalized_key, license_data.device_id, ip_address, user_agent,
                    'revoked', 'Licença revogada'
                )
                return schemas.LicenseValidateResponse(
                    valid=False,
                    error='Licença revogada'
                )
            
            # Verificar se expirou
            expiration = existing_license.expiration_date
            now = dt.now(timezone.utc) if expiration.tzinfo else dt.now()
            if expiration < now:
                log_validation_attempt(
                    db, normalized_key, license_data.device_id, ip_address, user_agent,
                    'expired', 'Licença expirada'
                )
                return schemas.LicenseValidateResponse(
                    valid=False,
                    error='Licença expirada'
                )
            
            # Verificar limite de dispositivos se device_id foi fornecido
            if license_data.device_id:
                can_add_device, device_count = check_device_limit(db, normalized_key)
                
                # Verificar se este dispositivo já está associado
                device_license = db.query(models.License).filter(
                    models.License.license_key == normalized_key,
                    models.License.device_id == license_data.device_id
                ).first()
                
                if not device_license and not can_add_device:
                    log_validation_attempt(
                        db, normalized_key, license_data.device_id, ip_address, user_agent,
                        'invalid', f'Limite de dispositivos atingido ({device_count}/{3})'
                    )
                    return schemas.LicenseValidateResponse(
                        valid=False,
                        error=f'Limite de dispositivos atingido (máximo {3} dispositivos por licença)'
                    )
            
            log_validation_attempt(
                db, normalized_key, license_data.device_id, ip_address, user_agent,
                'valid', None, is_suspicious
            )
            
            return schemas.LicenseValidateResponse(
                valid=True,
                license_type=existing_license.license_type,
                expiration_date=existing_license.expiration_date.isoformat(),
                activated_at=existing_license.activated_at.isoformat()
            )
        
        # Chave válida mas ainda não registrada
        log_validation_attempt(
            db, normalized_key, license_data.device_id, ip_address, user_agent,
            'valid', None, is_suspicious
        )
        
        return schemas.LicenseValidateResponse(
            valid=True,
            license_type=validation_result['license_type'],
            expiration_date=validation_result['expiration_date'],
            activated_at=validation_result['activated_at']
        )
        
    except Exception as e:
        security_logger.error(f"Erro ao validar licença: {str(e)}")
        # Enviar alerta de erro critico
        alert_service.alert_critical_error(
            f"Erro ao validar licenca: {str(e)}",
            error=e
        )
        log_validation_attempt(
            db, normalized_key, license_data.device_id, ip_address, user_agent,
            'error', f'Erro interno: {str(e)}', is_suspicious
        )
        return schemas.LicenseValidateResponse(
            valid=False,
            error=f'Erro ao validar licença: {str(e)}'
        )


@app.post("/api/generate-license", response_model=schemas.LicenseGenerateResponse)
@limiter.limit("5/minute")
def generate_license(
    request: Request,
    license_data: schemas.LicenseGenerateRequest,
    api_key: str = Depends(verify_api_key)
):
    """Gera uma nova chave de licença PRO (apenas para administradores)"""
    security_logger.info(f"Geração de licença solicitada de {get_remote_address(request)}")
    
    db = next(get_db())
    
    try:
        # Gerar chave
        license_key = generate_license_key(
            license_type=license_data.license_type,
            user_id=license_data.user_id
        )
        
        # Calcular data de expiração
        duration = LICENSE_DURATIONS.get(license_data.license_type, timedelta(days=30))
        expiration_date = dt.now() + duration
        
        # Salvar no banco
        new_license = models.License(
            license_key=license_key,
            license_type=license_data.license_type,
            user_id=license_data.user_id,
            purchase_id=license_data.purchase_id,
            activated_at=dt.now(),
            expiration_date=expiration_date,
            is_active=True
        )
        
        db.add(new_license)
        safe_db_commit(db)
        
        return schemas.LicenseGenerateResponse(
            success=True,
            license_key=license_key,
            expiration_date=expiration_date.isoformat()
        )
        
    except Exception as e:
        security_logger.error(f"Erro ao gerar licença: {str(e)}")
        return schemas.LicenseGenerateResponse(
            success=False,
            error=f'Erro ao gerar licença: {str(e)}'
        )


@app.post("/api/revoke-license", response_model=schemas.LicenseRevokeResponse)
@limiter.limit("5/minute")
def revoke_license(
    request: Request,
    revoke_data: schemas.LicenseRevokeRequest,
    api_key: str = Depends(verify_api_key)
):
    """Revoga uma licença PRO (apenas para administradores)"""
    ip_address = get_remote_address(request)
    security_logger.warning(f"Tentativa de revogação de licença de {ip_address}")
    
    db = next(get_db())
    
    try:
        # Normalizar chave
        normalized_key = revoke_data.license_key.upper().replace(' ', '').replace('-', '')
        
        # Buscar licença
        license = db.query(models.License).filter(
            models.License.license_key == normalized_key
        ).first()
        
        if not license:
            return schemas.LicenseRevokeResponse(
                success=False,
                error="Licença não encontrada"
            )
        
        if not license.is_active:
            return schemas.LicenseRevokeResponse(
                success=False,
                error="Licença já está revogada"
            )
        
        # Revogar licença
        license.is_active = False
        license.updated_at = dt.now()
        
        safe_db_commit(db)
        
        security_logger.warning(
            f"Licença {normalized_key[:10]}... revogada. Motivo: {revoke_data.reason or 'Não informado'}"
        )
        
        return schemas.LicenseRevokeResponse(
            success=True,
            message=f"Licença revogada com sucesso. Motivo: {revoke_data.reason or 'Não informado'}"
        )
        
    except Exception as e:
        security_logger.error(f"Erro ao revogar licença: {str(e)}")
        return schemas.LicenseRevokeResponse(
            success=False,
            error=f'Erro ao revogar licença: {str(e)}'
        )


@app.get("/api/purchase-status/{purchase_id}", response_model=schemas.PurchaseStatusResponse)
@limiter.limit("20/minute")
def get_purchase_status(
    request: Request,
    purchase_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Verifica o status de uma compra"""
    security_logger.info(f"Status de compra {purchase_id} solicitado de {get_remote_address(request)}")
    
    db = next(get_db())
    
    purchase = db.query(models.Purchase).filter(
        models.Purchase.purchase_id == purchase_id
    ).first()
    
    if not purchase:
        return schemas.PurchaseStatusResponse(
            status="not_found",
            error="Compra não encontrada"
        )
    
    return schemas.PurchaseStatusResponse(
        status=purchase.status,
        license_key=purchase.license_key,
        purchase_date=purchase.created_at.isoformat() if purchase.created_at else None
    )


@app.post("/api/webhook/google-pay")
@limiter.limit("100/minute")
async def google_pay_webhook(
    request: Request,
    webhook_data: schemas.GooglePayWebhookRequest
):
    """Webhook para receber confirmações do Google Pay"""
    security_logger.info(f"Webhook Google Pay recebido: {webhook_data.purchase_id}")
    
    db = next(get_db())
    
    try:
        # Verificar se a compra já existe
        existing_purchase = db.query(models.Purchase).filter(
            models.Purchase.purchase_id == webhook_data.purchase_id
        ).first()
        
        if existing_purchase:
            # Atualizar status
            previous_status = existing_purchase.status
            existing_purchase.status = webhook_data.status
            existing_purchase.google_pay_transaction_id = webhook_data.transaction_id
            existing_purchase.updated_at = dt.now()
            
            # Alerta se mudou para failed
            if webhook_data.status == 'failed' and previous_status != 'failed':
                alert_service.alert_payment_failure(
                    webhook_data.purchase_id,
                    f"Compra falhou: {webhook_data.purchase_id}"
                )
            
            # Se completada e ainda não tem licença, gerar
            if webhook_data.status == 'completed' and not existing_purchase.license_key:
                license_key = generate_license_key(
                    license_type=webhook_data.license_type,
                    user_id=webhook_data.user_id
                )
                
                duration = LICENSE_DURATIONS.get(webhook_data.license_type, timedelta(days=30))
                expiration_date = dt.now() + duration
                
                # Criar licença
                new_license = models.License(
                    license_key=license_key,
                    license_type=webhook_data.license_type,
                    user_id=webhook_data.user_id,
                    purchase_id=webhook_data.purchase_id,
                    activated_at=dt.now(),
                    expiration_date=expiration_date,
                    is_active=True
                )
                
                db.add(new_license)
                existing_purchase.license_key = license_key
        else:
            # Criar nova compra
            new_purchase = models.Purchase(
                purchase_id=webhook_data.purchase_id,
                user_id=webhook_data.user_id,
                license_type=webhook_data.license_type,
                amount=webhook_data.amount,
                currency=webhook_data.currency,
                status=webhook_data.status,
                google_pay_transaction_id=webhook_data.transaction_id
            )
            
            db.add(new_purchase)
            
            # Se completada, gerar licença imediatamente
            if webhook_data.status == 'completed':
                license_key = generate_license_key(
                    license_type=webhook_data.license_type,
                    user_id=webhook_data.user_id
                )
                
                duration = LICENSE_DURATIONS.get(webhook_data.license_type, timedelta(days=30))
                expiration_date = dt.now() + duration
                
                new_license = models.License(
                    license_key=license_key,
                    license_type=webhook_data.license_type,
                    user_id=webhook_data.user_id,
                    purchase_id=webhook_data.purchase_id,
                    activated_at=dt.now(),
                    expiration_date=expiration_date,
                    is_active=True
                )
                
                db.add(new_license)
                new_purchase.license_key = license_key
        
        safe_db_commit(db)
        
        return {"status": "ok", "message": "Webhook processado com sucesso"}
        
    except Exception as e:
        security_logger.error(f"Erro ao processar webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar webhook: {str(e)}")


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/debug/api-key-info")
def debug_api_key_info():
    """Endpoint temporário de debug para verificar se a API_KEY está carregada corretamente"""
    api_key_from_env = os.getenv("API_KEY", "NOT_LOADED")
    
    # Retornar informações completas para debug (apenas em desenvolvimento)
    return {
        "status": "ok",
        "api_key_from_env_configured": api_key_from_env != "NOT_LOADED",
        "api_key_in_memory_configured": bool(API_KEY),
        "keys_match": api_key_from_env != "NOT_LOADED" and api_key_from_env == API_KEY,
        "note": "Este endpoint deve ser removido em produção"
    }


# ========== ANALYTICS E MONITORAMENTO ==========

@app.get("/api/analytics/licenses", response_model=schemas.LicenseStatsResponse)
@limiter.limit("30/minute")
def get_license_stats(request: Request, api_key: str = Depends(verify_api_key)):
    """Retorna estatísticas de licenças"""
    security_logger.info(f"Acesso GET /api/analytics/licenses de {get_remote_address(request)}")
    db = next(get_db())
    
    try:
        # Total de licenças
        total_licenses = db.query(models.License).count()
        
        # Licenças ativas (não expiradas e não revogadas)
        now = dt.now(timezone.utc)
        active_licenses = db.query(models.License).filter(
            models.License.is_active == True,
            models.License.expiration_date > now
        ).count()
        
        # Licenças expiradas
        expired_licenses = db.query(models.License).filter(
            models.License.expiration_date <= now,
            models.License.is_active == True
        ).count()
        
        # Licenças revogadas
        revoked_licenses = db.query(models.License).filter(
            models.License.is_active == False
        ).count()
        
        # Licenças por tipo
        licenses_by_type = {}
        for license_type in ['1_month', '6_months', '1_year']:
            count = db.query(models.License).filter(
                models.License.license_type == license_type
            ).count()
            licenses_by_type[license_type] = count
        
        # Licenças por status
        licenses_by_status = {
            "active": active_licenses,
            "expired": expired_licenses,
            "revoked": revoked_licenses
        }
        
        return schemas.LicenseStatsResponse(
            total_licenses=total_licenses,
            active_licenses=active_licenses,
            expired_licenses=expired_licenses,
            revoked_licenses=revoked_licenses,
            licenses_by_type=licenses_by_type,
            licenses_by_status=licenses_by_status
        )
    except Exception as e:
        security_logger.error(f"Erro ao obter estatísticas de licenças: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter estatísticas: {str(e)}")


@app.get("/api/analytics/activations", response_model=schemas.ActivationStatsResponse)
@limiter.limit("30/minute")
def get_activation_stats(request: Request, api_key: str = Depends(verify_api_key)):
    """Retorna estatísticas de ativações de licenças"""
    security_logger.info(f"Acesso GET /api/analytics/activations de {get_remote_address(request)}")
    db = next(get_db())
    
    try:
        now = dt.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)
        
        # Total de ativações (licenças com device_id)
        total_activations = db.query(models.License).filter(
            models.License.device_id.isnot(None)
        ).count()
        
        # Ativações hoje
        activations_today = db.query(models.License).filter(
            models.License.device_id.isnot(None),
            models.License.activated_at >= today_start
        ).count()
        
        # Ativações esta semana
        activations_this_week = db.query(models.License).filter(
            models.License.device_id.isnot(None),
            models.License.activated_at >= week_start
        ).count()
        
        # Ativações este mês
        activations_this_month = db.query(models.License).filter(
            models.License.device_id.isnot(None),
            models.License.activated_at >= month_start
        ).count()
        
        # Ativações por tipo
        activations_by_type = {}
        for license_type in ['1_month', '6_months', '1_year']:
            count = db.query(models.License).filter(
                models.License.license_type == license_type,
                models.License.device_id.isnot(None)
            ).count()
            activations_by_type[license_type] = count
        
        # Tendência de ativações (últimos 30 dias)
        activation_trend = []
        for i in range(30):
            date = today_start - timedelta(days=i)
            next_date = date + timedelta(days=1)
            count = db.query(models.License).filter(
                models.License.device_id.isnot(None),
                models.License.activated_at >= date,
                models.License.activated_at < next_date
            ).count()
            activation_trend.append({
                "date": date.strftime("%Y-%m-%d"),
                "count": count
            })
        activation_trend.reverse()  # Mais antigo primeiro
        
        return schemas.ActivationStatsResponse(
            total_activations=total_activations,
            activations_today=activations_today,
            activations_this_week=activations_this_week,
            activations_this_month=activations_this_month,
            activations_by_type=activations_by_type,
            activation_trend=activation_trend
        )
    except Exception as e:
        security_logger.error(f"Erro ao obter estatísticas de ativações: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter estatísticas: {str(e)}")


@app.get("/api/analytics/validations", response_model=schemas.ValidationStatsResponse)
@limiter.limit("30/minute")
def get_validation_stats(request: Request, api_key: str = Depends(verify_api_key)):
    """Retorna estatísticas de validações de licenças"""
    security_logger.info(f"Acesso GET /api/analytics/validations de {get_remote_address(request)}")
    db = next(get_db())
    
    try:
        now = dt.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        
        # Total de validações
        total_validations = db.query(models.LicenseValidationLog).count()
        
        # Validações bem-sucedidas
        successful_validations = db.query(models.LicenseValidationLog).filter(
            models.LicenseValidationLog.validation_result == 'valid'
        ).count()
        
        # Validações falhas
        failed_validations = db.query(models.LicenseValidationLog).filter(
            models.LicenseValidationLog.validation_result != 'valid'
        ).count()
        
        # Tentativas suspeitas
        suspicious_attempts = db.query(models.LicenseValidationLog).filter(
            models.LicenseValidationLog.is_suspicious == True
        ).count()
        
        # Validações hoje
        validations_today = db.query(models.LicenseValidationLog).filter(
            models.LicenseValidationLog.created_at >= today_start
        ).count()
        
        # Validações esta semana
        validations_this_week = db.query(models.LicenseValidationLog).filter(
            models.LicenseValidationLog.created_at >= week_start
        ).count()
        
        # Resultados por tipo
        validation_results = {}
        for result in ['valid', 'invalid', 'expired', 'revoked', 'error']:
            count = db.query(models.LicenseValidationLog).filter(
                models.LicenseValidationLog.validation_result == result
            ).count()
            validation_results[result] = count
        
        # Top mensagens de erro
        from sqlalchemy import func
        error_logs = db.query(
            models.LicenseValidationLog.error_message,
            func.count(models.LicenseValidationLog.id).label('count')
        ).filter(
            models.LicenseValidationLog.error_message.isnot(None)
        ).group_by(
            models.LicenseValidationLog.error_message
        ).order_by(
            func.count(models.LicenseValidationLog.id).desc()
        ).limit(10).all()
        
        top_error_messages = [
            {"error": error, "count": count}
            for error, count in error_logs
        ]
        
        return schemas.ValidationStatsResponse(
            total_validations=total_validations,
            successful_validations=successful_validations,
            failed_validations=failed_validations,
            suspicious_attempts=suspicious_attempts,
            validations_today=validations_today,
            validations_this_week=validations_this_week,
            validation_results=validation_results,
            top_error_messages=top_error_messages
        )
    except Exception as e:
        security_logger.error(f"Erro ao obter estatísticas de validações: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter estatísticas: {str(e)}")


@app.get("/api/analytics/purchases", response_model=schemas.PurchaseStatsResponse)
@limiter.limit("30/minute")
def get_purchase_stats(request: Request, api_key: str = Depends(verify_api_key)):
    """Retorna estatísticas de compras"""
    security_logger.info(f"Acesso GET /api/analytics/purchases de {get_remote_address(request)}")
    db = next(get_db())
    
    try:
        now = dt.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)
        
        # Total de compras
        total_purchases = db.query(models.Purchase).count()
        
        # Compras completadas
        completed_purchases = db.query(models.Purchase).filter(
            models.Purchase.status == 'completed'
        ).count()
        
        # Compras pendentes
        pending_purchases = db.query(models.Purchase).filter(
            models.Purchase.status == 'pending'
        ).count()
        
        # Compras falhas
        failed_purchases = db.query(models.Purchase).filter(
            models.Purchase.status == 'failed'
        ).count()
        
        # Receita total (apenas compras completadas)
        from sqlalchemy import func
        total_revenue_result = db.query(
            func.sum(func.cast(models.Purchase.amount, Float))
        ).filter(
            models.Purchase.status == 'completed'
        ).scalar()
        total_revenue = float(total_revenue_result) if total_revenue_result else 0.0
        
        # Receita por tipo
        revenue_by_type = {}
        for license_type in ['1_month', '6_months', '1_year']:
            revenue_result = db.query(
                func.sum(func.cast(models.Purchase.amount, Float))
            ).filter(
                models.Purchase.license_type == license_type,
                models.Purchase.status == 'completed'
            ).scalar()
            revenue_by_type[license_type] = float(revenue_result) if revenue_result else 0.0
        
        # Compras hoje
        purchases_today = db.query(models.Purchase).filter(
            models.Purchase.created_at >= today_start
        ).count()
        
        # Compras esta semana
        purchases_this_week = db.query(models.Purchase).filter(
            models.Purchase.created_at >= week_start
        ).count()
        
        # Compras este mês
        purchases_this_month = db.query(models.Purchase).filter(
            models.Purchase.created_at >= month_start
        ).count()
        
        return schemas.PurchaseStatsResponse(
            total_purchases=total_purchases,
            completed_purchases=completed_purchases,
            pending_purchases=pending_purchases,
            failed_purchases=failed_purchases,
            total_revenue=total_revenue,
            revenue_by_type=revenue_by_type,
            purchases_today=purchases_today,
            purchases_this_week=purchases_this_week,
            purchases_this_month=purchases_this_month
        )
    except Exception as e:
        security_logger.error(f"Erro ao obter estatísticas de compras: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter estatísticas: {str(e)}")


@app.get("/api/analytics/dashboard", response_model=schemas.DashboardResponse)
@limiter.limit("30/minute")
def get_dashboard(request: Request, api_key: str = Depends(verify_api_key)):
    """Retorna dashboard completo com todas as métricas"""
    security_logger.info(f"Acesso GET /api/analytics/dashboard de {get_remote_address(request)}")
    
    # Obter todas as estatísticas diretamente (evitar recursão)
    db = next(get_db())
    
    try:
        # Estatísticas de licenças
        now = dt.now(timezone.utc)
        total_licenses = db.query(models.License).count()
        active_licenses = db.query(models.License).filter(
            models.License.is_active == True,
            models.License.expiration_date > now
        ).count()
        expired_licenses = db.query(models.License).filter(
            models.License.expiration_date <= now,
            models.License.is_active == True
        ).count()
        revoked_licenses = db.query(models.License).filter(
            models.License.is_active == False
        ).count()
        licenses_by_type = {}
        for license_type in ['1_month', '6_months', '1_year']:
            licenses_by_type[license_type] = db.query(models.License).filter(
                models.License.license_type == license_type
            ).count()
        license_stats = schemas.LicenseStatsResponse(
            total_licenses=total_licenses,
            active_licenses=active_licenses,
            expired_licenses=expired_licenses,
            revoked_licenses=revoked_licenses,
            licenses_by_type=licenses_by_type,
            licenses_by_status={"active": active_licenses, "expired": expired_licenses, "revoked": revoked_licenses}
        )
        
        # Estatísticas de ativações (simplificado para evitar duplicação)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)
        total_activations = db.query(models.License).filter(
            models.License.device_id.isnot(None)
        ).count()
        activations_by_type = {}
        for license_type in ['1_month', '6_months', '1_year']:
            activations_by_type[license_type] = db.query(models.License).filter(
                models.License.license_type == license_type,
                models.License.device_id.isnot(None)
            ).count()
        activation_trend = []
        for i in range(30):
            date = today_start - timedelta(days=i)
            next_date = date + timedelta(days=1)
            count = db.query(models.License).filter(
                models.License.device_id.isnot(None),
                models.License.activated_at >= date,
                models.License.activated_at < next_date
            ).count()
            activation_trend.append({"date": date.strftime("%Y-%m-%d"), "count": count})
        activation_trend.reverse()
        activation_stats = schemas.ActivationStatsResponse(
            total_activations=total_activations,
            activations_today=db.query(models.License).filter(
                models.License.device_id.isnot(None),
                models.License.activated_at >= today_start
            ).count(),
            activations_this_week=db.query(models.License).filter(
                models.License.device_id.isnot(None),
                models.License.activated_at >= week_start
            ).count(),
            activations_this_month=db.query(models.License).filter(
                models.License.device_id.isnot(None),
                models.License.activated_at >= month_start
            ).count(),
            activations_by_type=activations_by_type,
            activation_trend=activation_trend
        )
        
        # Estatísticas de validações
        total_validations = db.query(models.LicenseValidationLog).count()
        validation_results = {}
        for result in ['valid', 'invalid', 'expired', 'revoked', 'error']:
            validation_results[result] = db.query(models.LicenseValidationLog).filter(
                models.LicenseValidationLog.validation_result == result
            ).count()
        from sqlalchemy import func
        error_logs = db.query(
            models.LicenseValidationLog.error_message,
            func.count(models.LicenseValidationLog.id).label('count')
        ).filter(
            models.LicenseValidationLog.error_message.isnot(None)
        ).group_by(
            models.LicenseValidationLog.error_message
        ).order_by(
            func.count(models.LicenseValidationLog.id).desc()
        ).limit(10).all()
        validation_stats = schemas.ValidationStatsResponse(
            total_validations=total_validations,
            successful_validations=validation_results.get('valid', 0),
            failed_validations=total_validations - validation_results.get('valid', 0),
            suspicious_attempts=db.query(models.LicenseValidationLog).filter(
                models.LicenseValidationLog.is_suspicious == True
            ).count(),
            validations_today=db.query(models.LicenseValidationLog).filter(
                models.LicenseValidationLog.created_at >= today_start
            ).count(),
            validations_this_week=db.query(models.LicenseValidationLog).filter(
                models.LicenseValidationLog.created_at >= week_start
            ).count(),
            validation_results=validation_results,
            top_error_messages=[{"error": error, "count": count} for error, count in error_logs]
        )
        
        # Estatísticas de compras
        total_purchases = db.query(models.Purchase).count()
        total_revenue_result = db.query(
            func.sum(func.cast(models.Purchase.amount, Float))
        ).filter(
            models.Purchase.status == 'completed'
        ).scalar()
        revenue_by_type = {}
        for license_type in ['1_month', '6_months', '1_year']:
            revenue_result = db.query(
                func.sum(func.cast(models.Purchase.amount, Float))
            ).filter(
                models.Purchase.license_type == license_type,
                models.Purchase.status == 'completed'
            ).scalar()
            revenue_by_type[license_type] = float(revenue_result) if revenue_result else 0.0
        purchase_stats = schemas.PurchaseStatsResponse(
            total_purchases=total_purchases,
            completed_purchases=db.query(models.Purchase).filter(
                models.Purchase.status == 'completed'
            ).count(),
            pending_purchases=db.query(models.Purchase).filter(
                models.Purchase.status == 'pending'
            ).count(),
            failed_purchases=db.query(models.Purchase).filter(
                models.Purchase.status == 'failed'
            ).count(),
            total_revenue=float(total_revenue_result) if total_revenue_result else 0.0,
            revenue_by_type=revenue_by_type,
            purchases_today=db.query(models.Purchase).filter(
                models.Purchase.created_at >= today_start
            ).count(),
            purchases_this_week=db.query(models.Purchase).filter(
                models.Purchase.created_at >= week_start
            ).count(),
            purchases_this_month=db.query(models.Purchase).filter(
                models.Purchase.created_at >= month_start
            ).count()
        )
        
        return schemas.DashboardResponse(
            license_stats=license_stats,
            activation_stats=activation_stats,
            validation_stats=validation_stats,
            purchase_stats=purchase_stats,
            last_updated=now
        )
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        security_logger.error(f"Erro ao obter dashboard: {str(e)}\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter dashboard: {str(e)}")

