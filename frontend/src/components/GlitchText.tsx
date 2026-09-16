import type { ElementType } from 'react'

type Props = { text: string; as?: ElementType; className?: string }

/** Text that periodically splits into red/cyan copies. The CSS lives in index.css (.glitch). */
export default function GlitchText({ text, as: Tag = 'span', className = '' }: Props) {
  return (
    <Tag className={`glitch ${className}`} data-text={text}>
      {text}
    </Tag>
  )
}
