import { motion } from 'framer-motion'
import { useState } from 'react'
import { useSkin } from '../skin/context'
import type { Skin } from '../skin/context'
import GateCircuit from './effects/GateCircuit'

/**
 * The front door. Before the visitor has picked a side, this is the whole page.
 * It belongs to neither skin, so it uses its own neutral palette and says as
 * little as possible: two choices, a sentence each, and the promise that the
 * choice is not final.
 */
export default function Gate() {
  const { choose } = useSkin()
  // Which choice the pointer is on, so the background can lean that way.
  const [focus, setFocus] = useState<Skin | null>(null)

  return (
    <div className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-5 py-14 text-[#e8eaee]">
      <GateCircuit focus={focus} />
      <div className="relative">
      <motion.header
        className="mx-auto w-full max-w-5xl text-center"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="font-sans text-xs tracking-[0.35em] text-[#7c8494] uppercase">Janit B</p>
        <h1 className="mt-3 font-serif text-3xl font-normal sm:text-4xl">How would you like to look around?</h1>
        <p className="mx-auto mt-4 max-w-xl font-sans text-[15px] leading-relaxed text-[#9aa2b1]">
          This portfolio comes in two versions. They contain the same projects and the same demos — only the
          presentation differs.
        </p>
      </motion.header>

      <div className="mx-auto mt-12 grid w-full max-w-5xl gap-5 md:grid-cols-2">
        <Choice
          skin="pro"
          index={0}
          label="Recruiter / Professional"
          blurb="A clean, conventional portfolio. Projects, case studies, experience and skills, laid out to be read quickly and skimmed on any device."
          onChoose={choose}
          onFocus={setFocus}
        >
          <ProPreview />
        </Choice>

        <Choice
          skin="sys"
          index={1}
          label="Just looking around"
          blurb="The same work rendered as a cyberpunk terminal. Neon, glitch, a live command line, and a neon skyline behind everything."
          onChoose={choose}
          onFocus={setFocus}
        >
          <SysPreview />
        </Choice>
      </div>

      <motion.p
        className="mx-auto mt-10 text-center font-sans text-sm text-[#6a7180]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        You can switch between them at any time from the top of the page.
      </motion.p>
      </div>
    </div>
  )
}

type ChoiceProps = {
  skin: Skin
  index: number
  label: string
  blurb: string
  onChoose: (skin: Skin) => void
  /** Tells the backdrop which side the pointer is on. */
  onFocus: (skin: Skin | null) => void
  children: React.ReactNode
}

function Choice({ skin, index, label, blurb, onChoose, onFocus, children }: ChoiceProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onChoose(skin)}
      onMouseEnter={() => onFocus(skin)}
      onMouseLeave={() => onFocus(null)}
      onFocus={() => onFocus(skin)}
      onBlur={() => onFocus(null)}
      className="group flex flex-col rounded-xl border border-white/10 bg-black/35 p-5 text-left backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-black/45 focus:outline-none focus-visible:border-white/40"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 + index * 0.12, duration: 0.5 }}
      whileHover={{ y: -4 }}
    >
      {/* A small, honest preview of what the visitor is about to get. */}
      <div className="overflow-hidden rounded-lg border border-white/10">{children}</div>

      <h2 className="mt-5 font-sans text-lg font-semibold">{label}</h2>
      <p className="mt-2 flex-1 font-sans text-sm leading-relaxed text-[#9aa2b1]">{blurb}</p>
      <span className="mt-5 inline-flex items-center gap-2 font-sans text-sm font-medium text-white">
        Enter
        <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
      </span>
    </motion.button>
  )
}

/** Miniature of the professional home page. */
function ProPreview() {
  return (
    <div className="aspect-[16/9] w-full bg-paper p-3">
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <span className="font-sans text-[7px] font-semibold text-ink">Janit B</span>
        <span className="font-sans text-[6px] text-quiet">Work · About · Contact</span>
      </div>
      <div className="mt-3 h-1 w-10 bg-coral" />
      <div className="mt-2 font-serif text-[11px] leading-tight text-ink">AI/ML Engineer</div>
      <div className="mt-1 h-[3px] w-24 rounded bg-rule" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded border border-rule bg-card p-1.5">
            <div className="h-[3px] w-10 rounded bg-ink/70" />
            <div className="mt-1 h-[2px] w-full rounded bg-rule" />
            <div className="mt-[3px] h-[2px] w-3/4 rounded bg-rule" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Miniature of the cyberpunk home page. */
function SysPreview() {
  return (
    <div className="aspect-[16/9] w-full bg-void p-3">
      <div className="flex items-center justify-between border-b border-neon/20 pb-2">
        <span className="font-display text-[7px] font-bold tracking-widest text-neon">
          JANIT<span className="text-hot">://</span>SYS
        </span>
        <span className="border border-acid px-1 font-mono text-[6px] text-acid">&gt;_</span>
      </div>
      <div className="mt-3 font-mono text-[6px] tracking-[0.2em] text-hot">&gt; IDENTITY CONFIRMED</div>
      <div className="mt-1 font-display text-[13px] font-black tracking-wider text-neon [text-shadow:0_0_8px_#00f0ff]">
        JANIT B
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="border border-neon/25 bg-panel p-1.5">
            <div className="h-[3px] w-10 bg-neon/70" />
            <div className="mt-1 h-[2px] w-full bg-grid" />
            <div className="mt-[3px] h-[2px] w-3/4 bg-grid" />
          </div>
        ))}
      </div>
    </div>
  )
}
