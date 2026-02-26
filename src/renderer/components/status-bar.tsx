import { useEffect, useState } from 'react'

import type { ParsedEvent } from '@/shared/types'

export function StatusBar() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [cost, setCost] = useState(0)
  const [tokens, setTokens] = useState(0)

  useEffect(() => {
    const api = window.electronAPI?.terminal
    if (!api) return

    const cleanup = api.onParsed((_tabId: string, event: ParsedEvent) => {
      switch (event.type) {
        case 'session-id':
          setSessionId(String(event.data.sessionId))
          break
        case 'token-cost':
          if (event.data.tokens !== undefined) {
            setTokens(Number(event.data.tokens))
          }
          if (event.data.cost !== undefined) {
            setCost(Number(event.data.cost))
          }
          break
      }
    })

    return cleanup
  }, [])

  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-zinc-400 dark:text-zinc-500">
      <span>Session: {sessionId ?? '—'}</span>
      <div className="flex gap-4">
        <span>Cost: ${cost.toFixed(2)}</span>
        <span>{tokens.toLocaleString()} tokens</span>
      </div>
    </div>
  )
}
