import { motion } from 'framer-motion'
import { useProfile, type Profile } from '../api/profile'
import { useContactForm } from '../contact/useContactForm'
import portraitCasual from '../assets/portrait-casual.jpeg'
import BinaryPortrait from '../effects/BinaryPortrait'
import HudPanel from './HudPanel'

/**
 * The "about me" half of the home page: the operator file, the loadout, a way
 * to get in touch, and the service record. All of it comes from the backend
 * (GET /api/profile), so the site never hardcodes the CV: edit the JSON and the
 * page follows.
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
          </HudPanel>

          <div className="space-y-6">
            <HudPanel title="ID CARD" tag="● LIVE FEED">
              {/* The operator, reconstructed from the signal. */}
              <figure className="mb-5">
                <div className="relative overflow-hidden border border-neon/25 bg-[#02100a]">
                  <BinaryPortrait src={portraitCasual} className="block w-full" />
                  {/* the glass of the tube */}
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(0_0_0/0.65)_100%)]" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-2 py-1 font-mono text-[10px] tracking-widest text-acid">
                    <span>SUBJECT: JANIT_B</span>
                    <span className="blink">REC</span>
                  </div>
                </div>
                <figcaption className="mt-2 font-mono text-[11px] text-dim">
                  // 1-BIT RECONSTRUCTION · SIGNAL UNSTABLE
                </figcaption>
              </figure>

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

          </div>
        </div>
      </section>

      <section id="loadout" className="scroll-mt-20 py-16">
        <h2 className="mb-8 font-display text-3xl font-bold tracking-widest">
          <span className="text-hot">03.</span> LOADOUT
        </h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {p.skills.map((group) => (
            <HudPanel key={group.group} title={group.group.toUpperCase()}>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="border border-neon/25 bg-neon/[0.04] px-2 py-1 font-mono text-xs text-text/85 transition-colors hover:border-neon/60 hover:text-neon"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </HudPanel>
          ))}
        </div>
      </section>

      <section id="experience" className="scroll-mt-20 py-16">
        <h2 className="mb-8 font-display text-3xl font-bold tracking-widest">
          <span className="text-hot">04.</span> EXPERIENCE
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
      <ContactSection profile={p} />

    </>
  )
}

/** Links plus a form that hands the message to the visitor's own mail app. */
function ContactSection({ profile }: { profile: Profile }) {
  const f = useContactForm(profile)
  const field =
    'w-full border border-neon/30 bg-void/60 px-3 py-2 font-mono text-sm text-text outline-none transition-colors placeholder:text-dim focus:border-neon'

  return (
    <section id="contact" className="scroll-mt-20 py-16">
      <h2 className="mb-8 font-display text-3xl font-bold tracking-widest">
        <span className="text-hot">05.</span> CONTACT
      </h2>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <HudPanel title="CHANNELS" tag="● OPEN">
          <p className="text-text/85">
            Open to internships and new-grad roles. Happy to walk through any mission on this site, including the
            parts that did not work.
          </p>

          <div className="mt-6 space-y-2 font-mono text-sm">
            {profile.links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between border border-neon/20 px-3 py-2 transition-colors hover:border-hot hover:bg-hot/5"
              >
                <span className="text-dim">{l.label}</span>
                <span className="text-neon">
                  {l.url.replace(/^mailto:|^https?:\/\//, '')} <span className="text-hot">&gt;&gt;</span>
                </span>
              </a>
            ))}
          </div>

          {f.address && (
            <button
              onClick={f.copyAddress}
              className="mt-4 w-full border border-acid/50 px-3 py-2 font-mono text-sm text-acid transition-colors hover:bg-acid hover:text-void"
            >
              {f.copied ? '✓ COPIED TO CLIPBOARD' : 'COPY EMAIL ADDRESS'}
            </button>
          )}
        </HudPanel>

        <HudPanel title="TRANSMIT" tag={f.opened ? '● HANDED OFF' : 'COMPOSE'}>
          {f.opened ? (
            <div className="py-6 text-center">
              <p className="font-display text-2xl text-acid text-glow">MESSAGE COMPOSED</p>
              <p className="mt-3 font-mono text-sm text-dim">
                your mail app should have opened with it ready to send.
              </p>
              <button
                onClick={f.reset}
                className="mt-6 border border-neon px-4 py-1.5 font-mono text-sm text-neon hover:bg-neon hover:text-void"
              >
                WRITE ANOTHER
              </button>
            </div>
          ) : (
            <form onSubmit={f.submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="font-mono text-xs tracking-widest text-dim">CALLSIGN</span>
                  <input
                    className={`${field} mt-1`}
                    value={f.name}
                    onChange={(e) => f.setName(e.target.value)}
                    placeholder="your name"
                  />
                  {f.touched && f.problems.name && (
                    <span className="mt-1 block font-mono text-xs text-hot">{f.problems.name}</span>
                  )}
                </label>
                <label className="block">
                  <span className="font-mono text-xs tracking-widest text-dim">RETURN ADDRESS</span>
                  <input
                    className={`${field} mt-1`}
                    value={f.from}
                    onChange={(e) => f.setFrom(e.target.value)}
                    placeholder="you@company.com"
                  />
                  {f.touched && f.problems.from && (
                    <span className="mt-1 block font-mono text-xs text-hot">{f.problems.from}</span>
                  )}
                </label>
              </div>

              <label className="block">
                <span className="font-mono text-xs tracking-widest text-dim">MESSAGE</span>
                <textarea
                  rows={6}
                  className={`${field} mt-1 resize-y`}
                  value={f.message}
                  onChange={(e) => f.setMessage(e.target.value)}
                  placeholder="what would you like to talk about?"
                />
                {f.touched && f.problems.message && (
                  <span className="mt-1 block font-mono text-xs text-hot">{f.problems.message}</span>
                )}
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-xs text-dim">
                  // opens your own mail app with this typed in
                </p>
                <button
                  type="submit"
                  className="border border-acid bg-acid/10 px-5 py-2 font-mono text-acid shadow-[0_0_18px_rgb(209_247_0/0.25)] transition-colors hover:bg-acid hover:text-void"
                >
                  &gt;_ TRANSMIT
                </button>
              </div>
            </form>
          )}
        </HudPanel>
      </div>
    </section>
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
