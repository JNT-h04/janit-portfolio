/**
 * Renders resume/resume.html to a PDF the site can hand out.
 *
 * Chrome does the typesetting, so what you see when you open the HTML in a
 * browser is exactly what lands in the PDF — and the text stays real, selectable
 * text, which is what applicant tracking systems need to read it.
 *
 *   npm run resume
 */
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { existsSync, statSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const source = resolve(here, '../../resume/resume.html')
const output = resolve(here, '../public/Janit_B_Resume.pdf')

if (!existsSync(source)) {
  console.error(`Cannot find the resume source at ${source}`)
  process.exit(1)
}

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await page.goto(`file://${source}`, { waitUntil: 'networkidle' })
await page.pdf({
  path: output,
  format: 'A4',
  printBackground: true,
  // the margins live in the stylesheet's @page rule, so none are added here
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
})

const pages = await page.evaluate(() => {
  // rough page count, to catch the resume silently spilling onto a second sheet
  const mm = 3.7795275591
  return Math.ceil(document.body.scrollHeight / ((297 - 22) * mm))
})
await browser.close()

console.log(`Wrote ${output} (${(statSync(output).size / 1024).toFixed(0)} KB, about ${pages} page(s))`)
if (pages > 1) console.warn('Warning: this looks like more than one page. Trim it or tighten the styles.')
