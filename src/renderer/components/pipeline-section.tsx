import { useState } from 'react'

import type { ContentStage, ContentType, PipelineItem } from '@/shared/types'

import { ContentFileTree } from './content-file-tree'
import {
  BlogIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  LinkedInIcon,
  NewsletterIcon,
  PlusIcon
} from './icons'
import { StageBadge } from './stage-badge'

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

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length < 2) return dateStr
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  const month = monthNames[parseInt(parts[1], 10) - 1] ?? parts[1]
  const day = parts[2] ? parseInt(parts[2], 10) : ''
  return day ? `${month} ${day}` : month
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
  onFileSelect?: (
    item: PipelineItem,
    path: string,
    relativePath: string,
    contentType: ContentType
  ) => void
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
  onFileSelect
}: PipelineSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set())

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const Icon = TYPE_ICON_COMPONENTS[type]

  return (
    <div>
      {/* Section header — content type */}
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
            <Icon className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
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

      {/* Items — nested with tree guide line */}
      {isExpanded && (
        <div className="ml-[18px] border-l border-zinc-200 dark:border-zinc-700/70">
          {items.length > 0 ? (
            items.map((item, i) => {
              const isItemExpanded = expandedItems.has(item.id)
              const isActive = item.id === activeItemId
              const isLast = i === items.length - 1

              return (
                <div key={item.id}>
                  {/* Item row with tree connector */}
                  <div
                    className={`group flex items-center cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-zinc-100 dark:bg-zinc-800'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    {/* Tree connector: ├── or └── */}
                    <span className="relative flex h-8 w-4 shrink-0 items-center">
                      <span className="absolute left-0 top-1/2 h-px w-3 bg-zinc-200 dark:bg-zinc-700/70" />
                      {!isLast && (
                        <span className="absolute left-0 top-1/2 h-full w-px bg-zinc-200 dark:bg-zinc-700/70" />
                      )}
                    </span>

                    {/* Expand chevron */}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        toggleItem(item.id)
                      }}
                      className="flex h-5 w-4 shrink-0 items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {isItemExpanded ? (
                        <ChevronDownIcon className="h-2.5 w-2.5" />
                      ) : (
                        <ChevronRightIcon className="h-2.5 w-2.5" />
                      )}
                    </button>

                    {/* Item content — click to select */}
                    <div
                      className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2"
                      onClick={() => onItemSelect(item)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-xs ${
                          isActive
                            ? 'text-zinc-900 dark:text-white font-medium'
                            : 'text-zinc-700 dark:text-zinc-200'
                        }`}>
                          {item.title || `${TYPE_LABELS[item.type]} — ${item.date}`}
                        </p>
                        {item.date && item.title && (
                          <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                            {formatDate(item.date)}
                          </p>
                        )}
                      </div>
                      <StageBadge
                        stage={item.stage}
                        onChange={stage => onStageChange(item, stage)}
                      />
                    </div>
                  </div>

                  {/* File tree — nested under item with continuation line */}
                  {isItemExpanded && (
                    <div className={`ml-4 ${!isLast ? 'border-l border-zinc-200 dark:border-zinc-700/70' : ''}`}>
                      <ContentFileTree
                        contentDir={
                          item.worktreePath
                            ? `${item.worktreePath}/content/${item.id}`
                            : item.contentDir
                        }
                        onFileSelect={(path, relativePath, contentType) => {
                          onFileSelect?.(item, path, relativePath, contentType)
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="flex items-center gap-2 px-3 py-3">
              <span className="relative flex h-6 w-4 shrink-0 items-center">
                <span className="absolute left-0 top-1/2 h-px w-3 bg-zinc-200 dark:bg-zinc-700/70" />
              </span>
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
