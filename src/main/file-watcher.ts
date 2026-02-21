import chokidar, { type FSWatcher } from 'chokidar'
import path from 'path'

import type { FileEvent, FileEventType } from '@/shared/types'

type FileEventCallback = (event: FileEvent) => void

let watcher: FSWatcher | null = null
const listeners: Set<FileEventCallback> = new Set()

// Debounce map: path → timeout
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const DEBOUNCE_MS = 500

function emitDebounced(type: FileEventType, filePath: string, root: string) {
  const relativePath = path.relative(root, filePath)
  const key = `${type}:${relativePath}`

  const existing = debounceTimers.get(key)
  if (existing) clearTimeout(existing)

  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key)
      const event: FileEvent = { type, path: relativePath }
      for (const cb of listeners) {
        cb(event)
      }
    }, DEBOUNCE_MS),
  )
}

export function startWatcher(contentDir: string): void {
  if (watcher) {
    stopWatcher()
  }

  watcher = chokidar.watch(contentDir, {
    ignoreInitial: true,
    persistent: true,
    ignored: /(^|[/\\])\../, // ignore dotfiles
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  })

  watcher.on('add', (filePath: string) =>
    emitDebounced('created', filePath, contentDir),
  )
  watcher.on('change', (filePath: string) =>
    emitDebounced('modified', filePath, contentDir),
  )
  watcher.on('unlink', (filePath: string) =>
    emitDebounced('deleted', filePath, contentDir),
  )
  watcher.on('error', (err: unknown) =>
    console.error('File watcher error:', err),
  )
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer)
  }
  debounceTimers.clear()
  listeners.clear()
}

export function onFileChange(callback: FileEventCallback): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}
