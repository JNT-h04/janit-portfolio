import { useId } from 'react'

/**
 * "JANIT B" drawn by hand in the style of the Cyberpunk 2077 logo: thin,
 * sharp, slanted strokes, every letter different, a long tail sweeping left
 * off the J (like the logo's C) and a spike dropping off the B (like its K).
 *
 * No font looks like this, so each letter is a set of polygons on a small
 * grid: cap height runs from y=0 to the baseline at y=100. `advance` is how
 * far the pen moves right after the letter. `evenodd` lets the B's inner
 * shapes punch holes in its outline.
 */

type Point = [number, number]
type Glyph = { advance: number; shapes: Point[][]; evenodd?: boolean }

const GLYPHS: Record<string, Glyph> = {
  J: {
    advance: 60,
    shapes: [[[14, 0], [64, 0], [60, 82], [47, 100], [-92, 100], [-40, 95], [37, 94], [49, 82], [52, 11], [24, 11]]],
  },
  A: {
    advance: 80,
    shapes: [
      [[0, 100], [42, -8], [52, 4], [80, 100], [68, 100], [46, 24], [13, 100]],
      [[-4, 73], [62, 64], [64, 72], [8, 78]], // crossbar, spiking out to the left
    ],
  },
  N: {
    advance: 76,
    shapes: [
      [[0, 100], [3, 8], [16, 0], [13, 94]],
      [[4, 6], [16, 0], [75, 90], [64, 100]],
      [[64, 2], [78, -8], [75, 90], [64, 76]],
    ],
  },
  I: { advance: 24, shapes: [[[2, 6], [15, 0], [13, 88], [6, 100], [0, 100]]] },
  T: {
    advance: 74,
    shapes: [
      [[-14, 11], [6, 0], [84, 0], [79, 10]], // top bar, pointed at the left
      [[35, 10], [47, 10], [45, 92], [39, 100], [33, 100]],
    ],
  },
  ' ': { advance: 30, shapes: [] },
  B: {
    advance: 74,
    evenodd: true,
    shapes: [
      [[0, 0], [56, 0], [68, 10], [68, 36], [58, 46], [72, 56], [72, 88], [60, 100], [0, 100]],
      [[11, 11], [52, 11], [57, 16], [57, 32], [51, 39], [11, 39]],
      [[11, 54], [56, 54], [61, 60], [61, 84], [55, 89], [11, 89]],
    ],
  },
}

// The B's spike is a separate shape so evenodd doesn't treat it as a hole.
const EXTRAS: Record<string, Point[][]> = { B: [[[52, 95], [70, 88], [134, 142]]] }

const GAP = 9
const LEFT = -120 // room for the J's tail (it leans further left once slanted)
const TOP = -12
const HEIGHT = 160 // room for the B's spike below the baseline

const toPath = (shape: Point[], dx: number) => 'M' + shape.map(([x, y]) => `${x + dx},${y}`).join('L') + 'Z'

export default function CyberLogo({
  text = 'JANIT B',
  variant = 'base',
  className = '',
}: {
  text?: string
  /** base: gradient fill. slice: flat currentColor, used by the glitch copies. */
  variant?: 'base' | 'slice'
  className?: string
}) {
  const gradientId = useId()
  let x = 0
  const paths: { d: string; evenodd?: boolean }[] = []
  for (const ch of text.toUpperCase()) {
    const glyph = GLYPHS[ch]
    if (!glyph) continue
    if (glyph.shapes.length) paths.push({ d: glyph.shapes.map((s) => toPath(s, x)).join(''), evenodd: glyph.evenodd })
    for (const extra of EXTRAS[ch] ?? []) paths.push({ d: toPath(extra, x) })
    x += glyph.advance + GAP
  }
  const width = x + 70 - LEFT // +70: room for the B's spike

  return (
    <svg viewBox={`${LEFT} ${TOP} ${width} ${HEIGHT}`} className={`overflow-visible ${className}`} aria-hidden>
      {variant === 'base' && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.3" stopColor="#bff9ff" />
            <stop offset="0.55" stopColor="#00f0ff" />
            <stop offset="1" stopColor="#ff2a6d" />
          </linearGradient>
        </defs>
      )}
      {/* -14° slant, like the logo's forward lean */}
      <g transform="skewX(-14)" fill={variant === 'base' ? `url(#${gradientId})` : 'currentColor'}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fillRule={p.evenodd ? 'evenodd' : 'nonzero'} />
        ))}
      </g>
    </svg>
  )
}
