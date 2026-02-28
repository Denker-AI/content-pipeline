import { useCallback, useEffect, useRef, useState } from 'react'

import { FRAME_PRESETS } from './size-presets'

interface FrameSelectorProps {
  initialPresetIdx: number
  contentWidth: number
  contentHeight: number
  scale: number
  onConfirm: (x: number, y: number, presetIdx: number) => void
  onCancel: () => void
}

export function FrameSelector({
  initialPresetIdx,
  contentWidth,
  contentHeight,
  scale,
  onConfirm,
  onCancel
}: FrameSelectorProps) {
  const [presetIdx, setPresetIdx] = useState(initialPresetIdx)
  const frame = FRAME_PRESETS[presetIdx]
  const frameWidth = frame.width
  const frameHeight = frame.height

  // Position in content-space coordinates
  const [pos, setPos] = useState(() => ({
    x: Math.max(0, Math.round((contentWidth - frameWidth) / 2)),
    y: Math.max(0, Math.round((contentHeight - frameHeight) / 2))
  }))
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Clamp helper — keeps frame within content bounds
  const clampPos = useCallback(
    (x: number, y: number, fw: number, fh: number) => ({
      x: Math.max(0, Math.min(x, Math.max(0, contentWidth - fw))),
      y: Math.max(0, Math.min(y, Math.max(0, contentHeight - fh)))
    }),
    [contentWidth, contentHeight]
  )

  // When preset changes, keep the top-left corner fixed (content stays in place)
  const handlePresetChange = useCallback(
    (newIdx: number) => {
      const newFrame = FRAME_PRESETS[newIdx]
      setPresetIdx(newIdx)
      // Keep top-left anchored, just clamp so it doesn't go out of bounds
      setPos(prev => clampPos(prev.x, prev.y, newFrame.width, newFrame.height))
    },
    [clampPos]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragging.current = true
      dragOffset.current = {
        x: e.clientX - pos.x * scale,
        y: e.clientY - pos.y * scale
      }
    },
    [pos, scale]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const newX = (e.clientX - dragOffset.current.x) / scale
      const newY = (e.clientY - dragOffset.current.y) / scale
      setPos(clampPos(Math.round(newX), Math.round(newY), frameWidth, frameHeight))
    }
    const handleMouseUp = () => {
      dragging.current = false
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [scale, clampPos, frameWidth, frameHeight])

  // Scaled dimensions for display
  const scaledFrameW = frameWidth * scale
  const scaledFrameH = frameHeight * scale
  const scaledX = pos.x * scale
  const scaledY = pos.y * scale

  return (
    <div
      className="absolute inset-0 z-30"
      style={{ pointerEvents: 'none' }}
    >
      {/* Semi-transparent mask */}
      <div
        className="absolute inset-0 bg-black/50"
        style={{
          clipPath: `polygon(
            0% 0%, 100% 0%, 100% 100%, 0% 100%,
            0% 0%,
            ${scaledX}px ${scaledY}px,
            ${scaledX}px ${scaledY + scaledFrameH}px,
            ${scaledX + scaledFrameW}px ${scaledY + scaledFrameH}px,
            ${scaledX + scaledFrameW}px ${scaledY}px,
            ${scaledX}px ${scaledY}px
          )`
        }}
      />

      {/* Draggable frame window */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute cursor-move ring-2 ring-blue-500"
        style={{
          pointerEvents: 'auto',
          left: scaledX,
          top: scaledY,
          width: scaledFrameW,
          height: scaledFrameH
        }}
      >
        {/* Label */}
        <div className="absolute -top-6 left-0 rounded bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white shadow whitespace-nowrap">
          {frameWidth}x{frameHeight} — {frame.name} {frame.label}
        </div>

        {/* Corner handles */}
        {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(corner => (
          <div
            key={corner}
            className="absolute h-2 w-2 rounded-sm bg-blue-500"
            style={{
              ...(corner.includes('top') ? { top: -3 } : { bottom: -3 }),
              ...(corner.includes('left') ? { left: -3 } : { right: -3 })
            }}
          />
        ))}
      </div>

      {/* Action bar — button-based preset selector (no native <select>) */}
      <div
        className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Preset buttons */}
        <div className="flex items-center gap-1 rounded-lg bg-zinc-800/90 p-1 shadow-lg">
          {FRAME_PRESETS.map((fp, i) => (
            <button
              key={fp.name}
              onClick={() => handlePresetChange(i)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                i === presetIdx
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {fp.label}
            </button>
          ))}
        </div>
        {/* Confirm / cancel */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onConfirm(pos.x, pos.y, presetIdx)}
            className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow hover:bg-blue-500"
          >
            Capture
          </button>
          <button
            onClick={onCancel}
            className="rounded bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 shadow hover:bg-zinc-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
