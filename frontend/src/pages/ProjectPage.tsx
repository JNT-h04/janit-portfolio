import { useEffect, type ComponentType } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import GlitchText from '../components/GlitchText'
import HudPanel from '../components/HudPanel'
import DemoUnavailable from '../components/DemoUnavailable'
import { demoState, findProject } from '../data/projects'
import CortexDemo from '../projects/cortex/CortexDemo'
import EchoDemo from '../projects/echo/EchoDemo'
import FractureDemo from '../projects/fracture/FractureDemo'
import LexiconDemo from '../projects/lexicon/LexiconDemo'
import { useTerminal } from '../terminal/context'
import NotFound from './NotFound'

// The working demo for each project. Projects missing here show "not yet deployed".
const DEMOS: Record<string, ComponentType> = {
  'book-summarizer': LexiconDemo,
  'crack-severity': FractureDemo,
  'alzheimer-xai': CortexDemo,
  'meeting-assistant': EchoDemo,
}

export default function ProjectPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const terminal = useTerminal()
  const project = findProject(slug)

  // The button says ESC, so ESC has to work. Not while the terminal is open
  // (Escape closes that first) and not while something is being typed into.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || terminal.open) return
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      navigate('/')
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [navigate, terminal.open])

  if (!project) return <NotFound />
  const Demo = DEMOS[project.slug]
  const state = demoState(project)

  return (
    <div className="py-12">
      {/* The city behind this page is bright and busy, so the way back cannot
          be dim text on it — it is a lit HUD control with its own dark pane. */}
      <Link to="/" className="hud-back group">
        <span className="hud-back-arrow">&lt;&lt;</span>
        <span>RETURN TO BASE</span>
        <span className="hud-back-key">ESC</span>
      </Link>
      <p className="mt-8 font-mono text-sm tracking-[0.3em] text-hot">MISSION FILE · {project.title}</p>
      <GlitchText as="h1" text={project.codename} className="mt-2 font-display text-5xl font-black text-neon text-glow sm:text-7xl" />
      <p className="mt-4 max-w-2xl text-xl">{project.tagline}</p>

      {Demo && state === 'live' ? (
        <Demo />
      ) : Demo ? (
        <DemoUnavailable
          slug={project.slug}
          theme="crt"
          reason={state === 'local-only' ? 'no-backend' : 'switched-off'}
        />
      ) : (
        <HudPanel title="LIVE MODULE" tag="OFFLINE" className="mt-10">
          <p className="font-display text-2xl text-hot">MODULE NOT YET DEPLOYED</p>
          <p className="mt-2 font-mono text-dim">The working demo for {project.codename} is still being built.</p>
        </HudPanel>
      )}
    </div>
  )
}
