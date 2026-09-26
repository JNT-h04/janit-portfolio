"""Ask Gemini to summarise one chapter, streaming the answer as it's written."""

import asyncio
import logging
from collections.abc import AsyncIterator, Callable

from google import genai
from google.genai import errors, types

from app.core.config import settings

log = logging.getLogger(__name__)

MAX_CHARS = 60_000  # ~15k tokens: plenty for a chapter, and keeps each call fast and cheap

# Summaries don't need deep reasoning; low thinking answers several times faster.
CONFIG = types.GenerateContentConfig(thinking_config=types.ThinkingConfig(thinking_level="low"))

# Worth trying the next model for these: retired/unknown model, quota hit, overloaded.
FALLBACK_CODES = {404, 429, 500, 503}

# Sent when a model dies halfway through an answer and the next one starts over:
# the page throws away everything before the last marker. Without it a busy
# spell (Gemini 503s mid-stream) left visitors with half a summary and an error.
RESTART_MARK = "[[restart]]"

# A model that goes quiet this long is treated like a busy one: move on to the
# next. Without it a stalled stream kept the visitor waiting forever, because
# nothing in the client times out on its own.
STALL_SECONDS = 30.0

PROMPT = """You are summarising one chapter of the book "{book}".
Chapter: "{chapter}"

Write in this exact markdown layout and nothing else:

## Summary
Two short paragraphs in simple words, as if explaining to a first-year college student.

## Key insights
- 3 to 5 bullet points, each one sentence.

## Flashcards
Q: a question testing an important idea
A: its short answer
(write exactly 8 Q/A pairs, like likely exam questions, each Q and A on its own line)

Chapter text{note}:
\"\"\"
{text}
\"\"\"
"""


class SummaryError(RuntimeError):
    """Every model failed. The message is shown to the visitor."""


_client: genai.Client | None = None


def ready() -> bool:
    return bool(settings.gemini_api_key)


def _get_client() -> genai.Client:
    # Created on first use, then reused. Opening a new client per request is wasteful.
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def summarize(
    book: str, chapter: str, text: str, on_model: Callable[[str], None] | None = None
) -> AsyncIterator[str]:
    note = " (truncated to fit)" if len(text) > MAX_CHARS else ""
    prompt = PROMPT.format(book=book, chapter=chapter, note=note, text=text[:MAX_CHARS])

    last_error = ""
    # Google retires model names and some are overloaded at busy times, so try
    # each configured model in turn until one answers all the way through.
    for model in settings.gemini_models:
        started = False
        try:
            stream = await asyncio.wait_for(
                _get_client().aio.models.generate_content_stream(model=model, contents=prompt, config=CONFIG),
                STALL_SECONDS,
            )
            chunks = aiter(stream)
            while True:
                try:
                    chunk = await asyncio.wait_for(anext(chunks), STALL_SECONDS)
                except StopAsyncIteration:
                    break
                if chunk.text:
                    started = True
                    yield chunk.text
            if on_model:
                on_model(model)
            return
        except TimeoutError:
            log.warning("model %s went quiet for %ss (started=%s), trying the next one", model, STALL_SECONDS, started)
            last_error = "timed out"
            if started:
                yield RESTART_MARK
        except errors.APIError as exc:
            if exc.code not in FALLBACK_CODES:
                raise SummaryError(f"{exc.code} {exc.status}") from exc
            log.warning("model %s failed with %s (started=%s), trying the next one", model, exc.code, started)
            last_error = f"{exc.code} {exc.status}"
            if started:
                yield RESTART_MARK
    raise SummaryError(f"all models are busy right now ({last_error}). try again in a minute")
