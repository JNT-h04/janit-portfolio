import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import HudPanel from '../../components/HudPanel'
import UploadZone from '../../components/UploadZone'
import { analyze, getStatus, listSamples, sampleUrl, type Analysis, type Status } from './api'

// Sample files are named after their true label, e.g. very-mild-1.jpg.
const TRUE_LABEL: Record<string, string> = {
  mild: 'Mild Dementia',
  'non-demented': 'Non Demented',
  'very-mild': 'Very mild Dementia',
}
const labelOf = (file: string) => TRUE_LABEL[file.replace(/-\d+\.jpg$/, '')] ?? ''

const STAGE_COLOR: Record<string, string> = {
  'Non Demented': 'text-acid',
  'Very mild Dementia': 'text-neon',
  'Mild Dementia': 'text-[#ffb020]',
  'Moderate Dementia': 'text-hot',
}

export default function CortexDemo() {
  const [status, setStatus] = useState<Status | null>(null)
  const [samples, setSamples] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Analysis | null>(null)
  const [heat, setHeat] = useState(0.75) // how strongly the heatmap shows over the scan
  const [truth, setTruth] = useState('') // known label, when a sample was used

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

  const run = async (blob: Blob, name: string) => {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      setResult(await analyze(blob, name))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onSample = async (name: string) => {
    setTruth(labelOf(name))
    run(await (await fetch(sampleUrl(name))).blob(), name)
  }
  const warming = status?.state === 'loading' || status?.state === 'idle'

  return (
    <div className="mt-10 space-y-6">
      <div className="border border-hot/50 bg-hot/5 px-4 py-3 font-mono text-sm text-hot">
        ⚠ RESEARCH DEMO — NOT A MEDICAL DEVICE. This cannot diagnose anyone. See the limitations below before reading
        anything into a result.
      </div>

      {status && status.state !== 'ready' && (
        <div
          className={`border px-4 py-3 font-mono text-sm ${
            warming ? 'border-neon/60 bg-neon/10 text-neon' : 'border-hot/60 bg-hot/10 text-hot'
          }`}
        >
          {warming
            ? '◐ MODEL WARMING UP: loading the network into memory, a few seconds.'
            : `⚠ MODEL OFFLINE: ${status.detail || status.state}`}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <UploadZone
            accept=".jpg,.jpeg,.png,.webp,.bmp"
            title="DROP AN MRI SLICE"
            hint="JPG · PNG · axial brain slice · up to 10 MB"
            busy={busy ? { label: 'ANALYSING SCAN' } : null}
            error={error}
            onFile={(file) => {
              setTruth('')
              run(file, file.name)
            }}
          >
            {samples.length > 0 && (
              <div className="mt-4">
                <p className="font-mono text-xs tracking-widest text-dim">// NO SCAN? TRY ONE FROM THE TEST SET</p>
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
                      <span className="absolute inset-x-0 bottom-0 bg-void/80 text-center font-mono text-[9px] text-neon group-hover:text-hot">
                        {labelOf(name).replace(' Dementia', '')}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 font-mono text-[11px] text-dim">
                  Samples come from patients the model never trained on, picked at random rather than hand-picked.
                </p>
              </div>
            )}
          </UploadZone>
        </div>

        <HudPanel title="READING" tag={result ? 'COMPLETE' : busy ? 'SCANNING' : 'STANDBY'} className="min-h-[460px]">
          {!result && !busy && (
            <p className="font-mono text-dim">
              Upload an axial MRI slice, or pick a sample. You get a predicted stage, the model's confidence, and a
              Grad-CAM heatmap showing which pixels drove that decision.
            </p>
          )}
          {busy && (
            <p className="font-mono text-neon">
              running ResNet + Grad-CAM<span className="blink">_</span>
            </p>
          )}

          {result && (
            <div className="space-y-6">
              <div>
                <p className={`font-display text-4xl ${STAGE_COLOR[result.prediction] ?? 'text-neon'} text-glow`}>
                  {result.prediction.toUpperCase()}
                </p>
                <p className="mt-1 font-mono text-sm text-dim">confidence {(result.confidence * 100).toFixed(1)}%</p>
                {truth && (
                  <p className="mt-2 font-mono text-sm">
                    {truth === result.prediction ? (
                      <span className="text-acid">✓ correct — this slice is labelled “{truth}”</span>
                    ) : (
                      <span className="text-hot">
                        ✗ wrong — this slice is labelled “{truth}”. The model is right about 58% of the time.
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {Object.entries(result.probabilities)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, p], i) => (
                    <div key={name}>
                      <div className="flex justify-between font-mono text-xs">
                        <span className={name === result.prediction ? STAGE_COLOR[name] : 'text-dim'}>{name}</span>
                        <span className="text-dim">{(p * 100).toFixed(1)}%</span>
                      </div>
                      <div className="mt-0.5 h-1 bg-grid">
                        <motion.div
                          className={`h-full ${name === result.prediction ? 'bg-hot' : 'bg-neon/40'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${p * 100}%` }}
                          transition={{ delay: i * 0.05, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  ))}
              </div>

              <div>
                <div className="flex items-baseline justify-between font-mono text-xs tracking-widest">
                  <span className="text-hot">// GRAD-CAM · WHAT THE MODEL LOOKED AT</span>
                  <span className="text-dim">focus: {result.focus}</span>
                </div>
                {/* the heatmap sits on top of the scan; the slider fades it */}
                <div className="relative mt-2 overflow-hidden border border-neon/20">
                  <img src={result.input_image} alt="MRI slice" className="w-full" />
                  <img
                    src={result.overlay_image}
                    alt="Grad-CAM heatmap over the scan"
                    className="absolute inset-0 h-full w-full"
                    style={{ opacity: heat }}
                  />
                </div>
                <label className="mt-3 flex items-center gap-3 font-mono text-xs text-dim">
                  SCAN
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={heat}
                    onChange={(e) => setHeat(Number(e.target.value))}
                    className="h-1 flex-1 accent-[#ff2a6d]"
                  />
                  HEATMAP
                </label>
                <p className="mt-2 text-sm text-text/80">
                  Red and yellow mark the pixels that pushed the model towards “{result.prediction}”. Dark areas had
                  little influence.
                </p>
              </div>

              {result.excluded.length > 0 && (
                <p className="border-l-2 border-hot/60 pl-3 font-mono text-xs text-dim">
                  {result.excluded.join(', ')} is excluded from predictions — see why below.
                </p>
              )}
            </div>
          )}
        </HudPanel>
      </div>

      <HudPanel title="HOW IT WORKS" tag="HONEST NOTES">
        <p className="text-text/85">
          <span className="text-neon">Grad-CAM</span> takes the last convolutional block of the network, checks how much
          each of its feature maps would change the winning score, and adds the maps up with those weights. The result
          is a coarse map of the pixels that mattered, which is why the heat looks blocky rather than pixel-sharp.
        </p>

        <div className="mt-5">
          <p className="font-mono text-xs tracking-widest text-hot">// THE LEAKAGE STORY</p>
          <p className="mt-2 text-text/85">
            The first version of this project scored about <span className="text-acid">99%</span> — because the dataset
            was split by image. An MRI volume gives many slices per patient, so nearly every patient appeared in both the
            training and the test set, and the network could recognise the person instead of the disease. Splitting by{' '}
            <span className="text-neon">patient</span> instead, so no one appears twice, tells the real story:
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-100 border-collapse font-mono text-sm">
              <thead>
                <tr className="border-b border-neon/20 text-left text-dim">
                  <th className="py-1 pr-4 font-normal">SPLIT</th>
                  <th className="py-1 pr-4 font-normal">CLASSES</th>
                  <th className="py-1 font-normal">TEST ACCURACY</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neon/10">
                  <td className="py-1 pr-4">by image (leaky)</td>
                  <td className="py-1 pr-4">4</td>
                  <td className="py-1 text-acid">~99%</td>
                </tr>
                <tr className="border-b border-neon/10">
                  <td className="py-1 pr-4">by patient</td>
                  <td className="py-1 pr-4">4</td>
                  <td className="py-1 text-hot">28.7%</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4">by patient</td>
                  <td className="py-1 pr-4">3 (this demo)</td>
                  <td className="py-1 text-neon">58.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ul className="mt-5 space-y-2 text-text/85">
          <li>
            <span className="text-neon">Why 3 classes:</span> the dataset has only 2 patients with “Moderate Dementia”.
            Split by patient, that class ends up with zero training images, so the demo refuses to predict it rather
            than pretending.
          </li>
          <li>
            <span className="text-neon">This model:</span> ResNet18 fine-tuned on the patient-level split, 176px inputs.
            Test accuracy 58.0%, macro F1 0.57 across 693 held-out slices (Non Demented 0.76 F1, Very mild 0.52, Mild
            0.42). Retraining the bigger ResNet50 the same way scored 59.1% but barely recognised “Very mild”, so the
            smaller, more balanced model is the one running here.
          </li>
          <li>
            <span className="text-neon">Dataset:</span> a balanced OASIS-derived MRI set, 1,500 images per class, 345
            patients in total.
          </li>
          <li>
            <span className="text-hot">Not a diagnosis.</span> Real dementia assessment uses clinical history, cognitive
            testing and a radiologist. This is a student research demo.
          </li>
        </ul>
      </HudPanel>
    </div>
  )
}
