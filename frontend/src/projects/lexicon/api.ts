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

export async function getStatus(): Promise<boolean> {
  try {
    const res = await fetch(api('/api/lexicon/status'))
    return res.ok && (await res.json()).ready
  } catch {
    return false
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

/**
 * Ask for a chapter summary and hand each piece of text to `onText` as it
 * arrives. The server streams plain text, so we read the body chunk by chunk
 * instead of waiting for the whole answer.
 */
export async function streamSummary(bookId: string, index: number, onText: (soFar: string) => void): Promise<string> {
  const res = await fetch(api(`/api/lexicon/books/${bookId}/chapters/${index}/summary`), { method: 'POST' })
  if (!res.ok || !res.body) throw new Error(await errorFrom(res))

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    onText(text)
  }
  if (text.includes(ERROR_MARK)) throw new Error(text.split(ERROR_MARK)[1].trim())
  return text
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
