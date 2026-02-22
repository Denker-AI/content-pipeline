import { useCallback, useEffect, useState } from 'react'

import type { ContentType, DetectedComponent, PipelineItem } from '@/shared/types'

import { useComments } from '../hooks/use-comments'
import { useContent } from '../hooks/use-content'

import { BlogPublisher } from './blog-publisher'
import { CaptureToolbar } from './capture-toolbar'
import { CommentOverlay } from './comment-overlay'
import { CommentSidebar } from './comment-sidebar'
import { ComponentBrowser } from './component-browser'
import { ComponentPreview } from './component-preview'
import { ContentRenderer } from './content-renderer'
import { LinkedInPublisher } from './linkedin-publisher'
import { PipelineSidebar } from './pipeline-sidebar'
import { ResendSender } from './resend-sender'
import { VersionSelector } from './version-selector'

const tabs = ['Content', 'Components'] as const
type Tab = (typeof tabs)[number]

const DEFAULT_APP_URL = 'http://localhost:3000'

export function PreviewPane() {
  const [activeTab, setActiveTab] = useState<Tab>('Content')
  const [activeContentDir, setActiveContentDir] = useState<string | undefined>()
  const [previewComponent, setPreviewComponent] =
    useState<DetectedComponent | null>(null)
  const [activeContentType, setActiveContentType] = useState<ContentType | undefined>()
  const [appUrl, setAppUrl] = useState(DEFAULT_APP_URL)
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [newsletterSendOpen, setNewsletterSendOpen] = useState(false)
  const [blogPublishOpen, setBlogPublishOpen] = useState(false)
  const {
    selectedItem,
    fileContent,
    renderMode,
    versions,
    loading,
    projectRoot,
    contentDir,
    refreshCount,
    selectVersion,
    openProject,
  } = useContent(activeContentDir)

  const {
    comments,
    annotating,
    toggleAnnotating,
    addComment,
    resolveComment,
    deleteComment,
    clearAll,
    sendToTerminal,
  } = useComments()

  // Load appUrl from user settings
  useEffect(() => {
    window.electronAPI?.settings
      .getUser()
      .then((s) => {
        if (s.appUrl) setAppUrl(s.appUrl)
      })
      .catch(() => {})
  }, [])

  const handleItemSelect = (item: PipelineItem) => {
    setActiveContentDir(item.contentDir)
    setActiveContentType(item.type)
    // Clear comments when switching content
    clearAll()
    setSelectedCommentId(null)
  }

  const handlePreview = useCallback((component: DetectedComponent) => {
    setPreviewComponent(component)
  }, [])

  const handleBackFromPreview = useCallback(() => {
    setPreviewComponent(null)
  }, [])

  const handleSendToClaude = useCallback(() => {
    if (selectedItem) {
      sendToTerminal(selectedItem.relativePath)
    }
  }, [selectedItem, sendToTerminal])

  const hasComments = comments.length > 0

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center border-b border-zinc-700">
        <div className="flex flex-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                if (tab !== 'Components') setPreviewComponent(null)
              }}
              className={`px-4 py-2 text-sm transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button
          onClick={openProject}
          className="mr-2 shrink-0 rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
          title={projectRoot ? `Project: ${projectRoot}` : 'Open project folder'}
        >
          Open
        </button>
      </div>

      {activeTab === 'Content' && (
        <div className="flex min-h-0 flex-1">
          {/* Left: pipeline sidebar */}
          <div className="flex w-72 shrink-0 flex-col border-r border-zinc-700">
            <PipelineSidebar
              onItemSelect={handleItemSelect}
              onOpenProject={openProject}
              hasProject={!!contentDir}
            />
          </div>

          {/* Center: preview */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Toolbar: version selector + annotate toggle */}
            <div className="flex shrink-0 items-center border-b border-zinc-700">
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
                      : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                  title={annotating ? 'Exit annotation mode' : 'Click to annotate'}
                >
                  {annotating ? 'Annotating' : 'Annotate'}
                </button>
              )}
            </div>

            {/* Content area with comment overlay */}
            <div className="min-h-0 flex-1">
              {loading ? (
                <div className="flex h-full items-center justify-center text-zinc-500">
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
                  <div className="h-full overflow-auto">
                    <ContentRenderer
                      content={fileContent}
                      renderMode={renderMode}
                      refreshCount={refreshCount}
                    />
                  </div>
                </CommentOverlay>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <p className="text-sm">Select content to preview</p>
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
        </div>
      )}

      {activeTab === 'Components' &&
        (previewComponent ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <ComponentPreview
              componentName={previewComponent.name}
              appUrl={appUrl}
              onBack={handleBackFromPreview}
            />
            {contentDir && (
              <CaptureToolbar
                contentUrl={`${appUrl}/content-preview`}
                contentDir={contentDir}
              />
            )}
          </div>
        ) : (
          <ComponentBrowser onPreview={handlePreview} />
        ))}

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
