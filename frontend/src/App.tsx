import { useMemo, useState } from 'react'
import { BLOCKS, WARP } from './effects/transitions'
import Gate from './pages/Gate'
import SkinProvider from './skin/SkinProvider'
import { useSkin } from './skin/context'
import CyberLayout from './skins/cyber/CyberLayout'
import BlockWaterfall from './skins/cyber/effects/BlockWaterfall'
import ProLayout from './skins/pro/ProLayout'
import Lightspeed from './skins/pro/effects/Lightspeed'
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
  const { skin, chosen, entering } = useSkin()
  return (
    <>
      {!chosen ? <Gate /> : skin === 'pro' ? <ProLayout /> : <CyberLayout />}

      {/* Crossing between the two sides — from the gate, the header link or the
          footer — plays the transition of the side being arrived at. Above
          everything, including the boot screen, since it has to hide the
          moment the whole site changes clothes. */}
      {entering && (
        <div className="fixed inset-0 z-[80]">
          {entering.effect === 'pro' ? (
            <Lightspeed
              key={entering.runId}
              coverMs={WARP.cover}
              totalMs={WARP.total}
              over={entering.over}
            />
          ) : (
            <BlockWaterfall key={entering.runId} coverMs={BLOCKS.cover} totalMs={BLOCKS.total} />
          )}
        </div>
      )}
    </>
  )
}
