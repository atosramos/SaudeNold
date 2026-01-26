import os
import hmac
import json
import base64
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status


def _now():
    return datetime.now(timezone.utc)


def _get_secret() -> str:
    secret = os.getenv("SESSION_ACTION_SECRET") or os.getenv("JWT_SECRET_KEY") or os.getenv("API_KEY")
    if not secret:
        secret = secrets.token_urlsafe(32)
    return secret


def create_session_action_token(
    user_id: int,
    device_id: str,
    action: str,
    expires_minutes: int = 30
) -> str:
    payload = {
        "sub": str(user_id),
        "device_id": device_id,
        "action": action,
        "exp": int((_now() + timedelta(minutes=expires_minutes)).timestamp()),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")
    secret = _get_secret().encode("utf-8")
    signature = hmac.new(secret, payload_b64.encode("utf-8"), digestmod="sha256").digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")
    return f"{payload_b64}.{signature_b64}"


def verify_session_action_token(token: str) -> dict:
    try:
        payload_b64, signature_b64 = token.split(".", 1)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalido")

    secret = _get_secret().encode("utf-8")
    expected_sig = hmac.new(secret, payload_b64.encode("utf-8"), digestmod="sha256").digest()
    expected_b64 = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")
    if not hmac.compare_digest(expected_b64, signature_b64):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalido")

    padded = payload_b64 + "=" * (-len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded.encode("utf-8")))
    exp = int(payload.get("exp", 0))
    if exp and _now().timestamp() > exp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token expirado")
    return payload


def create_biometric_challenge_token(device_id: str, expires_minutes: int = 5) -> str:
    payload = {
        "device_id": device_id,
        "action": "biometric_challenge",
        "exp": int((_now() + timedelta(minutes=expires_minutes)).timestamp()),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")
    secret = _get_secret().encode("utf-8")
    signature = hmac.new(secret, payload_b64.encode("utf-8"), digestmod="sha256").digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")
    return f"{payload_b64}.{signature_b64}"


def verify_biometric_challenge_token(token: str) -> dict:
    payload = verify_session_action_token(token)
    if payload.get("action") != "biometric_challenge":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalido")
    return payload
