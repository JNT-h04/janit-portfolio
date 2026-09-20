// Static facts about each project. The *working demo* for each lives on the
// backend; this file only drives cards and page headers, so it stays in the
// frontend where it loads instantly.

export type Project = {
  slug: string
  codename: string
  title: string
  tagline: string
  stack: string[]
  threat: 'LOW' | 'MED' | 'HIGH' // how heavy the model is; shown on the card
  online: boolean // becomes true once the demo is wired to the backend
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
  },
  {
    slug: 'crack-severity',
    codename: 'FRACTURE',
    title: 'Crack Severity Detection',
    tagline: 'Upload a photo of a concrete crack and get its severity, probable cause and repair advice.',
    stack: ['TensorFlow', 'ResNet50', 'OpenCV'],
    threat: 'MED',
    online: true,
  },
  {
    slug: 'alzheimer-xai',
    codename: 'CORTEX',
    title: 'XAI Alzheimer Detection',
    tagline: 'Upload a brain MRI slice and get the dementia stage plus a Grad-CAM heatmap of what the model looked at.',
    stack: ['PyTorch', 'ResNet18', 'Grad-CAM'],
    threat: 'MED',
    online: true,
  },
  {
    slug: 'meeting-assistant',
    codename: 'ECHO',
    title: 'AI Meeting Assistant',
    tagline: 'Upload a meeting recording and get speaker-labelled minutes: summary, decisions and action items.',
    stack: ['Gemini', 'FastAPI', 'background jobs'],
    threat: 'HIGH',
    online: true,
  },
]

export const findProject = (slug: string) => PROJECTS.find((p) => p.slug === slug)
