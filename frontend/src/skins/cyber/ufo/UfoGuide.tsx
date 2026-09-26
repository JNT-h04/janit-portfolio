import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProfile } from '../../../api/profile'
import { RESUME_FILE, RESUME_URL } from '../../../data/resume'
import { requestSample, type DemoResult } from '../../../projects/samples'
import { useTerminal } from '../../../terminal/context'
import { chipsFor, understand, type Context, type Reply } from './brain'
import { canListen, canSpeak, hush, listen, speak } from './speech'
import { PROJECT_INTROS, TOUR, TOUR_END } from './tour'
import UfoSprite from './UfoSprite'

const SEEN_KEY = 'janit.nova'
const VOICE_KEY = 'janit.nova.voice'
const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* private mode: forget between visits, that's fine */
    }
  },
}

type Pos = { x: number; y: number }
const SIZE = { w: 96, h: 64 }
const MOBILE_SIZE = { w: 68, h: 46 }
/** How long a route change takes to settle behind the block transition. */
const ROUTE_SETTLE_MS = 1800

const slugOf = (path: string) => path.match(/\/projects\/([^/]+)/)?.[1]
const isTyping = () => {
  const el = document.activeElement
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement | null)?.isContentEditable
}

/**
 * NOVA, the tour drone on the casual side. It flies to parts of the page,
 * lights them with a tractor beam, talks (optionally out loud), runs demos on
 * their samples and reads out the result, and answers questions from the
 * profile and the honest project notes. See brain.ts for what it understands.
 */
