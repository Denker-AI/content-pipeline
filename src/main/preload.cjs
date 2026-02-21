const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  terminal: {
    onData: (callback) => {
      const listener = (_event, data) => callback(data)
      ipcRenderer.on('terminal:data', listener)
      return () => {
        ipcRenderer.removeListener('terminal:data', listener)
      }
    },
    onParsed: (callback) => {
      const listener = (_event, data) => callback(data)
      ipcRenderer.on('terminal:parsed', listener)
      return () => {
        ipcRenderer.removeListener('terminal:parsed', listener)
      }
    },
    sendInput: (data) => {
      ipcRenderer.send('terminal:input', data)
    },
    resize: (cols, rows) => {
      ipcRenderer.send('terminal:resize', cols, rows)
    }
  }
})
