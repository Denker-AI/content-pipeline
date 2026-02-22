import { useCallback, useEffect, useState } from 'react'

import type { BlogPublishResult } from '@/shared/types'

import { PublishDialog } from './publish-dialog'

interface BlogPublisherProps {
  isOpen: boolean
  onClose: () => void
  contentDir: string
}

interface BlogPreview {
  title: string
  slug: string
  description: string
}

function extractFrontmatter(raw: string): BlogPreview | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null

  const yaml = match[1]
  const get = (key: string): string => {
    const m = yaml.match(new RegExp(`^${key}\\s*:\\s*(.+)$`, 'm'))
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''
  }

  const title = get('title')
  const slug = get('slug')
  if (!title || !slug) return null

  return { title, slug, description: get('description') }
}

export function BlogPublisher({
  isOpen,
  onClose,
  contentDir,
}: BlogPublisherProps) {
  const [preview, setPreview] = useState<BlogPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingContent, setLoadingContent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BlogPublishResult | null>(null)

  // Load blog content when dialog opens
  useEffect(() => {
    if (!isOpen || !contentDir) return
    setError(null)
    setResult(null)
    setLoadingContent(true)
    setPreview(null)

    const load = async () => {
      const api = window.electronAPI?.content
      if (!api) return

      try {
        // Try common blog markdown filenames
        const names = ['blog.md', 'post.md', 'index.md']
        let raw: string | null = null

        for (const name of names) {
          try {
            raw = await api.read(`${contentDir}/${name}`)
            if (raw) break
          } catch {
            // try next
          }
        }

        // Fallback: list dir for any .md file
        if (!raw) {
          try {
            const entries = await api.listDir(contentDir)
            const mdFile = entries.find(
              (e) => !e.isDirectory && e.name.endsWith('.md'),
            )
            if (mdFile) {
              raw = await api.read(mdFile.path)
            }
          } catch {
            // no .md files
          }
        }

        if (raw) {
          const fm = extractFrontmatter(raw)
          setPreview(fm)
          if (!fm) {
            setError('Could not parse frontmatter. Ensure title and slug are set.')
          }
        } else {
          setError('No .md file found in content directory')
        }
      } catch {
        setError('Failed to read blog content')
      }

      setLoadingContent(false)
    }

    load()
  }, [isOpen, contentDir])

  const handlePublish = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const publishResult = await window.electronAPI?.publish.blog(contentDir)
      if (publishResult) {
        setResult(publishResult)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Publishing failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [contentDir])

  const hasContent = preview !== null

  return (
    <PublishDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handlePublish}
      title="Publish Blog"
      confirmLabel={result ? 'Done' : 'Publish'}
      confirmDisabled={!hasContent || !!result}
      loading={loading}
    >
      {loadingContent ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-zinc-500">Loading content...</p>
        </div>
      ) : result ? (
        <div className="space-y-3">
          <div className="rounded bg-green-900/30 p-3 text-sm text-green-300">
            Published successfully!
          </div>
          <div className="space-y-1 text-xs text-zinc-400">
            <div>
              <span className="text-zinc-500">Title:</span> {result.title}
            </div>
            <div>
              <span className="text-zinc-500">Slug:</span>{' '}
              <span className="font-mono">{result.slug}</span>
            </div>
            <div>
              <span className="text-zinc-500">Status:</span>{' '}
              {result.statusCode}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Title
            </label>
            <div className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200">
              {preview?.title || (
                <span className="text-zinc-500">No title found</span>
              )}
            </div>
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Slug
            </label>
            <div className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-300">
              {preview?.slug || (
                <span className="font-sans text-zinc-500">No slug found</span>
              )}
            </div>
          </div>

          {/* SEO Preview */}
          {preview && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                SEO Preview
              </label>
              <div className="rounded border border-zinc-700 bg-zinc-800 p-3">
                <div className="text-sm font-medium text-blue-400">
                  {preview.title}
                </div>
                <div className="text-xs text-green-400">
                  example.com/blog/{preview.slug}
                </div>
                {preview.description && (
                  <div className="mt-1 text-xs text-zinc-400 line-clamp-2">
                    {preview.description}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Webhook info */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Destination
            </label>
            <div className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300">
              Configured webhook URL (see Settings)
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded bg-red-900/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>
      )}
    </PublishDialog>
  )
}
