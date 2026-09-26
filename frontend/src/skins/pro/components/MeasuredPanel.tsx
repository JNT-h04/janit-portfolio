import type { CSSProperties } from 'react'
import { fmtMs, type Measured } from '../../../measure/measure'
import Reveal from './Reveal'

const SOURCE = {
  server: { text: 'server', tone: 'var(--color-violet)' },
  browser: { text: 'your browser', tone: 'var(--color-coral)' },
  model: { text: 'model output', tone: 'var(--color-jade)' },
} as const

/** The professional rendering of a demo's measurements (see measure/measure.ts). */
export default function MeasuredPanel({ measured }: { measured: Measured | null }) {
  if (!measured) return null
  return (
    <Reveal>
      <section className="paper-card p-6" aria-live="polite">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-sans text-xs tracking-widest text-quiet uppercase">What I measured · your run</h3>
          {measured.runs > 1 && (
            <p className="font-sans text-xs text-quiet">
              median of your {measured.runs} runs: <span className="font-code text-ink">{fmtMs(measured.medianMs)}</span>
            </p>
          )}
        </div>
        <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {measured.metrics.map((m) => (
            <div key={m.label} className="flex items-baseline justify-between gap-4 border-b border-rule pb-2">
              <dt className="min-w-0 font-sans text-sm text-ink/80">
                {m.label}
                <span
                  className="tone-chip ml-2 inline-block rounded-full px-1.5 py-px align-middle font-sans text-[10px] whitespace-nowrap"
                  style={{ '--tone': SOURCE[m.source].tone } as CSSProperties}
                >
                  {SOURCE[m.source].text}
                </span>
              </dt>
              <dd className="max-w-[55%] text-right font-code text-sm break-words text-ink">{m.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 font-sans text-xs leading-relaxed text-quiet">
          Measured on this request, not typed in. The API runs on a free instance, so the network and cold starts are
          most of the time; the model itself is the small number.
        </p>
      </section>
    </Reveal>
  )
}
