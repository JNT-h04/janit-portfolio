"""Load a big ML model once, in the background, and share it between requests.

Why not load it inside the request?  Loading the crack model takes seconds.
Doing that for every visitor would make every upload slow.

Why not load it before the server starts?  Then the whole site (profile,
terminal, LEXICON) would be down until the model is ready, and every
`--reload` while you edit code would stall too.

So: the server starts at once, a background thread loads the model, and the
model's endpoint answers "warming up" (503) until the slot says it's ready.
"""

import ctypes
import logging
import threading
import time
from collections.abc import Callable
from typing import Generic, Literal, TypeVar

log = logging.getLogger(__name__)

T = TypeVar("T")
State = Literal["idle", "loading", "ready", "missing", "error"]


def give_back_memory() -> None:
    """Return memory the process has freed to the operating system.

    Loading a model allocates far more than the model keeps (the file is parsed,
    then optimised into a new copy). On Linux, glibc holds on to what was freed
    rather than handing it back, so the process stays at its loading peak for
    good: measured on the host, 505 MB of a 512 MB limit while idle, and the next
    request went over. malloc_trim releases it. Elsewhere this does nothing.
    """
    try:
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except (OSError, AttributeError):
        pass  # not Linux with glibc


class ModelMissing(Exception):
    """The weights file isn't there. Not a crash, just not deployed here."""


class ModelSlot(Generic[T]):
    def __init__(self, name: str, loader: Callable[[], T]) -> None:
        self.name = name
        self._loader = loader
        self._model: T | None = None
        self.state: State = "idle"
        self.detail = ""
        self.load_seconds: float | None = None
        # Only one request at a time may use the model. TensorFlow and PyTorch
        # models are not guaranteed to be safe to call from several threads at once.
        self.lock = threading.Lock()

    def start(self) -> None:
        """Begin loading in a background thread (returns immediately)."""
        if self.state in ("loading", "ready"):
            return
        self.state = "loading"
        threading.Thread(target=self._load, name=f"load-{self.name}", daemon=True).start()

    def _load(self) -> None:
        started = time.time()
        try:
            self._model = self._loader()
            give_back_memory()
            self.load_seconds = round(time.time() - started, 1)
            self.state = "ready"
            log.info("%s model ready in %.1fs", self.name, self.load_seconds)
        except ModelMissing as exc:
            self.state, self.detail = "missing", str(exc)
            log.warning("%s model missing: %s", self.name, exc)
        except Exception as exc:  # keep the rest of the site running
            self.state, self.detail = "error", f"{exc.__class__.__name__}: {exc}"
            log.exception("%s model failed to load", self.name)

    @property
    def model(self) -> T:
        if self._model is None:
            raise RuntimeError(f"{self.name} model is not ready ({self.state})")
        return self._model
