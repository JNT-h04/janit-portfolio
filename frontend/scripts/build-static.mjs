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
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const base = process.env.VITE_BASE ?? '/janit-portfolio/'

// VITE_API_BASE points the published site at the hosted API (Render, from
// render.yaml). Set it to an empty string to build a copy that says its demos
// run locally.
const apiBase = process.env.VITE_API_BASE ?? 'https://janit-portfolio-api.onrender.com'
execSync('npm run build', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE: base, VITE_STATIC: 'true', VITE_API_BASE: apiBase },
})

const index = join(root, 'dist', 'index.html')
copyFileSync(index, join(root, 'dist', '404.html'))

// 404.html renders a deep link fine, but with a 404 status, and link-preview
// crawlers (LinkedIn, Slack) give up on a 404. Give every real page its own
// copy of index.html so it is served as a 200.
const slugs = [...readFileSync(join(root, 'src', 'data', 'projects.ts'), 'utf8').matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1])
for (const slug of slugs) {
  const dir = join(root, 'dist', 'projects', slug)
  mkdirSync(dir, { recursive: true })
  copyFileSync(index, join(dir, 'index.html'))
}
console.log(`Page copies for: ${slugs.join(', ')}`)
console.log(`\nStatic build ready in dist/ (base ${base}, API ${apiBase || 'none'})`)
