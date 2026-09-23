import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { bootPending } from '../effects/boot'
import { timingFor } from '../effects/transitions'
import { STORAGE_KEY, SkinContext, type Skin, type SkinState } from './context'

const isSkin = (value: string | null): value is Skin => value === 'pro' || value === 'sys'

/** Read once, before the first render, so the right skin paints immediately. */
function initial(): { skin: Skin; chosen: boolean } {
  // ?view=pro on a link (the one on the resume) wins over anything remembered,
  // so a recruiter following that link never meets the gate.
  const fromUrl = new URLSearchParams(window.location.search).get('view')
  if (isSkin(fromUrl)) return { skin: fromUrl, chosen: true }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isSkin(saved)) return { skin: saved, chosen: true }
  } catch {
    /* private browsing: fall through to the gate */
  }
  return { skin: 'sys', chosen: false }
}

export default function SkinProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial)
  const [, setSearchParams] = useSearchParams()

  // <html class="skin-pro"> is what gives the page its background colour, and it
  // has to be on the element itself: the cyberpunk city canvas sits behind the
  // body with a negative z-index, so a background on <body> would cover it.
  useEffect(() => {
    document.documentElement.classList.toggle('skin-pro', state.skin === 'pro')
    document.documentElement.classList.toggle('skin-sys', state.skin === 'sys')
  }, [state.skin])

  const remember = useCallback((skin: Skin) => {
    try {
      localStorage.setItem(STORAGE_KEY, skin)
    } catch {
      /* private browsing: the choice just won't be remembered */
    }
  }, [])

  // The move between the two sides is covered by the transition belonging to
  // the side you are arriving at: light speed into the professional one,
  // falling blocks into the casual one. The skin is committed at the cover's
  // peak, so <html>'s background, the layout and the backdrop all change while
  // nothing is on screen.
  const [entering, setEntering] = useState<SkinState['entering']>(null)
  const runs = useRef(0)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  /** Plays `effect`'s transition and commits `next` while the screen is hidden. */
  const play = useCallback((effect: Skin, over: 'light' | 'dark', next: typeof state) => {
    timers.current.forEach(clearTimeout)

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEntering(null)
      setState(next)
      return
    }

    runs.current += 1
    setEntering({ effect, over, runId: runs.current })
    const { cover, total } = timingFor(effect)
    timers.current = [
      setTimeout(() => setState(next), cover),
      setTimeout(() => setEntering(null), total),
    ]
  }, [])

  const go = useCallback(
    (skin: Skin) => {
      remember(skin)

      // First casual visit of the session: the boot log is the arrival, so it
      // goes first and the blocks play after it (CyberLayout runs them when the
      // boot finishes). Two "we are loading" screens at once cancel each other.
      if (skin === 'sys' && bootPending()) {
        timers.current.forEach(clearTimeout)
        setEntering(null)
        setState({ skin, chosen: true })
        return
      }

      // Arriving at the professional side always means leaving a dark screen:
      // the gate, or the casual skin.
      play(skin, 'dark', { skin, chosen: true })
    },
    [remember, play],
  )

  const choose = go

  /** Back to the front door, played out through the side you are leaving. */
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* private browsing: nothing was remembered anyway */
    }
    setSearchParams(
      (params) => {
        params.delete('view')
        return params
      },
      { replace: true },
    )
    play(state.skin, state.skin === 'pro' ? 'light' : 'dark', { skin: state.skin, chosen: false })
  }, [play, setSearchParams, state.skin])

  const toggle = useCallback(() => {
    // Deliberately NOT inside a setState updater: React runs those during
    // render, and calling the router's setSearchParams there updates another
    // component mid-render, which React warns about.
    const skin: Skin = state.skin === 'pro' ? 'sys' : 'pro'
    go(skin)
    // Drop ?view= if it is in the address bar, or it would win on the next
    // page load and quietly undo the switch the visitor just made.
    setSearchParams(
      (params) => {
        params.delete('view')
        return params
      },
      { replace: true },
    )
  }, [state.skin, go, setSearchParams])

  const value = useMemo<SkinState>(
    () => ({ skin: state.skin, chosen: state.chosen, choose, toggle, reset, entering }),
    [state.skin, state.chosen, choose, toggle, reset, entering],
  )

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>
}
