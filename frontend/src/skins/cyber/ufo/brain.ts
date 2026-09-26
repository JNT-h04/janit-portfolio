import type { Profile } from '../../../api/profile'
import { PROJECTS, type Project } from '../../../data/projects'
import { CORTEX_NOTES, ECHO_NOTES, FRACTURE_NOTES, LEXICON_NOTES, type Note } from '../../../projects/notes'

/**
 * NOVA's brain: turns what a visitor types or says into one thing to do.
 *
 * Deliberately not a language model. Every answer is a place on this site, an
 * action on it, or text lifted from the profile and the honest project notes,
 * so NOVA can never make up a fact about Janit. A generative brain could sit
 * behind the same `Reply` type later without touching the UI.
 */

export type Section = 'top' | 'missions' | 'operator' | 'loadout' | 'experience' | 'contact'
export type Severity = 'minor' | 'moderate' | 'severe' | 'no-crack' | 'any'

export type Action =
  | { kind: 'goto'; section: Section; say: string }
  | { kind: 'project'; slug: string; say: string }
  | { kind: 'sample'; slug: string; which: Severity; say: string }
  | { kind: 'resume'; say: string }
  | { kind: 'terminal'; say: string }
  | { kind: 'frontdoor'; say: string }
  | { kind: 'tour'; say: string }
  | { kind: 'hide'; say: string }
  | { kind: 'back'; say: string }
  | { kind: 'scroll'; dir: 'up' | 'down'; say: string }
  | { kind: 'link'; to: 'github' | 'linkedin'; say: string }
  | { kind: 'copy-email'; say: string }
  | { kind: 'write'; say: string }
  | { kind: 'voice'; on: boolean; say: string }
  | { kind: 'stop'; say: string }
  | { kind: 'say'; say: string }

/** What NOVA knows about the moment: the page it is on, and what it said last. */
export type Context = {
  /** slug of the project page the visitor is on, if any */
  page?: string
  /** project the conversation was last about ("tell me more", "it") */
  topic?: string
  /** notes of `topic` already quoted, so "tell me more" moves on */
  quoted?: string[]
}

/** An action plus what NOVA should remember and offer next. */
export type Reply = Action & { chips: string[]; topic?: string; quoted?: string[] }
type Draft = Action & { topic?: string; quoted?: string[] }

const NOTES: Record<string, Note[]> = {
  'crack-severity': FRACTURE_NOTES,
  'alzheimer-xai': CORTEX_NOTES,
  'book-summarizer': LEXICON_NOTES,
  'meeting-assistant': ECHO_NOTES,
}

// ------------------------------------------------------------------ matching
// Whole words by default, so "hi" doesn't fire on "hire". A trailing ~ marks a
// stem that may continue: 'skill~' matches skill, skills, skilled.
const has = (...words: string[]) =>
  new RegExp(`\\b(${words.map((w) => (w.endsWith('~') ? w.slice(0, -1) : `${w}\\b`)).join('|')})`, 'i')

const PROJECT_WORDS: Record<string, RegExp> = {
  'book-summarizer': has('lexicon~', 'lexi con', 'book~', 'summari~', 'pdf', 'epub'),
  'crack-severity': has('fractur~', 'fraction~', 'crack~', 'concrete', 'civil'),
  'alzheimer-xai': has('cortex~', 'alzheimer~', 'mri', 'brain~', 'dementia', 'grad-cam'),
  'meeting-assistant': has('echo~', 'eco', 'ekko', 'meeting~', 'minutes', 'audio', 'record~', 'transcri~'),
}

/** Edit distance, for the codenames a microphone mangles: "fracsure", "lexicun". */
function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = keep
    }
  }
  return row[b.length]
}

/** Which project a sentence names, exactly or nearly. Short codenames need a
 * closer match, or "each" would mean ECHO and "context" CORTEX. */
export function projectIn(text: string): string | undefined {
  for (const [slug, re] of Object.entries(PROJECT_WORDS)) if (re.test(text)) return slug
  const words = text.toLowerCase().match(/[a-z]+/g) ?? []
  for (const p of PROJECTS) {
    const name = p.codename.toLowerCase()
    const slack = name.length >= 7 ? 2 : name.length >= 6 ? 1 : 0
    if (slack && words.some((w) => Math.abs(w.length - name.length) <= slack && distance(w, name) <= slack)) return p.slug
  }
  return undefined
}

