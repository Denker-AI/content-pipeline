import { useState } from 'react'

import type { ContentType, PipelineItem, WorktreeInfo } from '@/shared/types'

import { usePipeline } from '../hooks/use-pipeline'

import { PipelineSection } from './pipeline-section'
import { WorktreeList } from './worktree-list'

const SECTION_TYPES: ContentType[] = ['linkedin', 'blog', 'newsletter']

type SidebarTab = 'content' | 'branches'

interface PipelineSidebarProps {
  onItemSelect: (item: PipelineItem) => void
  onItemCreated: (item: PipelineItem) => void
  onBranchSelect: (worktree: WorktreeInfo) => void
  onOpenProject: () => void
  hasProject: boolean
}

export function PipelineSidebar({
  onItemSelect,
  onItemCreated,
  onBranchSelect,
  onOpenProject,
  hasProject,
}: PipelineSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('content')

  const {
    groupedItems,
    activeItemId,
    loading,
    expandedSections,
    searchQuery,
    setSearchQuery,
    isConfigured,
    createContent,
    activateItem,
    updateStage,
    toggleSection,
    installConfig,
  } = usePipeline()

  // Content tab click: activate content for preview only (no terminal)
  const handleSelect = (item: PipelineItem) => {
    activateItem(item)
    onItemSelect(item)
  }

  // Branch tab click: open terminal + preview
  const handleBranchClick = (worktree: WorktreeInfo) => {
    onBranchSelect(worktree)
  }

  const handleCreate = async (type: ContentType) => {
    const item = await createContent(type)
    if (item) {
      onItemCreated(item)
    }
  }

  if (!hasProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">No project open</p>
        <button
          onClick={onOpenProject}
          className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500"
        >
          Open Project
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'content'
              ? 'border-b-2 border-blue-500 text-zinc-900 dark:text-white'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
          }`}
        >
          Content
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'branches'
              ? 'border-b-2 border-blue-500 text-zinc-900 dark:text-white'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
          }`}
        >
          Branches
        </button>
      </div>

      {activeTab === 'content' && (
        <>
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Loading...</p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-700 p-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search content..."
                  className="w-full rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Setup banner */}
              {!isConfigured && (
                <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-700 p-2">
                  <div className="rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-2 text-xs">
                    <p className="font-medium text-amber-800 dark:text-amber-300">
                      Claude Code not set up
                    </p>
                    <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                      Install slash commands and templates for this project.
                    </p>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={installConfig}
                        className="rounded bg-amber-600 px-2 py-1 text-white hover:bg-amber-500 dark:bg-amber-700 dark:hover:bg-amber-600"
                      >
                        Install
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sections */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                {SECTION_TYPES.map((type) => (
                  <PipelineSection
                    key={type}
                    type={type}
                    items={groupedItems[type] ?? []}
                    isExpanded={expandedSections.has(type)}
                    onToggle={() => toggleSection(type)}
                    onItemSelect={handleSelect}
                    onCreateNew={handleCreate}
                    activeItemId={activeItemId}
                    onStageChange={updateStage}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'branches' && (
        <div className="min-h-0 flex-1">
          <WorktreeList onSelectWorktree={handleBranchClick} />
        </div>
      )}
    </div>
  )
}
