import { app, BrowserWindow, Menu } from 'electron'

import { registerIpcHandlers } from './ipc'
import { initAutoUpdater } from './updater'
import { createWindow } from './window'

function setupMenu(mainWindow: BrowserWindow) {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (!mainWindow.isDestroyed()) {
              mainWindow.webContents.send('settings:open')
            }
          },
        },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    },
    { role: 'editMenu' as const },
    { role: 'viewMenu' as const },
    { role: 'windowMenu' as const },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  const mainWindow = createWindow()
  registerIpcHandlers(mainWindow)
  setupMenu(mainWindow)
  if (app.isPackaged) {
    initAutoUpdater(mainWindow)
  }
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
