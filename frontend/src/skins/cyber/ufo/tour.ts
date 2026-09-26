/** The guided tour of the home page: where NOVA flies, and what it says there. */
export type Step = { target: string; say: string }

export const TOUR: Step[] = [
  {
    target: '.cyber-title',
    say: "Greetings, human. I'm NOVA. This base belongs to Janit, an AI/ML engineer who ships models people can actually use.",
  },
  {
    target: '#missions h2',
    say: 'Four missions. Each one is a real system: upload your own file and the model answers live, right here.',
  },
  {
    target: '#missions a[href*="/projects/crack-severity"]',
    say: 'Start with FRACTURE. Pick a sample crack photo and you get a verdict in seconds, with the real timings shown underneath.',
  },
  {
    target: '#operator h2',
    say: 'The operator file: who he is, where he studies, and an ID card drawn entirely in ones and zeros.',
  },
  {
    target: '#loadout h2',
    say: 'His loadout: the languages, ML frameworks and tools he uses to go from dataset to deployed demo.',
  },
  {
    target: '#contact h2',
    say: 'When you are convinced, this form lands straight in his inbox. He replies within a day.',
  },
  {
    target: 'nav button[title^="toggle terminal"]',
    say: 'Secret level: press the backtick key to open a sandboxed terminal. Type help. You cannot break anything.',
  },
]

export const TOUR_END = 'Tour complete. Click me any time, press the mic and just ask, or type a question.'

/** What NOVA says when a visitor lands on a mission page. */
export const PROJECT_INTROS: Record<string, string> = {
  'book-summarizer':
    'LEXICON. Drop in a PDF, DOCX or EPUB book, pick a chapter, and watch the summary stream in word by word.',
  'crack-severity':
    'FRACTURE. Click any sample photo below. The telemetry panel will show exactly how long the model took.',
  'alzheimer-xai':
    'CORTEX is in maintenance. Read why its 99% score was fake, and what an honest patient split gives instead.',
  'meeting-assistant':
    'ECHO. Upload a short meeting recording and you get speaker-labelled minutes. It takes about a minute, so stay a while.',
}
