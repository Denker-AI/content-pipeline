import { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

export function initAutoUpdater(mainWindow: BrowserWindow) {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:available', info.version)
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:downloaded', info.version)
    }
  })

  autoUpdater.checkForUpdatesAndNotify()
}
