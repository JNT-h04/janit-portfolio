"""CORTEX: the Alzheimer MRI classifier, with Grad-CAM explanations.

Two networks vote, both trained on the same patient-level split:

* a 3-class ResNet18 (the one retrained for this site), and
* the older 4-class ResNet50, whose untrained "Moderate Dementia" output is
  dropped because a patient-level split leaves that class with no training data.

Blending them lifts slice accuracy from 58.0% to 60.2% and macro F1 from 0.565
to 0.593 on held-out patients. The blend weight was picked on the validation
split, never on the test set. Grad-CAM comes from the ResNet18 branch, since a
heatmap has to belong to one network to mean anything.
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
PARTNER_SIZE = 224


@dataclass
class Loaded:
    net: Any  # ResNet18: predictions and Grad-CAM
    classes: list[str]
    dropped: list[str]
    size: int
    all_classes: list[str]
    partner: Any = None  # ResNet50, predictions only
    partner_weight: float = 0.0


def _build(arch: str, outputs: int, state: dict):
    from torch import nn
    from torchvision import models

    net = getattr(models, arch)()
    net.fc = nn.Linear(net.fc.in_features, outputs)
    net.load_state_dict(state)
    return net.eval()


def _load() -> Loaded:
    path = settings.cortex_model_path
    if not path.exists():
        raise ModelMissing(f"weights not found at {path}")
    import torch

    blob = torch.load(path, map_location="cpu", weights_only=False)
    if isinstance(blob, dict) and "state_dict" in blob:
        classes = list(blob["classes"])
        loaded = Loaded(
            net=_build("resnet18", len(classes), blob["state_dict"]),
            classes=classes,
            dropped=[],
            size=int(blob.get("size", 176)),
            all_classes=classes,
        )
    else:  # older 4-class checkpoint on its own
        return Loaded(
            net=_build("resnet50", len(FOUR), blob),
            classes=[c for c in FOUR if c != UNTRAINED],
            dropped=[UNTRAINED],
            size=PARTNER_SIZE,
            all_classes=FOUR,
        )

    partner_path = settings.cortex_partner_path
    if partner_path.exists() and set(loaded.classes) <= set(FOUR):
        partner_blob = torch.load(partner_path, map_location="cpu", weights_only=False)
        state = partner_blob.get("state_dict", partner_blob) if isinstance(partner_blob, dict) else partner_blob
        loaded.partner = _build("resnet50", len(FOUR), state)
        loaded.partner_weight = settings.cortex_partner_weight
    return loaded


slot: ModelSlot[Loaded] = ModelSlot("cortex", _load)


def _to_tensor(img_rgb: np.ndarray, size: int):
    import cv2
    import torch

    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)  # MRI scans are greyscale
    resized = cv2.resize(gray, (size, size)).astype(np.float32) / 255.0
    stacked = np.stack([resized] * 3)  # the network expects 3 channels
    normed = (stacked - np.array(MEAN)[:, None, None]) / np.array(STD)[:, None, None]
    return torch.tensor(normed, dtype=torch.float32)[None]


def _partner_probs(loaded: Loaded, img_rgb: np.ndarray) -> dict[str, float]:
    """The ResNet50's opinion, with its untrained class removed and renormalised."""
    import torch

    with torch.no_grad():
        logits = loaded.partner(_to_tensor(img_rgb, PARTNER_SIZE))
    keep = [i for i, c in enumerate(FOUR) if c != UNTRAINED]
    probs = torch.softmax(logits[0, keep], dim=0)
    return {FOUR[i]: float(p) for i, p in zip(keep, probs, strict=True)}


def predict_with_cam(img_rgb: np.ndarray) -> tuple[dict[str, float], np.ndarray]:
    """Class probabilities plus a Grad-CAM heatmap (0-1, feature-map sized).

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
    handle = layer.register_forward_hook(lambda _m, _i, out: activations.__setitem__("value", out))

    with slot.lock:
        try:
            out = loaded.net(x)
            mask = torch.tensor(
                [0.0 if c in loaded.dropped else 1.0 for c in loaded.all_classes], dtype=torch.float32
            )
            masked = out + (mask - 1) * 1e9
            own = torch.softmax(masked, dim=1)[0].detach()
            scores = {c: float(own[i]) for i, c in enumerate(loaded.all_classes) if c not in loaded.dropped}

            if loaded.partner is not None:
                partner = _partner_probs(loaded, img_rgb)
                w = loaded.partner_weight
                scores = {c: (1 - w) * scores[c] + w * partner.get(c, 0.0) for c in scores}

            best_name = max(scores, key=lambda k: scores[k])
            best = loaded.all_classes.index(best_name)

            loaded.net.zero_grad(set_to_none=True)
            feature = activations["value"]
            grads = torch.autograd.grad(out[0, best], feature)[0]
            weights = grads.mean(dim=(2, 3), keepdim=True)  # one weight per feature map
            cam = torch.relu((weights * feature).sum(dim=1))[0]
        finally:
            handle.remove()

    cam = cam.detach().numpy()
    if cam.max() > 0:
        cam = cam / cam.max()
    return {c: round(v, 4) for c, v in scores.items()}, cam
