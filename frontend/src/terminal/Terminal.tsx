import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { c, COMMANDS, completions, prompt, runRemote, type Ctx } from './commands'
import { HOME } from './fs'

const BANNER = [
  c.neon('╔════════════════════════╗'),
  c.neon('║  ') + c.bold('J A N I T ') + c.hot('://') + c.bold(' S Y S') + c.neon('  ║'),
  c.neon('╚════════════════════════╝'),
  '',
  `welcome, guest. type ${c.acid('help')} to begin.`,
  '',
].join('\r\n')

/**
 * xterm.js only draws characters and reports keys. It is not a shell. So this
 * component is the shell: it keeps the line being typed, handles editing keys,
 * and runs commands when you press Enter.
 */
export default function Terminal({ onClose, active }: { onClose: () => void; active: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const navigate = useNavigate()
  // Keep the latest callbacks in refs so the one-time setup below always calls current versions.
  const navRef = useRef(navigate)
  const closeRef = useRef(onClose)
  navRef.current = navigate
  closeRef.current = onClose

  useEffect(() => {
    const term = new XTerm({
      fontFamily: '"Share Tech Mono", ui-monospace, monospace',
      fontSize: 15,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: true,
      // Old monochrome-monitor palette: everything is a shade of phosphor green.
      theme: {
        background: '#00000000',
        foreground: '#39ff88',
        cursor: '#bfffd0',
        cursorAccent: '#02140a',
        selectionBackground: '#39ff8855',
      },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(hostRef.current!)
    fit.fit()
    termRef.current = term
    fitRef.current = fit

    let cwd = HOME
    let line = '' // what the user has typed so far
    let cursor = 0 // cursor position inside `line`
    let busy = false // true while a command is running
    const history: string[] = []
    let historyIndex = 0

    // Redraw the whole input line: go to the line start, erase it, print the
    // prompt and the text, then move the cursor back to the right column.
    const redraw = () => {
      term.write('\r\x1b[K' + prompt(cwd) + line)
      const back = line.length - cursor
      if (back > 0) term.write(`\x1b[${back}D`)
    }
    const newPrompt = () => {
      line = ''
      cursor = 0
      term.write('\r\n' + prompt(cwd))
    }

    const ctx: Ctx = {
      get cwd() {
        return cwd
      },
      setCwd: (p) => (cwd = p),
      history,
      navigate: (to) => navRef.current(to),
      close: () => closeRef.current(),
      clear: () => term.clear(),
      write: (text) => term.write(text),
    }

    const execute = async (input: string) => {
      const [name, ...args] = input.trim().split(/\s+/)
      if (!name) return
      history.push(input.trim())
      historyIndex = history.length
      busy = true
      term.write('\r\n')
      try {
        const cmd = COMMANDS[name]
        const output = cmd ? await cmd.run(args, ctx) : await runRemote(name, args)
        if (output) term.write(output.replace(/\n/g, '\r\n'))
      } catch (err) {
        term.write(c.hot(`${name}: crashed (${String(err)})`))
      }
      busy = false
      if (name === 'clear') {
        line = ''
        cursor = 0
        term.write('\x1b[H\x1b[2J' + prompt(cwd))
      } else {
        newPrompt()
      }
    }

    const insert = (text: string) => {
      line = line.slice(0, cursor) + text + line.slice(cursor)
      cursor += text.length
      redraw()
    }

    const tab = () => {
      const words = line.slice(0, cursor).split(/\s+/)
      const options = completions(words, cwd)
      if (options.length === 1) {
        const partial = words[words.length - 1]
        const addition = options[0].slice(partial.length)
        insert(addition + (options[0].endsWith('/') ? '' : ' '))
      } else if (options.length > 1) {
        term.write('\r\n' + options.join('   ') + '\r\n')
        redraw()
      }
    }

    // onData delivers every key press (or pasted text) as a string.
    const sub = term.onData((data) => {
      if (busy) return
      switch (data) {
        case '\r': // Enter
          execute(line)
          if (!line.trim()) newPrompt()
          return
        case '\x7f': // Backspace
          if (cursor > 0) {
            line = line.slice(0, cursor - 1) + line.slice(cursor)
            cursor--
            redraw()
          }
          return
        case '\x1b[3~': // Delete
          line = line.slice(0, cursor) + line.slice(cursor + 1)
          redraw()
          return
        case '\x1b[D': // Left
          if (cursor > 0) cursor--, term.write(data)
          return
        case '\x1b[C': // Right
          if (cursor < line.length) cursor++, term.write(data)
          return
        case '\x1b[H': // Home
        case '\x01': // Ctrl+A
          cursor = 0
          redraw()
          return
        case '\x1b[F': // End
        case '\x05': // Ctrl+E
          cursor = line.length
          redraw()
          return
        case '\x1b[A': // Up: older history
          if (historyIndex > 0) {
            line = history[--historyIndex]
            cursor = line.length
            redraw()
          }
          return
        case '\x1b[B': // Down: newer history
          if (historyIndex < history.length) {
            line = history[++historyIndex] ?? ''
            cursor = line.length
            redraw()
          }
          return
        case '\t':
          tab()
          return
        case '\x03': // Ctrl+C
          term.write('^C')
          newPrompt()
          return
        case '\x0c': // Ctrl+L
          term.write('\x1b[H\x1b[2J')
          redraw()
          return
        case '\x1b': // Esc. xterm keeps this key to itself, so the page-level
        //             Escape listener never sees it; close from here instead.
        case '`': // the toggle key closes the terminal instead of typing
          closeRef.current()
          return
      }
      // Anything else that is printable gets typed (this also covers paste).
      const printable = data.replace(/[\x00-\x1f\x7f]/g, '')
      if (printable) insert(printable)
    })

    term.write(BANNER + prompt(cwd))

    const onResize = () => fit.fit()
    addEventListener('resize', onResize)
    return () => {
      removeEventListener('resize', onResize)
      sub.dispose()
      term.dispose()
    }
  }, [])

  // When the dock opens, re-measure (it had no size while hidden) and focus.
  // When it closes, let go of the keyboard, otherwise the hidden terminal
  // would swallow the next ` press and the dock could never reopen.
  useEffect(() => {
    if (!active) {
      termRef.current?.blur()
      return
    }
    const t = setTimeout(() => {
      fitRef.current?.fit()
      termRef.current?.focus()
    }, 50)
    return () => clearTimeout(t)
  }, [active])

  return <div ref={hostRef} className="h-full w-full" />
}
