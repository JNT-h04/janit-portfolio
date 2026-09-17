"""Turn an uploaded book file into a list of chapters.

Every format ends up as the same shape: a list of Chapter(title, text).
The rest of the app never needs to know whether the book was a PDF or an EPUB.

How chapters are found, best source first:
  1. the book's own table of contents (PDF outline, EPUB spine, DOCX headings)
  2. "Chapter 1" / "CHAPTER ONE" style headings in the text
  3. fixed-size chunks, when the book has no structure at all
"""

import io
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path

import pymupdf
from bs4 import BeautifulSoup
from docx import Document

SUPPORTED = {".pdf", ".docx", ".epub", ".txt", ".md", ".html", ".htm"}
MIN_CHAPTER_WORDS = 150  # anything shorter is a title page, a blank or a divider
CHUNK_WORDS = 3000


class ExtractError(ValueError):
    """The file can't be read as a book. The message is shown to the user."""


@dataclass
class Chapter:
    title: str
    text: str

    @property
    def words(self) -> int:
        return len(self.text.split())


@dataclass
class Book:
    title: str
    chapters: list[Chapter]


def extract(filename: str, data: bytes) -> Book:
    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED:
        raise ExtractError(f"unsupported format '{ext or filename}'. use one of: {', '.join(sorted(SUPPORTED))}")

    readers = {".pdf": _pdf, ".docx": _docx, ".epub": _epub}
    try:
        title, chapters = readers.get(ext, _plain)(data, ext)
    except ExtractError:
        raise
    except Exception as exc:  # corrupt or mislabelled files
        raise ExtractError(f"could not read this {ext} file ({exc.__class__.__name__})") from exc

    chapters = [Chapter(c.title.strip() or f"Section {i + 1}", _clean(c.text)) for i, c in enumerate(chapters)]
    chapters = [c for c in chapters if c.words >= MIN_CHAPTER_WORDS]
    if not chapters:
        raise ExtractError("no readable text found. scanned (image-only) books need OCR, which isn't supported yet")
    return Book(title=title or Path(filename).stem, chapters=chapters)


# ---------- per-format readers ----------


def _pdf(data: bytes, _ext: str) -> tuple[str, list[Chapter]]:
    doc = pymupdf.open(stream=data, filetype="pdf")
    if doc.needs_pass:
        raise ExtractError("this PDF is password-protected")
    pages = [page.get_text() for page in doc]
    title = (doc.metadata or {}).get("title", "")

    # Use top-level bookmarks as chapter boundaries when the PDF has them.
    toc = [(t, p) for level, t, p in doc.get_toc(simple=True) if level == 1 and p > 0]
    if len(toc) >= 2:
        chapters = []
        for i, (name, start) in enumerate(toc):
            end = toc[i + 1][1] - 1 if i + 1 < len(toc) else len(pages)
            chapters.append(Chapter(name, "\n".join(pages[start - 1 : end])))
        return title, chapters

    headed = _pdf_headings(doc)
    if len(headed) >= 3:
        chapters = []
        for i, (start, name) in enumerate(headed):
            end = headed[i + 1][0] if i + 1 < len(headed) else len(pages)
            chapters.append(Chapter(name, "\n".join(pages[start:end])))
        return title, chapters

    return title, _split_text("\n".join(pages))


def _pdf_headings(doc: pymupdf.Document) -> list[tuple[int, str]]:
    """Find chapter-opening pages by font size, for PDFs with no bookmarks.

    Chapter titles are set much larger than body text, and one size is reused
    for every chapter. So: find the body size, then among clearly bigger sizes
    pick the one that opens the most pages. Returns [(page_index, title)].
    """
    chars_by_size: dict[int, int] = {}
    lines: list[tuple[int, int, str]] = []  # (page, size, text)
    for page_no, page in enumerate(doc):
        for block in page.get_text("dict", flags=pymupdf.TEXTFLAGS_TEXT)["blocks"]:
            for line in block.get("lines", []):
                text = "".join(span["text"] for span in line["spans"]).strip()
                if not text:
                    continue
                size = round(max(span["size"] for span in line["spans"]))
                chars_by_size[size] = chars_by_size.get(size, 0) + len(text)
                lines.append((page_no, size, text))
    if not chars_by_size:
        return []
    body = max(chars_by_size, key=lambda k: chars_by_size[k])

    # Headline-like: much bigger than body and mostly letters (not OCR noise or figure labels).
    def wordy(t: str) -> bool:
        return len(t) >= 3 and sum(ch.isalpha() for ch in t) / len(t) > 0.7

    pages_by_size: dict[int, set[int]] = {}
    for page_no, size, text in lines:
        if size >= body * 1.8 and wordy(text):
            pages_by_size.setdefault(size, set()).add(page_no)
    if not pages_by_size:
        return []
    # 22pt and 23pt are usually one style rendered slightly differently, so a
    # size is scored together with the size just above it.
    scores = {size: len(pages | pages_by_size.get(size + 1, set())) for size, pages in pages_by_size.items()}
    tier = max(scores, key=lambda k: (scores[k], k))

    titles: dict[int, list[str]] = {}
    for page_no, size, text in lines:
        if size in (tier, tier + 1) and wordy(text):
            titles.setdefault(page_no, []).append(text)
    skip = {"contents", "table of contents", "index", "summary of contents"}

    def title_like(t: str) -> bool:
        # Real titles start with a capital or digit and are short. OCR'd body text
        # that got a wrong font size ("fully instantiated. Otherwise...") doesn't.
        return t.lower() not in skip and len(t) <= 90 and (t[0].isupper() or t[0].isdigit())

    return [
        (page_no, " ".join(parts))
        for page_no, parts in sorted(titles.items())
        if title_like(" ".join(parts))
    ]


