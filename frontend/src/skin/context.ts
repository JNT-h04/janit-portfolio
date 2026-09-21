import { createContext, useContext } from 'react'

/**
 * Which of the two faces of the site the visitor is looking at.
 *  - 'pro'   the professional portfolio, for recruiters
 *  - 'sys'   the cyberpunk terminal, for everyone else
 * Both show the same projects and the same working demos; only the clothes differ.
 */
export type Skin = 'pro' | 'sys'

export type SkinState = {
  skin: Skin
  /** false until the visitor has picked a side, which is when the gate shows. */
  chosen: boolean
  choose: (skin: Skin) => void
  /** Jump to the other side without going back through the gate. */
  toggle: () => void
}

export const SkinContext = createContext<SkinState>({
  skin: 'sys',
  chosen: true,
  choose: () => {},
  toggle: () => {},
})

export const useSkin = () => useContext(SkinContext)

export const STORAGE_KEY = 'janit.skin'
