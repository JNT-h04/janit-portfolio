/**
 * How this build is being served.
 *
 * The GitHub Pages copy of the site is the frontend alone: there is no FastAPI
 * behind it, so the demos cannot run and the profile comes from a snapshot
 * committed next to the code. Everything that would otherwise claim a live
 * demo checks this first — a portfolio that says "live demo" over a dead
 * upload box is worse than one that says where the demo actually runs.
 *
 * Set by `VITE_STATIC=true` at build time (see the deploy script).
 */
export const STATIC_BUILD = import.meta.env.VITE_STATIC === 'true'
