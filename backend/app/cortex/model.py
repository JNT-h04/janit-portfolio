"""CORTEX: the Alzheimer MRI classifier, with Grad-CAM explanations.

Two checkpoint shapes are supported:

* the retrained 3-class ResNet18 (dict with "state_dict" and "classes"), and
* the older 4-class ResNet50 patient-split checkpoint (a bare state_dict),
  where "Moderate Dementia" is masked out because the patient-level split left
  it with zero training images.
"""

from dataclasses import dataclass
from typing import Any

import numpy as np

from app.core.config import settings
from app.core.model_slot import ModelMissing, ModelSlot

FOUR = ["Mild Dementia", "Moderate Dementia", "Non Demented", "Very mild Dementia"]
UNTRAINED = "Moderate Dementia"  # 2 patients in the dataset -> no training images
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]


@dataclass
class Loaded:
    net: Any
    classes: list[str]  # classes we are willing to predict
    dropped: list[str]  # classes the model knows but must not be trusted for
    size: int
    all_classes: list[str]


def _load() -> Loaded:
    path = settings.cortex_model_path
    if not path.exists():
        raise ModelMissing(f"weights not found at {path}")
    import torch
    from torch import nn
    from torchvision import models

    blob = torch.load(path, map_location="cpu", weights_only=False)
    if isinstance(blob, dict) and "state_dict" in blob:  # retrained 3-class ResNet18
        classes = list(blob["classes"])
        net = models.resnet18()
        net.fc = nn.Linear(net.fc.in_features, len(classes))
        net.load_state_dict(blob["state_dict"])
        size = int(blob.get("size", 176))
        return Loaded(net=net.eval(), classes=classes, dropped=[], size=size, all_classes=classes)

    net = models.resnet50()  # older 4-class checkpoint
    net.fc = nn.Linear(net.fc.in_features, len(FOUR))
    net.load_state_dict(blob)
    return Loaded(
        net=net.eval(),
        classes=[c for c in FOUR if c != UNTRAINED],
        dropped=[UNTRAINED],
        size=224,
        all_classes=FOUR,
    )


slot: ModelSlot[Loaded] = ModelSlot("cortex", _load)


def _to_tensor(img_rgb: np.ndarray, size: int):
    import cv2
    import torch

    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)  # MRI scans are greyscale
    resized = cv2.resize(gray, (size, size)).astype(np.float32) / 255.0
    stacked = np.stack([resized] * 3)  # the network expects 3 channels
    normed = (stacked - np.array(MEAN)[:, None, None]) / np.array(STD)[:, None, None]
    return torch.tensor(normed, dtype=torch.float32)[None]


def predict_with_cam(img_rgb: np.ndarray) -> tuple[dict[str, float], np.ndarray]:
    """Class probabilities plus a Grad-CAM heatmap (0-1, image sized).

    Grad-CAM, in short: run the image forward, keep the feature maps of the
    last convolutional block, then ask "how much would the winning score change
    if each feature map got stronger?" (that's the gradient). Average each
    map's gradient into a weight, add the maps up with those weights, keep the
    positive part, and you get a map of the pixels that pushed the decision.
    """
    import torch

    loaded = slot.model
    x = _to_tensor(img_rgb, loaded.size)

    activations: dict[str, Any] = {}
    layer = loaded.net.layer4[-1]  # last conv block: coarse but semantic
    handle_f = layer.register_forward_hook(lambda _m, _i, out: activations.__setitem__("value", out))

    with slot.lock:
        try:
            x.requires_grad_(False)
            out = loaded.net(x)
            # Never let the model pick a class it was not trained on.
            mask = torch.tensor(
                [0.0 if c in loaded.dropped else 1.0 for c in loaded.all_classes], dtype=torch.float32
            )
            masked = out + (mask - 1) * 1e9
            probs = torch.softmax(masked, dim=1)[0]
            best = int(masked.argmax(1))

            loaded.net.zero_grad(set_to_none=True)
            feature = activations["value"]
            grads = torch.autograd.grad(out[0, best], feature, retain_graph=False)[0]
            weights = grads.mean(dim=(2, 3), keepdim=True)  # one weight per feature map
            cam = torch.relu((weights * feature).sum(dim=1))[0]
        finally:
            handle_f.remove()

    cam = cam.detach().numpy()
    if cam.max() > 0:
        cam = cam / cam.max()
    scores = {c: round(float(probs[i]), 4) for i, c in enumerate(loaded.all_classes) if c not in loaded.dropped}
    return scores, cam
