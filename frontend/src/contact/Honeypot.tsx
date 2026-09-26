/**
 * A field no person sees or tabs into. Spam bots fill in every input they
 * find, so a value here marks the message as a bot's, and the server drops it
 * while answering "sent" so the bot learns nothing.
 */
export default function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  )
}
