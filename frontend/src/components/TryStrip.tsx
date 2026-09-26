import { motion } from 'framer-motion'
import { startNovaTour, useTryIt } from '../features/useTryIt'

/**
 * The casual side's "this is not a slideshow" panel: the things you can do
 * here, as three buttons, straight after the hero. Without it most visitors
 * scroll past the demos, the terminal and NOVA thinking it is a page to read.
 */
export default function TryStrip() {
  const { runDemo, canRunQuick, openTerminal, quick } = useTryIt()

  const tiles = [
    {
      color: 'text-acid border-acid/50 hover:bg-acid/10',
      tag: canRunQuick ? '● LIVE' : '○ DEMO',
      title: 'RUN A REAL AI MODEL',
      body: canRunQuick
        ? `One tap sends a crack photo to ${quick?.codename}, the deployed model. Verdict and timings in seconds.`
        : `Open ${quick?.codename} and see how it reads a crack photo.`,
      action: canRunQuick ? 'RUN IT NOW' : 'OPEN DEMO',
      onClick: runDemo,
    },
    {
      color: 'text-neon border-neon/50 hover:bg-neon/10',
      tag: '◈ GUIDE',
      title: 'TAKE THE TOUR',
      body: 'NOVA, the drone in the corner, flies you round the site, runs the demos and answers questions. It can talk out loud.',
      action: 'START TOUR',
      onClick: startNovaTour,
    },
    {
      color: 'text-hot border-hot/50 hover:bg-hot/10',
      tag: '>_ SHELL',
      title: 'HACK THE TERMINAL',
      body: 'A command line built into the site. Type help, projects or neofetch and it answers.',
      action: 'OPEN TERMINAL',
      onClick: openTerminal,
    },
  ]

  return (
    <section aria-labelledby="try-heading" className="pt-4 pb-6">
      <p className="font-mono text-xs tracking-[0.3em] text-dim">&gt; NOT JUST A PAGE TO READ</p>
      <h2 id="try-heading" className="mt-2 font-display text-xl font-bold tracking-widest text-text sm:text-2xl">
        EVERYTHING HERE RUNS. <span className="text-acid">TRY IT.</span>
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {tiles.map((t, i) => (
          <motion.button
            key={t.title}
            type="button"
            onClick={t.onClick}
            className={`group flex flex-col border bg-void/70 p-4 text-left font-mono backdrop-blur transition-colors ${t.color}`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: i * 0.08 }}
          >
            <span className="text-[11px] tracking-widest">{t.tag}</span>
            <span className="mt-2 font-display text-lg font-bold tracking-wider">{t.title}</span>
            <span className="mt-1.5 flex-1 text-sm leading-relaxed text-text/80">{t.body}</span>
            <span className="mt-4 text-sm tracking-widest">
              [ {t.action} <span className="inline-block transition-transform group-hover:translate-x-1">&gt;&gt;</span> ]
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  )
}
