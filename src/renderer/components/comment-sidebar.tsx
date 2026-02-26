import type { AnnotationComment } from '@/shared/types'

interface CommentSidebarProps {
  comments: AnnotationComment[]
  selectedCommentId: string | null
  onSelectComment: (id: string | null) => void
  onResolve: (id: string) => void
  onDelete: (id: string) => void
  onClearAll: () => void
  onSendToClaude: () => void
}

export function CommentSidebar({
  comments,
  selectedCommentId,
  onSelectComment,
  onResolve,
  onDelete,
  onClearAll,
  onSendToClaude,
}: CommentSidebarProps) {
  const activeComments = comments.filter((c) => !c.resolved)
  const resolvedComments = comments.filter((c) => c.resolved)

  return (
    <div className="flex w-64 shrink-0 flex-col border-l border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-3 py-2">
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          Comments ({activeComments.length})
        </span>
        {comments.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-auto thin-scrollbar">
        {activeComments.length === 0 && resolvedComments.length === 0 && (
          <div className="p-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Click on the preview to add comments
          </div>
        )}

        {activeComments.map((comment) => (
          <div
            key={comment.id}
            onClick={() => onSelectComment(comment.id)}
            className={`cursor-pointer border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 transition-colors ${
              selectedCommentId === comment.id
                ? 'bg-zinc-100 dark:bg-zinc-800'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {comment.pinNumber}
              </span>
              <div className="min-w-0 flex-1">
                {comment.nearText && (
                  <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                    Near &quot;{comment.nearText}&quot;
                  </p>
                )}
                <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-200">{comment.text}</p>
              </div>
            </div>
            <div className="mt-1.5 flex justify-end gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onResolve(comment.id)
                }}
                className="rounded px-1.5 py-0.5 text-xs text-green-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                title="Resolve"
              >
                Resolve
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(comment.id)
                }}
                className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                title="Delete"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Resolved section */}
        {resolvedComments.length > 0 && (
          <div className="border-t border-zinc-200 dark:border-zinc-700">
            <div className="px-3 py-1.5 text-xs text-zinc-400 dark:text-zinc-500">
              Resolved ({resolvedComments.length})
            </div>
            {resolvedComments.map((comment) => (
              <div
                key={comment.id}
                className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 opacity-50"
              >
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-600 text-xs font-bold text-zinc-600 dark:text-zinc-300 line-through">
                    {comment.pinNumber}
                  </span>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 line-through">
                    {comment.text}
                  </p>
                </div>
                <div className="mt-1 flex justify-end">
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="rounded px-1.5 py-0.5 text-xs text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send to Claude button */}
      {activeComments.length > 0 && (
        <div className="border-t border-zinc-200 dark:border-zinc-700 p-3">
          <button
            onClick={onSendToClaude}
            className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Send to Claude
          </button>
        </div>
      )}
    </div>
  )
}
