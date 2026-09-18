import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import HudPanel from '../../components/HudPanel'
import UploadZone from '../../components/UploadZone'
import { getStatus, parseSummary, streamSummary, uploadBook, type BookInfo } from './api'

const ACCEPT = '.pdf,.docx,.epub,.txt,.md,.html,.htm'

type Stage = { kind: 'idle' } | { kind: 'uploading'; progress: number } | { kind: 'error'; message: string }
type Result = { text: string; done: boolean; error?: string }

export default function LexiconDemo() {
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

  return (
    <div className="mt-10 space-y-6">
      {ready === false && (
        <div className="border border-hot/60 bg-hot/10 px-4 py-3 font-mono text-sm text-hot">
          ⚠ SUMMARISER OFFLINE: the server has no Gemini API key yet. You can still upload a book and see its chapters.
        </div>
      )}

      {!book ? (
        <UploadZone
          accept={ACCEPT}
          title="DROP A BOOK HERE"
          hint="PDF · DOCX · EPUB · TXT · MD · HTML · up to 50 MB"
          error={stage.kind === 'error' ? stage.message : undefined}
          busy={
            stage.kind === 'uploading'
              ? {
                  label: stage.progress < 1 ? 'UPLOADING' : 'DECRYPTING CHAPTERS',
                  detail: stage.progress < 1 ? `${Math.round(stage.progress * 100)}%` : 'finding chapter boundaries…',
                  progress: stage.progress,
                }
              : null
          }
          onFile={handleFile}
        />
      ) : (
        <>
          <HudPanel title="TARGET ACQUIRED" tag={`${book.chapters.length} CHAPTERS`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-display text-2xl text-neon">{book.title}</p>
                <p className="font-mono text-sm text-dim">
                  {book.chapters.reduce((n, c) => n + c.words, 0).toLocaleString()} words decoded
                </p>
              </div>
              <div className="flex gap-3 font-mono text-sm">
                <button
                  onClick={exportAll}
                  disabled={!Object.values(results).some((r) => r.done && !r.error)}
                  className="border border-acid px-3 py-1 text-acid hover:bg-acid hover:text-void disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-acid"
                >
                  EXPORT .MD
                </button>
                <button onClick={() => setBook(null)} className="border border-hot px-3 py-1 text-hot hover:bg-hot hover:text-void">
                  NEW BOOK
                </button>
              </div>
            </div>
          </HudPanel>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <HudPanel title="CHAPTERS" className="lg:max-h-[70vh] lg:overflow-y-auto">
              <ol className="space-y-1">
                {book.chapters.map((c) => {
                  const r = results[c.index]
                  return (
                    <li key={c.index}>
                      <button
                        onClick={() => setSelected(c.index)}
                        className={`w-full border-l-2 px-3 py-2 text-left transition-colors ${
                          selected === c.index ? 'border-hot bg-hot/10' : 'border-transparent hover:border-neon/50 hover:bg-neon/5'
                        }`}
                      >
                        <span className="block truncate">{c.title}</span>
                        <span className="font-mono text-xs text-dim">
                          {c.words.toLocaleString()} words
                          {r?.done && !r.error && <span className="text-acid"> · ✓ decoded</span>}
                          {r && !r.done && <span className="text-neon"> · decoding…</span>}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </HudPanel>

            <ChapterPanel
              key={selected}
              chapter={book.chapters[selected]}
              result={results[selected]}
              canGenerate={ready !== false}
              onGenerate={() => generate(selected)}
            />
          </div>
        </>
      )}
    </div>
  )
}

type PanelProps = {
  chapter: BookInfo['chapters'][number]
  result?: Result
  canGenerate: boolean
  onGenerate: () => void
}

function ChapterPanel({ chapter, result, canGenerate, onGenerate }: PanelProps) {
  const parsed = parseSummary(result?.text ?? '')
  const streaming = result && !result.done

  return (
    <HudPanel title="INTEL" tag={streaming ? 'STREAMING' : result?.done && !result.error ? 'COMPLETE' : 'STANDBY'}>
      <h3 className="font-display text-xl text-neon">{chapter.title}</h3>

      {!result && (
        <>
          <p className="mt-3 font-mono text-sm leading-relaxed text-dim">{chapter.preview}…</p>
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="mt-6 border border-neon bg-neon/10 px-5 py-2 font-mono text-neon hover:bg-neon hover:text-void disabled:opacity-30"
          >
            GENERATE SUMMARY + FLASHCARDS
          </button>
        </>
      )}

      {result && (
        <div className="mt-4 space-y-6">
          {streaming && !result.text && (
            <p className="font-mono text-neon">
              reading {chapter.words.toLocaleString()} words<span className="blink">_</span>
            </p>
          )}

          {parsed.summary.length > 0 && (
            <section>
              <h4 className="mb-2 font-mono text-sm tracking-widest text-hot">// SUMMARY</h4>
              {parsed.summary.map((p, i) => (
                <p key={i} className="mb-3 text-lg leading-relaxed">
                  {p}
                </p>
              ))}
            </section>
          )}

          {parsed.insights.length > 0 && (
            <section>
              <h4 className="mb-2 font-mono text-sm tracking-widest text-hot">// KEY INSIGHTS</h4>
              <ul className="space-y-2">
                {parsed.insights.map((line, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
                    <span className="text-acid">▸</span>
                    <span>{line}</span>
                  </motion.li>
                ))}
              </ul>
            </section>
          )}

          {parsed.cards.length > 0 && (
            <section>
              <h4 className="mb-2 font-mono text-sm tracking-widest text-hot">// FLASHCARDS · click to flip</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <AnimatePresence>
                  {parsed.cards.map((card, i) => (
                    <FlipCard key={i} q={card.q} a={card.a} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {streaming && result.text && <span className="blink font-mono text-neon">█</span>}

          {result.error && (
            <div className="font-mono text-sm text-hot">
              ✖ {result.error}{' '}
              <button onClick={onGenerate} className="underline hover:text-glow">
                retry
              </button>
            </div>
          )}
        </div>
      )}
    </HudPanel>
  )
}

function FlipCard({ q, a }: { q: string; a: string }) {
  const [flipped, setFlipped] = useState(false)
  const face = 'absolute inset-0 flex flex-col justify-center border p-4 [backface-visibility:hidden]'
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setFlipped(!flipped)}
      className="relative h-40 text-left [perspective:800px]"
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={`${face} border-neon/40 bg-panel`}>
          <span className="font-mono text-xs text-neon">QUERY</span>
          <span className="mt-1">{q}</span>
        </div>
        <div className={`${face} border-hot/60 bg-hot/10 [transform:rotateY(180deg)]`}>
          <span className="font-mono text-xs text-hot">RESPONSE</span>
          <span className="mt-1">{a || '…'}</span>
        </div>
      </motion.div>
    </motion.button>
  )
}
