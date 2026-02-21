import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  ContentType,
  ContentVersion,
  FileEvent,
  RenderMode,
} from '@/shared/types'

interface SelectedFile {
  path: string
  relativePath: string
  contentType: ContentType
}

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

export function useContent(activeContentDir?: string) {
  const [selectedItem, setSelectedItem] = useState<SelectedFile | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [renderMode, setRenderMode] = useState<RenderMode>('unknown')
  const [versions, setVersions] = useState<ContentVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [projectRoot, setProjectRoot] = useState<string>('')
  const [contentDir, setContentDir] = useState<string>('')
  const refreshCountRef = useRef(0)

  // Load project root on mount
  useEffect(() => {
    const api = window.electronAPI?.content
    if (!api) return
    api.getProjectRoot().then((root) => {
      setProjectRoot(root)
      setContentDir(`${root}/content`)
    })
  }, [])

  // Auto-select first renderable file when activeContentDir changes
  useEffect(() => {
    const api = window.electronAPI?.content
    if (!api || !activeContentDir) return

    let cancelled = false
    api.listDir(activeContentDir).then((entries) => {
      if (cancelled) return
      const file = entries.find(
        (e) => !e.isDirectory && e.name !== 'metadata.json',
      )
      if (file) {
        selectFile(file.path, file.relativePath, file.contentType)
      } else {
        setSelectedItem(null)
        setFileContent('')
        setVersions([])
      }
    })

    return () => {
      cancelled = true
    }
  }, [activeContentDir]) // eslint-disable-line react-hooks/exhaustive-deps

  // Select and load a file
  const selectFile = useCallback(
    async (filePath: string, relativePath: string, contentType: ContentType) => {
      const api = window.electronAPI?.content
      if (!api) return

      const selected: SelectedFile = { path: filePath, relativePath, contentType }
      setSelectedItem(selected)
      setRenderMode(detectRenderMode(relativePath))
      setLoading(true)

      try {
        const [content, vers] = await Promise.all([
          api.read(filePath),
          api.listVersions(filePath),
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
    },
    [],
  )

  // Load a version
  const selectVersion = useCallback(
    async (version: ContentVersion) => {
      const api = window.electronAPI?.content
      if (!api || !selectedItem) return

      setLoading(true)
      setRenderMode(detectRenderMode(version.path))

      try {
        const content = await api.read(version.path)
        setFileContent(content)
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

  // Listen for file changes — auto-refresh current preview
  useEffect(() => {
    const api = window.electronAPI?.files
    if (!api) return

    const cleanup = api.onFileChange((event: FileEvent) => {
      if (selectedItem && selectedItem.relativePath === event.path) {
        refreshCountRef.current += 1
        const contentApi = window.electronAPI?.content
        if (contentApi) {
          contentApi
            .read(selectedItem.path)
            .then(setFileContent)
            .catch(() => {})
        }
      }
    })

    return cleanup
  }, [selectedItem])

  const openProject = useCallback(async () => {
    const api = window.electronAPI?.content
    if (!api) return
    const newRoot = await api.openProject()
    if (newRoot) {
      setProjectRoot(newRoot)
      setContentDir(`${newRoot}/content`)
      setSelectedItem(null)
      setFileContent('')
      setVersions([])
    }
  }, [])

  return {
    selectedItem,
    fileContent,
    renderMode,
    versions,
    loading,
    projectRoot,
    contentDir,
    refreshCount: refreshCountRef.current,
    selectFile,
    selectVersion,
    openProject,
  }
}
