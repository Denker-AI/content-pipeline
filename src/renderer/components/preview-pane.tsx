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
    refreshCount,
    selectItem,
    selectVersion,
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
          {items.length > 0 && (
            <div className="flex shrink-0 items-center gap-2 border-b border-zinc-700 px-3 py-1.5">
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
              {selectedItem && (
                <span className="shrink-0 text-xs text-zinc-500">
                  {selectedItem.relativePath}
                </span>
              )}
            </div>
          )}

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
                    Ask Claude to create something in the content/ directory.
                  </p>
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
