/** Cyberpunk rendering of a demo's built-in sample (see projects/samples.ts). */
export default function SampleStrip({
  title,
  credit,
  cta,
  audio,
  disabled,
  onTry,
}: {
  title: string
  credit: string
  cta: string
  audio?: string
  disabled?: boolean
  onTry: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border border-acid/30 bg-acid/5 px-4 py-3 font-mono text-sm">
      <span className="text-dim">NO FILE?</span>
      <button
        onClick={onTry}
        disabled={disabled}
        className="border border-acid px-3 py-1 tracking-widest text-acid transition-colors hover:bg-acid hover:text-void disabled:cursor-not-allowed disabled:opacity-40"
      >
        ► {cta}
      </button>
      <span className="min-w-0 flex-1 text-xs text-text/70">
        <span className="text-neon">{title}</span> · {credit}
      </span>
      {audio && <audio controls preload="none" src={audio} className="h-8 w-full sm:w-64" aria-label={`Listen to the sample: ${title}`} />}
    </div>
  )
}
