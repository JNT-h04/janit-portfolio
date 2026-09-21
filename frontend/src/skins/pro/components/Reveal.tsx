import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * The professional skin's one animation idiom: content eases up into place the
 * first time it is scrolled into view. Used everywhere instead of the
 * cyberpunk side's glitch, so the page feels calm but not static.
 */
export default function Reveal({
  children,
  delay = 0,
  className = '',
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li'
}) {
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  )
}
