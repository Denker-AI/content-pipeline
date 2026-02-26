import { useEffect, useRef } from 'react'

import { useTerminal } from '../hooks/use-terminal'

import 'xterm/css/xterm.css'

interface TerminalPaneProps {
  tabId: string | null
}

export function TerminalPane({ tabId }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { fit } = useTerminal(containerRef, tabId)

  // Debounced resize observer to prevent scroll jumping during streaming
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        try {
          fit()
        } catch {
          // ignore transient fit errors during layout changes
        }
      }, 50)
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [fit])

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-zinc-50 dark:bg-zinc-950"
    />
  )
}
