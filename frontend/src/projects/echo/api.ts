// Talking to the ECHO backend (backend/app/routers/echo.py).
//
// ECHO is the first mission where the work takes longer than a request can wait.
// So it happens in two parts:
//   1. POST the recording -> the server answers 202 with a job id, straight away.
//   2. Ask "how is job <id> doing?" every couple of seconds until it says done.
// That second part is called *polling*.

export type Turn = { speaker: string; start: string; text: string }
export type ActionItem = { task: string; owner: string; due: string }
export type Minutes = {
  title: string
  summary: string
  topics: string[]
  decisions: string[]
  actions: ActionItem[]
  transcript: Turn[]
}
export type Stage = 'queued' | 'uploading' | 'listening' | 'done' | 'error'
export type Job = {
  id: string
  filename: string
  stage: Stage
  percent: number
  seconds: number
  error: string
  minutes: Minutes | null
}

/** How long to wait between two "is it done yet?" questions. */
export const POLL_MS = 2000

export async function getStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/echo/status')
    return res.ok && (await res.json()).ready
  } catch {
    return false
  }
}

/**
 * Step 1. Upload with XMLHttpRequest instead of fetch, because fetch can't
 * report upload progress and a 50 MB recording deserves a progress bar.
 * Resolves with the job id as soon as the server has the file.
 */
export function submitRecording(file: File, onProgress: (fraction: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file) // the name must match the `file` parameter in FastAPI
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/echo/jobs')
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => {
      let body: { detail?: string; id?: string } = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status === 202 && body.id) resolve(body.id)
      else reject(new Error(body.detail ?? `upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('backend uplink offline'))
    xhr.send(form)
  })
}

export async function getJob(id: string): Promise<Job> {
  const res = await fetch(`/api/echo/jobs/${id}`)
  if (!res.ok) {
    let detail = `error ${res.status}`
    try {
      detail = String((await res.json()).detail ?? detail)
    } catch {
      /* non-JSON error page */
    }
    throw new Error(detail)
  }
  return res.json()
}

/**
 * Step 2: the polling loop.
 *
 * Ask the server about the job, hand the answer to `onUpdate` so the page can
 * redraw, and stop as soon as the job is finished or broken. `stopped()` lets
 * the page cancel the loop when the visitor leaves, so it doesn't keep asking
 * about a job nobody is watching any more.
 */
export async function pollJob(
  id: string,
  onUpdate: (job: Job) => void,
  stopped: () => boolean,
): Promise<Job | null> {
  for (;;) {
    await new Promise((r) => setTimeout(r, POLL_MS))
    if (stopped()) return null
    const job = await getJob(id)
    onUpdate(job)
    if (job.stage === 'done' || job.stage === 'error') return job
  }
}
