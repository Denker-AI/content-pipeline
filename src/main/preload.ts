import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  terminal: {
    onData: (callback: (data: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: string) =>
        callback(data)
      ipcRenderer.on('terminal:data', listener)
      return () => {
        ipcRenderer.removeListener('terminal:data', listener)
      }
    },
    sendInput: (data: string) => {
      ipcRenderer.send('terminal:input', data)
    },
    resize: (cols: number, rows: number) => {
      ipcRenderer.send('terminal:resize', cols, rows)
    }
  }
})
