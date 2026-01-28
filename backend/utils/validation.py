"""
Utilitários de validação e sanitização de entrada.
Proteção contra XSS, SQL injection, e validação de tipos.
"""
import re
import html
from typing import Any, Optional, Iterable
from urllib.parse import urlparse
from pydantic import BaseModel, ValidationError
import logging

logger = logging.getLogger(__name__)

# Limites de tamanho
MAX_STRING_LENGTH = 10000  # 10KB
MAX_EMAIL_LENGTH = 255
MAX_PASSWORD_LENGTH = 128
MAX_PAYLOAD_SIZE = 1024 * 1024  # 1MB
MAX_PAYLOAD_SIZE_KB = 1024  # 1MB (compatibilidade com testes)
MAX_TEXT_FIELD_LENGTH = 1000
MAX_URL_LENGTH = 2048


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

    # Remove tags perigosas (script/iframe) e seu conteúdo quando aplicável
    sanitized = re.sub(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", "", value, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r"<\s*iframe[^>]*>.*?<\s*/\s*iframe\s*>", "", sanitized, flags=re.IGNORECASE | re.DOTALL)

    # Remove atributos de evento (onclick, onload, etc.)
    sanitized = re.sub(r"\son\w+\s*=\s*(['\"]).*?\1", "", sanitized, flags=re.IGNORECASE | re.DOTALL)

    # Neutraliza javascript: em href/src
    sanitized = re.sub(r"""(\s(?:href|src)\s*=\s*['"])\s*javascript:[^'"]*(['"])""", r"\1#\2", sanitized, flags=re.IGNORECASE)

    # Não fazemos uma whitelist completa de tags aqui; apenas devolvemos HTML sanitizado
    return sanitized


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


def validate_url(url: str) -> bool:
    """
    Valida URLs http/https e limita tamanho.
    """
    if not isinstance(url, str):
        return False

    url = url.strip()
    if not url or len(url) > MAX_URL_LENGTH:
        return False

    # Bloquear esquemas perigosos explícitos
    lowered = url.lower()
    if lowered.startswith("javascript:"):
        return False

    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        if not parsed.netloc:
            return False
        return True
    except Exception:
        return False


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


def validate_payload_size(payload: Any, max_size_kb: Optional[int] = None) -> bool:
    """
    Valida tamanho do payload.

    Retorna booleano por compatibilidade com a suíte de testes.
    """
    is_valid, _error = validate_payload_size_detailed(payload, max_size_kb=max_size_kb)
    return is_valid


def validate_payload_size_detailed(payload: Any, max_size_kb: Optional[int] = None) -> tuple[bool, Optional[str]]:
    """
    Valida tamanho do payload e retorna mensagem de erro (usado por middleware).
    """
    import json

    max_kb = max_size_kb or MAX_PAYLOAD_SIZE_KB
    max_bytes = max_kb * 1024

    try:
        json_str = json.dumps(payload, ensure_ascii=False)
        size = len(json_str.encode("utf-8"))

        if size > max_bytes:
            return False, f"Payload muito grande ({size} bytes). Máximo: {max_bytes} bytes"

        return True, None
    except (TypeError, ValueError) as e:
        logger.warning(f"Erro ao validar tamanho do payload: {e}")
        return False, "Erro ao validar payload"


def sanitize_input(value: Any, max_length: Optional[int] = None) -> Any:
    """
    Sanitiza entrada de forma segura.

    - Para `dict`/`list`: sanitiza recursivamente strings (preserva números/bools).
    - Para valores escalares: converte para string, remove chars de controle, normaliza espaços,
      faz strip e aplica limite de tamanho.

    Observação: preserva `\n`, `\r` e `\t`.
    """
    if isinstance(value, dict):
        return sanitize_dict(value)
    if isinstance(value, list):
        return [sanitize_input(v, max_length=max_length) for v in value]

    # Escalares → string sanitizada (compatível com testes)
    if value is None:
        return ""

    text = value if isinstance(value, str) else str(value)

    # Remover caracteres de controle (exceto \n, \r, \t)
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)

    # Normalizar espaços (sem colapsar newlines/tabs)
    text = re.sub(r"[ ]{2,}", " ", text)

    # Remover espaços nas extremidades (inclui quebras e tabs nas extremidades)
    text = text.strip()

    max_len = max_length or MAX_STRING_LENGTH
    if len(text) > max_len:
        text = text[:max_len]
        logger.warning(f"String truncada para {max_len} caracteres")

    return text


def sanitize_sql_input(value: Any) -> str:
    """
    Sanitiza entrada usada em contextos SQL (defensivo).
    Não substitui parametrização/ORM.
    """
    text = sanitize_input(value)
    if not isinstance(text, str):
        text = str(text)

    # Remover comentários SQL
    text = re.sub(r"--.*", "", text, flags=re.MULTILINE)
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)

    # Remover delimitadores comuns
    text = text.replace(";", "")
    text = text.replace("'", "")
    text = text.replace('"', "")

    # Remover keywords óbvias (caso-insensível)
    text = re.sub(r"\b(drop|truncate|alter|create)\b", "", text, flags=re.IGNORECASE)

    return text.strip()


def validate_text_field(value: Any, field_name: str, max_length: int = MAX_TEXT_FIELD_LENGTH) -> tuple[bool, Optional[str]]:
    """
    Valida um campo de texto simples (não-vazio e com tamanho máximo).
    """
    if not isinstance(value, str):
        return False, f"{field_name} deve ser uma string"

    if value.strip() == "":
        return False, f"{field_name} não pode estar vazio"

    if len(value) > max_length:
        return False, f"{field_name} excede o tamanho máximo de {max_length} caracteres"

    return True, None


def sanitize_dict(data: dict[str, Any], sanitize_html_fields: Optional[Iterable[str]] = None) -> dict[str, Any]:
    """
    Sanitiza strings em um dicionário (recursivo).
    """
    html_fields = set(sanitize_html_fields or [])
    sanitized: dict[str, Any] = {}

    for key, val in data.items():
        if isinstance(val, dict):
            sanitized[key] = sanitize_dict(val, sanitize_html_fields=sanitize_html_fields)
        elif isinstance(val, list):
            sanitized[key] = [
                sanitize_dict(item, sanitize_html_fields=sanitize_html_fields) if isinstance(item, dict) else sanitize_input(item)
                for item in val
            ]
        elif isinstance(val, str):
            sanitized[key] = sanitize_html(val) if key in html_fields else sanitize_input(val)
        else:
            sanitized[key] = val

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
    sanitized_data = sanitize_dict(data)
    
    # Criar novo modelo com dados sanitizados
    return model.__class__(**sanitized_data)
