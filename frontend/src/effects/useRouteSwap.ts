import { useEffect, useRef, useState } from 'react'
import { useLocation, type Location } from 'react-router-dom'

export type SwapPhase = 'idle' | 'out' | 'in'

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Holds the *old* page on screen while a full-screen transition covers it,
 * swaps the route underneath at the cover's peak, then lets it uncover.
 *
 * A plain <AnimatePresence> can only cross-fade the two pages; it can't hide
 * the moment of the swap, which is what makes a warp or a screen-wipe read as
 * one continuous move. So the layout renders <Routes location={shown}> instead
 * of the live location, and this hook decides when `shown` catches up.
 *
 * `coverMs` is when the screen is fully covered (the swap point) and `totalMs`
 * is when the overlay is gone. Hash-only changes (/#work) and visitors who ask
 * for reduced motion are passed straight through.
 */
export function useRouteSwap(coverMs: number, totalMs: number) {
  const location = useLocation()
  const [lagged, setLagged] = useState<Location>(location)
  const [phase, setPhase] = useState<SwapPhase>('idle')
  // Bumped on every jump so the overlay remounts and replays from frame zero.
  const [runId, setRunId] = useState(0)
  const [reduced] = useState(prefersReducedMotion)
  const lastPath = useRef(location.pathname)

  // Nothing to hide unless the *path* changed, so the lag is only used while a
  // transition is actually covering the screen. Deriving it here rather than
  // writing state in the effect keeps a hash change from costing a render.
  const shown = reduced || lagged.pathname === location.pathname ? location : lagged

  useEffect(() => {
    if (reduced || location.pathname === lastPath.current) return
    lastPath.current = location.pathname

    setPhase('out')
    setRunId((n) => n + 1)
    const swap = setTimeout(() => {
      setLagged(location)
      setPhase('in')
    }, coverMs)
    const done = setTimeout(() => setPhase('idle'), totalMs)
    return () => {
      clearTimeout(swap)
      clearTimeout(done)
    }
  }, [location, reduced, coverMs, totalMs])

  return { shown, phase, runId }
}
