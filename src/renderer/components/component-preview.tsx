interface ComponentPreviewProps {
  componentName: string
  componentPath: string
  htmlContent: string | null
  error: string | null
  onBack: () => void
}

export function ComponentPreview({
  componentName,
  componentPath,
  htmlContent,
  error,
  onBack,
}: ComponentPreviewProps) {
  const handleGenerateWithClaude = () => {
    const prompt = `Create a self-contained HTML preview for ${componentName} at ${componentPath} with realistic mock data. Use only vanilla HTML, CSS, and JS (no external dependencies). Output the complete HTML between these exact marker lines on their own lines: ===HTML_PREVIEW_START=== and ===HTML_PREVIEW_END===`
    window.electronAPI?.terminal.sendInput(prompt + '\n')
  }

  const isGenerating = error === 'generating'
  const isFailed = error === 'failed'

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
        <span className="text-xs font-medium text-zinc-900 dark:text-white">{componentName}</span>
        <span className="flex-1" />
        {isGenerating && !htmlContent && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Generating with Claude...</span>
        )}
        {!htmlContent && !error && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Rendering...</span>
        )}
      </div>

      {/* Preview */}
      <div className="relative min-h-0 flex-1">
        {isFailed ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900 p-6">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-xs">
              Could not render component. Try generating a preview with Claude.
            </p>
            <button
              onClick={handleGenerateWithClaude}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500"
            >
              Generate preview with Claude
            </button>
          </div>
        ) : !htmlContent ? (
          <div className="flex h-full items-center justify-center bg-white dark:bg-zinc-900">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {isGenerating ? 'Generating preview...' : 'Rendering...'}
            </p>
          </div>
        ) : (
          <iframe
            srcDoc={htmlContent}
            className="h-full w-full border-0 bg-white"
            title={`Preview: ${componentName}`}
            sandbox="allow-scripts"
          />
        )}
      </div>
    </div>
  )
}
