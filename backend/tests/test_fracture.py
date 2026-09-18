import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.fracture import analysis, model
from app.main import app

client = TestClient(app)


def crack_photo() -> bytes:
    """A grey 'concrete' square with a dark diagonal crack."""
    img = np.full((300, 300, 3), 170, np.uint8)
    cv2.line(img, (20, 30), (280, 260), (40, 40, 40), 4)
    ok, jpg = cv2.imencode(".jpg", img)
    assert ok
    return jpg.tobytes()


def test_analysis_helpers_on_a_synthetic_crack():
    img = analysis.decode(crack_photo())
    edge_map = analysis.edges(img)
    assert analysis.intensity(edge_map) > 0
    assert analysis.age(edge_map) in {"Recent", "Moderate age", "Old"}
    cause, overlay, _ = analysis.cause_and_overlay(img, edge_map)
    assert cause
    assert overlay.shape == img.shape
    assert analysis.to_data_url(overlay).startswith("data:image/png;base64,")


def test_decode_rejects_non_images():
    with pytest.raises(ValueError):
        analysis.decode(b"definitely not a jpeg")


def test_large_images_are_shrunk():
    big = np.zeros((2000, 1000, 3), np.uint8)
    ok, png = cv2.imencode(".png", big)
    assert max(analysis.decode(png.tobytes()).shape[:2]) == analysis.MAX_SIDE


@pytest.fixture
def ready_model(monkeypatch):
    monkeypatch.setattr(model.slot, "state", "ready")
    monkeypatch.setattr(
        model, "predict", lambda img: {"Minor": 0.1, "Moderate": 0.2, "No_Crack": 0.0, "Severe": 0.7}
    )


def test_analyze_returns_full_report(ready_model):
    res = client.post("/api/fracture/analyze", files={"file": ("crack.jpg", crack_photo())})
    assert res.status_code == 200
    body = res.json()
    assert body["severity"] == "Severe"
    assert body["confidence"] == 0.7
    assert "engineer" in body["advice"]
    assert body["edges_image"].startswith("data:image/png")


def test_analyze_rejects_garbage(ready_model):
    res = client.post("/api/fracture/analyze", files={"file": ("x.jpg", b"nope")})
    assert res.status_code == 422


def test_analyze_while_loading_is_503(monkeypatch):
    monkeypatch.setattr(model.slot, "state", "loading")
    res = client.post("/api/fracture/analyze", files={"file": ("crack.jpg", crack_photo())})
    assert res.status_code == 503
    assert "warming up" in res.json()["detail"]


def test_samples_are_listed_and_served():
    names = client.get("/api/fracture/samples").json()
    assert "severe-1.jpg" in names
    assert client.get(f"/api/fracture/samples/{names[0]}").status_code == 200


def test_sample_path_traversal_is_blocked():
    assert client.get("/api/fracture/samples/..%2F..%2Fmain.py").status_code == 404
