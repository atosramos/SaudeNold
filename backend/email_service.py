import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger("email")


def _get_smtp_config():
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM_EMAIL", user)
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    return host, port, user, password, from_email, use_tls


def smtp_configured() -> bool:
    host, port, user, password, from_email, _ = _get_smtp_config()
    return bool(host and port and user and password and from_email)


def _missing_smtp_fields() -> list[str]:
    host, port, user, password, from_email, _ = _get_smtp_config()
    missing = []
    if not host:
        missing.append("SMTP_HOST")
    if not port:
        missing.append("SMTP_PORT")
    if not user:
        missing.append("SMTP_USER")
    if not password:
        missing.append("SMTP_PASSWORD")
    if not from_email:
        missing.append("SMTP_FROM_EMAIL")
    return missing


def send_email(to_email: str, subject: str, body: str) -> bool:
    host, port, user, password, from_email, use_tls = _get_smtp_config()
    if not smtp_configured():
        missing = _missing_smtp_fields()
        logger.warning("SMTP nao configurado. Campos ausentes: %s", ", ".join(missing))
        return False

    message = EmailMessage()
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)
    html_body = body.replace("\n", "<br/>")
    message.add_alternative(
        f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #4ECDC4;">{subject}</h2>
            <p>{html_body}</p>
          </body>
        </html>
        """,
        subtype="html",
    )

    try:
        with smtplib.SMTP(host, port) as smtp:
            if use_tls:
                smtp.starttls()
            smtp.login(user, password)
            smtp.send_message(message)
        return True
    except Exception as exc:
        logger.error("Falha ao enviar email via SMTP: %s", exc)
        return False
