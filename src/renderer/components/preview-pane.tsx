import { useState } from 'react'

import { useContent } from '../hooks/use-content'

import { ContentRenderer } from './content-renderer'
import { VersionSelector } from './version-selector'

const tabs = ['Content', 'Components', 'Library'] as const
type Tab = (typeof tabs)[number]

export function PreviewPane() {
  const [activeTab, setActiveTab] = useState<Tab>('Content')
  const {
    items,
    selectedItem,
    fileContent,
    renderMode,
    versions,
    loading,
    projectRoot,
    refreshCount,
    selectItem,
    selectVersion,
    openProject,
  } = useContent()

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      <div className="flex shrink-0 border-b border-zinc-700">
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

      {activeTab === 'Content' && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* File selector bar */}
          <div className="flex shrink-0 items-center gap-2 border-b border-zinc-700 px-3 py-1.5">
            <button
              onClick={openProject}
              className="shrink-0 rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
              title="Open project folder"
            >
              Open
            </button>
            {items.length > 0 ? (
              <select
                value={selectedItem?.path ?? ''}
                onChange={(e) => {
                  const item = items.find((i) => i.path === e.target.value)
                  if (item) selectItem(item)
                }}
                className="min-w-0 flex-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
              >
                <option value="">Select a file...</option>
                {items.map((item) => (
                  <option key={item.path} value={item.path}>
                    [{item.type}] {item.title}
                    {item.date ? ` (${item.date})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-zinc-500">
                {projectRoot || 'No project'}
              </span>
            )}
            {selectedItem && (
              <span className="shrink-0 text-xs text-zinc-500">
                {selectedItem.relativePath}
              </span>
            )}
          </div>

          {/* Version selector */}
          {selectedItem && (
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
            ) : items.length === 0 ? (
              <div className="flex h-full items-center justify-center p-8 text-center text-zinc-500">
                <div>
                  <p className="text-sm">No content files found.</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Open a project with a content/ folder, or ask Claude to
                    create something.
                  </p>
                  <button
                    onClick={openProject}
                    className="mt-3 rounded bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-500"
                  >
                    Open Project
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                <p className="text-sm">Select a file to preview</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab !== 'Content' && (
        <div className="flex flex-1 items-center justify-center text-zinc-500">
          <p className="text-sm">
            {activeTab === 'Components'
              ? 'Component browser'
              : 'Content library'}
          </p>
        </div>
      )}
    </div>
  )
}
