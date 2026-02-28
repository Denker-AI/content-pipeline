import { useCallback, useEffect, useRef, useState } from 'react'

import type { ContentType } from '@/shared/types'

import { FrameSelector } from './frame-selector'
import { FRAME_PRESETS } from './size-presets'

interface VersionEntry {
  label: string
  fileName: string
  filePath: string
  isDemo: boolean
}

interface ComponentPreviewProps {
  componentName: string
  componentPath: string
  htmlContent: string | null
  error: string | null
  onBack: () => void
  activeContentDir?: string
  activeContentType?: ContentType
  activeTabId?: string | null
  demoMode?: boolean
  onToggleDemoMode?: () => void
  onRegenerateDemo?: () => void
  onVersionSelect?: (html: string) => void
  framePresetIdx?: number
  onFramePresetChange?: (idx: number) => void
}

export function ComponentPreview({
  componentName,
  componentPath,
  htmlContent,
  error,
  onBack,
  activeContentDir,
  activeContentType,
  activeTabId,
  demoMode,
  onToggleDemoMode,
  onRegenerateDemo,
  onVersionSelect,
  framePresetIdx: externalFramePresetIdx,
  onFramePresetChange
}: ComponentPreviewProps) {
  const [attachState, setAttachState] = useState<'idle' | 'attaching' | 'done'>(
    'idle'
  )
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [activeVersion, setActiveVersion] = useState<string | null>(null)
  const [internalFramePresetIdx, setInternalFramePresetIdx] = useState(1) // default: LinkedIn 4:5
  const framePresetIdx = externalFramePresetIdx ?? internalFramePresetIdx
  const setFramePresetIdx = onFramePresetChange ?? setInternalFramePresetIdx
  const [showFrameSelector, setShowFrameSelector] = useState(false)
  const [pendingCaptureMode, setPendingCaptureMode] = useState<'image' | 'video' | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeContentHeight, setIframeContentHeight] = useState(0)

  // Canvas width for frame selector — wider than presets so the frame can move horizontally
  const CANVAS_WIDTH = 1920
  // Zoom: render iframe at CONTENT_WIDTH, scale with user-controllable zoom
  const CONTENT_WIDTH = showFrameSelector ? CANVAS_WIDTH : 1080
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(1)
  const [zoom, setZoom] = useState<number | null>(null) // null = fit-to-width

  // Measure container to compute fit scale
  useEffect(() => {
    const el = wrapperRef.current
    if (!el || !htmlContent) return
    const obs = new ResizeObserver(([entry]) => {
      setFitScale(entry.contentRect.width / CONTENT_WIDTH)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [htmlContent, CONTENT_WIDTH])

  // Reset zoom when component changes
  useEffect(() => {
    setZoom(null)
  }, [componentName])

  const activeScale = zoom ?? fitScale
  const zoomPercent = Math.round(activeScale * 100)

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(2, (prev ?? fitScale) + 0.15))
  }, [fitScale])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.1, (prev ?? fitScale) - 0.15))
  }, [fitScale])

  const handleZoomFit = useCallback(() => {
    setZoom(null)
  }, [])

  // Discover versions from activeContentDir
  const loadVersions = useCallback(async () => {
    if (!activeContentDir || !componentName) {
      setVersions([])
      return
    }
    try {
      const entries = await window.electronAPI?.content.listDir(activeContentDir)
      if (!entries) return
      const prefix = componentName.toLowerCase()
      const matches = entries
        .filter(e => {
          if (e.isDirectory) return false
          const lower = e.name.toLowerCase()
          return (
            lower.startsWith(`${prefix}-demo`) ||
            lower.startsWith(`${prefix}-preview`)
          ) && lower.endsWith('.html')
        })
        .map(e => {
          const match = e.name.match(/-(demo|preview)(?:-(\d+))?\.html$/i)
          const isDemo = (match?.[1] ?? '').toLowerCase() === 'demo'
          const num = match?.[2] ? parseInt(match[2], 10) : 1
          return {
            label: `v${num}${isDemo ? '' : ' static'}`,
            fileName: e.name,
            filePath: e.path,
            isDemo,
            num
          }
        })
        .sort((a, b) => {
          // Group by type (demo first), then by version number desc
          if (a.isDemo !== b.isDemo) return a.isDemo ? -1 : 1
          return b.num - a.num
        })
      setVersions(matches)
    } catch {
      setVersions([])
    }
  }, [activeContentDir, componentName])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  // Refresh versions on file changes
  useEffect(() => {
    const api = window.electronAPI?.files
    if (!api) return
    return api.onFileChange(event => {
      if (event.type === 'created' || event.type === 'deleted') {
        loadVersions()
      }
    })
  }, [loadVersions])

  // Auto-select active version when htmlContent or versions change
  useEffect(() => {
    if (versions.length > 0 && !activeVersion) {
      setActiveVersion(versions[0].fileName)
    }
  }, [versions, activeVersion])

  // Reset active version when component changes
  useEffect(() => {
    setActiveVersion(null)
  }, [componentName])

  const handleVersionChange = useCallback(
    async (fileName: string) => {
      const version = versions.find(v => v.fileName === fileName)
      if (!version || !onVersionSelect) return
      setActiveVersion(fileName)
      try {
        const html = await window.electronAPI?.content.read(version.filePath)
        if (html) {
          onVersionSelect(html)
        }
      } catch {
        // ignore read errors
      }
    },
    [versions, onVersionSelect]
  )

  // Measure iframe content height after load
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentDocument
      if (doc) {
        // Wait a tick for content to render
        requestAnimationFrame(() => {
          const h = doc.documentElement.scrollHeight
          if (h > 0) setIframeContentHeight(h)
        })
      }
    } catch {
      // cross-origin — ignore
    }
  }, [])

  // Step 1: user clicks Attach/Record → show frame selector overlay
  const handleStartCapture = useCallback((mode: 'image' | 'video') => {
    setPendingCaptureMode(mode)
    setShowFrameSelector(true)
  }, [])

  // Step 2: user confirms frame position → actually capture
  const handleFrameConfirm = useCallback(async (clipX: number, clipY: number, confirmedPresetIdx: number) => {
    setShowFrameSelector(false)
    if (!htmlContent || !activeContentDir || !pendingCaptureMode) return

    const api = window.electronAPI
    if (!api) return

    const frame = FRAME_PRESETS[confirmedPresetIdx]
    setFramePresetIdx(confirmedPresetIdx)
    const clip = { x: clipX, y: clipY, width: frame.width, height: frame.height }

    try {
      if (pendingCaptureMode === 'video') {
        setAttachState('attaching')
        const result = await api.capture.video({
          html: htmlContent,
          width: CANVAS_WIDTH,
          height: iframeContentHeight || CANVAS_WIDTH,
          contentDir: activeContentDir,
          componentName,
          clip
          // duration omitted → auto-detect from CSS animations
        })

        if (result) {
          const metadataPath = `${activeContentDir}/metadata.json`
          const existing = await api.pipeline.readMetadata(metadataPath)
          const newAsset = {
            id: Date.now().toString(36),
            filename: result.path.split('/').pop() ?? '',
            sourceComponentName: componentName,
            sourceComponent: componentPath,
            width: result.width,
            height: result.height,
            createdAt: new Date().toISOString(),
            order: (existing?.assets?.length ?? 0)
          }
          await api.pipeline.updateMetadata(metadataPath, {
            assets: [...(existing?.assets ?? []), newAsset]
          })
        }
      } else {
        setAttachState('attaching')
        const result = await api.capture.screenshot({
          html: htmlContent,
          width: CANVAS_WIDTH,
          height: iframeContentHeight || CANVAS_WIDTH,
          presetName: frame.name,
          contentDir: activeContentDir,
          contentType: 'linkedin',
          clip
        })

        if (result) {
          const metadataPath = `${activeContentDir}/metadata.json`
          const existing = await api.pipeline.readMetadata(metadataPath)
          const newAsset = {
            id: Date.now().toString(36),
            filename: result.path.split('/').pop() ?? '',
            sourceComponentName: componentName,
            sourceComponent: componentPath,
            width: result.width,
            height: result.height,
            createdAt: new Date().toISOString(),
            order: existing?.assets?.length ?? 0
          }
          await api.pipeline.updateMetadata(metadataPath, {
            assets: [...(existing?.assets ?? []), newAsset]
          })
        }
      }

      setAttachState('done')
      setTimeout(() => setAttachState('idle'), 2000)
    } catch {
      setAttachState('idle')
    }
    setPendingCaptureMode(null)
  }, [htmlContent, activeContentDir, pendingCaptureMode, setFramePresetIdx, componentName, componentPath, iframeContentHeight])

  const handleFrameCancel = useCallback(() => {
    setShowFrameSelector(false)
    setPendingCaptureMode(null)
  }, [])

  const isGenerating = error === 'generating'
  const isReady = error === 'ready'
  const isFailed = error === 'failed'
  const showGenerate = (isReady || isFailed) && !!activeTabId
  const showAttach =
    activeContentType === 'linkedin' && activeContentDir && htmlContent

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5">
        <button
          onClick={onBack}
          className="rounded px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          Back
        </button>
        <span className="text-xs font-medium text-zinc-900 dark:text-white truncate max-w-[120px]">
          {componentName}
        </span>
        {onToggleDemoMode && (
          <button
            onClick={onToggleDemoMode}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              demoMode
                ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title={demoMode ? 'Switch to static preview' : 'Switch to animated demo'}
          >
            {demoMode ? 'Demo' : 'Static'}
          </button>
        )}
        {/* Version selector */}
        {versions.length > 1 && htmlContent && (
          <select
            value={activeVersion ?? ''}
            onChange={e => handleVersionChange(e.target.value)}
            className="rounded bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-300 outline-none cursor-pointer"
          >
            {versions.map(v => (
              <option key={v.fileName} value={v.fileName}>
                {v.label}
              </option>
            ))}
          </select>
        )}
        {/* Zoom controls */}
        {htmlContent && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleZoomOut}
              className="rounded px-1.5 py-0.5 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              title="Zoom out"
            >
              −
            </button>
            <button
              onClick={handleZoomFit}
              className="rounded px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              title="Fit to width"
            >
              {zoomPercent}%
            </button>
            <button
              onClick={handleZoomIn}
              className="rounded px-1.5 py-0.5 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              title="Zoom in"
            >
              +
            </button>
          </div>
        )}
        {/* Frame preset selector (only shown when frame overlay is NOT open — it has its own) */}
        {htmlContent && showAttach && !showFrameSelector && (
          <select
            value={framePresetIdx}
            onChange={e => setFramePresetIdx(Number(e.target.value))}
            className="rounded bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-300 outline-none cursor-pointer"
            title="Capture frame size"
          >
            {FRAME_PRESETS.map((fp, i) => (
              <option key={fp.name} value={i}>
                {fp.name} ({fp.label})
              </option>
            ))}
          </select>
        )}
        <span className="flex-1 min-w-[8px]" />
        {isGenerating && !htmlContent && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Generating with Claude...
          </span>
        )}
        {htmlContent && onRegenerateDemo && (
          <button
            onClick={onRegenerateDemo}
            className="shrink-0 rounded px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200"
            title="Regenerate preview"
          >
            Regenerate
          </button>
        )}
        {showAttach && (
          <button
            onClick={() => handleStartCapture(demoMode ? 'video' : 'image')}
            disabled={attachState !== 'idle'}
            className={`shrink-0 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              attachState === 'done'
                ? 'bg-green-600 text-white'
                : attachState === 'attaching'
                  ? 'bg-zinc-600 text-zinc-300'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {attachState === 'done'
              ? 'Attached!'
              : attachState === 'attaching'
                ? (demoMode ? 'Recording...' : 'Capturing...')
                : (demoMode ? 'Record Video' : 'Attach Image')}
          </button>
        )}
      </div>

      {/* Preview */}
      <div ref={wrapperRef} className="relative min-h-0 flex-1 overflow-auto bg-white dark:bg-zinc-900">
        {/* Frame selector overlay */}
        {showFrameSelector && htmlContent && (
          <FrameSelector
            initialPresetIdx={framePresetIdx}
            contentWidth={CANVAS_WIDTH}
            contentHeight={iframeContentHeight || CANVAS_WIDTH}
            scale={activeScale}
            onConfirm={handleFrameConfirm}
            onCancel={handleFrameCancel}
          />
        )}
        {showGenerate ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-xs">
              {isFailed
                ? 'Could not render component.'
                : `Ready to generate ${demoMode ? 'an animated demo' : 'a static preview'}.`}
            </p>
            <select
              value={framePresetIdx}
              onChange={e => setFramePresetIdx(Number(e.target.value))}
              className="rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 outline-none cursor-pointer"
              title="Frame size for generation"
            >
              {FRAME_PRESETS.map((fp, i) => (
                <option key={fp.name} value={i}>
                  {fp.name} ({fp.width}x{fp.height})
                </option>
              ))}
            </select>
            <button
              onClick={onRegenerateDemo}
              className={`rounded px-3 py-1.5 text-xs text-white ${
                demoMode
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {demoMode ? 'Generate Demo' : 'Generate Preview'}
            </button>
          </div>
        ) : isGenerating && !htmlContent ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Generating preview...
            </p>
          </div>
        ) : htmlContent ? (
          <div
            style={{
              width: CONTENT_WIDTH,
              height: showFrameSelector && iframeContentHeight
                ? iframeContentHeight
                : wrapperRef.current ? wrapperRef.current.clientHeight / activeScale : '100%',
              transform: `scale(${activeScale})`,
              transformOrigin: 'top left'
            }}
          >
            <iframe
              ref={iframeRef}
              onLoad={handleIframeLoad}
              srcDoc={htmlContent}
              style={{ width: CONTENT_WIDTH, height: '100%', border: 0, background: 'white' }}
              title={`Preview: ${componentName}`}
              sandbox="allow-scripts"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Loading component...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
