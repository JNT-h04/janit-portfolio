"""Train CORTEX from scratch, honestly, and pick the best recipe.

Rules that keep the numbers meaningful:
  * the split is by PATIENT (OASIS subject id), never by image, so no person
    appears in two splits;
  * "Moderate Dementia" is dropped — the dataset has 2 patients with it, so a
    patient split leaves it no training data;
  * every recipe is scored on VALIDATION; the test set is touched once, at the
    end, for the winner only.

Run (GPU recommended):
    ..\.venv-train\Scripts\python scripts\train_cortex.py
"""

import argparse
import json
import os
import random
import re
import time
from collections import defaultdict
from dataclasses import dataclass, field

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from torch.utils.data import DataLoader, Subset, WeightedRandomSampler
from torchvision import datasets, models, transforms

ROOT = os.environ.get("ALZ_DATA", r"D:\Dataset\Alzhemier_balanced_1500_1")
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "models")
DROP = "Moderate Dementia"
SEED = 123
MEAN, STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]


@dataclass
class Recipe:
    name: str
    arch: str = "resnet18"
    size: int = 176
    epochs: int = 20
    lr: float = 3e-4
    weight_decay: float = 1e-4
    dropout: float = 0.0
    balance: str = "class"  # "class" or "patient" (patient also evens out slice counts)
    aug: str = "light"  # light | strong
    patience: int = 5
    extra: dict = field(default_factory=dict)


# Short schedules win here. With ~240 training brains the network starts
# memorising patients almost immediately, and the one-cycle learning rate has
# to finish annealing within the run, so "epochs" is itself a hyper-parameter.
RECIPES = [
    Recipe(f"r18-light-{e}ep", arch="resnet18", size=176, aug="light", epochs=e) for e in (1, 2, 3, 5)
] + [
    Recipe(f"r18-strong-{e}ep", arch="resnet18", size=176, aug="strong", dropout=0.2, epochs=e) for e in (2, 4, 8)
] + [
    Recipe("r18-light-patientbal-2ep", arch="resnet18", size=176, aug="light", balance="patient", epochs=2),
    Recipe("r18-light-224-2ep", arch="resnet18", size=224, aug="light", epochs=2),
    Recipe("r34-light-2ep", arch="resnet34", size=176, aug="light", epochs=2),
    Recipe("r34-light-4ep", arch="resnet34", size=176, aug="light", epochs=4),
    Recipe("effb0-light-2ep", arch="efficientnet_b0", size=176, aug="light", epochs=2),
    Recipe("effb0-light-4ep", arch="efficientnet_b0", size=176, aug="light", epochs=4),
    Recipe("r18-lowlr-3ep", arch="resnet18", size=176, aug="light", lr=1e-4, epochs=3),
    Recipe("r18-highlr-2ep", arch="resnet18", size=176, aug="light", lr=6e-4, epochs=2),
]


