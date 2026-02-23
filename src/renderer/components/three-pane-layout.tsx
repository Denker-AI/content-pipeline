import type { ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'

interface ThreePaneLayoutProps {
  left: ReactNode
  middle: ReactNode
  right: ReactNode
}

export function ThreePaneLayout({ left, middle, right }: ThreePaneLayoutProps) {
  const [leftPct, setLeftPct] = useState(18)
  const [rightPct, setRightPct] = useState(40)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleLeftDivider = useCallback(() => {
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setLeftPct(Math.max(12, Math.min(35, pct)))
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  const handleRightDivider = useCallback(() => {
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      const fromRight = 100 - pct
      setRightPct(Math.max(20, Math.min(60, fromRight)))
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  const middlePct = 100 - leftPct - rightPct

  return (
    <div ref={containerRef} className="flex h-full w-full">
      <div style={{ width: `${leftPct}%` }} className="h-full shrink-0 overflow-hidden">
        {left}
      </div>
      <div
        onMouseDown={handleLeftDivider}
        className="w-1 shrink-0 cursor-col-resize bg-zinc-700 transition-colors hover:bg-zinc-500"
      />
      <div style={{ width: `${middlePct}%` }} className="h-full overflow-hidden">
        {middle}
      </div>
      <div
        onMouseDown={handleRightDivider}
        className="w-1 shrink-0 cursor-col-resize bg-zinc-700 transition-colors hover:bg-zinc-500"
      />
      <div style={{ width: `${rightPct}%` }} className="h-full overflow-hidden">
        {right}
      </div>
    </div>
  )
}
