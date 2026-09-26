import { motion } from 'framer-motion'
import { sampleUrl } from '../../../projects/fracture/api'
import { useFracture } from '../../../projects/fracture/useFracture'
import { FRACTURE_NOTES } from '../../../projects/notes'
import DropZone from '../components/DropZone'
import HonestNotes from '../components/HonestNotes'
import MeasuredPanel from '../components/MeasuredPanel'

const LABELS: Record<string, string> = {
  No_Crack: 'No crack',
  Minor: 'Minor',
  Moderate: 'Moderate',
  Severe: 'Severe',
}
const TONE: Record<string, string> = {
  No_Crack: 'text-jade',
  Minor: 'text-violet',
  Moderate: 'text-amber-700',
  Severe: 'text-red-700',
}

export default function FracturePanel() {
  const { measured, status, samples, preview, busy, error, result, onFile, onSample, warming } = useFracture()

  return (
    <div className="space-y-5">
      {status && status.state !== 'ready' && (
        <p className={`paper-card p-4 font-sans text-sm ${warming ? 'text-ink/80' : 'text-red-700'}`}>
          {warming
            ? 'Model warming up: the 290 MB network is loading into memory. This takes a few seconds.'
            : `Model offline: ${status.detail || status.state}`}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <DropZone
            accept=".jpg,.jpeg,.png,.webp,.bmp"
            title="Drop a photo of a crack"
            hint="JPG · PNG · WEBP · up to 10 MB"
            busy={busy ? { label: 'Analysing' } : null}
            error={error}
            onFile={onFile}
          >
            {samples.length > 0 && (
              <div className="mt-4">
                <p className="font-sans text-xs text-quiet">No photo? Try a sample:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {samples.map((name) => (
                    <button
                      key={name}
                      onClick={() => onSample(name)}
                      disabled={busy}
                      title={name}
                      className="group relative h-16 w-16 overflow-hidden rounded border border-rule transition-colors hover:border-coral disabled:opacity-40"
                    >
                      <img src={sampleUrl(name)} alt={name} className="h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-white/85 font-sans text-[9px] text-ink">
                        {name.replace(/-\d+\.jpg$/, '')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </DropZone>

          {preview && (
            <figure className="paper-card overflow-hidden p-3">
              <img src={preview} alt="uploaded crack" className="max-h-72 w-full rounded object-contain" />
              <figcaption className="mt-2 font-sans text-xs text-quiet">Input photo</figcaption>
            </figure>
          )}
        </div>

        <div className="paper-card min-h-[420px] p-6">
          <p className="font-sans text-xs tracking-widest text-quiet uppercase">Diagnosis</p>

          {!result && !busy && (
            <p className="mt-4 font-sans text-[15px] leading-relaxed text-quiet">
              Upload a photo of concrete, or pick a sample. The model classifies the crack, and a classical
              computer-vision pass measures it.
            </p>
          )}
          {busy && <p className="mt-4 font-sans text-[15px] text-ink">Running ResNet50 and edge analysis…</p>}

          {result && (
            <div className="mt-4 space-y-6">
              <div>
                <p className={`font-serif text-4xl ${TONE[result.severity]}`}>{LABELS[result.severity]}</p>
                <p className="mt-1 font-sans text-sm text-quiet">
                  {(result.confidence * 100).toFixed(1)}% confidence
                </p>
              </div>

              <div className="space-y-2.5">
                {Object.entries(result.probabilities)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, p], i) => (
                    <div key={name}>
                      <div className="flex justify-between font-sans text-xs">
                        <span className={name === result.severity ? 'font-medium text-ink' : 'text-quiet'}>
                          {LABELS[name]}
                        </span>
                        <span className="text-quiet">{(p * 100).toFixed(1)}%</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-rule">
                        <motion.div
                          className={`h-full rounded-full ${name === result.severity ? 'bg-coral' : 'bg-quiet/40'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${p * 100}%` }}
                          transition={{ delay: i * 0.05, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  ))}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Metric label="Intensity" value={result.intensity.toFixed(1)} sub="edge px / 1000" />
                <Metric label="Age" value={result.age} sub="from edge density" />
                <Metric
                  label="Likely cause"
                  value={result.cause}
                  sub={result.angle ? `mean angle ${result.angle}°` : 'few lines found'}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Figure src={result.edges_image} caption="Crack edges (Canny)" />
                <Figure src={result.lines_image} caption="Orientation (Hough lines)" />
              </div>

              <div className="rounded-md border-l-2 border-coral bg-coral-soft p-4">
                <p className="font-sans text-xs tracking-widest text-coral uppercase">Recommendation</p>
                <p className="mt-1.5 font-sans text-[15px] leading-relaxed text-ink/85">{result.advice}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <MeasuredPanel measured={measured} />
      <HonestNotes notes={FRACTURE_NOTES} />
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-rule p-3">
      <p className="font-sans text-xs text-quiet">{label}</p>
      <p className="mt-1 font-serif text-lg text-ink">{value}</p>
      <p className="font-sans text-[11px] text-quiet">{sub}</p>
    </div>
  )
}

function Figure({ src, caption }: { src: string; caption: string }) {
  return (
    <figure>
      <img src={src} alt={caption} className="w-full rounded border border-rule object-contain" />
      <figcaption className="mt-1.5 font-sans text-[11px] text-quiet">{caption}</figcaption>
    </figure>
  )
}
