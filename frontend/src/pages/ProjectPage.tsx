import { Link, useParams } from 'react-router-dom'
import GlitchText from '../components/GlitchText'
import HudPanel from '../components/HudPanel'
import { findProject } from '../data/projects'
import NotFound from './NotFound'

// Each project will get its own demo component here (phase 4 onward).
export default function ProjectPage() {
  const { slug = '' } = useParams()
  const project = findProject(slug)
  if (!project) return <NotFound />

  return (
    <div className="py-12">
      <Link to="/" className="font-mono text-sm text-dim hover:text-neon">
        &lt;&lt; RETURN TO BASE
      </Link>
      <p className="mt-8 font-mono text-sm tracking-[0.3em] text-hot">MISSION FILE · {project.title}</p>
      <GlitchText as="h1" text={project.codename} className="mt-2 font-display text-5xl font-black text-neon text-glow sm:text-7xl" />
      <p className="mt-4 max-w-2xl text-xl">{project.tagline}</p>

      <HudPanel title="LIVE MODULE" tag="OFFLINE" className="mt-10">
        <p className="font-display text-2xl text-hot">MODULE NOT YET DEPLOYED</p>
        <p className="mt-2 font-mono text-dim">The working demo for {project.codename} is still being built.</p>
      </HudPanel>
    </div>
  )
}
