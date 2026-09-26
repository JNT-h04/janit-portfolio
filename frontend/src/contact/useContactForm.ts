import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Profile } from '../api/profile'
import { useAudience } from '../audience/audience'
import { api, HAS_API } from '../config'

/** Builds the mailto URL. Exported separately so the exact string can be tested. */
export function composeMailto({
  address,
  name,
  from,
  message,
}: {
  address: string
  name: string
  from: string
  message: string
}) {
  const subject = `Portfolio enquiry from ${name.trim()}`
  const body = `${message.trim()}\n\n---\n${name.trim()}\n${from.trim()}`
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/**
 * How the message left:
 *  - 'sent'      the server delivered it to Janit's inbox
 *  - 'mail-app'  the server couldn't, so the visitor's own mail app was opened
 *                with the message typed in (they still have to press send)
 */
export type Outcome = 'sent' | 'mail-app'

/**
 * The contact form's behaviour, shared by both skins so neither falls behind.
 *
 * It sends through the API (POST /api/contact, delivered by Resend) when the
 * server says mail is set up. If it isn't, or sending fails for any reason,
 * it falls back to opening the visitor's own mail app with the message
 * already written, and says so. A message is never silently dropped.
 */
export function useContactForm(profile: Profile | null) {
  const { company } = useAudience()
  const [name, setName] = useState('')
  const [from, setFrom] = useState('')
  const [message, setMessage] = useState('')
  // Hidden from people; a bot that fills it in is quietly ignored by the server.
  const [website, setWebsite] = useState('')
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  // Why the direct route wasn't used, shown next to the mail-app fallback.
  const [fallbackReason, setFallbackReason] = useState('')
  const [copied, setCopied] = useState(false)
  // null while asking; the API sleeps when idle, so "unknown" must not read as "no".
  const [canSend, setCanSend] = useState<boolean | null>(HAS_API ? null : false)

  useEffect(() => {
    if (!HAS_API) return
    let left = false
    fetch(api('/api/contact/status'))
      .then((r) => (r.ok ? r.json() : { ready: false }))
      .then((s) => !left && setCanSend(Boolean(s.ready)))
      .catch(() => !left && setCanSend(null))
    return () => {
      left = true
    }
  }, [])

  // The address comes from the profile API, so it is never hardcoded twice.
  const address = useMemo(() => {
    const link = profile?.links.find((l) => l.url.startsWith('mailto:'))
    return link ? link.url.replace('mailto:', '') : ''
  }, [profile])

  const problems = {
    name: name.trim().length < 2 ? 'tell me who you are' : '',
    from: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from.trim()) ? '' : 'a reply address, so I can answer',
    message: message.trim().length < 10 ? 'a line or two about what you need' : '',
  }
  const valid = !problems.name && !problems.from && !problems.message

  function openMailApp(reason: string) {
    setFallbackReason(reason)
    if (address) window.location.href = composeMailto({ address, name, from, message })
    setOutcome('mail-app')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!valid || sending) return
    // Known not to be set up: go straight to the mail app.
    if (canSend === false) return openMailApp('')

    setSending(true)
    try {
      const res = await fetch(api('/api/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: from, message, company, website }),
      })
      if (res.ok) {
        setOutcome('sent')
        return
      }
      let detail = `error ${res.status}`
      try {
        detail = String((await res.json()).detail ?? detail)
      } catch {
        /* not JSON */
      }
      openMailApp(res.status === 429 ? 'too many messages from here in the last hour' : detail)
    } catch {
      openMailApp("couldn't reach the server")
    } finally {
      setSending(false)
    }
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* clipboard blocked: the address is on screen anyway */
    }
  }

  function reset() {
    setName('')
    setFrom('')
    setMessage('')
    setTouched(false)
    setOutcome(null)
    setFallbackReason('')
  }

  return {
    name, setName,
    from, setFrom,
    message, setMessage,
    website, setWebsite,
    problems, valid, touched,
    canSend, sending, outcome, fallbackReason, reset,
    address, copyAddress, copied,
    company,
    submit,
  }
}
