import { motion } from 'framer-motion'
import { useProfile } from '../api/profile'
import HudPanel from './HudPanel'

/**
 * The "about me" half of the home page: the bio, skills, experience and
 * contact links. All of it comes from the backend (GET /api/profile), so the
 * site never hardcodes the CV: edit the JSON and the page follows.
 */
export default function OperatorFile() {
  const state = useProfile()

  if (state.status === 'loading') {
    return (
      <HudPanel title="OPERATOR" tag="SYNCING">
        <p className="font-mono text-neon">
          establishing uplink<span className="blink">_</span>
        </p>
      </HudPanel>
    )
  }

  if (state.status === 'offline') {
    return (
      <HudPanel title="OPERATOR" tag="NO SIGNAL">
        <p className="font-display text-3xl text-hot text-glow">NO SIGNAL</p>
        <p className="mt-2 font-mono text-sm text-dim">backend uplink failed: {state.error}</p>
        <p className="mt-1 font-mono text-sm text-dim">→ start the backend, then reload</p>
      </HudPanel>
    )
  }

  const p = state.profile

  return (
    <>
      <section id="operator" className="scroll-mt-20 py-16">
        <h2 className="mb-8 font-display text-3xl font-bold tracking-widest">
          <span className="text-hot">02.</span> OPERATOR
        </h2>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <HudPanel title="ABOUT" tag="● LINKED">
            <p className="border-l-2 border-hot pl-4 font-display text-xl text-neon">“{p.tagline}”</p>
            {p.about.map((para) => (
              <p key={para} className="mt-4 text-lg leading-relaxed text-text/90">
                {para}
              </p>
            ))}

            <ul className="mt-6 space-y-2">
              {p.highlights.map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex gap-3"
                >
                  <span className="text-acid">▸</span>
                  <span className="text-text/85">{line}</span>
                </motion.li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-4 font-mono text-sm">
              {p.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-hot hover:text-glow">
                  [{l.label}]
                </a>
              ))}
            </div>
          </HudPanel>

          <div className="space-y-6">
            <HudPanel title="ID CARD">
              <dl className="space-y-3 font-mono text-sm">
                <Row label="NAME" value={p.name} />
                <Row label="ROLE" value={p.role} />
                <Row label="BASE" value={p.location} />
                {p.education.map((e) => (
                  <Row key={e.school} label="STUDY" value={`${e.degree}, ${e.school} · ${e.period}`} />
                ))}
                {p.certifications.map((c) => (
                  <Row key={c} label="CERT" value={c} />
                ))}
              </dl>
            </HudPanel>

            <HudPanel title="LOADOUT" tag="SKILLS">
              <div className="space-y-4">
                {p.skills.map((group) => (
                  <div key={group.group}>
                    <p className="font-mono text-xs tracking-widest text-hot">{group.group.toUpperCase()}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <span key={item} className="border border-neon/30 bg-neon/5 px-2 py-0.5 font-mono text-xs text-neon/90">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </HudPanel>
          </div>
        </div>
      </section>

      <section id="experience" className="scroll-mt-20 py-16">
        <h2 className="mb-8 font-display text-3xl font-bold tracking-widest">
          <span className="text-hot">03.</span> EXPERIENCE
        </h2>

        <div className="space-y-6">
          {p.experience.map((job) => (
            <HudPanel key={job.company} title={job.period.toUpperCase()} tag={job.location?.toUpperCase()}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-2xl text-neon">{job.title}</h3>
                {job.url ? (
                  <a href={job.url} target="_blank" rel="noreferrer" className="font-mono text-hot hover:text-glow">
                    {job.company} ↗
                  </a>
                ) : (
                  <span className="font-mono text-hot">{job.company}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-text/70">{job.about}</p>

              <ul className="mt-4 space-y-2">
                {job.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span className="text-acid">▸</span>
                    <span className="text-text/90">{point}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                {job.stack.map((tech) => (
                  <span key={tech} className="border border-hot/30 px-2 py-0.5 font-mono text-xs text-hot/90">
                    {tech}
                  </span>
                ))}
              </div>
            </HudPanel>
          ))}
        </div>
      </section>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[58px_1fr] gap-3">
      <dt className="text-dim">{label}</dt>
      <dd className="text-text/90">{value}</dd>
    </div>
  )
}
