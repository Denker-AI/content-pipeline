import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  ContentType,
  ContentVersion,
  FileEvent,
  RenderMode
} from '@/shared/types'

interface SelectedFile {
  path: string
  relativePath: string
  contentType: ContentType
}

/**
 * Rewrite image src attributes in HTML to data URLs.
 * Handles both relative paths and known absolute URLs (e.g. newsletter.denker.ai)
 * that map to local assets in the content directory.
 */
async function inlineImages(
  html: string,
  htmlFilePath: string
): Promise<string> {
  const api = window.electronAPI?.content
  if (!api) return html

  // Extract directory of the HTML file to resolve relative paths
  const dir = htmlFilePath.replace(/\/[^/]+$/, '')

  // Find all img src attributes
  const imgRegex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi
  const matches = [...html.matchAll(imgRegex)]

  let result = html
  for (const match of matches) {
    const src = match[1]

    // Skip data URLs
    if (src.startsWith('data:')) continue

    let absolutePath: string | null = null

    if (/^https?:\/\//.test(src)) {
      // Absolute URL — try to map known domains to local assets
      // e.g. https://newsletter.denker.ai/assets/2026-02-19/header-hero.png?v=2
      //   → <dir>/assets/header-hero.png
      const urlMatch = src.match(/^https?:\/\/[^/]+\/assets\/[^/]+\/([^?]+)/)
      if (urlMatch) {
        absolutePath = `${dir}/assets/${urlMatch[1]}`
      } else {
        continue // Unknown absolute URL — leave as-is
      }
    } else {
      // Relative path — resolve from HTML file's directory
      const parts = [...dir.split('/'), ...src.split('/')]
      const resolved: string[] = []
      for (const part of parts) {
        if (part === '..') resolved.pop()
        else if (part !== '.') resolved.push(part)
      }
      absolutePath = resolved.join('/')
    }

    try {
      const dataUrl = await api.readAsDataUrl(absolutePath)
      result = result.replaceAll(src, dataUrl)
    } catch {
      // PNG not found — try matching .html source and render inline
      const htmlPath = absolutePath.replace(/\.\w+$/, '.html')
      try {
        const htmlSource = await api.read(htmlPath)
        if (htmlSource) {
          // Encode HTML as a srcdoc-compatible data URL for the img's parent context
          const encoded = btoa(unescape(encodeURIComponent(htmlSource)))
          const htmlDataUrl = `data:text/html;base64,${encoded}`
          // Replace <img> tag with an inline iframe showing the component
          const imgTag = match[0]
          const iframe = `<iframe src="${htmlDataUrl}" style="width:100%;height:400px;border:0;" sandbox="allow-scripts"></iframe>`
          result = result.replaceAll(imgTag, iframe)
        }
      } catch {
        // Neither image nor HTML source found — leave as-is
      }
    }
  }

  return result
}

