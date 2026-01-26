"""
Utilitários para validação e sanitização de entrada.
Proteção contra XSS, SQL injection e outros ataques.
"""
import re
import logging
from typing import Any, Dict, Optional
from bleach import clean, ALLOWED_TAGS
try:
    from bleach.css_sanitizer import CSSSanitizer
    CSS_SANITIZER_AVAILABLE = True
except ImportError:
    CSS_SANITIZER_AVAILABLE = False
    CSSSanitizer = None

logger = logging.getLogger(__name__)

# Tamanho máximo de payload (em KB)
MAX_PAYLOAD_SIZE_KB = 1024  # 1MB
MAX_PAYLOAD_SIZE_BYTES = MAX_PAYLOAD_SIZE_KB * 1024

# Tamanho máximo de campos de texto individuais
MAX_TEXT_FIELD_LENGTH = 10000
MAX_EMAIL_LENGTH = 255
MAX_URL_LENGTH = 2048


def sanitize_input(text: str, max_length: Optional[int] = None) -> str:
    """
    Sanitiza entrada de texto removendo caracteres perigosos.
    
    Args:
        text: Texto a ser sanitizado
        max_length: Tamanho máximo permitido (None = sem limite)
    
    Returns:
        Texto sanitizado
    """
    if not isinstance(text, str):
        text = str(text)
    
    # Remover caracteres de controle (exceto \n, \r, \t)
    text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', '', text)
    
    # Limitar tamanho
    if max_length:
        text = text[:max_length]
    
    # Remover espaços em branco excessivos, mas preservar newlines e tabs
    # Substituir múltiplos espaços por um único espaço, mas manter \n, \r, \t
    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        # Preservar tabs, apenas limpar espaços múltiplos
        parts = line.split('\t')
        cleaned_parts = [' '.join(part.split()) for part in parts]
        cleaned_lines.append('\t'.join(cleaned_parts))
    text = '\n'.join(cleaned_lines)
    
    return text.strip()


