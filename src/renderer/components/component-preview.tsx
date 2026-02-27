import { useCallback, useState } from 'react'

import type { ContentType } from '@/shared/types'

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
  onRegenerateDemo
}: ComponentPreviewProps) {
  const [attachState, setAttachState] = useState<'idle' | 'attaching' | 'done'>(
    'idle'
  )

  const handleAttachToPost = useCallback(async () => {
    if (!htmlContent || !activeContentDir) return
    setAttachState('attaching')

    try {
      const result = await window.electronAPI?.capture.screenshot({
        html: htmlContent,
        width: 1080,
        height: 1350,
        presetName: 'LinkedIn Carousel',
        contentDir: activeContentDir,
        contentType: 'linkedin'
      })

      if (result) {
        const metadataPath = `${activeContentDir}/metadata.json`
        const existing =
          await window.electronAPI?.pipeline.readMetadata(metadataPath)
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
        await window.electronAPI?.pipeline.updateMetadata(metadataPath, {
          assets: [...(existing?.assets ?? []), newAsset]
        })
      }

      setAttachState('done')
      setTimeout(() => setAttachState('idle'), 2000)
    } catch {
      setAttachState('idle')
    }
  }, [htmlContent, activeContentDir, componentName, componentPath])

  const isGenerating = error === 'generating'
  const isReady = error === 'ready'
  const isFailed = error === 'failed'
  const showGenerate = (isReady || isFailed) && !!activeTabId
  const showAttach =
    activeContentType === 'linkedin' && activeContentDir && htmlContent

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-2">
        <button
          onClick={onBack}
          className="rounded px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          Back
        </button>
        <span className="text-xs font-medium text-zinc-900 dark:text-white">
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
        <span className="flex-1" />
        {isGenerating && !htmlContent && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Generating with Claude...
          </span>
        )}
        {htmlContent && onRegenerateDemo && (
          <button
            onClick={onRegenerateDemo}
            className="rounded px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200"
            title="Regenerate preview"
          >
            Regenerate
          </button>
        )}
        {showAttach && (
          <button
            onClick={handleAttachToPost}
            disabled={attachState !== 'idle'}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
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
                ? 'Attaching...'
                : 'Attach to Post'}
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="relative min-h-0 flex-1">
        {showGenerate ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900 p-6">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-xs">
              {isFailed
                ? 'Could not render component.'
                : `Ready to generate ${demoMode ? 'an animated demo' : 'a static preview'}.`}
            </p>
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
          <div className="flex h-full items-center justify-center bg-white dark:bg-zinc-900">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Generating preview...
            </p>
          </div>
        ) : htmlContent ? (
          <iframe
            srcDoc={htmlContent}
            className="h-full w-full border-0 bg-white"
            title={`Preview: ${componentName}`}
            sandbox="allow-scripts"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-white dark:bg-zinc-900">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Loading component...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
