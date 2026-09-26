import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { api, API_BASE } from './config'

// The hosted API sleeps when idle and takes about a minute to wake. Knock on
// its door the moment anyone arrives, so it is usually up by the time they
// reach a demo instead of starting its minute when they click one.
if (API_BASE) fetch(api('/api/health')).catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Matches Vite's base, so routes work under /<repo>/ on Pages and at / locally. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
