# Project Progress

## Current State
- **Phase**: 3 — Component Browser + Capture (next)
- **Story**: 3.1 — Component Browser (next up)
- **Branch**: `main` (Phase 2 merged)
- **Status**: Phase 2 complete, merged to main

---

## Story Progress

### Phase 1: Electron Shell + Terminal

| Story | Title | Status | Branch | Notes |
|-------|-------|--------|--------|-------|
| 1.1 | Scaffold Electron App | Complete | main | c922364 |
| 1.2 | Split Pane Layout | Complete | main | 15532b7 |
| 1.3 | Terminal Integration | Complete | main | 85ed0cf |
| 1.4 | Terminal Output Parsing | Complete | main | 909540a |

### Phase 2: Live Preview + File Watching

| Story | Title | Status | Branch | Notes |
|-------|-------|--------|--------|-------|
| 2.1 | File Watcher | Complete | main | 7a0e9d3 |
| 2.2 | Preview Renderer | Complete | main | de0ecda |
| 2.3 | Version Selector | Complete | main | de0ecda |

### Phase 3: Component Browser + Capture

| Story | Title | Status | Branch | Notes |
|-------|-------|--------|--------|-------|
| 3.1 | Component Browser | Ready | — | |
| 3.2 | Component Preview | Blocked by 3.1 | — | |
| 3.3 | Capture Tools | Blocked by 3.2 | — | |

### Phase 4-7: Later phases

| Story | Title | Status |
|-------|-------|--------|
| 4.1 | Annotations | Blocked |
| 5.1 | LinkedIn Publisher | Blocked |
| 5.2 | Resend Publisher | Blocked |
| 5.3 | Blog Publisher | Blocked |
| 6.1 | Content Library | Blocked |
| 6.2 | Settings Panel | Ready |
| 7.1 | Packaging | Blocked by all |
| 7.2 | Homebrew + npm | Blocked by 7.1 |

---

## Milestone Log

### Story 1.1 — Scaffold Electron App
- [x] package.json with all deps (Electron 34, Vite 6, React 19, Tailwind 4)
- [x] vite.config.ts with vite-plugin-electron
- [x] electron-builder.yml for cross-platform packaging
- [x] Electron main process (index.ts, window.ts)
- [x] Renderer with React + Tailwind (App.tsx, main.tsx, globals.css)
- [x] Shared types placeholder
- [x] All checks pass: typecheck, lint, build

### Story 1.2 — Split Pane Layout
- [x] SplitPane component with draggable resizer (20-80% constraints)
- [x] TerminalPane placeholder (left)
- [x] PreviewPane with Content/Components/Library tabs (right)
- [x] StatusBar with session/cost/tokens display

### Story 1.3 — Terminal Integration
- [x] node-pty for shell spawning in main process
- [x] xterm.js with FitAddon in renderer
- [x] Preload script for secure IPC bridging
- [x] Auto-resize on pane changes via ResizeObserver

### Story 1.4 — Terminal Output Parsing
- [x] TerminalParser class with ANSI stripping
- [x] File change detection (Write/Edit tool patterns)
- [x] Session ID and token/cost extraction
- [x] Live status bar updates via parsed events

### Runtime Fixes (post-QA)
- [x] Preload script as CJS (Electron sandbox requires CommonJS)
- [x] node-pty spawn-helper chmod +x (postinstall)
- [x] electron-rebuild for native module ABI compatibility
- [x] Strip CLAUDECODE env var so `claude` can run inside terminal
- [x] Optional chaining for window.electronAPI in renderer
- [x] import.meta.url for __dirname in ESM main process

### Story 2.1 — File Watcher
- [x] chokidar watches content/ with 500ms debounce
- [x] Content listing with auto-detection (newsletter, linkedin, blog, asset)
- [x] IPC: content:list, content:openProject, content:getProjectRoot
- [x] File change events forwarded to renderer

### Story 2.2 — Preview Renderer
- [x] ContentRenderer: iframe for HTML, marked for markdown
- [x] RenderMode detection (newsletter 600px, linkedin, carousel 1080x1350, blog, asset)
- [x] useContent hook with file-change auto-refresh
- [x] File selector dropdown in preview pane
- [x] Empty state message
- [x] content:read IPC with path security check

### Story 2.3 — Version Selector
- [x] VersionSelector tab bar for newsletter drafts
- [x] content:listVersions IPC for draft detection
- [x] Final version visually distinguished (bold)
- [x] Versions auto-update via file watcher

---

## Existing Config (already in repo)
- `tsconfig.json` — strict mode, path aliases
- `.eslintrc.json` — TS + React + import sorting (ESLint 8)
- `vitest.config.ts` — happy-dom, v8 coverage
- `prettier.config.js` — single quotes, no semi
- `.husky/` — branch protection
- `.github/workflows/` — CI (test + claude)
