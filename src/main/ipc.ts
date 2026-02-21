import type { BrowserWindow } from 'electron'
import { dialog, ipcMain } from 'electron'

import fs from 'fs/promises'
import path from 'path'

import type { ProjectSettings, UserSettings } from '@/shared/types'

import { listContent, listDir, listVersions } from './content'
import { onFileChange, startWatcher, stopWatcher } from './file-watcher'
import { createPty, destroyPty, resizePty, writePty } from './pty'
import {
  loadProjectSettings,
  loadUserSettings,
  saveProjectSettings,
  saveUserSettings,
} from './settings'
import { TerminalParser } from './terminal-parser'

let projectRoot: string = process.cwd()

export function getProjectRoot(): string {
  return projectRoot
}

export function getContentDir(): string {
  return path.join(projectRoot, 'content')
}

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  const parser = new TerminalParser()

  parser.onEvent((event) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:parsed', event)
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

  // Cleanup
  mainWindow.on('closed', () => {
    destroyPty()
    unsubscribe()
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
  })
}
