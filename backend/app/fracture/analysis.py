"""Classical computer vision around the crack model, ported from the original
Streamlit app: edge map, crack intensity, an age estimate and a probable cause.

These are rule-of-thumb heuristics (thresholds on edge density and line
angles), not trained models, and the page says so.
"""

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


def edges(img_rgb: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    return cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 50, 150)


def intensity(edge_map: np.ndarray) -> float:
    """Edge pixels per thousand pixels: how much of the surface is crack line."""
    return round(float(np.count_nonzero(edge_map)) / edge_map.size * 1000, 2)


def age(edge_map: np.ndarray) -> str:
    density = np.count_nonzero(edge_map) / edge_map.size
    if density < 0.01:
        return "Recent"
    if density < 0.03:
        return "Moderate age"
    return "Old"


def cause_and_overlay(img_rgb: np.ndarray, edge_map: np.ndarray) -> tuple[str, np.ndarray, float | None]:
    """Guess the cause from line orientation and branching; draw the detected lines."""
    lines = cv2.HoughLines(edge_map, 1, np.pi / 180, 100)
    overlay = (img_rgb * 0.55).astype(np.uint8)  # darken the photo so the lines stand out
    angles = []
    if lines is not None:
        for line in lines[:20]:
            rho, theta = line[0]
            a, b = np.cos(theta), np.sin(theta)
            x0, y0 = a * rho, b * rho
            p1 = (int(x0 - 1000 * b), int(y0 + 1000 * a))
            p2 = (int(x0 + 1000 * b), int(y0 - 1000 * a))
            cv2.line(overlay, p1, p2, (0, 240, 255), 2)
            angles.append(float(theta * 180 / np.pi))

    avg_angle = float(np.mean(angles)) if angles else None
    contours, _ = cv2.findContours(edge_map, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    if avg_angle is not None and 80 < avg_angle < 100:
        cause = "Structural stress"
    elif len(contours) > 50:
        cause = "Overloading"
    else:
        cause = "Shrinkage / thermal"
    return cause, overlay, avg_angle


def edges_as_neon(edge_map: np.ndarray) -> np.ndarray:
    """Pink crack lines on black, to match the site."""
    out = np.zeros((*edge_map.shape, 3), np.uint8)
    out[edge_map > 0] = (255, 42, 109)
    return cv2.dilate(out, np.ones((2, 2), np.uint8))


def to_data_url(img_rgb: np.ndarray) -> str:
    """Encode an image as a data URL, so it can travel inside the JSON reply
    and be used directly as <img src=...> in the browser."""
    ok, png = cv2.imencode(".png", cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR))
    if not ok:
        raise ValueError("could not encode image")
    return "data:image/png;base64," + base64.b64encode(png.tobytes()).decode()


ADVICE = {
    "No_Crack": "No crack detected. Keep up routine visual inspections.",
    "Minor": "Hairline crack. Monitor it, and seal with epoxy or polyurethane filler to keep water out.",
    "Moderate": "Noticeable crack. Clean and fill it (epoxy injection or routing and sealing), "
    "and check whether it grows over the next months.",
    "Severe": "Wide or spreading crack. Have a structural engineer inspect it before repairing; "
    "it may need reinforcement, not just filling.",
}
