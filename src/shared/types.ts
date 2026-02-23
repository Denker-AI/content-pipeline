// Parsed terminal event types
export interface ParsedEvent {
  type: 'file-changed' | 'session-id' | 'token-cost' | 'component-found' | 'cwd-changed' | 'component-preview-html'
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

// Git worktree info
export interface WorktreeInfo {
  branch: string
  path: string          // absolute path to worktree
  contentDir: string    // content/ inside worktree
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
  scheduledAt?: string  // ISO 8601, set when stage is 'scheduled'
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
  readAsDataUrl: (filePath: string) => Promise<string>
  listVersions: (filePath: string) => Promise<ContentVersion[]>
  openProject: () => Promise<string | null>
  getProjectRoot: () => Promise<string>
  onProjectChanged: (callback: (root: string) => void) => () => void
}

// Result from component render attempt
export type ComponentRenderResult =
  | { ok: true; html: string }
  | { ok: false; source: string; error: string }

// Component API exposed via preload
export interface ComponentAPI {
  onComponentFound: (callback: (component: DetectedComponent) => void) => () => void
  onPreviewHtml: (callback: (html: string) => void) => () => void
  scan: () => Promise<DetectedComponent[]>
  render: (filePath: string) => Promise<ComponentRenderResult>
}

// User-level settings (stored in ~/.content-pipeline/settings.json)
export interface UserSettings {
  appUrl: string
  authCookies: Record<string, string>
  linkedinToken: string
  resendApiKey: string
  blogWebhookUrl: string
  braveApiKey: string
  theme: 'light' | 'dark'
  projectRoot?: string
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

// Capture API types
export interface CaptureScreenshotRequest {
  url?: string
  html?: string
  width: number
  height: number
  presetName: string
  contentDir: string
  contentType?: ContentType
}

export interface CaptureVideoRequest {
  url?: string
  html?: string
  width: number
  height: number
  duration: number
  contentDir: string
}

export interface CaptureResult {
  path: string
  size: number
  width: number
  height: number
}

export interface VideoResult extends CaptureResult {
  duration: number
}

export interface CaptureAPI {
  screenshot: (request: CaptureScreenshotRequest) => Promise<CaptureResult>
  video: (request: CaptureVideoRequest) => Promise<VideoResult>
}

// LinkedIn publish types
export interface LinkedInPublishRequest {
  contentDir: string
  token: string
}

export interface LinkedInPublishResult {
  postId: string
  postUrl: string
}

// Resend newsletter types
export interface ResendAudience {
  id: string
  name: string
}

export interface ResendSendRequest {
  contentDir: string
  audienceId: string
  subject: string
  previewText: string
}

export interface ResendSendResult {
  broadcastId: string
}

// Blog webhook publish types
export interface BlogPublishRequest {
  contentDir: string
}

export interface BlogPublishResult {
  title: string
  slug: string
  webhookUrl: string
  statusCode: number
}

// Publish API exposed via preload
export interface PublishAPI {
  linkedin: (contentDir: string) => Promise<LinkedInPublishResult>
  resendListAudiences: () => Promise<ResendAudience[]>
  resendSend: (request: ResendSendRequest) => Promise<ResendSendResult>
  blog: (contentDir: string) => Promise<BlogPublishResult>
}

// SEO analysis types
export interface SEOCompetitor {
  url: string
  title: string
  description: string
  score: number
  wordCount: number
}

export interface SEOAnalysisResult {
  score: number
  seoScore: number
  readabilityScore: number
  readabilityGrade: string
  wordCount: number
  keywordDensity: number
  suggestions: SEOSuggestion[]
  keyword: string
  competitors: SEOCompetitor[]
  competitorAvgScore: number
}

export interface SEOSuggestion {
  type: 'warning' | 'good' | 'minor'
  message: string
}

export interface SEOAPI {
  analyze: (contentDir: string, keyword: string) => Promise<SEOAnalysisResult>
}

// Annotation comment for click-to-comment on preview
export interface AnnotationComment {
  id: string
  pinNumber: number
  x: number          // percentage (0-100) relative to preview area
  y: number          // percentage (0-100) relative to preview area
  text: string
  nearText: string   // text extracted near the click position
  resolved: boolean
}

// Shell API exposed via preload
export interface ShellAPI {
  openExternal: (url: string) => Promise<void>
  showItemInFolder: (filePath: string) => Promise<void>
}

// Project onboarding API exposed via preload
export interface ProjectAPI {
  isConfigured: () => Promise<boolean>
  install: () => Promise<void>
}

// Global window type augmentation
export interface ElectronAPI {
  terminal: TerminalAPI
  files: FileWatcherAPI
  content: ContentAPI
  components: ComponentAPI
  settings: SettingsAPI
  pipeline: PipelineAPI
  capture: CaptureAPI
  publish: PublishAPI
  seo: SEOAPI
  shell: ShellAPI
  project: ProjectAPI
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
