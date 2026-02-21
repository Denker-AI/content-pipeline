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
    },
  },
  files: {
    onFileChange: (callback) => {
      const listener = (_event, data) => callback(data)
      ipcRenderer.on('file:change', listener)
      return () => {
        ipcRenderer.removeListener('file:change', listener)
      }
    },
  },
  components: {
    onComponentFound: (callback) => {
      const listener = (_event, data) => callback(data)
      ipcRenderer.on('terminal:component', listener)
      return () => {
        ipcRenderer.removeListener('terminal:component', listener)
      }
    },
  },
  content: {
    list: () => ipcRenderer.invoke('content:list'),
    listDir: (dirPath) => ipcRenderer.invoke('content:listDir', dirPath),
    read: (filePath) => ipcRenderer.invoke('content:read', filePath),
    listVersions: (filePath) =>
      ipcRenderer.invoke('content:listVersions', filePath),
    openProject: () => ipcRenderer.invoke('content:openProject'),
    getProjectRoot: () => ipcRenderer.invoke('content:getProjectRoot'),
  },
})