def seed_all(seed: int = SEED) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def transforms_for(size: int, aug: str, train: bool):
    steps = [transforms.Grayscale(3)]
    if train and aug == "strong":
        steps += [
            transforms.Resize((size + 16, size + 16)),
            transforms.RandomCrop(size),
            transforms.RandomHorizontalFlip(),
            transforms.RandomAffine(degrees=8, translate=(0.05, 0.05), scale=(0.95, 1.05)),
            transforms.ColorJitter(brightness=0.15, contrast=0.15),
        ]
    elif train:
        steps += [
            transforms.Resize((size, size)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomAffine(degrees=6, translate=(0.03, 0.03)),
        ]
    else:
        steps += [transforms.Resize((size, size))]
    steps += [transforms.ToTensor(), transforms.Normalize(MEAN, STD)]
    return transforms.Compose(steps)


PATIENT_RE = re.compile(r"(OAS1_\d+)")


def patient_of(path: str) -> str:
    match = PATIENT_RE.search(os.path.basename(path))
    return match.group(1) if match else os.path.basename(path)


def build_splits(base: datasets.ImageFolder, drop_id: int):
    """Split patients 70/15/15 within each class."""
    groups: dict[int, dict[str, list[int]]] = {}
    for i, (path, y) in enumerate(base.samples):
        if y == drop_id:
            continue
        groups.setdefault(y, {}).setdefault(patient_of(path), []).append(i)

    rng = random.Random(SEED)
    train_idx, val_idx, test_idx = [], [], []
    for y, people in sorted(groups.items()):
        items = list(people.items())
        rng.shuffle(items)
        total = sum(len(v) for _, v in items)
        test, val, i = [], [], 0
        while i < len(items) and len(test) < round(0.15 * total):
            test += items[i][1]
            i += 1
        while i < len(items) and len(val) < round(0.15 * total):
            val += items[i][1]
            i += 1
        train_idx += [idx for _, idxs in items[i:] for idx in idxs]
        val_idx += val
        test_idx += test

    seen = lambda idxs: {patient_of(base.samples[i][0]) for i in idxs}
    assert not (seen(train_idx) & seen(val_idx)), "train/val share a patient"
    assert not (seen(train_idx) & seen(test_idx)), "train/test share a patient"
    assert not (seen(val_idx) & seen(test_idx)), "val/test share a patient"
    return train_idx, val_idx, test_idx


def make_model(arch: str, classes: int, dropout: float):
    net = getattr(models, arch)(weights="DEFAULT")
    if hasattr(net, "fc"):
        head = nn.Linear(net.fc.in_features, classes)
        net.fc = nn.Sequential(nn.Dropout(dropout), head) if dropout else head
    else:  # efficientnet and friends keep their head in .classifier
        in_features = net.classifier[-1].in_features
        net.classifier = nn.Sequential(nn.Dropout(dropout or 0.2), nn.Linear(in_features, classes))
    return net


def loaders(recipe: Recipe, base, splits, remap, device):
    train_idx, val_idx, test_idx = splits
    train_ds = Subset(datasets.ImageFolder(ROOT, transform=transforms_for(recipe.size, recipe.aug, True)), train_idx)
    eval_ds = datasets.ImageFolder(ROOT, transform=transforms_for(recipe.size, recipe.aug, False))

    labels = [remap[base.samples[i][1]] for i in train_idx]
    counts = np.bincount(labels, minlength=len(set(labels)))
    if recipe.balance == "patient":
        per_patient: dict[str, int] = defaultdict(int)
        for i in train_idx:
            per_patient[patient_of(base.samples[i][0])] += 1
        weights = [1.0 / (counts[y] * per_patient[patient_of(base.samples[i][0])]) for i, y in zip(train_idx, labels)]
    else:
        weights = [1.0 / counts[y] for y in labels]
    sampler = WeightedRandomSampler(weights, num_samples=len(train_idx), replacement=True)

    pin = device.type == "cuda"
    return (
        DataLoader(train_ds, batch_size=32, sampler=sampler, num_workers=0, pin_memory=pin),
        DataLoader(Subset(eval_ds, val_idx), batch_size=64, num_workers=0, pin_memory=pin),
        DataLoader(Subset(eval_ds, test_idx), batch_size=64, num_workers=0, pin_memory=pin),
    )


@torch.no_grad()
def predict(net, dl, remap, device):
    net.eval()
    probs, trues = [], []
    for x, y in dl:
        with torch.autocast(device.type, enabled=device.type == "cuda"):
            out = torch.softmax(net(x.to(device)), 1)
        probs.append(out.float().cpu())
        trues += [remap[int(v)] for v in y]
    return torch.cat(probs).numpy(), np.array(trues)


def patient_scores(probs, idxs, base, remap):
    """Average every slice of a patient, the way a reader sees a whole scan."""
    by_patient: dict[str, list[int]] = defaultdict(list)
    truth: dict[str, int] = {}
    for k, idx in enumerate(idxs):
        pid = patient_of(base.samples[idx][0])
        by_patient[pid].append(k)
        truth[pid] = remap[base.samples[idx][1]]
    true = np.array([truth[p] for p in by_patient])
    pred = np.array([probs[ks].mean(axis=0).argmax() for ks in by_patient.values()])
    return float((true == pred).mean()), f1_score(true, pred, average="macro", zero_division=0), true, pred


def train_one(recipe: Recipe, base, splits, remap, kept, device):
    seed_all()
    train_dl, val_dl, _ = loaders(recipe, base, splits, remap, device)
    net = make_model(recipe.arch, len(kept), recipe.dropout).to(device)
    opt = torch.optim.AdamW(net.parameters(), lr=recipe.lr, weight_decay=recipe.weight_decay)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=recipe.lr, total_steps=recipe.epochs * len(train_dl))
    loss_fn = nn.CrossEntropyLoss(label_smoothing=0.05)
    scaler = torch.amp.GradScaler(device.type, enabled=device.type == "cuda")

    best = {"f1": -1.0, "state": None, "epoch": 0}
    for epoch in range(1, recipe.epochs + 1):
        net.train()
        started = time.time()
        for x, y in train_dl:
            x = x.to(device, non_blocking=True)
            y = torch.tensor([remap[int(v)] for v in y], device=device)
            with torch.autocast(device.type, enabled=device.type == "cuda"):
                loss = loss_fn(net(x), y)
            opt.zero_grad(set_to_none=True)
            scaler.scale(loss).backward()
            scaler.step(opt)
            scaler.update()
            sched.step()

        probs, trues = predict(net, val_dl, remap, device)
        f1 = f1_score(trues, probs.argmax(1), average="macro", zero_division=0)
        acc = float((probs.argmax(1) == trues).mean())
        print(f"    [{epoch:02d}] val acc {acc:.3f} macroF1 {f1:.3f}  ({time.time() - started:.0f}s)", flush=True)
        if f1 > best["f1"]:
            best = {"f1": f1, "state": {k: v.cpu().clone() for k, v in net.state_dict().items()}, "epoch": epoch}
        elif epoch - best["epoch"] >= recipe.patience:
            print(f"    early stop (no gain for {recipe.patience} epochs)", flush=True)
            break
    return best, net


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="run a single recipe by name")
    parser.add_argument("--epochs", type=int, help="override epochs (quick smoke test)")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"device: {device} ({torch.cuda.get_device_name(0) if device.type == 'cuda' else 'cpu'})", flush=True)

    base = datasets.ImageFolder(ROOT)
    drop_id = base.classes.index(DROP)
    kept = [c for c in base.classes if c != DROP]
    remap = {i: (i if i < drop_id else i - 1) for i in range(len(base.classes)) if i != drop_id}
    splits = build_splits(base, drop_id)
    print(f"slices train/val/test: {[len(s) for s in splits]}", flush=True)
    print(f"patients: {[len({patient_of(base.samples[i][0]) for i in s}) for s in splits]}", flush=True)

    recipes = [r for r in RECIPES if not args.only or r.name == args.only]
    if args.epochs:
        for r in recipes:
            r.epochs = args.epochs

    results = []
    champion = None
    for recipe in recipes:
        print(f"\n== {recipe.name} ({recipe.arch}, {recipe.size}px, {recipe.aug} aug, {recipe.balance}-balanced)", flush=True)
        best, net = train_one(recipe, base, splits, remap, kept, device)
        results.append({"recipe": recipe.name, "val_macro_f1": round(best["f1"], 4), "epoch": best["epoch"]})
        if champion is None or best["f1"] > champion[0]["f1"]:
            champion = (best, recipe, net)
        del net
        torch.cuda.empty_cache()

    best, recipe, net = champion  # type: ignore[misc]
    print(f"\nwinner on validation: {recipe.name} (macro F1 {best['f1']:.4f}, epoch {best['epoch']})", flush=True)

    net.load_state_dict(best["state"])
    net.to(device)
    _, _, test_dl = loaders(recipe, base, splits, remap, device)
    probs, trues = predict(net, test_dl, remap, device)
    preds = probs.argmax(1)
    slice_acc = float((preds == trues).mean())
    slice_f1 = f1_score(trues, preds, average="macro", zero_division=0)
    pat_acc, pat_f1, pat_true, pat_pred = patient_scores(probs, splits[2], base, remap)

    print(f"\nTEST slice   acc {slice_acc:.4f}  macroF1 {slice_f1:.4f}   (shipped model: 0.602 / 0.593)", flush=True)
    print(f"TEST patient acc {pat_acc:.4f}  macroF1 {pat_f1:.4f}   (shipped model: 0.815 / 0.656)", flush=True)
    print(classification_report(trues, preds, target_names=kept, digits=3, zero_division=0), flush=True)
    print(confusion_matrix(trues, preds), flush=True)
    print("patient confusion:\n", confusion_matrix(pat_true, pat_pred), flush=True)

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "cortex_trained.pt")
    torch.save(
        {
            "state_dict": {k: v.cpu() for k, v in net.state_dict().items()},
            "classes": kept,
            "size": recipe.size,
            "arch": recipe.arch,
            "recipe": recipe.name,
            "val_macro_f1": best["f1"],
            "test": {"slice_acc": slice_acc, "slice_f1": slice_f1, "patient_acc": pat_acc, "patient_f1": pat_f1},
        },
        out,
    )
    print(f"\nsaved {out}", flush=True)
    print(json.dumps(results, indent=2), flush=True)


if __name__ == "__main__":
    main()
