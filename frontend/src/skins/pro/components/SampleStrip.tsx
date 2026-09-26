/** Professional rendering of a demo's built-in sample (see projects/samples.ts). */
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
    <div className="paper-card flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
      <p className="font-sans text-sm text-quiet">No file handy?</p>
      <button
        onClick={onTry}
        disabled={disabled}
        className="rounded-full bg-gradient-to-r from-coral to-violet px-5 py-2 font-sans text-sm font-semibold text-white shadow-[0_10px_24px_-12px_var(--color-coral)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {cta}
      </button>
      <p className="min-w-0 flex-1 font-sans text-xs leading-relaxed text-quiet">
        <span className="font-medium text-ink">{title}</span> · {credit}
      </p>
      {audio && <audio controls preload="none" src={audio} className="h-9 w-full sm:w-64" aria-label={`Listen to the sample: ${title}`} />}
    </div>
  )
}
