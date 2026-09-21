import { useEffect } from 'react'
import { useTerminal } from './context'

/**
 * ` toggles the terminal (unless you're typing in a text box); Esc closes it.
 * Both skins mount their own terminal window but share these shortcuts, so the
 * behaviour can't drift between the two.
 */
export function useTerminalHotkeys() {
  const { open, setOpen } = useTerminal()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as Element).closest('input, textarea, [contenteditable]')
      if (e.key === '`' && !typing) {
        e.preventDefault()
        setOpen(!open)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, setOpen])
}
