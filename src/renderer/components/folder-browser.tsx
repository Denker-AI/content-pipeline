import { useCallback, useEffect, useState } from 'react'

import type { DirEntry } from '@/shared/types'

interface FolderBrowserProps {
  contentDir: string
  onFileSelect: (entry: DirEntry) => void
}

const typeIcons: Record<string, string> = {
  newsletter: 'N',
  linkedin: 'L',
  blog: 'B',
  asset: 'A',
  unknown: 'F',
}

export function FolderBrowser({
  contentDir,
  onFileSelect,
}: FolderBrowserProps) {
  const [entries, setEntries] = useState<DirEntry[]>([])
  const [currentPath, setCurrentPath] = useState(contentDir)
  const [breadcrumbs, setBreadcrumbs] = useState<
    { name: string; path: string }[]
  >([])

  const loadDir = useCallback(
    async (dirPath: string) => {
      const api = window.electronAPI?.content
      if (!api) return

      const items = await api.listDir(dirPath)
      setEntries(items)
      setCurrentPath(dirPath)

      // Build breadcrumbs from contentDir to current
      const relative = dirPath
        .replace(contentDir, '')
        .replace(/^\//, '')
      const parts = relative ? relative.split('/') : []
      const crumbs = [{ name: 'content', path: contentDir }]
      let accumulated = contentDir
      for (const part of parts) {
        accumulated = `${accumulated}/${part}`
        crumbs.push({ name: part, path: accumulated })
      }
      setBreadcrumbs(crumbs)
    },
    [contentDir],
  )

  // Load root on mount or when contentDir changes
  useEffect(() => {
    if (contentDir) {
      loadDir(contentDir)
    }
  }, [contentDir, loadDir])

  // Listen for file changes to refresh current view
  useEffect(() => {
    const api = window.electronAPI?.files
    if (!api) return

    const cleanup = api.onFileChange(() => {
      loadDir(currentPath)
    })

    return cleanup
  }, [currentPath, loadDir])

  const handleClick = (entry: DirEntry) => {
    if (entry.isDirectory) {
      loadDir(entry.path)
    } else {
      onFileSelect(entry)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumbs */}
      <div className="flex shrink-0 items-center gap-1 border-b border-zinc-700 px-3 py-1.5">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <span className="text-zinc-600">/</span>}
            <button
              onClick={() => loadDir(crumb.path)}
              className={`text-xs transition-colors ${
                i === breadcrumbs.length - 1
                  ? 'text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* File list */}
      <div className="min-h-0 flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="px-3 py-4 text-xs text-zinc-600">Empty folder</div>
        ) : (
          <div className="py-1">
            {entries.map((entry) => (
              <button
                key={entry.path}
                onClick={() => handleClick(entry)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-zinc-800"
              >
                {entry.isDirectory ? (
                  <span className="w-4 text-center text-zinc-500">{'>'}</span>
                ) : (
                  <span
                    className="w-4 text-center text-zinc-600"
                    title={entry.contentType}
                  >
                    {typeIcons[entry.contentType] ?? 'F'}
                  </span>
                )}
                <span
                  className={
                    entry.isDirectory ? 'text-blue-400' : 'text-zinc-300'
                  }
                >
                  {entry.name}
                </span>
                {entry.date && (
                  <span className="ml-auto text-zinc-600">{entry.date}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
