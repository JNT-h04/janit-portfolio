# JANIT://SYS — portfolio

A portfolio where each project is a working system with an interactive demo, not a screenshot. The site has
two skins over one engine: a conventional professional layout and a cyberpunk terminal. Both render the same
projects, the same demos and the same caveats — a demo's behaviour lives in a shared hook, so the two sides
cannot drift apart or describe a result differently.

**Live site:** https://jnt-h04.github.io/janit-portfolio/ — the frontend is served from GitHub Pages and
talks to the API running as a Docker Space on Hugging Face. When no API is configured for a build, the site
says where its demos run instead of offering an upload box that cannot answer.

## What is in here

| Codename | Project | What it does |
| --- | --- | --- |
| LEXICON | Book summarizer | Splits a PDF/DOCX/EPUB/TXT book into chapters and summarises each one, streaming the answer as it is written. |
| FRACTURE | Crack severity | Classifies a concrete crack photo by severity and explains the likely cause. |
| CORTEX | Alzheimer MRI | Predicts dementia stage from an MRI slice and shows a Grad-CAM heatmap of what the network looked at. Currently switched off — see below. |
| ECHO | Meeting assistant | Turns a recording into minutes: speakers, decisions and owners. |

Each project page carries a "what is honest about this" section written from measured runs, including the
parts that do not flatter the model — for example CORTEX scores 60.2% on held-out slices and 81.5% when every
slice of a patient votes, against a 99% figure that turned out to come from a leaky split.

## Running it

Two processes: the API and the site.

```bash
# API — http://127.0.0.1:8000
cd backend
python -m venv .venv && .venv/Scripts/activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# site — http://localhost:5173, proxies /api to the API above
cd frontend
npm install
npm run dev
```

Useful settings (`backend/.env`, all optional):

| Variable | Effect |
| --- | --- |
| `GEMINI_API_KEY` | Enables LEXICON and ECHO. Without it they report themselves offline. |
| `CORTEX_ENABLED` | `true` brings the Alzheimer demo back; it ships switched off. |
| `LOAD_MODELS` | `false` skips loading the ML models — much faster restarts, and what the tests use. |
| `CRACK_MODEL_PATH`, `CORTEX_MODEL_PATH` | Where the model weights live. |

**Model weights are not in this repository.** They are 100–300 MB each, so FRACTURE and CORTEX need their
checkpoints pointed at by the settings above. The demos that do not need weights (LEXICON, ECHO) only need an
API key.

## Tests

```bash
cd backend && .venv/Scripts/python -m pytest      # 48 tests
```

They run with `LOAD_MODELS=false`, so they exercise the API, the parsing and the honest-failure paths without
loading a single network.

## Built with

React, TypeScript, Vite, Tailwind and Framer Motion on the front; FastAPI and Python on the back. The vision
models were trained with TensorFlow/Keras and PyTorch; FRACTURE is *served* as ONNX, which is the same
network at a fraction of the runtime cost (`scripts/export_fracture_onnx.py` does the export and checks the
two agree). The text and audio demos call the Gemini API.

## Deploying

Two pieces, deployed separately.

**The API** runs on Render's free instance. It fits there because nothing in it is heavy any more:
FRACTURE is served as ONNX instead of TensorFlow and CORTEX is switched off, so the whole service is a few
hundred megabytes rather than a gigabyte and a half. `render.yaml` is a Blueprint — point Render at this
repository and it reads every setting from there, except `GEMINI_API_KEY`, which you set in the dashboard to
switch LEXICON and ECHO on.

The model weights are not in this repository. They are published as a [release
asset](https://github.com/JNT-h04/janit-portfolio/releases/tag/weights-v1) and downloaded once at boot by
`app/core/weights.py`, in the background thread that loads the model — so the API answers straight away and
reports itself as warming up until the network is ready.

`deploy/` still holds a Dockerfile for hosts that want a container instead.

**The site:**

```bash
cd frontend && VITE_API_BASE=https://<space-host> npm run build:static
```

That builds with `VITE_BASE=/janit-portfolio/`, points every call at the API, and copies `index.html` to
`404.html` so deep links survive GitHub Pages having no rewrite rule. The contents of `frontend/dist` are
what the `gh-pages` branch holds.
