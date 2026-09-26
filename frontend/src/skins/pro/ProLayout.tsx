import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { WARP } from '../../effects/transitions'
import { useRouteSwap } from '../../effects/useRouteSwap'
import { useTryIt } from '../../features/useTryIt'
import { useSkin } from '../../skin/context'
import { useTerminal } from '../../terminal/context'
import ProConsole from './ProConsole'
import ProNotFound from './ProNotFound'
import ProBackdrop from './effects/ProBackdrop'
import Lightspeed from './effects/Lightspeed'
import ProCursor from './effects/ProCursor'
import ProHome from './ProHome'
import ProProjectPage from './ProProjectPage'

const SECTIONS = [
  { hash: '#work', label: 'Work' },
  { hash: '#about', label: 'About' },
  { hash: '#skills', label: 'Skills', menuOnly: true },
  { hash: '#experience', label: 'Experience' },
  { hash: '#contact', label: 'Contact' },
]

/** The professional face of the site. Same routes, same demos, quieter clothes. */
export default function ProLayout() {
  // `shown` lags the URL: the new page is mounted at the peak of the warp,
  // behind the flash, so the swap itself is never visible.
  const { shown, phase, runId } = useRouteSwap(WARP.cover, WARP.total)

  useEffect(() => {
    const t = setTimeout(() => {
      const target = shown.hash && document.querySelector(shown.hash)
      if (target) target.scrollIntoView({ behavior: 'smooth' })
      else window.scrollTo(0, 0)
    }, 60)
    return () => clearTimeout(t)
  }, [shown.pathname, shown.hash])

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <ProBackdrop />
      <ProCursor />
      <ProHeader />
      <ProConsole />

      <main className="mx-auto max-w-5xl px-5 sm:px-6">
        {/* The page is pulled into the warp on the way out and eases back out
            of it on the way in; the overlay covers the cut between the two. */}
        <motion.div
          key={shown.pathname}
          initial={{ opacity: 0, scale: 1.07, filter: 'blur(10px)' }}
          animate={
            phase === 'out'
              ? { opacity: 0.15, scale: 1.16, filter: 'blur(9px)' }
              : { opacity: 1, scale: 1, filter: 'blur(0px)' }
          }
          transition={
            phase === 'out'
              ? { duration: WARP.cover / 1000, ease: [0.7, 0, 0.9, 0.3] }
              : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
          }
        >
          <Routes location={shown}>
            <Route path="/" element={<ProHome />} />
            <Route path="/projects/:slug" element={<ProProjectPage />} />
            <Route path="*" element={<ProNotFound />} />
          </Routes>
        </motion.div>
      </main>

      {phase !== 'idle' && <Lightspeed key={runId} coverMs={WARP.cover} totalMs={WARP.total} />}

      <ProFooter />
    </div>
  )
}

function ProHeader() {
  const { toggle, reset } = useSkin()
  const terminal = useTerminal()
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  // How far down the page you are, smoothed so the bar glides instead of jerking.
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 })

  // The header is invisible at the top of the page and grows a hairline rule
  // once you scroll, so the hero starts on clean paper.
  useEffect(() => {
    const update = () => setScrolled(scrollY > 12)
    update()
    addEventListener('scroll', update, { passive: true })
    return () => removeEventListener('scroll', update)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 bg-paper/75 backdrop-blur-md transition-[border-color,box-shadow] duration-300 ${
        scrolled ? 'border-b border-rule' : 'border-b border-transparent'
      }`}
    >
      <motion.div
        className="pro-progress absolute inset-x-0 bottom-0 h-[3px]"
        style={{ scaleX: progress }}
      />
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 sm:px-6">
        <Link to="/" onClick={() => setMenu(false)} className="gradient-text font-sans text-[16px] font-bold tracking-tight whitespace-nowrap">
          Janit B
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {SECTIONS.filter((s) => !s.menuOnly).map((s) => (
            <NavLink
              key={s.hash}
              to={`/${s.hash}`}
              className="hidden rounded px-2.5 py-1.5 font-sans text-sm text-quiet transition-colors hover:text-ink sm:inline-block"
            >
              {s.label}
            </NavLink>
          ))}

          <button
            onClick={() => terminal.setOpen(!terminal.open)}
            className={`ml-1 rounded-full border px-3.5 py-1.5 font-sans text-sm transition-all sm:px-4 ${
              terminal.open
                ? 'border-transparent bg-gradient-to-r from-coral to-violet text-white shadow-[0_8px_20px_-8px_var(--color-coral)]'
                : 'border-ink/10 bg-card/50 text-ink backdrop-blur hover:border-coral/45 hover:text-coral'
            }`}
            title="Open the console (` key)"
            aria-label="Open the console"
          >
            <span className="font-code">&gt;_</span> <span className="hidden sm:inline">Console</span>
          </button>

          {/* Both ways out of this side: the casual version, and the start
              page where the two are offered side by side. On phones they live
              in the menu, with a sentence each saying where they lead. */}
          <button
            onClick={toggle}
            className="ml-1 hidden rounded-full border border-ink/10 bg-card/50 px-3.5 py-1.5 font-sans text-sm text-ink backdrop-blur transition-all hover:border-violet/45 hover:text-violet sm:inline-block"
            title="Switch to the casual, cyberpunk version of this site"
          >
            Casual view
          </button>

          <button
            onClick={reset}
            className="ml-1 hidden rounded-full border border-ink/10 bg-card/50 px-3.5 py-1.5 font-sans text-sm text-ink backdrop-blur transition-all hover:border-coral/45 hover:text-coral sm:inline-block"
            title="Back to the start page, where both versions are offered"
          >
            Start page
          </button>

          <button
            onClick={() => setMenu(!menu)}
            className="ml-1 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-card/60 px-3.5 py-1.5 font-sans text-sm text-ink backdrop-blur sm:hidden"
            aria-expanded={menu}
            aria-controls="pro-menu"
          >
            <MenuIcon open={menu} />
            {menu ? 'Close' : 'Menu'}
          </button>
        </nav>
      </div>

      <AnimatePresence>{menu && <ProMenu onClose={() => setMenu(false)} />}</AnimatePresence>
    </header>
  )
}

