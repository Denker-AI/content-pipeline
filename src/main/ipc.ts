import type { BrowserWindow } from 'electron'
import { ipcMain } from 'electron'

import { createPty, destroyPty, resizePty, writePty } from './pty'

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  createPty((data: string) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:data', data)
    }
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
