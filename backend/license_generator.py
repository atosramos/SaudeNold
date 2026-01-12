"""
Gerador de Chaves de Licença PRO - Backend Python
Gera chaves seguras usando HMAC-SHA256
"""

import hashlib
import hmac
import secrets
import time
from datetime import datetime, timedelta
from typing import Optional, Dict

LICENSE_TYPES = {
    '1_month': '1M',
    '6_months': '6M',
    '1_year': '1Y',
}

LICENSE_DURATIONS = {
    '1_month': timedelta(days=30),
    '6_months': timedelta(days=180),
    '1_year': timedelta(days=365),
}


def generate_license_key(
    license_type: str,
    user_id: Optional[str] = None,
    secret_key: Optional[str] = None
) -> str:
    """
    Gera uma chave de licença segura
    
    Args:
        license_type: Tipo de licença ('1_month', '6_months', '1_year')
        user_id: ID do usuário (opcional)
        secret_key: Chave secreta do servidor
    
    Returns:
        Chave de licença no formato: PRO + 42 caracteres (total: 45)
    """
    import os
    
    # Obter chave secreta
    if not secret_key:
        secret_key = os.getenv('LICENSE_SECRET_KEY')
        if not secret_key:
            raise ValueError("LICENSE_SECRET_KEY não configurada")
    
    # Mapear tipo para código
    type_code = LICENSE_TYPES.get(license_type, '1M')
    
    # Gerar timestamp e dados únicos
    timestamp = int(time.time() * 1000)  # Milissegundos
    timestamp_short = str(timestamp)[-8:]  # Últimos 8 dígitos
    
    # Gerar dados aleatórios (16 caracteres hex)
    random_data = secrets.token_hex(8).upper()
    
    # Hash do user_id (4 caracteres)
    if user_id:
        user_hash = hashlib.sha256(user_id.encode()).hexdigest()[:4].upper()
    else:
        user_hash = '0000'
    
    # Criar payload para assinatura
    payload = f"{type_code}{timestamp_short}{random_data}{user_hash}"
    
    # Gerar HMAC-SHA256 para assinatura digital
    signature = hmac.new(
        secret_key.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest().upper()[:12]  # 12 caracteres hex
    
    # Montar chave: PRO + tipo + timestamp + random + user + signature
    # Total: 3 + 2 + 8 + 16 + 4 + 12 = 45 caracteres
    license_key = f"PRO{type_code}{timestamp_short}{random_data}{user_hash}{signature}"
    
    return license_key


def validate_license_key(
    key: str,
    secret_key: Optional[str] = None
) -> Dict:
    """
    Valida uma chave de licença gerada por este sistema
    
    Args:
        key: Chave de licença a validar
        secret_key: Chave secreta do servidor
    
    Returns:
        Dict com informações de validação
    """
    import os
    
    # Obter chave secreta
    if not secret_key:
        secret_key = os.getenv('LICENSE_SECRET_KEY')
        if not secret_key:
            return {
                'valid': False,
                'error': 'LICENSE_SECRET_KEY não configurada'
            }
    
    # Normalizar chave (remover espaços e hífens)
    key = key.replace(' ', '').replace('-', '').upper()
    
    # Verificar formato básico
    if not key.startswith('PRO') or len(key) != 45:
        return {
            'valid': False,
            'error': 'Formato de chave inválido'
        }
    
    # Extrair componentes
    type_code = key[3:5]  # PRO[XX]...
    timestamp_short = key[5:13]
    random_data = key[13:29]
    user_hash = key[29:33]
    signature = key[33:45]
    
    # Verificar tipo
    type_map = {
        '1M': '1_month',
        '6M': '6_months',
        '1Y': '1_year',
    }
    
    license_type = type_map.get(type_code)
    if not license_type:
        return {
            'valid': False,
            'error': 'Tipo de licença inválido'
        }
    
    # Reconstruir payload e verificar assinatura
    payload = f"{type_code}{timestamp_short}{random_data}{user_hash}"
    expected_signature = hmac.new(
        secret_key.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest().upper()[:12]
    
    # Comparação segura (timing-safe)
    if not hmac.compare_digest(signature, expected_signature):
        return {
            'valid': False,
            'error': 'Chave de licença inválida ou corrompida'
        }
    
    # Calcular data de expiração
    try:
        # Tentar reconstruir timestamp completo
        now = datetime.now()
        year = now.year
        timestamp_full = int(f"{year}{timestamp_short}")
        
        # Se o timestamp parece ser do futuro ou muito antigo, usar data atual
        max_age = timedelta(days=3650)  # 10 anos
        activation_date = datetime.fromtimestamp(timestamp_full / 1000) if timestamp_full > 0 else now
        
        if activation_date > now or (now - activation_date) > max_age:
            activation_date = now
        
        duration = LICENSE_DURATIONS[license_type]
        expiration_date = activation_date + duration
        
    except (ValueError, OverflowError):
        # Fallback: usar data atual
        activation_date = datetime.now()
        duration = LICENSE_DURATIONS[license_type]
        expiration_date = activation_date + duration
    
    return {
        'valid': True,
        'license_type': license_type,
        'expiration_date': expiration_date.isoformat(),
        'activated_at': activation_date.isoformat(),
    }
