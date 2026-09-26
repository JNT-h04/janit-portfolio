/**
 * The saucer. Pure SVG + CSS (see the NOVA block in index.css), so it costs
 * nothing to animate and scales cleanly. `talking` speeds up the rim lights
 * and moves the pilot's mouth; `beam` is how far the tractor beam reaches.
 */
export default function UfoSprite({ talking, listening, beam }: { talking: boolean; listening: boolean; beam: number }) {
  const lights = [14, 30, 46, 60, 74, 90, 106]
  return (
    <svg
      viewBox="0 0 120 80"
      className={`nova-ufo block h-full w-full overflow-visible ${talking ? 'is-talking' : ''} ${listening ? 'is-listening' : ''}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="nova-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6ecff" />
          <stop offset="0.45" stopColor="#8f9bc4" />
          <stop offset="1" stopColor="#3a4166" />
        </linearGradient>
        <radialGradient id="nova-dome" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#bdfaff" stopOpacity="0.95" />
          <stop offset="0.6" stopColor="#00f0ff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#00f0ff" stopOpacity="0.1" />
        </radialGradient>
        <linearGradient id="nova-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#00f0ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#00f0ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* tractor beam, drawn first so the hull sits on top of it */}
      {beam > 0 && (
        <g className="nova-beam">
          <polygon points={`44,56 76,56 ${60 + 26 + beam * 0.25},${56 + beam} ${60 - 26 - beam * 0.25},${56 + beam}`} fill="url(#nova-beam)" />
          {[0.3, 0.6, 0.85].map((f) => (
            <ellipse key={f} className="nova-ring" cx="60" cy={56 + beam * f} rx={18 + beam * f * 0.3} ry="3" fill="none" stroke="#00f0ff" strokeOpacity="0.5" />
          ))}
        </g>
      )}

      {/* the pilot, behind the glass */}
      <g className="nova-pilot">
        <line x1="60" y1="20" x2="60" y2="14" stroke="#7dff9b" strokeWidth="1.5" />
        <circle className="nova-antenna" cx="60" cy="13" r="2" fill="#ff2a6d" />
        <ellipse cx="60" cy="29" rx="9" ry="10" fill="#5cff8d" />
        <g className="nova-eyes">
          <ellipse cx="56" cy="28" rx="2.6" ry="3.6" fill="#05060a" />
          <ellipse cx="64" cy="28" rx="2.6" ry="3.6" fill="#05060a" />
          <circle cx="56.8" cy="26.8" r="0.9" fill="#fff" />
          <circle cx="64.8" cy="26.8" r="0.9" fill="#fff" />
        </g>
        <ellipse className="nova-mouth" cx="60" cy="34.5" rx="2.2" ry="0.8" fill="#05060a" />
      </g>
      <path d="M36 40 A24 24 0 0 1 84 40 Z" fill="url(#nova-dome)" stroke="#bdfaff" strokeOpacity="0.6" />
      <path d="M44 30 A16 16 0 0 1 56 22" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" />

      {/* hull */}
      <ellipse cx="60" cy="45" rx="56" ry="13" fill="url(#nova-hull)" />
      <ellipse cx="60" cy="42" rx="44" ry="6" fill="#ffffff" fillOpacity="0.25" />
      <ellipse cx="60" cy="49" rx="50" ry="5" fill="#1b2040" fillOpacity="0.55" />
      {lights.map((x, i) => (
        <circle key={x} className="nova-light" style={{ animationDelay: `${i * 0.12}s` }} cx={x} cy={47 + Math.abs(60 - x) * -0.04} r="2.6" />
      ))}
      <ellipse className="nova-glow" cx="60" cy="57" rx="22" ry="3.5" fill="#00f0ff" />
    </svg>
  )
}
