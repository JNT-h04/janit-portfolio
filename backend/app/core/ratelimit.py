"""A tiny in-memory rate limiter: at most `limit` calls per `window` seconds per visitor.

Each LLM call costs money, so a public site needs this. It resets when the
server restarts, which is fine for one server; a bigger site would use Redis.
"""

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


class RateLimit:
    def __init__(self, limit: int, window: int) -> None:
        self.limit = limit
        self.window = window
        self.calls: dict[str, deque[float]] = defaultdict(deque)

    def __call__(self, request: Request) -> None:
        # Used as a FastAPI dependency: raising here rejects the request.
        key = request.client.host if request.client else "unknown"
        now = time.time()
        calls = self.calls[key]
        while calls and calls[0] < now - self.window:
            calls.popleft()
        if len(calls) >= self.limit:
            wait = int(calls[0] + self.window - now) + 1
            raise HTTPException(429, f"rate limit reached. try again in {wait}s")
        calls.append(now)