export function detectRenderMode(relativePath: string): RenderMode {
  const name = relativePath.split('/').pop() ?? ''

  if (/email\.html$/i.test(name) || /browser\.html$/i.test(name))
    return 'newsletter'
  // Component-generated previews/demos (including versioned: -demo-2.html)
  if (/-(?:demo|preview)(?:-\d+)?\.html$/i.test(name)) return 'asset'
  if (name === 'preview.html') return 'linkedin-preview'
  if (/post-text\.md$/i.test(name)) return 'linkedin-text'
  if (/slide-\d+\.html$/i.test(name)) return 'carousel-slide'
  if (relativePath.startsWith('blog/') && (name.endsWith('.md') || name.endsWith('.html')))
    return 'blog'
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

  // Load project root on mount and listen for auto-detected changes
  useEffect(() => {
    const api = window.electronAPI?.content
    if (!api) return
    api.getProjectRoot().then(root => {
      setProjectRoot(root)
      setContentDir(`${root}/content`)
    })
    const cleanup = api.onProjectChanged?.((newRoot: string) => {
      setProjectRoot(newRoot)
      setContentDir(`${newRoot}/content`)
      setSelectedItem(null)
      setFileContent('')
      setVersions([])
    })
    return cleanup
  }, [])

  // Auto-select first renderable file when activeContentDir changes
  useEffect(() => {
    const api = window.electronAPI?.content
    if (!api || !activeContentDir) return

    let cancelled = false
    api.listDir(activeContentDir).then(entries => {
      if (cancelled) return
      const files = entries.filter(
        e => !e.isDirectory && e.name !== 'metadata.json'
      )
      // Prefer known primary content files over arbitrary alphabetical order
      const preferred = ['post-text.md', 'post.md', 'email.html', 'browser.html']
      const file =
        files.find(e => preferred.includes(e.name)) || files[0]
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
    async (
      filePath: string,
      relativePath: string,
      contentType: ContentType
    ) => {
      const api = window.electronAPI?.content
      if (!api) return

      const selected: SelectedFile = {
        path: filePath,
        relativePath,
        contentType
      }
      setSelectedItem(selected)
      setRenderMode(detectRenderMode(relativePath))
      setLoading(true)

      try {
        const mode = detectRenderMode(relativePath)
        const [rawContent, vers] = await Promise.all([
          api.read(filePath),
          api.listVersions(filePath)
        ])
        // Inline relative images for HTML previews (fixes broken images in iframe)
        const content =
          mode === 'newsletter' ||
          mode === 'linkedin-preview' ||
          mode === 'asset'
            ? await inlineImages(rawContent, filePath)
            : rawContent
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
    []
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
        setSelectedItem(prev => (prev ? { ...prev, path: version.path } : null))
      } catch (err) {
        console.error('Failed to load version:', err)
      } finally {
        setLoading(false)
      }
    },
    [selectedItem]
  )

  // Listen for file changes — auto-refresh current preview + discover new files
  useEffect(() => {
    const api = window.electronAPI?.files
    if (!api) return

    const cleanup = api.onFileChange((event: FileEvent) => {
      if (!selectedItem) return

      // The file watcher emits paths relative to the watched item directory
      // (e.g. "email.html"), while selectedItem.relativePath is relative to
      // the content root (e.g. "newsletters/2026-02-26/email.html").
      // Use endsWith to handle both cases.
      const isSelectedFile =
        selectedItem.relativePath === event.path ||
        selectedItem.relativePath.endsWith(`/${event.path}`)
      const mode = detectRenderMode(selectedItem.relativePath)
      // HTML previews reference assets, CSS, etc. — any file change in the
      // watched item directory is relevant (watcher is already item-scoped).
      const isHtmlPreview =
        mode === 'newsletter' || mode === 'linkedin-preview' || mode === 'asset'

      // Refresh if the selected file changed, or any file changed while viewing HTML
      if (isSelectedFile || isHtmlPreview) {
        refreshCountRef.current += 1
        const contentApi = window.electronAPI?.content
        if (contentApi) {
          contentApi
            .read(selectedItem.path)
            .then(async html => {
              if (isHtmlPreview) {
                return inlineImages(html, selectedItem.path)
              }
              return html
            })
            .then(setFileContent)
            .catch(() => {})
        }
      }

      // On file creation, re-list directory and auto-select the new file
      if (event.type === 'created' && activeContentDir) {
        const contentApi = window.electronAPI?.content
        if (contentApi) {
          contentApi
            .listDir(activeContentDir)
            .then(entries => {
              const newFile = entries.find(
                e => !e.isDirectory && e.name !== 'metadata.json'
              )
              if (
                newFile &&
                (!selectedItem || selectedItem.path !== newFile.path)
              ) {
                selectFile(
                  newFile.path,
                  newFile.relativePath,
                  newFile.contentType
                )
              }
            })
            .catch(() => {})
        }
      }
    })

    return cleanup
  }, [selectedItem, activeContentDir]) // eslint-disable-line react-hooks/exhaustive-deps

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
    openProject
  }
}
