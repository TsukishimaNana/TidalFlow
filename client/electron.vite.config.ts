import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        shared: '../shared/src/index.ts',
        '@': '/src',
        '@shared': '../shared/src'
      }
    },
    plugins: [react()]
  }
})
