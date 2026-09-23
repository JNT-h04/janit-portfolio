import type { ComponentType } from 'react'
import { Link, useParams } from 'react-router-dom'
import { findProject, demoState } from '../../data/projects'
import ProNotFound from './ProNotFound'
import { COMPLEXITY } from './components/labels'
import Reveal from './components/Reveal'
import DemoUnavailable from '../../components/DemoUnavailable'
import CortexPanel from './demos/CortexPanel'
import EchoPanel from './demos/EchoPanel'
import FracturePanel from './demos/FracturePanel'
import LexiconPanel from './demos/LexiconPanel'

// The same four demos the cyberpunk side has, in professional clothes. Both
// versions call the same hooks in src/projects, so neither can fall behind.
const PANELS: Record<string, ComponentType> = {
  'book-summarizer': LexiconPanel,
  'crack-severity': FracturePanel,
  'alzheimer-xai': CortexPanel,
  'meeting-assistant': EchoPanel,
}

export default function ProProjectPage() {
  const { slug = '' } = useParams()
  const project = findProject(slug)
  if (!project) return <ProNotFound />
  const Panel = PANELS[project.slug]
  const state = demoState(project)

  return (
    <article className="py-12">
      <Link
        to="/#work"
        className="inline-flex items-center gap-1.5 font-sans text-sm text-quiet transition-colors hover:text-coral"
      >
        <span aria-hidden>&larr;</span> All projects
      </Link>

      <header className="mt-8 border-b border-rule pb-8">
        <p className="font-sans text-xs tracking-[0.25em] text-quiet uppercase">
          Case study · <span className="font-code tracking-normal">{project.codename}</span>
        </p>
        <h1 className="mt-3 font-serif text-[clamp(2rem,5vw,3rem)] leading-tight text-ink">{project.title}</h1>
        <p className="mt-4 max-w-2xl font-sans text-[17px] leading-[1.7] text-quiet">{project.tagline}</p>

        <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
          <Fact label="Status">
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${project.online ? 'bg-coral' : 'bg-quiet/50'}`} />
              {{ live: 'Live demo below', offline: 'Demo offline', 'local-only': 'Runs locally' }[state]}
            </span>
          </Fact>
          <Fact label="Compute">{COMPLEXITY[project.threat]}</Fact>
          <Fact label="Built with">
            <span className="flex flex-wrap gap-1.5">
              {project.stack.map((s) => (
                <span key={s} className="rounded border border-rule bg-card px-2 py-0.5 text-xs text-quiet">
                  {s}
                </span>
              ))}
            </span>
          </Fact>
        </dl>
      </header>

      <section className="mt-10">
        <Reveal>
          <h2 className="mb-1 font-serif text-2xl text-ink">{state === 'live' ? 'Try it' : 'The demo'}</h2>
          <p className="mb-6 max-w-2xl font-sans text-[15px] leading-relaxed text-quiet">
            {state === 'live'
              ? 'This is the real system, running against the same backend. Use your own file, or pick one of the provided samples.'
              : 'The demo takes your own file and runs the real model on it — it is not a recording. It needs the API running, which this copy of the site does not have.'}
          </p>
        </Reveal>

        {Panel && state !== 'live' ? (
          <DemoUnavailable
            slug={project.slug}
            theme="paper"
            reason={state === 'local-only' ? 'no-backend' : 'switched-off'}
          />
        ) : Panel ? (
          <Panel />
        ) : (
          <div className="paper-card p-8 text-center">
            <p className="font-serif text-xl text-ink">The demo is still being built.</p>
            <p className="mt-2 font-sans text-sm text-quiet">
              {project.title} does not have a working demo on this site yet.
            </p>
          </div>
        )}
      </section>
    </article>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-sans text-xs tracking-widest text-quiet uppercase">{label}</dt>
      <dd className="mt-1.5 font-sans text-sm text-ink">{children}</dd>
    </div>
  )
}
