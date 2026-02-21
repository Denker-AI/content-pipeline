import fs from 'fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// Copy preload.cjs to dist/main/ (it's CJS, can't go through Vite ESM build)
function copyPreload() {
  return {
    name: 'copy-preload',
    writeBundle() {
      fs.mkdirSync('dist/main', { recursive: true })
      fs.copyFileSync('src/main/preload.cjs', 'dist/main/preload.cjs')
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron', 'node-pty']
            }
          },
          plugins: [copyPreload()]
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/main': path.resolve(__dirname, './src/main'),
      '@/renderer': path.resolve(__dirname, './src/renderer'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/components': path.resolve(__dirname, './src/renderer/components'),
      '@/hooks': path.resolve(__dirname, './src/renderer/hooks')
    }
  },
  root: '.',
  build: {
    outDir: 'dist/renderer'
  }
})
