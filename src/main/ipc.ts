import type { BrowserWindow } from 'electron'
import { dialog, ipcMain, shell } from 'electron'

import { execFile } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

import type {
  CaptureScreenshotRequest,
  CaptureVideoRequest,
  ContentMetadata,
  ContentStage,
  ContentType,
  PipelineItem,
  ProjectSettings,
  ResendSendRequest,
  UserSettings,
} from '@/shared/types'

import { captureScreenshot, captureVideo } from './capture'
import { renderComponentToHtml } from './component-renderer'
import { scanComponents } from './component-scanner'
import { listContent, listDir, listVersions } from './content'
import { onFileChange, startWatcher, stopWatcher } from './file-watcher'
import { publishToLinkedIn } from './linkedin'
import { installProjectConfig, isProjectConfigured } from './onboarding'
import {
  createContentPiece,
  getActiveContent,
  listPipelineItems,
  readMetadata,
  setActiveContent,
  updateStage,
  writeMetadata,
} from './pipeline'
import {
  createPtyForTab,
  destroyAllPtys,
  destroyPtyForTab,
  resizePtyForTab,
  writePtyForTab,
} from './pty'
import { listAudiences, sendNewsletter } from './resend'
import { analyzeSEO } from './seo'
import {
  loadProjectSettings,
  loadUserSettings,
  saveProjectSettings,
  saveUserSettings,
} from './settings'
import { TerminalParser } from './terminal-parser'
import { publishBlogToWebhook } from './webhook'
import { createWorktree, isGitRepo, listWorktrees, removeWorktree } from './worktree'

let projectRoot: string = process.cwd()

/**
 * Check if a resolved path is allowed for content reads.
 * Allows the main content dir AND any active worktree content paths.
 */
function isAllowedContentPath(resolved: string): boolean {
  const contentDir = getContentDir()
  if (resolved.startsWith(contentDir)) return true
  // Also allow worktree content paths: <projectRoot>/.worktrees/<id>/content/...
  const worktreeContentPrefix = path.join(projectRoot, '.worktrees')
  if (resolved.startsWith(worktreeContentPrefix) && resolved.includes('/content/')) return true
  return false
}

export function getProjectRoot(): string {
  return projectRoot
}

export async function initProjectRoot(): Promise<void> {
  const settings = await loadUserSettings()
  if (settings.projectRoot) {
    try {
      await fs.access(settings.projectRoot)
      projectRoot = settings.projectRoot
    } catch {
      // saved root no longer accessible — keep process.cwd()
    }
  }
}

