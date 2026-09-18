import { motion } from 'framer-motion'
import { useRef, useState, type DragEvent, type ReactNode } from 'react'

type Busy = { label: string; detail?: string; progress?: number } | null

type Props = {
  accept: string
  title: string
  hint: string
  busy?: Busy
  error?: string
  /** allow picking several files at once (e.g. all slices of one patient) */
  multiple?: boolean
  onFile: (file: File) => void
  onFiles?: (files: File[]) => void
  children?: ReactNode // extra controls, e.g. sample buttons
}

/** Drag-and-drop (or click-to-pick) file box, shared by the project demos. */
export default function UploadZone({ accept, title, hint, busy, error, multiple, onFile, onFiles, children }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [hover, setHover] = useState(false)

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setHover(false)
    if (busy) return
    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return
    if (multiple && onFiles) onFiles(files)
    else onFile(files[0])
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setHover(true)
        }}
        onDragLeave={() => setHover(false)}
        onDrop={onDrop}
        onClick={() => !busy && input.current?.click()}
        data-hover
        className={`hud-panel relative flex min-h-64 flex-col items-center justify-center overflow-hidden p-10 text-center transition-colors ${
          hover ? 'bg-neon/10!' : ''
        }`}
      >
        <input
          ref={input}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length) {
              if (multiple && onFiles) onFiles(files)
              else onFile(files[0])
            }
            e.target.value = '' // lets you pick the same file twice in a row
          }}
        />

        {busy ? (
          <>
            {/* a scan line sweeping down the panel */}
            <motion.div
              className="absolute inset-x-0 h-0.5 bg-neon shadow-[0_0_16px_#00f0ff]"
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            />
            <p className="font-display text-2xl text-neon text-glow">
              {busy.label}
              <span className="blink">_</span>
            </p>
            {busy.progress !== undefined && (
              <div className="mt-4 h-1.5 w-64 bg-grid">
                <div
                  className={`h-full bg-gradient-to-r from-neon to-hot transition-[width] ${busy.progress >= 1 ? 'animate-pulse' : ''}`}
                  style={{ width: `${Math.round(busy.progress * 100)}%` }}
                />
              </div>
            )}
            {busy.detail && <p className="mt-2 font-mono text-sm text-dim">{busy.detail}</p>}
          </>
        ) : (
          <>
            <p className="font-display text-2xl text-neon sm:text-3xl">{title}</p>
            <p className="mt-2 text-lg">or click to choose a file</p>
            <p className="mt-4 font-mono text-sm text-dim">{hint}</p>
            {error && <p className="mt-4 font-mono text-sm text-hot">✖ {error}</p>}
          </>
        )}
      </div>
      {children}
    </div>
  )
}
