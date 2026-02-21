import type { ContentStage, PipelineItem } from '@/shared/types'

import { StageBadge } from './stage-badge'

interface PipelineCardProps {
  item: PipelineItem
  isActive: boolean
  onSelect: (item: PipelineItem) => void
  onStageChange: (item: PipelineItem, stage: ContentStage) => void
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length < 2) return dateStr
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  const month = monthNames[parseInt(parts[1], 10) - 1] ?? parts[1]
  const day = parts[2] ? parseInt(parts[2], 10) : ''
  return day ? `${month} ${day}` : month
}

export function PipelineCard({
  item,
  isActive,
  onSelect,
  onStageChange,
}: PipelineCardProps) {
  return (
    <button
      onClick={() => onSelect(item)}
      className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left transition-colors ${
        isActive
          ? 'border-blue-500 bg-zinc-800'
          : 'border-transparent hover:bg-zinc-700/50'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-zinc-200">{item.title}</p>
        {item.date && (
          <p className="mt-0.5 text-[10px] text-zinc-500">
            {formatDate(item.date)}
          </p>
        )}
      </div>
      <StageBadge
        stage={item.stage}
        onChange={(stage) => onStageChange(item, stage)}
      />
    </button>
  )
}
