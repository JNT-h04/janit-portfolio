import { motion } from 'framer-motion'
import { useRef, useState, type DragEvent, type ReactNode } from 'react'

type Busy = { label: string; detail?: string; progress?: number } | null

type Props = {
  accept: string
  title: string
  hint: string
  busy?: Busy
  error?: string
  multiple?: boolean
  onFile: (file: File) => void
  onFiles?: (files: File[]) => void
  children?: ReactNode
}

/**
 * The professional counterpart of components/UploadZone: same props, same
 * behaviour, quiet clothes. Deliberately mirrors that API so a demo can be
 * given either one without changing anything else.
 */
export default function DropZone({
  accept,
  title,
  hint,
  busy,
  error,
  multiple,
  onFile,
  onFiles,
  children,
}: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [hover, setHover] = useState(false)

  const hand = (files: File[]) => {
    if (!files.length) return
    if (multiple && onFiles) onFiles(files)
    else onFile(files[0])
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setHover(false)
    if (busy) return
    hand(Array.from(e.dataTransfer.files))
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
        className={`relative flex min-h-56 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed p-10 text-center transition-colors ${
          hover ? 'border-coral bg-coral-soft' : 'border-rule bg-card hover:border-coral/50'
        } ${busy ? 'cursor-default' : ''}`}
      >
        <input
          ref={input}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            hand(Array.from(e.target.files ?? []))
            e.target.value = '' // lets you pick the same file twice in a row
          }}
        />

        {busy ? (
          <>
            <p className="font-sans text-lg font-medium text-ink">{busy.label}</p>
            {busy.progress !== undefined && (
              <div className="mt-4 h-1 w-64 overflow-hidden rounded-full bg-rule">
                <motion.div
                  className="h-full rounded-full bg-coral"
                  animate={{ width: `${Math.round(busy.progress * 100)}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            )}
            {busy.detail && <p className="mt-3 font-sans text-sm text-quiet">{busy.detail}</p>}
          </>
        ) : (
          <>
            <p className="font-serif text-xl text-ink">{title}</p>
            <p className="mt-1.5 font-sans text-sm text-quiet">or click to choose a file</p>
            <p className="mt-4 font-sans text-xs text-quiet">{hint}</p>
            {error && <p className="mt-4 font-sans text-sm text-red-600">{error}</p>}
          </>
        )}
      </div>
      {children}
    </div>
  )
}
