// Parsed terminal event types
export interface ParsedEvent {
  type: 'file-changed' | 'session-id' | 'token-cost'
  data: Record<string, string | number>
}

// File watcher event types
export type FileEventType = 'created' | 'modified' | 'deleted'

export interface FileEvent {
  type: FileEventType
  path: string
}

// Content types detected from directory structure
export type ContentType = 'newsletter' | 'linkedin' | 'blog' | 'asset' | 'unknown'

export interface ContentItem {
  type: ContentType
  title: string
  path: string
  relativePath: string
  date: string | null
}

// Rendering hint for the preview pane
export type RenderMode =
  | 'newsletter' // 600px iframe
  | 'linkedin-preview' // feed-width iframe
  | 'linkedin-text' // rendered text + char count
  | 'carousel-slide' // 1080x1350 aspect ratio
  | 'blog' // rendered markdown
  | 'asset' // raw HTML iframe
  | 'unknown'

// Version info for content with multiple drafts
export interface ContentVersion {
  label: string // "v1", "v2", "final"
  path: string // absolute path
  isFinal: boolean
}

// Terminal IPC API exposed via preload script
export interface TerminalAPI {
  onData: (callback: (data: string) => void) => () => void
  onParsed: (callback: (event: ParsedEvent) => void) => () => void
  sendInput: (data: string) => void
  resize: (cols: number, rows: number) => void
}

// File watcher API exposed via preload
export interface FileWatcherAPI {
  onFileChange: (callback: (event: FileEvent) => void) => () => void
}

// Content API exposed via preload
export interface ContentAPI {
  list: () => Promise<ContentItem[]>
  read: (filePath: string) => Promise<string>
  listVersions: (filePath: string) => Promise<ContentVersion[]>
  openProject: () => Promise<string | null>
  getProjectRoot: () => Promise<string>
}

// Global window type augmentation
export interface ElectronAPI {
  terminal: TerminalAPI
  files: FileWatcherAPI
  content: ContentAPI
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
