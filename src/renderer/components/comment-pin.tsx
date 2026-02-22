interface CommentPinProps {
  number: number
  x: number // percentage 0-100
  y: number // percentage 0-100
  active?: boolean
  onClick?: () => void
}

export function CommentPin({ number, x, y, active, onClick }: CommentPinProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={`absolute z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold shadow-lg transition-transform ${
        active
          ? 'scale-125 bg-blue-500 text-white ring-2 ring-blue-300'
          : 'bg-red-500 text-white hover:scale-110'
      }`}
      style={{ left: `${x}%`, top: `${y}%` }}
      title={`Comment #${number}`}
    >
      {number}
    </button>
  )
}
