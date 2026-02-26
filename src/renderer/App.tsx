import { useCallback, useEffect, useRef, useState } from 'react'

import type { ContentStage, ContentType, PipelineItem } from '@/shared/types'

import { PipelineSidebar } from './components/pipeline-sidebar'
import { PreviewPane } from './components/preview-pane'
import { SettingsPanel } from './components/settings-panel'
import { StatusBar } from './components/status-bar'
import type { Tab } from './components/tab-bar'
import { TabBar } from './components/tab-bar'
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

const STARTER_PROMPTS: Record<string, string> = {
  linkedin: 'Create a LinkedIn post about ',
  blog: 'Write a blog post about ',
  newsletter: 'Create a newsletter about ',
}

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  // Track which tabs are newly created (need starter prompt)
  const pendingPromptsRef = useRef<Set<string>>(new Set())

  // Derive active item from the active tab
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null
  const activeItem = activeTab?.pipelineItem ?? null

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

  // Open a tab for a pipeline item (or focus if already open)
  const openTab = useCallback(
    async (item: PipelineItem, isNew = false) => {
      const existingTab = tabs.find((t) => t.id === item.id)
      if (existingTab) {
        // Already open — just focus it
        setActiveTabId(existingTab.id)
        // Still activate for file watcher
        await window.electronAPI?.pipeline.activateContent(item)
        return
      }

      // Create a new tab
      const newTab: Tab = { id: item.id, pipelineItem: item }
      setTabs((prev) => [...prev, newTab])
      setActiveTabId(newTab.id)

      // Create PTY for this tab
      const cwd =
        item.worktreePath || item.contentDir || process.env.HOME || '/'
      await window.electronAPI?.terminal.createTab(newTab.id, cwd)

      // Activate content for file watcher
      await window.electronAPI?.pipeline.activateContent(item)

      // Type starter prompt for newly created content
      if (isNew) {
        pendingPromptsRef.current.add(newTab.id)
      }
    },
    [tabs],
  )

  // Type starter prompts after PTY is ready (short delay for shell init)
  useEffect(() => {
    if (pendingPromptsRef.current.size === 0) return

    const pending = new Set(pendingPromptsRef.current)
    pendingPromptsRef.current.clear()

    for (const tabId of pending) {
      const tab = tabs.find((t) => t.id === tabId)
      if (!tab) continue

      const prompt = STARTER_PROMPTS[tab.pipelineItem.type]
      if (prompt) {
        // Delay to let the shell initialize
        setTimeout(() => {
          window.electronAPI?.terminal.sendInput(tabId, prompt)
        }, 500)
      }
    }
  }, [tabs])

  // Close a tab
  const closeTab = useCallback(
    (tabId: string) => {
      const tabIndex = tabs.findIndex((t) => t.id === tabId)

      // Destroy PTY
      window.electronAPI?.terminal.closeTab(tabId)

      setTabs((prev) => prev.filter((t) => t.id !== tabId))

      // If closing the active tab, switch to a neighbor
      if (activeTabId === tabId) {
        const remaining = tabs.filter((t) => t.id !== tabId)
        if (remaining.length > 0) {
          const nextIndex = Math.min(tabIndex, remaining.length - 1)
          const nextTab = remaining[nextIndex]
          setActiveTabId(nextTab.id)
          window.electronAPI?.pipeline.activateContent(nextTab.pipelineItem)
        } else {
          setActiveTabId(null)
        }
      }
    },
    [tabs, activeTabId],
  )

  // Switch active tab
  const switchTab = useCallback(
    async (tabId: string) => {
      setActiveTabId(tabId)
      const tab = tabs.find((t) => t.id === tabId)
      if (tab) {
        await window.electronAPI?.pipeline.activateContent(tab.pipelineItem)
      }
    },
    [tabs],
  )

  // Sidebar item select — open/focus tab
  const handleItemSelect = useCallback(
    (item: PipelineItem) => {
      openTab(item, false)
    },
    [openTab],
  )

  // Sidebar create — create content and open tab
  const handleItemCreated = useCallback(
    (item: PipelineItem) => {
      openTab(item, true)
    },
    [openTab],
  )

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
              onItemCreated={handleItemCreated}
              onOpenProject={openProject}
              hasProject={!!contentDir}
            />
          }
          middle={
            <div className="flex h-full flex-col">
              {/* Tab bar */}
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onSelect={switchTab}
                onClose={closeTab}
              />

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

              {/* Terminal — one per tab, show/hide based on active */}
              <div className="relative min-h-0 flex-1">
                {tabs.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-zinc-400 dark:text-zinc-500">
                      Create or select content from the sidebar to start
                    </p>
                  </div>
                ) : (
                  tabs.map((tab) => (
                    <div
                      key={tab.id}
                      className={`absolute inset-0 ${
                        tab.id === activeTabId ? '' : 'pointer-events-none invisible'
                      }`}
                    >
                      <TerminalPane tabId={tab.id} />
                    </div>
                  ))
                )}
              </div>
            </div>
          }
          right={
            <PreviewPane
              activeContentDir={activeContentDir}
              activeContentType={activeContentType}
              activeTabId={activeTabId}
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
