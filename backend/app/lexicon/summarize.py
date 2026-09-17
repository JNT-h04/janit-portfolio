"""Ask Gemini to summarise one chapter, streaming the answer as it's written."""

from collections.abc import AsyncIterator

from google import genai

from app.core.config import settings

MAX_CHARS = 60_000  # ~15k tokens: plenty for a chapter, and keeps each call fast and cheap

PROMPT = """You are summarising one chapter of the book "{book}".
Chapter: "{chapter}"

Write in this exact markdown layout and nothing else:

## Summary
One or two short paragraphs covering what happens or what is argued.

## Key insights
- 3 to 5 bullet points, each one sentence.

## Flashcards
Q: a question testing an important idea
A: its short answer
(write exactly 5 Q/A pairs, each Q and A on its own line)

Chapter text{note}:
\"\"\"
{text}
\"\"\"
"""

_client: genai.Client | None = None


def ready() -> bool:
    return bool(settings.gemini_api_key)


def _get_client() -> genai.Client:
    # Created on first use, then reused. Opening a new client per request is wasteful.
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def summarize(book: str, chapter: str, text: str) -> AsyncIterator[str]:
    note = " (truncated to fit)" if len(text) > MAX_CHARS else ""
    prompt = PROMPT.format(book=book, chapter=chapter, note=note, text=text[:MAX_CHARS])
    stream = await _get_client().aio.models.generate_content_stream(model=settings.gemini_model, contents=prompt)
    async for chunk in stream:
        if chunk.text:
            yield chunk.text
