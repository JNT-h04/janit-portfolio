import { motion } from 'framer-motion'
import { useEffect } from 'react'
import Terminal from './Terminal'

type Props = { open: boolean; setOpen: (open: boolean) => void }

/**
 * A drop-down console, like the one in old PC games. It stays mounted while
 * hidden, so your history and scrollback survive closing it.
 */
export default function TerminalDock({ open, setOpen }: Props) {
  // The ` key toggles it, unless you're typing in a text box.
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
    // The outer div does the positioning; .hud-panel sets position: relative,
    // so it must sit on an inner element or it would override `fixed`.
    <motion.div
      className="fixed inset-x-2 top-14 z-[45] h-[min(70vh,560px)] sm:inset-x-8"
      initial={false}
      animate={open ? { y: 0, opacity: 1 } : { y: '-110%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      style={{ pointerEvents: open ? 'auto' : 'none' }}
      aria-hidden={!open}
    >
      <div className="hud-panel flex h-full flex-col bg-void/95!">
        <div className="flex items-center justify-between border-b border-neon/20 px-4 py-2 font-mono text-xs tracking-widest">
          <span className="text-neon">// TERMINAL · guest session</span>
          <button onClick={() => setOpen(false)} className="text-hot hover:text-glow">
            [ESC] CLOSE
          </button>
        </div>
        <div className="min-h-0 flex-1 px-3 py-2">
          <Terminal active={open} onClose={() => setOpen(false)} />
        </div>
      </div>
    </motion.div>
  )
}
