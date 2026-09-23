/**
 * Assembles and pushes the Hugging Face Space that serves this API.
 *
 * The Space is a separate git repo: this script stages exactly what belongs in
 * it (the FastAPI app, the Dockerfile, the deploy requirements and the weights,
 * which are too large for the GitHub repo) into a scratch folder, then pushes.
 *
 * Usage:
 *   HF_TOKEN=hf_xxx node deploy/publish-space.mjs <hf-user>/<space-name>
 *
 * The token needs write access; create one at huggingface.co/settings/tokens.
 * Weights are pushed through git-lfs, so the first push is slow (~280 MB).
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
const target = process.argv[2]
const token = process.env.HF_TOKEN

if (!target || !token) {
  console.error('usage: HF_TOKEN=hf_xxx node deploy/publish-space.mjs <user>/<space>')
  process.exit(1)
}

const CRACK_WEIGHTS = process.env.CRACK_MODEL_PATH
  ?? 'D:/Projects/concrete-crack-severity-analysis/model/final_model.h5'
if (!existsSync(CRACK_WEIGHTS)) {
  console.error(`crack weights not found at ${CRACK_WEIGHTS} — set CRACK_MODEL_PATH`)
  process.exit(1)
}

const work = join(process.env.TEMP ?? '/tmp', 'janit-space')
rmSync(work, { recursive: true, force: true })
mkdirSync(work, { recursive: true })

const run = (cmd, opts = {}) => execSync(cmd, { cwd: work, stdio: 'inherit', ...opts })

run(`git clone https://user:${token}@huggingface.co/spaces/${target} .`, { cwd: work })

// The app, minus everything that has no business on a server.
cpSync(join(root, 'backend', 'app'), join(work, 'app'), {
  recursive: true,
  filter: (src) => !src.includes('__pycache__') && !src.endsWith('.pyc'),
})
cpSync(join(here, 'Dockerfile'), join(work, 'Dockerfile'))
cpSync(join(here, 'requirements-deploy.txt'), join(work, 'requirements-deploy.txt'))
cpSync(join(here, 'README.md'), join(work, 'README.md'))

mkdirSync(join(work, 'weights'), { recursive: true })
cpSync(resolve(CRACK_WEIGHTS), join(work, 'weights', 'final_model.h5'))

writeFileSync(join(work, '.gitattributes'), 'weights/** filter=lfs diff=lfs merge=lfs -text\n')

run('git lfs install --local')
run('git add -A')
try {
  run('git -c user.name=JNT-h04 -c user.email=janit.b2006@gmail.com commit -m "Deploy the API"')
} catch {
  console.log('nothing to commit — the Space is already up to date')
}
run('git push')

console.log(`\nSpace pushed: https://huggingface.co/spaces/${target}`)
console.log(`API will be at: https://${target.replace('/', '-').toLowerCase()}.hf.space`)
