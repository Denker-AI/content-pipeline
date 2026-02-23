import type { BrowserWindow } from 'electron'
import { dialog, ipcMain } from 'electron'

import fs from 'fs/promises'
import path from 'path'

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
import { listContent, listDir, listVersions } from './content'
import { onFileChange, startWatcher, stopWatcher } from './file-watcher'
import { publishToLinkedIn } from './linkedin'
import {
  createContentPiece,
  getActiveContent,
  listPipelineItems,
  readMetadata,
  setActiveContent,
  updateStage,
  writeMetadata,
} from './pipeline'
import { changePtyDirectory, createPty, destroyPty, resizePty, writePty } from './pty'
import { listAudiences, sendNewsletter } from './resend'
import {
  loadProjectSettings,
  loadUserSettings,
  saveProjectSettings,
  saveUserSettings,
} from './settings'
import { TerminalParser } from './terminal-parser'
import { publishBlogToWebhook } from './webhook'
import { createWorktree, isGitRepo } from './worktree'

let projectRoot: string = process.cwd()

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
  const parser = new TerminalParser()

  parser.onEvent((event) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:parsed', event)
      if (event.type === 'component-found') {
        mainWindow.webContents.send('terminal:component', event.data)
      }
    }
  })

  try {
    createPty((data: string) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', data)
      }
      parser.feed(data)
    })
  } catch (err) {
    console.error('Failed to create PTY:', err)
  }

  // Terminal IPC
  ipcMain.on('terminal:input', (_event, data: string) => {
    writePty(data)
  })

  ipcMain.on('terminal:resize', (_event, cols: number, rows: number) => {
    resizePty(cols, rows)
  })

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
    const contentDir = getContentDir()
    const resolved = path.resolve(dirPath)
    if (!resolved.startsWith(contentDir)) {
      throw new Error('Access denied: directory outside content directory')
    }
    return listDir(resolved, contentDir)
  })

  ipcMain.handle('content:read', async (_event, filePath: string) => {
    // Security: only allow reading from content directory
    const contentDir = getContentDir()
    const resolved = path.resolve(filePath)
    if (!resolved.startsWith(contentDir)) {
      throw new Error('Access denied: file outside content directory')
    }
    return fs.readFile(resolved, 'utf-8')
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

      // Activate the new content piece
      setActiveContent(item)
      const watchDir = item.worktreePath
        ? path.join(item.worktreePath, 'content')
        : contentDir
      stopWatcher()
      startWatcher(watchDir)
      if (item.worktreePath) {
        changePtyDirectory(item.worktreePath)
      }

      // Type starter prompt into PTY (no Enter — let user complete)
      const starterPrompts: Record<string, string> = {
        linkedin: 'Create a LinkedIn post about ',
        blog: 'Write a blog post about ',
        newsletter: 'Create a newsletter about ',
      }
      const prompt = starterPrompts[type]
      if (prompt) {
        writePty(prompt)
      }

      // Notify renderer
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

      // Switch PTY directory if worktree
      if (item.worktreePath) {
        changePtyDirectory(item.worktreePath)
      }

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
    destroyPty()
    unsubscribe()
    unsubscribePipeline()
    stopWatcher()
    ipcMain.removeAllListeners('terminal:input')
    ipcMain.removeAllListeners('terminal:resize')
    ipcMain.removeHandler('content:list')
    ipcMain.removeHandler('content:listDir')
    ipcMain.removeHandler('content:read')
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
  })
}
