import { useCallback, useEffect, useRef } from 'react'

import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from 'xterm'

export function useTerminal(containerRef: React.RefObject<HTMLDivElement | null>) {
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    const darkTheme = {
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
      brightWhite: '#ffffff',
    }

    const lightTheme = {
      background: '#fafafa',
      foreground: '#18181b',
      cursor: '#18181b',
      selectionBackground: '#d4d4d8',
      black: '#18181b',
      red: '#dc2626',
      green: '#16a34a',
      yellow: '#ca8a04',
      blue: '#2563eb',
      magenta: '#9333ea',
      cyan: '#0891b2',
      white: '#3f3f46',
      brightBlack: '#71717a',
      brightRed: '#ef4444',
      brightGreen: '#22c55e',
      brightYellow: '#eab308',
      brightBlue: '#3b82f6',
      brightMagenta: '#a855f7',
      brightCyan: '#06b6d4',
      brightWhite: '#09090b',
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: isDark ? darkTheme : lightTheme,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    let dataCleanup: (() => void) | undefined

    // Defer open() so the container has proper layout and CharSizeService
    // can measure character dimensions without throwing on undefined dimensions
    const rafId = requestAnimationFrame(() => {
      if (!containerRef.current) return

      terminal.open(containerRef.current)
      terminalRef.current = terminal
      fitAddonRef.current = fitAddon

      // Second RAF: fit after open() has finished rendering
      requestAnimationFrame(() => {
        try {
          fitAddon.fit()
        } catch {
          // ignore if container is already gone
        }
      })

      // Connect to PTY via preload bridge (may be unavailable outside Electron)
      const api = window.electronAPI?.terminal
      if (api) {
        dataCleanup = api.onData((data) => {
          terminal.write(data)
        })

        terminal.onData((data) => {
          api.sendInput(data)
        })

        api.resize(terminal.cols, terminal.rows)
      }
    })

    return () => {
      cancelAnimationFrame(rafId)
      dataCleanup?.()
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [containerRef])

  const fit = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current) {
      try {
        fitAddonRef.current.fit()
        window.electronAPI?.terminal.resize(
          terminalRef.current.cols,
          terminalRef.current.rows
        )
      } catch {
        // ignore transient fit errors
      }
    }
  }, [])

  return { fit }
}
