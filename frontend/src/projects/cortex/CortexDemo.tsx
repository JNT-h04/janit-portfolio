import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import HudPanel from '../../components/HudPanel'
import UploadZone from '../../components/UploadZone'
import {
  analyze,
  analyzeSeries,
  getStatus,
  listSamples,
  listSeries,
  sampleUrl,
  type Analysis,
  type SampleSeries,
  type SeriesAnalysis,
  type Status,
} from './api'

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
  const [mode, setMode] = useState<'slice' | 'series'>('slice')
  const [series, setSeries] = useState<SampleSeries[]>([])
  const [seriesResult, setSeriesResult] = useState<SeriesAnalysis | null>(null)

  useEffect(() => {
    let timer: number
    const poll = async () => {
      const s = await getStatus()
      setStatus(s)
      if (s.state === 'loading' || s.state === 'idle') timer = window.setTimeout(poll, 1500)
    }
    poll()
    listSamples().then(setSamples)
    listSeries().then(setSeries)
    return () => clearTimeout(timer)
  }, [])

  const runSeries = async (files: { blob: Blob; name: string }[], label = '') => {
    setBusy(true)
    setError('')
    setResult(null)
    setSeriesResult(null)
    setTruth(label)
    try {
      setSeriesResult(await analyzeSeries(files))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onSampleSeries = async (item: SampleSeries) => {
    const files = await Promise.all(
      item.slices.map(async (url) => ({ blob: await (await fetch(url)).blob(), name: url.split('/').pop() ?? 'slice.jpg' })),
    )
    runSeries(files, item.label)
  }

  const run = async (blob: Blob, name: string) => {
    setBusy(true)
    setError('')
    setResult(null)
    setSeriesResult(null)
    try {
      setResult(await analyze(blob, name))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Both modes produce the same shape of reading, so the panel below is shared.
  const view = result ?? seriesResult
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

      <div className="flex gap-2 font-mono text-sm">
        {(['slice', 'series'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setResult(null)
              setSeriesResult(null)
              setError('')
              setTruth('')
            }}
            className={`border px-4 py-1.5 ${
              mode === m ? 'border-hot bg-hot/15 text-hot' : 'border-neon/30 text-neon hover:bg-neon/10'
            }`}
          >
            {m === 'slice' ? 'SINGLE SLICE' : 'PATIENT SERIES · more accurate'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          {mode === 'series' ? (
            <UploadZone
              accept=".jpg,.jpeg,.png,.webp,.bmp"
              title="DROP SEVERAL SLICES"
              hint="all slices of ONE patient · 2-12 files · they vote on the answer"
              multiple
              busy={busy ? { label: 'ANALYSING SERIES' } : null}
              error={error}
              onFile={(file) => runSeries([{ blob: file, name: file.name }])}
              onFiles={(files) => runSeries(files.map((f) => ({ blob: f, name: f.name })))}
            >
              {series.length > 0 && (
                <div className="mt-4">
                  <p className="font-mono text-xs tracking-widest text-dim">// OR RUN A WHOLE PATIENT FROM THE TEST SET</p>
                  <div className="mt-2 space-y-2">
                    {series.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSampleSeries(item)}
                        disabled={busy}
                        className="flex w-full items-center gap-3 border border-neon/25 p-2 text-left hover:border-hot disabled:opacity-40"
                      >
                        <span className="flex -space-x-3">
                          {item.slices.slice(0, 4).map((url) => (
                            <img key={url} src={url} alt="" className="h-10 w-10 border border-void object-cover" />
                          ))}
                        </span>
                        <span className="font-mono text-xs">
                          <span className="text-neon">{item.slices.length} slices</span>
                          <span className="text-dim"> · patient {item.id.split('__')[1]} · truly </span>
                          <span className="text-acid">{item.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </UploadZone>
          ) : (
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
          )}
        </div>

        <HudPanel title="READING" tag={result ? 'COMPLETE' : busy ? 'SCANNING' : 'STANDBY'} className="min-h-[460px]">
          {!view && !busy && (
            <p className="font-mono text-dim">
              {mode === 'series'
                ? 'Upload every slice you have of one patient, or run a test-set patient. Each slice is scored, then the scores are averaged — the same trick that takes accuracy from 60% to about 82%.'
                : "Upload an axial MRI slice, or pick a sample. You get a predicted stage, the model's confidence, and a Grad-CAM heatmap showing which pixels drove that decision."}
            </p>
          )}
          {busy && (
            <p className="font-mono text-neon">
              running ResNet + Grad-CAM<span className="blink">_</span>
            </p>
          )}

          {view && (
            <div className="space-y-6">
              <div>
                <p className={`font-display text-4xl ${STAGE_COLOR[view.prediction] ?? 'text-neon'} text-glow`}>
                  {view.prediction.toUpperCase()}
                </p>
                <p className="mt-1 font-mono text-sm text-dim">
                  {seriesResult
                    ? `averaged over ${seriesResult.slices.length} slices · ${(seriesResult.agreement * 100).toFixed(0)}% of them agree`
                    : `confidence ${(view.confidence * 100).toFixed(1)}%`}
                </p>
                {truth && (
                  <p className="mt-2 font-mono text-sm">
                    {truth === view.prediction ? (
                      <span className="text-acid">✓ correct — the true label is “{truth}”</span>
                    ) : (
                      <span className="text-hot">
                        ✗ wrong — the true label is “{truth}”.
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {Object.entries(view.probabilities)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, p], i) => (
                    <div key={name}>
                      <div className="flex justify-between font-mono text-xs">
                        <span className={name === view.prediction ? STAGE_COLOR[name] : 'text-dim'}>{name}</span>
                        <span className="text-dim">{(p * 100).toFixed(1)}%</span>
                      </div>
                      <div className="mt-0.5 h-1 bg-grid">
                        <motion.div
                          className={`h-full ${name === view.prediction ? 'bg-hot' : 'bg-neon/40'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${p * 100}%` }}
                          transition={{ delay: i * 0.05, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  ))}
              </div>

              {seriesResult && (
                <div>
                  <p className="font-mono text-xs tracking-widest text-hot">// WHAT EACH SLICE SAID</p>
                  <ul className="mt-2 space-y-1 font-mono text-xs">
                    {seriesResult.slices.map((sl) => (
                      <li key={sl.name} className="flex justify-between gap-3">
                        <span className="truncate text-dim">{sl.name}</span>
                        <span className={sl.prediction === seriesResult.prediction ? 'text-acid' : 'text-hot'}>
                          {sl.prediction} · {(sl.confidence * 100).toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="flex items-baseline justify-between font-mono text-xs tracking-widest">
                  <span className="text-hot">
                    // GRAD-CAM · {seriesResult ? `CLEAREST SLICE (${seriesResult.best_slice})` : 'WHAT THE MODEL LOOKED AT'}
                  </span>
                  <span className="text-dim">focus: {view.focus}</span>
                </div>
                {/* the heatmap sits on top of the scan; the slider fades it */}
                <div className="relative mt-2 overflow-hidden border border-neon/20">
                  <img src={view.input_image} alt="MRI slice" className="w-full" />
                  <img
                    src={view.overlay_image}
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
                  Red and yellow mark the pixels that pushed the model towards “{view.prediction}”. Dark areas had
                  little influence.
                </p>
              </div>

              {result && result.excluded.length > 0 && (
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
                  <td className="py-1 text-neon">60.2%</td>
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
            <span className="text-neon">This model:</span> two networks vote — a ResNet18 retrained for this site and
            the older ResNet50, both trained on the same patient-level split. Together they score 60.2% accuracy and
            macro F1 0.59 on 693 held-out slices (alone: 58.0% / 0.565 and 58.2% / 0.550). The blend weight was chosen
            on the validation split, never on the test set. The heatmap comes from the ResNet18, because an explanation
            has to belong to one network to mean anything.
          </li>
          <li>
            <span className="text-neon">One slice is a hard question.</span> A radiologist reads a whole scan, not a
            single slice. Letting every slice of a patient vote lifts accuracy from 58.0% to{' '}
            <span className="text-acid">81.5%</span> across 54 held-out patients (macro F1 0.59 → 0.66). Worth knowing:
            40 of those 54 are healthy, so always answering “Non Demented” would already score 74% — the voting model
            beats that on the rarer classes, which is where it counts. Switch to <span className="text-hot">PATIENT
            SERIES</span> above to run it that way.
          </li>
          <li>
            <span className="text-neon">Tried and rejected:</span> a 15-recipe training sweep on a GPU (ResNet18/34,
            EfficientNet-B0, two image sizes, light vs strong augmentation, class- vs patient-balanced sampling, and
            schedule lengths from 1 to 8 epochs) produced a model that is slightly better per slice and slightly worse
            per patient — a tie within the noise of a 54-patient test set. Flip-averaging at prediction time made
            things worse. The recipe search lives in <span className="font-mono text-xs">scripts/train_cortex.py</span>;
            the limit here is the number of patients, not the training.
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
