import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import HudPanel from '../../components/HudPanel'
import UploadZone from '../../components/UploadZone'
import { analyze, getStatus, listSamples, sampleUrl, type Analysis, type Status } from './api'

const COLORS: Record<string, string> = {
  No_Crack: 'text-acid',
  Minor: 'text-neon',
  Moderate: 'text-[#ffb020]',
  Severe: 'text-hot',
}
const LABELS: Record<string, string> = { No_Crack: 'NO CRACK', Minor: 'MINOR', Moderate: 'MODERATE', Severe: 'SEVERE' }

export default function FractureDemo() {
  const [status, setStatus] = useState<Status | null>(null)
  const [samples, setSamples] = useState<string[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Analysis | null>(null)

  // Ask how the model is doing, and keep asking while it warms up.
  useEffect(() => {
    let timer: number
    const poll = async () => {
      const s = await getStatus()
      setStatus(s)
      if (s.state === 'loading' || s.state === 'idle') timer = window.setTimeout(poll, 1500)
    }
    poll()
    listSamples().then(setSamples)
    return () => clearTimeout(timer)
  }, [])

  const run = async (blob: Blob, name: string, previewUrl: string) => {
    setBusy(true)
    setError('')
    setResult(null)
    setPreview(previewUrl)
    try {
      setResult(await analyze(blob, name))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onFile = (file: File) => run(file, file.name, URL.createObjectURL(file))

  const onSample = async (name: string) => {
    const blob = await (await fetch(sampleUrl(name))).blob()
    run(blob, name, sampleUrl(name))
  }

  const warming = status?.state === 'loading' || status?.state === 'idle'

  return (
    <div className="mt-10 space-y-6">
      {status && status.state !== 'ready' && (
        <div
          className={`border px-4 py-3 font-mono text-sm ${
            warming ? 'border-neon/60 bg-neon/10 text-neon' : 'border-hot/60 bg-hot/10 text-hot'
          }`}
        >
          {warming
            ? '◐ MODEL WARMING UP: the 290 MB network is loading into memory. This takes a few seconds.'
            : `⚠ MODEL OFFLINE: ${status.detail || status.state}`}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <UploadZone
            accept=".jpg,.jpeg,.png,.webp,.bmp"
            title="DROP A CRACK PHOTO"
            hint="JPG · PNG · WEBP · up to 10 MB"
            busy={busy ? { label: 'ANALYSING' } : null}
            error={error}
            onFile={onFile}
          >
            {samples.length > 0 && (
              <div className="mt-4">
                <p className="font-mono text-xs tracking-widest text-dim">// NO PHOTO? TRY A SAMPLE</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {samples.map((name) => (
                    <button
                      key={name}
                      onClick={() => onSample(name)}
                      disabled={busy}
                      title={name}
                      className="group relative h-16 w-16 overflow-hidden border border-neon/30 hover:border-hot disabled:opacity-40"
                    >
                      <img src={sampleUrl(name)} alt={name} className="h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-void/80 font-mono text-[9px] text-neon group-hover:text-hot">
                        {name.replace(/-\d+\.jpg$/, '')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </UploadZone>

          {preview && (
            <HudPanel title="INPUT">
              <img src={preview} alt="uploaded crack" className="max-h-72 w-full object-contain" />
            </HudPanel>
          )}
        </div>

        <HudPanel title="DIAGNOSIS" tag={result ? 'COMPLETE' : busy ? 'SCANNING' : 'STANDBY'} className="min-h-[420px]">
          {!result && !busy && (
            <p className="font-mono text-dim">
              Upload a photo of concrete, or pick a sample. The model classifies the crack, and a classical vision pass
              measures it.
            </p>
          )}
          {busy && (
            <p className="font-mono text-neon">
              running ResNet50 + edge analysis<span className="blink">_</span>
            </p>
          )}

          {result && (
            <div className="space-y-6">
              <div>
                <p className={`font-display text-5xl ${COLORS[result.severity]} text-glow`}>{LABELS[result.severity]}</p>
                <p className="mt-1 font-mono text-sm text-dim">confidence {(result.confidence * 100).toFixed(1)}%</p>
              </div>

              <div className="space-y-2">
                {Object.entries(result.probabilities)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, p], i) => (
                    <div key={name}>
                      <div className="flex justify-between font-mono text-xs">
                        <span className={name === result.severity ? COLORS[name] : 'text-dim'}>{LABELS[name]}</span>
                        <span className="text-dim">{(p * 100).toFixed(1)}%</span>
                      </div>
                      <div className="mt-0.5 h-1 bg-grid">
                        <motion.div
                          className={`h-full ${name === result.severity ? 'bg-hot' : 'bg-neon/40'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${p * 100}%` }}
                          transition={{ delay: i * 0.05, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  ))}
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-sm sm:grid-cols-3">
                <Metric label="INTENSITY" value={result.intensity.toFixed(1)} sub="edge px / 1000" />
                <Metric label="AGE" value={result.age} sub="from edge density" />
                <Metric
                  label="CAUSE"
                  value={result.cause}
                  sub={result.angle ? `mean angle ${result.angle}°` : 'few lines found'}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Figure src={result.edges_image} caption="CRACK EDGES (Canny)" />
                <Figure src={result.lines_image} caption="ORIENTATION (Hough lines)" />
              </div>

              <div className="border-l-2 border-acid bg-acid/5 p-3">
                <p className="font-mono text-xs tracking-widest text-acid">// RECOMMENDATION</p>
                <p className="mt-1">{result.advice}</p>
              </div>
            </div>
          )}
        </HudPanel>
      </div>

      <HudPanel title="HOW IT WORKS" tag="HONEST NOTES">
        <ul className="space-y-2 text-text/85">
          <li>
            <span className="text-neon">Model:</span> ResNet50 pretrained on ImageNet, last 30 layers fine-tuned on
            30,015 concrete photos. Validation accuracy 96.9%. On 100 random test photos it got 92 right; Minor is the
            weakest class because it had ~10x fewer training images.
          </li>
          <li>
            <span className="text-neon">Severity labels</span> were not written by engineers: they come from clustering
            image features into 3 tiers, so the Minor/Moderate boundary is approximate.
          </li>
          <li>
            <span className="text-neon">Intensity, age and cause</span> are classical CV heuristics (Canny edges, edge
            density, Hough line angles), not learned. They are indicative only.
          </li>
          <li>
            <span className="text-hot">Not structural advice.</span> Trained on bare concrete; painted walls, asphalt or
            odd lighting can fool it. For a real crack, ask a civil engineer.
          </li>
        </ul>
      </HudPanel>
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border border-neon/20 p-3">
      <p className="text-xs tracking-widest text-dim">{label}</p>
      <p className="mt-1 text-lg text-neon">{value}</p>
      <p className="text-[11px] text-dim">{sub}</p>
    </div>
  )
}

function Figure({ src, caption }: { src: string; caption: string }) {
  return (
    <figure>
      <img src={src} alt={caption} className="w-full border border-neon/20 object-contain" />
      <figcaption className="mt-1 font-mono text-[11px] text-dim">{caption}</figcaption>
    </figure>
  )
}
