import type { DetectedComponent } from '@/shared/types'

interface ComponentCardProps {
  component: DetectedComponent
  onPreview: (component: DetectedComponent) => void
}

export function ComponentCard({ component, onPreview }: ComponentCardProps) {
  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-zinc-900 dark:text-white">
            {component.name}
          </h3>
          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {component.path}
          </p>
        </div>
        <button
          onClick={() => onPreview(component)}
          className="ml-2 shrink-0 rounded bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-500"
        >
          Preview
        </button>
      </div>
    </div>
  )
}
