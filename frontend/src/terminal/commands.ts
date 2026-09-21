// Every command the terminal knows. Commands listed here run in the browser.
// Anything NOT listed is sent to the backend (POST /api/terminal), so the
// backend can add commands without touching this file.

import { PROJECTS } from '../data/projects'
import { RESUME_FILE, RESUME_URL } from '../data/resume'
import { HOME, lookup, pretty, resolve } from './fs'

// ANSI escape codes: special character sequences that terminals read as
// "switch colour" instead of printing them.
//
// Two palettes, because the same shell runs in both skins: phosphor green on
// the cyberpunk CRT, and dark ink on the professional side, where bright green
// on white would be unreadable. Only one skin is mounted at a time, so a single
// active palette is enough.
type Ink = 'neon' | 'hot' | 'acid' | 'dim' | 'user'

const PALETTES: Record<'crt' | 'paper', Record<Ink, string>> = {
  crt: {
    neon: '57;255;136', // bright phosphor green
    hot: '255;176;0', // amber: warnings and errors
    acid: '190;255;190', // pale green highlight
    dim: '39;122;72', // faded green
    user: '255;176;0', // the prompt's user@host, amber like the rest of the CRT
  },
  paper: {
    neon: '14;124;123', // teal, the professional accent
    hot: '185;28;28', // red: warnings and errors
    acid: '17;94;89', // deeper teal highlight
    dim: '107;114;128', // grey
    user: '17;94;89', // the prompt: teal, because red here would read as an error
  },
}

let active: keyof typeof PALETTES = 'crt'

/** Called by the terminal window as it mounts, before anything is printed. */
export const setTerminalPalette = (name: keyof typeof PALETTES) => {
  active = name
}

const paint = (ink: Ink) => (s: string) => `\x1b[38;2;${PALETTES[active][ink]}m${s}\x1b[0m`

export const c = {
  neon: paint('neon'),
  hot: paint('hot'),
  acid: paint('acid'),
  dim: paint('dim'),
  user: paint('user'),
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
}

export type Ctx = {
  cwd: string
  setCwd: (path: string) => void
  history: string[]
  navigate: (to: string) => void
  close: () => void
  clear: () => void
  write: (text: string) => void // print immediately (for animations)
}