def _docx(data: bytes, _ext: str) -> tuple[str, list[Chapter]]:
    doc = Document(io.BytesIO(data))
    title = doc.core_properties.title or ""
    chapters: list[Chapter] = []
    current = Chapter("", "")
    has_headings = False
    for para in doc.paragraphs:
        style = (para.style.name if para.style is not None else "").lower()
        if style.startswith("heading 1") or style == "title":
            has_headings = True
            if current.text.strip():
                chapters.append(current)
            current = Chapter(para.text, "")
        else:
            current.text += para.text + "\n"
    chapters.append(current)
    if not has_headings:
        return title, _split_text("\n".join(c.text for c in chapters))
    return title, chapters


def _epub(data: bytes, _ext: str) -> tuple[str, list[Chapter]]:
    # An EPUB is a zip of HTML files. container.xml points to the .opf file,
    # whose <spine> lists the HTML files in reading order.
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        container = BeautifulSoup(z.read("META-INF/container.xml"), "xml")
        opf_path = container.find("rootfile")["full-path"]
        opf = BeautifulSoup(z.read(opf_path), "xml")
        base = opf_path.rsplit("/", 1)[0] + "/" if "/" in opf_path else ""
        title_tag = opf.find("dc:title") or opf.find("title")
        manifest = {item["id"]: item["href"] for item in opf.find_all("item")}

        chapters = []
        for ref in opf.find("spine").find_all("itemref"):
            href = manifest.get(ref["idref"])
            if not href:
                continue
            soup = BeautifulSoup(z.read(base + href), "html.parser")
            heading = soup.find(["h1", "h2", "title"])
            chapters.append(Chapter(heading.get_text(" ", strip=True) if heading else "", soup.get_text("\n")))
    return (title_tag.get_text(strip=True) if title_tag else ""), chapters


def _plain(data: bytes, ext: str) -> tuple[str, list[Chapter]]:
    text = data.decode("utf-8", errors="replace")
    if ext in {".html", ".htm"}:
        soup = BeautifulSoup(text, "html.parser")
        title = soup.title.get_text(strip=True) if soup.title else ""
        return title, _split_text(soup.get_text("\n"))
    return "", _split_text(text)


# ---------- helpers ----------

# A line on its own like "Chapter 3", "CHAPTER III: The Fall", "Part Two".
HEADING = re.compile(
    r"^[ \t]*((?:chapter|part|book)[ \t]+([0-9]+|[ivxlcdm]+|[a-z]+(?:-[a-z]+)?)\b([^\n]{0,80}))$",
    re.IGNORECASE | re.MULTILINE,
)
WORD_NUMBERS = {
    w: i + 1
    for i, w in enumerate(
        "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen "
        "sixteen seventeen eighteen nineteen twenty".split()
    )
}
ROMAN = {"i": 1, "v": 5, "x": 10, "l": 50, "c": 100, "d": 500, "m": 1000}


def _number(token: str) -> int | None:
    t = token.lower()
    if t.isdigit():
        return int(t)
    if t in WORD_NUMBERS:
        return WORD_NUMBERS[t]
    if all(ch in ROMAN for ch in t):
        total = 0
        for ch, nxt in zip(t, t[1:] + " "):
            value = ROMAN[ch]
            total += -value if nxt in ROMAN and ROMAN[nxt] > value else value
        return total
    return None


def _split_text(text: str) -> list[Chapter]:
    """Split on "Chapter N" headings, keeping only a clean 1, 2, 3... sequence.

    Requiring the numbers to count upward, with real text in between, skips the
    table of contents, running page headers ("Chapter 1 Introduction" on every
    page) and sentences such as "Chapter 7 introduces...".
    """
    marks = []
    for m in HEADING.finditer(text):
        rest = m.group(3).strip()
        if rest[:1].islower():  # "Chapter 7 introduces design" is a sentence
            continue
        n = _number(m.group(2))
        if n is not None:
            marks.append((n, m))

    chosen = []
    expected = min((n for n, _ in marks), default=None)
    pos = 0
    while expected is not None:
        options = [m for n, m in marks if n == expected and m.start() >= pos]
        if not options:
            break
        nxt = [m for n, m in marks if n == expected + 1]
        pick = None
        for m in options:
            following = next((x for x in nxt if x.start() > m.end()), None)
            end = following.start() if following else len(text)
            if len(text[m.end() : end].split()) >= MIN_CHAPTER_WORDS:
                pick = m
                break
        if pick is None:
            break
        chosen.append(pick)
        pos = pick.end()
        expected += 1

    if len(chosen) >= 2:
        return [
            Chapter(
                m.group(1).strip(),
                text[m.end() : chosen[i + 1].start() if i + 1 < len(chosen) else len(text)],
            )
            for i, m in enumerate(chosen)
        ]

    words = text.split()
    return [
        Chapter(f"Part {i // CHUNK_WORDS + 1}", " ".join(words[i : i + CHUNK_WORDS]))
        for i in range(0, len(words), CHUNK_WORDS)
    ]


def _clean(text: str) -> str:
    text = re.sub(r"-\n(\w)", r"\1", text)  # re-join words hyphenated across lines
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()
