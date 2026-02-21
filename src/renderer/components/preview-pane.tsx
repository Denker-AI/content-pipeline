import { useState } from 'react'

import type { DirEntry } from '@/shared/types'

import { useContent } from '../hooks/use-content'

import { ComponentBrowser } from './component-browser'
import { ContentRenderer } from './content-renderer'
import { FolderBrowser } from './folder-browser'
import { VersionSelector } from './version-selector'

const tabs = ['Content', 'Components', 'Library'] as const
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
    selectFile,
    selectVersion,
    openProject,
  } = useContent()

  const handleFileSelect = (entry: DirEntry) => {
    selectFile(entry.path, entry.relativePath, entry.contentType)
  }

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
          {contentDir ? (
            <>
              {/* Left: folder browser */}
              <div className="flex w-56 shrink-0 flex-col border-r border-zinc-700">
                <FolderBrowser
                  contentDir={contentDir}
                  onFileSelect={handleFileSelect}
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
                      <p className="text-sm">Select a file to preview</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-zinc-500">
              <div>
                <p className="text-sm">No content directory found.</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Open a project with a content/ folder.
                </p>
                <button
                  onClick={openProject}
                  className="mt-3 rounded bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-500"
                >
                  Open Project
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Components' && <ComponentBrowser />}

      {activeTab === 'Library' && (
        <div className="flex flex-1 items-center justify-center text-zinc-500">
          <p className="text-sm">Content library</p>
        </div>
      )}
    </div>
  )
}
