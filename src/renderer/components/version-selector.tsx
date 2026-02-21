import type { ContentVersion } from '@/shared/types'

interface VersionSelectorProps {
  versions: ContentVersion[]
  currentPath: string
  onSelect: (version: ContentVersion) => void
}

export function VersionSelector({
  versions,
  currentPath,
  onSelect,
}: VersionSelectorProps) {
  if (versions.length === 0) return null

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-zinc-700 px-3 py-1.5">
      <span className="mr-2 text-xs text-zinc-500">Version:</span>
      {versions.map((version) => {
        const isActive = version.path === currentPath
        return (
          <button
            key={version.path}
            onClick={() => onSelect(version)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            } ${version.isFinal ? 'font-bold' : ''}`}
          >
            {version.label}
          </button>
        )
      })}
    </div>
  )
}
