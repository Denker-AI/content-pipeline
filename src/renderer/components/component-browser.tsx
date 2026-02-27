import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { DetectedComponent } from '@/shared/types'

import { ComponentCard } from './component-card'

interface ComponentBrowserProps {
  onPreview: (component: DetectedComponent) => void
}

export function ComponentBrowser({ onPreview }: ComponentBrowserProps) {
  const [components, setComponents] = useState<DetectedComponent[]>([])
  const [query, setQuery] = useState('')
  const [scanning, setScanning] = useState(false)
  const scannedRef = useRef(false)

  const scan = useCallback(async () => {
    const api = window.electronAPI?.components
    if (!api) return
    setScanning(true)
    try {
      const found = await api.scan()
      setComponents(found)
    } finally {
      setScanning(false)
    }
  }, [])

  // Auto-scan once on mount
  useEffect(() => {
    if (scannedRef.current) return
    scannedRef.current = true
    void scan()
  }, [scan])

  // Re-scan when the project changes (repo added/removed/switched)
  useEffect(() => {
    const cleanup = window.electronAPI?.content.onProjectChanged(() => {
      void scan()
    })
    return cleanup
  }, [scan])

  // Also receive components Claude mentions in the terminal (merge, no duplicates)
  useEffect(() => {
    const api = window.electronAPI?.components
    if (!api) return
    return api.onComponentFound(component => {
      setComponents(prev =>
        prev.some(c => c.path === component.path) ? prev : [...prev, component]
      )
    })
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return components
    const q = query.toLowerCase()
    return components.filter(
      c => c.name.toLowerCase().includes(q) || c.path.toLowerCase().includes(q)
    )
  }, [components, query])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Search bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 dark:border-zinc-700 px-3 py-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search components..."
          className="min-w-0 flex-1 rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={() => void scan()}
          disabled={scanning}
          className="shrink-0 rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50"
        >
          {scanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {/* Count */}
      {components.length > 0 && (
        <div className="shrink-0 px-3 py-1 text-xs text-zinc-400 dark:text-zinc-500">
          {filtered.length === components.length
            ? `${components.length} components`
            : `${filtered.length} of ${components.length}`}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-auto p-3">
        {scanning && components.length === 0 ? (
          <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
            Scanning...
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
            {query ? 'No matches' : 'No components found'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(component => (
              <ComponentCard
                key={component.path}
                component={component}
                onPreview={onPreview}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
