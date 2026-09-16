import { motion } from 'framer-motion'
import GlitchText from '../components/GlitchText'
import MissionCard from '../components/MissionCard'
import ProfilePanel from '../components/ProfilePanel'
import { PROJECTS } from '../data/projects'

export default function Home() {
  return (
    <>
      <section className="flex min-h-[85vh] flex-col justify-center">
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
          text="JANIT B"
          className="mt-3 font-display text-6xl font-black tracking-wider text-neon text-glow sm:text-8xl"
        />
        <motion.p
          className="mt-4 max-w-2xl text-xl text-text/85 sm:text-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          AI/ML engineer. Every project below actually runs, so pick one and try it.
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
        </motion.div>
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
