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
  /** Forget the choice and go back to the front door. */
  reset: () => void
  /**
   * Set while a move between sides is in flight: which side's transition is
   * playing, whether it started over a light or a dark screen (the warp's
   * streaks have to be darker than paper and brighter than night), and a run
   * number so the overlay replays from frame zero each time. The skin itself
   * does not change until that transition has the screen covered, so the page
   * background can't flip before the visitor stops seeing it.
   */
  entering: { effect: Skin; over: 'light' | 'dark'; runId: number } | null
}

export const SkinContext = createContext<SkinState>({
  skin: 'sys',
  chosen: true,
  choose: () => {},
  toggle: () => {},
  reset: () => {},
  entering: null,
})

export const useSkin = () => useContext(SkinContext)

export const STORAGE_KEY = 'janit.skin'
