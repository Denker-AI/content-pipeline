import { useCallback, useEffect, useState } from 'react'

import type { ContentStage, ContentType, PipelineItem } from '@/shared/types'

import { PipelineSidebar } from './components/pipeline-sidebar'
import { PreviewPane } from './components/preview-pane'
import { SettingsPanel } from './components/settings-panel'
import { StatusBar } from './components/status-bar'
import { TerminalPane } from './components/terminal-pane'
import { ThreePaneLayout } from './components/three-pane-layout'
import { useContent } from './hooks/use-content'


const TYPE_COLORS: Record<string, string> = {
  linkedin: 'bg-blue-600/15 text-blue-400',
  blog: 'bg-green-600/15 text-green-400',
  newsletter: 'bg-purple-600/15 text-purple-400',
}

const STAGE_COLORS: Record<ContentStage, string> = {
  idea: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-600 dark:text-zinc-200',
  draft: 'bg-yellow-600/20 text-yellow-400',
  review: 'bg-orange-600/20 text-orange-400',
  final: 'bg-blue-600/20 text-blue-400',
  scheduled: 'bg-purple-600/20 text-purple-400',
  published: 'bg-green-600/20 text-green-400',
}

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeItem, setActiveItem] = useState<PipelineItem | null>(null)

  const activeContentDir = activeItem?.contentDir
  const activeContentType = activeItem?.type as ContentType | undefined

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
    setActiveItem(item)
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
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="flex-1 overflow-hidden">
        <ThreePaneLayout
          left={
            <PipelineSidebar
              onItemSelect={handleItemSelect}
              onOpenProject={openProject}
              hasProject={!!contentDir}
            />
          }
          middle={
            <div className="flex h-full flex-col">
              {/* Active content context strip */}
              <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5">
                {activeItem ? (
                  <>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${TYPE_COLORS[activeItem.type] ?? 'bg-zinc-200 text-zinc-500'}`}>
                      {activeItem.type}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      {activeItem.title}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STAGE_COLORS[activeItem.stage]}`}>
                      {activeItem.stage}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    No content selected — pick one from the sidebar
                  </span>
                )}
              </div>
              <div className="min-h-0 flex-1">
                <TerminalPane />
              </div>
            </div>
          }
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
