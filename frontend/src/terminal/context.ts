import { createContext, useContext } from 'react'

// Lets any component (nav bar, hero button, the terminal itself) open or
// close the terminal without passing props through every layer.
export const TerminalContext = createContext<{ open: boolean; setOpen: (open: boolean) => void }>({
  open: false,
  setOpen: () => {},
})

export const useTerminal = () => useContext(TerminalContext)
