// Parsed terminal event types
export interface ParsedEvent {
  type: 'file-changed' | 'session-id' | 'token-cost' | 'component-found'
  data: Record<string, string | number>
}

// Component detected from terminal output
export interface DetectedComponent {
  name: string // PascalCase component name from filename
  path: string // File path as shown in terminal
  description: string // Empty or extracted comment
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

// Content pipeline stages
export type ContentStage = 'idea' | 'draft' | 'review' | 'final' | 'scheduled' | 'published'

// Metadata stored in each content folder's metadata.json
export interface ContentMetadata {
  type: ContentType
  stage: ContentStage
  title: string
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
  worktreeBranch?: string
  worktreePath?: string
}

// A content piece as displayed in the pipeline sidebar
export interface PipelineItem {
  id: string              // unique slug: <type>/<date-slug>
  type: ContentType
  stage: ContentStage
  title: string
  date: string
  metadataPath: string    // absolute path to metadata.json
  contentDir: string      // absolute path to the content folder
  worktreeBranch?: string
  worktreePath?: string
}

// Pipeline API exposed via preload
export interface PipelineAPI {
  listPipelineItems: () => Promise<PipelineItem[]>
  createContent: (type: ContentType) => Promise<PipelineItem>
  updateStage: (metadataPath: string, stage: ContentStage) => Promise<void>
  updateMetadata: (metadataPath: string, metadata: Partial<ContentMetadata>) => Promise<void>
  readMetadata: (metadataPath: string) => Promise<ContentMetadata>
  activateContent: (item: PipelineItem) => Promise<void>
  getActiveContent: () => Promise<PipelineItem | null>
  onPipelineChanged: (callback: () => void) => () => void
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

// Directory entry for folder browsing
export interface DirEntry {
  name: string
  path: string // absolute path
  relativePath: string // relative to content/
  isDirectory: boolean
  contentType: ContentType // detected type (for files)
  date: string | null
}

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
  listDir: (dirPath: string) => Promise<DirEntry[]>
  read: (filePath: string) => Promise<string>
  listVersions: (filePath: string) => Promise<ContentVersion[]>
  openProject: () => Promise<string | null>
  getProjectRoot: () => Promise<string>
}

// Component API exposed via preload
export interface ComponentAPI {
  onComponentFound: (
    callback: (component: DetectedComponent) => void,
  ) => () => void
}

// User-level settings (stored in ~/.content-pipeline/settings.json)
export interface UserSettings {
  appUrl: string
  authCookies: Record<string, string>
  linkedinToken: string
  resendApiKey: string
  blogWebhookUrl: string
  theme: 'light' | 'dark'
}

// Project-level settings (stored in content-pipeline.json in project root)
export interface ProjectSettings {
  persona: {
    company: string
    product: string
    tone: string
    audience: string
  }
}

// Settings API exposed via preload
export interface SettingsAPI {
  getUser: () => Promise<UserSettings>
  saveUser: (settings: UserSettings) => Promise<void>
  getProject: () => Promise<ProjectSettings>
  saveProject: (settings: ProjectSettings) => Promise<void>
  onOpen: (callback: () => void) => () => void
}

// Global window type augmentation
export interface ElectronAPI {
  terminal: TerminalAPI
  files: FileWatcherAPI
  content: ContentAPI
  components: ComponentAPI
  settings: SettingsAPI
  pipeline: PipelineAPI
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
