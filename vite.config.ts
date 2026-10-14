import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
    // Three.js is required by the above-the-fold twin; the compressed initial JS budget is the enforced metric.
    chunkSizeWarningLimit: 800,
  },
})
