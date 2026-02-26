import { BrowserWindow, nativeTheme } from 'electron'

import path from 'path'
import { fileURLToPath } from 'url'

import { loadUserSettings } from './settings'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

export async function createWindow(): Promise<BrowserWindow> {
  const settings = await loadUserSettings()
  const theme = settings.theme || 'dark'
  const isDark = theme === 'dark' || (theme === 'auto' && nativeTheme.shouldUseDarkColors)

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Content Pipeline',
    backgroundColor: isDark ? '#09090b' : '#fafafa',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 10 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'bottom' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
