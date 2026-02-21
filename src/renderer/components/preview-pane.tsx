import { useCallback, useEffect, useState } from 'react'

import type { DetectedComponent, PipelineItem } from '@/shared/types'

import { useContent } from '../hooks/use-content'

import { ComponentBrowser } from './component-browser'
import { ComponentPreview } from './component-preview'
import { ContentRenderer } from './content-renderer'
import { PipelineSidebar } from './pipeline-sidebar'
import { VersionSelector } from './version-selector'

const tabs = ['Content', 'Components'] as const
type Tab = (typeof tabs)[number]

const DEFAULT_APP_URL = 'http://localhost:3000'

export function PreviewPane() {
  const [activeTab, setActiveTab] = useState<Tab>('Content')
  const [activeContentDir, setActiveContentDir] = useState<string | undefined>()
  const [previewComponent, setPreviewComponent] =
    useState<DetectedComponent | null>(null)
  const [appUrl, setAppUrl] = useState(DEFAULT_APP_URL)
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
  }

  const handlePreview = useCallback((component: DetectedComponent) => {
    setPreviewComponent(component)
  }, [])

  const handleBackFromPreview = useCallback(() => {
    setPreviewComponent(null)
  }, [])

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

          {/* Right: preview */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Version selector */}
            {selectedItem && versions.length > 0 && (
              <VersionSelector
                versions={versions}
                currentPath={selectedItem.path}
                onSelect={selectVersion}
              />
            )}

            {/* Content area */}
            <div className="min-h-0 flex-1 overflow-auto">
              {loading ? (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <p className="text-sm">Loading...</p>
                </div>
              ) : selectedItem ? (
                <ContentRenderer
                  content={fileContent}
                  renderMode={renderMode}
                  refreshCount={refreshCount}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <p className="text-sm">Select content to preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Components' &&
        (previewComponent ? (
          <ComponentPreview
            componentName={previewComponent.name}
            appUrl={appUrl}
            onBack={handleBackFromPreview}
          />
        ) : (
          <ComponentBrowser onPreview={handlePreview} />
        ))}
    </div>
  )
}
