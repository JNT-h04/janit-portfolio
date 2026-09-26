import { fmtMs, type Measured } from '../measure/measure'
import HudPanel from './HudPanel'

const SOURCE = { server: 'SRV', browser: 'YOU', model: 'MDL' } as const
const TONE = { server: 'text-neon', browser: 'text-hot', model: 'text-acid' } as const

/** The cyberpunk rendering of a demo's measurements (see measure/measure.ts). */
export default function TelemetryPanel({ measured }: { measured: Measured | null }) {
  if (!measured) return null
  return (
    <HudPanel title="TELEMETRY" tag={measured.runs > 1 ? `MEDIAN ${fmtMs(measured.medianMs)} / ${measured.runs} RUNS` : 'LIVE'}>
      <dl className="grid gap-x-8 gap-y-2 font-mono text-sm sm:grid-cols-2" aria-live="polite">
        {measured.metrics.map((m) => (
          <div key={m.label} className="flex items-baseline justify-between gap-4 border-b border-neon/10 pb-1.5">
            <dt className="min-w-0 text-text/80">
              <span className={`mr-2 text-xs whitespace-nowrap ${TONE[m.source]}`}>[{SOURCE[m.source]}]</span>
              {m.label}
            </dt>
            <dd className="max-w-[55%] text-right break-words text-neon">{m.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 font-mono text-xs text-dim">
        // measured on this request. SRV = server clock, YOU = your browser, MDL = what the model returned.
      </p>
    </HudPanel>
  )
}
