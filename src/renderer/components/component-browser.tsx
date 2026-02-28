import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { DetectedComponent } from '@/shared/types'

import { ComponentCard } from './component-card'

interface RecentPreview {
  componentName: string
  fileName: string
  filePath: string
  isDemo: boolean
}

interface ComponentBrowserProps {
  onPreview: (component: DetectedComponent) => void
  onViewExisting?: (name: string, html: string) => void
  activeContentDir?: string
}

export function ComponentBrowser({
  onPreview,
  onViewExisting,
  activeContentDir
}: ComponentBrowserProps) {
  const [components, setComponents] = useState<DetectedComponent[]>([])
  const [query, setQuery] = useState('')
  const [scanning, setScanning] = useState(false)
  const [recentPreviews, setRecentPreviews] = useState<RecentPreview[]>([])
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

  // Scan activeContentDir for existing demo/preview HTML files
  const loadRecentPreviews = useCallback(async () => {
    if (!activeContentDir) {
      setRecentPreviews([])
      return
    }
    try {
      const entries = await window.electronAPI?.content.listDir(activeContentDir)
      if (!entries) return
      const previews: RecentPreview[] = entries
        .filter(e => !e.isDirectory && /-(demo|preview)(?:-\d+)?\.html$/i.test(e.name))
        .map(e => {
          const match = e.name.match(/^(.+?)-(demo|preview)(?:-\d+)?\.html$/i)
          return {
            componentName: match?.[1] ?? e.name,
            fileName: e.name,
            filePath: e.path,
            isDemo: (match?.[2] ?? '').toLowerCase() === 'demo'
          }
        })
        // Most recent first (by filename, higher version numbers later)
        .reverse()
      // Deduplicate by componentName — keep the latest version only
      const seen = new Set<string>()
      const unique = previews.filter(p => {
        const key = `${p.componentName}-${p.isDemo ? 'demo' : 'preview'}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setRecentPreviews(unique)
    } catch {
      setRecentPreviews([])
    }
  }, [activeContentDir])

  useEffect(() => {
    loadRecentPreviews()
  }, [loadRecentPreviews])

  // Refresh recent previews on file changes
  useEffect(() => {
    const api = window.electronAPI?.files
    if (!api) return
    return api.onFileChange(event => {
      if (event.type === 'created' || event.type === 'deleted') {
        loadRecentPreviews()
      }
    })
  }, [loadRecentPreviews])

  const handleViewExisting = useCallback(
    async (preview: RecentPreview) => {
      if (!onViewExisting) return
      try {
        const html = await window.electronAPI?.content.read(preview.filePath)
        if (html) {
          onViewExisting(preview.componentName, html)
        }
      } catch {
        // ignore read errors
      }
    },
    [onViewExisting]
  )

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

      {/* Recent previews */}
      {recentPreviews.length > 0 && !query.trim() && (
        <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-700">
          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Recent Previews
          </div>
          <div className="flex flex-col gap-0.5 px-2 pb-2">
            {recentPreviews.map(preview => (
              <button
                key={preview.filePath}
                onClick={() => handleViewExisting(preview)}
                className="group flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <span
                  className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${
                    preview.isDemo
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {preview.isDemo ? 'demo' : 'static'}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
                  {preview.componentName}
                </span>
                <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100">
                  View
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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
