/**
 * Builds the published copy of the site: frontend only, no API behind it.
 *
 * Two things make that work on GitHub Pages:
 *  - VITE_BASE, because a project site is served from /<repo>/, not /
 *  - a copy of index.html as 404.html, because Pages has no rewrite rule and
 *    would otherwise 404 on a deep link like /projects/book-summarizer; it
 *    serves 404.html instead, which boots the same single-page app.
 *
 * VITE_STATIC tells the app there is no backend, so it uses the committed
 * profile snapshot and never offers a demo it cannot run.
 */
import { execSync } from 'node:child_process'
import { copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const base = process.env.VITE_BASE ?? '/janit-portfolio/'

// VITE_API_BASE points the published site at the hosted API. Without it the
// build still works and simply says its demos run locally.
execSync('npm run build', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE: base, VITE_STATIC: 'true' },
})

copyFileSync(join(root, 'dist', 'index.html'), join(root, 'dist', '404.html'))
console.log(`\nStatic build ready in dist/ (base ${base})`)
