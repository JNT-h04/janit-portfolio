import type { Skin } from '../../skin/context'

/**
 * The front door's background: a sparse board of orthogonal traces running in
 * from both edges, drawn once on arrival. Warm traces come from the
 * professional side, neon ones from the casual side.
 *
 * Deliberately minimal: a dozen faint traces and only a few slow pulses, so the
 * page reads as alive without anything competing with the two choices.
 *
 * Deterministic: the layout is generated once at module load from a fixed seed,
 * so it is the same board every visit and nothing is recomputed on render.
 */
export default function GateCircuit({ focus }: { focus: Skin | null }) {
  return (
    <div className={`gq ${focus ? `gq-lean-${focus}` : ''}`} aria-hidden>
      <svg className="gq-board" viewBox="0 0 100 60" preserveAspectRatio="none">
        {TRACES.map((t, i) => (
          <g key={i} className={t.warm ? 'gq-trace gq-warm' : 'gq-trace gq-cool'}>
            <path
              d={t.d}
              fill="none"
              // vectorEffect keeps the stroke in screen pixels, so this is
              // 1.2px on any viewport — not 1.2 of the 100-wide viewBox.
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
              // Measure the dash in fractions of the path, not in pixels: with a
              // non-scaling stroke a pixel dash broke long traces into
              // fragments, which read as the page glitching.
              pathLength={100}
              style={{ animationDelay: `${t.delay}ms` }}
            />
            {t.pulse > 0 && (
              <circle r={0.2} className="gq-pad">
                {/* The pulse rides the trace it belongs to. */}
                <animateMotion
                  dur={`${t.pulse}s`}
                  begin={`${t.delay / 1000 + 1.2}s`}
                  repeatCount="indefinite"
                  path={t.d}
                />
              </circle>
            )}
          </g>
        ))}
      </svg>
      <div className="gq-haze" />
      <div className="gq-vignette" />
    </div>
  )
}

/** One board, generated once: same traces, same pads, every visit. */
const TRACES = (() => {
  let seed = 90210
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }

  const out: { d: string; warm: boolean; delay: number; pulse: number }[] = []
  for (let i = 0; i < 12; i++) {
    const warm = i % 2 === 0
    // Warm traces enter from the left edge, cool ones from the right.
    const startX = warm ? -2 : 102
    const y = 3 + rand() * 54
    const steps = 2 + Math.floor(rand() * 3)

    let x = startX
    let cy = y
    let d = `M ${x} ${cy}`
    for (let s = 0; s < steps; s++) {
      // Run in, then jog up or down, the way a board routes around a part.
      const run = (8 + rand() * 20) * (warm ? 1 : -1)
      x += run
      d += ` L ${x.toFixed(1)} ${cy.toFixed(1)}`
      const jog = (rand() - 0.5) * 18
      cy = Math.min(58, Math.max(2, cy + jog))
      d += ` L ${x.toFixed(1)} ${cy.toFixed(1)}`
    }
    const last = (6 + rand() * 12) * (warm ? 1 : -1)
    x += last
    d += ` L ${x.toFixed(1)} ${cy.toFixed(1)}`

    const delay = Math.round(rand() * 1400)
    const speed = rand()
    out.push({
      d,
      warm,
      delay,
      // Only every third trace carries a pulse, and slowly.
      pulse: i % 3 === 0 ? 14 + speed * 6 : 0,
    })
  }
  return out
})()
