// Vitest test setup file
// Add global test utilities and mocks here

import { afterEach, vi } from 'vitest'

// Clean up mocks after each test
afterEach(() => {
  vi.restoreAllMocks()
})
