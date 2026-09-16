import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const LINES = [
  'JANIT://SYS BIOS v2.0.26',
  'checking neural cores .......... OK',
  'mounting /projects ............. 4 modules found',
  'linking backend uplink ......... standby',
  'loading operator profile ....... JANIT B',
  'ACCESS GRANTED',
]

/**
 * Fake boot log shown on the first visit of a browser session.
 * sessionStorage remembers that it has played, so it doesn't replay on every
 * page change. Any key or click skips it; ?boot=off disables it (for screenshots).
 */
export default function BootScreen() {
  const [shown, setShown] = useState(() => {
    if (new URLSearchParams(location.search).get('boot') === 'off') return false
    try {
      return sessionStorage.getItem('booted') !== '1'
    } catch {
      return true
    }
  })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!shown) return
    const finish = () => {
      setShown(false)
      try {
        sessionStorage.setItem('booted', '1')
      } catch {
        /* private mode: just replay next time */
      }
    }
    const timer = setInterval(() => {
      setCount((c) => {
        if (c >= LINES.length) {
          clearInterval(timer)
          setTimeout(finish, 500)
          return c
        }
        return c + 1
      })
    }, 280)
    addEventListener('keydown', finish)
    addEventListener('click', finish)
    return () => {
      clearInterval(timer)
      removeEventListener('keydown', finish)
      removeEventListener('click', finish)
    }
  }, [shown])

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-void font-mono"
          exit={{ opacity: 0, scaleY: 0.005, filter: 'brightness(3)' }}
          transition={{ duration: 0.45 }}
        >
          <div className="w-full max-w-xl px-4 text-sm sm:text-base">
            {LINES.slice(0, count).map((line, i) => (
              <p key={line} className={i === LINES.length - 1 ? 'mt-3 text-acid text-glow' : 'text-neon/80'}>
                &gt; {line}
              </p>
            ))}
            <span className="blink text-neon">█</span>
            <p className="mt-8 text-xs text-dim">[ press any key to skip ]</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
