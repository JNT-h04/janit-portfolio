// A pretend filesystem that lives in memory. Nothing here touches a real
// disk; `ls`, `cd` and `cat` just walk this object.

import { PROJECTS } from '../data/projects'

export type FsNode = { type: 'dir'; children: Record<string, FsNode> } | { type: 'file'; content: string; locked?: boolean }

const file = (content: string, locked = false): FsNode => ({ type: 'file', content, locked })
const dir = (children: Record<string, FsNode>): FsNode => ({ type: 'dir', children })

export const HOME = '/home/janit'

const projectFiles = Object.fromEntries(
  PROJECTS.map((p) => [
    `${p.codename.toLowerCase()}.md`,
    file(`# ${p.codename} (${p.title})\n\n${p.tagline}\n\nstack: ${p.stack.join(', ')}\nrun it: open ${p.codename.toLowerCase()}`),
  ]),
)

export const ROOT: FsNode = dir({
  home: dir({
    janit: dir({
      'about.txt': file(
        'Janit B: AI/ML engineer, CSE (AI & ML) at VIT Chennai.\n' +
          'I build full-stack AI apps, from training the model to the interface.\n' +
          'This whole site is one of them. Type `projects` to see the rest.',
      ),
      'contact.txt': file(
        'email     janit.b2006@gmail.com\ngithub    https://github.com/JNT-h04\nlinkedin  https://linkedin.com/in/janit2006',
      ),
      projects: dir(projectFiles),
      classified: dir({
        'flag.txt': file('', true),
      }),
    }),
  }),
})

/** Turn "../x", "~/y" or "/abs" into a clean absolute path, relative to cwd. */
export function resolve(cwd: string, input = '~'): string {
  const raw = input.startsWith('~') ? HOME + input.slice(1) : input.startsWith('/') ? input : `${cwd}/${input}`
  const parts: string[] = []
  for (const part of raw.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return '/' + parts.join('/')
}

export function lookup(path: string): FsNode | undefined {
  let node: FsNode | undefined = ROOT
  for (const part of path.split('/').filter(Boolean)) {
    if (node?.type !== 'dir') return undefined
    node = node.children[part]
  }
  return node
}

/** Show /home/janit as ~ in the prompt, like a real shell. */
export const pretty = (path: string) => (path.startsWith(HOME) ? '~' + path.slice(HOME.length) : path)
