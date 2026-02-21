import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  ContentItem,
  ContentVersion,
  FileEvent,
  RenderMode,
} from '@/shared/types'

function detectRenderMode(relativePath: string): RenderMode {
  const name = relativePath.split('/').pop() ?? ''

  if (/email\.html$/i.test(name) || /browser\.html$/i.test(name))
    return 'newsletter'
  if (/preview\.html$/i.test(name)) return 'linkedin-preview'
  if (/post-text\.md$/i.test(name)) return 'linkedin-text'
  if (/slide-\d+\.html$/i.test(name)) return 'carousel-slide'
  if (relativePath.startsWith('blog/') && name.endsWith('.md')) return 'blog'
  if (relativePath.startsWith('assets/') && name.endsWith('.html'))
    return 'asset'
  // Drafts in newsletters render as newsletter
  if (relativePath.startsWith('newsletters/') && name.endsWith('.html'))
    return 'newsletter'

  return 'unknown'
}

export function useContent() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [renderMode, setRenderMode] = useState<RenderMode>('unknown')
  const [versions, setVersions] = useState<ContentVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [projectRoot, setProjectRoot] = useState<string>('')
  const refreshCountRef = useRef(0)

  // Load content list
  const loadItems = useCallback(async () => {
    const api = window.electronAPI?.content
    if (!api) return
    const list = await api.list()
    setItems(list)
    const root = await api.getProjectRoot()
    setProjectRoot(root)
  }, [])

  // Load a specific file's content
  const loadFile = useCallback(async (item: ContentItem) => {
    const api = window.electronAPI?.content
    if (!api) return

    setLoading(true)
    setSelectedItem(item)
    setRenderMode(detectRenderMode(item.relativePath))

    try {
      const [content, vers] = await Promise.all([
        api.read(item.path),
        api.listVersions(item.path),
      ])
      setFileContent(content)
      setVersions(vers)
    } catch (err) {
      console.error('Failed to load content:', err)
      setFileContent('')
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load a version
  const loadVersion = useCallback(
    async (version: ContentVersion) => {
      const api = window.electronAPI?.content
      if (!api || !selectedItem) return

      setLoading(true)
      setRenderMode(detectRenderMode(version.path))

      try {
        const content = await api.read(version.path)
        setFileContent(content)
        // Update selected item path to match current version
        setSelectedItem((prev) =>
          prev ? { ...prev, path: version.path } : null,
        )
      } catch (err) {
        console.error('Failed to load version:', err)
      } finally {
        setLoading(false)
      }
    },
    [selectedItem],
  )

  // Initial load
  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Listen for file changes
  useEffect(() => {
    const api = window.electronAPI?.files
    if (!api) return

    const cleanup = api.onFileChange((event: FileEvent) => {
      // Refresh the content list
      loadItems()

      // If the changed file matches our current selection, reload it
      if (selectedItem && selectedItem.relativePath === event.path) {
        refreshCountRef.current += 1
        const api = window.electronAPI?.content
        if (api) {
          api.read(selectedItem.path).then(setFileContent).catch(() => {})
        }
      }
    })

    return cleanup
  }, [loadItems, selectedItem])

  const openProject = useCallback(async () => {
    const api = window.electronAPI?.content
    if (!api) return
    const newRoot = await api.openProject()
    if (newRoot) {
      setProjectRoot(newRoot)
      setSelectedItem(null)
      setFileContent('')
      setVersions([])
      await loadItems()
    }
  }, [loadItems])

  return {
    items,
    selectedItem,
    fileContent,
    renderMode,
    versions,
    loading,
    projectRoot,
    refreshCount: refreshCountRef.current,
    selectItem: loadFile,
    selectVersion: loadVersion,
    openProject,
    refresh: loadItems,
  }
}
