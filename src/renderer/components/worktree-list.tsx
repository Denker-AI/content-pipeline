import { useCallback, useEffect, useState } from 'react'

import type { WorktreeInfo } from '@/shared/types'

interface WorktreeListProps {
  onSelectWorktree?: (worktree: WorktreeInfo) => void
}

export function WorktreeList({ onSelectWorktree }: WorktreeListProps) {
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await window.electronAPI?.git.listWorktrees()
      setWorktrees(list ?? [])
    } catch {
      setWorktrees([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    // Refresh when pipeline changes (e.g. new worktree created)
    const cleanup = window.electronAPI?.pipeline.onPipelineChanged(() => {
      refresh()
    })
    return cleanup
  }, [refresh])

  const handleDelete = useCallback(
    async (worktree: WorktreeInfo) => {
      if (confirmDelete !== worktree.path) {
        setConfirmDelete(worktree.path)
        return
      }
      try {
        await window.electronAPI?.git.removeWorktree(worktree.path)
        setConfirmDelete(null)
        refresh()
      } catch (err) {
        console.error('Failed to remove worktree:', err)
      }
    },
    [confirmDelete, refresh],
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Loading...</p>
      </div>
    )
  }

  if (worktrees.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          No worktrees found
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Create content to auto-create a branch
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-3 py-1.5">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {worktrees.length} branch{worktrees.length !== 1 ? 'es' : ''}
        </span>
        <button
          onClick={refresh}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          title="Refresh"
        >
          Refresh
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {worktrees.map((wt) => {
          const isMain = !wt.branch.startsWith('content/')
          return (
            <div
              key={wt.path}
              className="group flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              onClick={() => onSelectWorktree?.(wt)}
              role="button"
              tabIndex={0}
            >
              {/* Branch icon */}
              <svg className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
                  {wt.branch}
                </p>
                <p className="truncate text-[10px] text-zinc-400 dark:text-zinc-500">
                  {wt.path.split('/').slice(-2).join('/')}
                </p>
              </div>
              {!isMain && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(wt)
                  }}
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs transition-opacity ${
                    confirmDelete === wt.path
                      ? 'bg-red-500/20 text-red-400'
                      : 'text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  title={confirmDelete === wt.path ? 'Click again to confirm' : 'Delete worktree'}
                >
                  {confirmDelete === wt.path ? 'Confirm?' : '×'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