export function getContentDir(): string {
  return path.join(projectRoot, 'content')
}

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // Per-tab terminal parsers
  const parsers = new Map<string, TerminalParser>()

  // --- Tab lifecycle IPC ---

  ipcMain.handle(
    'terminal:createTab',
    async (_event, tabId: string, cwd: string) => {
      const parser = new TerminalParser()
      parsers.set(tabId, parser)

      parser.onEvent(async (event) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('terminal:parsed', tabId, event)
          if (event.type === 'component-found') {
            mainWindow.webContents.send('terminal:component', event.data)
          }
          if (event.type === 'component-preview-html') {
            mainWindow.webContents.send(
              'terminal:component-preview-html',
              event.data.html,
            )
          }
          if (event.type === 'cwd-changed') {
            const newDir = event.data.dir as string
            if (!newDir || newDir === projectRoot) return
            try {
              await fs.access(path.join(newDir, 'content'))
              projectRoot = newDir
              stopWatcher()
              startWatcher(getContentDir())
              const settings = await loadUserSettings()
              await saveUserSettings({ ...settings, projectRoot: newDir })
              mainWindow.webContents.send('content:projectChanged', newDir)
              mainWindow.webContents.send('pipeline:contentChanged')
            } catch {
              // No content/ directory — not a project root, ignore
            }
          }
        }
      })

      try {
        createPtyForTab(tabId, cwd, (data: string) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('terminal:data', tabId, data)
          }
          parser.feed(data)
        })
      } catch (err) {
        console.error(`Failed to create PTY for tab ${tabId}:`, err)
        throw err
      }
    },
  )

  ipcMain.handle('terminal:closeTab', async (_event, tabId: string) => {
    destroyPtyForTab(tabId)
    parsers.delete(tabId)
  })

  // Terminal IPC — tab-aware
  ipcMain.on(
    'terminal:input',
    (_event, tabId: string, data: string) => {
      writePtyForTab(tabId, data)
    },
  )

  ipcMain.on(
    'terminal:resize',
    (_event, tabId: string, cols: number, rows: number) => {
      resizePtyForTab(tabId, cols, rows)
    },
  )

  // File watcher — forward events to renderer
  const unsubscribe = onFileChange((event) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('file:change', event)
    }
  })

  startWatcher(getContentDir())

  // Content IPC handlers
  ipcMain.handle('content:list', async () => {
    return listContent(getContentDir())
  })

  ipcMain.handle('content:listDir', async (_event, dirPath: string) => {
    const resolved = path.resolve(dirPath)
    if (!isAllowedContentPath(resolved)) {
      throw new Error('Access denied: directory outside content directory')
    }
    // Compute the content root for relative path computation
    // For worktree paths, the content root is <worktreePath>/content/<id>/..
    // We find the "content" segment and use everything up to and including it
    const contentRoot = resolved.includes('/.worktrees/')
      ? resolved.slice(0, resolved.indexOf('/content/') + '/content'.length)
      : getContentDir()
    return listDir(resolved, contentRoot)
  })

  ipcMain.handle('content:read', async (_event, filePath: string) => {
    const resolved = path.resolve(filePath)
    if (!isAllowedContentPath(resolved)) {
      throw new Error('Access denied: file outside content directory')
    }
    return fs.readFile(resolved, 'utf-8')
  })

  ipcMain.handle('content:readAsDataUrl', async (_event, filePath: string) => {
    const resolved = path.resolve(filePath)
    if (!isAllowedContentPath(resolved)) {
      throw new Error('Access denied: file outside content directory')
    }
    const ext = path.extname(filePath).toLowerCase().slice(1)
    const mimeMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', webp: 'image/webp',
    }
    const mime = mimeMap[ext] ?? 'application/octet-stream'
    const buf = await fs.readFile(resolved)
    return `data:${mime};base64,${buf.toString('base64')}`
  })

  ipcMain.handle(
    'content:listVersions',
    async (_event, filePath: string) => {
      return listVersions(filePath, getContentDir())
    },
  )

  ipcMain.handle('content:getProjectRoot', () => {
    return projectRoot
  })

  ipcMain.handle('content:openProject', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Open Project',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    projectRoot = result.filePaths[0]
    stopWatcher()
    startWatcher(getContentDir())

    // Persist so next launch auto-loads this project
    const settings = await loadUserSettings()
    await saveUserSettings({ ...settings, projectRoot })

    return projectRoot
  })

  // Settings IPC handlers
  ipcMain.handle('settings:getUser', async () => loadUserSettings())

  ipcMain.handle(
    'settings:saveUser',
    async (_event, settings: UserSettings) => saveUserSettings(settings),
  )

  ipcMain.handle('settings:getProject', async () =>
    loadProjectSettings(projectRoot),
  )

  ipcMain.handle(
    'settings:saveProject',
    async (_event, settings: ProjectSettings) =>
      saveProjectSettings(projectRoot, settings),
  )

  // Pipeline IPC handlers
  ipcMain.handle('pipeline:list', async () => {
    return listPipelineItems(getContentDir())
  })

  ipcMain.handle(
    'pipeline:create',
    async (_event, type: ContentType) => {
      const contentDir = getContentDir()
      const item = await createContentPiece(contentDir, type)

      // If project is a git repo, create a worktree
      if (await isGitRepo(projectRoot)) {
        const branch = `content/${item.id}`
        const worktreePath = path.join(projectRoot, '.worktrees', item.id)
        const worktree = await createWorktree(projectRoot, branch, worktreePath)
        await writeMetadata(item.metadataPath, {
          worktreeBranch: worktree.branch,
          worktreePath: worktree.path,
        })
        item.worktreeBranch = worktree.branch
        item.worktreePath = worktree.path
      }

      // Notify renderer of new content
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pipeline:contentChanged')
      }

      return item
    },
  )

  ipcMain.handle(
    'pipeline:updateStage',
    async (_event, metadataPath: string, stage: ContentStage) => {
      await updateStage(metadataPath, stage)
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pipeline:contentChanged')
      }
    },
  )

  ipcMain.handle(
    'pipeline:updateMetadata',
    async (_event, metadataPath: string, updates: Partial<ContentMetadata>) => {
      await writeMetadata(metadataPath, updates)
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pipeline:contentChanged')
      }
    },
  )

  ipcMain.handle(
    'pipeline:readMetadata',
    async (_event, metadataPath: string) => {
      return readMetadata(metadataPath)
    },
  )

  ipcMain.handle(
    'pipeline:activate',
    async (_event, item: PipelineItem) => {
      setActiveContent(item)

      // Restart file watcher on active content's directory
      const watchDir = item.worktreePath
        ? path.join(item.worktreePath, 'content')
        : item.contentDir
      stopWatcher()
      startWatcher(watchDir)
    },
  )

  ipcMain.handle('pipeline:getActive', () => {
    return getActiveContent()
  })

  // Capture IPC handlers
  ipcMain.handle(
    'capture:screenshot',
    async (_event, request: CaptureScreenshotRequest) => {
      return captureScreenshot(request)
    },
  )

  ipcMain.handle(
    'capture:video',
    async (_event, request: CaptureVideoRequest) => {
      return captureVideo(request)
    },
  )

  // Publish IPC handlers
  ipcMain.handle(
    'publish:linkedin',
    async (_event, contentDir: string) => {
      const settings = await loadUserSettings()
      return publishToLinkedIn(contentDir, settings.linkedinToken)
    },
  )

  ipcMain.handle('publish:resend:audiences', async () => {
    const settings = await loadUserSettings()
    return listAudiences(settings.resendApiKey)
  })

  ipcMain.handle(
    'publish:resend:send',
    async (_event, request: ResendSendRequest) => {
      const settings = await loadUserSettings()
      return sendNewsletter(
        request.contentDir,
        settings.resendApiKey,
        request.audienceId,
        request.subject,
        request.previewText,
      )
    },
  )

  ipcMain.handle(
    'publish:blog',
    async (_event, contentDir: string) => {
      const settings = await loadUserSettings()
      return publishBlogToWebhook(contentDir, settings.blogWebhookUrl)
    },
  )

  // SEO IPC handler
  ipcMain.handle(
    'seo:analyze',
    async (_event, contentDir: string, keyword: string) => {
      const settings = await loadUserSettings()
      return analyzeSEO(contentDir, keyword, settings.braveApiKey)
    },
  )

  // Component scan IPC handler — walks project directory for .tsx/.jsx files
  ipcMain.handle('component:scan', async () => {
    return scanComponents(projectRoot)
  })

  // Component render IPC handler — reads source for Claude fallback
  ipcMain.handle('component:render', async (_event, filePath: string) => {
    return renderComponentToHtml(filePath, projectRoot)
  })

  // Git IPC handlers
  ipcMain.handle('git:listWorktrees', async () => {
    return listWorktrees(projectRoot)
  })

  ipcMain.handle('git:removeWorktree', async (_event, worktreePath: string) => {
    await removeWorktree(projectRoot, worktreePath)
    // Also delete the branch (best-effort)
    try {
      const branchName = path.basename(path.dirname(worktreePath)) === '.worktrees'
        ? `content/${path.basename(worktreePath)}`
        : undefined
      if (branchName) {
        await execFileAsync('git', ['branch', '-D', branchName], { cwd: projectRoot })
      }
    } catch {
      // Branch deletion is best-effort
    }
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pipeline:contentChanged')
    }
  })

  ipcMain.handle('git:status', async (_event, cwd: string) => {
    try {
      const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd })
      const lines = stdout.split('\n').filter((l: string) => l.trim())
      return lines.map((line: string) => {
        const xy = line.slice(0, 2)
        const filePath = line.slice(3)
        let status: 'new' | 'modified' | 'deleted' = 'modified'
        if (xy.includes('?') || xy.includes('A')) status = 'new'
        if (xy.includes('D')) status = 'deleted'
        const staged = xy[0] !== ' ' && xy[0] !== '?'
        return { path: filePath, status, staged }
      })
    } catch {
      return []
    }
  })

  ipcMain.handle('git:recentFiles', async (_event, cwd: string, limit: number) => {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['log', `--max-count=${limit}`, '--name-only', '--pretty=format:%H|%s|%aI'],
        { cwd },
      )
      const results: Array<{ path: string; commitMessage: string; commitHash: string; date: string }> = []
      let currentHash = ''
      let currentMsg = ''
      let currentDate = ''
      for (const line of stdout.split('\n')) {
        if (line.includes('|') && line.split('|').length >= 3) {
          const parts = line.split('|')
          currentHash = parts[0]
          currentMsg = parts[1]
          currentDate = parts[2]
        } else if (line.trim() && currentHash) {
          results.push({
            path: line.trim(),
            commitMessage: currentMsg,
            commitHash: currentHash,
            date: currentDate,
          })
        }
      }
      return results
    } catch {
      return []
    }
  })

  // Shell IPC handlers
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('shell:showItemInFolder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  // Project onboarding IPC handlers
  ipcMain.handle('project:isConfigured', async () => {
    return isProjectConfigured(projectRoot)
  })

  ipcMain.handle('project:install', async () => {
    await installProjectConfig(projectRoot)
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pipeline:contentChanged')
    }
  })

  // Watch for metadata.json changes and notify renderer
  const unsubscribePipeline = onFileChange((event) => {
    if (
      event.path.endsWith('metadata.json') &&
      !mainWindow.isDestroyed()
    ) {
      mainWindow.webContents.send('pipeline:contentChanged')
    }
  })

  // Cleanup
  mainWindow.on('closed', () => {
    destroyAllPtys()
    parsers.clear()
    unsubscribe()
    unsubscribePipeline()
    stopWatcher()
    ipcMain.removeAllListeners('terminal:input')
    ipcMain.removeAllListeners('terminal:resize')
    ipcMain.removeHandler('terminal:createTab')
    ipcMain.removeHandler('terminal:closeTab')
    ipcMain.removeHandler('content:list')
    ipcMain.removeHandler('content:listDir')
    ipcMain.removeHandler('content:read')
    ipcMain.removeHandler('content:readAsDataUrl')
    ipcMain.removeHandler('content:listVersions')
    ipcMain.removeHandler('content:getProjectRoot')
    ipcMain.removeHandler('content:openProject')
    ipcMain.removeHandler('settings:getUser')
    ipcMain.removeHandler('settings:saveUser')
    ipcMain.removeHandler('settings:getProject')
    ipcMain.removeHandler('settings:saveProject')
    ipcMain.removeHandler('pipeline:list')
    ipcMain.removeHandler('pipeline:create')
    ipcMain.removeHandler('pipeline:updateStage')
    ipcMain.removeHandler('pipeline:updateMetadata')
    ipcMain.removeHandler('pipeline:readMetadata')
    ipcMain.removeHandler('pipeline:activate')
    ipcMain.removeHandler('pipeline:getActive')
    ipcMain.removeHandler('capture:screenshot')
    ipcMain.removeHandler('capture:video')
    ipcMain.removeHandler('publish:linkedin')
    ipcMain.removeHandler('publish:resend:audiences')
    ipcMain.removeHandler('publish:resend:send')
    ipcMain.removeHandler('publish:blog')
    ipcMain.removeHandler('seo:analyze')
    ipcMain.removeHandler('project:isConfigured')
    ipcMain.removeHandler('project:install')
    ipcMain.removeHandler('component:scan')
    ipcMain.removeHandler('component:render')
    ipcMain.removeHandler('git:listWorktrees')
    ipcMain.removeHandler('git:removeWorktree')
    ipcMain.removeHandler('git:status')
    ipcMain.removeHandler('git:recentFiles')
    ipcMain.removeHandler('shell:openExternal')
    ipcMain.removeHandler('shell:showItemInFolder')
  })
}
