"""Shared image helpers for the vision demos."""

import base64
import io

import cv2
import numpy as np
from PIL import Image, ImageOps

MAX_SIDE = 640  # images sent back to the browser are shrunk to this

# Memory guard. The hosted API has 512 MB and sits near 260 MB once the crack
# model is loaded, while a decoded photo costs 3 bytes per pixel *before* it is
# shrunk. Measured: one 8000x6000 JPEG peaked the process at 556 MB, and a
# 0.4 MB PNG that declares 20000x20000 pixels peaked it at 2.5 GB. So the size
# is read from the file header first, JPEGs are decoded straight at reduced
# scale (libjpeg does this almost for free), and anything else that would not
# fit is refused before a single pixel is decoded.
MAX_JPEG_PIXELS = 100_000_000  # decoded at 1/2..1/8 scale, so even this stays small
MAX_OTHER_PIXELS = 24_000_000  # PNG/WebP/etc. decode at full size: 24 MP is ~70 MB

Image.MAX_IMAGE_PIXELS = None  # the limits above replace Pillow's own warning


def decode(data: bytes) -> np.ndarray:
    """Uploaded bytes -> RGB array no larger than MAX_SIDE. Raises ValueError if
    it isn't an image or is too large to decode safely."""
    try:
        with Image.open(io.BytesIO(data)) as im:
            w, h = im.size
            limit = MAX_JPEG_PIXELS if im.format == "JPEG" else MAX_OTHER_PIXELS
            if w * h > limit:
                raise ValueError(f"image is too large ({w}x{h}); please send one under {limit // 1_000_000} megapixels")
            im.draft("RGB", (MAX_SIDE, MAX_SIDE))  # JPEG only: decode at the smallest scale still >= MAX_SIDE
            im = ImageOps.exif_transpose(im)  # phone photos store rotation in EXIF, as OpenCV honoured before
            img = np.asarray(im.convert("RGB"))
    except ValueError:
        raise
    except Exception as exc:  # Pillow raises several types for corrupt/unknown files
        raise ValueError("that file isn't a readable image") from exc
    h, w = img.shape[:2]
    scale = MAX_SIDE / max(h, w)
    if scale < 1:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    return np.ascontiguousarray(img)


def to_data_url(img_rgb: np.ndarray) -> str:
    """Encode an image as a data URL, so it can travel inside the JSON reply
    and be used directly as <img src=...> in the browser."""
    ok, png = cv2.imencode(".png", cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR))
    if not ok:
        raise ValueError("could not encode image")
    return "data:image/png;base64," + base64.b64encode(png.tobytes()).decode()
