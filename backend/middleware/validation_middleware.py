"""
Middleware de validação de entrada.
Valida tamanho de payloads e sanitiza dados.
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.validation import validate_payload_size, sanitize_input

logger = logging.getLogger(__name__)

# Endpoints que devem ter validação de payload
VALIDATION_REQUIRED_PATHS = [
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/family/",
]


class ValidationMiddleware(BaseHTTPMiddleware):
    """
    Middleware para validar tamanho de payloads e sanitizar dados.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Apenas validar métodos que podem ter payload
        if request.method not in ["POST", "PUT", "PATCH"]:
            return await call_next(request)
        
        # Verificar se endpoint requer validação
        requires_validation = any(
            request.url.path.startswith(path) for path in VALIDATION_REQUIRED_PATHS
        )
        
        if not requires_validation:
            return await call_next(request)
        
        # Ler body para validar tamanho
        body = await request.body()
        
        if body:
            try:
                import json
                payload = json.loads(body.decode('utf-8'))
                
                # Validar tamanho do payload
                is_valid, error_message = validate_payload_size(payload)
                if not is_valid:
                    logger.warning(f"Payload muito grande em {request.url.path}: {error_message}")
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"detail": error_message}
                    )
                
                # Sanitizar payload
                sanitized_payload = sanitize_input(payload)
                
                # Substituir body com payload sanitizado
                import json as json_module
                sanitized_body = json_module.dumps(sanitized_payload).encode('utf-8')
                
                # Criar novo request com body sanitizado
                async def receive():
                    return {"type": "http.request", "body": sanitized_body}
                
                request._receive = receive
                
            except json.JSONDecodeError:
                # Se não for JSON válido, deixar passar (será validado pelo Pydantic)
                pass
            except Exception as e:
                logger.error(f"Erro no middleware de validação: {e}")
                # Em caso de erro, deixar passar (fail-open)
                pass
        
        return await call_next(request)