def sanitize_html(html: str, allowed_tags: Optional[list] = None) -> str:
    """
    Sanitiza HTML removendo tags e atributos perigosos.
    Usa bleach para prevenir XSS.
    
    Args:
        html: HTML a ser sanitizado
        allowed_tags: Lista de tags permitidas (None = usar padrão seguro)
    
    Returns:
        HTML sanitizado
    """
    if not html:
        return ""
    
    if allowed_tags is None:
        # Tags seguras permitidas por padrão
        allowed_tags = ALLOWED_TAGS - {'script', 'iframe', 'object', 'embed', 'form'}
    
    # Atributos permitidos
    allowed_attrs = {
        '*': ['class', 'id'],
        'a': ['href', 'title'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'p': [],
        'br': [],
        'strong': [],
        'em': [],
        'u': [],
        'ul': [],
        'ol': [],
        'li': [],
    }
    
    # Sanitizar CSS inline (se disponível)
    css_sanitizer = None
    if CSS_SANITIZER_AVAILABLE:
        css_sanitizer = CSSSanitizer(allowed_css_properties=['color', 'background-color', 'font-size'])
    
    try:
        clean_kwargs = {
            "tags": allowed_tags,
            "attributes": allowed_attrs,
            "strip": True
        }
        if css_sanitizer:
            clean_kwargs["css_sanitizer"] = css_sanitizer
        
        cleaned = clean(html, **clean_kwargs)
        return cleaned
    except Exception as e:
        logger.error(f"Erro ao sanitizar HTML: {e}")
        # Em caso de erro, retornar texto sem HTML
        return sanitize_input(html)


def validate_payload_size(payload: Dict[str, Any], max_size_kb: int = MAX_PAYLOAD_SIZE_KB) -> bool:
    """
    Valida tamanho do payload.
    
    Args:
        payload: Payload a ser validado
        max_size_kb: Tamanho máximo em KB
    
    Returns:
        True se payload está dentro do limite, False caso contrário
    """
    try:
        import json
        payload_str = json.dumps(payload)
        size_bytes = len(payload_str.encode('utf-8'))
        max_size_bytes = max_size_kb * 1024
        
        if size_bytes > max_size_bytes:
            logger.warning(f"Payload muito grande: {size_bytes} bytes (máximo: {max_size_bytes} bytes)")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Erro ao validar tamanho do payload: {e}")
        return False


def validate_email(email: str) -> bool:
    """
    Valida formato de email.
    
    Args:
        email: Email a ser validado
    
    Returns:
        True se email é válido, False caso contrário
    """
    if not email or len(email) > MAX_EMAIL_LENGTH:
        return False
    
    # Regex básico para validação de email
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_url(url: str) -> bool:
    """
    Valida formato de URL.
    
    Args:
        url: URL a ser validada
    
    Returns:
        True se URL é válida, False caso contrário
    """
    if not url or len(url) > MAX_URL_LENGTH:
        return False
    
    # Regex básico para validação de URL
    pattern = r'^https?://[^\s/$.?#].[^\s]*$'
    return bool(re.match(pattern, url))


def sanitize_sql_input(text: str) -> str:
    """
    Sanitiza entrada para prevenir SQL injection.
    Remove caracteres perigosos para SQL.
    
    NOTA: Esta função é uma camada adicional de segurança.
    O uso de ORM (SQLAlchemy) já previne SQL injection,
    mas esta função adiciona proteção extra.
    
    Args:
        text: Texto a ser sanitizado
    
    Returns:
        Texto sanitizado
    """
    if not isinstance(text, str):
        text = str(text)
    
    # Remover caracteres perigosos para SQL
    dangerous_chars = ["'", '"', ';', '--', '/*', '*/', 'xp_', 'sp_']
    for char in dangerous_chars:
        text = text.replace(char, '')
    
    # Remover palavras SQL perigosas (case-insensitive)
    dangerous_words = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'EXEC', 'EXECUTE', 'INSERT', 'UPDATE']
    words = text.split()
    filtered_words = [w for w in words if w.upper() not in dangerous_words]
    text = ' '.join(filtered_words)
    
    return text


def validate_text_field(text: str, field_name: str = "campo", max_length: int = MAX_TEXT_FIELD_LENGTH) -> tuple[bool, Optional[str]]:
    """
    Valida campo de texto.
    
    Args:
        text: Texto a ser validado
        field_name: Nome do campo (para mensagens de erro)
        max_length: Tamanho máximo permitido
    
    Returns:
        Tupla (is_valid, error_message)
    """
    if not isinstance(text, str):
        return False, f"{field_name} deve ser uma string"
    
    if len(text) > max_length:
        return False, f"{field_name} excede o tamanho máximo de {max_length} caracteres"
    
    if not text.strip():
        return False, f"{field_name} não pode estar vazio"
    
    return True, None


def sanitize_dict(data: Dict[str, Any], sanitize_html_fields: Optional[list] = None) -> Dict[str, Any]:
    """
    Sanitiza dicionário recursivamente.
    
    Args:
        data: Dicionário a ser sanitizado
        sanitize_html_fields: Lista de campos que devem ser sanitizados como HTML
    
    Returns:
        Dicionário sanitizado
    """
    if sanitize_html_fields is None:
        sanitize_html_fields = []
    
    sanitized = {}
    
    for key, value in data.items():
        if isinstance(value, str):
            if key in sanitize_html_fields:
                sanitized[key] = sanitize_html(value)
            else:
                sanitized[key] = sanitize_input(value)
        elif isinstance(value, dict):
            sanitized[key] = sanitize_dict(value, sanitize_html_fields)
        elif isinstance(value, list):
            sanitized[key] = [
                sanitize_dict(item, sanitize_html_fields) if isinstance(item, dict)
                else sanitize_input(item) if isinstance(item, str)
                else item
                for item in value
            ]
        else:
            sanitized[key] = value
    
    return sanitized
