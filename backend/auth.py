import logging
import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError, jwt
import bcrypt as _bcrypt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import models
from services.token_blacklist import is_blacklisted, add_to_blacklist

security_logger = logging.getLogger("security")

if not hasattr(_bcrypt, "__about__"):
    class _About:
        __version__ = getattr(_bcrypt, "__version__", "unknown")
    _bcrypt.__about__ = _About()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    JWT_SECRET_KEY = os.getenv("API_KEY") or secrets.token_urlsafe(32)
    security_logger.warning("JWT_SECRET_KEY nao configurada. Usando chave temporaria.")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
REQUIRE_EMAIL_VERIFICATION = os.getenv("REQUIRE_EMAIL_VERIFICATION", "true").lower() == "true"
ALLOW_EMAIL_DEBUG = os.getenv("ALLOW_EMAIL_DEBUG", "false").lower() == "true"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_token(token: str) -> str:
    return _hash_token(token)


def create_refresh_token(db: Session, user_id: int, device_id: str | None = None) -> str:
    raw_token = secrets.token_urlsafe(48)
    token_id = secrets.token_hex(16)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    token_hash = _hash_token(raw_token)
    db_token = models.RefreshToken(
        token_id=token_id,
        token_hash=token_hash,
        user_id=user_id,
        device_id=device_id,
        expires_at=expires_at,
        revoked=False
    )
    db.add(db_token)
    db.commit()
    return raw_token


def revoke_refresh_token(db: Session, token_hash: str, access_token: str = None) -> None:
    token = db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == token_hash
    ).first()
    if token and not token.revoked:
        token.revoked = True
        db.commit()
        
        # Adicionar access token à blacklist se fornecido
        if access_token:
            try:
                # Obter tempo de expiração do token
                payload = decode_token_payload(access_token)
                exp = payload.get("exp")
                if exp:
                    now = datetime.now(timezone.utc).timestamp()
                    expires_in = int(exp - now)
                    if expires_in > 0:
                        add_to_blacklist(access_token, expires_in)
            except Exception as e:
                security_logger.warning(f"Erro ao adicionar access token à blacklist: {e}")


def revoke_all_refresh_tokens(db: Session, user_id: int) -> None:
    # Buscar todos os tokens ativos antes de revogar
    active_tokens = db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user_id,
        models.RefreshToken.revoked == False
    ).all()
    
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user_id,
        models.RefreshToken.revoked == False
    ).update({"revoked": True})
    db.commit()
    
    # Nota: Não podemos adicionar access tokens à blacklist aqui porque
    # não temos acesso a eles. A blacklist será verificada quando o token
    # for usado novamente, e o refresh token já estará revogado.


def verify_refresh_token(db: Session, raw_token: str):
    token_hash = _hash_token(raw_token)
    token = db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == token_hash
    ).first()
    if not token or token.revoked:
        return None
    if token.expires_at < datetime.now(timezone.utc):
        return None
    return token


def cleanup_expired_refresh_tokens(db: Session) -> int:
    cutoff = datetime.now(timezone.utc)
    deleted = db.query(models.RefreshToken).filter(
        models.RefreshToken.expires_at < cutoff
    ).delete()
    db.commit()
    return deleted


def cleanup_revoked_refresh_tokens(db: Session) -> int:
    deleted = db.query(models.RefreshToken).filter(
        models.RefreshToken.revoked == True
    ).delete()
    db.commit()
    return deleted


def create_email_verification_token() -> str:
    # 6-digit numeric code (easier to type on mobile)
    return f"{secrets.randbelow(1000000):06d}"


def create_password_reset_token() -> str:
    return secrets.token_urlsafe(32)


def get_user_from_token(db: Session, token: str):
    # Verificar blacklist antes de validar token
    if is_blacklisted(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked")
    
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user = db.query(models.User).filter(models.User.id == int(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        if REQUIRE_EMAIL_VERIFICATION and not user.email_verified:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def decode_token_payload(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
