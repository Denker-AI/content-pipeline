import { useState } from 'react'

import type { ContentType, GitCommitFile, GitFileEntry } from '@/shared/types'

interface FileSidebarProps {
  unstaged: GitFileEntry[]
  committed: GitCommitFile[]
  loading: boolean
  onRefresh: () => void
  onFileSelect: (absolutePath: string, relativePath: string, contentType: ContentType) => void
  worktreePath?: string
}

function detectContentTypeFromPath(filePath: string): ContentType {
  if (filePath.includes('linkedin/') || filePath.includes('linkedin\\')) return 'linkedin'
  if (filePath.includes('newsletter') || filePath.includes('newsletters/')) return 'newsletter'
  if (filePath.includes('blog/')) return 'blog'
  if (filePath.includes('assets/')) return 'asset'
  return 'unknown'
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'new': return 'bg-green-400'
    case 'modified': return 'bg-yellow-400'
    case 'deleted': return 'bg-red-400'
    default: return 'bg-zinc-400'
  }
}

function getFileIcon(fileName: string): string {
  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(fileName)) return 'img'
  if (/\.html$/i.test(fileName)) return 'html'
  if (/\.md$/i.test(fileName)) return 'md'
  if (/\.json$/i.test(fileName)) return 'json'
  return 'file'
}

export function FileSidebar({
  unstaged,
  committed,
  loading,
  onRefresh,
  onFileSelect,
  worktreePath,
}: FileSidebarProps) {
  const [unstagedOpen, setUnstagedOpen] = useState(true)
  const [committedOpen, setCommittedOpen] = useState(true)

  const handleFileClick = (filePath: string) => {
    if (!worktreePath) return
    const absolutePath = `${worktreePath}/${filePath}`
    const contentType = detectContentTypeFromPath(filePath)
    // relativePath: strip leading "content/" if present
    const relativePath = filePath.startsWith('content/')
      ? filePath.slice('content/'.length)
      : filePath
    onFileSelect(absolutePath, relativePath, contentType)
  }

  return (
    <div className="flex w-56 shrink-0 flex-col border-l border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-3 py-2">
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          Files
        </span>
        <button
          onClick={onRefresh}
          className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
          title="Refresh"
        >
          {loading ? '...' : 'Refresh'}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Unstaged section */}
        <div>
          <button
            onClick={() => setUnstagedOpen(!unstagedOpen)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span className="text-[10px]">{unstagedOpen ? '▼' : '▶'}</span>
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            Unstaged ({unstaged.length})
          </button>
          {unstagedOpen && unstaged.length > 0 && (
            <div>
              {unstaged.map((file) => {
                const fileName = file.path.split('/').pop() ?? file.path
                return (
                  <button
                    key={file.path}
                    onClick={() => handleFileClick(file.path)}
                    className="flex w-full items-center gap-2 px-4 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title={file.path}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${getStatusColor(file.status)}`} />
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-600 dark:text-zinc-300">
                      {fileName}
                    </span>
                    <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
                      {getFileIcon(fileName)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {unstagedOpen && unstaged.length === 0 && (
            <p className="px-4 py-1 text-[10px] text-zinc-400 dark:text-zinc-500">
              No changes
            </p>
          )}
        </div>

        {/* Committed section */}
        <div className="border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setCommittedOpen(!committedOpen)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span className="text-[10px]">{committedOpen ? '▼' : '▶'}</span>
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Committed ({committed.length})
          </button>
          {committedOpen && committed.length > 0 && (
            <div>
              {committed.map((file, i) => {
                const fileName = file.path.split('/').pop() ?? file.path
                return (
                  <button
                    key={`${file.commitHash}-${file.path}-${i}`}
                    onClick={() => handleFileClick(file.path)}
                    className="flex w-full items-center gap-2 px-4 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title={`${file.path}\n${file.commitMessage}`}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-600 dark:text-zinc-300">
                      {fileName}
                    </span>
                    <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
                      {getFileIcon(fileName)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {committedOpen && committed.length === 0 && (
            <p className="px-4 py-1 text-[10px] text-zinc-400 dark:text-zinc-500">
              No commits yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
