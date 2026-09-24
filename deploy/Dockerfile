# The API as it runs on Hugging Face Spaces.
#
# Two things keep this image small enough for a free host: FRACTURE is served
# as ONNX rather than TensorFlow (~50 MB of runtime instead of ~600 MB), and
# PyTorch is left out entirely because CORTEX is switched off here and torch is
# only ever imported inside its loader. Bring either back by adding it to
# requirements-deploy.txt.
FROM python:3.12-slim

# opencv needs libGL and libglib even in headless builds; ffmpeg is for the
# audio ECHO receives from a browser recorder.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# A non-root user, which is what Spaces expects.
RUN useradd -m -u 1000 app
USER app
ENV PATH="/home/app/.local/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    HOME=/home/app

WORKDIR /home/app/api

COPY --chown=app requirements-deploy.txt .
RUN pip install --no-cache-dir --user -r requirements-deploy.txt

# The application, then the weights (which change far less often than the code,
# but are large — keeping them in a later layer would rebuild them on every
# code change, so they go first in their own layer).
COPY --chown=app weights/ /home/app/weights/
COPY --chown=app app/ /home/app/api/app/

# Where the models live inside the image, and who may call this API.
ENV CRACK_MODEL_PATH=/home/app/weights/fracture_resnet50.onnx \
    CORTEX_ENABLED=false \
    PORT=7860

EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
