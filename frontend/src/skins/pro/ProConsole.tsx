import { AnimatePresence, motion } from 'framer-motion'
import Terminal from '../../terminal/Terminal'
import { useTerminal } from '../../terminal/context'
import { useTerminalHotkeys } from '../../terminal/useHotkeys'

/**
 * The same sandboxed shell the cyberpunk side has, in professional clothes:
 * a quiet white panel instead of a glitching CRT. Same commands, same backend.
 */
export default function ProConsole() {
  const { open, setOpen } = useTerminal()
  useTerminalHotkeys()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-3 bottom-3 z-45 h-[58vh] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[min(560px,calc(100vw-2.5rem))] lg:h-[min(460px,60vh)]"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-rule bg-card shadow-[0_24px_60px_-20px_rgb(22_24_29/0.35)]">
            <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
              <span className="flex items-center gap-2 font-sans text-[13px] font-medium text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-coral" />
                Console
                <span className="font-code text-xs text-quiet">guest@janit</span>
              </span>
              <button
                onClick={() => setOpen(false)}
                className="rounded px-2 py-0.5 font-sans text-xs text-quiet transition-colors hover:bg-rule/60 hover:text-ink"
              >
                Esc
              </button>
            </div>

            <div className="min-h-0 flex-1 bg-[#fcfcfb] px-3 py-2">
              <Terminal active={open} theme="paper" onClose={() => setOpen(false)} />
            </div>

            <p className="border-t border-rule px-4 py-1.5 font-sans text-[11px] text-quiet">
              A sandboxed interpreter, not a real shell. Type <code className="font-code text-ink">help</code> to
              see the commands.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
