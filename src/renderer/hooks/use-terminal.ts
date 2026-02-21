import { useCallback, useEffect, useRef } from 'react'

import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from 'xterm'

export function useTerminal(containerRef: React.RefObject<HTMLDivElement | null>) {
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#09090b',
        foreground: '#fafafa',
        cursor: '#fafafa',
        selectionBackground: '#3f3f46',
        black: '#09090b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#fafafa',
        brightBlack: '#71717a',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      }
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(containerRef.current)
    fitAddon.fit()

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // Connect to PTY via preload bridge
    const cleanup = window.electronAPI.terminal.onData((data) => {
      terminal.write(data)
    })

    terminal.onData((data) => {
      window.electronAPI.terminal.sendInput(data)
    })

    // Send initial size
    window.electronAPI.terminal.resize(terminal.cols, terminal.rows)

    return () => {
      cleanup()
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [containerRef])

  const fit = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current) {
      fitAddonRef.current.fit()
      window.electronAPI.terminal.resize(
        terminalRef.current.cols,
        terminalRef.current.rows
      )
    }
  }, [])

  return { fit }
}
