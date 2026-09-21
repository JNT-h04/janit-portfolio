/**
 * An endless band of tool names sliding past under the hero. The list is
 * rendered twice back to back and the track is translated by exactly half its
 * width, which is what makes the loop seamless. Hovering pauses it so a name
 * can actually be read.
 */
export default function Marquee({ items }: { items: string[] }) {
  const run = [...items, ...items]
  return (
    <div
      className="marquee relative overflow-hidden py-3"
      style={{
        maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
      }}
    >
      <div className="marquee-track flex w-max items-center gap-3">
        {run.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="tone-chip rounded-full px-3.5 py-1.5 font-sans text-sm whitespace-nowrap"
            style={{
              // each chip borrows one of the three accents, in rotation
              ['--tone' as string]: ['var(--color-coral)', 'var(--color-amber)', 'var(--color-violet)'][i % 3],
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
