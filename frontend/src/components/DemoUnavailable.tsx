import { PROJECTS } from '../data/projects'

/**
 * Shown in place of a demo when this build has no backend behind it (the
 * published copy of the site) or when that particular demo is switched off.
 *
 * It exists so the site never puts an upload box in front of someone that
 * cannot answer them. The honest version of "live demo" is "here is where this
 * demo runs, and here is what it does when it runs".
 */
export default function DemoUnavailable({
  slug,
  theme,
  reason,
}: {
  slug: string
  theme: 'crt' | 'paper'
  reason: 'no-backend' | 'switched-off'
}) {
  const project = PROJECTS.find((p) => p.slug === slug)
  const crt = theme === 'crt'
  const line =
    reason === 'switched-off'
      ? `${project?.codename ?? 'This demo'} is temporarily switched off.`
      : 'This copy of the site is the frontend only — the demos need the API running alongside it.'

  return (
    <div
      className={
        crt
          ? 'hud-panel mt-10 p-6 font-mono text-sm text-text'
          : 'paper-card mt-10 p-6 font-sans text-[15px] text-ink'
      }
    >
      <p className={crt ? 'font-display text-xl tracking-widest text-hot' : 'font-serif text-xl'}>
        {crt ? 'DEMO NOT RUNNING HERE' : 'The demo is not running on this copy'}
      </p>
      <p className={crt ? 'mt-3 text-dim' : 'mt-3 text-quiet'}>{line}</p>
      <p className={crt ? 'mt-2 text-dim' : 'mt-2 text-quiet'}>
        The code for it is in this project's repository, and the notes below describe exactly what it does,
        what it scores and where it falls short — those numbers were measured, not estimated.
      </p>
    </div>
  )
}
