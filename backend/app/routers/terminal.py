"""Backend commands for the website's terminal.

The browser sends   POST /api/terminal   {"command": "uptime", "args": []}
and gets back       {"output": "..."}

To add a command: write a function that takes `args` and returns a string,
then add it to COMMANDS at the bottom with a one-line help text.
"""

import time
from collections.abc import Callable

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["terminal"])

STARTED_AT = time.time()


# What the browser sends. FastAPI checks the JSON matches this shape and
# replies 422 (unprocessable) by itself if it doesn't.
class RunRequest(BaseModel):
    command: str
    args: list[str] = []


class RunResponse(BaseModel):
    output: str


def uptime(args: list[str]) -> str:
    seconds = int(time.time() - STARTED_AT)
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"server up for {hours}h {minutes}m {seconds}s"


def ping(args: list[str]) -> str:
    return "pong: the backend heard you"

def greet(args:list[str])->str:
    if not args:
        return "usage: greet <your name>"
    name=" ".join(args)
    return f"Access granted, Hello {name}! Welcome to my system. You can explore my portfolio and learn more about me. Enjoy your visit!"



# name -> (function, help text)
COMMANDS: dict[str, tuple[Callable[[list[str]], str], str]] = {
    "uptime": (uptime, "how long the server has been running"),
    "ping": (ping, "check the backend is alive"),
    "greet": (greet, "say hello: greet <your name>"),
}


@router.get("/terminal")
def list_commands() -> list[dict[str, str]]:
    return [{"name": name, "help": help_text} for name, (_, help_text) in COMMANDS.items()]


@router.post("/terminal", response_model=RunResponse)
def run_command(req: RunRequest) -> RunResponse:
    if req.command not in COMMANDS:
        # 404 plus a message; the terminal prints `detail` in red.
        raise HTTPException(status_code=404, detail=f"{req.command}: command not found. type `help`")
    func, _ = COMMANDS[req.command]
    return RunResponse(output=func(req.args))
