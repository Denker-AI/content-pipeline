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
  settings: {
    getUser: () => ipcRenderer.invoke('settings:getUser'),
    saveUser: (settings) => ipcRenderer.invoke('settings:saveUser', settings),
    getProject: () => ipcRenderer.invoke('settings:getProject'),
    saveProject: (settings) =>
      ipcRenderer.invoke('settings:saveProject', settings),
    onOpen: (callback) => {
      const listener = () => callback()
      ipcRenderer.on('settings:open', listener)
      return () => {
        ipcRenderer.removeListener('settings:open', listener)
      }
    },
  },
  capture: {
    screenshot: (request) =>
      ipcRenderer.invoke('capture:screenshot', request),
    video: (request) => ipcRenderer.invoke('capture:video', request),
  },
  publish: {
    linkedin: (contentDir) =>
      ipcRenderer.invoke('publish:linkedin', contentDir),
    resendListAudiences: () =>
      ipcRenderer.invoke('publish:resend:audiences'),
    resendSend: (request) =>
      ipcRenderer.invoke('publish:resend:send', request),
  },
  pipeline: {
    listPipelineItems: () => ipcRenderer.invoke('pipeline:list'),
    createContent: (type) => ipcRenderer.invoke('pipeline:create', type),
    updateStage: (metadataPath, stage) =>
      ipcRenderer.invoke('pipeline:updateStage', metadataPath, stage),
    updateMetadata: (metadataPath, metadata) =>
      ipcRenderer.invoke('pipeline:updateMetadata', metadataPath, metadata),
    readMetadata: (metadataPath) =>
      ipcRenderer.invoke('pipeline:readMetadata', metadataPath),
    activateContent: (item) => ipcRenderer.invoke('pipeline:activate', item),
    getActiveContent: () => ipcRenderer.invoke('pipeline:getActive'),
    onPipelineChanged: (callback) => {
      const listener = () => callback()
      ipcRenderer.on('pipeline:contentChanged', listener)
      return () => {
        ipcRenderer.removeListener('pipeline:contentChanged', listener)
      }
    },
  },
})
