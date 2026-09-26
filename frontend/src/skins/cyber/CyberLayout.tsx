import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import BootScreen from '../../effects/BootScreen'
import Cursor from '../../effects/Cursor'
import CyberCity from '../../effects/CyberCity'
import { BLOCKS } from '../../effects/transitions'
import { useRouteSwap } from '../../effects/useRouteSwap'
import BlockWaterfall from './effects/BlockWaterfall'
import Home from '../../pages/Home'
import NotFound from '../../pages/NotFound'
import ProjectPage from '../../pages/ProjectPage'
import { useSkin } from '../../skin/context'
import { useTerminal } from '../../terminal/context'
import TerminalDock from '../../terminal/TerminalDock'

/** The cyberpunk face of the site: neon city, CRT overlay, glitch and a terminal. */
export default function CyberLayout() {
  const terminal = useTerminal()
  const { reset } = useSkin()

  // The boot log is the arrival on a first visit, so the blocks wait for it and
  // then play as the load itself: ACCESS GRANTED, then the screen builds.
  const [bootLoad, setBootLoad] = useState(0)
  const onBooted = useCallback(() => {
    setBootLoad((n) => n + 1)
    setTimeout(() => setBootLoad(0), BLOCKS.total)
  }, [])
  // The new page mounts behind the closed block stack, so the reveal uncovers
  // a page that is already scrolled and settled.
  const { shown, phase, runId } = useRouteSwap(BLOCKS.cover, BLOCKS.total)

  // React Router doesn't scroll for you. Go to the #section if there is one,
  // otherwise to the top — while the blocks still cover the screen.
  useEffect(() => {
    const t = setTimeout(() => {
      const target = shown.hash && document.querySelector(shown.hash)
      if (target) target.scrollIntoView({ behavior: 'smooth' })
      else window.scrollTo(0, 0)
    }, 60)
    return () => clearTimeout(t)
  }, [shown.pathname, shown.hash])

  return (
    <>
      <CyberCity variant="sunset" />
      <ScrollScrim />
      <div className="crt" />
      <Cursor />
      <BootScreen onDone={onBooted} />
      <TerminalDock />

      <nav className="sticky top-0 z-40 border-b border-neon/15 bg-void/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 font-mono text-xs sm:text-sm">
          <Link to="/" className="shrink-0 font-display font-bold tracking-wider text-neon sm:tracking-widest">
            JANIT<span className="text-hot">://</span>SYS
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link to="/#missions" className="hover:text-neon">missions</Link>
            <Link to="/#operator" className="hover:text-neon">operator</Link>
            <Link to="/#experience" className="hidden hover:text-neon lg:inline">experience</Link>
            <Link to="/#contact" className="hover:text-neon">contact</Link>
            {/* No link to the professional side from here on purpose: the two
                versions are offered together at the front door. */}
            <button
              onClick={reset}
              className="hidden text-dim transition-colors hover:text-hot sm:inline"
              title="back to the front door, where both versions are offered"
            >
              [front door]
            </button>
            <button
              onClick={() => terminal.setOpen(!terminal.open)}
              className={`flex items-center gap-2 border px-2 py-1 tracking-widest sm:px-3 transition-colors ${
                terminal.open ? 'border-acid bg-acid text-void' : 'border-acid text-acid hover:bg-acid hover:text-void'
              }`}
              title="toggle terminal (` key)"
            >
              <span className="font-bold">&gt;_</span>
              <span className="hidden sm:inline">TERMINAL</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4">
        {/* The blocks do the covering; the page underneath only has to steady
            itself as the stack clears. */}
        <motion.div
          key={shown.pathname}
          initial={{ opacity: 0, filter: 'blur(7px)' }}
          animate={
            phase === 'out'
              ? { opacity: 0.4, filter: 'blur(5px)' }
              : { opacity: 1, filter: 'blur(0px)' }
          }
          transition={{ duration: phase === 'out' ? BLOCKS.cover / 1000 : 0.45 }}
        >
          <Routes location={shown}>
            <Route path="/" element={<Home />} />
            <Route path="/projects/:slug" element={<ProjectPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </main>

      {phase !== 'idle' && (
        <BlockWaterfall key={runId} coverMs={BLOCKS.cover} totalMs={BLOCKS.total} />
      )}
      {bootLoad > 0 && (
        <BlockWaterfall key={`boot-${bootLoad}`} coverMs={BLOCKS.cover} totalMs={BLOCKS.total} />
      )}

      <footer className="mt-20 border-t border-neon/15 py-6 text-center font-mono text-xs text-dim">
        built by janit b · react + fastapi ·{' '}
        <button onClick={reset} className="text-dim underline decoration-dotted hover:text-hot">
          front door
        </button>{' '}
        · <span className="text-hot">EOF</span>
      </footer>
    </>
  )
}

/**
 * The city is bright behind the hero, but text further down needs a calmer
 * background. This dark layer fades in as you scroll.
 */
function ScrollScrim() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const update = () => {
      const amount = Math.min(1, scrollY / (innerHeight * 0.8))
      if (ref.current) ref.current.style.opacity = String(0.25 + amount * 0.6)
    }
    update()
    addEventListener('scroll', update, { passive: true })
    return () => removeEventListener('scroll', update)
  }, [])
  return <div ref={ref} className="pointer-events-none fixed inset-0 -z-[5] bg-void" />
}
