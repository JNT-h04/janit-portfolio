import { describe, expect, it } from 'vitest'
import snapshot from '../../../data/profile.snapshot.json'
import type { Profile } from '../../../api/profile'
import { bestNote, brief, chipsFor, projectIn, understand, type Context } from './brain'

const profile = snapshot as Profile
const ask = (text: string, ctx: Context = {}) => understand(text, profile, ctx)

// [what the visitor says, where they are, what NOVA should do]
type Case = [string, Context, string]
const home: Context = {}
const onFracture: Context = { page: 'crack-severity' }
const onLexicon: Context = { page: 'book-summarizer' }
const onEcho: Context = { page: 'meeting-assistant' }
const onCortex: Context = { page: 'alzheimer-xai' }

const CASES: Case[] = [
  // opening projects, however it is said or misheard
  ['open the fracture', home, 'project:crack-severity'],
  ['open fracture', home, 'project:crack-severity'],
  ['fracture', home, 'project:crack-severity'],
  ['open fractures', home, 'project:crack-severity'],
  ['open fraction', home, 'project:crack-severity'],
  ['open fracsure', home, 'project:crack-severity'],
  ['take me to the crack detection', home, 'project:crack-severity'],
  ['open lexicon', home, 'project:book-summarizer'],
  ['open lexicun', home, 'project:book-summarizer'],
  ['the book one', home, 'project:book-summarizer'],
  ['open echo', home, 'project:meeting-assistant'],
  ['the meeting recording thing', home, 'project:meeting-assistant'],
  ['open cortex', home, 'project:alzheimer-xai'],
  ['the alzheimer one', home, 'project:alzheimer-xai'],
  // near-misses that must NOT open a project
  ['open each one', home, 'say'],
  ['what is the context', home, 'say'],
  // samples
  ['try a severe crack', onFracture, 'sample:crack-severity:severe'],
  ['try a sample', onFracture, 'sample:crack-severity:any'],
  ['show me a no crack photo', onFracture, 'sample:crack-severity:no-crack'],
  ['analyze a minor one', onFracture, 'sample:crack-severity:minor'],
  ['try the sample book', onLexicon, 'sample:book-summarizer:any'],
  ['run the sample', onLexicon, 'sample:book-summarizer:any'],
  ['try the sample meeting', onEcho, 'sample:meeting-assistant:any'],
  ['try a crack sample', home, 'sample:crack-severity:any'],
  ['test lexicon', home, 'sample:book-summarizer:any'],
  ['try it', onCortex, 'say'],
  // navigation
  ['next project', onFracture, 'project:alzheimer-xai'],
  ['next project', home, 'project:book-summarizer'],
  ['previous project', onFracture, 'project:book-summarizer'],
  ['previous project', onLexicon, 'project:meeting-assistant'],
  ['go back', onFracture, 'back'],
  ['scroll down', home, 'scroll:down'],
  ['scroll up', home, 'scroll:up'],
  ['show me the projects', home, 'goto:missions'],
  ['what skills does he have', home, 'goto:loadout'],
  ['tell me about his internship', home, 'goto:experience'],
  ['where does he study', home, 'goto:operator'],
  ['what is his cgpa', home, 'goto:operator'],
  ['how do I hire him', home, 'goto:contact'],
  ['is he available', home, 'goto:contact'],
  ['who is janit', home, 'goto:operator'],
  ['take me home', onFracture, 'goto:top'],
  // actions
  ['download his resume', home, 'resume'],
  ['can I get the CV', home, 'resume'],
  ['open the terminal', home, 'terminal'],
  ['show me his github', home, 'link:github'],
  ['open linkedin', home, 'link:linkedin'],
  ['copy his email', home, 'copy-email'],
  ['I want to write to him', home, 'write'],
  ['email him', home, 'write'],
  ['is there a recruiter version', home, 'frontdoor'],
  ['take the tour', home, 'tour'],
  ['show me around', home, 'tour'],
  // controls
  ['mute', home, 'voice:off'],
  ['voice on', home, 'voice:on'],
  ['read it out loud', home, 'voice:on'],
  ['stop', home, 'stop'],
  ['bye', home, 'hide'],
  // small talk
  ['hi', home, 'say'],
  ['who are you', home, 'say'],
  ['are you an ai', home, 'say'],
  ['thanks', home, 'say'],
  ['what can you do', home, 'say'],
  ['history of rome', home, 'say'],
  ['', home, 'say'],
]