const project = (slug: string) => PROJECTS.find((p) => p.slug === slug) as Project

// ------------------------------------------------------------------ project Q&A
// Words that carry no meaning for retrieval.
const STOP = new Set(
  'a an the is are was were be it its this that of to in on for and or but with how what whats why does do did can could would about me tell more you your his he him my i any there which who when where much many so'.split(' '),
)
// A kind of question points at the notes that usually answer it.
const HINTS: [RegExp, string[]][] = [
  [has('accura~', 'score~', 'good', 'well', 'perform~', 'result~', 'percent', 'precise'), ['model', 'this model', 'the leakage story']],
  [has('catch', 'limit~', 'weak~', 'wrong', 'fail~', 'bad', 'problem~', 'trust', 'caveat~', 'fake', 'leak~', 'honest~', 'downside~'), ['limits', 'the leakage story', 'severity labels', 'not structural advice', 'speaker labels are inferred', 'one slice is a hard question']],
  [has('stor~', 'privacy', 'private', 'keep', 'kept', 'save~', 'delete~', 'safe'), ['your upload is not stored', 'your recording is not stored']],
  [has('data~', 'train~', 'images', 'patients'), ['model', 'dataset']],
  [has('how', 'work~', 'pipeline', 'process~', 'architecture'), ['how it works', 'how it reads a book', 'how it summarises', 'why a background job', 'grad-cam', 'model']],
  [has('diagnos~', 'medical', 'doctor', 'advice', 'engineer~', 'safety'), ['not a diagnosis', 'not structural advice']],
  [has('speaker~', 'who said', 'names'), ['speaker labels are inferred']],
]

const tokens = (s: string) => (s.toLowerCase().match(/[a-z0-9%]+/g) ?? []).filter((w) => !STOP.has(w))

/** The note that best answers `text` about `slug`, skipping ones already quoted. */
export function bestNote(slug: string, text: string, quoted: string[] = []): Note | undefined {
  const notes = (NOTES[slug] ?? []).filter((n) => !quoted.includes(n.label))
  if (!notes.length) return undefined
  const q = new Set(tokens(text))
  const hinted = HINTS.filter(([re]) => re.test(text)).flatMap(([, labels]) => labels)
  let best: Note | undefined
  let bestScore = -Infinity
  notes.forEach((n, i) => {
    let score = tokens(`${n.label} ${n.body}`).filter((w) => q.has(w)).length
    if (hinted.includes(n.label.toLowerCase())) score += 4
    score -= i * 0.01 // ties go to the earlier, more central note
    if (score > bestScore) {
      best = n
      bestScore = score
    }
  })
  return best
}

/** Two sentences are plenty for a speech bubble. */
// Split only where a full stop is followed by a space, so "96.9%" stays whole.
export const brief = (s: string, n = 2) => s.split(/(?<=[.!?])\s+/).slice(0, n).join(' ').trim()

// "how accurate is it", "is my book stored?": a question about a project
const QUESTION = has('how', 'what~', 'why', 'is', 'are', 'was', 'were', 'does', 'did', 'can', 'accura~', 'catch', 'limit~', 'weak~', 'stor~', 'privacy', 'data~', 'train~', 'good', 'trust', 'explain', 'tell', 'safe')

// ------------------------------------------------------------------ chips
/** Quick replies to offer on each page: things NOVA can definitely do there. */
export function chipsFor(page?: string): string[] {
  if (page === 'crack-severity') return ['Try a severe crack', 'How accurate is it?', "What's the catch?", 'Next project']
  if (page === 'book-summarizer') return ['Try the sample book', 'How does it work?', 'Is my book stored?', 'Next project']
  if (page === 'meeting-assistant') return ['Try the sample meeting', 'Is my recording stored?', "What's the catch?", 'Next project']
  if (page === 'alzheimer-xai') return ['Why is it offline?', 'Was the 99% fake?', 'Next project', 'Go back']
  return ['Take the tour', 'Show me the projects', 'Download the résumé', 'How do I contact him?']
}

