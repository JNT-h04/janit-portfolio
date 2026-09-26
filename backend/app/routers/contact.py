"""The contact form: validate, drop bots, and deliver the message by email."""

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.contact import send
from app.core.ratelimit import RateLimit

router = APIRouter(prefix="/contact", tags=["contact"])

EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# A handful an hour is plenty for a person and useless to a spammer. Named so
# the tests can reset it between cases.
contact_limit = RateLimit(limit=5, window=3600)


class Message(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(max_length=200)
    message: str = Field(min_length=10, max_length=5000)
    company: str = Field(default="", max_length=80)  # set by a tailored link (?for=)
    # A field hidden from people. Bots fill in every input; a person never sees it.
    website: str = ""


class Status(BaseModel):
    ready: bool


class Sent(BaseModel):
    sent: bool


@router.get("/status", response_model=Status)
def status() -> Status:
    return Status(ready=send.ready())


@router.post("", response_model=Sent, dependencies=[Depends(contact_limit)])
async def submit(msg: Message) -> Sent:
    if msg.website:
        # Pretend it worked, so the bot learns nothing.
        return Sent(sent=True)
    if not EMAIL.match(msg.email.strip()):
        raise HTTPException(422, "that reply address doesn't look like an email")
    if not send.ready():
        raise HTTPException(503, "mail sending isn't set up on this server")
    try:
        await send.send(msg.name.strip(), msg.email.strip(), msg.message.strip(), msg.company.strip())
    except send.SendError as exc:
        raise HTTPException(502, str(exc)) from exc
    return Sent(sent=True)
