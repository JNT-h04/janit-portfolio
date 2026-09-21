import { useMemo, useState } from 'react'
import Gate from './pages/Gate'
import SkinProvider from './skin/SkinProvider'
import { useSkin } from './skin/context'
import CyberLayout from './skins/cyber/CyberLayout'
import ProLayout from './skins/pro/ProLayout'
import { TerminalContext } from './terminal/context'

/**
 * The site has two faces (see skin/context.ts). This picks one — or shows the
 * gate if the visitor has not chosen yet. Everything below the skin, including
 * the backend, the API layer and each demo's logic, is shared by both.
 */
export default function App() {
  const [terminalOpen, setTerminalOpen] = useState(false)
  const terminal = useMemo(() => ({ open: terminalOpen, setOpen: setTerminalOpen }), [terminalOpen])

  return (
    <SkinProvider>
      {/* Terminal state lives above the skins, so switching sides mid-session
          doesn't close a terminal the visitor had open. */}
      <TerminalContext.Provider value={terminal}>
        <Shell />
      </TerminalContext.Provider>
    </SkinProvider>
  )
}

function Shell() {
  const { skin, chosen } = useSkin()
  if (!chosen) return <Gate />
  return skin === 'pro' ? <ProLayout /> : <CyberLayout />
}
