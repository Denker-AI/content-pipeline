import { useCallback, useEffect, useState } from 'react'

import type { LinkedInPublishResult } from '@/shared/types'

import { PublishDialog } from './publish-dialog'

interface LinkedInPublisherProps {
  isOpen: boolean
  onClose: () => void
  contentDir: string
}

export function LinkedInPublisher({
  isOpen,
  onClose,
  contentDir,
}: LinkedInPublisherProps) {
  const [postText, setPostText] = useState('')
  const [imageCount, setImageCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingContent, setLoadingContent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LinkedInPublishResult | null>(null)

  // Load post content when dialog opens
  useEffect(() => {
    if (!isOpen || !contentDir) return
    setError(null)
    setResult(null)
    setLoadingContent(true)

    const loadContent = async () => {
      const api = window.electronAPI?.content
      if (!api) return

      try {
        // Read post-text.md
        const text = await api.read(`${contentDir}/post-text.md`)
        setPostText(text.trim())
      } catch {
        setPostText('')
      }

      try {
        // Count carousel images
        const entries = await api.listDir(`${contentDir}/carousel-images`)
        const images = entries.filter(
          (e) => !e.isDirectory && /\.(png|jpg|jpeg|gif|webp)$/i.test(e.name),
        )
        setImageCount(images.length)
      } catch {
        setImageCount(0)
      }

      setLoadingContent(false)
    }

    loadContent()
  }, [isOpen, contentDir])

  const handlePublish = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const publishResult = await window.electronAPI?.publish.linkedin(contentDir)
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

  const charCount = postText.length
  const hasContent = postText.length > 0

  return (
    <PublishDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handlePublish}
      title="Publish to LinkedIn"
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
          <div className="text-xs text-zinc-400">
            <span className="text-zinc-500">Post ID:</span>{' '}
            <span className="font-mono">{result.postId}</span>
          </div>
          <a
            href={result.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-blue-400 hover:text-blue-300"
          >
            View on LinkedIn
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Post text preview */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-400">
                Post Text
              </label>
              <span
                className={`text-xs ${charCount > 3000 ? 'text-red-400' : 'text-zinc-500'}`}
              >
                {charCount.toLocaleString()} / 3,000
              </span>
            </div>
            {hasContent ? (
              <div className="max-h-48 overflow-y-auto rounded border border-zinc-700 bg-zinc-800 p-3 text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
                {postText}
              </div>
            ) : (
              <div className="rounded border border-zinc-700 bg-zinc-800 p-3 text-sm text-zinc-500">
                No post-text.md found in content directory
              </div>
            )}
          </div>

          {/* Image info */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Images
            </label>
            <div className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300">
              {imageCount > 0 ? (
                <span>
                  {imageCount} image{imageCount !== 1 ? 's' : ''} in
                  carousel-images/
                </span>
              ) : (
                <span className="text-zinc-500">
                  No images (text-only post)
                </span>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded bg-red-900/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Warning for long posts */}
          {charCount > 3000 && (
            <div className="rounded bg-yellow-900/30 p-2 text-xs text-yellow-300">
              Post exceeds LinkedIn&apos;s 3,000 character limit. It may be
              truncated.
            </div>
          )}
        </div>
      )}
    </PublishDialog>
  )
}
