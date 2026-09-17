import { motion } from 'framer-motion'
import CyberLogo from '../components/CyberLogo'
import GlitchText from '../components/GlitchText'
import MissionCard from '../components/MissionCard'
import ProfilePanel from '../components/ProfilePanel'
import { PROJECTS } from '../data/projects'
import { useTerminal } from '../terminal/context'

export default function Home() {
  const terminal = useTerminal()
  return (
    <>
      <section className="relative flex min-h-[85vh] flex-col justify-center">
        {/* a soft dark patch so the text stays readable over the busy skyline */}
        <div className="pointer-events-none absolute top-1/2 -left-[20vw] -z-10 h-[70vh] w-[85vw] -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgb(5_6_10/0.85)_20%,transparent_70%)]" />
        <motion.p
          className="font-mono text-sm tracking-[0.3em] text-hot"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          &gt; IDENTITY CONFIRMED
        </motion.p>
        <GlitchText
          as="h1"
          text="JANIT B, AI/ML engineer"
          intensity={1.3}
          className="cyber-title mt-6 mb-2 w-fit"
          render={(variant) => <CyberLogo variant={variant} className="block h-auto w-[min(88vw,780px)] lg:w-[min(52vw,660px)]" />}
        />
        <motion.p
          className="mt-4 max-w-xl text-xl text-text/85 sm:text-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Every project below actually runs, so pick one and try it.
        </motion.p>
        <motion.div
          className="mt-10 flex flex-wrap gap-4 font-mono"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <a href="#missions" className="border border-neon bg-neon/10 px-5 py-2 text-neon hover:bg-neon hover:text-void">
            VIEW MISSIONS
          </a>
          <a href="#operator" className="border border-hot px-5 py-2 text-hot hover:bg-hot hover:text-void">
            OPERATOR FILE
          </a>
          <button
            onClick={() => terminal.setOpen(!terminal.open)}
            className="border border-acid bg-acid/10 px-5 py-2 text-acid shadow-[0_0_18px_rgb(209_247_0/0.25)] hover:bg-acid hover:text-void"
          >
            &gt;_ {terminal.open ? 'CLOSE' : 'OPEN'} TERMINAL
          </button>
        </motion.div>
        <motion.p
          className="mt-6 font-mono text-sm text-dim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          tip: <kbd className="border border-dim px-1.5 text-neon">`</kbd> toggles the terminal ·{' '}
          <kbd className="border border-dim px-1.5 text-neon">esc</kbd> closes it
        </motion.p>
      </section>

      <section id="missions" className="scroll-mt-20 py-16">
        <h2 className="mb-8 font-display text-3xl font-bold tracking-widest">
          <span className="text-hot">01.</span> MISSIONS
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {PROJECTS.map((p, i) => (
            <MissionCard key={p.slug} project={p} index={i} />
          ))}
        </div>
      </section>

      <section id="operator" className="scroll-mt-20 py-16">
        <h2 className="mb-8 font-display text-3xl font-bold tracking-widest">
          <span className="text-hot">02.</span> OPERATOR
        </h2>
        <ProfilePanel />
      </section>
    </>
  )
}
