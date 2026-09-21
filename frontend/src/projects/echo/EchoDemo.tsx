import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import HonestNotes from '../../components/HonestNotes'
import UploadZone from '../../components/UploadZone'
import { ECHO_NOTES } from '../notes'
import { POLL_MS, type Job, type Minutes, type Stage } from './api'
import { useEcho } from './useEcho'

const STAGE_LABEL: Record<Stage, string> = {
  queued: 'QUEUED',
  uploading: 'UPLOADING TO MODEL',
  listening: 'LISTENING',
  done: 'COMPLETE',
  error: 'FAILED',
}

/** Speaker 1 gets cyan, speaker 2 magenta, and so on, so the transcript is scannable. */
const SPEAKER_COLORS = ['text-neon', 'text-hot', 'text-acid', 'text-amber-300', 'text-violet-300']

export default function EchoDemo() {
  // All the behaviour lives in useEcho, shared with the professional skin.
  const { online, job, uploadFraction, error, filename, minutes, running, busy, onFile } = useEcho()


  return (
    <div className="mt-8 space-y-6">
      {online === false && (
        <p className="hud-panel p-4 font-mono text-sm text-hot">
          ECHO is offline: the server has no GEMINI_API_KEY set. Nothing can be processed until it does.
        </p>
      )}

      <UploadZone
        accept="audio/*,video/mp4,video/webm,.m4a,.mp3,.wav,.ogg,.flac"
        title="DROP A MEETING RECORDING"
        hint="wav / mp3 / m4a / mp4 / ogg / flac - up to 100 MB, 5 per hour"
        busy={
          busy
            ? {
                label: STAGE_LABEL[job?.stage ?? 'uploading'],
                detail:
                  job === null
                    ? `sending ${filename} - ${Math.round(uploadFraction * 100)}%`
                    : `${filename} - asking the server every ${POLL_MS / 1000}s`,
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
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            <Report minutes={minutes} seconds={job?.seconds ?? 0} />
          </motion.div>
        )}
      </AnimatePresence>

      <HonestNotes notes={ECHO_NOTES} />
    </div>
  )
}

/** The live status line while the job runs: which stage, and how long it has taken. */
function JobTicker({ job }: { job: Job }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const stages: Stage[] = ['queued', 'uploading', 'listening']
  const reached = stages.indexOf(job.stage)

  return (
    <div className="hud-panel p-4 font-mono text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-dim">
          job <span className="text-neon">{job.id.slice(0, 8)}</span>
        </span>
        <span className="text-dim">
          {elapsed}s elapsed - polling every {POLL_MS / 1000}s
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {stages.map((stage, i) => (
          <span
            key={stage}
            className={`border px-2 py-0.5 tracking-widest ${
              i < reached
                ? 'border-acid/40 text-acid'
                : i === reached
                  ? 'border-neon bg-neon/10 text-neon text-glow'
                  : 'border-dim/30 text-dim'
            }`}
          >
            {STAGE_LABEL[stage]}
          </span>
        ))}
      </div>
      <p className="mt-3 text-dim">
        A long recording takes a while. The browser is not frozen - it is asking the server for this job's
        status, over and over, until the minutes are ready.
      </p>
    </div>
  )
}

function Report({ minutes, seconds }: { minutes: Minutes; seconds: number }) {
  const speakers = [...new Set(minutes.transcript.map((t) => t.speaker))]
  const colorOf = (speaker: string) => SPEAKER_COLORS[speakers.indexOf(speaker) % SPEAKER_COLORS.length]

  return (
    <>
      <div className="hud-panel p-5">
        <p className="font-mono text-xs tracking-widest text-dim">MINUTES - {seconds}s</p>
        <h2 className="mt-1 font-display text-3xl text-neon text-glow">{minutes.title}</h2>
        <p className="mt-3 leading-relaxed">{minutes.summary}</p>
        {minutes.topics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {minutes.topics.map((topic) => (
              <span key={topic} className="border border-neon/30 px-2 py-0.5 font-mono text-xs text-neon">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="DECISIONS" empty="no decisions were reached">
          {minutes.decisions.map((decision, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-acid">&gt;</span>
              <span>{decision}</span>
            </li>
          ))}
        </Panel>

        <Panel title="ACTION ITEMS" empty="nobody committed to anything">
          {minutes.actions.map((action, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-hot">&gt;</span>
              <span>
                {action.task}
                <span className="ml-1 font-mono text-xs text-dim">
                  [{action.owner} - {action.due}]
                </span>
              </span>
            </li>
          ))}
        </Panel>
      </div>

      <div className="hud-panel p-5">
        <p className="font-mono text-xs tracking-widest text-dim">TRANSCRIPT - {speakers.length} voices</p>
        <div className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto pr-2">
          {minutes.transcript.map((turn, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr] gap-3">
              <span className="font-mono text-xs text-dim">{turn.start}</span>
              <p>
                <span className={`font-mono text-xs tracking-widest ${colorOf(turn.speaker)}`}>
                  {turn.speaker}
                </span>
                <br />
                {turn.text}
              </p>
            </div>
          ))}
          {minutes.transcript.length === 0 && (
            <p className="font-mono text-sm text-dim">no speech was found in this recording</p>
          )}
        </div>
      </div>
    </>
  )
}

function Panel({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children : [children]
  return (
    <div className="hud-panel p-5">
      <p className="font-mono text-xs tracking-widest text-dim">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">{children}</ul>
      ) : (
        <p className="mt-3 font-mono text-sm text-dim">{empty}</p>
      )}
    </div>
  )
}
