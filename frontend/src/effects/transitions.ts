/**
 * Timings for the two page transitions, shared by everything that plays them:
 * the route change inside a skin (see useRouteSwap) and the move between the
 * two skins (see SkinProvider). `cover` is the moment the screen is fully
 * hidden — whatever is being swapped has to swap exactly then — and `total` is
 * when the overlay is gone.
 */
export const WARP = { cover: 520, total: 1150 } // professional: the light-speed jump
export const BLOCKS = { cover: 640, total: 1500 } // casual: the falling block stack

/** Which transition belongs to the side you are arriving at. */
export const timingFor = (skin: 'pro' | 'sys') => (skin === 'pro' ? WARP : BLOCKS)
