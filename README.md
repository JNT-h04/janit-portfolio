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

React, TypeScript, Vite, Tailwind and Framer Motion on the front; FastAPI and Python on the back, with
PyTorch, TensorFlow and OpenCV behind the vision demos and the Gemini API behind the text and audio ones.

## Deploying

Two pieces, deployed separately.

**The API** runs as a Docker Space on Hugging Face — the free CPU tier has enough memory for TensorFlow,
which 512 MB tiers do not. `deploy/` holds its Dockerfile, its own requirements (no PyTorch: CORTEX is off
there and torch is only imported inside its loader) and a script that assembles the Space, weights included:

```bash
HF_TOKEN=hf_xxx node deploy/publish-space.mjs <user>/<space>
```

Set `GEMINI_API_KEY` as a Space secret for LEXICON and ECHO. Free Spaces sleep when idle, so the first
request after a quiet spell waits while it wakes; the demos show a warming-up state for exactly this reason.

**The site:**

```bash
cd frontend && VITE_API_BASE=https://<space-host> npm run build:static
```

That builds with `VITE_BASE=/janit-portfolio/`, points every call at the API, and copies `index.html` to
`404.html` so deep links survive GitHub Pages having no rewrite rule. The contents of `frontend/dist` are
what the `gh-pages` branch holds.
