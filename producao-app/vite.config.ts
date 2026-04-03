import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Ignora erros de TypeScript durante o build
    sourcemap: false,
    minify: true,
  },
  esbuild: {
    // Ignora erros de TypeScript
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})
