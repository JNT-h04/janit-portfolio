import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useTerminal } from './context'
import Terminal from './Terminal'

// Opening: the window flickers in as broken slices, jumping sideways and
// shifting colour, before it settles. Closing collapses it to a thin line
// like an old CRT switching off.
const glitchIn = {
  opacity: [0, 1, 0.2, 1, 0.5, 1],
  clipPath: [
    'inset(50% 0% 50% 0%)',
    'inset(12% 0% 70% 0%)',
    'inset(60% 0% 8% 0%)',
    'inset(25% 0% 35% 0%)',
    'inset(0% 0% 0% 0%)',
    'inset(0% 0% 0% 0%)',
  ],
  x: [30, -22, 16, -8, 3, 0],
  skewX: [0, 10, -8, 4, 0, 0],
  filter: ['hue-rotate(0deg)', 'hue-rotate(120deg)', 'hue-rotate(-90deg)', 'hue-rotate(40deg)', 'hue-rotate(0deg)', 'hue-rotate(0deg)'],
  visibility: 'visible' as const,
  transition: { duration: 0.5, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
}

const glitchOut = {
  opacity: [1, 0.6, 1, 0],
  clipPath: ['inset(0% 0% 0% 0%)', 'inset(30% 0% 40% 0%)', 'inset(49% 0% 49% 0%)', 'inset(50% 0% 50% 0%)'],
  x: [0, 14, -10, 0],
  skewX: [0, -8, 0, 0],
  filter: ['hue-rotate(0deg)', 'hue-rotate(-120deg)', 'hue-rotate(0deg)', 'hue-rotate(0deg)'],
  transition: { duration: 0.3 },
  transitionEnd: { visibility: 'hidden' as const },
}

/**
 * The terminal window. On desktop screens (lg and up) it floats on the right, beside the
 * hero title; on smaller screens it sits at the bottom so it doesn't cover the text. It stays mounted while
 * hidden, so history and scrollback survive closing it.
 */
export default function TerminalDock() {
  const { open, setOpen } = useTerminal()

  // ` toggles it (unless you're typing in a text box); Esc closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as Element).closest('input, textarea, [contenteditable]')
      if (e.key === '`' && !typing) {
        e.preventDefault()
        setOpen(!open)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, setOpen])

  return (
    <motion.div
      className="fixed inset-x-2 bottom-2 z-[45] h-[60vh] sm:inset-x-auto sm:right-4 sm:w-[min(560px,calc(100vw-2rem))] lg:top-24 lg:bottom-auto lg:h-[min(500px,62vh)] lg:w-[min(560px,40vw)] xl:right-8 xl:w-[min(560px,38vw)]"
      initial={{ opacity: 0, visibility: 'hidden' }}
      animate={open ? glitchIn : glitchOut}
      style={{ pointerEvents: open ? 'auto' : 'none' }}
      aria-hidden={!open}
    >
      <div className="hud-panel flex h-full flex-col bg-void/90! shadow-[0_0_40px_rgb(0_240_255/0.15)]">
        <div className="flex items-center justify-between border-b border-neon/20 px-4 py-2 font-mono text-xs tracking-widest">
          <span className="flex items-center gap-2 text-neon">
            <span className="h-2 w-2 animate-pulse rounded-full bg-acid" />
            TERMINAL · guest@janit-sys
          </span>
          <button onClick={() => setOpen(false)} className="text-hot hover:text-glow">
            [ESC] ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 px-3 py-2">
          <Terminal active={open} onClose={() => setOpen(false)} />
        </div>
      </div>
    </motion.div>
  )
}
