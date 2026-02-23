import { useCallback, useEffect, useState } from 'react'

import type { RenderMode } from '@/shared/types'

interface LinkedInCompositePreviewProps {
  contentDir: string
  renderMode: RenderMode
  textContent?: string
}

interface ImageSlide {
  name: string
  dataUrl: string
}

export function LinkedInCompositePreview({
  contentDir,
  renderMode,
  textContent,
}: LinkedInCompositePreviewProps) {
  const [postText, setPostText] = useState('')
  const [images, setImages] = useState<ImageSlide[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  // Load content from directory
  const loadContent = useCallback(async () => {
    const api = window.electronAPI?.content
    if (!api) return

    // Text: use prop if provided (linkedin-text mode), otherwise read from file
    if (renderMode === 'linkedin-text' && textContent !== undefined) {
      setPostText(textContent)
    } else {
      try {
        const text = await api.read(`${contentDir}/post-text.md`)
        setPostText(text.trim())
      } catch {
        setPostText('')
      }
    }

    // Images: scan carousel-images/ and root-level images
    const loadedImages: ImageSlide[] = []
    try {
      // Check carousel-images/ subdirectory
      const entries = await api.listDir(contentDir)
      const carouselDir = entries.find(
        (e) => e.isDirectory && e.name === 'carousel-images',
      )
      if (carouselDir) {
        const carouselEntries = await api.listDir(carouselDir.path)
        const imgEntries = carouselEntries
          .filter(
            (e) => !e.isDirectory && /\.(png|jpg|jpeg|webp)$/i.test(e.name),
          )
          .sort((a, b) => a.name.localeCompare(b.name))
        for (const entry of imgEntries) {
          try {
            const dataUrl = await api.readAsDataUrl(entry.path)
            loadedImages.push({ name: entry.name, dataUrl })
          } catch {
            /* skip unreadable */
          }
        }
      }

      // Also check root-level images (not in subdirectories)
      const rootImages = entries
        .filter(
          (e) =>
            !e.isDirectory &&
            /\.(png|jpg|jpeg|webp)$/i.test(e.name) &&
            !e.name.startsWith('.'),
        )
        .sort((a, b) => a.name.localeCompare(b.name))
      for (const entry of rootImages) {
        try {
          const dataUrl = await api.readAsDataUrl(entry.path)
          loadedImages.push({ name: entry.name, dataUrl })
        } catch {
          /* skip */
        }
      }
    } catch {
      /* dir unreadable */
    }

    setImages(loadedImages)
    setCurrentSlide(0)
    setLoading(false)
  }, [contentDir, renderMode, textContent])

  // Initial load
  useEffect(() => {
    setLoading(true)
    loadContent()
  }, [loadContent])

  // Watch for file changes in content directory
  useEffect(() => {
    const unsub = window.electronAPI?.files.onFileChange((event) => {
      if (event.path.startsWith(contentDir)) {
        loadContent()
      }
    })
    return unsub
  }, [contentDir, loadContent])

  const handlePrev = useCallback(() => {
    setCurrentSlide((s) => Math.max(0, s - 1))
  }, [])

  const handleNext = useCallback(() => {
    setCurrentSlide((s) => Math.min(images.length - 1, s + 1))
  }, [images.length])

  const handleGenerateVisual = useCallback(() => {
    const prompt = `I have a LinkedIn post with this text:\n\n${postText}\n\nDesign a visually compelling 1080x1350 carousel slide (HTML/CSS) that complements this post. Use only vanilla HTML, CSS, and JS. Output the complete HTML between ===HTML_PREVIEW_START=== and ===HTML_PREVIEW_END===\n`
    window.electronAPI?.terminal.sendInput(prompt)
  }, [postText])

  const handleGenerateText = useCallback(() => {
    const imageCount = images.length
    const prompt = `I have a LinkedIn carousel with ${imageCount} slide(s).\n\nWrite a compelling LinkedIn post (post-text.md) in founder voice, no emojis, max 3000 chars. Save it to ${contentDir}/post-text.md\n`
    window.electronAPI?.terminal.sendInput(prompt)
  }, [images.length, contentDir])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
        <p className="text-sm">Loading preview...</p>
      </div>
    )
  }

  const charCount = postText.length
  const charLimit = 3000
  const hasText = postText.length > 0
  const hasImages = images.length > 0
  const truncateAt = 280
  const shouldTruncate = postText.length > truncateAt && !expanded

  return (
    <div className="mx-auto w-full max-w-[555px] p-4">
      {/* LinkedIn card */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        {/* Header: avatar + name */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-lg font-bold text-white">
            D
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              Juan Zhang
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Building Denker AI &middot; 1d
            </p>
          </div>
        </div>

        {/* Post text area */}
        {hasText ? (
          <div className="px-4 pb-2">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
              {shouldTruncate ? postText.slice(0, truncateAt) + '...' : postText}
            </p>
            {postText.length > truncateAt && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-0.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {expanded ? 'show less' : '...see more'}
              </button>
            )}
          </div>
        ) : (
          <div className="mx-4 mb-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-center dark:border-zinc-600 dark:bg-zinc-700/50">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              No post text yet
            </p>
            {hasImages && (
              <button
                onClick={handleGenerateText}
                className="mt-2 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500"
              >
                Generate post text for this visual
              </button>
            )}
          </div>
        )}

        {/* Image area */}
        {hasImages ? (
          <div className="relative">
            <img
              src={images[currentSlide]?.dataUrl}
              alt={images[currentSlide]?.name ?? 'Carousel slide'}
              className="w-full object-contain"
            />
            {/* Carousel navigation */}
            {images.length > 1 && (
              <>
                {/* Prev/Next buttons */}
                {currentSlide > 0 && (
                  <button
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                    aria-label="Previous slide"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                )}
                {currentSlide < images.length - 1 && (
                  <button
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                    aria-label="Next slide"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                )}
                {/* Slide counter */}
                <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                  {currentSlide + 1} / {images.length}
                </div>
                {/* Dot indicators */}
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        i === currentSlide
                          ? 'bg-white'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="mx-4 mb-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center dark:border-zinc-600 dark:bg-zinc-700/50">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              No images attached yet
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Browse Components tab to create visuals
            </p>
            {hasText && (
              <button
                onClick={handleGenerateVisual}
                className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500"
              >
                Generate visual for this post
              </button>
            )}
          </div>
        )}

        {/* Engagement mockup */}
        {hasText && hasImages && (
          <div className="border-t border-zinc-200 px-4 py-1.5 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              42 reactions &middot; 3 comments
            </p>
          </div>
        )}

        {/* Action bar */}
        <div className="flex border-t border-zinc-200 dark:border-zinc-700">
          {['Like', 'Comment', 'Repost', 'Send'].map((action) => (
            <div
              key={action}
              className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              <ActionIcon name={action} />
              {action}
            </div>
          ))}
        </div>
      </div>

      {/* Character count */}
      {hasText && (
        <div className="mt-2 flex justify-end text-xs">
          <span
            className={
              charCount > charLimit
                ? 'text-red-400'
                : 'text-zinc-400 dark:text-zinc-500'
            }
          >
            {charCount.toLocaleString()} / {charLimit.toLocaleString()} chars
          </span>
        </div>
      )}
    </div>
  )
}

function ActionIcon({ name }: { name: string }) {
  const iconClass = 'h-4 w-4'
  switch (name) {
    case 'Like':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
      )
    case 'Comment':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    case 'Repost':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    case 'Send':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      )
    default:
      return null
  }
}
