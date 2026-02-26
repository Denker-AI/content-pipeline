import { useCallback, useEffect, useRef, useState } from 'react'

import type { AnnotationComment } from '@/shared/types'

import { CommentPin } from './comment-pin'

interface CommentOverlayProps {
  comments: AnnotationComment[]
  annotating: boolean
  onAddComment: (x: number, y: number, text: string, nearText: string) => void
  selectedCommentId: string | null
  onSelectComment: (id: string | null) => void
  children: React.ReactNode
}

export function CommentOverlay({
  comments,
  annotating,
  onAddComment,
  selectedCommentId,
  onSelectComment,
  children,
}: CommentOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [pendingPin, setPendingPin] = useState<{
    x: number
    y: number
    nearText: string
  } | null>(null)
  const [inputText, setInputText] = useState('')

  // Focus the input when a pending pin is created
  useEffect(() => {
    if (pendingPin && inputRef.current) {
      inputRef.current.focus()
    }
  }, [pendingPin])

  const extractNearText = useCallback(
    (clientX: number, clientY: number): string => {
      const container = overlayRef.current
      if (!container) return ''

      const iframe = container.querySelector('iframe')
      if (!iframe?.contentDocument) return ''

      const iframeRect = iframe.getBoundingClientRect()
      const iframeX = clientX - iframeRect.left
      const iframeY = clientY - iframeRect.top

      try {
        const el = iframe.contentDocument.elementFromPoint(iframeX, iframeY)
        if (el) {
          const text = (el.textContent || '').trim()
          return text.slice(0, 60)
        }
      } catch {
        // Cross-origin or other error — ignore
      }

      return ''
    },
    [],
  )

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (!annotating) return

      // Use the scrollable container to compute positions relative to the
      // full scrollable content — not just the visible viewport.
      const scrollEl = scrollRef.current
      if (!scrollEl) return

      const rect = scrollEl.getBoundingClientRect()
      const scrollWidth = scrollEl.scrollWidth
      const scrollHeight = scrollEl.scrollHeight

      // Position = (viewport offset + scroll offset) / full scrollable size
      const x = ((e.clientX - rect.left + scrollEl.scrollLeft) / scrollWidth) * 100
      const y = ((e.clientY - rect.top + scrollEl.scrollTop) / scrollHeight) * 100
      const nearText = extractNearText(e.clientX, e.clientY)

      setPendingPin({ x, y, nearText })
      setInputText('')
      onSelectComment(null)
    },
    [annotating, extractNearText, onSelectComment],
  )

  const handleSubmit = useCallback(() => {
    if (!pendingPin || !inputText.trim()) return
    onAddComment(pendingPin.x, pendingPin.y, inputText.trim(), pendingPin.nearText)
    setPendingPin(null)
    setInputText('')
  }, [pendingPin, inputText, onAddComment])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === 'Escape') {
        setPendingPin(null)
        setInputText('')
      }
    },
    [handleSubmit],
  )

  const activeComments = comments.filter((c) => !c.resolved)
  const nextPinNumber = activeComments.length + 1

  return (
    <div ref={overlayRef} className="relative h-full w-full overflow-auto thin-scrollbar" >
      {/* Inner container sized to scrollable content — pins live here
          so they scroll with the content instead of staying fixed. */}
      <div ref={scrollRef} className="relative min-h-full">
        {children}

        {/* Clickable overlay when annotating */}
        {annotating && (
          <div
            className="absolute inset-0 z-10 cursor-crosshair"
            onClick={handleOverlayClick}
          />
        )}

        {/* Existing pins — positioned relative to full scrollable content */}
        {activeComments.map((comment) => (
          <CommentPin
            key={comment.id}
            number={comment.pinNumber}
            x={comment.x}
            y={comment.y}
            active={comment.id === selectedCommentId}
            onClick={() => onSelectComment(comment.id)}
          />
        ))}

        {/* Pending pin with popover */}
        {pendingPin && (
          <>
            <CommentPin
              number={nextPinNumber}
              x={pendingPin.x}
              y={pendingPin.y}
              active
            />
            <div
              className="absolute z-30 w-64 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-3 shadow-xl"
              style={{
                left: `${Math.min(pendingPin.x, 70)}%`,
                top: `${pendingPin.y + 3}%`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {pendingPin.nearText && (
                <p className="mb-2 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  Near: &quot;{pendingPin.nearText}&quot;
                </p>
              )}
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your comment..."
                className="w-full resize-none rounded border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                rows={2}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">Enter to add</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setPendingPin(null)
                      setInputText('')
                    }}
                    className="rounded px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!inputText.trim()}
                    className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
