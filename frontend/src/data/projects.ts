// Static facts about each project. The *working demo* for each lives on the
// backend; this file only drives cards and page headers, so it stays in the
// frontend where it loads instantly.

import { HAS_API } from '../config'

export type Project = {
  slug: string
  codename: string
  title: string
  tagline: string
  stack: string[]
  threat: 'LOW' | 'MED' | 'HIGH' // how heavy the model is; shown on the card
  online: boolean // false while a demo is switched off at the backend
  focus: Focus[] // what kind of work it shows; a tailored link (?focus=) sorts by it
}

/** The areas a tailored link can ask to see first: ?for=acme&focus=nlp */
export const FOCI = ['nlp', 'cv', 'audio', 'health', 'genai'] as const
export type Focus = (typeof FOCI)[number]

/**
 * What a card or page header may honestly say about a demo right now.
 *  - 'live'       the backend is there and this demo is switched on
 *  - 'offline'    the demo exists but is switched off at the moment (CORTEX)
 *  - 'local-only' this build has no backend at all (the GitHub Pages copy)
 */
export type DemoState = 'live' | 'offline' | 'local-only'

export function demoState(project: Project): DemoState {
  if (!HAS_API) return 'local-only'
  return project.online ? 'live' : 'offline'
}

export const PROJECTS: Project[] = [
  {
    slug: 'book-summarizer',
    codename: 'LEXICON',
    title: 'Book Summarizer',
    tagline: 'Upload a PDF, DOCX, EPUB or TXT book and get chapter summaries, key insights and flashcards.',
    stack: ['Gemini', 'PyMuPDF', 'FastAPI', 'Streaming'],
    threat: 'LOW',
    online: true,
    focus: ['nlp', 'genai'],
  },
  {
    slug: 'crack-severity',
    codename: 'FRACTURE',
    title: 'Crack Severity Detection',
    tagline: 'Upload a photo of a concrete crack and get its severity, probable cause and repair advice.',
    // Trained in TensorFlow, served as ONNX (same weights, verified identical labels).
    stack: ['TensorFlow', 'ONNX Runtime', 'ResNet50', 'OpenCV'],
    threat: 'MED',
    online: true,
    focus: ['cv'],
  },
  {
    slug: 'alzheimer-xai',
    codename: 'CORTEX',
    title: 'XAI Alzheimer Detection',
    tagline: 'Upload a brain MRI slice and get the dementia stage plus a Grad-CAM heatmap of what the model looked at.',
    stack: ['PyTorch', 'ResNet18', 'Grad-CAM'],
    threat: 'MED',
    // Switched off for now (CORTEX_ENABLED in the backend settings): its
    // weights live outside the repo and it is the heaviest model to host.
    online: false,
    focus: ['cv', 'health'],
  },
  {
    slug: 'meeting-assistant',
    codename: 'ECHO',
    title: 'AI Meeting Assistant',
    tagline: 'Upload a meeting recording and get speaker-labelled minutes: summary, decisions and action items.',
    stack: ['Gemini', 'FastAPI', 'background jobs'],
    threat: 'HIGH',
    online: true,
    focus: ['audio', 'nlp', 'genai'],
  },
]

export const findProject = (slug: string) => PROJECTS.find((p) => p.slug === slug)
