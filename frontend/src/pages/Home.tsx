import { motion } from 'framer-motion'
import CyberLogo from '../components/CyberLogo'
import GlitchText from '../components/GlitchText'
import MissionCard from '../components/MissionCard'
import OperatorFile from '../components/OperatorFile'
import TryStrip from '../components/TryStrip'
import { useTryIt } from '../features/useTryIt'
import { Link } from 'react-router-dom'
import { useAudience } from '../audience/audience'
import { RESUME_FILE, RESUME_URL } from '../data/resume'
import { useTerminal } from '../terminal/context'

export default function Home() {
  const terminal = useTerminal()
  const { runDemo, canRunQuick, quick } = useTryIt()
  const { company, projects, lead, focus } = useAudience()
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
        {company && (
          <motion.p
            className="mt-3 font-mono text-sm tracking-[0.2em] text-acid"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            &gt; TRANSMISSION FOR: {company.toUpperCase()}
            {focus.length > 0 && (
              <>
                {' '}// START WITH{' '}
                <Link to={`/projects/${lead.slug}`} className="text-neon underline decoration-dotted hover:text-hot">
                  {lead.codename}
                </Link>
              </>
            )}
          </motion.p>
        )}
        <GlitchText
          as="h1"
          text="JANIT B, AI/ML engineer"
          intensity={1.3}
          className="cyber-title mt-6 mb-2 w-fit"
          render={(variant) => <CyberLogo variant={variant} className="block h-auto w-[min(88vw,780px)] lg:w-[min(52vw,660px)]" />}
        />
        <motion.p
          className="mt-4 max-w-xl border-l-2 border-hot pl-4 text-xl text-text/90 sm:text-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Built to be used, not just described. Open any project and try it.
        </motion.p>
        <motion.div
          className="mt-10 grid grid-cols-2 gap-3 text-center font-mono text-sm sm:flex sm:flex-wrap sm:gap-4 sm:text-base"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <a href="#missions" className="border border-neon bg-neon/10 px-3 py-2 text-neon sm:px-5 hover:bg-neon hover:text-void">
            VIEW MISSIONS
          </a>
          <a href="#operator" className="border border-hot px-3 py-2 text-hot sm:px-5 hover:bg-hot hover:text-void">
            OPERATOR FILE
          </a>
          <button
            onClick={() => terminal.setOpen(!terminal.open)}
            className="border border-acid bg-acid/10 px-3 py-2 text-acid sm:px-5 shadow-[0_0_18px_rgb(209_247_0/0.25)] hover:bg-acid hover:text-void"
          >
            &gt;_ {terminal.open ? 'CLOSE' : 'OPEN'} TERMINAL
          </button>
          <a
            href={RESUME_URL}
            download={RESUME_FILE}
            className="border border-neon px-3 py-2 text-neon hover:bg-neon hover:text-void sm:px-5"
          >
            DOWNLOAD DOSSIER
          </a>
        </motion.div>
        {canRunQuick && (
          <motion.button
            type="button"
            onClick={runDemo}
            className="group mt-6 flex w-fit max-w-full items-center gap-2.5 border border-acid/40 bg-void/70 px-3 py-2 text-left font-mono text-sm text-text/90 backdrop-blur hover:border-acid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-acid shadow-[0_0_8px_var(--color-acid)]" />
            <span>
              <span className="text-acid">LIVE:</span> tap to run {quick?.codename}, a real AI model, on a sample photo
            </span>
            <span className="text-acid transition-transform group-hover:translate-x-1">&gt;&gt;</span>
          </motion.button>
        )}
        <motion.p
          className="mt-6 hidden font-mono text-sm text-dim pointer-fine:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          tip: <kbd className="border border-dim px-1.5 text-neon">`</kbd> toggles the terminal ·{' '}
          <kbd className="border border-dim px-1.5 text-neon">esc</kbd> closes it
        </motion.p>
      </section>

      <TryStrip />

      <section id="missions" className="scroll-mt-20 py-16">
        <h2 className="mb-8 font-display text-3xl font-bold tracking-widest">
          <span className="text-hot">01.</span> MISSIONS
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((p, i) => (
            <MissionCard key={p.slug} project={p} index={i} />
          ))}
        </div>
      </section>

      <OperatorFile />
    </>
  )
}
