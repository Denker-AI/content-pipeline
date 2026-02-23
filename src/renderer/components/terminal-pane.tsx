import { useEffect, useRef } from 'react'

import { useTerminal } from '../hooks/use-terminal'

import 'xterm/css/xterm.css'

export function TerminalPane() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { fit } = useTerminal(containerRef)

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      try {
        fit()
      } catch {
        // ignore transient fit errors during layout changes
      }
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [fit])

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-zinc-50 dark:bg-zinc-950"
    />
  )
}
