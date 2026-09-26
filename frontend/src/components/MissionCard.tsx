import { demoState } from '../data/projects'
import { motion } from 'framer-motion'
import { useRef, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from '../data/projects'

const THREAT_COLOR = { LOW: 'text-acid', MED: 'text-neon', HIGH: 'text-hot' } as const

/** A project card that tilts in 3D towards the mouse and links to the project's page. */
export default function MissionCard({ project, index }: { project: Project; index: number }) {
  const ref = useRef<HTMLDivElement>(null)

  // Mouse position inside the card (-0.5..0.5) becomes a small rotation.
  const onMove = (e: MouseEvent) => {
    const el = ref.current!
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(700px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`
    el.style.setProperty('--mx', `${(x + 0.5) * 100}%`)
    el.style.setProperty('--my', `${(y + 0.5) * 100}%`)
  }
  const onLeave = () => {
    ref.current!.style.transform = ''
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.12, duration: 0.5 }}
    >
      <Link to={`/projects/${project.slug}`} className="group block">
        <div
          ref={ref}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className="hud-panel h-full p-6 transition-transform duration-150 ease-out"
          style={{
            backgroundImage:
              'radial-gradient(circle at var(--mx,50%) var(--my,50%), rgb(255 42 109 / 0.16), transparent 45%)',
          }}
        >
          <div className="flex items-center justify-between font-mono text-xs tracking-widest">
            <span className="text-dim">MISSION_{String(index + 1).padStart(2, '0')}</span>
            <span className={demoState(project) === 'live' ? 'text-acid' : 'text-dim'}>
              {{ live: '● ONLINE', offline: '○ OFFLINE', 'local-only': '○ RUNS LOCALLY' }[demoState(project)]}
            </span>
          </div>
          <h3 className="mt-4 font-display text-2xl font-bold text-neon group-hover:text-glow">{project.codename}</h3>
          <p className="font-mono text-sm text-text/70">{project.title}</p>
          <p className="mt-3 leading-snug text-text/85">{project.tagline}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {project.stack.map((s) => (
              <span key={s} className="border border-neon/30 px-2 py-0.5 font-mono text-xs text-neon/80">
                {s}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between font-mono text-xs">
            <span>
              LOAD: <span className={THREAT_COLOR[project.threat]}>{project.threat}</span>
            </span>
            <span className="text-hot transition-transform group-hover:translate-x-1">
              {demoState(project) === 'live' ? 'TRY IT LIVE' : 'OPEN FILE'} &gt;&gt;
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