type Command = {
  help: string
  run: (args: string[], ctx: Ctx) => string | Promise<string>
  complete?: 'path' | 'project' // what Tab should suggest for the arguments
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const findByCodename = (name = '') => PROJECTS.find((p) => p.codename.toLowerCase() === name.toLowerCase())

export const COMMANDS: Record<string, Command> = {
  help: {
    help: 'list every command',
    run: async () => {
      const local = Object.entries(COMMANDS).map(([name, cmd]) => `  ${c.neon(name.padEnd(10))} ${cmd.help}`)
      let remote: string[]
      try {
        // The backend lists its own commands at GET /api/terminal.
        const res = await fetch('/api/terminal')
        if (!res.ok) throw new Error(`${res.status}`)
        const list: { name: string; help: string }[] = await res.json()
        remote = list.map((cmd) => `  ${c.acid(cmd.name.padEnd(10))} ${cmd.help}`)
      } catch {
        remote = [c.dim('  (none found: backend offline, or its /api/terminal route is not mounted)')]
      }
      return [
        c.bold('browser commands'),
        ...local,
        '',
        c.bold('backend commands') + c.dim('  (run on the server)'),
        ...remote,
        '',
        c.dim('tips: Tab completes · ↑/↓ history · Ctrl+L clears · Ctrl+C cancels · ` toggles me'),
      ].join('\n')
    },
  },

  resume: {
    help: 'download my resume (pdf)',
    run: () => {
      const a = document.createElement('a')
      a.href = RESUME_URL
      a.download = RESUME_FILE
      a.click()
      return `${c.acid('downloading')} ${RESUME_FILE} ${c.dim('· one page, plain text, ATS-readable')}`
    },
  },
  whoami: { help: 'who is behind this system', run: () => `${c.neon('janit')}: AI/ML engineer. try ${c.hot('cat about.txt')}` },

  pwd: { help: 'print working directory', run: (_, ctx) => ctx.cwd },

  ls: {
    help: 'list files',
    complete: 'path',
    run: (args, ctx) => {
      const path = resolve(ctx.cwd, args[0] ?? '.')
      const node = lookup(path)
      if (!node) return c.hot(`ls: ${args[0]}: no such file or directory`)
      if (node.type === 'file') return args[0]
      return Object.entries(node.children)
        .map(([name, child]) => (child.type === 'dir' ? c.neon(name + '/') : name))
        .join('   ')
    },
  },

  cd: {
    help: 'change directory',
    complete: 'path',
    run: (args, ctx) => {
      const path = resolve(ctx.cwd, args[0] ?? HOME)
      const node = lookup(path)
      if (!node) return c.hot(`cd: ${args[0]}: no such directory`)
      if (node.type !== 'dir') return c.hot(`cd: ${args[0]}: not a directory`)
      ctx.setCwd(path)
      return ''
    },
  },

  cat: {
    help: 'print a file',
    complete: 'path',
    run: (args, ctx) => {
      if (!args[0]) return c.hot('cat: which file? try `ls`')
      const node = lookup(resolve(ctx.cwd, args[0]))
      if (!node) return c.hot(`cat: ${args[0]}: no such file`)
      if (node.type === 'dir') return c.hot(`cat: ${args[0]}: is a directory`)
      if (node.locked) return c.hot('ACCESS DENIED') + c.dim(' — clearance level insufficient. (maybe try sudo?)')
      return node.content
    },
  },

  projects: {
    help: 'list missions',
    run: () =>
      PROJECTS.map(
        (p, i) =>
          `${c.dim(String(i + 1).padStart(2, '0'))}  ${c.neon(p.codename.padEnd(10))} ${p.title.padEnd(26)} ${
            p.online ? c.acid('● online') : c.dim('○ offline')
          }`,
      ).join('\n') + `\n\n${c.dim('launch one with')} ${c.hot('open <codename>')}`,
  },

  open: {
    help: 'launch a mission, e.g. open lexicon',
    complete: 'project',
    run: (args, ctx) => {
      const p = findByCodename(args[0])
      if (!p) return c.hot(`open: unknown mission "${args[0] ?? ''}". try \`projects\``)
      setTimeout(() => {
        ctx.navigate(`/projects/${p.slug}`)
        ctx.close()
      }, 400)
      return c.acid(`launching ${p.codename}...`)
    },
  },

  neofetch: {
    help: 'system info',
    run: () => {
      const art = [
        '     ██╗',
        '     ██║',
        '     ██║',
        '██   ██║',
        '╚█████╔╝',
        ' ╚════╝ ',
      ]
      const info = [
        `${c.hot('janit')}@${c.hot('sys')}`,
        c.dim('-----------'),
        `${c.neon('os')}       JANIT://SYS v0.1`,
        `${c.neon('role')}     AI/ML engineer`,
        `${c.neon('stack')}    react · fastapi · pytorch`,
        `${c.neon('missions')} ${PROJECTS.length}`,
      ]
      return art.map((line, i) => `${c.neon(line)}   ${info[i] ?? ''}`).join('\n')
    },
  },

  history: { help: 'commands you typed', run: (_, ctx) => ctx.history.map((h, i) => `${c.dim(String(i + 1).padStart(3))}  ${h}`).join('\n') },

  echo: { help: 'repeat text', run: (args) => args.join(' ') },

  date: { help: 'current date and time', run: () => new Date().toString() },

  sudo: {
    help: 'try it',
    run: (args) =>
      args.length
        ? c.hot('[sudo] password for guest: ') + '\n' + c.hot('guest is not in the sudoers file. This incident will be reported.')
        : c.dim('usage: sudo <command>'),
  },

  matrix: {
    help: 'wake up, neo',
    run: async (_, ctx) => {
      const glyphs = 'ｱｲｳｴｵｶｷｸｹｺ01<>/{}#$'
      for (let row = 0; row < 18; row++) {
        let line = ''
        for (let col = 0; col < 60; col++) {
          const g = glyphs[(Math.random() * glyphs.length) | 0]
          line += Math.random() < 0.5 ? ' ' : Math.random() < 0.2 ? c.acid(g) : c.neon(g)
        }
        ctx.write(line + '\r\n')
        await sleep(45)
      }
      return c.hot('the grid has you.')
    },
  },

  clear: { help: 'clear the screen', run: (_, ctx) => (ctx.clear(), '') },

  exit: { help: 'close the terminal', run: (_, ctx) => (ctx.close(), '') },
}

/** Anything not defined above is asked of the backend. */
export async function runRemote(name: string, args: string[]): Promise<string> {
  try {
    const res = await fetch('/api/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: name, args }),
    })
    const body = await res.json()
    if (!res.ok) return c.hot(body.detail ?? `error ${res.status}`)
    return body.output
  } catch {
    return c.hot(`${name}: backend uplink offline`)
  }
}

/** Candidates for Tab completion, given the words typed so far. */
export function completions(words: string[], cwd: string): string[] {
  if (words.length <= 1) return Object.keys(COMMANDS).filter((n) => n.startsWith(words[0] ?? ''))
  const kind = COMMANDS[words[0]]?.complete
  const partial = words[words.length - 1]
  if (kind === 'project') {
    return PROJECTS.map((p) => p.codename.toLowerCase()).filter((n) => n.startsWith(partial.toLowerCase()))
  }
  if (kind === 'path') {
    const slash = partial.lastIndexOf('/')
    const base = slash >= 0 ? partial.slice(0, slash + 1) : ''
    const node = lookup(resolve(cwd, base || '.'))
    if (node?.type !== 'dir') return []
    return Object.entries(node.children)
      .filter(([name]) => name.startsWith(partial.slice(slash + 1)))
      .map(([name, child]) => base + name + (child.type === 'dir' ? '/' : ''))
  }
  return []
}

export const prompt = (cwd: string) => `${c.user('janit@sys')}:${c.neon(pretty(cwd))}$ `
