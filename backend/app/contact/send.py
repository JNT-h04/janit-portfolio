"""Deliver a contact-form message to Janit's inbox through Resend's HTTP API."""

import httpx

from app.core.config import settings

RESEND_URL = "https://api.resend.com/emails"


class SendError(RuntimeError):
    """Resend refused or could not be reached. The page falls back to mailto."""


def ready() -> bool:
    return bool(settings.resend_api_key)


async def send(name: str, email: str, message: str, company: str = "") -> str:
    """Send the message and return Resend's id for it. Reply-To is the visitor,
    so answering is one click."""
    subject = f"Portfolio enquiry from {name}" + (f" ({company})" if company else "")
    body = f"{message}\n\n---\n{name}\n{email}"
    if company:
        body += f"\nsent from the link tailored for: {company}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                RESEND_URL,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={
                    "from": settings.contact_from,
                    "to": [settings.contact_to],
                    "reply_to": email,
                    "subject": subject,
                    "text": body,
                },
            )
    except httpx.HTTPError as exc:
        raise SendError(f"mail service unreachable ({exc.__class__.__name__})") from exc
    if res.status_code >= 300:
        raise SendError(f"mail service refused the message ({res.status_code})")
    return str(res.json().get("id", ""))
