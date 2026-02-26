import type { ContentStage, ContentType, PipelineItem } from '@/shared/types'

import { PipelineCard } from './pipeline-card'

const TYPE_LABELS: Record<ContentType, string> = {
  linkedin: 'LinkedIn',
  blog: 'Blog',
  newsletter: 'Newsletter',
  asset: 'Assets',
  unknown: 'Other',
}

const TYPE_ICONS: Record<ContentType, string> = {
  linkedin: 'in',
  blog: 'B',
  newsletter: 'N',
  asset: 'A',
  unknown: '?',
}

interface PipelineSectionProps {
  type: ContentType
  items: PipelineItem[]
  isExpanded: boolean
  onToggle: () => void
  onItemSelect: (item: PipelineItem) => void
  onCreateNew: (type: ContentType) => void | Promise<void>
  activeItemId: string | null
  onStageChange: (item: PipelineItem, stage: ContentStage) => void
}

export function PipelineSection({
  type,
  items,
  isExpanded,
  onToggle,
  onItemSelect,
  onCreateNew,
  activeItemId,
  onStageChange,
}: PipelineSectionProps) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span
            className={`text-[10px] text-zinc-400 dark:text-zinc-500 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          >
            &#9654;
          </span>
          <span className="flex h-4 w-4 items-center justify-center rounded bg-zinc-200 dark:bg-zinc-700 text-[9px] font-bold text-zinc-600 dark:text-zinc-300">
            {TYPE_ICONS[type]}
          </span>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {TYPE_LABELS[type]}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{items.length}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCreateNew(type)
          }}
          className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300"
          title={`New ${TYPE_LABELS[type]}`}
        >
          <span className="text-sm leading-none">+</span>
        </button>
      </div>

      {/* Items */}
      {isExpanded && (
        <div>
          {items.length > 0 ? (
            items.map((item) => (
              <PipelineCard
                key={item.id}
                item={item}
                isActive={item.id === activeItemId}
                onSelect={onItemSelect}
                onStageChange={onStageChange}
              />
            ))
          ) : (
            <p className="px-3 py-2 text-[10px] text-zinc-400 dark:text-zinc-600">
              No items yet
            </p>
          )}
        </div>
      )}
    </div>
  )
}