export default function UfoGuide() {
  const reduced = useReducedMotion()
  const navigate = useNavigate()
  const location = useLocation()
  const terminal = useTerminal()
  const profileState = useProfile()
  const profile = profileState.status === 'online' ? profileState.profile : null
  const page = slugOf(location.pathname)

  const [present, setPresent] = useState(false) // on screen at all
  const [cloaked, setCloaked] = useState(false) // dismissed to the beacon
  const [open, setOpen] = useState(false) // speech bubble showing
  const [line, setLine] = useState('')
  const [typed, setTyped] = useState(0)
  const [chips, setChips] = useState<string[]>([])
  const [pos, setPos] = useState<Pos>({ x: 24, y: 0 })
  const [beam, setBeam] = useState(0)
  const [step, setStep] = useState<number | null>(null)
  const [offerTour, setOfferTour] = useState(false)
  const [voice, setVoice] = useState(() => store.get(VOICE_KEY) === 'on')
  const [talking, setTalking] = useState(false)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [draft, setDraft] = useState('')
  const [waiting, setWaiting] = useState<string | null>(null) // a demo NOVA started
  const [mobile, setMobile] = useState(() => window.innerWidth < 640)
  // An automatic tip on a phone is just its sentence: the full panel with
  // chips and the question box would cover the demo the tip is about.
  const [compact, setCompact] = useState(false)

  const target = useRef<Element | null>(null)
  const stopListening = useRef<() => void>(() => {})
  const memory = useRef<Pick<Context, 'topic' | 'quoted'>>({})
  const history = useRef<string[]>([])
  const historyAt = useRef(-1)
  const input = useRef<HTMLInputElement>(null)
  const waitTimer = useRef<number | undefined>(undefined)
  const size = mobile ? MOBILE_SIZE : SIZE

  // Tips NOVA volunteers (not answers to a question) fold away on their own,
  // so the bubble never sits on the thing it just told you to click.
  const autoClose = useRef<number | undefined>(undefined)
  const keepOpen = () => window.clearTimeout(autoClose.current)

  // -------------------------------------------------------------- placement
  const dock = useCallback((): Pos => ({ x: 20, y: window.innerHeight - size.h - (mobile ? 18 : 28) }), [mobile, size.h])

  /** Hover above the target, beam down onto it; stay inside the viewport. */
  const hoverOver = useCallback(
    (el: Element) => {
      const r = el.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const x = Math.min(Math.max(r.left + Math.min(r.width, 420) / 2 - size.w / 2, 12), vw - size.w - 12)
      const y = Math.min(Math.max(r.top - size.h - 64, 72), vh - size.h - 12)
      setPos({ x, y })
      const gap = r.top - (y + size.h * 0.7)
      setBeam(gap > 8 ? Math.min((gap / size.h) * 80, 160) : 0)
    },
    [size.h, size.w],
  )

  const light = (el: Element | null) => {
    target.current?.classList.remove('nova-target')
    target.current = el
    el?.classList.add('nova-target')
  }

  const flyTo = useCallback(
    (selector: string) => {
      // the first match that is actually on screen: some controls exist twice,
      // once in the desktop nav and once in the phone menu
      const el = [...document.querySelectorAll(selector)].find((e) => e.getClientRects().length > 0)
      if (!el) return false
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
      light(el)
      window.setTimeout(() => el.isConnected && hoverOver(el), reduced ? 30 : 650)
      return true
    },
    [hoverOver, reduced],
  )

  const goHome = useCallback(() => {
    light(null)
    setBeam(0)
    setPos(dock())
  }, [dock])

  // keep the beam on its target while the visitor scrolls
  useEffect(() => {
    const onMove = () => {
      setMobile(window.innerWidth < 640)
      if (target.current?.isConnected) hoverOver(target.current)
      else setPos((p) => (step === null ? dock() : p))
    }
    let raf = 0
    const tick = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(onMove)
    }
    addEventListener('scroll', tick, { passive: true })
    addEventListener('resize', tick)
    return () => {
      removeEventListener('scroll', tick)
      removeEventListener('resize', tick)
      cancelAnimationFrame(raf)
    }
  }, [dock, hoverOver, step])

  // -------------------------------------------------------------- talking
  const say = useCallback(
    (text: string, opts: { auto?: boolean; chips?: string[] } = {}) => {
      window.clearTimeout(autoClose.current)
      setLine(text)
      setTyped(0)
      setOpen(true)
      setChips(opts.chips ?? [])
      setCompact(!!opts.auto)
      if (opts.auto) {
        autoClose.current = window.setTimeout(() => {
          hush()
          setOpen(false)
        }, Math.max(5000, text.length * 60 + 3500))
      }
      setTalking(true)
      if (voice && canSpeak) speak(text, () => setTalking(false))
    },
    [voice],
  )

  // typewriter; when voice is off, "talking" ends with the typing
  useEffect(() => {
    if (typed >= line.length) {
      if (!voice) setTalking(false)
      return
    }
    const t = window.setTimeout(() => setTyped((n) => Math.min(line.length, n + (reduced ? line.length : 2))), 18)
    return () => clearTimeout(t)
  }, [typed, line, voice, reduced])

  // -------------------------------------------------------------- arrival
  useEffect(() => {
    // First visit: arrive after the boot log and block load have played, and
    // offer the tour. Later visits: park quietly in the corner.
    const first = store.get(SEEN_KEY) !== 'seen'
    const t = window.setTimeout(
      () => {
        setPos({ x: window.innerWidth + 40, y: 90 })
        setPresent(true)
        window.setTimeout(() => {
          setPos(dock())
          if (first) {
            store.set(SEEN_KEY, 'seen')
            setOfferTour(true)
            say("Greetings, human. I'm NOVA, your tour drone. Want the thirty-second tour?")
          }
        }, 80)
      },
      first ? 6500 : 1500,
    )
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, [])

  // a short tip on each mission page, once per visit to it
  const lastPath = useRef('')
  useEffect(() => {
    if (!present || cloaked || step !== null) return
    if (location.pathname === lastPath.current) return
    lastPath.current = location.pathname
    goHome()
    if (page && PROJECT_INTROS[page] && waiting !== page) {
      const t = window.setTimeout(() => say(PROJECT_INTROS[page], { auto: true, chips: chipsFor(page) }), ROUTE_SETTLE_MS - 100)
      return () => clearTimeout(t)
    }
  }, [location.pathname, page, present, cloaked, step, goHome, say, waiting])

  // demos report back; NOVA reads out the result of one it started, and
  // mentions others briefly
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<DemoResult>).detail
      if (cloaked) return
      const mine = waiting === d.slug
      if (mine) {
        setWaiting(null)
        window.clearTimeout(waitTimer.current)
      }
      say(d.text, { auto: !mine, chips: chipsFor(d.slug) })
    }
    addEventListener('nova:demo', on)
    return () => removeEventListener('nova:demo', on)
  }, [cloaked, waiting, say])

  // on phones the terminal covers the bottom of the screen: step aside
  const hiddenByTerminal = mobile && terminal.open

  // -------------------------------------------------------------- tour
  const runStep = useCallback(
    (i: number) => {
      if (i >= TOUR.length) {
        setStep(null)
        goHome()
        say(TOUR_END, { chips: chipsFor(page) })
        return
      }
      setStep(i)
      const s = TOUR[i]
      if (!flyTo(s.target)) return runStep(i + 1) // missing on this layout: skip it
      window.setTimeout(() => say(s.say), reduced ? 0 : 600)
    },
    [flyTo, goHome, say, reduced, page],
  )

  const startTour = useCallback(() => {
    setOfferTour(false)
    if (location.pathname !== '/') {
      navigate('/')
      window.setTimeout(() => runStep(0), ROUTE_SETTLE_MS)
    } else runStep(0)
  }, [location.pathname, navigate, runStep])

  // The "take the tour" buttons in the menu and on the home page.
  useEffect(() => {
    const on = () => {
      setCloaked(false)
      setPresent(true)
      store.set(SEEN_KEY, 'seen')
      startTour()
    }
    addEventListener('nova:tour', on)
    return () => removeEventListener('nova:tour', on)
  }, [startTour])

  const endTour = () => {
    setStep(null)
    goHome()
    say('Tour ended. Ask me anything, or say "tour" to go again.', { chips: chipsFor(page) })
  }

  // -------------------------------------------------------------- actions
  const onPage = (slug: string) => page === slug

  const act = useCallback(
    (r: Reply) => {
      setOfferTour(false)
      setStep(null)
      memory.current = { topic: r.topic, quoted: r.quoted }
      const opts = { chips: r.chips }
      switch (r.kind) {
        case 'goto': {
          const sel = r.section === 'top' ? '.cyber-title' : `#${r.section} h2`
          if (location.pathname !== '/') {
            navigate(r.section === 'top' ? '/' : `/#${r.section}`)
            window.setTimeout(() => flyTo(sel), ROUTE_SETTLE_MS + 100)
          } else flyTo(sel)
          break
        }
        case 'project':
          goHome()
          if (onPage(r.slug)) return say(`You're already in it. ${PROJECT_INTROS[r.slug] ?? ''}`, opts)
          navigate(`/projects/${r.slug}`) // the page's own tip follows once it has opened
          break
        case 'sample':
          goHome()
          setWaiting(r.slug)
          // never wait in silence: ECHO takes ~40s, so give it well over that
          window.clearTimeout(waitTimer.current)
          waitTimer.current = window.setTimeout(() => {
            setWaiting((w) => {
              if (w === r.slug) say('That is taking longer than usual. The free server may still be waking up; the result will appear on the page when it is ready.', { chips: chipsFor(r.slug) })
              return null
            })
          }, r.slug === 'meeting-assistant' ? 150_000 : 90_000)
          if (onPage(r.slug)) requestSample({ slug: r.slug, which: r.which })
          else {
            navigate(`/projects/${r.slug}`)
            // the demo's hook has to be mounted to hear the request
            window.setTimeout(() => requestSample({ slug: r.slug, which: r.which }), ROUTE_SETTLE_MS + 300)
          }
          // flick down to the demo so the visitor sees it run
          window.setTimeout(() => document.querySelector('main input[type=file]')?.closest('section, div')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), onPage(r.slug) ? 50 : ROUTE_SETTLE_MS + 400)
          break
        case 'resume': {
          const link = document.createElement('a')
          link.href = RESUME_URL
          link.download = RESUME_FILE
          link.click()
          break
        }
        case 'terminal':
          goHome()
          terminal.setOpen(true)
          break
        case 'frontdoor':
          flyTo('nav button[title^="back to the start page"]')
          break
        case 'back':
          goHome()
          navigate(-1)
          break
        case 'scroll':
          window.scrollBy({ top: (r.dir === 'down' ? 1 : -1) * window.innerHeight * 0.8, behavior: reduced ? 'auto' : 'smooth' })
          break
        case 'link': {
          const url = profile?.links.find((l) => l.label.toLowerCase() === r.to)?.url
          if (!url) return say("I can't find that link right now.", opts)
          window.open(url, '_blank', 'noopener')
          break
        }
        case 'copy-email': {
          const email = profile?.links.find((l) => l.url.startsWith('mailto:'))?.url.replace('mailto:', '')
          if (!email) return say("I can't find his email right now.", opts)
          navigator.clipboard?.writeText(email).then(
            () => say(`${r.say} (${email})`, opts),
            () => say(`Your browser blocked the clipboard. It's ${email}.`, opts),
          )
          return
        }
        case 'write': {
          const focusForm = () => {
            const field = document.querySelector<HTMLInputElement>('#contact form input:not([tabindex="-1"])')
            field?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
            window.setTimeout(() => field?.focus({ preventScroll: true }), reduced ? 0 : 600)
          }
          goHome()
          if (location.pathname !== '/') {
            navigate('/#contact')
            window.setTimeout(focusForm, ROUTE_SETTLE_MS + 100)
          } else focusForm()
          // say it, then fold away so the form is clear
          say(r.say, { auto: true })
          return
        }
        case 'voice':
          setVoice(r.on)
          store.set(VOICE_KEY, r.on ? 'on' : 'off')
          if (!r.on) {
            hush()
            setTalking(false)
            setLine(r.say)
            setTyped(r.say.length)
            setChips(r.chips)
            return
          }
          setLine(r.say)
          setTyped(0)
          setChips(r.chips)
          setTalking(true)
          speak(r.say, () => setTalking(false))
          return
        case 'stop':
          hush()
          setTalking(false)
          setTyped(line.length)
          return
        case 'tour':
          startTour()
          return
        case 'hide':
          say(r.say)
          window.setTimeout(() => {
            hush()
            setOpen(false)
            setCloaked(true)
            goHome()
          }, 1400)
          return
      }
      say(r.say, opts)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onPage reads `page`, listed
    [flyTo, goHome, location.pathname, navigate, say, startTour, terminal, profile, page, reduced, line],
  )

  const ask = (text: string) => {
    if (text.trim()) {
      history.current = [text, ...history.current.filter((h) => h !== text)].slice(0, 20)
      historyAt.current = -1
    }
    act(understand(text, profile, { page, ...memory.current }))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    ask(draft)
    setDraft('')
  }

  // ↑ / ↓ walk back through what you asked, like a terminal
  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    const h = history.current
    if (!h.length) return
    e.preventDefault()
    historyAt.current = Math.max(-1, Math.min(h.length - 1, historyAt.current + (e.key === 'ArrowUp' ? 1 : -1)))
    setDraft(historyAt.current === -1 ? '' : h[historyAt.current])
  }

  const toggleMic = () => {
    if (listening) {
      stopListening.current()
      setListening(false)
      return
    }
    hush()
    setHeard('')
    setListening(true)
    setOpen(true)
    stopListening.current = listen({
      onPartial: setHeard,
      onFinal: (text) => {
        setHeard(text)
        ask(text)
      },
      onFail: (reason) => say(`Hmm, ${reason}`, { chips: chipsFor(page) }),
      onEnd: () => setListening(false),
    })
  }

  const toggleVoice = () => act(understand(voice ? 'voice off' : 'voice on', profile, { page }))

  const summon = useCallback(() => {
    setCloaked(false)
    setOpen(true)
    if (!line || step === null) say(step === null ? 'What do you need?' : TOUR[step].say, { chips: chipsFor(page) })
    window.setTimeout(() => input.current?.focus(), 60)
  }, [line, step, say, page])

  // keyboard: N opens NOVA, Escape closes it (the terminal handles its own Escape first)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !terminal.open) {
        hush()
        setOpen(false)
        setStep(null)
        goHome()
        return
      }
      if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping() && !terminal.open && present) {
        e.preventDefault()
        if (open && !cloaked) {
          hush()
          setOpen(false)
        } else summon()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, cloaked, present, terminal.open, goHome, summon])

  useEffect(
    () => () => {
      light(null)
      window.clearTimeout(autoClose.current)
      window.clearTimeout(waitTimer.current)
      hush()
    },
    [],
  )

  if (!present || hiddenByTerminal) return null

  // -------------------------------------------------------------- render
  if (cloaked) {
    return (
      <button
        onClick={summon}
        className="nova-beacon fixed bottom-5 left-5 z-[50] flex items-center gap-2 border border-neon/50 bg-void/80 px-3 py-1.5 font-mono text-xs tracking-widest text-neon backdrop-blur"
        aria-label="Summon NOVA, the tour guide (N)"
        title="Summon NOVA (N)"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-neon" /> NOVA
      </button>
    )
  }

  const bubbleLeft = pos.x > window.innerWidth / 2
  const shown = line.slice(0, typed)

  return (
    <>
      <motion.button
        type="button"
        className="nova-ship fixed top-0 left-0 z-[50] cursor-pointer"
        style={{ width: size.w, height: size.h }}
        initial={false}
        animate={{ x: pos.x, y: pos.y }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 14, mass: 0.9 }}
        onClick={() => {
          if (open) {
            hush()
            setOpen(false)
          } else summon()
        }}
        aria-label={open ? 'Close NOVA' : 'Open NOVA, the tour guide (N)'}
        aria-expanded={open}
        title="NOVA (N)"
      >
        <div className="nova-bob h-full w-full">
          <UfoSprite talking={talking || waiting !== null} listening={listening} beam={beam} />
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="bubble"
            role="dialog"
            aria-label="NOVA, the tour guide"
            className={mobile ? 'fixed inset-x-3 bottom-[5.5rem] z-[51]' : 'fixed z-[51] w-[360px]'}
            style={
              mobile
                ? undefined
                : {
                    left: bubbleLeft ? undefined : Math.min(pos.x + size.w + 10, window.innerWidth - 372),
                    right: bubbleLeft ? window.innerWidth - pos.x + 10 : undefined,
                    top: Math.min(Math.max(pos.y - 20, 70), window.innerHeight - 300),
                  }
            }
            initial={{ opacity: 0, scale: 0.92, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
          >
            <div
              onPointerEnter={keepOpen}
              onPointerDown={keepOpen}
              onFocus={keepOpen}
              className="nova-bubble hud-panel border border-neon/40 bg-void/92 p-4 font-mono text-sm shadow-[0_0_30px_rgb(0_240_255/0.18)]"
            >
              <div className="mb-2 flex items-center justify-between text-[11px] tracking-widest">
                <span className="text-neon">
                  NOVA {step !== null && <span className="text-dim">· TOUR {step + 1}/{TOUR.length}</span>}
                  {waiting && <span className="nova-caret text-acid"> · RUNNING DEMO</span>}
                </span>
                <span className="flex items-center gap-3">
                  {canSpeak && (
                    <button onClick={toggleVoice} className={voice ? 'text-acid' : 'text-dim hover:text-neon'} aria-pressed={voice} title="read answers out loud">
                      {voice ? '◉ VOICE' : '○ VOICE'}
                    </button>
                  )}
                  <button onClick={() => act(understand('hide', profile, { page }))} className="text-hot hover:text-glow" aria-label="Dismiss NOVA">
                    ✕
                  </button>
                </span>
              </div>

              <p className={`${mobile && compact ? 'text-[13px] ' : 'min-h-[3.5em] '}leading-relaxed text-text`} aria-live="polite">
                {listening ? <span className="text-acid">{heard || 'listening…'}</span> : shown}
                {!listening && typed < line.length && <span className="nova-caret">▌</span>}
              </p>

              {mobile && compact && step === null && !offerTour && (
                <button
                  onClick={() => {
                    keepOpen()
                    setCompact(false)
                  }}
                  className="mt-2 text-xs text-acid underline decoration-dotted"
                >
                  ask NOVA something &#9656;
                </button>
              )}

              {offerTour && (
                <div className="mt-3 flex gap-2">
                  <button onClick={startTour} className="border border-acid bg-acid/10 px-3 py-1 text-acid hover:bg-acid hover:text-void">
                    START TOUR
                  </button>
                  <button
                    onClick={() => {
                      setOfferTour(false)
                      say('Roger. Ask me anything, or click me later.', { chips: chipsFor(page) })
                    }}
                    className="border border-dim px-3 py-1 text-dim hover:border-neon hover:text-neon"
                  >
                    EXPLORE ALONE
                  </button>
                </div>
              )}

              {step !== null && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => runStep(step + 1)} className="border border-neon bg-neon/10 px-3 py-1 text-neon hover:bg-neon hover:text-void">
                    {step + 1 < TOUR.length ? 'NEXT ►' : 'FINISH'}
                  </button>
                  <button onClick={endTour} className="border border-dim px-3 py-1 text-dim hover:border-hot hover:text-hot">
                    END TOUR
                  </button>
                </div>
              )}

              {step === null && !offerTour && !(mobile && compact) && chips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Suggestions">
                  {chips.map((c) => (
                    <button
                      key={c}
                      onClick={() => ask(c)}
                      className="nova-chip border border-neon/30 px-2 py-0.5 text-[11px] text-neon/90 transition-colors hover:border-neon hover:bg-neon/10"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {step === null && !offerTour && !(mobile && compact) && (
                <form onSubmit={submit} className="mt-3 flex items-center gap-2">
                  <input
                    ref={input}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onInputKey}
                    placeholder='ask: "how accurate is fracture?"'
                    className="min-w-0 flex-1 border border-neon/30 bg-void/60 px-2 py-1 text-xs text-text outline-none placeholder:text-dim focus:border-neon"
                    aria-label="Ask NOVA"
                    maxLength={200}
                  />
                  {canListen && (
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`border px-2 py-1 text-xs ${listening ? 'nova-mic-live border-hot bg-hot text-void' : 'border-hot/60 text-hot hover:bg-hot hover:text-void'}`}
                      aria-pressed={listening}
                      title="ask out loud (your browser's speech service hears it)"
                    >
                      {listening ? '■ STOP' : '● MIC'}
                    </button>
                  )}
                  <button type="submit" className="border border-neon/60 px-2 py-1 text-xs text-neon hover:bg-neon hover:text-void" aria-label="Send">
                    ►
                  </button>
                </form>
              )}
              <p className="mt-2 hidden text-[10px] text-dim sm:block">N toggles me · ↑ repeats your last question · Esc closes</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
