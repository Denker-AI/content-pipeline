import { useCallback, useEffect, useRef, useState } from 'react'

import type { GitCommitFile, GitFileEntry } from '@/shared/types'

interface UseGitStatusResult {
  unstaged: GitFileEntry[]
  committed: GitCommitFile[]
  loading: boolean
  refresh: () => void
}

export function useGitStatus(worktreePath?: string): UseGitStatusResult {
  const [unstaged, setUnstaged] = useState<GitFileEntry[]>([])
  const [committed, setCommitted] = useState<GitCommitFile[]>([])
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (!worktreePath) {
      setUnstaged([])
      setCommitted([])
      return
    }

    const api = window.electronAPI?.git
    if (!api) return

    setLoading(true)
    try {
      const [statusResult, recentResult] = await Promise.all([
        api.status(worktreePath),
        api.recentFiles(worktreePath, 10)
      ])
      setUnstaged(statusResult)
      setCommitted(recentResult)
    } catch {
      setUnstaged([])
      setCommitted([])
    } finally {
      setLoading(false)
    }
  }, [worktreePath])

  // Initial load + poll every 3 seconds
  useEffect(() => {
    refresh()
    intervalRef.current = setInterval(refresh, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh])

  // Also refresh on file change events
  useEffect(() => {
    const cleanup = window.electronAPI?.files.onFileChange(() => {
      refresh()
    })
    return cleanup
  }, [refresh])

  return { unstaged, committed, loading, refresh }
}
