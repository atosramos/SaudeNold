"""
Servico de Alertas - Sistema de notificacoes para eventos criticos
"""
import logging
import os
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum

# Configurar logger de alertas
alert_logger = logging.getLogger("alerts")
alert_logger.setLevel(logging.WARNING)

# Handler para arquivo de alertas
if not os.path.exists("logs"):
    os.makedirs("logs")

alert_file_handler = logging.FileHandler("logs/alerts.log")
alert_file_handler.setLevel(logging.WARNING)
alert_formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
alert_file_handler.setFormatter(alert_formatter)
alert_logger.addHandler(alert_file_handler)


class AlertType(Enum):
    """Tipos de alertas"""
    CRITICAL_ERROR = "critical_error"
    FRAUD_ATTEMPT = "fraud_attempt"
    PAYMENT_FAILURE = "payment_failure"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    LICENSE_EXPIRING = "license_expiring"
    SYSTEM_ERROR = "system_error"


class AlertService:
    """Servico para enviar alertas"""
    
    def __init__(self):
        self.webhook_url = os.getenv("ALERT_WEBHOOK_URL")
        self.email_enabled = os.getenv("ALERT_EMAIL_ENABLED", "false").lower() == "true"
        self.email_to = os.getenv("ALERT_EMAIL_TO", "")
        self.sentry_enabled = os.getenv("SENTRY_ENABLED", "false").lower() == "true"
    
    def send_alert(
        self,
        alert_type: AlertType,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        severity: str = "warning"
    ):
        """
        Envia um alerta
        
        Args:
            alert_type: Tipo do alerta
            message: Mensagem do alerta
            details: Detalhes adicionais (opcional)
            severity: Severidade (warning, error, critical)
        """
        alert_data = {
            "type": alert_type.value,
            "message": message,
            "severity": severity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": details or {}
        }
        
        # Log do alerta
        log_message = f"[{alert_type.value}] {message}"
        if details:
            log_message += f" | Details: {details}"
        
        if severity == "critical":
            alert_logger.critical(log_message)
        elif severity == "error":
            alert_logger.error(log_message)
        else:
            alert_logger.warning(log_message)
        
        # Enviar via webhook (se configurado)
        if self.webhook_url:
            self._send_webhook_alert(alert_data)
        
        # Enviar via email (se configurado)
        if self.email_enabled and self.email_to:
            self._send_email_alert(alert_data)
        
        # Enviar para Sentry (se configurado)
        if self.sentry_enabled:
            self._send_sentry_alert(alert_data)
    
    def _send_webhook_alert(self, alert_data: Dict[str, Any]):
        """Envia alerta via webhook"""
        try:
            import requests
            response = requests.post(
                self.webhook_url,
                json=alert_data,
                timeout=5
            )
            if response.status_code != 200:
                alert_logger.error(f"Falha ao enviar webhook: {response.status_code}")
        except Exception as e:
            alert_logger.error(f"Erro ao enviar webhook: {str(e)}")
    
    def _send_email_alert(self, alert_data: Dict[str, Any]):
        """Envia alerta via email (placeholder - implementar com SMTP)"""
        # TODO: Implementar envio de email via SMTP
        alert_logger.info(f"Email alert (not implemented): {alert_data['message']}")
    
    def _send_sentry_alert(self, alert_data: Dict[str, Any]):
        """Envia alerta para Sentry"""
        try:
            import sentry_sdk
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("alert_type", alert_data["type"])
                scope.set_level(alert_data["severity"])
                scope.set_context("alert_details", alert_data["details"])
                sentry_sdk.capture_message(
                    alert_data["message"],
                    level=alert_data["severity"]
                )
        except ImportError:
            alert_logger.warning("Sentry SDK nao instalado")
        except Exception as e:
            alert_logger.error(f"Erro ao enviar para Sentry: {str(e)}")
    
    # Metodos de conveniencia para tipos especificos de alertas
    
    def alert_critical_error(self, message: str, error: Optional[Exception] = None):
        """Alerta para erros criticos"""
        details = {}
        if error:
            details["error_type"] = type(error).__name__
            details["error_message"] = str(error)
        self.send_alert(
            AlertType.CRITICAL_ERROR,
            message,
            details,
            severity="critical"
        )
    
    def alert_fraud_attempt(self, message: str, ip_address: str, details: Optional[Dict] = None):
        """Alerta para tentativas de fraude"""
        alert_details = {"ip_address": ip_address}
        if details:
            alert_details.update(details)
        self.send_alert(
            AlertType.FRAUD_ATTEMPT,
            message,
            alert_details,
            severity="error"
        )
    
    def alert_payment_failure(self, purchase_id: str, reason: str):
        """Alerta para falhas de pagamento"""
        self.send_alert(
            AlertType.PAYMENT_FAILURE,
            f"Falha no pagamento: {purchase_id}",
            {"purchase_id": purchase_id, "reason": reason},
            severity="error"
        )
    
    def alert_suspicious_activity(self, message: str, ip_address: str, count: int):
        """Alerta para atividade suspeita"""
        self.send_alert(
            AlertType.SUSPICIOUS_ACTIVITY,
            message,
            {"ip_address": ip_address, "attempt_count": count},
            severity="warning"
        )
    
    def alert_rate_limit_exceeded(self, ip_address: str, endpoint: str):
        """Alerta para rate limit excedido"""
        self.send_alert(
            AlertType.RATE_LIMIT_EXCEEDED,
            f"Rate limit excedido: {endpoint}",
            {"ip_address": ip_address, "endpoint": endpoint},
            severity="warning"
        )


# Instancia global do servico de alertas
alert_service = AlertService()
