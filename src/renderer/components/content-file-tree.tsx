import { useCallback, useEffect, useState } from 'react'

import type { ContentType, DirEntry } from '@/shared/types'

interface ContentFileTreeProps {
  contentDir: string
  onFileSelect: (path: string, relativePath: string, contentType: ContentType) => void
}

function getFileIcon(fileName: string): string {
  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(fileName)) return 'img'
  if (/\.(mp4|webm|mov)$/i.test(fileName)) return 'vid'
  if (/\.html$/i.test(fileName)) return 'html'
  if (/\.md$/i.test(fileName)) return 'md'
  if (/\.json$/i.test(fileName)) return 'json'
  return 'file'
}

function detectContentType(filePath: string): ContentType {
  if (filePath.includes('linkedin/') || filePath.includes('linkedin\\'))
    return 'linkedin'
  if (filePath.includes('newsletter') || filePath.includes('newsletters/'))
    return 'newsletter'
  if (filePath.includes('blog/')) return 'blog'
  if (filePath.includes('assets/')) return 'asset'
  return 'unknown'
}

const ICON_COLORS: Record<string, string> = {
  html: 'text-orange-400',
  md: 'text-blue-400',
  json: 'text-yellow-400',
  img: 'text-green-400',
  vid: 'text-red-400',
  file: 'text-zinc-400'
}

interface FileEntry {
  name: string
  path: string
}

export function ContentFileTree({ contentDir, onFileSelect }: ContentFileTreeProps) {
  const [files, setFiles] = useState<FileEntry[]>([])

  const loadFiles = useCallback(async () => {
    try {
      const api = window.electronAPI?.content
      if (!api) return
      const entries: DirEntry[] = await api.listDir(contentDir)
      if (!entries) return

      const allFiles: FileEntry[] = []

      // Top-level files
      for (const e of entries) {
        if (!e.isDirectory && e.name !== 'metadata.json') {
          allFiles.push({ name: e.name, path: e.path })
        }
      }

      // Files from known subdirectories (videos/, carousel-images/, screenshots/)
      const mediaDirs = entries.filter(
        (e: DirEntry) => e.isDirectory && ['videos', 'carousel-images', 'screenshots'].includes(e.name)
      )
      for (const dir of mediaDirs) {
        try {
          const subEntries: DirEntry[] = await api.listDir(dir.path)
          for (const se of subEntries) {
            if (!se.isDirectory) {
              allFiles.push({ name: `${dir.name}/${se.name}`, path: se.path })
            }
          }
        } catch { /* skip */ }
      }

      setFiles(allFiles)
    } catch {
      setFiles([])
    }
  }, [contentDir])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  useEffect(() => {
    const api = window.electronAPI?.files
    if (!api) return
    // File watcher emits relative paths (relative to content root).
    // We can't reliably match them to our absolute contentDir, so just
    // reload on any created/deleted event — loadFiles() is already scoped.
    return api.onFileChange(event => {
      if (event.type === 'created' || event.type === 'deleted') {
        loadFiles()
      }
    })
  }, [contentDir, loadFiles])

  if (files.length === 0) return null

  return (
    <div className="ml-[7px] border-l border-zinc-200 dark:border-zinc-700/70">
      {files.map((file, i) => {
        const icon = getFileIcon(file.name)
        const colorClass = ICON_COLORS[icon] || 'text-zinc-400'
        const isLast = i === files.length - 1
        return (
          <button
            key={file.path}
            onClick={e => {
              e.stopPropagation()
              const relativePath = file.path.startsWith(contentDir + '/')
                ? file.path.slice(contentDir.length + 1)
                : file.name
              onFileSelect(file.path, relativePath, detectContentType(file.path))
            }}
            className="group flex w-full items-center text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            title={file.name}
          >
            {/* Tree connector: ├── or └── */}
            <span className="relative flex h-6 w-4 shrink-0 items-center justify-center">
              {/* Horizontal branch */}
              <span className="absolute left-0 top-1/2 h-px w-2.5 bg-zinc-200 dark:bg-zinc-700/70" />
              {/* Vertical continuation (hidden for last item) */}
              {!isLast && (
                <span className="absolute left-0 top-1/2 h-full w-px bg-zinc-200 dark:bg-zinc-700/70" />
              )}
            </span>
            <span className={`ml-0.5 shrink-0 text-[10px] font-medium ${colorClass}`}>
              {icon}
            </span>
            <span className="ml-1.5 min-w-0 flex-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
              {file.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
