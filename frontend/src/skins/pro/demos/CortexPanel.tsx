import { motion } from 'framer-motion'
import { sampleUrl } from '../../../projects/cortex/api'
import { useCortex } from '../../../projects/cortex/useCortex'
import { CORTEX_NOTES } from '../../../projects/notes'
import DropZone from '../components/DropZone'
import HonestNotes from '../components/HonestNotes'

const STAGE_TONE: Record<string, string> = {
  'Non Demented': 'text-emerald-700',
  'Very mild Dementia': 'text-violet',
  'Mild Dementia': 'text-amber-700',
  'Moderate Dementia': 'text-red-700',
}

export default function CortexPanel() {
  const {
    status, samples, series, busy, error, result, seriesResult, view, heat, setHeat,
    truth, mode, switchMode, warming, onFile, onFiles, onSample, onSampleSeries,
  } = useCortex()

  return (
    <div className="space-y-5">
      <p className="rounded-md border-l-2 border-red-600 bg-red-50 p-4 font-sans text-sm text-red-800">
        <strong className="font-semibold">Research demo — not a medical device.</strong> This cannot diagnose
        anyone. Please read the limitations below before reading anything into a result.
      </p>

      {status && status.state !== 'ready' && (
        <p className={`paper-card p-4 font-sans text-sm ${warming ? 'text-ink/80' : 'text-red-700'}`}>
          {warming
            ? 'Model warming up: loading the network into memory, a few seconds.'
            : `Model offline: ${status.detail || status.state}`}
        </p>
      )}

      <div className="inline-flex rounded-md border border-rule p-0.5">
        {(['slice', 'series'] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`rounded px-3.5 py-1.5 font-sans text-sm transition-colors ${
              mode === m ? 'bg-ink text-paper' : 'text-quiet hover:text-ink'
            }`}
          >
            {m === 'slice' ? 'Single slice' : 'Patient series · more accurate'}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          {mode === 'series' ? (
            <DropZone
              accept=".jpg,.jpeg,.png,.webp,.bmp"
              title="Drop several slices"
              hint="All slices of ONE patient · 2–12 files · they vote on the answer"
              multiple
              busy={busy ? { label: 'Analysing series' } : null}
              error={error}
              onFile={(file) => onFiles([file])}
              onFiles={onFiles}
            >
              {series.length > 0 && (
                <div className="mt-4">
                  <p className="font-sans text-xs text-quiet">Or run a whole patient from the test set:</p>
                  <div className="mt-2 space-y-2">
                    {series.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSampleSeries(item)}
                        disabled={busy}
                        className="flex w-full items-center gap-3 rounded-md border border-rule p-2 text-left transition-colors hover:border-coral/50 disabled:opacity-40"
                      >
                        <span className="flex -space-x-3">
                          {item.slices.slice(0, 4).map((url) => (
                            <img
                              key={url}
                              src={url}
                              alt=""
                              className="h-10 w-10 rounded-sm border border-card object-cover"
                            />
                          ))}
                        </span>
                        <span className="font-sans text-xs text-quiet">
                          <span className="font-medium text-ink">{item.slices.length} slices</span> · patient{' '}
                          {item.id.split('__')[1]} · truly <span className="text-coral">{item.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </DropZone>
          ) : (
            <DropZone
              accept=".jpg,.jpeg,.png,.webp,.bmp"
              title="Drop an MRI slice"
              hint="JPG · PNG · axial brain slice · up to 10 MB"
              busy={busy ? { label: 'Analysing scan' } : null}
              error={error}
              onFile={onFile}
            >
              {samples.length > 0 && (
                <div className="mt-4">
                  <p className="font-sans text-xs text-quiet">No scan? Try one from the test set:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {samples.map((name) => (
                      <button
                        key={name}
                        onClick={() => onSample(name)}
                        disabled={busy}
                        title={name}
                        className="h-16 w-16 overflow-hidden rounded border border-rule transition-colors hover:border-coral disabled:opacity-40"
                      >
                        <img src={sampleUrl(name)} alt={name} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </DropZone>
          )}
        </div>

        <div className="paper-card min-h-[420px] p-6">
          <p className="font-sans text-xs tracking-widest text-quiet uppercase">Reading</p>

          {!view && !busy && (
            <p className="mt-4 font-sans text-[15px] leading-relaxed text-quiet">
              Upload an MRI slice, or pick one from the test set. The model gives a stage and a Grad-CAM heatmap
              showing which pixels it used.
            </p>
          )}
          {busy && <p className="mt-4 font-sans text-[15px] text-ink">Running the network…</p>}

          {view && (
            <div className="mt-4 space-y-6">
              <div>
                <p className={`font-serif text-3xl ${STAGE_TONE[view.prediction] ?? 'text-ink'}`}>
                  {view.prediction}
                </p>
                <p className="mt-1 font-sans text-sm text-quiet">
                  {seriesResult
                    ? `Averaged over ${seriesResult.slices.length} slices · ${(seriesResult.agreement * 100).toFixed(0)}% of them agree`
                    : `${(view.confidence * 100).toFixed(1)}% confidence`}
                </p>
                {truth && (
                  <p className="mt-2 font-sans text-sm">
                    {truth === view.prediction ? (
                      <span className="font-medium text-jade">Correct — the true label is "{truth}".</span>
                    ) : (
                      <span className="text-red-700">Wrong — the true label is "{truth}".</span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2.5">
                {Object.entries(view.probabilities)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, p], i) => (
                    <div key={name}>
                      <div className="flex justify-between font-sans text-xs">
                        <span className={name === view.prediction ? 'font-medium text-ink' : 'text-quiet'}>
                          {name}
                        </span>
                        <span className="text-quiet">{(p * 100).toFixed(1)}%</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-rule">
                        <motion.div
                          className={`h-full rounded-full ${name === view.prediction ? 'bg-coral' : 'bg-quiet/40'}`}
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
                  <p className="font-sans text-xs tracking-widest text-quiet uppercase">What each slice said</p>
                  <ul className="mt-2.5 space-y-1.5">
                    {seriesResult.slices.map((sl) => (
                      <li key={sl.name} className="flex justify-between gap-3 font-sans text-xs">
                        <span className="truncate text-quiet">{sl.name}</span>
                        <span className={sl.prediction === seriesResult.prediction ? 'text-coral' : 'text-red-700'}>
                          {sl.prediction} · {(sl.confidence * 100).toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="flex items-baseline justify-between font-sans text-xs">
                  <span className="tracking-widest text-quiet uppercase">
                    Grad-CAM ·{' '}
                    {seriesResult ? `clearest slice (${seriesResult.best_slice})` : 'what the model looked at'}
                  </span>
                  <span className="text-quiet">focus: {view.focus}</span>
                </div>
                {/* the heatmap sits on top of the scan; the slider fades it */}
                <div className="relative mt-2 overflow-hidden rounded border border-rule">
                  <img src={view.input_image} alt="MRI slice" className="w-full" />
                  <img
                    src={view.overlay_image}
                    alt="Grad-CAM heatmap over the scan"
                    className="absolute inset-0 h-full w-full"
                    style={{ opacity: heat }}
                  />
                </div>
                <label className="mt-3 flex items-center gap-3 font-sans text-xs text-quiet">
                  Scan
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={heat}
                    onChange={(e) => setHeat(Number(e.target.value))}
                    className="h-1 flex-1 accent-coral"
                  />
                  Heatmap
                </label>
                <p className="mt-2.5 font-sans text-sm leading-relaxed text-ink/80">
                  Red and yellow mark the pixels that pushed the model towards "{view.prediction}". Dark areas had
                  little influence.
                </p>
              </div>

              {result && result.excluded.length > 0 && (
                <p className="border-l-2 border-rule pl-3 font-sans text-xs text-quiet">
                  {result.excluded.join(', ')} is excluded from predictions — see why below.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <HonestNotes notes={CORTEX_NOTES} />
    </div>
  )
}
