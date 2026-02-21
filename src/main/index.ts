import { app, BrowserWindow } from 'electron'

import { registerIpcHandlers } from './ipc'
import { createWindow } from './window'

app.whenReady().then(() => {
  const mainWindow = createWindow()
  registerIpcHandlers(mainWindow)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const mainWindow = createWindow()
    registerIpcHandlers(mainWindow)
  }
})
