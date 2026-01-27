"""
Utilitários de validação e sanitização de entrada.
Proteção contra XSS, SQL injection, e validação de tipos.
"""
import re
import html
from typing import Any, Optional
from pydantic import BaseModel, ValidationError
import logging

logger = logging.getLogger(__name__)

# Limites de tamanho
MAX_STRING_LENGTH = 10000  # 10KB
MAX_EMAIL_LENGTH = 255
MAX_PASSWORD_LENGTH = 128
MAX_PAYLOAD_SIZE = 1024 * 1024  # 1MB


def sanitize_string(value: str, max_length: Optional[int] = None) -> str:
    """
    Sanitiza string removendo caracteres perigosos e limitando tamanho.
    
    Args:
        value: String a ser sanitizada
        max_length: Tamanho máximo (padrão: MAX_STRING_LENGTH)
    
    Returns:
        String sanitizada
    """
    if not isinstance(value, str):
        return ""
    
    max_len = max_length or MAX_STRING_LENGTH
    
    # Remover caracteres de controle (exceto \n, \r, \t)
    sanitized = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', value)
    
    # Limitar tamanho
    if len(sanitized) > max_len:
        sanitized = sanitized[:max_len]
        logger.warning(f"String truncada para {max_len} caracteres")
    
    return sanitized


def sanitize_html(value: str) -> str:
    """
    Escapa caracteres HTML para prevenir XSS.
    
    Args:
        value: String que pode conter HTML
    
    Returns:
        String com HTML escapado
    """
    if not isinstance(value, str):
        return ""
    
    return html.escape(value, quote=True)


def validate_email(email: str) -> bool:
    """
    Valida formato de email.
    
    Args:
        email: Email a ser validado
    
    Returns:
        True se válido, False caso contrário
    """
    if not isinstance(email, str):
        return False
    
    if len(email) > MAX_EMAIL_LENGTH:
        return False
    
    # Regex básico para email
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip().lower()))


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Valida força da senha.
    
    Args:
        password: Senha a ser validada
    
    Returns:
        Tuple (is_valid, error_message)
    """
    if not isinstance(password, str):
        return False, "Senha deve ser uma string"
    
    if len(password) < 8:
        return False, "Senha deve ter pelo menos 8 caracteres"
    
    if len(password) > MAX_PASSWORD_LENGTH:
        return False, f"Senha deve ter no máximo {MAX_PASSWORD_LENGTH} caracteres"
    
    # Verificar se tem pelo menos uma letra minúscula
    if not re.search(r'[a-z]', password):
        return False, "Senha deve conter pelo menos uma letra minúscula"
    
    # Verificar se tem pelo menos uma letra maiúscula
    if not re.search(r'[A-Z]', password):
        return False, "Senha deve conter pelo menos uma letra maiúscula"
    
    # Verificar se tem pelo menos um número
    if not re.search(r'\d', password):
        return False, "Senha deve conter pelo menos um número"
    
    return True, None


def validate_payload_size(payload: Any, max_size: Optional[int] = None) -> tuple[bool, Optional[str]]:
    """
    Valida tamanho do payload.
    
    Args:
        payload: Payload a ser validado (dict, list, str, etc)
        max_size: Tamanho máximo em bytes (padrão: MAX_PAYLOAD_SIZE)
    
    Returns:
        Tuple (is_valid, error_message)
    """
    import json
    
    max_bytes = max_size or MAX_PAYLOAD_SIZE
    
    try:
        # Converter para JSON para calcular tamanho
        json_str = json.dumps(payload)
        size = len(json_str.encode('utf-8'))
        
        if size > max_bytes:
            return False, f"Payload muito grande ({size} bytes). Máximo: {max_bytes} bytes"
        
        return True, None
    except (TypeError, ValueError) as e:
        logger.warning(f"Erro ao validar tamanho do payload: {e}")
        return False, "Erro ao validar payload"


def sanitize_input(data: dict[str, Any]) -> dict[str, Any]:
    """
    Sanitiza todos os campos de string em um dicionário.
    
    Args:
        data: Dicionário com dados a serem sanitizados
    
    Returns:
        Dicionário com dados sanitizados
    """
    sanitized = {}
    
    for key, value in data.items():
        if isinstance(value, str):
            # Sanitizar strings
            sanitized[key] = sanitize_string(value)
        elif isinstance(value, dict):
            # Recursivamente sanitizar dicionários aninhados
            sanitized[key] = sanitize_input(value)
        elif isinstance(value, list):
            # Sanitizar listas
            sanitized[key] = [
                sanitize_input(item) if isinstance(item, dict) else (
                    sanitize_string(item) if isinstance(item, str) else item
                )
                for item in value
            ]
        else:
            # Manter outros tipos como estão
            sanitized[key] = value
    
    return sanitized


def validate_and_sanitize_model(model: BaseModel) -> BaseModel:
    """
    Valida e sanitiza um modelo Pydantic.
    
    Args:
        model: Modelo Pydantic a ser validado e sanitizado
    
    Returns:
        Modelo validado e sanitizado
    """
    # Converter para dict
    data = model.dict()
    
    # Sanitizar
    sanitized_data = sanitize_input(data)
    
    # Criar novo modelo com dados sanitizados
    return model.__class__(**sanitized_data)
