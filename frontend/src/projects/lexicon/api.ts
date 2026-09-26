import { api } from '../../config'
// Talking to the LEXICON backend (backend/app/routers/lexicon.py).

export type ChapterInfo = { index: number; title: string; words: number; preview: string }
export type BookInfo = { id: string; title: string; chapters: ChapterInfo[] }

const errorFrom = async (res: Response) => {
  try {
    const body = await res.json()
    return String(body.detail ?? `error ${res.status}`)
  } catch {
    return `error ${res.status}`
  }
}

/**
 * Upload with XMLHttpRequest instead of fetch, because fetch can't report
 * upload progress, and a 30 MB book deserves a progress bar.
 */
export function uploadBook(file: File, onProgress: (fraction: number) => void): Promise<BookInfo> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file) // the name must match the `file` parameter in FastAPI
    const xhr = new XMLHttpRequest()
    xhr.open('POST', api('/api/lexicon/books'))
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => {
      let body: { detail?: string } & Partial<BookInfo> = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status === 200) resolve(body as BookInfo)
      else reject(new Error(body.detail ?? `upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('backend uplink offline'))
    xhr.send(form)
  })
}

export const ERROR_MARK = '[[error]]'
/** Ends a successful answer; JSON measurements follow it. */
export const META_MARK = '[[meta]]'
export type SummaryMeta = { model: string; server_ms: number; input_chars: number }
export type SummaryTiming = { firstTextMs: number; totalMs: number; meta: SummaryMeta | null }

/** The server switched models mid-answer; everything before it is void. */
export const RESTART_MARK = '[[restart]]'
const afterRestart = (text: string) => {
  const at = text.lastIndexOf(RESTART_MARK)
  return at === -1 ? text : text.slice(at + RESTART_MARK.length)
}

/**
 * Ask for a chapter summary and hand each piece of text to `onText` as it
 * arrives. The server streams plain text, so we read the body chunk by chunk
 * instead of waiting for the whole answer.
 */
export async function streamSummary(
  bookId: string,
  index: number,
  onText: (soFar: string) => void,
): Promise<{ text: string; timing: SummaryTiming }> {
  const t0 = performance.now()
  let firstTextMs = 0
  const res = await fetch(api(`/api/lexicon/books/${bookId}/chapters/${index}/summary`), { method: 'POST' })
  if (!res.ok || !res.body) throw new Error(await errorFrom(res))

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  // The trailer arrives last; never show it, even half-received.
  const visible = (t: string) => afterRestart(t).split(META_MARK)[0]
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    if (!firstTextMs && visible(text).trim()) firstTextMs = performance.now() - t0
    onText(visible(text))
  }
  const totalMs = performance.now() - t0
  text = afterRestart(text)
  if (text.includes(ERROR_MARK)) throw new Error(text.split(ERROR_MARK)[1].trim())
  const [body, trailer] = text.split(META_MARK)
  let meta: SummaryMeta | null = null
  try {
    meta = trailer ? JSON.parse(trailer) : null
  } catch {
    /* an older server, without the trailer */
  }
  return { text: body.trimEnd(), timing: { firstTextMs, totalMs, meta } }
}

export type Parsed = { summary: string[]; insights: string[]; cards: { q: string; a: string }[] }

/** Split the model's markdown into its three sections. Works on half-finished text too. */
export function parseSummary(md: string): Parsed {
  const section = (name: string) => {
    const m = md.match(new RegExp(`##\\s*${name}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i'))
    return m ? m[1].trim() : ''
  }
  const summary = section('Summary')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const insights = section('Key insights')
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
  const cards: Parsed['cards'] = []
  for (const line of section('Flashcards').split('\n')) {
    const q = line.match(/^\s*\**Q\**\s*[:.]\s*(.*)/i)
    const a = line.match(/^\s*\**A\**\s*[:.]\s*(.*)/i)
    if (q) cards.push({ q: q[1].trim(), a: '' })
    else if (a && cards.length) cards[cards.length - 1].a = a[1].trim()
  }
  return { summary, insights, cards }
}
