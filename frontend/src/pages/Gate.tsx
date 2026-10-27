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
    <div className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-4 py-8 text-[#e8eaee] sm:px-5 sm:py-14">
      <GateCircuit focus={focus} />
      <div className="relative">
      <motion.header
        className="mx-auto w-full max-w-5xl text-center"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="font-sans text-xs tracking-[0.35em] text-[#7c8494] uppercase">Janit B</p>
        <h1 className="mt-3 font-serif text-[26px] leading-tight font-normal sm:text-4xl">How would you like to look around?</h1>
        <p className="mx-auto mt-3 max-w-xl font-sans text-sm leading-relaxed text-[#9aa2b1] sm:mt-4 sm:text-[15px]">
          Two versions, the same work. Pick a look — you can switch later.
        </p>
        {/* What makes this more than a page to read, said before anyone
            decides it is "just another portfolio". */}
        <ul className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2 font-sans text-[13px] text-[#d6dae2]">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-1.5 rounded-full border border-white/12 bg-black/40 px-3 py-1 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] shadow-[0_0_6px_#34d399]" />
              {f}
            </li>
          ))}
        </ul>
      </motion.header>

      <div className="mx-auto mt-7 grid w-full max-w-5xl gap-3 sm:mt-12 sm:gap-5 md:grid-cols-2">
        <Choice
          skin="pro"
          index={0}
          label="Recruiter / Professional"
          blurb="Clean and quick to skim: projects, live demos, experience and skills."
          onChoose={choose}
          onFocus={setFocus}
        >
          <ProPreview />
        </Choice>

        <Choice
          skin="sys"
          index={1}
          label="Just looking around"
          blurb="The same work as a neon cyberpunk city, with a tour-guide drone you can talk to."
          onChoose={choose}
          onFocus={setFocus}
        >
          <SysPreview />
        </Choice>
      </div>

      <motion.p
        className="mx-auto mt-6 text-center font-sans text-xs text-[#6a7180] sm:mt-10 sm:text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        You can come back here any time with the Switch button at the top of every page.
      </motion.p>
      </div>
    </div>
  )
}

const FEATURES = ['Live AI demos you can run', 'A terminal you can type in', 'A talking tour guide']

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
      className="group flex flex-col rounded-xl border border-white/10 bg-black/45 p-4 text-left sm:bg-black/35 sm:p-5 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-black/45 focus:outline-none focus-visible:border-white/40"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 + index * 0.12, duration: 0.5 }}
      whileHover={{ y: -2 }}
    >
      {/* A small, honest preview of what the visitor is about to get. */}
      <div className="mb-5 hidden overflow-hidden rounded-lg border border-white/10 sm:block">{children}</div>

      <h2 className="font-sans text-lg font-semibold">{label}</h2>
      <p className="mt-1.5 flex-1 font-sans text-sm leading-relaxed text-[#9aa2b1] sm:mt-2">{blurb}</p>
      <span className="mt-3 inline-flex items-center gap-2 font-sans text-sm font-medium text-white sm:mt-5">
        Enter
        <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
      </span>
    </motion.button>
  )
}

/** Miniature of the professional home page: script name, arched portrait,
 *  warm colour pools and the skyline, sized to fill its frame. */
