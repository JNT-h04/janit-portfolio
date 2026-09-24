"""The ResNet50 crack-severity classifier from concrete-crack-severity-analysis.

The network was trained in Keras, but it is *served* as ONNX. The weights are
identical — the exported graph was checked against the original on 200 images
from the training set's classes: zero different labels and a worst probability
difference of 2e-06 — and ONNX Runtime costs about 50 MB instead of the ~600 MB
TensorFlow needs, which is the difference between this API fitting on a free
host and not. See scripts/export_fracture_onnx.py for the export and its check.
"""

from typing import Any

import numpy as np

from app.core.config import settings
from app.core.model_slot import ModelMissing, ModelSlot
from app.core.weights import ensure_local

CLASSES = ["Minor", "Moderate", "No_Crack", "Severe"]  # the order the model was trained with
SIZE = 224

# What keras.applications.resnet50.preprocess_input does: swap RGB to BGR and
# subtract the ImageNet channel means. Inlined so serving needs no Keras.
BGR_MEANS = np.array([103.939, 116.779, 123.68], dtype=np.float32)


def _load() -> Any:
    # On a host the file is not in the image; it is fetched once, here, in the
    # background thread that loads the model — so start-up is never blocked.
    path = ensure_local(settings.crack_model_path, settings.crack_model_url)
    if not path.exists():
        raise ModelMissing(f"weights not found at {path}")
    # Imported here rather than at the top so the rest of the backend, and its
    # tests, never pay for loading it.
    import onnxruntime as ort

    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    name = session.get_inputs()[0].name
    session.run(None, {name: np.zeros((1, SIZE, SIZE, 3), np.float32)})  # warm-up
    return session


slot: ModelSlot[Any] = ModelSlot("fracture", _load)


def preprocess(img_rgb: np.ndarray) -> np.ndarray:
    """Resize to the training size and apply the training preprocessing."""
    import cv2

    resized = cv2.resize(img_rgb, (SIZE, SIZE)).astype(np.float32)
    return (resized[None][..., ::-1] - BGR_MEANS).astype(np.float32)


def predict(img_rgb: np.ndarray) -> dict[str, float]:
    """Class probabilities for one RGB image (any size)."""
    batch = preprocess(img_rgb)
    with slot.lock:
        session = slot.model
        probs = session.run(None, {session.get_inputs()[0].name: batch})[0][0]
    return {name: round(float(p), 4) for name, p in zip(CLASSES, probs, strict=True)}
