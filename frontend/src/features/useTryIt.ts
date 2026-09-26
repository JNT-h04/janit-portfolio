import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { findProject, demoState } from '../data/projects'
import { queueSample, requestSample } from '../projects/samples'
import { useTerminal } from '../terminal/context'

/** The demo a first-time visitor is sent to: FRACTURE answers in seconds. */
export const QUICK_DEMO = 'crack-severity'

/** Asks NOVA (casual side only) to start its guided tour. */
export const startNovaTour = () => dispatchEvent(new CustomEvent('nova:tour'))

/**
 * The things that make this more than a page to read, as actions any button
 * can call. Both skins use them, so "try it" does the same thing everywhere.
 */
export function useTryIt() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const terminal = useTerminal()
  const quick = findProject(QUICK_DEMO)
  const canRunQuick = !!quick && demoState(quick) === 'live'

  /** Open the quick demo and run one of its samples, no upload needed. */
  const runDemo = useCallback(() => {
    const request = { slug: QUICK_DEMO, which: 'any' }
    if (!canRunQuick) return navigate(`/projects/${QUICK_DEMO}`)
    if (pathname === `/projects/${QUICK_DEMO}`) {
      requestSample(request)
      document.querySelector('main input[type=file]')?.closest('section, div')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    queueSample(request)
    navigate(`/projects/${QUICK_DEMO}`)
  }, [canRunQuick, navigate, pathname])

  const openTerminal = useCallback(() => terminal.setOpen(true), [terminal])

  return { runDemo, canRunQuick, openTerminal, quick }
}
