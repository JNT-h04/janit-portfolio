"""The ResNet50 crack-severity classifier from concrete-crack-severity-analysis."""

import os
from typing import Any

import numpy as np

from app.core.config import settings
from app.core.model_slot import ModelMissing, ModelSlot

CLASSES = ["Minor", "Moderate", "No_Crack", "Severe"]  # the order the model was trained with
SIZE = 224


def _load() -> Any:
    path = settings.crack_model_path
    if not path.exists():
        raise ModelMissing(f"weights not found at {path}")
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")  # hide TensorFlow's start-up chatter
    # Imported here, not at the top: TensorFlow takes seconds to import and
    # the rest of the backend (and its tests) shouldn't have to wait for it.
    import tensorflow as tf

    model = tf.keras.models.load_model(path, compile=False)
    model(np.zeros((1, SIZE, SIZE, 3), dtype=np.float32), training=False)  # warm-up: the first call is slow
    return model


slot: ModelSlot[Any] = ModelSlot("fracture", _load)


def predict(img_rgb: np.ndarray) -> dict[str, float]:
    """Class probabilities for one RGB image (any size)."""
    import cv2
    from keras.applications.resnet50 import preprocess_input

    resized = cv2.resize(img_rgb, (SIZE, SIZE)).astype(np.float32)
    batch = preprocess_input(resized[None])  # same preprocessing as in training
    with slot.lock:
        probs = slot.model(batch, training=False).numpy()[0]
    return {name: round(float(p), 4) for name, p in zip(CLASSES, probs, strict=True)}