/** Three lines that fold into a cross. */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <span aria-hidden className="relative block h-3 w-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute left-0 block h-[1.5px] w-4 rounded bg-current transition-all duration-300"
          style={{
            top: open ? 5 : i * 5,
            opacity: open && i === 1 ? 0 : 1,
            transform: open ? `rotate(${i === 0 ? 45 : i === 2 ? -45 : 0}deg)` : 'none',
          }}
        />
      ))}
    </span>
  )
}

/**
 * The phone menu. Every way around the site in one place, each with a line
 * saying what it does, so nothing has to be guessed from a one-word label.
 */
function ProMenu({ onClose }: { onClose: () => void }) {
  const { toggle, reset } = useSkin()
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

  const row = 'flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-coral/8'
  const heading = 'px-4 pt-3 pb-1 font-sans text-[11px] tracking-[0.2em] text-quiet uppercase'

  return (
    <>
      {/* tapping anywhere outside the menu closes it */}
      <motion.div
        className="fixed inset-0 top-[3.75rem] z-30 bg-ink/20 backdrop-blur-[2px] sm:hidden"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        id="pro-menu"
        className="absolute inset-x-3 top-full z-40 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-rule bg-card/95 p-2 shadow-[0_24px_60px_-20px_rgb(27_23_38/0.35)] backdrop-blur-md sm:hidden"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        <p className={heading}>On this page</p>
        <div className="grid grid-cols-2 gap-1">
          {SECTIONS.map((s) => (
            <Link key={s.hash} to={`/${s.hash}`} onClick={onClose} className="rounded-xl px-4 py-2.5 font-sans text-[15px] text-ink hover:bg-coral/8">
              {s.label}
            </Link>
          ))}
        </div>

        <p className={`${heading} mt-2 border-t border-rule`}>Try something</p>
        <button onClick={then(runDemo)} className={row}>
          <span>
            <span className="block font-sans text-[15px] font-medium text-ink">{canRunQuick ? 'Run a live AI model' : 'Open a demo'}</span>
            <span className="block font-sans text-xs text-quiet">One tap, a sample photo, a real result</span>
          </span>
          <span className="text-coral">&rarr;</span>
        </button>
        <button onClick={then(openTerminal)} className={row}>
          <span>
            <span className="block font-sans text-[15px] font-medium text-ink">Open the console</span>
            <span className="block font-sans text-xs text-quiet">A command line built into the site</span>
          </span>
          <span className="font-code text-violet">&gt;_</span>
        </button>

        <p className={`${heading} mt-2 border-t border-rule`}>Other versions</p>
        <button onClick={then(toggle)} className={row}>
          <span>
            <span className="block font-sans text-[15px] font-medium text-ink">Casual view</span>
            <span className="block font-sans text-xs text-quiet">Same work as a neon cyberpunk city, with a tour guide</span>
          </span>
          <span className="text-violet">&rarr;</span>
        </button>
        <button onClick={then(reset)} className={row}>
          <span>
            <span className="block font-sans text-[15px] font-medium text-ink">Start page</span>
            <span className="block font-sans text-xs text-quiet">Back to where you chose between the two versions</span>
          </span>
          <span className="text-quiet">&#8617;</span>
        </button>
      </motion.div>
    </>
  )
}

function ProFooter() {
  const { toggle, reset } = useSkin()
  return (
    <footer className="border-t border-rule bg-paper/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-7 font-sans text-sm text-quiet sm:px-6">
        <p>© {new Date().getFullYear()} Janit B · Built with React and FastAPI.</p>
        <div className="flex items-center gap-4">
          <button onClick={toggle} className="rule-grow text-quiet transition-colors hover:text-coral">
            View the casual version
          </button>
          <button
            onClick={reset}
            className="rule-grow text-quiet transition-colors hover:text-violet"
            title="Back to the start page, where both versions are offered"
          >
            Start page
          </button>
        </div>
      </div>
    </footer>
  )
}
