import { motion } from 'framer-motion'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTerminal } from './context'
import { useTerminalHotkeys } from './useHotkeys'
import { useMicroGlitch } from './useMicroGlitch'

// xterm is the heaviest thing on the page, and most visitors never open the
// terminal, so it is fetched on the first opening instead of with the site.
const Terminal = lazy(() => import('./Terminal'))

// Opening: the window tears into slices that jump sideways and flip colour,
// like a monitor locking onto a signal. Closing collapses it to a line, the
// way an old CRT switches off.
const glitchIn = {
  opacity: [0, 1, 0.15, 1, 0.6, 1],
  clipPath: [
    'inset(50% 0% 50% 0%)',
    'inset(8% 0% 74% 0%)',
    'inset(64% 0% 6% 0%)',
    'inset(22% 0% 38% 0%)',
    'inset(0% 0% 12% 0%)',
    'inset(0% 0% 0% 0%)',
  ],
  x: [36, -28, 22, -12, 5, 0],
  scaleY: [0.4, 1.08, 0.94, 1.03, 0.99, 1],
  skewX: [0, 14, -10, 6, -2, 0],
  filter: [
    'hue-rotate(0deg) saturate(3)',
    'hue-rotate(140deg) saturate(4) contrast(1.6)',
    'hue-rotate(-100deg) saturate(3)',
    'hue-rotate(60deg) contrast(1.3)',
    'hue-rotate(0deg) saturate(1.2)',
    'none',
  ],
  visibility: 'visible' as const,
  transition: { duration: 0.55, times: [0, 0.15, 0.3, 0.5, 0.75, 1] },
}

const glitchOut = {
  opacity: [1, 0.7, 1, 0],
  clipPath: ['inset(0% 0% 0% 0%)', 'inset(26% 0% 44% 0%)', 'inset(49% 0% 49% 0%)', 'inset(50% 0% 50% 0%)'],
  x: [0, 18, -12, 0],
  scaleY: [1, 0.8, 0.12, 0.02],
  skewX: [0, -12, 4, 0],
  filter: ['none', 'hue-rotate(-120deg) contrast(2)', 'brightness(2.4)', 'brightness(3)'],
  transition: { duration: 0.35 },
  transitionEnd: { visibility: 'hidden' as const },
}

/**
 * The terminal window. On desktop screens (lg and up) it floats on the right,
 * beside the hero title; on smaller screens it sits at the bottom so it
 * doesn't cover the text. It stays mounted while hidden, so history and
 * scrollback survive closing it.
 */
export default function TerminalDock() {
  const { open, setOpen } = useTerminal()
  // Mounted on the first opening, then kept, so history survives closing it.
  const [everOpened, setEverOpened] = useState(open)
  if (open && !everOpened) setEverOpened(true)
  // Counts openings, so remounting the burst replays its CSS animation.
  const [burst, setBurst] = useState(0)
  // Random interference while the window is open.
  const panelRef = useRef<HTMLDivElement>(null)
  useMicroGlitch(panelRef, open)

  useEffect(() => {
    setBurst((n) => n + 1)
  }, [open])

  useTerminalHotkeys()

  return (
    <motion.div
      className="fixed inset-x-2 bottom-2 z-[45] h-[60vh] sm:inset-x-auto sm:right-4 sm:w-[min(560px,calc(100vw-2rem))] lg:top-24 lg:bottom-auto lg:h-[min(500px,62vh)] lg:w-[min(560px,40vw)] xl:right-8 xl:w-[min(560px,38vw)]"
      initial={{ opacity: 0, visibility: 'hidden' }}
      animate={open ? glitchIn : glitchOut}
      style={{ pointerEvents: open ? 'auto' : 'none' }}
      aria-hidden={!open}
    >
      <div ref={panelRef} className="hud-panel flex h-full flex-col bg-void/90! shadow-[0_0_40px_rgb(57_255_136/0.18)]">
        {/* The frame stays cyan/pink so the window belongs to the site... */}
        <div className="flex items-center justify-between border-b border-neon/20 px-4 py-2 font-mono text-xs tracking-widest">
          <span className="flex items-center gap-2 text-neon">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#39ff88]" />
            TERMINAL · guest@janit-sys
          </span>
          <button onClick={() => setOpen(false)} className="text-hot hover:text-glow" aria-label="Close terminal">
            [ESC] ✕
          </button>
        </div>
        {/* ...while the screen inside is an old green-phosphor CRT. */}
        <div className="crt-screen min-h-0 flex-1 px-3 py-2">
          {everOpened && (
            <Suspense fallback={null}>
              <Terminal active={open} onClose={() => setOpen(false)} />
            </Suspense>
          )}
        </div>
      </div>

      {/* One-shot burst layers, remounted on every toggle (see index.css). */}
      <div key={burst} className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="term-glitch absolute inset-0">
          <span />
          <span />
          <span />
        </div>
        {open && <div className="term-flash" />}
      </div>
    </motion.div>
  )
}
