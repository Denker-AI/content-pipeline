import { useCallback, useEffect, useState } from 'react'

import type { ContentType, PipelineItem } from '@/shared/types'

import { PipelineSidebar } from './components/pipeline-sidebar'
import { PreviewPane } from './components/preview-pane'
import { SettingsPanel } from './components/settings-panel'
import { StatusBar } from './components/status-bar'
import { TerminalPane } from './components/terminal-pane'
import { ThreePaneLayout } from './components/three-pane-layout'
import { useContent } from './hooks/use-content'


export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeContentDir, setActiveContentDir] = useState<string | undefined>()
  const [activeContentType, setActiveContentType] = useState<ContentType | undefined>()

  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  const {
    selectedItem,
    fileContent,
    renderMode,
    versions,
    loading,
    contentDir,
    refreshCount,
    selectVersion,
    openProject,
  } = useContent(activeContentDir)

  const handleItemSelect = useCallback((item: PipelineItem) => {
    setActiveContentDir(item.contentDir)
    setActiveContentType(item.type)
  }, [])

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
        <ThreePaneLayout
          left={
            <PipelineSidebar
              onItemSelect={handleItemSelect}
              onOpenProject={openProject}
              hasProject={!!contentDir}
            />
          }
          middle={<TerminalPane />}
          right={
            <PreviewPane
              activeContentDir={activeContentDir}
              activeContentType={activeContentType}
              selectedItem={selectedItem}
              fileContent={fileContent}
              renderMode={renderMode}
              versions={versions}
              loading={loading}
              contentDir={contentDir}
              refreshCount={refreshCount}
              selectVersion={selectVersion}
              openProject={openProject}
            />
          }
        />
      </div>
      <StatusBar />
      <SettingsPanel isOpen={settingsOpen} onClose={closeSettings} />
    </div>
  )
}
