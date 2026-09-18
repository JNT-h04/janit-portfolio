import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.cortex import model
from app.main import app
from app.routers import cortex

client = TestClient(app)


def scan() -> bytes:
    """A fake MRI-ish image: dark background with a bright blob."""
    img = np.zeros((220, 220, 3), np.uint8)
    cv2.circle(img, (110, 110), 80, (120, 120, 120), -1)
    cv2.circle(img, (140, 90), 18, (220, 220, 220), -1)
    ok, jpg = cv2.imencode(".jpg", img)
    assert ok
    return jpg.tobytes()


def test_focus_description_follows_the_hot_spot():
    cam = np.zeros((10, 10), np.float32)
    cam[1, 8] = 1.0
    assert cortex._describe_focus(cam) == "upper right region"
    cam = np.zeros((10, 10), np.float32)
    cam[8, 1] = 1.0
    assert cortex._describe_focus(cam) == "lower left region"
    assert cortex._describe_focus(np.zeros((4, 4), np.float32)) == "no clear focus"


def test_colourise_matches_the_image_size():
    heat = cortex._colourise(np.linspace(0, 1, 49, dtype=np.float32).reshape(7, 7), (120, 90))
    assert heat.shape == (120, 90, 3)


def test_analyze_returns_prediction_and_images(monkeypatch):
    loaded = model.Loaded(net=None, classes=["Non Demented", "Mild Dementia"], dropped=["Moderate Dementia"], size=176,
                          all_classes=["Non Demented", "Mild Dementia"])
    monkeypatch.setattr(model.slot, "state", "ready")
    monkeypatch.setattr(model.slot, "_model", loaded)
    monkeypatch.setattr(
        model,
        "predict_with_cam",
        lambda img: ({"Non Demented": 0.2, "Mild Dementia": 0.8}, np.eye(6, dtype=np.float32)),
    )

    res = client.post("/api/cortex/analyze", files={"file": ("scan.jpg", scan())})
    assert res.status_code == 200
    body = res.json()
    assert body["prediction"] == "Mild Dementia"
    assert body["confidence"] == 0.8
    assert body["excluded"] == ["Moderate Dementia"]
    for key in ("input_image", "heatmap_image", "overlay_image"):
        assert body[key].startswith("data:image/png;base64,")


def test_analyze_while_loading_is_503(monkeypatch):
    monkeypatch.setattr(model.slot, "state", "loading")
    res = client.post("/api/cortex/analyze", files={"file": ("scan.jpg", scan())})
    assert res.status_code == 503
    assert "warming up" in res.json()["detail"]


def test_analyze_rejects_non_images(monkeypatch):
    monkeypatch.setattr(model.slot, "state", "ready")
    monkeypatch.setattr(model.slot, "_model", model.Loaded(None, ["a"], [], 176, ["a"]))
    assert client.post("/api/cortex/analyze", files={"file": ("x.jpg", b"nope")}).status_code == 422


def test_sample_path_traversal_is_blocked():
    assert client.get("/api/cortex/samples/..%2F..%2Fmain.py").status_code == 404
