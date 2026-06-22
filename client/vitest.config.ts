import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

const reactPath = path.resolve(__dirname, '../node_modules/.pnpm/react@18.3.1/node_modules/react')

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'shared': path.resolve(__dirname, '../shared/dist/index.js'),
      'react': reactPath,
      'react-dom': path.resolve(__dirname, '../node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom'),
    },
  },
})
