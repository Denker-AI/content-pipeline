# Project Progress

## Current State
- **Next Story**: 3.2 — Component Preview
- **Branch**: `main`
- **Status**: Story 8.5 complete. Phase 8 done.

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
| 6 | 3.2 | Component Preview | Ready | 3.1 |
| 7 | 3.3 | Capture Tools | Blocked by 3.2 | 3.2 |
| 8 | 4.1 | Annotations | Ready | 2.2 |
| 9 | 5.1 | LinkedIn Publisher | Ready | 6.2 |
| 10 | 5.2 | Resend Newsletter | Ready | 6.2 |
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
| 6.2 | Settings Panel | 1d4216a |
| 8.1 | Pipeline Types + Metadata | c84da5a |
| 8.2 | Worktree Management | 1ff2c22 |
| 8.3 | Pipeline IPC + Preload | cf6db58 |
| 8.4 | Pipeline Sidebar UI | ad5d210 |
| 8.5 | Pipeline Integration | e05d37f |

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
