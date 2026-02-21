import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['__tests__/setup.ts'],
    testTimeout: 10000,
    include: ['__tests__/**/*.test.{ts,tsx,js}'],
    exclude: ['node_modules/', 'dist/', 'out/', 'coverage/'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '__tests__/',
        '**/*.config.*',
        '**/*.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/main': path.resolve(__dirname, './src/main'),
      '@/renderer': path.resolve(__dirname, './src/renderer'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/components': path.resolve(__dirname, './src/renderer/components'),
      '@/hooks': path.resolve(__dirname, './src/renderer/hooks')
    }
  }
})
