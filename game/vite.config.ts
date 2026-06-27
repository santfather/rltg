/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 55,
        branches: 45,
        functions: 65,
        lines: 55,
      },
      include: ['src/engine/**'],
      exclude: ['src/**/*.test.ts', 'src/data/**'],
    },
  },
})
