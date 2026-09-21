import { useRef, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from '../../../data/projects'
import { COMPLEXITY } from './labels'
import Reveal from './Reveal'

export default function ProjectCard({ project, index }: { project: Project; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null)

  // The cyberpunk card tilts in 3D towards the mouse. This one does the quiet
  // version: a soft pool of light follows the cursor across the card.
  const onMove = (e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    // a small tilt towards the cursor, the quiet cousin of the cyberpunk card
    el.style.transform = `perspective(900px) rotateY(${(px - 0.5) * 7}deg) rotateX(${-(py - 0.5) * 7}deg) translateY(-6px)`
  }

  const onLeave = () => {
    const el = ref.current
    if (el) el.style.transform = ''
  }

  return (
    <Reveal delay={index * 0.08}>
      <Link
        ref={ref}
        to={`/projects/${project.slug}`}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="paper-card paper-card-hover group relative flex h-full flex-col overflow-hidden p-6 transition-transform duration-300 ease-out focus:outline-none"
      >
        {/* the spotlight; invisible until the pointer is over the card */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            backgroundImage:
              'radial-gradient(460px circle at var(--mx,50%) var(--my,50%), color-mix(in srgb, var(--color-amber) 22%, transparent), transparent 62%)',
          }}
        />
        {/* a hairline that fills with colour on hover */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-coral via-amber to-violet transition-transform duration-500 group-hover:scale-x-100"
        />

        <div className="relative flex items-center justify-between">
          <span
            className="tone-chip rounded-full px-2.5 py-1 font-code text-[10px] tracking-widest uppercase"
            style={{ ['--tone' as string]: 'var(--color-violet)' }}
          >
            {project.codename}
          </span>
          <span className="inline-flex items-center gap-1.5 font-sans text-xs text-quiet">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                project.online
                  ? 'bg-jade shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-jade)_18%,transparent)]'
                  : 'bg-quiet/40'
              }`}
            />
            {project.online ? 'Live demo' : 'In progress'}
          </span>
        </div>

        <h3 className="relative mt-3 font-serif text-[24px] leading-snug font-semibold text-ink transition-colors duration-300 group-hover:text-coral">
          {project.title}
        </h3>
        <p className="relative mt-2 flex-1 font-sans text-[15px] leading-relaxed text-quiet">{project.tagline}</p>

        <div className="relative mt-5 flex flex-wrap gap-1.5">
          {project.stack.map((tech, n) => (
            <span
              key={tech}
              className="tone-chip rounded-full px-2.5 py-1 font-sans text-xs"
              style={{
                ['--tone' as string]: ['var(--color-coral)', 'var(--color-amber)', 'var(--color-violet)'][n % 3],
              }}
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="relative mt-5 flex items-center justify-between border-t border-rule pt-4 font-sans text-sm">
          <span className="text-quiet">{COMPLEXITY[project.threat]}</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-coral">
            View case study
            <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
          </span>
        </div>
      </Link>
    </Reveal>
  )
}
