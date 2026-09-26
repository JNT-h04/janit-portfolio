"""LEXICON: upload a book, list its chapters, stream a summary of one."""

import json
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.ratelimit import RateLimit
from app.lexicon import summarize
from app.lexicon.extract import Book, ExtractError, extract

# Ends a successful summary stream, followed by JSON measurements.
META_MARK = "[[meta]]"

router = APIRouter(prefix="/lexicon", tags=["lexicon"])

MAX_BYTES = 50 * 1024 * 1024
BOOK_TTL = 60 * 60  # uploaded books are forgotten after an hour
MAX_BOOKS = 50

# Books live in memory only. Nothing a visitor uploads is written to disk.
_books: dict[str, tuple[Book, float]] = {}


class ChapterOut(BaseModel):
    index: int
    title: str
    words: int
    preview: str


class BookOut(BaseModel):
    id: str
    title: str
    chapters: list[ChapterOut]


class Status(BaseModel):
    ready: bool


def _forget_old() -> None:
    now = time.time()
    for key in [k for k, (_, t) in _books.items() if now - t > BOOK_TTL]:
        del _books[key]
    while len(_books) >= MAX_BOOKS:  # dicts keep insertion order: drop the oldest
        del _books[next(iter(_books))]


@router.get("/status", response_model=Status)
def status() -> Status:
    return Status(ready=summarize.ready())


@router.post("/books", response_model=BookOut, dependencies=[Depends(RateLimit(limit=10, window=3600))])
async def upload(file: UploadFile) -> BookOut:
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "file too large (max 50 MB)")
    try:
        book = extract(file.filename or "book", data)
    except ExtractError as exc:
        raise HTTPException(422, str(exc)) from exc

    _forget_old()
    book_id = uuid.uuid4().hex
    _books[book_id] = (book, time.time())
    return BookOut(
        id=book_id,
        title=book.title,
        chapters=[
            ChapterOut(index=i, title=c.title[:120], words=c.words, preview=c.text[:220])
            for i, c in enumerate(book.chapters)
        ],
    )


@router.post("/books/{book_id}/chapters/{index}/summary", dependencies=[Depends(RateLimit(limit=30, window=3600))])
async def summary(book_id: str, index: int) -> StreamingResponse:
    if not summarize.ready():
        raise HTTPException(503, "summariser offline: GEMINI_API_KEY is not set on the server")
    entry = _books.get(book_id)
    if entry is None:
        raise HTTPException(404, "book not found or expired. upload it again")
    book = entry[0]
    if not 0 <= index < len(book.chapters):
        raise HTTPException(404, "no such chapter")
    chapter = book.chapters[index]

    async def stream():
        # Once streaming starts the 200 status is already sent, so a failure
        # halfway is reported inside the text with a marker the page looks for.
        started = time.perf_counter()
        answered: list[str] = []
        try:
            async for piece in summarize.summarize(
                book.title, chapter.title, chapter.text, on_model=answered.append
            ):
                yield piece
            # A trailer the page strips off and shows in its "measured" panel.
            meta = {
                "model": answered[-1] if answered else "",
                "server_ms": round((time.perf_counter() - started) * 1000),
                "input_chars": min(len(chapter.text), summarize.MAX_CHARS),
            }
            yield f"\n{META_MARK}{json.dumps(meta)}"
        except summarize.SummaryError as exc:
            yield f"\n\n[[error]] the AI model failed: {exc}"
        except Exception as exc:
            yield f"\n\n[[error]] the AI model failed ({exc.__class__.__name__})"

    return StreamingResponse(stream(), media_type="text/plain; charset=utf-8")
