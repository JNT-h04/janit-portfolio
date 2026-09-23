import { motion, useScroll, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { WARP } from '../../effects/transitions'
import { useRouteSwap } from '../../effects/useRouteSwap'
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
        <Link to="/" className="gradient-text font-sans text-[16px] font-bold tracking-tight whitespace-nowrap">
          Janit B
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {SECTIONS.map((s) => (
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
            className={`ml-1 rounded-full border px-4 py-1.5 font-sans text-sm transition-all ${
              terminal.open
                ? 'border-transparent bg-gradient-to-r from-coral to-violet text-white shadow-[0_8px_20px_-8px_var(--color-coral)]'
                : 'border-ink/10 bg-card/50 text-ink backdrop-blur hover:border-coral/45 hover:text-coral'
            }`}
            title="Open the console (` key)"
          >
            <span className="font-code">&gt;_</span> <span className="hidden sm:inline">Console</span>
          </button>

          {/* Both ways out of this side, at every width: the casual version,
              and the front door where the two are offered side by side. */}
          <button
            onClick={toggle}
            className="ml-1 rounded-full border border-ink/10 bg-card/50 px-3.5 py-1.5 font-sans text-sm text-ink backdrop-blur transition-all hover:border-violet/45 hover:text-violet"
            title="Switch to the casual version of this site"
          >
            Casual view
          </button>

          <button
            onClick={reset}
            className="ml-1 rounded-full border border-ink/10 bg-card/50 px-3.5 py-1.5 font-sans text-sm text-ink backdrop-blur transition-all hover:border-coral/45 hover:text-coral"
            title="Back to the front door, where both versions are offered"
          >
            Front door
          </button>
        </nav>
      </div>
    </header>
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
          <button onClick={reset} className="rule-grow text-quiet transition-colors hover:text-violet">
            Front door
          </button>
        </div>
      </div>
    </footer>
  )
}
