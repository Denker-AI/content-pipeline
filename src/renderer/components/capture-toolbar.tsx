import { useCallback, useState } from 'react'

import type { ContentType } from '@/shared/types'

import { SIZE_PRESETS } from './size-presets'

interface CaptureToolbarProps {
  contentUrl?: string
  htmlContent?: string
  contentDir?: string
  contentType?: ContentType
  activeTabId?: string | null
  componentName?: string
}

interface CaptureStatus {
  type: 'success' | 'error' | 'capturing'
  message: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function CaptureToolbar({
  contentUrl,
  htmlContent,
  contentDir,
  contentType,
  activeTabId,
  componentName
}: CaptureToolbarProps) {
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [customWidth, setCustomWidth] = useState(1080)
  const [customHeight, setCustomHeight] = useState(1080)
  const [videoDuration, setVideoDuration] = useState(5)
  const [showCustom, setShowCustom] = useState(false)
  const [status, setStatus] = useState<CaptureStatus | null>(null)
  const [lastCapturePath, setLastCapturePath] = useState<string | null>(null)

  const getSize = useCallback(() => {
    if (showCustom) {
      return { width: customWidth, height: customHeight, name: 'Custom' }
    }
    const preset = SIZE_PRESETS[selectedPreset]
    return { width: preset.width, height: preset.height, name: preset.name }
  }, [showCustom, customWidth, customHeight, selectedPreset])

  const canCapture = !!(contentUrl || htmlContent) && !!contentDir

  const handleScreenshot = useCallback(async () => {
    if (!canCapture) return
    const { width, height, name } = getSize()

    setStatus({ type: 'capturing', message: 'Capturing screenshot...' })
    setLastCapturePath(null)

    try {
      const result = await window.electronAPI?.capture.screenshot({
        url: contentUrl,
        html: htmlContent,
        width,
        height,
        presetName: name,
        contentDir: contentDir!,
        contentType
      })

      if (result) {
        setLastCapturePath(result.path)
        setStatus({
          type: 'success',
          message: `Saved: ${result.path} (${formatSize(result.size)})`
        })
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      })
    }
  }, [canCapture, getSize, contentUrl, htmlContent, contentDir, contentType])

  const handleVideo = useCallback(async () => {
    if (!canCapture) return
    const { width, height } = getSize()

    setStatus({
      type: 'capturing',
      message: `Recording ${videoDuration}s video...`
    })
    setLastCapturePath(null)

    try {
      const result = await window.electronAPI?.capture.video({
        url: contentUrl,
        html: htmlContent,
        width,
        height,
        duration: videoDuration,
        contentDir: contentDir!
      })

      if (result) {
        setLastCapturePath(result.path)
        setStatus({
          type: 'success',
          message: `Saved: ${result.path} (${formatSize(result.size)})`
        })
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      })
    }
  }, [canCapture, getSize, videoDuration, contentUrl, htmlContent, contentDir])

  const handleCreatePost = useCallback(() => {
    if (!lastCapturePath || !activeTabId) return
    const name = componentName || 'component'
    const prompt = `I just captured a demo of the "${name}" component. The capture is saved at: ${lastCapturePath}\n\nCreate a LinkedIn post that showcases this component as a product demo. The post should highlight the key interaction shown in the demo, explain the value to developers/users, and include a call-to-action. Write it in a conversational, authentic tone.\n\nOutput the post text between these markers: ===POST_TEXT_START=== and ===POST_TEXT_END===`
    window.electronAPI?.terminal.sendInput(activeTabId, prompt + '\n')
  }, [lastCapturePath, activeTabId, componentName])

  const showCreatePost = !!(lastCapturePath && activeTabId && componentName)

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-2">
      {/* Preset selector + capture buttons */}
      <div className="flex items-center gap-2">
        {/* Size preset dropdown */}
        <select
          value={showCustom ? 'custom' : selectedPreset}
          onChange={e => {
            if (e.target.value === 'custom') {
              setShowCustom(true)
            } else {
              setShowCustom(false)
              setSelectedPreset(Number(e.target.value))
            }
          }}
          className="rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200"
        >
          {SIZE_PRESETS.map((preset, i) => (
            <option key={preset.name} value={i}>
              {preset.name} ({preset.width}x{preset.height})
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>

        {/* Custom dimensions */}
        {showCustom && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={customWidth}
              onChange={e => setCustomWidth(Number(e.target.value))}
              className="w-16 rounded bg-zinc-200 dark:bg-zinc-700 px-1 py-1 text-xs text-zinc-700 dark:text-zinc-200"
              min={100}
              max={3840}
            />
            <span className="text-xs text-zinc-400 dark:text-zinc-500">x</span>
            <input
              type="number"
              value={customHeight}
              onChange={e => setCustomHeight(Number(e.target.value))}
              className="w-16 rounded bg-zinc-200 dark:bg-zinc-700 px-1 py-1 text-xs text-zinc-700 dark:text-zinc-200"
              min={100}
              max={3840}
            />
          </div>
        )}

        {/* Capture PNG button */}
        <button
          onClick={handleScreenshot}
          disabled={!canCapture || status?.type === 'capturing'}
          className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
          title="Capture screenshot at selected dimensions"
        >
          Capture PNG
        </button>

        {/* Video duration + record button */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={videoDuration}
            onChange={e => setVideoDuration(Number(e.target.value))}
            className="w-12 rounded bg-zinc-200 dark:bg-zinc-700 px-1 py-1 text-xs text-zinc-700 dark:text-zinc-200"
            min={1}
            max={60}
          />
          <span className="text-xs text-zinc-400 dark:text-zinc-500">s</span>
        </div>

        <button
          onClick={handleVideo}
          disabled={!canCapture || status?.type === 'capturing'}
          className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500 disabled:opacity-50"
          title="Record video at selected dimensions"
        >
          Record Video
        </button>
      </div>

      {/* Status bar + Create Post */}
      {status && (
        <div className="flex items-center gap-2">
          <div
            className={`min-w-0 flex-1 truncate text-xs ${
              status.type === 'success'
                ? 'text-green-400'
                : status.type === 'error'
                  ? 'text-red-400'
                  : 'text-zinc-400'
            }`}
          >
            {status.message}
          </div>
          {showCreatePost && status.type === 'success' && (
            <button
              onClick={handleCreatePost}
              className="shrink-0 rounded bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-500"
              title="Send a content-generation prompt to Claude using this capture"
            >
              Create Post from Demo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
