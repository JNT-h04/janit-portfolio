import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
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
import { startNovaTour, useTryIt } from '../../features/useTryIt'
import { useSkin } from '../../skin/context'
import { useTerminal } from '../../terminal/context'
import TerminalDock from '../../terminal/TerminalDock'

// NOVA arrives seconds after the page anyway, so it loads as its own chunk
// instead of weighing down the first paint.
const UfoGuide = lazy(() => import('./ufo/UfoGuide'))

/** The cyberpunk face of the site: neon city, CRT overlay, glitch and a terminal. */
export default function CyberLayout() {
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
      <Suspense fallback={null}>
        <UfoGuide />
      </Suspense>

      <CyberNav />

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
        <button
          onClick={reset}
          className="text-dim underline decoration-dotted hover:text-hot"
          title="back to the start page, where both versions are offered"
        >
          start page
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

const SECTIONS = [
  { hash: '#missions', label: 'missions', hint: 'the four live projects' },
  { hash: '#operator', label: 'operator', hint: 'about me' },
  { hash: '#loadout', label: 'loadout', hint: 'skills and tools' },
  { hash: '#contact', label: 'contact', hint: 'send a message' },
  { hash: '#experience', label: 'experience', hint: 'internship' },
]

function CyberNav() {
  const terminal = useTerminal()
  const { reset } = useSkin()
  const [menu, setMenu] = useState(false)

  return (
    <nav className="sticky top-0 z-40 border-b border-neon/15 bg-void/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 font-mono text-xs sm:text-sm">
        <Link to="/" onClick={() => setMenu(false)} className="shrink-0 font-display font-bold tracking-wider text-neon sm:tracking-widest">
          JANIT<span className="text-hot">://</span>SYS
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
          <Link to="/#missions" className="hidden hover:text-neon sm:inline">missions</Link>
          <Link to="/#operator" className="hidden hover:text-neon sm:inline">operator</Link>
          <Link to="/#experience" className="hidden hover:text-neon lg:inline">experience</Link>
          <Link to="/#contact" className="hidden hover:text-neon sm:inline">contact</Link>
          {/* No link to the professional side from here on purpose: the two
              versions are offered together at the start page. */}
          <button
            onClick={reset}
            className="hidden text-dim transition-colors hover:text-hot sm:inline"
            title="back to the start page, where both versions are offered"
          >
            [start page]
          </button>
          <button
            onClick={() => terminal.setOpen(!terminal.open)}
            className={`flex items-center gap-2 border px-2 py-1 tracking-widest sm:px-3 transition-colors ${
              terminal.open ? 'border-acid bg-acid text-void' : 'border-acid text-acid hover:bg-acid hover:text-void'
            }`}
            title="toggle terminal (` key)"
            aria-label="toggle terminal"
          >
            <span className="font-bold">&gt;_</span>
            <span className="hidden sm:inline">TERMINAL</span>
          </button>
          <button
            onClick={() => setMenu(!menu)}
            className={`border px-2.5 py-1 tracking-widest transition-colors sm:hidden ${
              menu ? 'border-hot bg-hot text-void' : 'border-neon/60 text-neon'
            }`}
            aria-expanded={menu}
            aria-controls="sys-menu"
          >
            {menu ? '[x] CLOSE' : '[=] MENU'}
          </button>
        </div>
      </div>

      <AnimatePresence>{menu && <CyberMenu onClose={() => setMenu(false)} />}</AnimatePresence>
    </nav>
  )
}

/**
 * The phone menu, as a HUD panel. Each entry says in plain words where it
 * goes, because 'operator' and 'loadout' mean nothing to someone new.
 */
function CyberMenu({ onClose }: { onClose: () => void }) {
  const { reset } = useSkin()
  const { runDemo, canRunQuick, openTerminal } = useTryIt()
  const then = (fn: () => void) => () => {
    onClose()
    fn()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  const heading = 'px-3 pt-3 pb-1 text-[10px] tracking-[0.3em] text-hot'
  const row = 'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-neon/10'

  return (
    <>
      <motion.div
        className="fixed inset-0 top-[3.3rem] z-30 bg-void/60 sm:hidden"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        id="sys-menu"
        className="absolute inset-x-2 top-full z-40 mt-1 max-h-[calc(100dvh-4.5rem)] overflow-y-auto border border-neon/40 bg-void/95 p-2 font-mono text-sm shadow-[0_0_40px_rgb(0_240_255/0.15)] sm:hidden"
        initial={{ opacity: 0, y: -8, clipPath: 'inset(0 0 100% 0)' }}
        animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22 }}
      >
        <p className={heading}>// JUMP TO</p>
        {SECTIONS.map((s) => (
          <Link key={s.hash} to={`/${s.hash}`} onClick={onClose} className={row}>
            <span className="text-neon">&gt; {s.label}</span>
            <span className="text-xs text-dim">{s.hint}</span>
          </Link>
        ))}

        <p className={`${heading} mt-1 border-t border-neon/15`}>// TRY SOMETHING</p>
        <button onClick={then(runDemo)} className={row}>
          <span className="text-acid">&#9654; {canRunQuick ? 'run a live AI model' : 'open a demo'}</span>
          <span className="text-xs text-dim">one tap, real result</span>
        </button>
        <button onClick={then(startNovaTour)} className={row}>
          <span className="text-acid">&#9654; take the guided tour</span>
          <span className="text-xs text-dim">NOVA, the talking drone</span>
        </button>
        <button onClick={then(openTerminal)} className={row}>
          <span className="text-acid">&gt;_ open the terminal</span>
          <span className="text-xs text-dim">type help</span>
        </button>

        <p className={`${heading} mt-1 border-t border-neon/15`}>// VERSION</p>
        <button onClick={then(reset)} className={row}>
          <span className="text-text">&#8617; start page</span>
          <span className="text-xs text-dim">pick a different version</span>
        </button>
      </motion.div>
    </>
  )
}
