import { useSkin } from '../../../skin/context'
import { useTryIt } from '../../../features/useTryIt'
import Reveal from './Reveal'

/**
 * "This is not a slideshow." Most visitors expect a portfolio to be something
 * you read, so the things you can *do* here are spelled out as three actions,
 * right after the hero, where nobody has to discover them by accident.
 */
export default function TryStrip() {
  const { runDemo, canRunQuick, openTerminal, quick } = useTryIt()
  const { toggle } = useSkin()

  const tiles = [
    {
      tone: 'var(--color-coral)',
      kicker: canRunQuick ? 'Live · about 5 seconds' : 'Demo',
      title: 'Run a real AI model',
      body: canRunQuick
        ? `One tap sends a sample crack photo to ${quick?.codename}, the deployed model, and shows its verdict and how long it took.`
        : `Open ${quick?.codename} and see how the model works on your own photo.`,
      action: canRunQuick ? 'Run it now' : 'Open the demo',
      onClick: runDemo,
    },
    {
      tone: 'var(--color-violet)',
      kicker: 'Interactive',
      title: 'Use the console',
      body: 'A command line built into the site. Type help, projects or resume — it answers like a real terminal.',
      action: 'Open console',
      onClick: openTerminal,
    },
    {
      tone: 'var(--color-amber)',
      kicker: 'Second version',
      title: 'See the cyberpunk version',
      body: 'The same work rebuilt as a neon city, with a tour guide drone you can talk to.',
      action: 'Switch look',
      onClick: toggle,
    },
  ]

  return (
    <section aria-labelledby="try-heading" className="pt-6 pb-4">
      <Reveal>
        <p className="font-sans text-xs tracking-[0.25em] text-quiet uppercase">Not just a page to read</p>
        <h2 id="try-heading" className="mt-2 font-serif text-[clamp(24px,3vw,32px)] font-semibold text-ink">
          Everything here actually runs. Try it.
        </h2>
      </Reveal>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {tiles.map((t, i) => (
          <Reveal key={t.title} delay={i * 0.07}>
            <button
              type="button"
              onClick={t.onClick}
              className="paper-card paper-card-hover group flex h-full w-full flex-col p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              style={{ boxShadow: `0 14px 30px -22px ${t.tone}` }}
            >
              <span className="inline-flex items-center gap-1.5 font-sans text-[11px] tracking-widest uppercase" style={{ color: t.tone }}>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: t.tone }} />
                {t.kicker}
              </span>
              <span className="mt-2 font-serif text-xl font-semibold text-ink">{t.title}</span>
              <span className="mt-1.5 flex-1 font-sans text-sm leading-relaxed text-quiet">{t.body}</span>
              <span className="mt-4 inline-flex items-center gap-1.5 font-sans text-sm font-semibold" style={{ color: t.tone }}>
                {t.action}
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </span>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
