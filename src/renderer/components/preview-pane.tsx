import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  ComponentAnalysis,
  ComponentRenderResult,
  ContentType,
  ContentVersion,
  DetectedComponent,
  RenderMode
} from '@/shared/types'

import { useComments } from '../hooks/use-comments'
import { useGitStatus } from '../hooks/use-git-status'

import { BlogPublisher } from './blog-publisher'
import { CaptureToolbar } from './capture-toolbar'
import { CommentOverlay } from './comment-overlay'
import { CommentSidebar } from './comment-sidebar'
import { ComponentBrowser } from './component-browser'
import { ComponentPreview } from './component-preview'
import { ContentRenderer } from './content-renderer'
import { FileSidebar } from './file-sidebar'
import { CodeIcon, FileIcon, FolderOpenIcon } from './icons'
import { LinkedInPublisher } from './linkedin-publisher'
import { ResendSender } from './resend-sender'
import { SeoPanel } from './seo-panel'
import type { FramePreset } from './size-presets'
import { FRAME_PRESETS } from './size-presets'
import { VersionSelector } from './version-selector'

type Tab = 'Content' | 'Components' | 'SEO'

interface SelectedFile {
  path: string
  relativePath: string
  contentType: ContentType
}

interface PreviewPaneProps {
  activeContentDir?: string
  activeContentType?: ContentType
  activeTabId?: string | null
  selectedItem: SelectedFile | null
  fileContent: string
  renderMode: RenderMode
  versions: ContentVersion[]
  loading: boolean
  contentDir: string
  refreshCount: number
  worktreePath?: string
  selectVersion: (version: ContentVersion) => void
  selectFile: (
    path: string,
    relativePath: string,
    contentType: ContentType
  ) => void
  openProject: () => void
}

