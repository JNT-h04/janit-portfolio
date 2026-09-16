import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Any request the browser makes to /api/... is forwarded to FastAPI.
    // The browser thinks it is talking to one server, so there are no CORS
    // problems in development.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
