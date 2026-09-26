/**
 * NOVA's voice and ears, using only what the browser already has.
 *
 * Speaking uses speechSynthesis (every modern browser, free, nothing leaves
 * the machine). Listening uses SpeechRecognition, which Chrome, Edge and
 * Safari have and Firefox keeps behind a flag. Chrome sends the audio to
 * Google's recogniser unless on-device recognition is available, so the mic
 * is only ever switched on by a click, and the page says so.
 */

// Not in TypeScript's DOM types yet under the unprefixed name everywhere.
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

const RecognitionImpl: RecognitionCtor | undefined =
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition)

export const canListen = Boolean(RecognitionImpl)
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

/** A voice that sounds a little synthetic on purpose: English, preferring a
 * "Google" or "Microsoft" neural voice when there is one. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
  return (
    voices.find((v) => /Google UK English Female|Microsoft (Aria|Jenny)/i.test(v.name)) ??
    voices.find((v) => /Google|Microsoft|Samantha/i.test(v.name)) ??
    voices[0]
  )
}

export function speak(text: string, onEnd?: () => void) {
  if (!canSpeak) return onEnd?.()
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, ''))
  const voice = pickVoice()
  if (voice) u.voice = voice
  u.rate = 1.04
  u.pitch = 1.35 // a touch higher: small drone, small voice
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  speechSynthesis.speak(u)
}

export function hush() {
  if (canSpeak) speechSynthesis.cancel()
}

/**
 * Listen for one sentence. `onPartial` streams what has been heard so far,
 * `onFinal` gets the finished sentence, `onFail` a short human reason.
 * Returns a function that stops listening.
 */
export function listen(handlers: {
  onPartial: (text: string) => void
  onFinal: (text: string) => void
  onFail: (reason: string) => void
  onEnd: () => void
}): () => void {
  if (!RecognitionImpl) {
    handlers.onFail("this browser can't listen. Type instead.")
    handlers.onEnd()
    return () => {}
  }
  const rec = new RecognitionImpl()
  rec.lang = 'en-US'
  rec.interimResults = true
  rec.continuous = false
  rec.maxAlternatives = 1
  let finished = false
  rec.onresult = (e) => {
    let text = ''
    for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript
    const last = e.results[e.results.length - 1]
    if (last.isFinal) {
      finished = true
      handlers.onFinal(text)
    } else handlers.onPartial(text)
  }
  rec.onerror = (e) => {
    const reasons: Record<string, string> = {
      'not-allowed': 'microphone blocked. Allow it in the address bar, or type instead.',
      'no-speech': "didn't catch anything. Try again?",
      network: 'the speech service is unreachable. Type instead.',
      'audio-capture': 'no microphone found.',
    }
    finished = true
    handlers.onFail(reasons[e.error] ?? `listening failed (${e.error}).`)
  }
  rec.onend = () => {
    if (!finished) handlers.onFail("didn't catch anything. Try again?")
    handlers.onEnd()
  }
  rec.start()
  return () => rec.abort()
}
