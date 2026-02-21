import type { ContentType, PipelineItem } from '@/shared/types'

import { usePipeline } from '../hooks/use-pipeline'

import { PipelineSection } from './pipeline-section'

const SECTION_TYPES: ContentType[] = ['linkedin', 'blog', 'newsletter']

interface PipelineSidebarProps {
  onItemSelect: (item: PipelineItem) => void
  onOpenProject: () => void
  hasProject: boolean
}

export function PipelineSidebar({
  onItemSelect,
  onOpenProject,
  hasProject,
}: PipelineSidebarProps) {
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

  const handleSelect = (item: PipelineItem) => {
    activateItem(item)
    onItemSelect(item)
  }

  if (!hasProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <p className="text-xs text-zinc-500">No project open</p>
        <button
          onClick={onOpenProject}
          className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500"
        >
          Open Project
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-zinc-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="shrink-0 border-b border-zinc-700 p-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search content..."
          className="w-full rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

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
            onCreateNew={createContent}
            activeItemId={activeItemId}
            onStageChange={updateStage}
          />
        ))}
      </div>
    </div>
  )
}
