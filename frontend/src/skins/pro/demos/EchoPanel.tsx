import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { POLL_MS, type Job, type Minutes, type Stage } from '../../../projects/echo/api'
import { useEcho } from '../../../projects/echo/useEcho'
import { ECHO_NOTES } from '../../../projects/notes'
import DropZone from '../components/DropZone'
import HonestNotes from '../components/HonestNotes'

const STAGE_LABEL: Record<Stage, string> = {
  queued: 'Queued',
  uploading: 'Uploading to the model',
  listening: 'Listening to the recording',
  done: 'Complete',
  error: 'Failed',
}

/** Each speaker gets a colour so the transcript can be skimmed. */
const SPEAKER_COLORS = ['text-coral', 'text-indigo-600', 'text-amber-700', 'text-rose-600', 'text-emerald-700']

export default function EchoPanel() {
  const { online, job, uploadFraction, error, filename, minutes, running, busy, onFile } = useEcho()

  return (
    <div className="space-y-5">
      {online === false && (
        <p className="paper-card p-4 font-sans text-sm text-quiet">
          This demo is offline: the server has no <code className="font-code text-ink">GEMINI_API_KEY</code> set.
        </p>
      )}

      <DropZone
        accept="audio/*,video/mp4,video/webm,.m4a,.mp3,.wav,.ogg,.flac"
        title="Drop a meeting recording"
        hint="wav · mp3 · m4a · mp4 · ogg · flac — up to 100 MB, 5 per hour"
        busy={
          busy
            ? {
                label: STAGE_LABEL[job?.stage ?? 'uploading'],
                detail:
                  job === null
                    ? `Sending ${filename} — ${Math.round(uploadFraction * 100)}%`
                    : `${filename} — checking with the server every ${POLL_MS / 1000}s`,
                progress: job === null ? uploadFraction * 0.2 : job.percent / 100,
              }
            : null
        }
        error={error}
        onFile={onFile}
      />

      {running && job && <JobTicker job={job} />}

      <AnimatePresence>
        {minutes && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            <Report minutes={minutes} seconds={job?.seconds ?? 0} />
          </motion.div>
        )}
      </AnimatePresence>

      <HonestNotes notes={ECHO_NOTES} />
    </div>
  )
}

function JobTicker({ job }: { job: Job }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const stages: Stage[] = ['queued', 'uploading', 'listening']
  const reached = stages.indexOf(job.stage)

  return (
    <div className="paper-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 font-sans text-sm">
        <span className="text-quiet">
          Job <span className="font-code text-ink">{job.id.slice(0, 8)}</span>
        </span>
        <span className="text-quiet">
          {elapsed}s elapsed · checking every {POLL_MS / 1000}s
        </span>
      </div>

      <ol className="mt-4 space-y-2.5">
        {stages.map((stage, i) => (
          <li key={stage} className="flex items-center gap-3 font-sans text-sm">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                i < reached
                  ? 'border-coral bg-coral text-white'
                  : i === reached
                    ? 'border-coral text-coral'
                    : 'border-rule text-quiet'
              }`}
            >
              {i < reached ? '✓' : i + 1}
            </span>
            <span className={i <= reached ? 'text-ink' : 'text-quiet'}>{STAGE_LABEL[stage]}</span>
            {i === reached && (
              <motion.span
                className="h-1 w-1 rounded-full bg-coral"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
            )}
          </li>
        ))}
      </ol>

      <p className="mt-4 font-sans text-sm leading-relaxed text-quiet">
        Long recordings take a while. The page is not frozen — it asks the server for this job's status every
        couple of seconds until the minutes are ready.
      </p>
    </div>
  )
}

function Report({ minutes, seconds }: { minutes: Minutes; seconds: number }) {
  const speakers = [...new Set(minutes.transcript.map((t) => t.speaker))]
  const colorOf = (speaker: string) => SPEAKER_COLORS[speakers.indexOf(speaker) % SPEAKER_COLORS.length]

  return (
    <>
      <div className="paper-card p-6">
        <p className="font-sans text-xs tracking-widest text-quiet uppercase">Minutes · {seconds}s</p>
        <h3 className="mt-2 font-serif text-2xl text-ink">{minutes.title}</h3>
        <p className="mt-3 font-sans text-[15px] leading-[1.75] text-ink/85">{minutes.summary}</p>
        {minutes.topics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {minutes.topics.map((topic) => (
              <span key={topic} className="rounded border border-rule bg-paper px-2 py-0.5 font-sans text-xs text-quiet">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <ListPanel title="Decisions" empty="No decisions were reached.">
          {minutes.decisions.map((decision, i) => (
            <li key={i} className="flex gap-2.5 font-sans text-[15px] leading-relaxed text-ink/85">
              <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-coral" />
              {decision}
            </li>
          ))}
        </ListPanel>

        <ListPanel title="Action items" empty="Nobody committed to anything.">
          {minutes.actions.map((action, i) => (
            <li key={i} className="flex gap-2.5 font-sans text-[15px] leading-relaxed text-ink/85">
              <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-coral" />
              <span>
                {action.task}
                <span className="mt-0.5 block font-sans text-xs text-quiet">
                  {action.owner} · {action.due}
                </span>
              </span>
            </li>
          ))}
        </ListPanel>
      </div>

      <div className="paper-card p-6">
        <p className="font-sans text-xs tracking-widest text-quiet uppercase">
          Transcript · {speakers.length} {speakers.length === 1 ? 'voice' : 'voices'}
        </p>
        <div className="mt-4 max-h-[26rem] space-y-4 overflow-y-auto pr-2">
          {minutes.transcript.map((turn, i) => (
            <div key={i} className="grid grid-cols-[3.2rem_1fr] gap-3">
              <span className="pt-0.5 font-code text-xs text-quiet">{turn.start}</span>
              <p className="font-sans text-[15px] leading-relaxed text-ink/85">
                <span className={`mb-0.5 block text-xs font-semibold ${colorOf(turn.speaker)}`}>
                  {turn.speaker}
                </span>
                {turn.text}
              </p>
            </div>
          ))}
          {minutes.transcript.length === 0 && (
            <p className="font-sans text-sm text-quiet">No speech was found in this recording.</p>
          )}
        </div>
      </div>
    </>
  )
}

function ListPanel({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode
}) {
  const items = Array.isArray(children) ? children : [children]
  return (
    <div className="paper-card p-6">
      <p className="font-sans text-xs tracking-widest text-quiet uppercase">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-3">{children}</ul>
      ) : (
        <p className="mt-4 font-sans text-sm text-quiet">{empty}</p>
      )}
    </div>
  )
}
