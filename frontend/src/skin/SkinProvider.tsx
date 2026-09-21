import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
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

  const choose = useCallback(
    (skin: Skin) => {
      remember(skin)
      setState({ skin, chosen: true })
    },
    [remember],
  )

  const toggle = useCallback(() => {
    // Deliberately NOT inside a setState updater: React runs those during
    // render, and calling the router's setSearchParams there updates another
    // component mid-render, which React warns about.
    const skin: Skin = state.skin === 'pro' ? 'sys' : 'pro'
    remember(skin)
    setState({ skin, chosen: true })
    // Drop ?view= if it is in the address bar, or it would win on the next
    // page load and quietly undo the switch the visitor just made.
    setSearchParams(
      (params) => {
        params.delete('view')
        return params
      },
      { replace: true },
    )
  }, [state.skin, remember, setSearchParams])

  const value = useMemo<SkinState>(
    () => ({ skin: state.skin, chosen: state.chosen, choose, toggle }),
    [state.skin, state.chosen, choose, toggle],
  )

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>
}
