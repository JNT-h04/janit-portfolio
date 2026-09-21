import { motion } from 'framer-motion'
import HonestNotes from '../../components/HonestNotes'
import HudPanel from '../../components/HudPanel'
import UploadZone from '../../components/UploadZone'
import { CORTEX_NOTES } from '../notes'
import { sampleUrl } from './api'
import { labelOf, useCortex } from './useCortex'

const STAGE_COLOR: Record<string, string> = {
  'Non Demented': 'text-acid',
  'Very mild Dementia': 'text-neon',
  'Mild Dementia': 'text-[#ffb020]',
  'Moderate Dementia': 'text-hot',
}

export default function CortexDemo() {
  // All the behaviour lives in useCortex, shared with the professional skin.
  const {
    status, samples, series, busy, error, result, seriesResult, view, heat, setHeat,
    truth, mode, switchMode, warming, onFile, onFiles, onSample, onSampleSeries,
  } = useCortex()

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
            onClick={() => switchMode(m)}
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
              onFile={(file) => onFiles([file])}
              onFiles={onFiles}
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
            onFile={onFile}
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

      <HonestNotes notes={CORTEX_NOTES} />

    </div>
  )
}
