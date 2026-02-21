import type { BrowserWindow } from 'electron'
import { ipcMain } from 'electron'

import { createPty, destroyPty, resizePty, writePty } from './pty'
import { TerminalParser } from './terminal-parser'

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  const parser = new TerminalParser()

  parser.onEvent(event => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:parsed', event)
    }
  })

  createPty((data: string) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:data', data)
    }
    parser.feed(data)
  })

  ipcMain.on('terminal:input', (_event, data: string) => {
    writePty(data)
  })

  ipcMain.on('terminal:resize', (_event, cols: number, rows: number) => {
    resizePty(cols, rows)
  })

  mainWindow.on('closed', () => {
    destroyPty()
    ipcMain.removeAllListeners('terminal:input')
    ipcMain.removeAllListeners('terminal:resize')
  })
}
