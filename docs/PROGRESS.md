# Project Progress

## Current State
- **Next Story**: 5.3 — Blog Publisher
- **Branch**: `main`
- **Status**: Story 5.2 complete. Phase 8 done.

---

## Execution Order

Stories are executed in this exact order. Each session picks the next `Ready` story.

| Order | Story | Title | Status | Deps |
|-------|-------|-------|--------|------|
| 1 | 8.1 | Pipeline Types + Metadata | Complete | c84da5a |
| 2 | 8.2 | Worktree Management | Complete | 1ff2c22 |
| 3 | 8.3 | Pipeline IPC + Preload | Complete | cf6db58 |
| 4 | 8.4 | Pipeline Sidebar UI | Complete | ad5d210 |
| 5 | 8.5 | Pipeline Integration | Complete | e05d37f |
| 6 | 3.2 | Component Preview | Complete | cf1db75 |
| 7 | 3.3 | Capture Tools | Complete | 47a4342 |
| 8 | 4.1 | Annotations | Complete | 34c05f2 |
| 9 | 5.1 | LinkedIn Publisher | Complete | 869173e |
| 10 | 5.2 | Resend Newsletter | Complete | 0602fe8 |
| 11 | 5.3 | Blog Publisher | Ready | 6.2 |
| 12 | 7.1 | Packaging | Blocked by all | All |
| 13 | 7.2 | Homebrew + npm | Blocked by 7.1 | 7.1 |

**Note**: Story 6.1 (Content Library) merged into 8.4/8.5 — pipeline sidebar IS the library.

---

## Completed Stories

### Phase 1: Electron Shell + Terminal

| Story | Title | Commit |
|-------|-------|--------|
| 1.1 | Scaffold Electron App | c922364 |
| 1.2 | Split Pane Layout | 15532b7 |
| 1.3 | Terminal Integration | 85ed0cf |
| 1.4 | Terminal Output Parsing | 909540a |

### Phase 2: Live Preview + File Watching

| Story | Title | Commit |
|-------|-------|--------|
| 2.1 | File Watcher | 7a0e9d3 |
| 2.2 | Preview Renderer | de0ecda |
| 2.3 | Version Selector | de0ecda |

### Other Completed

| Story | Title | Commit |
|-------|-------|--------|
| 3.1 | Component Browser | 7dc01e2 |
| 3.2 | Component Preview | cf1db75 |
| 3.3 | Capture Tools | 47a4342 |
| 6.2 | Settings Panel | 1d4216a |
| 8.1 | Pipeline Types + Metadata | c84da5a |
| 8.2 | Worktree Management | 1ff2c22 |
| 8.3 | Pipeline IPC + Preload | cf6db58 |
| 8.4 | Pipeline Sidebar UI | ad5d210 |
| 4.1 | Annotations | 34c05f2 |
| 8.5 | Pipeline Integration | e05d37f |
| 5.1 | LinkedIn Publisher | 869173e |
| 5.2 | Resend Newsletter | 0602fe8 |

---

## Milestone Log

### Phase 1 Milestones
- Electron 34 + Vite 6 + React 19 + Tailwind 4 scaffold
- Split pane with draggable resizer (20-80%)
- xterm.js + node-pty terminal integration
- Terminal output parsing (file changes, session ID, tokens/cost)
- Runtime fixes: CJS preload, spawn-helper chmod, electron-rebuild

### Phase 2 Milestones
- chokidar file watcher with 500ms debounce
- ContentRenderer: iframe for HTML, marked for markdown
- RenderMode detection (newsletter, linkedin, carousel, blog, asset)
- Version selector for newsletter drafts
- Folder browser with breadcrumb navigation
- Open Project button + content directory selection

### Story 3.1 — Component Browser
- Terminal parser detects .tsx/.jsx file paths
- PascalCase component name extraction
- ComponentBrowser with deduplicated list + ComponentCard
- IPC + preload for component-found events

### Story 6.2 — Settings Panel
- User settings (~/.content-pipeline/settings.json)
- Project settings (content-pipeline.json)
- Settings modal with Cmd+, shortcut
- Theme toggle, API keys, persona config

### Story 8.1 — Pipeline Types + Metadata
- ContentStage, ContentMetadata, PipelineItem, PipelineAPI types
- pipeline.ts: listPipelineItems, createContentPiece, readMetadata, writeMetadata, updateStage
- Legacy content auto-detected with stage 'idea'
- Active content tracking (in-memory)

