import { useState } from 'react'

import type { ContentType, PipelineItem, WorktreeInfo } from '@/shared/types'

import { usePipeline } from '../hooks/use-pipeline'

import { FolderIcon, FolderOpenIcon, SearchIcon, SparkleIcon } from './icons'
import { PipelineSection } from './pipeline-section'
import { WorktreeList } from './worktree-list'

const SECTION_TYPES: ContentType[] = ['linkedin', 'blog', 'newsletter']

type SidebarTab = 'content' | 'branches'

interface PipelineSidebarProps {
  onItemSelect: (item: PipelineItem) => void
  onItemCreated: (item: PipelineItem) => void
  onBranchSelect: (worktree: WorktreeInfo) => void
  onOpenProject: () => void
  onOpenSettings: () => void
  onOpenWizard: () => void
  hasProject: boolean
}

export function PipelineSidebar({
  onItemSelect,
  onItemCreated,
  onBranchSelect,
  onOpenProject,
  onOpenSettings,
  onOpenWizard,
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
    createContent,
    activateItem,
    updateStage,
    toggleSection,
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

  // Shared sidebar header with settings + actions
  const sidebarHeader = (
    <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-3 py-2">
      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Pipeline</span>
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenWizard}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
          title="Setup wizard"
        >
          <SparkleIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onOpenProject}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
          title="Open project folder"
        >
          <FolderOpenIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onOpenSettings}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
          title="Settings"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  )

  if (!hasProject) {
    return (
      <div className="flex h-full flex-col">
        {sidebarHeader}
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
            <FolderIcon className="h-6 w-6 text-zinc-400 dark:text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No project open</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
            Open a folder to get started
          </p>
          <button
            onClick={onOpenProject}
            className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            <FolderOpenIcon className="h-4 w-4" />
            Open Project
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {sidebarHeader}
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
                <div className="relative">
                  <SearchIcon className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search content..."
                    className="w-full rounded bg-zinc-100 dark:bg-zinc-800 pl-7 pr-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sections */}
              <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar">
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
