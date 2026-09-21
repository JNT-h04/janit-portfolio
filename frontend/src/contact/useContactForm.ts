import { useMemo, useState, type FormEvent } from 'react'
import type { Profile } from '../api/profile'

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
 * The contact form's behaviour, shared by both skins so neither falls behind.
 *
 * Submitting opens the visitor's own mail app with the message already written,
 * rather than posting to a server. That is deliberate: sending mail from the
 * backend would need SMTP credentials living on the server, and a form that
 * silently drops messages when those are missing is worse than no form. This
 * way the message always reaches a real compose window, and the visitor can see
 * for themselves that it was sent.
 */
export function useContactForm(profile: Profile | null) {
  const [name, setName] = useState('')
  const [from, setFrom] = useState('')
  const [message, setMessage] = useState('')
  const [touched, setTouched] = useState(false)
  const [opened, setOpened] = useState(false)
  const [copied, setCopied] = useState(false)

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

  function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!valid || !address) return
    window.location.href = composeMailto({ address, name, from, message })
    setOpened(true)
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
    setOpened(false)
  }

  return {
    name, setName,
    from, setFrom,
    message, setMessage,
    problems, valid, touched,
    opened, reset,
    address, copyAddress, copied,
    submit,
  }
}
