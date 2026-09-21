import { useEffect, useState } from 'react'
import { getStatus, streamSummary, uploadBook, type BookInfo } from './api'

export const ACCEPT = '.pdf,.docx,.epub,.txt,.md,.html,.htm'

export type Stage = { kind: 'idle' } | { kind: 'uploading'; progress: number } | { kind: 'error'; message: string }
export type Result = { text: string; done: boolean; error?: string }

/** Everything LEXICON does, with nothing about how it looks. Shared by both skins. */
export function useLexicon() {
  const [ready, setReady] = useState<boolean | null>(null)
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })
  const [book, setBook] = useState<BookInfo | null>(null)
  const [selected, setSelected] = useState(0)
  // Summaries are kept per chapter, so going back to a chapter costs nothing.
  const [results, setResults] = useState<Record<number, Result>>({})

  useEffect(() => {
    getStatus().then(setReady)
  }, [])

  const handleFile = async (file: File) => {
    setStage({ kind: 'uploading', progress: 0 })
    try {
      const info = await uploadBook(file, (progress) => setStage({ kind: 'uploading', progress }))
      setBook(info)
      setSelected(0)
      setResults({})
      setStage({ kind: 'idle' })
    } catch (err) {
      setStage({ kind: 'error', message: (err as Error).message })
    }
  }

  const generate = async (index: number) => {
    if (!book) return
    setResults((r) => ({ ...r, [index]: { text: '', done: false } }))
    try {
      const text = await streamSummary(book.id, index, (soFar) =>
        setResults((r) => ({ ...r, [index]: { text: soFar, done: false } })),
      )
      setResults((r) => ({ ...r, [index]: { text, done: true } }))
    } catch (err) {
      setResults((r) => ({ ...r, [index]: { text: r[index]?.text ?? '', done: true, error: (err as Error).message } }))
    }
  }

  const exportAll = () => {
    if (!book) return
    const parts = book.chapters
      .filter((c) => results[c.index]?.done && !results[c.index].error)
      .map((c) => `# ${c.title}\n\n${results[c.index].text.trim()}\n`)
    const blob = new Blob([`# ${book.title}\n\n${parts.join('\n')}`], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${book.title.replace(/[^\w-]+/g, '_')}_summary.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  /** "New book": forget the current one and show the drop zone again. */
  const reset = () => {
    setBook(null)
    setResults({})
    setSelected(0)
    setStage({ kind: 'idle' })
  }

  const doneCount = book ? book.chapters.filter((c) => results[c.index]?.done && !results[c.index].error).length : 0

  return { ready, stage, book, selected, setSelected, results, handleFile, generate, exportAll, reset, doneCount }
}
