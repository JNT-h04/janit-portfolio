"""Shared image helpers for the vision demos."""

import base64

import cv2
import numpy as np

MAX_SIDE = 640  # images sent back to the browser are shrunk to this


def decode(data: bytes) -> np.ndarray:
    """Uploaded bytes -> RGB array. Raises ValueError if it isn't an image."""
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("that file isn't a readable image")
    h, w = img.shape[:2]
    scale = MAX_SIDE / max(h, w)
    if scale < 1:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def to_data_url(img_rgb: np.ndarray) -> str:
    """Encode an image as a data URL, so it can travel inside the JSON reply
    and be used directly as <img src=...> in the browser."""
    ok, png = cv2.imencode(".png", cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR))
    if not ok:
        raise ValueError("could not encode image")
    return "data:image/png;base64," + base64.b64encode(png.tobytes()).decode()
