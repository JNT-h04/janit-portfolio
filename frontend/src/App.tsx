import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import BootScreen from './effects/BootScreen'
import Cursor from './effects/Cursor'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import ProjectPage from './pages/ProjectPage'

export default function App() {
  const location = useLocation()

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
      <div className="bg-grid" />
      <div className="crt" />
      <Cursor />
      <BootScreen />

      <nav className="sticky top-0 z-40 border-b border-neon/15 bg-void/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 font-mono text-sm">
          <Link to="/" className="font-display font-bold tracking-widest text-neon">
            JANIT<span className="text-hot">://</span>SYS
          </Link>
          <div className="flex gap-5">
            <Link to="/#missions" className="hover:text-neon">missions</Link>
            <Link to="/#operator" className="hover:text-neon">operator</Link>
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
        built by janit b · react + fastapi · <span className="text-hot">EOF</span>
      </footer>
    </>
  )
}
