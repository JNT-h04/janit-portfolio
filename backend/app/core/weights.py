"""Fetching model weights that are too large to keep in the repository.

The crack classifier is 96 MB — fine to download once at boot, too big to put
in git. It is published as a GitHub release asset, so a host only needs the URL
and nothing has to be uploaded by hand when a service is recreated.

The download is atomic: it lands in a temporary file next to the target and is
renamed into place, so a boot that is killed halfway never leaves a truncated
file that the next boot would happily try to load.
"""

import logging
import os
import tempfile
import urllib.request
from pathlib import Path

log = logging.getLogger(__name__)


def ensure_local(path: Path, url: str | None) -> Path:
    """Return `path`, downloading it from `url` first if it is not there yet."""
    if path.exists():
        return path
    if not url:
        return path  # nothing to fetch; the caller reports the missing file

    path.parent.mkdir(parents=True, exist_ok=True)
    log.info("downloading weights from %s", url)
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".part")
    os.close(fd)
    try:
        with urllib.request.urlopen(url, timeout=120) as response, open(tmp, "wb") as out:
            while chunk := response.read(1 << 20):
                out.write(chunk)
        os.replace(tmp, path)
        log.info("weights ready at %s (%.1f MB)", path, path.stat().st_size / 1e6)
    except Exception:
        Path(tmp).unlink(missing_ok=True)
        raise
    return path
