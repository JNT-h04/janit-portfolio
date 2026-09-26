"""Deliver a contact-form message to Janit's inbox through Resend's HTTP API."""

import logging

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


class SendError(RuntimeError):
    """Resend refused or could not be reached. The page falls back to mailto."""


def _key() -> str:
    # A key pasted into a dashboard often brings a stray space or quotes with it,
    # and Resend answers that with a bare 401.
    return settings.resend_api_key.strip().strip("\"'").strip()


def ready() -> bool:
    return bool(_key())


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
                headers={"Authorization": f"Bearer {_key()}"},
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
        # Resend names the problem (invalid_api_key, validation_error, ...). The
        # name says nothing secret and turns "it failed" into something fixable.
        try:
            reason = str(res.json().get("name", ""))[:60]
        except ValueError:
            reason = ""
        suffix = f", {reason}" if reason else ""
        log.warning("resend refused a message: %s %s", res.status_code, res.text[:300])
        raise SendError(f"mail service refused the message ({res.status_code}{suffix})")
    return str(res.json().get("id", ""))
