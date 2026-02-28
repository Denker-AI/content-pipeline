import { useCallback, useEffect, useRef, useState } from 'react'

import type { ContentType, PipelineItem, WorktreeInfo } from '@/shared/types'

import { ClaudeIcon, GitBranchIcon } from './components/icons'
import { OnboardingWizard } from './components/onboarding-wizard'
import { PipelineSidebar } from './components/pipeline-sidebar'
import { PreviewPane } from './components/preview-pane'
import { SettingsPanel } from './components/settings-panel'
import type { Tab } from './components/tab-bar'
import { TabBar } from './components/tab-bar'
import { TerminalPane } from './components/terminal-pane'
import { ThreePaneLayout } from './components/three-pane-layout'
import { useContent } from './hooks/use-content'
import { useTheme } from './hooks/use-theme'

const STARTER_PROMPTS: Record<string, string> = {
  linkedin: 'Create a LinkedIn post about ',
  blog: 'Write a blog post about ',
  newsletter: 'Create a newsletter about '
}

export function App() {
  useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  // Active content item — independent of terminal tabs (set by content click or tab switch)
  const [activeItem, setActiveItem] = useState<PipelineItem | null>(null)

  // Track which tabs are newly created (need starter prompt)
  const pendingPromptsRef = useRef<Set<string>>(new Set())

  // When content lives in a worktree, read from the worktree's content dir
  const activeContentDir = activeItem
    ? activeItem.worktreePath
      ? `${activeItem.worktreePath}/content/${activeItem.id}`
      : activeItem.contentDir
    : undefined
  const activeContentType = activeItem?.type as ContentType | undefined

  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  const {
    selectedItem,
    fileContent,
    renderMode,
    versions,
    loading,
    projectRoot,
    contentDir,
    refreshCount,
    selectFile,
    selectVersion,
    openProject
  } = useContent(activeContentDir)

  // Derive project name from the active item's content path (works across repos)
  // Falls back to app name when no item is active
  const projectName = (() => {
    if (activeItem?.contentDir) {
      const contentIdx = activeItem.contentDir.indexOf('/content/')
      if (contentIdx >= 0) {
        const repoPath = activeItem.contentDir.slice(0, contentIdx)
        return repoPath.split('/').pop() ?? ''
      }
    }
    return 'Content Pipeline'
  })()

  // Open a tab for a pipeline item (or focus if already open)
  const openTab = useCallback(
    async (item: PipelineItem, isNew = false) => {
      setActiveItem(item)

      const existingTab = tabs.find(t => t.id === item.id)
      if (existingTab) {
        // Already open — just focus it
        setActiveTabId(existingTab.id)
        // Still activate for file watcher
        await window.electronAPI?.pipeline.activateContent(item)
        return
      }

      // Create a new tab
      const newTab: Tab = { id: item.id, pipelineItem: item }
      setTabs(prev => [...prev, newTab])
      setActiveTabId(newTab.id)

      // Create PTY — prefer worktree path, fall back to content dir or project root
      const cwd = item.worktreePath || item.contentDir
      await window.electronAPI?.terminal.createTab(newTab.id, cwd || '/')

      // Activate content for file watcher
      await window.electronAPI?.pipeline.activateContent(item)

      // Type starter prompt for newly created content
      if (isNew) {
        pendingPromptsRef.current.add(newTab.id)
      }
    },
    [tabs]
  )

  // Type starter prompts after PTY is ready (short delay for shell init)
  useEffect(() => {
    if (pendingPromptsRef.current.size === 0) return

    const pending = new Set(pendingPromptsRef.current)
    pendingPromptsRef.current.clear()

    for (const tabId of pending) {
      const tab = tabs.find(t => t.id === tabId)
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
    async (tabId: string) => {
      const tabIndex = tabs.findIndex(t => t.id === tabId)

      // Destroy PTY (await to ensure cleanup completes before state updates)
      await window.electronAPI?.terminal.closeTab(tabId)

      setTabs(prev => prev.filter(t => t.id !== tabId))

      // If closing the active tab, switch to a neighbor
      if (activeTabId === tabId) {
        const remaining = tabs.filter(t => t.id !== tabId)
        if (remaining.length > 0) {
          const nextIndex = Math.min(tabIndex, remaining.length - 1)
          const nextTab = remaining[nextIndex]
          setActiveTabId(nextTab.id)
          setActiveItem(nextTab.pipelineItem)
          await window.electronAPI?.pipeline.activateContent(nextTab.pipelineItem)
        } else {
          setActiveTabId(null)
          setActiveItem(null)
        }
      }
    },
    [tabs, activeTabId]
  )

  // Switch active tab
  const switchTab = useCallback(
    async (tabId: string) => {
      setActiveTabId(tabId)
      const tab = tabs.find(t => t.id === tabId)
      if (tab) {
        setActiveItem(tab.pipelineItem)
        await window.electronAPI?.pipeline.activateContent(tab.pipelineItem)
      }
    },
    [tabs]
  )

  // Content tab click — preview only (no terminal)
  const handleItemSelect = useCallback(
    async (item: PipelineItem) => {
      setActiveItem(item)
      await window.electronAPI?.pipeline.activateContent(item)
      // If there's already a tab for this item, focus it
      const existingTab = tabs.find(t => t.id === item.id)
      if (existingTab) {
        setActiveTabId(existingTab.id)
      }
    },
    [tabs]
  )

  // Sidebar file tree click — activate parent item then select the file
  const handleFileSelect = useCallback(
    async (
      item: PipelineItem,
      path: string,
      relativePath: string,
      contentType: ContentType
    ) => {
      // Activate the parent content item first
      setActiveItem(item)
      await window.electronAPI?.pipeline.activateContent(item)
      const existingTab = tabs.find(t => t.id === item.id)
      if (existingTab) {
        setActiveTabId(existingTab.id)
      }
      // Then select the specific file
      selectFile(path, relativePath, contentType)
    },
    [tabs, selectFile]
  )

  // Sidebar create ("+") — create content and open terminal tab
  const handleItemCreated = useCallback(
    (item: PipelineItem) => {
      openTab(item, true)
    },
    [openTab]
  )

  // Branch tab click — open terminal + show preview
  const handleBranchSelect = useCallback(
    async (worktree: WorktreeInfo) => {
      // Find the matching pipeline item for this worktree
      const items = await window.electronAPI?.pipeline.listPipelineItems()
      const item = items?.find(
        i =>
          i.worktreeBranch === worktree.branch ||
          i.worktreePath === worktree.path ||
          // Fallback: derive branch from item ID (content/<type>/<date>)
          `content/${i.id}` === worktree.branch
      )
      if (item) {
        // Ensure worktree fields are set even if metadata was missing them
        if (!item.worktreePath) item.worktreePath = worktree.path
        if (!item.worktreeBranch) item.worktreeBranch = worktree.branch
        openTab(item, false)
      }
    },
    [openTab]
  )

  // Start a Claude session in the active terminal tab
  const handleStartClaude = useCallback(
    (mode: 'normal' | 'yolo') => {
      if (!activeTabId) return
      const cmd =
        mode === 'yolo' ? 'claude --dangerously-skip-permissions\n' : 'claude\n'
      window.electronAPI?.terminal.sendInput(activeTabId, cmd)
    },
    [activeTabId]
  )

  // Save session state when tabs or active tab change (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const settings = await window.electronAPI?.settings.getUser()
      if (!settings) return
      await window.electronAPI?.settings.saveUser({
        ...settings,
        lastSession: {
          openTabIds: tabs.map(t => t.id),
          activeTabId
        }
      })
    }, 500)
  }, [tabs, activeTabId])

  // Restore session on startup — reopen tabs from last session
  const didRestoreSession = useRef(false)
  useEffect(() => {
    if (didRestoreSession.current) return
    didRestoreSession.current = true

    const restore = async () => {
      const settings = await window.electronAPI?.settings.getUser()
      const session = settings?.lastSession
      if (!session?.openTabIds?.length) return

      // Fetch all pipeline items to find matching ones
      const items = await window.electronAPI?.pipeline.listPipelineItems()
      if (!items?.length) return

      for (const tabId of session.openTabIds) {
        const item = items.find(i => i.id === tabId)
        if (item) {
          await openTab(item, false)
        }
      }

      // Focus the last active tab
      if (session.activeTabId) {
        const activeItem = items.find(i => i.id === session.activeTabId)
        if (activeItem) {
          setActiveTabId(session.activeTabId)
          setActiveItem(activeItem)
          await window.electronAPI?.pipeline.activateContent(activeItem)
        }
      }
    }
    restore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Check if onboarding wizard is needed
  useEffect(() => {
    const check = async () => {
      const configured = await window.electronAPI?.project.isConfigured()
      if (!configured) {
        setShowWizard(true)
      }
    }
    check()
  }, [])

  // Listen for settings:open from the application menu
  useEffect(() => {
    const cleanup = window.electronAPI?.settings?.onOpen(openSettings)
    return cleanup
  }, [openSettings])

  // Keep tab pipelineItems and activeItem synced with fresh pipeline data
  // (e.g. when worktreeBranch is written to metadata after tab creation)
  useEffect(() => {
    const cleanup = window.electronAPI?.pipeline.onPipelineChanged(async () => {
      const items = await window.electronAPI?.pipeline.listPipelineItems()
      if (!items?.length) return

      setTabs(prev =>
        prev.map(tab => {
          const fresh = items.find(i => i.id === tab.id)
          return fresh ? { ...tab, pipelineItem: fresh } : tab
        })
      )

      setActiveItem(prev => {
        if (!prev) return prev
        const fresh = items.find(i => i.id === prev.id)
        return fresh ?? prev
      })
    })
    return cleanup
  }, [])

  // Keyboard shortcut: Cmd+, (Mac) or Ctrl+, (others)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSettingsOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {showWizard && (
        <OnboardingWizard onComplete={() => setShowWizard(false)} />
      )}
      <div className="flex-1 overflow-hidden">
        <ThreePaneLayout
          left={
            <PipelineSidebar
              onItemSelect={handleItemSelect}
              onItemCreated={handleItemCreated}
              onBranchSelect={handleBranchSelect}
              onFileSelect={handleFileSelect}
              onOpenProject={openProject}
              onOpenSettings={openSettings}
              onOpenWizard={() => setShowWizard(true)}
              hasProject={!!contentDir}
            />
          }
          middle={
            <div className="flex h-full flex-col">
              {/* Top bar — branch name + Claude session buttons, draggable */}
              <div className="drag-region flex h-9 shrink-0 items-center gap-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 px-3">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {projectName && (
                    <span className="shrink-0 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {projectName}
                    </span>
                  )}
                  {projectName && (
                    <span className="text-zinc-300 dark:text-zinc-600">/</span>
                  )}
                  <GitBranchIcon className="h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-500" />
                  <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {activeItem?.worktreeBranch || 'main'}
                  </span>
                </div>
                {activeTabId && (
                  <div className="no-drag flex items-center gap-1">
                    <button
                      onClick={() => handleStartClaude('normal')}
                      className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
                      title="Run Claude (normal mode)"
                    >
                      <ClaudeIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleStartClaude('yolo')}
                      className="flex h-6 w-6 items-center justify-center rounded text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-500 dark:hover:bg-amber-500/10 dark:hover:text-amber-400 transition-colors"
                      title="Run Claude (auto-accept mode)"
                    >
                      <ClaudeIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tab bar */}
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onSelect={switchTab}
                onClose={closeTab}
              />

              {/* Terminal — one per tab, show/hide based on active */}
              <div className="relative min-h-0 flex-1">
                {tabs.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-zinc-400 dark:text-zinc-500">
                      Create or select content from the sidebar to start
                    </p>
                  </div>
                ) : (
                  tabs.map(tab => (
                    <div
                      key={tab.id}
                      className={`absolute inset-0 ${
                        tab.id === activeTabId
                          ? ''
                          : 'pointer-events-none invisible'
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
              worktreePath={activeItem?.worktreePath}
              selectVersion={selectVersion}
              selectFile={selectFile}
              openProject={openProject}
            />
          }
        />
      </div>
      <SettingsPanel isOpen={settingsOpen} onClose={closeSettings} />
    </div>
  )
}