export function PreviewPane({
  activeContentDir,
  activeContentType,
  activeTabId,
  selectedItem,
  fileContent,
  renderMode,
  versions,
  loading,
  contentDir,
  refreshCount,
  worktreePath,
  selectVersion,
  selectFile,
  openProject
}: PreviewPaneProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Content')
  const [previewComponent, setPreviewComponent] =
    useState<DetectedComponent | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null
  )
  const [publishOpen, setPublishOpen] = useState(false)
  const [newsletterSendOpen, setNewsletterSendOpen] = useState(false)
  const [blogPublishOpen, setBlogPublishOpen] = useState(false)
  const [activePostText, setActivePostText] = useState('')
  const activePostTextRef = useRef('')
  const [fileSidebarOpen, setFileSidebarOpen] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [framePresetIdx, setFramePresetIdx] = useState(1) // default: LinkedIn 4:5
  const componentAnalysisRef = useRef<ComponentAnalysis | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const genCountRef = useRef(0)

  const {
    unstaged,
    committed,
    loading: gitLoading,
    refresh: refreshGit
  } = useGitStatus(worktreePath)

  const {
    comments,
    annotating,
    toggleAnnotating,
    addComment,
    resolveComment,
    deleteComment,
    clearAll,
    sendToTerminal
  } = useComments()

  // Clear comments when switching content
  useEffect(() => {
    clearAll()
    setSelectedCommentId(null)
  }, [activeContentDir, clearAll])

  // Read post text for active LinkedIn content (context for component generation)
  useEffect(() => {
    if (activeContentType !== 'linkedin' || !activeContentDir) {
      setActivePostText('')
      return
    }
    window.electronAPI?.content
      .read(`${activeContentDir}/post-text.md`)
      .then(text => {
        setActivePostText(text.trim())
        activePostTextRef.current = text.trim()
      })
      .catch(() => {
        setActivePostText('')
        activePostTextRef.current = ''
      })
  }, [activeContentDir, activeContentType])

  // Subscribe to Claude-generated HTML previews via terminal markers (legacy)
  useEffect(() => {
    const api = window.electronAPI?.components
    if (!api) return
    return api.onPreviewHtml(html => {
      setPreviewHtml(html)
      setPreviewError(null)
    })
  }, [])

  // Watch for component preview files written by Claude (prefix match for versioned names)
  useEffect(() => {
    if (!previewComponent) return
    const api = window.electronAPI?.files
    if (!api) return

    const name = previewComponent.name
    const previewPrefix = `${name}-preview`
    const demoPrefix = `${name}-demo`

    return api.onFileChange(event => {
      if (event.type === 'deleted') return
      const fileName = event.path.split('/').pop() || ''
      if (
        (fileName.startsWith(previewPrefix) || fileName.startsWith(demoPrefix)) &&
        fileName.endsWith('.html')
      ) {
        // Determine the full path from activeContentDir
        const dir = activeContentDir || ''
        const fullPath = dir ? `${dir}/${fileName}` : event.path
        window.electronAPI?.content
          .read(fullPath)
          .then(html => {
            if (html) {
              setPreviewHtml(html)
              setPreviewError(null)
            }
          })
          .catch(() => {
            // ignore read errors
          })
      }
    })
  }, [previewComponent, activeContentDir])

  // Format dependency sources into prompt sections
  const formatDependencies = useCallback(
    (dependencies: Record<string, string>): string => {
      const entries = Object.entries(dependencies)
      if (entries.length === 0) return ''
      const parts: string[] = ['\n## Dependencies\n']
      for (const [relPath, source] of entries) {
        const fileName = relPath.split('/').pop() || relPath
        parts.push(`### ${fileName}\n\`\`\`tsx\n${source}\n\`\`\`\n`)
      }
      return parts.join('\n')
    },
    []
  )

  // Tailwind color reference for visual fidelity
  const TAILWIND_COLORS = [
    'zinc-50:#fafafa zinc-100:#f4f4f5 zinc-200:#e4e4e7 zinc-300:#d4d4d8',
    'zinc-400:#a1a1aa zinc-500:#71717a zinc-600:#52525b zinc-700:#3f3f46',
    'zinc-800:#27272a zinc-900:#18181b zinc-950:#09090b',
    'blue-500:#3b82f6 blue-600:#2563eb red-500:#ef4444 green-500:#22c55e',
  ].join(' ')

  // Build prompt with dependency sources and better instructions
  const buildPrompt = useCallback(
    (
      name: string,
      source: string,
      analysis: ComponentAnalysis,
      dependencies: Record<string, string>,
      iconNames: string[],
      themeConfig: string,
      context: string,
      isDemo: boolean,
      frame?: FramePreset
    ): string => {
      const parts: string[] = []

      if (frame) {
        parts.push(
          `**Output dimensions: ${frame.width}x${frame.height} (${frame.label})**\n` +
          `Design the HTML to fill exactly ${frame.width}x${frame.height}px. Set the outermost wrapper to ` +
          `\`width: ${frame.width}px; height: ${frame.height}px; overflow: hidden;\`. Content must fill the ` +
          'frame completely — no empty space, no scrolling.\n'
        )
      }

      if (context) {
        parts.push(
          `Context: This component will be used as a LinkedIn carousel visual for a post with this text:\n\n${context}\n\n`
        )
      }

      // Main component source
      parts.push(`## ${name}.tsx (main component)\n\`\`\`tsx\n${source}\n\`\`\`\n`)

      // Dependency sources
      const depSection = formatDependencies(dependencies)
      if (depSection) parts.push(depSection)

      // Theme config (CSS variables + Tailwind config)
      if (themeConfig) {
        parts.push(`\n## Theme & Design Tokens\nThese are the project's actual CSS variable definitions and Tailwind config. Use these exact values — do NOT guess.\n\n${themeConfig}`)
      }

      // Icon hints
      if (iconNames.length > 0) {
        parts.push(
          `## Icons used\nThe component imports these icons from lucide-react: ${iconNames.join(', ')}.\n` +
          'For each icon, draw an accurate inline SVG that matches the real Lucide icon. ' +
          'Lucide icons are 24x24 viewBox, stroke-based (stroke="currentColor", strokeWidth=2, strokeLinecap="round", strokeLinejoin="round", fill="none"). ' +
          'Use the REAL SVG paths — do NOT use placeholder circles or generic shapes.\n'
        )
      }

      // Core instructions
      parts.push(
        'Create a self-contained HTML file using only vanilla HTML, CSS, and JS (no external dependencies).\n'
      )
      parts.push(
        'The components use Tailwind CSS. Here are the standard Tailwind color values:'
      )
      parts.push(`${TAILWIND_COLORS}\n`)
      parts.push(
        'When the source uses CSS variables like `hsl(var(--muted))`, resolve them using the CSS Variables section above. ' +
        'Replicate the exact visual appearance — colors, typography, spacing, borders, shadows, border-radius, and layout. ' +
        'Use the dependency source code above to understand how sub-components (buttons, badges, cards, icons) actually look. ' +
        'Do NOT invent generic replacements — match the real styles.\n'
      )

      if (isDemo) {
        parts.push(
          '**Mode: Animated Demo** — Create a looping animated product demo that shows realistic user interactions.\n'
        )
        parts.push('Guidelines:')
        parts.push('1. Visual fidelity first — the component must look identical to the real one')
        parts.push('2. Then add smooth animations: typing in inputs, clicking buttons, toggling states')
        parts.push('3. Use realistic mock data that makes the demo compelling')
        parts.push('4. Loop continuously with a 1s pause between cycles')
        parts.push('5. Total animation: 4-8 seconds per cycle\n')

        if (analysis.hasAnimations) {
          parts.push(
            `The component uses: ${analysis.animationTypes.join(', ')}. Replicate these animation styles.\n`
          )
        }
      } else {
        parts.push(
          '**Mode: Static Preview** — Create a pixel-perfect static preview with realistic mock data.\n'
        )
        parts.push('Guidelines:')
        parts.push('1. Match the exact layout, colors, and typography from the source')
        parts.push('2. Fill in realistic, compelling mock data (not "Lorem ipsum")')
        parts.push('3. Show the component in its most representative state')
        parts.push('4. Include hover states via CSS where the component has them\n')
      }

      return parts.join('\n')
    },
    [formatDependencies, TAILWIND_COLORS]
  )

  // Clear poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // Tracks the component path we last sent to Claude — prevents stale results
  const activePathRef = useRef<string | null>(null)
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // When a component is selected, fetch its source + analysis but do NOT auto-send to Claude.
  // The user must explicitly click "Generate" to send a prompt.
  // Skip when path is empty — that means we're viewing existing HTML via handleViewExisting.
  useEffect(() => {
    if (!previewComponent || !previewComponent.path) return

    const thisPath = previewComponent.path
    activePathRef.current = thisPath
    setPreviewHtml(null)
    setPreviewError(null)
    genCountRef.current = 0

    // Cancel any pending poll from a previous selection
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    // Cancel any pending prompt from a previous selection
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current)
      promptTimerRef.current = null
    }

    window.electronAPI?.components
      .render(thisPath)
      .then((result: ComponentRenderResult) => {
        if (activePathRef.current !== thisPath) return

        if (result.ok) {
          setPreviewHtml(result.html)
        } else {
          componentAnalysisRef.current = result.analysis
          // Show "ready to generate" state — user clicks Generate button
          setPreviewError('ready')
        }
      })
      .catch(() => {
        if (activePathRef.current !== thisPath) return
        setPreviewError('failed')
      })
  }, [previewComponent])

  const handleToggleDemoMode = useCallback(() => {
    setDemoMode(prev => !prev)
  }, [])

  // Send generate prompt to Claude — only called by explicit user action.
  // Claude writes the HTML to a file; we poll for the file to appear.
  const handleGenerate = useCallback(async () => {
    if (!previewComponent || !activeTabId || !activeContentDir) return

    // If viewing an existing preview (path is empty), resolve the real component path first
    let componentPath = previewComponent.path
    if (!componentPath) {
      const allComponents = await window.electronAPI?.components.scan()
      const match = allComponents?.find(
        c => c.name === previewComponent.name
      )
      if (!match) {
        setPreviewError('failed')
        return
      }
      componentPath = match.path
      // Update previewComponent so future regenerates don't need to scan again
      setPreviewComponent({ ...previewComponent, path: match.path })
    }

    setPreviewHtml(null)
    setPreviewError('generating')

    // Clear any existing poll
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    const outputDir = activeContentDir
    genCountRef.current += 1
    const suffix = genCountRef.current > 1 ? `-${genCountRef.current}` : ''
    const filename = demoMode
      ? `${previewComponent.name}-demo${suffix}.html`
      : `${previewComponent.name}-preview${suffix}.html`
    const outputPath = `${outputDir}/${filename}`

    window.electronAPI?.components
      .render(componentPath)
      .then((result: ComponentRenderResult) => {
        if (result.ok) return

        const prompt = buildPrompt(
          previewComponent.name,
          result.source,
          result.analysis,
          result.dependencies,
          result.iconNames,
          result.themeConfig,
          activePostTextRef.current,
          demoMode,
          FRAME_PRESETS[framePresetIdx]
        ) + `\n\nWrite the complete HTML to the file: ${outputPath}`

        window.electronAPI?.terminal.sendInput(activeTabId, prompt + '\n')

        // Start polling for the output file
        const startTime = Date.now()
        pollRef.current = setInterval(async () => {
          // Timeout after 90s
          if (Date.now() - startTime > 90_000) {
            if (pollRef.current) clearInterval(pollRef.current)
            pollRef.current = null
            return
          }
          try {
            const html = await window.electronAPI?.content.read(outputPath)
            if (html && html.trim().length > 50) {
              setPreviewHtml(html)
              setPreviewError(null)
              if (pollRef.current) clearInterval(pollRef.current)
              pollRef.current = null
            }
          } catch {
            // file not yet created — keep polling
          }
        }, 3000)
      })
  }, [previewComponent, activeTabId, demoMode, buildPrompt, activeContentDir, framePresetIdx])

  const handlePreview = useCallback((component: DetectedComponent) => {
    setPreviewHtml(null)
    setPreviewError(null)
    setPreviewComponent(component)
  }, [])

  // View an existing demo/preview HTML file directly (from Recent Previews)
  const handleViewExisting = useCallback(
    (componentName: string, html: string) => {
      setPreviewComponent({
        name: componentName,
        path: '',
        description: ''
      })
      setPreviewHtml(html)
      setPreviewError(null)
    },
    []
  )

  const handleBackFromPreview = useCallback(() => {
    setPreviewComponent(null)
  }, [])

  const handleSendToClaude = useCallback(() => {
    if (selectedItem) {
      sendToTerminal(
        selectedItem.relativePath,
        activeTabId,
        fileContent || undefined,
        activeContentDir
      )
    }
  }, [selectedItem, sendToTerminal, activeTabId, fileContent, activeContentDir])

  const hasComments = comments.length > 0
  const tabs: Tab[] =
    activeContentType === 'blog'
      ? ['Content', 'Components', 'SEO']
      : ['Content', 'Components']

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-900">
      {/* Top bar — draggable, matches other panes */}
      <div className="drag-region flex h-9 shrink-0 items-center justify-end border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 pr-2">
        <button
          onClick={() => {
            if (activeContentDir) {
              window.electronAPI?.shell.showItemInFolder(activeContentDir)
            } else {
              openProject()
            }
          }}
          className="no-drag flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
          title={
            activeContentDir
              ? `Open: ${activeContentDir}`
              : 'Open project folder'
          }
        >
          <FolderOpenIcon className="h-3.5 w-3.5" />
        </button>
        {worktreePath && (
          <button
            onClick={() => setFileSidebarOpen(v => !v)}
            className={`no-drag ml-1 flex h-6 w-6 items-center justify-center rounded transition-colors ${
              fileSidebarOpen
                ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
                : 'text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300'
            }`}
            title="Toggle file sidebar"
          >
            <CodeIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Tab bar — Content / Components / SEO */}
      <div className="flex shrink-0 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab)
              if (tab !== 'Components') setPreviewComponent(null)
            }}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-zinc-900 dark:text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Content' && (
        <div className="flex min-h-0 flex-1">
          {/* Preview area */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Toolbar: version selector + action buttons */}
            <div className="flex shrink-0 items-center border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex-1">
                {selectedItem && versions.length > 0 && (
                  <VersionSelector
                    versions={versions}
                    currentPath={selectedItem.path}
                    onSelect={selectVersion}
                  />
                )}
              </div>
              {selectedItem && activeContentType === 'linkedin' && (
                <button
                  onClick={() => setPublishOpen(true)}
                  className="mr-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500"
                  title="Publish to LinkedIn"
                >
                  Publish
                </button>
              )}
              {selectedItem && activeContentType === 'newsletter' && (
                <button
                  onClick={() => setNewsletterSendOpen(true)}
                  className="mr-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500"
                  title="Send newsletter via Resend"
                >
                  Send Newsletter
                </button>
              )}
              {selectedItem && activeContentType === 'blog' && (
                <button
                  onClick={() => setBlogPublishOpen(true)}
                  className="mr-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500"
                  title="Publish blog via webhook"
                >
                  Publish Blog
                </button>
              )}
              {selectedItem && (
                <button
                  onClick={toggleAnnotating}
                  className={`mr-2 rounded px-2 py-1 text-xs transition-colors ${
                    annotating
                      ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                  title={
                    annotating ? 'Exit annotation mode' : 'Click to annotate'
                  }
                >
                  {annotating ? 'Annotating' : 'Annotate'}
                </button>
              )}
            </div>

            {/* Content area with comment overlay */}
            <div className="min-h-0 flex-1">
              {loading ? (
                <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                  <p className="text-sm">Loading...</p>
                </div>
              ) : selectedItem ? (
                <CommentOverlay
                  comments={comments}
                  annotating={annotating}
                  onAddComment={addComment}
                  selectedCommentId={selectedCommentId}
                  onSelectComment={setSelectedCommentId}
                >
                  <ContentRenderer
                    content={fileContent}
                    renderMode={renderMode}
                    refreshCount={refreshCount}
                    contentDir={activeContentDir}
                    activeTabId={activeTabId}
                  />
                </CommentOverlay>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-zinc-400 dark:text-zinc-500">
                  <FileIcon className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                  <p className="text-sm font-medium">No content selected</p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
                    Pick something from the sidebar to preview
                  </p>
                </div>
              )}
            </div>

            {/* Capture toolbar */}
            {selectedItem && activeContentDir && (
              <CaptureToolbar
                htmlContent={fileContent || undefined}
                contentDir={activeContentDir}
                contentType={activeContentType}
              />
            )}
          </div>

          {/* Right: comment sidebar */}
          {hasComments && (
            <CommentSidebar
              comments={comments}
              selectedCommentId={selectedCommentId}
              onSelectComment={setSelectedCommentId}
              onResolve={resolveComment}
              onDelete={deleteComment}
              onClearAll={clearAll}
              onSendToClaude={handleSendToClaude}
            />
          )}

          {/* Right: file sidebar */}
          {fileSidebarOpen && worktreePath && (
            <FileSidebar
              unstaged={unstaged}
              committed={committed}
              loading={gitLoading}
              onRefresh={refreshGit}
              onFileSelect={selectFile}
              worktreePath={worktreePath}
            />
          )}
        </div>
      )}

      {activeTab === 'Components' && (
        <>
          {/* Always mounted so the list persists — hidden when preview is active */}
          <div
            className={
              previewComponent ? 'hidden' : 'flex min-h-0 flex-1 flex-col'
            }
          >
            <ComponentBrowser
              onPreview={handlePreview}
              onViewExisting={handleViewExisting}
              activeContentDir={activeContentDir}
            />
          </div>

          {previewComponent && (
            <div className="flex min-h-0 flex-1 flex-col">
              <ComponentPreview
                componentName={previewComponent.name}
                componentPath={previewComponent.path}
                htmlContent={previewHtml}
                error={previewError}
                onBack={handleBackFromPreview}
                activeContentDir={activeContentDir}
                activeContentType={activeContentType}
                activeTabId={activeTabId}
                demoMode={demoMode}
                onToggleDemoMode={handleToggleDemoMode}
                onRegenerateDemo={handleGenerate}
                onVersionSelect={setPreviewHtml}
                framePresetIdx={framePresetIdx}
                onFramePresetChange={setFramePresetIdx}
              />
              {contentDir && (
                <CaptureToolbar
                  htmlContent={previewHtml ?? undefined}
                  contentDir={contentDir}
                  activeTabId={activeTabId}
                  componentName={previewComponent.name}
                />
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'SEO' && (
        <SeoPanel
          contentDir={activeContentDir}
          activeContentType={activeContentType}
        />
      )}

      {/* LinkedIn publish dialog */}
      {activeContentDir && (
        <LinkedInPublisher
          isOpen={publishOpen}
          onClose={() => setPublishOpen(false)}
          contentDir={activeContentDir}
        />
      )}

      {/* Resend newsletter dialog */}
      {activeContentDir && (
        <ResendSender
          isOpen={newsletterSendOpen}
          onClose={() => setNewsletterSendOpen(false)}
          contentDir={activeContentDir}
        />
      )}

      {/* Blog publish dialog */}
      {activeContentDir && (
        <BlogPublisher
          isOpen={blogPublishOpen}
          onClose={() => setBlogPublishOpen(false)}
          contentDir={activeContentDir}
        />
      )}
    </div>
  )
}
