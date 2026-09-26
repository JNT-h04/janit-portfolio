import { useEffect, useRef } from 'react'

/**
 * Built-in samples, so every live demo can be tried with one click, and the
 * two-way line between the demos and NOVA (the casual side's guide).
 *
 * The files live in public/samples, so they ship with the site and cost the
 * API nothing until the visitor actually runs one.
 */
const base = import.meta.env.BASE_URL

export const BOOK_SAMPLE = {
  url: `${base}samples/the-art-of-war.txt`,
  file: 'the-art-of-war.txt',
  title: 'The Art of War',
  credit: 'Sun Tzu, tr. Lionel Giles (1910). Public domain, via Project Gutenberg.',
}

export const MEETING_SAMPLE = {
  url: `${base}samples/team-sync.wav`,
  file: 'team-sync.wav',
  title: 'Team sync, 1 min, 3 speakers',
  credit: 'A made-up meeting voiced with text-to-speech, so nobody real is recorded.',
}

/** Fetch a bundled sample as a File, exactly as if the visitor had picked it. */
export async function sampleFile(sample: { url: string; file: string }): Promise<File> {
  const res = await fetch(sample.url)
  if (!res.ok) throw new Error(`couldn't load the sample (${res.status})`)
  const blob = await res.blob()
  return new File([blob], sample.file, { type: blob.type })
}

// ---------------------------------------------------------------- demo <-> NOVA
export type SampleRequest = { slug: string; which?: string }
export type DemoResult = { slug: string; text: string; ok: boolean }

/** NOVA asks the demo on screen to run one of its samples. */
export const requestSample = (detail: SampleRequest) => dispatchEvent(new CustomEvent('nova:sample', { detail }))

/** A demo reports what happened, in one sentence NOVA can read out. */
export const announce = (detail: DemoResult) => dispatchEvent(new CustomEvent('nova:demo', { detail }))

/**
 * Ask for a sample to run on a page that has not opened yet. The "try it"
 * buttons use this: they navigate to the demo, and the demo picks the request
 * up once it has mounted behind the page transition.
 */
let queued: SampleRequest | null = null
export const queueSample = (detail: SampleRequest) => {
  queued = detail
}

/** Run `handler` when NOVA (or a "try it" button) asks this demo for a sample. */
export function useSampleRequests(slug: string, handler: (which?: string) => void) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  useEffect(() => {
    // Wait for the transition to uncover the page, so the visitor sees it start.
    if (queued?.slug !== slug) return
    const which = queued.which
    const t = setTimeout(() => {
      queued = null
      latest.current(which)
      // bring the demo into view, or on a phone it runs below the fold unseen
      document.querySelector('main input[type=file]')?.closest('section, div')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 900)
    return () => clearTimeout(t)
  }, [slug])
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<SampleRequest>).detail
      if (d.slug === slug) latest.current(d.which)
    }
    addEventListener('nova:sample', on)
    return () => removeEventListener('nova:sample', on)
  }, [slug])
}
