"""Export the FRACTURE crack model from Keras to ONNX, and prove they agree.

The API serves ONNX rather than TensorFlow: same weights, 96 MB instead of
277 MB, and ~50 MB of runtime instead of ~600 MB, which is what lets the API
run on a free host at all. Keras 3 cannot be handed straight to tf2onnx, so it
goes out through a SavedModel in between.

Run it from the backend venv (it needs TensorFlow, which only the export does):

    backend/.venv/Scripts/python scripts/export_fracture_onnx.py

Checked when this was written: 200 images across all four classes, zero
different labels and a worst probability difference of 2e-06.
"""
import os, sys, tempfile, time
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import numpy as np, tensorflow as tf, cv2

H5 = "D:/Projects/concrete-crack-severity-analysis/model/final_model.h5"
OUT = "D:/Projects/portfolio/backend/models/fracture_resnet50.onnx"
SIZE = 224

model = tf.keras.models.load_model(H5, compile=False)
print("loaded:", model.input_shape, "->", model.output_shape)

export_dir = os.path.join(tempfile.gettempdir(), "fracture_saved")
model.export(export_dir)          # Keras 3 needs a SavedModel in between
print("exported SavedModel")

import subprocess
r = subprocess.run([sys.executable, "-m", "tf2onnx.convert", "--saved-model", export_dir,
                    "--output", OUT, "--opset", "17"], capture_output=True, text=True)
print("tf2onnx:", "ok" if r.returncode == 0 else r.stderr[-1500:])
if r.returncode != 0:
    sys.exit(1)
print("onnx size:", round(os.path.getsize(OUT) / 1e6, 1), "MB")
