import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import portraitPro from '../../assets/portrait-pro.png'
import { RESUME_FILE, RESUME_URL } from '../../data/resume'
import { useProfile, type Profile } from '../../api/profile'
import Honeypot from '../../contact/Honeypot'
import { useContactForm } from '../../contact/useContactForm'
import { HAS_API } from '../../config'
import { useAudience } from '../../audience/audience'
import { PROJECTS, demoState } from '../../data/projects'
import { useTerminal } from '../../terminal/context'
import CountUp from './components/CountUp'
import Magnetic from './components/Magnetic'
import Marquee from './components/Marquee'
import ProjectCard from './components/ProjectCard'
import Reveal from './components/Reveal'

export default function ProHome() {
  const state = useProfile()
  const profile = state.status === 'online' ? state.profile : null
  const { projects } = useAudience()

  return (
    <>
      <Hero profile={profile} />

      {/* No negative margin on the band: the hero is a full viewport tall and
          the skyline is fixed to the bottom of the viewport, so pulling the
          band up landed the chips on top of the buildings at scroll 0. */}
      {profile && (
        <Reveal className="mt-8 mb-6">
          <Marquee items={profile.skills.flatMap((g) => g.items)} />
        </Reveal>
      )}

      <Section id="work" title="Selected work" number="01">
        <p className="-mt-2 mb-8 max-w-2xl font-sans text-[15px] leading-relaxed text-quiet">
          {!HAS_API
            ? 'Every project below is a working system with an interactive demo — this published copy is the frontend, so the demos run when the API is started alongside it. Results are reported honestly, including where they fall short.'
            : 'Every project below has a demo you can use right now — upload your own file and see what the model says. Results are reported honestly, including where they fall short.'}
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          {projects.map((p, i) => (
            <ProjectCard key={p.slug} project={p} index={i} />
          ))}
        </div>
      </Section>

      {state.status === 'offline' && (
        <p className="paper-card mt-16 p-4 font-sans text-sm text-quiet">
          The profile service is not reachable ({state.error}), so the sections below are empty. Start the
          backend to fill them in.
        </p>
      )}

      {profile && (
        <>
          <Section id="about" title="About" number="02">
            <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4">
                {profile.about.map((para, i) => (
                  <Reveal key={i} delay={i * 0.06}>
                    <p className="font-sans text-[16px] leading-[1.75] text-ink/85">{para}</p>
                  </Reveal>
                ))}

                {/* Every figure here is counted from the real data on this page,
                    not typed in by hand, so none of it can quietly go stale. */}
                <Reveal delay={0.18}>
                  <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat n={PROJECTS.length} label="Projects" tone="var(--color-coral)" />
                    {/* On a build with a backend this counts the demos actually
                        answering; on the frontend-only copy it counts the demos
                        that exist and says where they run. */}
                    <Stat
                      n={!HAS_API ? PROJECTS.length : PROJECTS.filter((p) => demoState(p) === 'live').length}
                      label={!HAS_API ? 'Demos (run locally)' : 'Live demos'}
                      tone="var(--color-amber)"
                    />
                    <Stat
                      n={profile.skills.reduce((t, g) => t + g.items.length, 0)}
                      label="Tools used"
                      tone="var(--color-violet)"
                    />
                    <Stat n={profile.experience.length} label="Internship" tone="var(--color-jade)" />
                  </dl>
                </Reveal>
              </div>
              <Reveal delay={0.1}>
                <div className="paper-card p-5">
                  <h3 className="font-sans text-xs tracking-widest text-quiet uppercase">What I bring</h3>
                  <ul className="mt-4 space-y-3">
                    {profile.highlights.map((h) => (
                      <li key={h} className="flex gap-2.5 font-sans text-sm leading-relaxed text-ink/80">
                        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-coral" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

          </Section>

          <Section id="skills" title="Skills" number="03">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {profile.skills.map((group, i) => (
                <Reveal key={group.group} delay={i * 0.05}>
                  <div className="paper-card h-full p-5">
                    <h3 className="font-sans text-sm font-semibold text-ink">{group.group}</h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {group.items.map((item, n) => (
                        <motion.span
                          key={item}
                          className="tone-chip rounded-full px-2.5 py-1 font-sans text-xs"
                          style={{
                            ['--tone' as string]: [
                              'var(--color-coral)',
                              'var(--color-amber)',
                              'var(--color-violet)',
                            ][(i + n) % 3],
                          }}
                          initial={{ opacity: 0, y: 6 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: '-40px' }}
                          transition={{ duration: 0.35, delay: n * 0.025 }}
                        >
                          {item}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </Section>

          <Section id="experience" title="Experience" number="04">
            <div className="space-y-5">
              {profile.experience.map((job, i) => (
                <Reveal key={job.company} delay={i * 0.06}>
                  <article className="paper-card p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-serif text-xl text-ink">{job.title}</h3>
                      <span className="font-sans text-sm text-quiet">{job.period}</span>
                    </div>
                    <p className="mt-1 font-sans text-[15px] text-ink/80">
                      {job.url ? (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rule-grow font-medium text-coral"
                        >
                          {job.company}
                        </a>
                      ) : (
                        <span className="font-medium">{job.company}</span>
                      )}
                      {job.location && <span className="text-quiet"> · {job.location}</span>}
                    </p>
                    <p className="mt-2 font-sans text-sm leading-relaxed text-quiet">{job.about}</p>
                    <ul className="mt-4 space-y-2">
                      {job.points.map((point) => (
                        <li key={point} className="flex gap-2.5 font-sans text-[15px] leading-relaxed text-ink/85">
                          <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-coral" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {job.stack.map((s) => (
                        <span key={s} className="rounded border border-rule px-2 py-0.5 font-sans text-xs text-quiet">
                          {s}
                        </span>
                      ))}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Reveal>
                <div className="paper-card h-full p-6">
                  <h3 className="font-sans text-xs tracking-widest text-quiet uppercase">Education</h3>
                  {profile.education.map((ed) => (
                    <div key={ed.school} className="mt-4">
                      <p className="font-serif text-lg text-ink">{ed.degree}</p>
                      <p className="mt-0.5 font-sans text-[15px] text-ink/80">{ed.school}</p>
                      <p className="mt-0.5 font-sans text-sm text-quiet">{ed.period}</p>
                      <p className="mt-2 font-sans text-sm leading-relaxed text-quiet">{ed.detail}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={0.06}>
                <div className="paper-card h-full p-6">
                  <h3 className="font-sans text-xs tracking-widest text-quiet uppercase">Certifications</h3>
                  <ul className="mt-4 space-y-2">
                    {profile.certifications.map((c) => (
                      <li key={c} className="flex gap-2.5 font-sans text-[15px] leading-relaxed text-ink/85">
                        <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-coral" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </Section>

          <Section id="contact" title="Contact" number="05">
            <Reveal>
              <ContactForm profile={profile} />
            </Reveal>
            <Reveal delay={0.08}>
              <div className="paper-card mt-5 flex flex-wrap items-center justify-between gap-5 p-7">
                <div>
                  <p className="font-serif text-xl text-ink">Open to internships and new-grad roles.</p>
                  <p className="mt-1 font-sans text-[15px] text-quiet">
                    Based in {profile.location}. Happy to talk through any project on this page.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <a
                    href={RESUME_URL}
                    download={RESUME_FILE}
                    className="rounded-md bg-ink px-4 py-2 font-sans text-sm font-medium text-paper transition-colors hover:bg-coral"
                  >
                    Download r&eacute;sum&eacute;
                  </a>
                  {profile.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-rule px-4 py-2 font-sans text-sm text-ink transition-colors hover:border-coral/50 hover:text-coral"
                    >
                      {titleCase(link.label)}
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>
          </Section>
        </>
      )}
    </>
  )
}

/** The same form the casual side has, in professional clothes. */
function ContactForm({ profile }: { profile: Profile }) {
  const f = useContactForm(profile)
  const field =
    'w-full rounded-md border border-rule bg-card/80 px-3 py-2.5 font-sans text-sm text-ink outline-none transition-colors placeholder:text-quiet/70 focus:border-coral'

  if (f.outcome) {
    return (
      <div className="paper-card p-8 text-center" role="status">
        <p className="font-serif text-2xl text-ink">{f.outcome === 'sent' ? 'Message sent' : 'Message composed'}</p>
        <p className="mt-2 font-sans text-[15px] text-quiet">
          {f.outcome === 'sent'
            ? 'It is in my inbox. I reply from my own address, usually within a day.'
            : 'It couldn’t be sent from here, so your mail app opened with it written out. Press send there.'}
        </p>
        {f.fallbackReason && <p className="mt-2 font-sans text-xs text-quiet/80">({f.fallbackReason})</p>}
        <button
          onClick={f.reset}
          className="mt-6 rounded-full border border-rule px-5 py-2 font-sans text-sm text-ink transition-colors hover:border-coral/50 hover:text-coral"
        >
          Write another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={f.submit} className="paper-card p-7">
      <h3 className="font-serif text-xl text-ink">Send me a message</h3>
      <p className="mt-1 font-sans text-sm text-quiet">
        {f.canSend === false
          ? 'This opens your own mail app with the message already written.'
          : 'It goes straight to my inbox. If that fails, your mail app opens with it written out instead.'}
      </p>
      <Honeypot value={f.website} onChange={f.setWebsite} />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-sans text-xs tracking-widest text-quiet uppercase">Your name</span>
          <input
            className={`${field} mt-1.5`}
            value={f.name}
            onChange={(e) => f.setName(e.target.value)}
            placeholder="your name"
          />
          {f.touched && f.problems.name && (
            <span className="mt-1 block font-sans text-xs text-red-700">{f.problems.name}</span>
          )}
        </label>
        <label className="block">
          <span className="font-sans text-xs tracking-widest text-quiet uppercase">Your email</span>
          <input
            className={`${field} mt-1.5`}
            value={f.from}
            onChange={(e) => f.setFrom(e.target.value)}
            placeholder="you@company.com"
          />
          {f.touched && f.problems.from && (
            <span className="mt-1 block font-sans text-xs text-red-700">{f.problems.from}</span>
          )}
        </label>
      </div>

      <label className="mt-4 block">
        <span className="font-sans text-xs tracking-widest text-quiet uppercase">Message</span>
        <textarea
          rows={5}
          className={`${field} mt-1.5 resize-y`}
          value={f.message}
          onChange={(e) => f.setMessage(e.target.value)}
          placeholder="what would you like to talk about?"
        />
        {f.touched && f.problems.message && (
          <span className="mt-1 block font-sans text-xs text-red-700">{f.problems.message}</span>
        )}
      </label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={f.sending}
          className="rounded-full bg-gradient-to-r from-coral to-violet px-6 py-2.5 font-sans text-sm font-semibold text-white shadow-[0_12px_30px_-12px_var(--color-coral)] disabled:opacity-60"
        >
          {f.sending ? 'Sending…' : 'Send message'}
        </button>
        {f.address && (
          <button
            type="button"
            onClick={f.copyAddress}
            className="rounded-full border border-rule px-5 py-2.5 font-sans text-sm text-ink transition-colors hover:border-coral/50 hover:text-coral"
          >
            {f.copied ? 'Copied' : 'Copy email address'}
          </button>
        )}
      </div>
    </form>
  )
}

function Stat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div
      className="paper-card px-4 py-3.5"
      style={{ boxShadow: `0 10px 26px -18px ${tone}` }}
    >
      <dt className="font-serif text-[30px] leading-none font-semibold" style={{ color: tone }}>
        <CountUp to={n} />
      </dt>
      <dd className="mt-1.5 font-sans text-xs tracking-wide text-quiet">{label}</dd>
    </div>
  )
}

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

function Hero({ profile }: { profile: Profile | null }) {
  const terminal = useTerminal()
  const { company, lead, focus } = useAudience()
  const ease = [0.22, 1, 0.36, 1] as const

  return (
    // Full first screen: the hero and the skyline get it to themselves, and the
    // first section starts below the fold instead of sitting on the rooftops.
    <section className="grid min-h-[calc(100dvh-4.5rem)] items-center gap-8 pt-10 pb-24 lg:grid-cols-[1.15fr_0.85fr]">
      <div>
      {company && (
        <motion.p
          className="mb-5 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-2xl border border-violet/25 bg-card/70 px-4 py-2 font-sans text-sm text-ink/80 backdrop-blur"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-violet" aria-hidden />
          Hello, {company} team, thanks for stopping by.
          {focus.length > 0 && (
            <Link to={`/projects/${lead.slug}`} className="font-medium text-coral hover:underline">
              Start with {lead.codename} &rarr;
            </Link>
          )}
        </motion.p>
      )}
      <h1 className="gradient-text -mb-[0.22em] -ml-[0.12em] font-script text-[clamp(3.6rem,9vw,6.5rem)] leading-[1.15] font-normal pb-[0.22em] pl-[0.3em] xl:-ml-[0.3em]">
        <LetterReveal text={profile?.name ?? 'Janit B'} />
      </h1>

      <motion.div
        className="mt-5 h-[3px] w-28 origin-left rounded-full bg-gradient-to-r from-coral via-amber to-violet"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, delay: 0.5, ease }}
      />

      <motion.p
        className="mt-5 font-sans text-xl font-medium text-ink/90"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.24, ease }}
      >
        {profile?.role ?? 'AI/ML Engineer'}
      </motion.p>

      <motion.p
        className="mt-4 max-w-2xl font-sans text-[17px] leading-[1.7] text-quiet"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.34, ease }}
      >
        {profile?.tagline ??
          'I like the last mile: turning a trained model into something someone can actually use.'}
      </motion.p>

      <motion.div
        className="mt-9 flex flex-wrap items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.44, ease }}
      >
        <Magnetic>
          <Link
            to="/#work"
            className="shimmer relative inline-block overflow-hidden rounded-full bg-gradient-to-r from-coral via-coral to-violet px-7 py-3 font-sans text-sm font-semibold text-white shadow-[0_12px_30px_-10px_var(--color-coral)] transition-shadow hover:shadow-[0_18px_40px_-10px_var(--color-coral)]"
          >
            View work
          </Link>
        </Magnetic>
        <Magnetic>
          <a
            href={RESUME_URL}
            download={RESUME_FILE}
            className="inline-block rounded-full border border-violet/40 bg-card/70 px-6 py-3 font-sans text-sm font-semibold text-[color-mix(in_srgb,var(--color-violet)_70%,var(--color-ink))] backdrop-blur transition-colors hover:border-violet hover:bg-violet hover:text-white"
          >
            Download r&eacute;sum&eacute;
          </a>
        </Magnetic>
        <Magnetic>
          <button
            onClick={() => terminal.setOpen(!terminal.open)}
            className="rounded-full border border-ink/12 bg-card/60 px-6 py-3 font-sans text-sm font-medium text-ink backdrop-blur transition-colors hover:border-violet/45 hover:text-violet"
          >
            <span className="font-code">&gt;_</span> Open console
          </button>
        </Magnetic>
      </motion.div>

      <motion.div
        className="mt-16 flex items-center gap-3 font-sans text-xs tracking-[0.2em] text-quiet uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.1 }}
      >
        Scroll
        <motion.span
          aria-hidden
          className="block h-px w-10 origin-left bg-quiet/50"
          animate={{ scaleX: [0.3, 1, 0.3] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
      </div>

      <Portrait />
    </section>
  )
}

/**
 * The hero photograph. It was shot on near-black, which would read as a hole
 * punched in a cream page, so it is masked to dissolve at the edges, warmed
 * into the sunrise palette, and stood in a slowly breathing halo.
 */
function Portrait() {
  return (
    <motion.div
      className="relative mx-auto w-full max-w-[22rem] lg:max-w-[min(26rem,44vh)]"
      initial={{ opacity: 0, scale: 0.95, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div aria-hidden className="portrait-halo absolute -inset-10 -z-10" />

      <div className="portrait-frame relative">
        <div className="portrait-inner relative overflow-hidden">
          <img
            src={portraitPro}
            alt="Janit B"
            className="aspect-[3/4] w-full object-cover object-top select-none"
            style={{ filter: 'grayscale(1) contrast(1.1) brightness(1.08)' }}
            draggable={false}
          />
          <div aria-hidden className="portrait-wash pointer-events-none absolute inset-0" />
          {/* a slow highlight travelling down the glass of the frame */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-white/12 to-transparent"
            animate={{ top: ['-35%', '115%'] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear', repeatDelay: 2.5 }}
          />
        </div>
      </div>
    </motion.div>
  )
}

/**
 * The name arrives one letter at a time. It is the first thing on the page, so
 * it earns a flourish the rest of the layout deliberately does not have.
 */
function LetterReveal({ text }: { text: string }) {
  return (
    <span aria-label={text} className="inline-block">
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          initial={{ opacity: 0, y: '0.35em', filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.55, delay: 0.15 + i * 0.045, ease: [0.22, 1, 0.36, 1] }}
        >
          {ch === ' ' ? '\u00a0' : ch}
        </motion.span>
      ))}
    </span>
  )
}

function Section({
  id,
  title,
  number,
  children,
}: {
  id: string
  title: string
  number: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 py-14">
      <Reveal>
        <h2 className="mb-8 flex items-baseline gap-3">
          <span className="num-badge font-code text-base font-bold">{number}</span>
          <span className="font-serif text-[clamp(28px,3.4vw,38px)] font-semibold text-ink">{title}</span>
          <motion.span
            aria-hidden
            className="ml-2 hidden h-px flex-1 origin-left bg-gradient-to-r from-coral/40 via-amber/30 to-transparent sm:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </h2>
      </Reveal>
      {children}
    </section>
  )
}
