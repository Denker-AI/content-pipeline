import type { ContentType, PipelineItem } from '@/shared/types'

const TYPE_COLORS: Record<string, string> = {
  linkedin: 'bg-blue-600/20 text-blue-500 dark:text-blue-400',
  blog: 'bg-green-600/20 text-green-600 dark:text-green-400',
  newsletter: 'bg-purple-600/20 text-purple-600 dark:text-purple-400',
}

const TYPE_ICONS: Record<ContentType, string> = {
  linkedin: 'in',
  blog: 'B',
  newsletter: 'N',
  asset: 'A',
  unknown: '?',
}

export interface Tab {
  id: string
  pipelineItem: PipelineItem
}

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string | null
  onSelect: (tabId: string) => void
  onClose: (tabId: string) => void
}

export function TabBar({ tabs, activeTabId, onSelect, onClose }: TabBarProps) {
  if (tabs.length === 0) return null

  return (
    <div className="flex shrink-0 items-center gap-0 overflow-x-auto border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const type = tab.pipelineItem.type
        return (
          <div
            key={tab.id}
            className={`group flex shrink-0 cursor-pointer items-center gap-1.5 border-r border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs transition-colors ${
              isActive
                ? 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300'
            }`}
            onClick={() => onSelect(tab.id)}
          >
            <span
              className={`flex h-3.5 w-3.5 items-center justify-center rounded text-[8px] font-bold ${
                TYPE_COLORS[type] ?? 'bg-zinc-200 text-zinc-500'
              }`}
            >
              {TYPE_ICONS[type]}
            </span>
            <span className="max-w-[120px] truncate">
              {tab.pipelineItem.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose(tab.id)
              }}
              className="ml-1 flex h-4 w-4 items-center justify-center rounded text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-200 hover:text-zinc-600 group-hover:opacity-100 dark:hover:bg-zinc-600 dark:hover:text-zinc-200"
              title="Close tab"
            >
              x
            </button>
          </div>
        )
      })}
    </div>
  )
}
