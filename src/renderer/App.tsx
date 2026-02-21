import { useCallback, useEffect, useState } from 'react'

import { PreviewPane } from './components/preview-pane'
import { SettingsPanel } from './components/settings-panel'
import { SplitPane } from './components/split-pane'
import { StatusBar } from './components/status-bar'
import { TerminalPane } from './components/terminal-pane'

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  // Listen for settings:open from the application menu
  useEffect(() => {
    const cleanup = window.electronAPI?.settings?.onOpen(openSettings)
    return cleanup
  }, [openSettings])

  // Keyboard shortcut: Cmd+, (Mac) or Ctrl+, (others)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSettingsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <div className="flex-1 overflow-hidden">
        <SplitPane left={<TerminalPane />} right={<PreviewPane />} />
      </div>
      <StatusBar />
      <SettingsPanel isOpen={settingsOpen} onClose={closeSettings} />
    </div>
  )
}
