from typing import Optional

import requests

from email_service import send_email, smtp_configured


def send_login_notification(
    to_email: str,
    device_name: Optional[str],
    os_name: Optional[str],
    os_version: Optional[str],
    ip_address: Optional[str],
    user_agent: Optional[str],
    block_link: Optional[str] = None,
    push_token: Optional[str] = None,
    location_lat: Optional[float] = None,
    location_lon: Optional[float] = None,
    location_accuracy_km: Optional[float] = None
) -> None:
    details = []
    if device_name:
        details.append(f"Dispositivo: {device_name}")
    if os_name or os_version:
        details.append(f"SO: {os_name or ''} {os_version or ''}".strip())
    if location_lat is not None and location_lon is not None:
        accuracy_text = f" (~{location_accuracy_km} km)" if location_accuracy_km is not None else ""
        details.append(f"Localizacao aprox.: {location_lat}, {location_lon}{accuracy_text}")
    if ip_address:
        details.append(f"IP: {ip_address}")
    if user_agent:
        details.append(f"User-Agent: {user_agent}")

    body = "Novo acesso detectado na sua conta.\n"
    if details:
        body += "\n" + "\n".join(details)
    if block_link:
        body += f"\n\nSe nao reconhece este acesso, bloqueie o dispositivo: {block_link}"
    body += "\n\nSe nao foi voce, altere sua senha e revogue dispositivos ativos."

    if smtp_configured():
        send_email(to_email, "Novo login detectado - SaudeNold", body)
    if push_token:
        push_body = "Novo acesso detectado. Revise os detalhes no app."
        send_push_notification(push_token, "Novo login detectado", push_body)


def send_push_notification(push_token: str, title: str, body: str) -> None:
    if not push_token or not push_token.startswith("ExponentPushToken"):
        return
    try:
        requests.post(
            "https://exp.host/--/api/v2/push/send",
            json={
                "to": push_token,
                "title": title,
                "body": body,
                "sound": "default",
            },
            timeout=5
        )
    except Exception:
        return


def send_login_blocked_alert(
    to_email: str,
    ip_address: Optional[str],
    user_agent: Optional[str]
) -> None:
    if not smtp_configured():
        return

    details = []
    if ip_address:
        details.append(f"IP: {ip_address}")
    if user_agent:
        details.append(f"User-Agent: {user_agent}")

    body = "Detectamos muitas tentativas de login e bloqueamos temporariamente o acesso.\n"
    if details:
        body += "\n" + "\n".join(details)
    body += "\n\nSe nao foi voce, recomendamos alterar sua senha."

    send_email(to_email, "Bloqueio temporario de login - SaudeNold", body)


def send_failed_login_alert(
    to_email: str,
    attempts: int,
    window_minutes: int,
    ip_address: Optional[str],
    user_agent: Optional[str]
) -> None:
    if not smtp_configured():
        return

    details = [
        f"Tentativas: {attempts} em {window_minutes} minutos"
    ]
    if ip_address:
        details.append(f"IP: {ip_address}")
    if user_agent:
        details.append(f"User-Agent: {user_agent}")

    body = "Detectamos tentativas repetidas de login na sua conta.\n"
    body += "\n" + "\n".join(details)
    body += "\n\nSe nao foi voce, recomendamos alterar sua senha."

    send_email(to_email, "Tentativas de login detectadas - SaudeNold", body)


def send_suspicious_login_alert(
    to_email: str,
    ip_address: Optional[str],
    user_agent: Optional[str]
) -> None:
    if not smtp_configured():
        return

    details = []
    if ip_address:
        details.append(f"IP: {ip_address}")
    if user_agent:
        details.append(f"User-Agent: {user_agent}")

    body = "Detectamos login suspeito (acessos de locais diferentes em curto intervalo).\n"
    if details:
        body += "\n" + "\n".join(details)
    body += "\n\nSe nao foi voce, recomendamos alterar sua senha e revogar dispositivos."

    send_email(to_email, "Login suspeito detectado - SaudeNold", body)


def send_mass_download_alert(
    to_email: str,
    download_count: int,
    window_minutes: int,
    ip_address: Optional[str],
    user_agent: Optional[str]
) -> None:
    if not smtp_configured():
        return

    details = [
        f"Downloads: {download_count} em {window_minutes} minutos"
    ]
    if ip_address:
        details.append(f"IP: {ip_address}")
    if user_agent:
        details.append(f"User-Agent: {user_agent}")

    body = "Detectamos um volume alto de downloads de documentos.\n"
    body += "\n" + "\n".join(details)
    body += "\n\nSe nao foi voce, recomendamos revogar dispositivos e alterar sua senha."

    send_email(to_email, "Download em massa detectado - SaudeNold", body)


def send_session_revoked_alert(
    to_email: str,
    device_id: Optional[str],
    ip_address: Optional[str]
) -> None:
    if not smtp_configured():
        return

    details = []
    if device_id:
        details.append(f"Dispositivo: {device_id}")
    if ip_address:
        details.append(f"IP: {ip_address}")

    body = "Um dispositivo foi desconectado da sua conta.\n"
    if details:
        body += "\n" + "\n".join(details)
    body += "\n\nSe nao foi voce, altere sua senha."

    send_email(to_email, "Dispositivo desconectado - SaudeNold", body)