### Story 8.2 — Worktree Management
- WorktreeInfo type in shared types
- worktree.ts: isGitRepo, createWorktree, listWorktrees, removeWorktree
- execFile (not exec) to avoid shell injection
- Branch collision handling with numeric suffix (-2, -3)
- changePtyDirectory() in pty.ts for worktree activation

### Story 8.3 — Pipeline IPC + Preload
- 7 IPC handlers: pipeline:list, create, updateStage, updateMetadata, readMetadata, activate, getActive
- pipeline:create: creates content + worktree + activates PTY + types starter prompt
- pipeline:activate: switches PTY directory + restarts file watcher
- metadata.json change detection emits pipeline:contentChanged
- Preload exposes complete pipeline API namespace
- Cleanup removes all pipeline handlers on window close

### Story 8.4 — Pipeline Sidebar UI
- StageBadge: color-coded pill with clickable dropdown to change stage
- PipelineCard: title, date, stage badge, active state with blue border
- PipelineSection: collapsible sections per content type with "+" button
- PipelineSidebar: search input, sections for linkedin/blog/newsletter
- usePipeline hook: loads items, subscribes to changes, groups by type
- Replaces FolderBrowser in PreviewPane, Library tab removed (merged into sidebar)

### Story 8.5 — Pipeline Integration
- useContent accepts activeContentDir to auto-select first renderable file
- PipelineSidebar onItemSelect wired to update content preview
- Sidebar widened to w-72 (288px)
- folder-browser.tsx deleted (replaced by PipelineSidebar)
- No FolderBrowser references remain in codebase

### Story 3.2 — Component Preview
- ComponentPreview: iframe loading localhost/content-preview with toolbar (Back, Reload, URL)
- Auto-reload every 3s while waiting for Claude to generate the preview page
- Preview button on ComponentCard types PTY prompt asking Claude to create preview page
- ComponentBrowser passes onPreview up to PreviewPane for state management
- PreviewPane switches Components tab between browser list and preview iframe
- appUrl loaded from user settings (default: http://localhost:3000)

### Story 4.1 — Annotations
- AnnotationComment type in shared/types.ts
- useComments hook: add, resolve, delete, clearAll, buildPrompt, sendToTerminal
- CommentPin: numbered circle marker positioned by percentage coordinates
- CommentOverlay: transparent click handler over preview with popover for text input
- Extracts near-text from iframe contentDocument.elementFromPoint
- CommentSidebar: comment list with resolve/delete + "Send to Claude" button
- Annotate toggle button in preview toolbar
- Comments cleared when switching content items
- Prompt format: "Revise <file>:\n(1) Near "<text>": "<comment>"\n..."

### Story 5.1 — LinkedIn Publisher
- linkedin.ts: OAuth2 profile lookup via /v2/userinfo, image upload via /rest/images
- Text-only, single image, and multi-image (carousel) post support
- Reads post-text.md for post body, carousel-images/ for images
- Writes post.json with linkedin_post_id, status, published_at, url
- PublishDialog: reusable confirmation modal with loading/error states
- LinkedInPublisher: post text preview with char counter (3000 limit), image count
- "Publish" button in preview toolbar (LinkedIn content only)
- IPC handler reads token from user settings, preload exposes publish.linkedin()

### Story 5.2 — Resend Newsletter
- resend.ts: list audiences, create broadcast, send broadcast via Resend API
- Reads email.html from content directory for broadcast body
- Writes newsletter.json with broadcast_id, status: sent, sent_at, audience_id, subject
- ResendSender: audience dropdown, subject line, preview text inputs
- Confirmation warning before sending (irreversible action)
- "Send Newsletter" button in preview toolbar (newsletter content only)
- IPC handlers for publish:resend:audiences and publish:resend:send
- Preload exposes publish.resendListAudiences() and publish.resendSend()

### Story 3.3 — Capture Tools
- screenshot.ts: Playwright-based PNG capture with retina (2x) scaling
- capture.ts: orchestrator with auto output path (carousel-images for LinkedIn)
- capture-toolbar.tsx: size preset dropdown, custom dimensions, PNG + video buttons
- size-presets.ts: LinkedIn Carousel (1080x1350), OG Image (1200x627), Newsletter Hero (600x300)
- IPC handlers + preload for capture:screenshot and capture:video
- CaptureToolbar integrated into both Content and Components preview tabs
- Status bar shows capture result (path + file size)