// ------------------------------------------------------------------ rules
type Rule = { words: RegExp; act: (text: string, p: Profile | null, ctx: Context) => Draft | undefined }

const severity = (text: string): Severity =>
  /no[- ]?crack|clean|intact|healthy|undamaged/i.test(text)
    ? 'no-crack'
    : /severe|bad|big|worst|major|deep|serious/i.test(text)
      ? 'severe'
      : /moderate|medium/i.test(text)
        ? 'moderate'
        : /minor|small|hairline|tiny|light/i.test(text)
          ? 'minor'
          : 'any'

const RULES: Rule[] = [
  // controls first: they must always work, whatever else the sentence says
  { words: has('stop', 'quiet', 'shush', 'silence', 'shut up'), act: () => ({ kind: 'stop', say: 'Going quiet.' }) },
  { words: has('mute', 'voice off', 'turn off (the )?voice', 'no voice', 'no sound'), act: () => ({ kind: 'voice', on: false, say: 'Voice off. I will stick to text.' }) },
  { words: has('unmute', 'voice on', 'turn on (the )?voice', 'speak', 'talk out loud', 'read (it )?(out|aloud)', 'out loud'), act: () => ({ kind: 'voice', on: true, say: 'Voice on. I will read my answers out loud.' }) },
  { words: has('bye', 'goodbye', 'hide', 'go away', 'dismiss', 'close', 'cloak', 'leave'), act: () => ({ kind: 'hide', say: 'Cloaking. Click the NOVA beacon, or press N, when you need me.' }) },
  { words: has('thanks', 'thank you', 'thx', 'cool', 'nice', 'awesome', 'great'), act: () => ({ kind: 'say', say: 'Anytime, human.' }) },
  { words: has('tour', 'show me around', 'guide me', 'walk me through'), act: () => ({ kind: 'tour', say: 'Buckle up. Thirty-second tour, starting now.' }) },
  { words: has('help', 'what can you', 'commands', 'options', 'what do you do', 'how do i use you'), act: () => ({ kind: 'say', say: 'I can fly you around ("next project", "go back"), run any demo on its sample ("try a severe crack"), answer questions from each project\'s honest notes ("how accurate is it?"), fetch the résumé, open the terminal, or take you to contact.' }) },
  { words: has('who are you', 'your name', 'what are you', 'nova', 'are you (an? )?(ai|bot|robot|real)'), act: () => ({ kind: 'say', say: "I'm NOVA, the tour drone. I only repeat what is on this site, so I never make things up about Janit." }) },

  // running a demo on its built-in sample
  {
    words: has('try', 'run', 'test', 'analy~', 'demo it', 'show me (a|an|one)', 'sample~', 'example~', 'feed'),
    act: (text, _p, ctx) => {
      const slug = projectIn(text) ?? ctx.page
      if (!slug) {
        if (!/sample|example|demo|crack/i.test(text)) return undefined
        return { kind: 'sample', slug: 'crack-severity', which: severity(text), say: 'Taking you to FRACTURE and feeding it a sample. Stand by.', topic: 'crack-severity' }
      }
      if (slug === 'alzheimer-xai') return { kind: 'say', say: 'CORTEX is in maintenance, so there is nothing to run right now. Its write-up is still on the page.', topic: slug }
      const which = severity(text)
      const say = {
        'crack-severity': `Feeding FRACTURE a ${which === 'any' ? 'sample' : which.replace('-', ' ')} photo. Stand by.`,
        'book-summarizer': 'Loading The Art of War and summarising chapter one. The words stream in live.',
        'meeting-assistant': 'Running the sample team meeting through ECHO. Minutes in about half a minute; I will read out the result.',
      }[slug] as string
      return { kind: 'sample', slug, which, say, topic: slug }
    },
  },

  // moving around
  {
    words: has('next project', 'next mission', 'next one', 'next', 'another project', 'previous project', 'previous mission', 'previous one', 'previous', 'last project'),
    act: (text, _p, ctx) => {
      const i = PROJECTS.findIndex((p) => p.slug === ctx.page)
      const step = /previous|last/i.test(text) ? -1 : 1
      const next = i === -1 ? PROJECTS[step === 1 ? 0 : PROJECTS.length - 1] : PROJECTS[(i + step + PROJECTS.length) % PROJECTS.length]
      return openProject(next.slug)
    },
  },
  { words: has('go back', 'back', 'previous page', 'return'), act: () => ({ kind: 'back', say: 'Reversing thrusters.' }) },
  { words: has('scroll down', 'down', 'keep going', 'lower', 'further'), act: () => ({ kind: 'scroll', dir: 'down', say: 'Descending.' }) },
  { words: has('scroll up', 'up', 'higher'), act: () => ({ kind: 'scroll', dir: 'up', say: 'Climbing.' }) },

  // questions about a project, answered from its honest notes
  {
    words: has('stack', 'built with', 'tech~', 'framework~', 'language~', 'tools', 'made with'),
    act: (text, _p, ctx) => {
      const slug = projectIn(text) ?? (/\b(this|it|project|demo|model)\b/i.test(text) ? ctx.page ?? ctx.topic : undefined)
      if (!slug) return undefined
      const p = project(slug)
      return { kind: 'say', say: `${p.codename} is built with ${p.stack.join(', ')}.`, topic: slug }
    },
  },
  {
    words: has('more', 'else', 'go on', 'continue', 'and then', 'elaborate'),
    act: (_t, _p, ctx) => {
      if (!ctx.topic) return undefined
      const quoted = ctx.quoted ?? []
      const n = bestNote(ctx.topic, '', quoted)
      if (!n) return { kind: 'say', say: `That is everything the ${project(ctx.topic).codename} notes say. Ask about another mission?`, topic: ctx.topic, quoted }
      return { kind: 'say', say: `${n.label}: ${brief(n.body)}`, topic: ctx.topic, quoted: [...quoted, n.label] }
    },
  },
  {
    words: QUESTION,
    act: (text, _p, ctx) => {
      const named = projectIn(text)
      // "how accurate is it" on a project page means that project
      const slug = named ?? (/\b(it|this|model|project|demo|book|recording|upload)\b|accura|catch|limit|stor|how|fake/i.test(text) ? ctx.page ?? ctx.topic : undefined)
      if (!slug) return undefined
      if (slug === 'alzheimer-xai' && /offline|maintenance|down|disabled|why.*(off|not)/i.test(text))
        return { kind: 'say', say: 'CORTEX is switched off while its model is rehosted. Its page still tells the full story, including the 99% it refused to ship.', topic: slug }
      const n = bestNote(slug, text)
      if (!n) return undefined
      return { kind: 'say', say: `${project(slug).codename} · ${n.label}: ${brief(n.body)}`, topic: slug, quoted: [n.label] }
    },
  },

  // naming a project opens it
  ...PROJECTS.map<Rule>((p) => ({ words: PROJECT_WORDS[p.slug], act: () => openProject(p.slug) })),

  // the rest of the site
  { words: has('r[eé]sum~', 'cv', 'dossier'), act: () => ({ kind: 'resume', say: 'Beaming the one-page résumé down to you now.' }) },
  { words: has('terminal', 'console', 'shell', 'hack~', 'command line'), act: () => ({ kind: 'terminal', say: 'Terminal open. Type help. It is a sandbox, so you cannot break anything.' }) },
  { words: has('github', 'git hub', 'code', 'repo~', 'source'), act: () => ({ kind: 'link', to: 'github', say: 'Opening his GitHub in a new tab.' }) },
  { words: has('linkedin', 'linked in'), act: () => ({ kind: 'link', to: 'linkedin', say: 'Opening his LinkedIn in a new tab.' }) },
  { words: has('copy', 'clipboard'), act: () => ({ kind: 'copy-email', say: 'Email address copied to your clipboard.' }) },
  { words: has('write', 'send (him )?(a )?message', 'email him', 'mail him', 'message him', 'get in touch'), act: () => ({ kind: 'write', say: 'The form is ready and the cursor is in it. Type away.' }) },
  { words: has('recruiter', 'professional', 'formal', 'clean version', 'other version', 'front door', 'start page'), act: () => ({ kind: 'frontdoor', say: 'The start page has both versions: this one, and a clean recruiter layout. Same projects, same numbers. It is at the top, or in the menu on a phone.' }) },
  { words: has('project~', 'mission~', 'work', 'demo~', 'built', 'portfolio'), act: () => ({ kind: 'goto', section: 'missions', say: 'Four missions. Three are live, and each has a sample you can run with one click.' }) },
  { words: has('skill~', 'stack', 'tech~', 'language~', 'loadout', 'tool~', 'know'), act: (_t, p) => ({ kind: 'goto', section: 'loadout', say: skillsLine(p) }) },
  { words: has('experience~', 'intern~', 'job~', 'worked', 'compan~'), act: (_t, p) => ({ kind: 'goto', section: 'experience', say: experienceLine(p) }) },
  { words: has('stud~', 'college', 'university', 'education', 'cgpa', 'gpa', 'degree', 'vit', 'grade~'), act: (_t, p) => ({ kind: 'goto', section: 'operator', say: educationLine(p) }) },
  { words: has('contact~', 'hire', 'hiring', 'email~', 'mail', 'reach', 'message', 'talk to him', 'available', 'open to'), act: () => ({ kind: 'goto', section: 'contact', say: 'Contact is right here. The form lands straight in his inbox, and he replies within a day.' }) },
  { words: has('who', 'about', 'janit', 'operator', 'him'), act: (_t, p) => ({ kind: 'goto', section: 'operator', say: aboutLine(p) }) },
  { words: has('home', 'top', 'beginning', 'start page'), act: () => ({ kind: 'goto', section: 'top', say: 'Back to the launch pad.' }) },
  { words: has('hi', 'hello', 'hey', 'yo', 'sup', 'greetings'), act: () => ({ kind: 'say', say: 'Greetings, human. Ask me where anything is, or say "tour".' }) },
]

