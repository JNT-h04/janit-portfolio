import { Link } from 'react-router-dom'
import GlitchText from '../components/GlitchText'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <GlitchText as="h1" text="404" className="font-display text-8xl font-black text-hot text-glow" />
      <p className="mt-4 font-mono text-dim">sector not found in the grid</p>
      <Link to="/" className="mt-8 border border-neon px-5 py-2 font-mono text-neon hover:bg-neon hover:text-void">
        RETURN TO BASE
      </Link>
    </div>
  )
}