function ProPreview() {
  return (
    <div className="relative flex aspect-[16/9] w-full flex-col overflow-hidden bg-paper px-4 pt-3">
      <div className="absolute -top-8 -left-8 h-36 w-36 rounded-full bg-coral/25 blur-3xl" />
      <div className="absolute top-8 right-16 h-28 w-28 rounded-full bg-violet/20 blur-3xl" />
      <div className="absolute bottom-6 left-1/3 h-24 w-32 rounded-full bg-amber/20 blur-3xl" />
      <div className="relative flex items-center justify-between border-b border-rule pb-2">
        <span className="bg-gradient-to-r from-violet to-coral bg-clip-text font-sans text-[9px] font-bold text-transparent">Janit B</span>
        <span className="flex items-center gap-2 font-sans text-[8px] text-quiet">
          Work · About · Experience
          <span className="rounded-full border border-coral/40 px-1.5 py-[1px] text-ink">&#8644; Switch</span>
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-between gap-3 pb-7">
        <div>
          <div className="bg-gradient-to-r from-violet via-[#a24fd8] to-coral bg-clip-text pr-2 pl-2 -ml-1 font-script text-[clamp(30px,4.2vw,44px)] leading-[1.1] text-transparent">
            Janit B
          </div>
          <div className="mt-1 h-[2px] w-12 rounded bg-gradient-to-r from-coral via-amber to-violet" />
          <div className="mt-2 font-sans text-[10px] font-medium text-ink">AI/ML Engineer</div>
          <div className="mt-1.5 h-[3px] w-32 rounded bg-rule" />
          <div className="mt-1 h-[3px] w-24 rounded bg-rule" />
          <div className="mt-3 flex gap-1.5">
            <span className="rounded-full bg-gradient-to-r from-coral to-violet px-2.5 py-1 font-sans text-[7px] font-semibold text-white">View work</span>
            <span className="rounded-full border border-violet/40 bg-white px-2.5 py-1 font-sans text-[7px] font-semibold text-violet">R&eacute;sum&eacute;</span>
          </div>
        </div>
        <div className="relative mr-2 h-[62%] max-h-[120px] aspect-[3/4] rounded-t-full rounded-b-md bg-gradient-to-b from-[#3a3046] to-[#120f18] shadow-[0_10px_30px_-10px_var(--color-violet)] ring-1 ring-amber/70">
          <span className="absolute top-[22%] left-1/2 h-[22%] w-[30%] -translate-x-1/2 rounded-full bg-[#5a5066]" />
          <span className="absolute bottom-0 left-1/2 h-[42%] w-[64%] -translate-x-1/2 rounded-t-[40%] bg-[#2a2236]" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-8 items-end gap-[3px] px-1">
        {[55, 80, 40, 100, 65, 50, 88, 38, 72, 60, 95, 46, 78, 58, 84, 42].map((h, i) => (
          <span key={i} className="relative flex-1 border border-b-0 border-ink/20 bg-paper/90" style={{ height: `${h}%` }}>
            {i % 3 === 0 && <span className="absolute top-1.5 left-1 h-1 w-1 bg-amber/70" />}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Miniature of the cyberpunk home page, at the same scale. */
function SysPreview() {
  return (
    <div className="relative flex aspect-[16/9] w-full flex-col overflow-hidden bg-void px-4 pt-3">
      <div className="absolute top-10 right-8 h-28 w-40 rounded-full bg-neon/10 blur-3xl" />
      <div className="absolute bottom-4 left-10 h-24 w-32 rounded-full bg-hot/10 blur-3xl" />
      <div className="relative flex items-center justify-between border-b border-neon/20 pb-2">
        <span className="font-display text-[9px] font-bold tracking-widest text-neon">
          JANIT<span className="text-hot">://</span>SYS
        </span>
        <span className="border border-acid px-1.5 font-mono text-[8px] text-acid">&gt;_</span>
      </div>
      <div className="relative flex flex-1 flex-col justify-center pb-7">
        <div className="font-mono text-[8px] tracking-[0.25em] text-hot">&gt; IDENTITY CONFIRMED</div>
        <div className="mt-1 font-display text-[clamp(22px,3vw,30px)] font-black tracking-wider text-neon [text-shadow:0_0_12px_#00f0ff]">
          JANIT B
        </div>
        <div className="mt-1 font-mono text-[8px] text-neon/60">ai/ml operator &middot; 4 missions online</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {['LEXICON', 'FRACTURE', 'ECHO'].map((m) => (
            <div key={m} className="border border-neon/25 bg-panel px-1.5 py-1">
              <div className="font-mono text-[7px] text-neon">{m}</div>
              <div className="mt-1 h-[2px] w-full bg-grid" />
              <div className="mt-[3px] h-[2px] w-2/3 bg-grid" />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-8 items-end gap-[3px] px-1">
        {[70, 45, 95, 60, 82, 40, 100, 55, 76, 48, 90, 62, 85, 50, 68, 44].map((h, i) => (
          <span key={i} className="relative flex-1 border border-b-0 border-neon/35 bg-void" style={{ height: `${h}%` }}>
            {i % 4 === 1 && <span className="absolute top-1.5 left-1 h-1 w-1 bg-hot/80" />}
          </span>
        ))}
      </div>
    </div>
  )
}
