import { motion } from 'framer-motion'
import { useState } from 'react'
import { parseSummary, type BookInfo } from '../../../projects/lexicon/api'
import { ACCEPT, useLexicon, type Result } from '../../../projects/lexicon/useLexicon'
import { LEXICON_NOTES } from '../../../projects/notes'
import DropZone from '../components/DropZone'
import HonestNotes from '../components/HonestNotes'
import SampleStrip from '../components/SampleStrip'
import { BOOK_SAMPLE } from '../../../projects/samples'
import MeasuredPanel from '../components/MeasuredPanel'

export default function LexiconPanel() {
  const { trySample, measured, ready, keyStatus, stage, book, selected, setSelected, results, handleFile, generate, exportAll, reset } = useLexicon()

  return (
    <div className="space-y-5">
      {keyStatus === 'waking' && (
        <p className="paper-card p-4 font-sans text-sm text-quiet">
          Waking the server up. It sleeps when nobody has visited for a while and takes about a minute to start.
          This message goes away on its own.
        </p>
      )}
      {keyStatus === 'unreachable' && (
        <p className="paper-card p-4 font-sans text-sm text-quiet">
          The server isn't answering right now. Try reloading the page in a few minutes.
        </p>
      )}
      {ready === false && (
        <p className="paper-card p-4 font-sans text-sm text-quiet">
          The summariser is offline: the server has no Gemini API key. You can still upload a book and see the
          chapters it finds.
        </p>
      )}

      {!book ? (
        <DropZone
          accept={ACCEPT}
          title="Drop a book here"
          hint="PDF · DOCX · EPUB · TXT · MD · HTML — up to 50 MB"
          error={stage.kind === 'error' ? stage.message : undefined}
          busy={
            stage.kind === 'uploading'
              ? {
                  label: stage.progress < 1 ? 'Uploading' : 'Finding chapters',
                  detail:
                    stage.progress < 1
                      ? `${Math.round(stage.progress * 100)}%`
                      : 'Detecting chapter boundaries…',
                  progress: stage.progress,
                }
              : null
          }
          onFile={handleFile}
        />
      ) : null}
      {!book && stage.kind !== 'uploading' && (
        <SampleStrip
          title={BOOK_SAMPLE.title}
          credit={BOOK_SAMPLE.credit}
          cta="Try a sample book"
          disabled={ready === false}
          onTry={trySample}
        />
      )}
      {!book ? null : (
        <>
          <div className="paper-card flex flex-wrap items-end justify-between gap-4 p-6">
            <div>
              <h3 className="font-serif text-2xl text-ink">{book.title}</h3>
              <p className="mt-1 font-sans text-sm text-quiet">
                {book.chapters.length} chapters ·{' '}
                {book.chapters.reduce((n, c) => n + c.words, 0).toLocaleString()} words
              </p>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={exportAll}
                disabled={!Object.values(results).some((r) => r.done && !r.error)}
                className="rounded-md border border-rule px-3.5 py-1.5 font-sans text-sm text-ink transition-colors hover:border-coral/50 hover:text-coral disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink"
              >
                Export .md
              </button>
              <button
                onClick={reset}
                className="rounded-md border border-rule px-3.5 py-1.5 font-sans text-sm text-ink transition-colors hover:border-coral/50 hover:text-coral"
              >
                New book
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
            <nav className="paper-card p-3 lg:max-h-[70vh] lg:overflow-y-auto">
              <p className="px-2 py-1 font-sans text-xs tracking-widest text-quiet uppercase">Chapters</p>
              <ol className="mt-1 space-y-0.5">
                {book.chapters.map((c) => {
                  const r = results[c.index]
                  return (
                    <li key={c.index}>
                      <button
                        onClick={() => setSelected(c.index)}
                        className={`w-full rounded border-l-2 px-3 py-2 text-left transition-colors ${
                          selected === c.index
                            ? 'border-coral bg-coral-soft'
                            : 'border-transparent hover:bg-paper'
                        }`}
                      >
                        <span className="block truncate font-sans text-sm text-ink">{c.title}</span>
                        <span className="font-sans text-xs text-quiet">
                          {c.words.toLocaleString()} words
                          {r?.done && !r.error && <span className="text-coral"> · done</span>}
                          {r && !r.done && <span className="text-coral"> · writing…</span>}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </nav>

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

      <MeasuredPanel measured={measured} />
      <HonestNotes notes={LEXICON_NOTES} />
    </div>
  )
}

function ChapterPanel({
  chapter,
  result,
  canGenerate,
  onGenerate,
}: {
  chapter: BookInfo['chapters'][number]
  result?: Result
  canGenerate: boolean
  onGenerate: () => void
}) {
  const parsed = parseSummary(result?.text ?? '')
  const streaming = result && !result.done

  return (
    <div className="paper-card p-6">
      <h3 className="font-serif text-xl text-ink">{chapter.title}</h3>

      {!result && (
        <>
          <p className="mt-3 font-sans text-[15px] leading-relaxed text-quiet">{chapter.preview}…</p>
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="mt-6 rounded-md bg-ink px-5 py-2.5 font-sans text-sm font-medium text-paper transition-colors hover:bg-coral disabled:opacity-40"
          >
            Summarise this chapter
          </button>
        </>
      )}

      {result && (
        <div className="mt-4 space-y-7">
          {streaming && !result.text && (
            <p className="font-sans text-[15px] text-quiet">
              Reading {chapter.words.toLocaleString()} words…
            </p>
          )}

          {parsed.summary.length > 0 && (
            <section>
              <h4 className="font-sans text-xs tracking-widest text-quiet uppercase">Summary</h4>
              {parsed.summary.map((p, i) => (
                <p key={i} className="mt-3 font-sans text-[16px] leading-[1.75] text-ink/85">
                  {p}
                </p>
              ))}
            </section>
          )}

          {parsed.insights.length > 0 && (
            <section>
              <h4 className="font-sans text-xs tracking-widest text-quiet uppercase">Key insights</h4>
              <ul className="mt-3 space-y-2.5">
                {parsed.insights.map((line, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2.5 font-sans text-[15px] leading-relaxed text-ink/85"
                  >
                    <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-coral" />
                    {line}
                  </motion.li>
                ))}
              </ul>
            </section>
          )}

          {parsed.cards.length > 0 && (
            <section>
              <h4 className="font-sans text-xs tracking-widest text-quiet uppercase">
                Flashcards · click to flip
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {parsed.cards.map((card, i) => (
                  <FlipCard key={i} q={card.q} a={card.a} />
                ))}
              </div>
            </section>
          )}

          {result.error && (
            <p className="font-sans text-sm text-red-700">
              {result.error}{' '}
              <button onClick={onGenerate} className="underline">
                Retry
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function FlipCard({ q, a }: { q: string; a: string }) {
  const [flipped, setFlipped] = useState(false)
  const face =
    'absolute inset-0 flex flex-col justify-center rounded-lg border p-4 text-left [backface-visibility:hidden]'
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setFlipped(!flipped)}
      className="relative h-40 [perspective:800px]"
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={`${face} border-rule bg-card`}>
          <span className="font-sans text-xs tracking-widest text-quiet uppercase">Question</span>
          <span className="mt-1.5 font-sans text-[15px] leading-relaxed text-ink">{q}</span>
        </div>
        <div className={`${face} border-coral/40 bg-coral-soft [transform:rotateY(180deg)]`}>
          <span className="font-sans text-xs tracking-widest text-coral uppercase">Answer</span>
          <span className="mt-1.5 font-sans text-[15px] leading-relaxed text-ink">{a || '…'}</span>
        </div>
      </motion.div>
    </motion.button>
  )
}
