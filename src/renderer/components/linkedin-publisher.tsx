import { useCallback, useEffect, useRef, useState } from 'react'

import type { DirEntry } from '@/shared/types'

interface SlideFile {
  name: string
  html: string
}

interface LinkedInPublisherProps {
  isOpen: boolean
  onClose: () => void
  contentDir: string
}

const SLIDE_W = 1080
const SLIDE_H = 1350
const THUMB_W = 120
const THUMB_H = Math.round(SLIDE_H * (THUMB_W / SLIDE_W))
const THUMB_SCALE = THUMB_W / SLIDE_W

function SlideThumb({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
  }, [html])

  return (
    <div
      className="overflow-hidden rounded border border-zinc-700 bg-zinc-800 shrink-0"
      style={{ width: THUMB_W, height: THUMB_H }}
    >
      <div
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          transform: `scale(${THUMB_SCALE})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          style={{ width: SLIDE_W, height: SLIDE_H, border: 0, background: 'white', display: 'block' }}
          title="Slide preview"
        />
      </div>
    </div>
  )
}

export function LinkedInPublisher({
  isOpen,
  onClose,
  contentDir,
}: LinkedInPublisherProps) {
  const [postText, setPostText] = useState('')
  const [slides, setSlides] = useState<SlideFile[]>([])
  const [loadingContent, setLoadingContent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [done, setDone] = useState<'scheduled' | 'published' | null>(null)

  const metadataPath = `${contentDir}/metadata.json`

  // Load content when dialog opens
  useEffect(() => {
    if (!isOpen || !contentDir) return
    setLoadingContent(true)
    setCopied(false)
    setDone(null)
    setScheduleDate('')
    setScheduleTime('09:00')
    setSlides([])

    const load = async () => {
      const api = window.electronAPI?.content
      if (!api) return

      try {
        const text = await api.read(`${contentDir}/post-text.md`)
        setPostText(text.trim())
      } catch {
        setPostText('')
      }

      try {
        const entries: DirEntry[] = await api.listDir(contentDir)
        const slideEntries = entries
          .filter((e) => !e.isDirectory && /^slide-\d+.*\.html$/i.test(e.name))
          .sort((a, b) => a.name.localeCompare(b.name))

        const slideData: SlideFile[] = []
        for (const entry of slideEntries) {
          try {
            const html = await api.read(entry.path)
            slideData.push({ name: entry.name, html })
          } catch {
            // skip unreadable slides
          }
        }
        setSlides(slideData)
      } catch {
        setSlides([])
      }

      setLoadingContent(false)
    }

    load()
  }, [isOpen, contentDir])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const copyText = useCallback(async () => {
    if (!postText) return
    await navigator.clipboard.writeText(postText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [postText])

  const openLinkedIn = useCallback(() => {
    window.electronAPI?.shell.openExternal('https://www.linkedin.com/feed/')
  }, [])

  const openInFinder = useCallback(() => {
    window.electronAPI?.shell.showItemInFolder(contentDir)
  }, [contentDir])

  const logScheduled = useCallback(async () => {
    if (!scheduleDate) return
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
    await window.electronAPI?.pipeline.updateMetadata(metadataPath, { scheduledAt })
    await window.electronAPI?.pipeline.updateStage(metadataPath, 'scheduled')
    setDone('scheduled')
  }, [metadataPath, scheduleDate, scheduleTime])

  const markPublished = useCallback(async () => {
    await window.electronAPI?.pipeline.updateStage(metadataPath, 'published')
    setDone('published')
  }, [metadataPath])

  if (!isOpen) return null

  const charCount = postText.length
  const hasContent = charCount > 0

  const scheduleDateLabel =
    scheduleDate && scheduleTime
      ? new Date(`${scheduleDate}T${scheduleTime}:00`).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-700 bg-zinc-900 px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Share on LinkedIn</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {loadingContent ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-xs text-zinc-500">Loading content...</p>
          </div>
        ) : done ? (
          <div className="px-5 py-10 text-center">
            {done === 'published' ? (
              <>
                <p className="text-sm font-medium text-green-400">Marked as published</p>
                <p className="mt-1 text-xs text-zinc-500">Stage updated in your pipeline.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-blue-400">Scheduled for {scheduleDateLabel}</p>
                <p className="mt-1 text-xs text-zinc-500">Logged in your pipeline. Post manually on LinkedIn at that time.</p>
              </>
            )}
            <button
              onClick={onClose}
              className="mt-5 rounded bg-zinc-700 px-4 py-1.5 text-xs text-white hover:bg-zinc-600"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-5">
            {/* Post text */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">Post Text</label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${charCount > 3000 ? 'text-red-400' : 'text-zinc-500'}`}>
                    {charCount.toLocaleString()} / 3,000
                  </span>
                  <button
                    onClick={copyText}
                    disabled={!hasContent}
                    className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-200 hover:bg-zinc-600 disabled:opacity-40"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              {hasContent ? (
                <pre className="max-h-36 overflow-y-auto rounded border border-zinc-700 bg-zinc-800 p-3 text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap font-sans">
                  {postText}
                </pre>
              ) : (
                <div className="rounded border border-zinc-700 bg-zinc-800 p-3 text-xs text-zinc-500">
                  No post-text.md found in this content folder.
                </div>
              )}
              {charCount > 3000 && (
                <p className="mt-1 text-[11px] text-red-400">
                  Exceeds 3,000 character limit — LinkedIn will truncate.
                </p>
              )}
            </div>

            {/* Slide thumbnails */}
            {slides.length > 0 && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400">
                    Images ({slides.length} slide{slides.length !== 1 ? 's' : ''})
                  </label>
                  <button
                    onClick={openInFinder}
                    className="text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Open folder ↗
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {slides.map((slide) => (
                    <div key={slide.name} className="shrink-0 text-center">
                      <SlideThumb html={slide.html} />
                      <p className="mt-1 text-[10px] text-zinc-500 truncate" style={{ maxWidth: THUMB_W }}>
                        {slide.name.replace(/\.html$/i, '')}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Use the Capture toolbar to export as PNG → upload to LinkedIn.
                </p>
              </div>
            )}

            {/* Schedule */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Schedule for later (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
                />
              </div>
              {scheduleDateLabel && (
                <p className="mt-1 text-[11px] text-zinc-400">
                  Will be logged as scheduled for {scheduleDateLabel}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!done && !loadingContent && (
          <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-zinc-700 bg-zinc-900 px-5 py-3">
            <button
              onClick={onClose}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={openLinkedIn}
                className="rounded border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Open LinkedIn ↗
              </button>
              {scheduleDate ? (
                <button
                  onClick={logScheduled}
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500"
                >
                  Log as Scheduled
                </button>
              ) : (
                <button
                  onClick={markPublished}
                  className="rounded bg-green-700 px-3 py-1.5 text-xs text-white hover:bg-green-600"
                >
                  Mark as Published
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
