import { useRef, useState } from 'react'

import type { ContentType, PipelineItem, RepoSidebarData, WorktreeInfo } from '@/shared/types'

import { usePipeline } from '../hooks/use-pipeline'
import { useRepos } from '../hooks/use-repos'

import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  GitBranchIcon,
  PlusIcon,
  SearchIcon,
  SparkleIcon,
  XIcon,
} from './icons'
import { PipelineSection } from './pipeline-section'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState('content')
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(() => new Set())
  const [confirmRemoveRepo, setConfirmRemoveRepo] = useState<string | null>(null)
  const didInitialExpand = useRef(false)

  const { repos, loading: reposLoading, addRepo, removeRepo } = useRepos()

  const {
    groupedItems,
    activeItemId,
    loading: pipelineLoading,
    expandedSections,
    createContent,
    activateItem,
    updateStage,
    toggleSection,
  } = usePipeline()

  // Auto-expand repos on first load only
  if (repos.length > 0 && !didInitialExpand.current) {
    didInitialExpand.current = true
    const initial = new Set(repos.map((r) => r.path))
    if (initial.size > 0) setExpandedRepos(initial)
  }

  const isMultiRepo = repos.length > 1

  const toggleRepo = (path: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleSelect = (item: PipelineItem) => {
    activateItem(item)
    onItemSelect(item)
  }

  const handleBranchClick = (worktree: WorktreeInfo) => {
    onBranchSelect(worktree)
  }

  const handleCreate = async (type: ContentType) => {
    const item = await createContent(type)
    if (item) {
      onItemCreated(item)
    }
  }

  const handleRemoveRepo = async (repoPath: string) => {
    if (confirmRemoveRepo !== repoPath) {
      setConfirmRemoveRepo(repoPath)
      return
    }
    await removeRepo(repoPath)
    setConfirmRemoveRepo(null)
  }

  // Filter items by search query
  const filterItems = (items: PipelineItem[]) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return items
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q),
    )
  }

  // Group items by type
  const groupItems = (items: PipelineItem[]) => {
    const groups: Record<ContentType, PipelineItem[]> = {
      linkedin: [],
      blog: [],
      newsletter: [],
      asset: [],
      unknown: [],
    }
    for (const item of items) {
      const bucket = groups[item.type]
      if (bucket) bucket.push(item)
      else groups.unknown.push(item)
    }
    return groups
  }

  const loading = reposLoading || pipelineLoading

  // Sidebar header — pl-[72px] leaves room for macOS traffic lights
  const sidebarHeader = (
    <div className="drag-region flex h-9 shrink-0 items-center justify-end bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 pl-[72px] pr-2">
      <div className="no-drag flex items-center gap-1">
        <button
          onClick={onOpenWizard}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
          title="Setup wizard"
        >
          <SparkleIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onOpenSettings}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
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

      {loading ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Loading...</p>
        </div>
      ) : (
        <>
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

          {/* Search (content tab only) */}
          {/* Search / filter bar */}
          <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-700 p-2">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              {activeTab === 'content' ? (
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search content..."
                  className="w-full rounded bg-zinc-100 dark:bg-zinc-800 pl-7 pr-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <input
                  type="text"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  placeholder="Filter branches..."
                  className="w-full rounded bg-zinc-100 dark:bg-zinc-800 pl-7 pr-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>
          </div>

          {/* Repo sections — shared by both tabs */}
          <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar">
            {repos.map((repo) => (
              <RepoSection
                key={repo.path}
                repo={repo}
                activeTab={activeTab}
                isExpanded={expandedRepos.has(repo.path)}
                onToggle={() => toggleRepo(repo.path)}
                onRemove={() => handleRemoveRepo(repo.path)}
                confirmRemove={confirmRemoveRepo === repo.path}
                groupedItems={isMultiRepo ? groupItems(filterItems(repo.items)) : groupedItems}
                expandedSections={expandedSections}
                activeItemId={activeItemId}
                onToggleSection={toggleSection}
                onItemSelect={handleSelect}
                onCreateNew={handleCreate}
                onStageChange={updateStage}
                onBranchSelect={handleBranchClick}
                branchFilter={branchFilter}
                isMultiRepo={isMultiRepo}
              />
            ))}
          </div>

          {/* Add Repository — fixed at bottom, both tabs */}
          <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-700 p-2">
            <button
              onClick={addRepo}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 py-2 text-xs text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 dark:hover:border-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <PlusIcon className="h-3 w-3" />
              Add Repository
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// --- Repo section sub-component ---

interface RepoSectionProps {
  repo: RepoSidebarData
  activeTab: SidebarTab
  isExpanded: boolean
  onToggle: () => void
  onRemove: () => void
  confirmRemove: boolean
  groupedItems: Record<ContentType, PipelineItem[]>
  expandedSections: Set<ContentType>
  activeItemId: string | null
  onToggleSection: (type: ContentType) => void
  onItemSelect: (item: PipelineItem) => void
  onCreateNew: (type: ContentType) => Promise<void>
  onStageChange: (item: PipelineItem, stage: import('@/shared/types').ContentStage) => void
  onBranchSelect: (worktree: WorktreeInfo) => void
  branchFilter: string
  isMultiRepo: boolean
}

function RepoSection({
  repo,
  activeTab,
  isExpanded,
  onToggle,
  onRemove,
  confirmRemove,
  groupedItems,
  expandedSections,
  activeItemId,
  onToggleSection,
  onItemSelect,
  onCreateNew,
  onStageChange,
  onBranchSelect,
  branchFilter,
  isMultiRepo,
}: RepoSectionProps) {
  const [confirmDeleteBranch, setConfirmDeleteBranch] = useState<string | null>(null)

  const handleDeleteBranch = async (wt: WorktreeInfo) => {
    if (confirmDeleteBranch !== wt.path) {
      setConfirmDeleteBranch(wt.path)
      return
    }
    try {
      await window.electronAPI?.git.removeWorktree(wt.path)
      setConfirmDeleteBranch(null)
    } catch (err) {
      console.error('Failed to remove worktree:', err)
    }
  }

  const filteredBranches = branchFilter.trim()
    ? repo.worktrees.filter((wt) => wt.branch.toLowerCase().startsWith(branchFilter.trim().toLowerCase()))
    : repo.worktrees
  const count = activeTab === 'content' ? repo.items.length : filteredBranches.length

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700">
      {/* Collapsible repo header */}
      <div className="group flex items-center gap-1 px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 min-w-0 flex-1 text-left"
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-3 w-3 shrink-0 text-zinc-400" />
          ) : (
            <ChevronRightIcon className="h-3 w-3 shrink-0 text-zinc-400" />
          )}
          <FolderIcon className="h-3 w-3 shrink-0 text-zinc-400" />
          <span className="truncate text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            {repo.name}
          </span>
          <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
            {count}
          </span>
        </button>
        {isMultiRepo && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className={`shrink-0 rounded px-1 py-0.5 text-xs transition-opacity ${
              confirmRemove
                ? 'bg-red-500/20 text-red-400'
                : 'text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title={confirmRemove ? 'Click again to confirm' : 'Remove repository'}
          >
            {confirmRemove ? 'Remove?' : <XIcon className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Content items */}
      {isExpanded && activeTab === 'content' && (
        <div className={isMultiRepo ? 'pl-2' : ''}>
          {SECTION_TYPES.map((type) => (
            <PipelineSection
              key={type}
              type={type}
              items={groupedItems[type] ?? []}
              isExpanded={expandedSections.has(type)}
              onToggle={() => onToggleSection(type)}
              onItemSelect={onItemSelect}
              onCreateNew={onCreateNew}
              activeItemId={activeItemId}
              onStageChange={onStageChange}
            />
          ))}
        </div>
      )}

      {/* Branch items */}
      {isExpanded && activeTab === 'branches' && (
        <div className={isMultiRepo ? 'pl-2' : ''}>
          {filteredBranches.length === 0 ? (
            <div className="px-3 py-3 text-center">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">No matching branches</p>
            </div>
          ) : (
            filteredBranches.map((wt) => (
                <div
                  key={wt.path}
                  className="group flex cursor-pointer items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  onClick={() => onBranchSelect(wt)}
                  role="button"
                  tabIndex={0}
                >
                  <GitBranchIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
                      {wt.branch}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400 dark:text-zinc-500">
                      {wt.path.split('/').slice(-2).join('/')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteBranch(wt)
                    }}
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs transition-opacity ${
                      confirmDeleteBranch === wt.path
                        ? 'bg-red-500/20 text-red-400'
                        : 'text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    title={confirmDeleteBranch === wt.path ? 'Click again to confirm' : 'Delete worktree'}
                  >
                    {confirmDeleteBranch === wt.path ? 'Confirm?' : <XIcon className="h-3 w-3" />}
                  </button>
                </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
