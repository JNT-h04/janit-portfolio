import { motion } from 'framer-motion'
import { useProfile } from '../api/profile'
import HudPanel from './HudPanel'

/** Shows data from the backend, and a NO SIGNAL state until the uplink works. */
export default function ProfilePanel() {
  const state = useProfile()

  if (state.status === 'loading') {
    return (
      <HudPanel title="OPERATOR" tag="SYNCING">
        <p className="font-mono text-neon">establishing uplink<span className="blink">_</span></p>
      </HudPanel>
    )
  }

  if (state.status === 'offline') {
    return (
      <HudPanel title="OPERATOR" tag="NO SIGNAL">
        <p className="font-display text-3xl text-hot text-glow">NO SIGNAL</p>
        <p className="mt-2 font-mono text-sm text-dim">backend uplink failed: {state.error}</p>
        <p className="mt-1 font-mono text-sm text-dim">→ see LEARNING.md · Mission 1</p>
      </HudPanel>
    )
  }

  const p = state.profile
  return (
    <HudPanel title="OPERATOR" tag="● LINKED">
      <p className="text-lg leading-relaxed">{p.summary}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {p.skills.map((s, i) => (
          <div key={s.name}>
            <div className="flex justify-between font-mono text-sm">
              <span>{s.name}</span>
              <span className="text-neon">{s.level}</span>
            </div>
            <div className="mt-1 h-1.5 bg-grid">
              <motion.div
                className="h-full bg-gradient-to-r from-neon to-hot"
                initial={{ width: 0 }}
                whileInView={{ width: `${s.level}%` }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.8 }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-4 font-mono text-sm">
        {p.links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-hot hover:text-glow">
            [{l.label}]
          </a>
        ))}
      </div>
    </HudPanel>
  )
}
