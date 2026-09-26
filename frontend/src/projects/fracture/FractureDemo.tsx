import { motion } from 'framer-motion'
import HonestNotes from '../../components/HonestNotes'
import TelemetryPanel from '../../components/TelemetryPanel'
import HudPanel from '../../components/HudPanel'
import UploadZone from '../../components/UploadZone'
import { FRACTURE_NOTES } from '../notes'
import { sampleUrl } from './api'
import { useFracture } from './useFracture'

const COLORS: Record<string, string> = {
  No_Crack: 'text-acid',
  Minor: 'text-neon',
  Moderate: 'text-[#ffb020]',
  Severe: 'text-hot',
}
const LABELS: Record<string, string> = { No_Crack: 'NO CRACK', Minor: 'MINOR', Moderate: 'MODERATE', Severe: 'SEVERE' }

export default function FractureDemo() {
  // All the behaviour lives in useFracture, shared with the professional skin.
  const { measured, status, samples, preview, busy, error, result, onFile, onSample, warming } = useFracture()

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

      <TelemetryPanel measured={measured} />
      <HonestNotes notes={FRACTURE_NOTES} />

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
