import type { ReactNode } from 'react'

type Props = { title?: string; tag?: string; children: ReactNode; className?: string }

/** The bracketed, cut-corner box used for every block of content. */
export default function HudPanel({ title, tag, children, className = '' }: Props) {
  return (
    <section className={`hud-panel p-6 ${className}`}>
      {title && (
        <header className="mb-4 flex items-center justify-between gap-4 border-b border-neon/20 pb-2 font-mono text-sm tracking-widest">
          <span className="text-neon">// {title}</span>
          {tag && <span className="text-hot">{tag}</span>}
        </header>
      )}
      {children}
    </section>
  )
}
