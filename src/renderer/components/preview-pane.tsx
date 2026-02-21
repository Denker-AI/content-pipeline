import { useState } from 'react'

import { useContent } from '../hooks/use-content'

import { ComponentBrowser } from './component-browser'
import { ContentRenderer } from './content-renderer'
import { PipelineSidebar } from './pipeline-sidebar'
import { VersionSelector } from './version-selector'

const tabs = ['Content', 'Components'] as const
type Tab = (typeof tabs)[number]

export function PreviewPane() {
  const [activeTab, setActiveTab] = useState<Tab>('Content')
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
  } = useContent()

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center border-b border-zinc-700">
        <div className="flex flex-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
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
          <div className="flex w-56 shrink-0 flex-col border-r border-zinc-700">
            <PipelineSidebar
              onItemSelect={() => {}}
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

      {activeTab === 'Components' && <ComponentBrowser />}
    </div>
  )
}
