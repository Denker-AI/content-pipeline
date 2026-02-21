import { useCallback, useEffect, useRef, useState } from 'react'

interface ComponentPreviewProps {
  componentName: string
  appUrl: string
  onBack: () => void
}

export function ComponentPreview({
  componentName,
  appUrl,
  onBack,
}: ComponentPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const previewUrl = `${appUrl}/content-preview`

  const reload = useCallback(() => {
    setLoading(true)
    setError(false)
    if (iframeRef.current) {
      iframeRef.current.src = previewUrl
    }
  }, [previewUrl])

  useEffect(() => {
    // Auto-reload every 3s while loading (waiting for Claude to write the page)
    if (!loading) return
    const timer = setInterval(reload, 3000)
    return () => clearInterval(timer)
  }, [loading, reload])

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-700 bg-zinc-800 px-3 py-2">
        <button
          onClick={onBack}
          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
        >
          Back
        </button>
        <span className="text-xs font-medium text-white">{componentName}</span>
        <span className="flex-1" />
        <span className="truncate text-xs text-zinc-500">{previewUrl}</span>
        <button
          onClick={reload}
          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
        >
          Reload
        </button>
      </div>

      {/* Preview iframe */}
      <div className="relative min-h-0 flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/80">
            <p className="text-sm text-zinc-400">
              Waiting for preview page...
            </p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/80">
            <div className="text-center">
              <p className="text-sm text-zinc-400">
                Preview not ready yet. Claude is generating it.
              </p>
              <button
                onClick={reload}
                className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className="h-full w-full border-0 bg-white"
          title={`Preview: ${componentName}`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            setError(true)
          }}
        />
      </div>
    </div>
  )
}
