import type { ContentStage, ContentType, PipelineItem } from '@/shared/types'

import {
  BlogIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  LinkedInIcon,
  NewsletterIcon,
  PlusIcon
} from './icons'
import { PipelineCard } from './pipeline-card'

const TYPE_LABELS: Record<ContentType, string> = {
  linkedin: 'LinkedIn',
  blog: 'Blog',
  newsletter: 'Newsletter',
  asset: 'Assets',
  unknown: 'Other'
}

const TYPE_ICON_COMPONENTS: Record<
  ContentType,
  React.FC<{ className?: string }>
> = {
  linkedin: LinkedInIcon,
  blog: BlogIcon,
  newsletter: NewsletterIcon,
  asset: FileIcon,
  unknown: FileIcon
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
  onStageChange
}: PipelineSectionProps) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
          ) : (
            <ChevronRightIcon className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
          )}
          <span className="flex h-4 w-4 items-center justify-center rounded bg-zinc-200 dark:bg-zinc-700">
            {(() => {
              const Icon = TYPE_ICON_COMPONENTS[type]
              return (
                <Icon className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
              )
            })()}
          </span>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {TYPE_LABELS[type]}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {items.length}
          </span>
        </button>
        <button
          onClick={e => {
            e.stopPropagation()
            onCreateNew(type)
          }}
          className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300"
          title={`New ${TYPE_LABELS[type]}`}
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Items */}
      {isExpanded && (
        <div>
          {items.length > 0 ? (
            items.map(item => (
              <PipelineCard
                key={item.id}
                item={item}
                isActive={item.id === activeItemId}
                onSelect={onItemSelect}
                onStageChange={onStageChange}
              />
            ))
          ) : (
            <div className="flex items-center gap-2 px-3 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <PlusIcon className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
                No items yet. Click + to create one.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