const describeReply = (r: ReturnType<typeof ask>) => {
  switch (r.kind) {
    case 'project':
      return `project:${r.slug}`
    case 'sample':
      return `sample:${r.slug}:${r.which}`
    case 'goto':
      return `goto:${r.section}`
    case 'scroll':
      return `scroll:${r.dir}`
    case 'link':
      return `link:${r.to}`
    case 'voice':
      return `voice:${r.on ? 'on' : 'off'}`
    default:
      return r.kind
  }
}

describe('NOVA understands what visitors say', () => {
  it.each(CASES)('%j (on %j) -> %s', (text, ctx, expected) => {
    expect(describeReply(ask(text, ctx))).toBe(expected)
  })
})

describe('answers come from the honest notes, never invented', () => {
  it('"how accurate is it" on FRACTURE quotes the real validation number', () => {
    const r = ask('how accurate is it?', onFracture)
    expect(r.kind).toBe('say')
    expect(r.say).toContain('96.9%')
    expect(r.topic).toBe('crack-severity')
  })
  it('"was the 99% fake" on CORTEX tells the leakage story', () => {
    expect(ask('was the 99% fake?', onCortex).say).toMatch(/leak|same patients|split/i)
  })
  it('"why is it offline" on CORTEX explains maintenance', () => {
    expect(ask('why is it offline?', onCortex).say).toMatch(/switched off/i)
  })
  it('"is my recording stored" on ECHO answers the privacy note', () => {
    expect(ask('is my recording stored?', onEcho).say).toMatch(/not stored/i)
  })
  it('"is my book stored" on LEXICON answers the privacy note', () => {
    expect(ask('is my book stored?', onLexicon).say).toMatch(/not stored/i)
  })
  it('a named project wins over the page you are on', () => {
    expect(ask('how accurate is fracture', onEcho).say).toContain('FRACTURE')
  })
  it('"what is it built with" lists the real stack', () => {
    const r = ask('what is it built with?', onEcho)
    expect(r.say).toContain('Gemini')
  })
  it('every quoted sentence exists in the notes', () => {
    const r = ask("what's the catch?", onFracture)
    const body = r.say.split(': ').slice(1).join(': ')
    expect(bestNote('crack-severity', "what's the catch")?.body).toContain(body.slice(0, 40))
  })
})

describe('conversation memory', () => {
  it('"tell me more" moves to a note it has not quoted yet, then runs out politely', () => {
    let ctx: Context = { page: 'crack-severity' }
    const seen = new Set<string>()
    const first = ask('how accurate is it', ctx)
    ctx = { ...ctx, topic: first.topic, quoted: first.quoted }
    seen.add(first.say)
    let last = ''
    for (let i = 0; i < 10 && !/everything the FRACTURE notes say/.test(last); i++) {
      const r = ask('tell me more', ctx)
      expect(seen.has(r.say), r.say).toBe(false) // never repeats itself
      seen.add(r.say)
      last = r.say
      ctx = { ...ctx, topic: r.topic, quoted: r.quoted }
    }
    expect(last).toMatch(/everything the FRACTURE notes say/)
    expect(seen.size).toBe(1 + 4) // four notes quoted, then the polite end
  })
  it('"tell me more" with no topic does not pretend', () => {
    expect(ask('tell me more').kind).toBe('say')
  })
})

describe('helpers', () => {
  it('chips are offered for every page', () => {
    for (const page of [undefined, 'crack-severity', 'book-summarizer', 'meeting-assistant', 'alzheimer-xai']) {
      expect(chipsFor(page).length).toBeGreaterThanOrEqual(3)
    }
  })
  it('every chip on every page is understood as something useful', () => {
    for (const page of [undefined, 'crack-severity', 'book-summarizer', 'meeting-assistant', 'alzheimer-xai']) {
      for (const chip of chipsFor(page)) {
        const r = ask(chip, { page })
        expect(r.say, `${chip} on ${page}`).not.toMatch(/doesn't cover/)
      }
    }
  })
  it('brief keeps two sentences, even with decimals', () => {
    expect(brief('Accuracy is 96.9% here. Second one. Third one.')).toBe('Accuracy is 96.9% here. Second one.')
  })
  it('projectIn ignores sentences with no project', () => {
    expect(projectIn('where does he study')).toBeUndefined()
  })
})
