import type { BrowserWindow } from 'electron'
import { dialog, ipcMain } from 'electron'

import path from 'path'

import { listContent } from './content'
import { onFileChange, startWatcher, stopWatcher } from './file-watcher'
import { createPty, destroyPty, resizePty, writePty } from './pty'
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

  // Cleanup
  mainWindow.on('closed', () => {
    destroyPty()
    unsubscribe()
    stopWatcher()
    ipcMain.removeAllListeners('terminal:input')
    ipcMain.removeAllListeners('terminal:resize')
    ipcMain.removeHandler('content:list')
    ipcMain.removeHandler('content:getProjectRoot')
    ipcMain.removeHandler('content:openProject')
  })
}
