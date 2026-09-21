import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import BootScreen from '../../effects/BootScreen'
import Cursor from '../../effects/Cursor'
import CyberCity from '../../effects/CyberCity'
import Home from '../../pages/Home'
import NotFound from '../../pages/NotFound'
import ProjectPage from '../../pages/ProjectPage'
import { useSkin } from '../../skin/context'
import { useTerminal } from '../../terminal/context'
import TerminalDock from '../../terminal/TerminalDock'

/** The cyberpunk face of the site: neon city, CRT overlay, glitch and a terminal. */
export default function CyberLayout() {
  const location = useLocation()
  const terminal = useTerminal()
  const { toggle } = useSkin()

  // React Router doesn't scroll for you. Go to the #section if there is one,
  // otherwise to the top. The wait lets the page-change animation finish first.
  useEffect(() => {
    const t = setTimeout(() => {
      const target = location.hash && document.querySelector(location.hash)
      if (target) target.scrollIntoView({ behavior: 'smooth' })
      else window.scrollTo(0, 0)
    }, 350)
    return () => clearTimeout(t)
  }, [location.pathname, location.hash])

  return (
    <>
      <CyberCity variant="sunset" />
      <ScrollScrim />
      <div className="crt" />
      <Cursor />
      <BootScreen />
      <TerminalDock />

      <nav className="sticky top-0 z-40 border-b border-neon/15 bg-void/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 font-mono text-sm">
          <Link to="/" className="font-display font-bold tracking-widest text-neon">
            JANIT<span className="text-hot">://</span>SYS
          </Link>
          <div className="flex items-center gap-5">
            <Link to="/#missions" className="hover:text-neon">missions</Link>
            <Link to="/#operator" className="hover:text-neon">operator</Link>
            <Link to="/#experience" className="hidden hover:text-neon lg:inline">experience</Link>
            <Link to="/#contact" className="hover:text-neon">contact</Link>
            <button
              onClick={toggle}
              className="hidden text-dim transition-colors hover:text-text sm:inline"
              title="switch to the professional layout"
            >
              [recruiter view]
            </button>
            <button
              onClick={() => terminal.setOpen(!terminal.open)}
              className={`flex items-center gap-2 border px-3 py-1 tracking-widest transition-colors ${
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
        {/* Keying on the path makes every route change play the exit/enter animation. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, filter: 'blur(6px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(6px)' }}
            transition={{ duration: 0.3 }}
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/projects/:slug" element={<ProjectPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-20 border-t border-neon/15 py-6 text-center font-mono text-xs text-dim">
        built by janit b · react + fastapi ·{' '}
        <button onClick={toggle} className="text-dim underline decoration-dotted hover:text-neon">
          professional layout
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
