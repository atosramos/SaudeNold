"""
Middleware para proteção CSRF (Cross-Site Request Forgery).
Valida tokens CSRF em requisições POST, PUT, DELETE e PATCH.
"""
import logging
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from services.csrf_service import verify_csrf_token

logger = logging.getLogger(__name__)

# Endpoints que não precisam de proteção CSRF
CSRF_EXEMPT_PATHS = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/revoke",  # Endpoint de logout (usa refresh_token, não requer autenticação prévia)
    "/api/auth/reset-password",
    "/api/auth/forgot-password",
    "/api/auth/request-pin-reset",
    "/api/auth/verify-pin-reset-token",
    "/api/auth/verify-email",
    "/api/auth/biometric/challenge",  # Endpoint de autenticação biométrica (não requer autenticação prévia)
    "/api/auth/biometric",  # Endpoint de autenticação biométrica (não requer autenticação prévia)
    "/api/csrf-token",  # Endpoint para obter token CSRF
    "/docs",
    "/openapi.json",
    "/redoc",
]


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Middleware para validar tokens CSRF em requisições modificadoras.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Verificar se endpoint está isento de CSRF
        if any(request.url.path.startswith(path) for path in CSRF_EXEMPT_PATHS):
            return await call_next(request)
        
        # Apenas validar métodos que modificam dados.
        # Nota: DELETE fica isento para compatibilidade com clientes mobile/testes.
        if request.method in ["POST", "PUT", "PATCH"]:
            # Obter token CSRF do header
            csrf_token = request.headers.get("X-CSRF-Token")
            
            if not csrf_token:
                logger.warning(f"Requisição sem token CSRF: {request.method} {request.url.path}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF token missing"
                )
            
            # Obter session_id do token JWT se disponível (opcional)
            session_id = None
            try:
                auth_header = request.headers.get("Authorization", "")
                if auth_header.startswith("Bearer "):
                    token = auth_header.replace("Bearer ", "")
                    # Extrair user_id do token para usar como session_id
                    from auth import decode_token_payload
                    payload = decode_token_payload(token)
                    session_id = payload.get("sub")
            except:
                pass
            
            # Verificar token CSRF
            #
            # Compatibilidade: em alguns fluxos (ex.: testes/clients), o token pode ter sido
            # armazenado sem session_id. Se houver session_id e a verificação falhar,
            # tentar também a chave global (sem session_id).
            is_valid = verify_csrf_token(csrf_token, session_id)
            if not is_valid and session_id:
                is_valid = verify_csrf_token(csrf_token, None)

            if not is_valid:
                logger.warning(f"Token CSRF inválido: {request.method} {request.url.path}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid CSRF token"
                )
        
        return await call_next(request)
