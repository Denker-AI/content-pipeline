import { useEffect, useRef, useState } from 'react'

import type { ContentStage } from '@/shared/types'

import { CheckIcon } from './icons'

const STAGE_COLORS: Record<ContentStage, string> = {
  idea: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-600 dark:text-zinc-200',
  draft: 'bg-yellow-600/20 text-yellow-400',
  review: 'bg-orange-600/20 text-orange-400',
  final: 'bg-blue-600/20 text-blue-400',
  scheduled: 'bg-purple-600/20 text-purple-400',
  published: 'bg-green-600/20 text-green-400'
}

const ALL_STAGES: ContentStage[] = [
  'idea',
  'draft',
  'review',
  'final',
  'scheduled',
  'published'
]

interface StageBadgeProps {
  stage: ContentStage
  onChange: (stage: ContentStage) => void
}

export function StageBadge({ stage, onChange }: StageBadgeProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => {
          e.stopPropagation()
          setOpen(prev => !prev)
        }}
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STAGE_COLORS[stage]}`}
      >
        {stage}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-28 rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 py-1 shadow-lg">
          {ALL_STAGES.map(s => (
            <button
              key={s}
              onClick={e => {
                e.stopPropagation()
                onChange(s)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 px-3 py-1 text-left text-xs capitalize hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
                s === stage
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {s === stage && <CheckIcon className="h-3 w-3 text-blue-400" />}
              <span className={s === stage ? '' : 'ml-5'}>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
