import { useCallback, useEffect, useRef, useState } from 'react'

import type {
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

  // Subscribe to Claude-generated HTML previews (fallback if esbuild fails)
  useEffect(() => {
    const api = window.electronAPI?.components
    if (!api) return
    return api.onPreviewHtml(html => {
      setPreviewHtml(html)
      setPreviewError(null)
    })
  }, [])

  // Tracks the component path we last sent to Claude — prevents stale results
  const activePathRef = useRef<string | null>(null)
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Render component when selection changes; debounce Claude prompt to avoid spam
  useEffect(() => {
    if (!previewComponent) return

    const thisPath = previewComponent.path
    activePathRef.current = thisPath
    setPreviewHtml(null)
    setPreviewError(null)

    // Cancel any pending prompt from a previous selection
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current)
      promptTimerRef.current = null
    }

    window.electronAPI?.components
      .render(thisPath)
      .then((result: ComponentRenderResult) => {
        // Ignore if user already switched to another component
        if (activePathRef.current !== thisPath) return

        if (result.ok) {
          setPreviewHtml(result.html)
        } else {
          setPreviewError('generating')
          // Debounce: only send to Claude if user stays on this component for 500ms
          promptTimerRef.current = setTimeout(() => {
            if (activePathRef.current !== thisPath) return
            const contextPrefix = activePostTextRef.current
              ? `Context: This component will be used as a LinkedIn carousel visual for a post with this text:\n\n${activePostTextRef.current}\n\n`
              : ''
            const prompt = `${contextPrefix}Here is the source code for the ${previewComponent.name} component:\n\n\`\`\`tsx\n${result.source}\n\`\`\`\n\nCreate a self-contained HTML preview with realistic mock data that accurately represents how this component looks and functions. Use only vanilla HTML, CSS, and JS (no external dependencies). Output the complete HTML between these exact marker lines on their own lines: ===HTML_PREVIEW_START=== and ===HTML_PREVIEW_END===`
            if (activeTabId) {
              window.electronAPI?.terminal.sendInput(activeTabId, prompt + '\n')
            }
          }, 500)
        }
      })
      .catch(() => {
        if (activePathRef.current !== thisPath) return
        setPreviewError('failed')
      })
  }, [previewComponent, activeTabId])

  const handlePreview = useCallback((component: DetectedComponent) => {
    setPreviewHtml(null)
    setPreviewError(null)
    setPreviewComponent(component)
  }, [])

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
            <ComponentBrowser onPreview={handlePreview} />
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
                activePostText={activePostText}
                activeTabId={activeTabId}
              />
              {contentDir && (
                <CaptureToolbar
                  htmlContent={previewHtml ?? undefined}
                  contentDir={contentDir}
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
