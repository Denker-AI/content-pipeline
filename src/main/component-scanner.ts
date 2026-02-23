import fs from 'fs/promises'
import path from 'path'

import type { DetectedComponent } from '@/shared/types'

const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'out', 'build',
  '.worktrees', 'coverage', '.turbo', '.cache',
])

function toComponentName(filename: string): string {
  return filename
    .replace(/\.(tsx|jsx)$/, '')
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
}

async function walk(dir: string, results: DetectedComponent[], projectRoot: string) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        await walk(path.join(dir, entry.name), results, projectRoot)
      }
    } else if (entry.isFile() && /\.(tsx|jsx)$/.test(entry.name)) {
      const name = toComponentName(entry.name)
      // Only include files whose name starts with uppercase (likely a component)
      if (/^[A-Z]/.test(name)) {
        const fullPath = path.join(dir, entry.name)
        results.push({
          name,
          path: path.relative(projectRoot, fullPath),
          description: '',
        })
      }
    }
  }
}

export async function scanComponents(projectRoot: string): Promise<DetectedComponent[]> {
  const results: DetectedComponent[] = []
  await walk(projectRoot, results, projectRoot)
  results.sort((a, b) => a.name.localeCompare(b.name))
  return results
}
