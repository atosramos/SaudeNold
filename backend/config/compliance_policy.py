"""
Compliance Policy - LGPD/HIPAA/ISO 27001

Define políticas de conformidade regulatória.
"""

from typing import Dict, Any

# Retenção de dados
AUDIT_LOG_RETENTION_YEARS = 7  # Requisitos legais de saúde
DATA_EXPORT_EXPIRATION_DAYS = 7  # Links de download expiram em 7 dias

# LGPD - Direitos do Titular
LGPD_RIGHTS = {
    "access": "Direito de acesso aos dados",
    "portability": "Direito à portabilidade dos dados",
    "deletion": "Direito ao esquecimento (exclusão)",
    "rectification": "Direito à retificação de dados incorretos",
    "opposition": "Direito de oposição ao tratamento",
    "consent_withdrawal": "Direito de revogar consentimento"
}

# HIPAA - Requisitos (quando aplicável)
HIPAA_REQUIREMENTS = {
    "audit_logs": True,
    "access_controls": True,
    "encryption": True,
    "data_minimization": True,
    "retention_policy": True
}

# ISO 27001 - Checklist de implementação
ISO_27001_CHECKLIST = {
    "security_policy": {
        "status": "pending",
        "description": "Política de segurança da informação documentada"
    },
    "access_control": {
        "status": "completed",
        "description": "Controle de acesso baseado em roles (RBAC)"
    },
    "cryptography": {
        "status": "completed",
        "description": "Criptografia de dados sensíveis (zero-knowledge)"
    },
    "audit_logging": {
        "status": "in_progress",
        "description": "Logs de auditoria completos e imutáveis"
    },
    "incident_management": {
        "status": "pending",
        "description": "Processo de gestão de incidentes de segurança"
    },
    "business_continuity": {
        "status": "pending",
        "description": "Plano de continuidade de negócios"
    },
    "compliance": {
        "status": "in_progress",
        "description": "Conformidade com LGPD e HIPAA"
    }
}

# Política de Privacidade (texto base)
PRIVACY_POLICY = """
POLÍTICA DE PRIVACIDADE - SaudeNold

1. COLETA DE DADOS
Coletamos apenas dados necessários para o funcionamento do aplicativo:
- Dados de cadastro (email, senha)
- Dados de saúde (medicamentos, exames, consultas)
- Dados de dispositivo (para segurança)

2. USO DOS DADOS
- Gerenciamento de saúde pessoal e familiar
- Melhoria do serviço
- Conformidade legal

3. COMPARTILHAMENTO
- Dados não são compartilhados com terceiros sem consentimento
- Compartilhamento apenas dentro do grupo familiar autorizado

4. SEGURANÇA
- Criptografia de dados sensíveis
- Logs de auditoria
- Controle de acesso baseado em roles

5. SEUS DIREITOS (LGPD)
- Acesso aos seus dados
- Portabilidade dos dados
- Exclusão de dados
- Retificação de dados incorretos

6. RETENÇÃO
- Logs de auditoria: 7 anos (requisitos legais)
- Dados pessoais: enquanto conta ativa ou conforme solicitação de exclusão

7. CONTATO
Para exercer seus direitos, entre em contato através do aplicativo.
"""

# Termo de Consentimento
CONSENT_TERM = """
TERMO DE CONSENTIMENTO - SaudeNold

Ao usar este aplicativo, você concorda com:

1. COLETA E PROCESSAMENTO
Consento com a coleta e processamento dos meus dados de saúde para:
- Gerenciamento de saúde pessoal
- Compartilhamento com membros autorizados da família
- Melhoria do serviço

2. DADOS SENSÍVEIS
Estou ciente de que dados de saúde são sensíveis e serão:
- Criptografados
- Armazenados de forma segura
- Acessíveis apenas por pessoas autorizadas

3. DIREITOS
Estou ciente dos meus direitos sob a LGPD:
- Posso solicitar acesso aos meus dados
- Posso solicitar exclusão dos meus dados
- Posso revogar este consentimento a qualquer momento

4. COMPARTILHAMENTO
Consento com o compartilhamento dos meus dados com:
- Membros da minha família autorizados
- Cuidadores designados

Consentimento dado em: {consent_date}
"""


def get_privacy_policy() -> str:
    """Retorna política de privacidade."""
    return PRIVACY_POLICY


def get_consent_term(consent_date: str = None) -> str:
    """Retorna termo de consentimento."""
    if not consent_date:
        from datetime import datetime, timezone
        consent_date = datetime.now(timezone.utc).isoformat()
    return CONSENT_TERM.format(consent_date=consent_date)


def get_iso_27001_status() -> Dict[str, Any]:
    """Retorna status do checklist ISO 27001."""
    total = len(ISO_27001_CHECKLIST)
    completed = sum(1 for item in ISO_27001_CHECKLIST.values() if item["status"] == "completed")
    in_progress = sum(1 for item in ISO_27001_CHECKLIST.values() if item["status"] == "in_progress")
    pending = sum(1 for item in ISO_27001_CHECKLIST.values() if item["status"] == "pending")
    
    return {
        "total": total,
        "completed": completed,
        "in_progress": in_progress,
        "pending": pending,
        "completion_percentage": (completed / total * 100) if total > 0 else 0,
        "checklist": ISO_27001_CHECKLIST
    }
