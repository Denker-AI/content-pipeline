import { useCallback, useEffect, useState } from 'react'

import type { WorktreeInfo } from '@/shared/types'

import { GitBranchIcon, RefreshIcon, XIcon } from './icons'

interface WorktreeListProps {
  onSelectWorktree?: (worktree: WorktreeInfo) => void
}

export function WorktreeList({ onSelectWorktree }: WorktreeListProps) {
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [filter, setFilter] = useState('content')

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
    [confirmDelete, refresh]
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

  const filtered = filter.trim()
    ? worktrees.filter(wt =>
        wt.branch.toLowerCase().startsWith(filter.trim().toLowerCase())
      )
    : worktrees

  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-700 p-2">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter branches..."
            className="min-w-0 flex-1 rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="shrink-0 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              title="Clear filter"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-3 py-1.5">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {filtered.length} branch{filtered.length !== 1 ? 'es' : ''}
          {filter && filtered.length !== worktrees.length && (
            <span className="font-normal text-zinc-400 dark:text-zinc-500">
              {' '}
              of {worktrees.length}
            </span>
          )}
        </span>
        <button
          onClick={refresh}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          title="Refresh"
        >
          <RefreshIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar">
        {filtered.map(wt => {
          const isMain = !wt.branch.startsWith('content/')
          return (
            <div
              key={wt.path}
              className="group flex cursor-pointer items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              onClick={() => onSelectWorktree?.(wt)}
              role="button"
              tabIndex={0}
            >
              <GitBranchIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
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
                  onClick={e => {
                    e.stopPropagation()
                    handleDelete(wt)
                  }}
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs transition-opacity ${
                    confirmDelete === wt.path
                      ? 'bg-red-500/20 text-red-400'
                      : 'text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  title={
                    confirmDelete === wt.path
                      ? 'Click again to confirm'
                      : 'Delete worktree'
                  }
                >
                  {confirmDelete === wt.path ? (
                    'Confirm?'
                  ) : (
                    <XIcon className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
