import { useCallback, useEffect, useState } from 'react'

import type { RepoSidebarData } from '@/shared/types'

export function useRepos() {
  const [repos, setRepos] = useState<RepoSidebarData[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const settings = await window.electronAPI?.settings.getUser()
      const repoPaths = settings?.repos ?? []

      if (repoPaths.length === 0) {
        // Fall back to current project root
        const root = await window.electronAPI?.content.getProjectRoot()
        if (root) {
          const [items, worktrees] = await Promise.all([
            window.electronAPI?.pipeline.listPipelineItems() ?? Promise.resolve([]),
            window.electronAPI?.git.listWorktrees() ?? Promise.resolve([]),
          ])
          setRepos([{
            path: root,
            name: root.split('/').pop() ?? root,
            items: items ?? [],
            worktrees: worktrees ?? [],
          }])
        } else {
          setRepos([])
        }
      } else {
        const results = await Promise.all(
          repoPaths.map(async (repoPath) => {
            const [items, worktrees] = await Promise.all([
              window.electronAPI?.pipeline.listPipelineItemsForRepo(repoPath) ?? Promise.resolve([]),
              window.electronAPI?.git.listWorktreesForRepo(repoPath) ?? Promise.resolve([]),
            ])
            return {
              path: repoPath,
              name: repoPath.split('/').pop() ?? repoPath,
              items: items ?? [],
              worktrees: worktrees ?? [],
            }
          }),
        )
        setRepos(results)
      }
    } catch {
      setRepos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Re-fetch when pipeline changes
  useEffect(() => {
    const cleanup = window.electronAPI?.pipeline.onPipelineChanged(() => {
      refresh()
    })
    return cleanup
  }, [refresh])

  // Re-fetch when project changes
  useEffect(() => {
    const cleanup = window.electronAPI?.content.onProjectChanged(() => {
      refresh()
    })
    return cleanup
  }, [refresh])

  const addRepo = useCallback(async () => {
    const result = await window.electronAPI?.content.addRepo()
    if (result) {
      await refresh()
    }
    return result ?? null
  }, [refresh])

  const removeRepo = useCallback(async (repoPath: string) => {
    await window.electronAPI?.content.removeRepo(repoPath)
    await refresh()
  }, [refresh])

  return { repos, loading, addRepo, removeRepo, refresh }
}
