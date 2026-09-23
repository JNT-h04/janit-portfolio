import { useMemo } from 'react'

type Props = {
  /** ms until the grid is fully stacked — the moment the route swaps. */
  coverMs: number
  /** ms until the overlay is gone. */
  totalMs: number
}

const DROP_MS = 300
const CLEAR_MS = 340
/** Accent fills, sprinkled over the dark blocks like tetromino pieces. */
const TONES = ['#00f0ff', '#d1f700', '#ff2a6d', '#16324a'] as const

type Block = {
  left: number
  top: number
  w: number
  h: number
  dropDelay: number
  clearDelay: number
  tone: string | null
  /** How far sideways this block slams in before it settles. */
  jitter: number
  /** A few blocks carry a chromatic ghost, for the torn-signal look. */
  ghost: boolean
}

/**
 * The casual skin's page change: the screen is bricked over by blocks falling
 * from the top, column by column like the building-block game, the stack
 * glitches while the route swaps behind it, then the rows clear bottom-up and
 * the new page is underneath.
 *
 * The choreography is baked into per-block animation delays rather than state,
 * so a hundred-odd blocks cost one render and then run entirely on the
 * compositor. Both delays are normalised into their phase's budget, so the
 * grid is always fully closed exactly at `coverMs` however many columns fit.
 */
export default function BlockWaterfall({ coverMs, totalMs }: Props) {
  const { blocks, cols } = useMemo(() => build(coverMs, totalMs), [coverMs, totalMs])
  const dump = useMemo(() => makeDump(), [])

  return (
    <div className="fixed inset-0 z-[55]" aria-hidden>
      {/* The stack itself, shifted sideways in slices at the worst moments. */}
      <div className="bw-slice" style={{ animationDelay: `${coverMs - 210}ms` }}>
        {blocks.map((b, i) => (
          <div
            key={i}
            className={b.ghost ? 'bw-block bw-ghost' : 'bw-block'}
            style={
              {
                left: `${b.left}%`,
                top: `${b.top}%`,
                width: `${b.w}%`,
                height: `${b.h}%`,
                background: b.tone ?? undefined,
                '--jx': `${b.jitter}px`,
                animation: `bw-drop ${DROP_MS}ms cubic-bezier(.4,0,.3,1) ${b.dropDelay}ms both,
                            bw-clear ${CLEAR_MS}ms cubic-bezier(.5,0,.75,0) ${b.clearDelay}ms forwards`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Torn bands through the fill. Three, not five: enough that the screen
          is visibly coming apart, few enough to still read as one move. */}
      {[0.4, 0.78, 1.02].map((at, i) => (
        <div
          key={at}
          className={`bw-band ${i % 2 ? 'bw-band-b' : 'bw-band-a'}`}
          style={{ animationDelay: `${Math.max(0, coverMs * at - 120)}ms` }}
        />
      ))}

      <div className="bw-static" style={{ animationDelay: `${coverMs * 0.3}ms` }} />
      <div className="bw-scan" style={{ animationDelay: `${coverMs - 160}ms` }} />

      {/* Memory garbage scrolling behind the readout. */}
      <div className="bw-dump font-mono" style={{ animationDelay: `${coverMs * 0.35}ms` }}>
        {dump.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </div>

      <div
        className="bw-readout font-mono"
        style={{ animationDelay: `${Math.max(0, coverMs - 260)}ms` }}
      >
        <span className="bw-title text-neon" data-text="RECOMPILING VIEW">
          RECOMPILING VIEW
        </span>
        <span className="bw-bar" />
        <span className="text-dim">
          {cols} COLS · BLOCKS OK · <span className="text-acid">EOF</span>
        </span>
      </div>
    </div>
  )
}

/** Eight lines of plausible-looking memory garbage for the glitch to scroll. */
function makeDump() {
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(' ')
  return Array.from({ length: 8 }, (_, i) => `0x${(0x4a00 + i * 16).toString(16)}  ${hex(8)}`)
}

function build(coverMs: number, totalMs: number) {
  const w = typeof window === 'undefined' ? 1440 : innerWidth
  const h = typeof window === 'undefined' ? 900 : innerHeight
  const cols = Math.max(8, Math.min(18, Math.round(w / 95)))
  const rows = Math.max(5, Math.min(12, Math.round(h / 95)))

  const raw: { drop: number; clear: number; b: Omit<Block, 'dropDelay' | 'clearDelay'> }[] = []
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      raw.push({
        // Left-to-right waterfall; inside a column the floor fills first, so
        // the stack grows upward the way a dropped piece settles.
        drop: c * 26 + (rows - 1 - r) * 16 + Math.random() * 40,
        // Clearing runs the other way: bottom rows pop first, top last.
        clear: (rows - 1 - r) * 34 + c * 7 + Math.random() * 30,
        b: {
          left: (c / cols) * 100,
          top: (r / rows) * 100,
          // A hair of overlap kills the sub-pixel seams between cells.
          w: (1 / cols) * 100 + 0.05,
          h: (1 / rows) * 100 + 0.05,
          tone: Math.random() < 0.14 ? TONES[(Math.random() * TONES.length) | 0] : null,
          jitter: Math.round((Math.random() * 2 - 1) * 38),
          ghost: Math.random() < 0.06,
        },
      })
    }
  }

  const fit = (values: number[], budget: number) => {
    const max = Math.max(...values, 1)
    return budget <= 0 ? values.map(() => 0) : values.map((v) => (v / max) * budget)
  }
  const drops = fit(raw.map((x) => x.drop), coverMs - DROP_MS)
  const clears = fit(raw.map((x) => x.clear), totalMs - coverMs - CLEAR_MS)

  const blocks: Block[] = raw.map((x, i) => ({
    ...x.b,
    dropDelay: drops[i],
    clearDelay: coverMs + clears[i],
  }))
  return { blocks, cols }
}