function openProject(slug: string): Draft {
  const p = project(slug)
  return {
    kind: 'project',
    slug,
    say: p.online ? `Opening ${p.codename}…` : `Opening ${p.codename}. It is in maintenance, but the write-up is all there.`,
    topic: slug,
  }
}

function skillsLine(p: Profile | null) {
  if (!p) return 'The loadout lists everything he works with.'
  const pick = (group: string, n: number) => p.skills.find((g) => g.group === group)?.items.slice(0, n).join(', ')
  return `Main weapons: ${pick('Languages', 2)}; for ML, ${pick('ML & AI', 3)}; and ${pick('Backend & Web', 2)} to ship it.`
}

function experienceLine(p: Profile | null) {
  const e = p?.experience[0]
  return e ? `${e.title} at ${e.company}, ${e.period}. The headline: ${e.points[0]}` : 'Experience is listed here.'
}

function educationLine(p: Profile | null) {
  const e = p?.education[0]
  return e ? `${e.degree} at ${e.school}, ${e.period}. ${e.detail.split('·')[0].trim()}.` : 'Education is in the operator file.'
}

function aboutLine(p: Profile | null) {
  return p ? `${p.name}, ${p.role}. ${p.tagline}` : 'Janit builds ML systems end to end, and ships them.'
}

/** What to do with a sentence, given where the visitor is. Always answers. */
export function understand(input: string, profile: Profile | null, ctx: Context = {}): Reply {
  const text = input.trim()
  const finish = (d: Draft): Reply => ({
    ...d,
    chips: chipsFor(d.kind === 'project' || d.kind === 'sample' ? d.slug : ctx.page),
    topic: d.topic ?? ctx.topic,
    quoted: d.quoted ?? (d.topic && d.topic !== ctx.topic ? [] : ctx.quoted),
  })
  if (!text) return finish({ kind: 'say', say: 'I heard static. Try again?' })
  for (const rule of RULES) {
    if (!rule.words.test(text)) continue
    const reply = rule.act(text, profile, ctx)
    if (reply) return finish(reply)
  }
  const near = projectIn(text)
  if (near) return finish(openProject(near))
  return finish({ kind: 'say', say: "My map doesn't cover that one. Try one of these, or ask about a project by name." })
}
