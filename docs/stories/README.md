# Development Stories

Each story is a small, shippable unit of work. One Claude Code session per story. One branch per story.

## Phase 1: Electron Shell + Terminal

| Story | Title | Depends On | Est. |
|-------|-------|-----------|------|
| [1.1](1.1-scaffold-electron-app.md) | Scaffold Electron App | — | 1 session |
| [1.2](1.2-split-pane-layout.md) | Split Pane Layout | 1.1 | 1 session |
| [1.3](1.3-terminal-integration.md) | Terminal Integration (xterm.js + node-pty) | 1.2 | 1 session |
| [1.4](1.4-terminal-output-parsing.md) | Terminal Output Parsing | 1.3 | 1 session |

## Phase 2: Live Preview + File Watching

| Story | Title | Depends On | Est. |
|-------|-------|-----------|------|
| [2.1](2.1-file-watcher.md) | File Watcher (chokidar) | 1.1 | 1 session |
| [2.2](2.2-preview-renderer.md) | Content Preview Renderer | 1.2, 2.1 | 1 session |
| [2.3](2.3-version-selector.md) | Version Selector | 2.2 | 1 session |

## Phase 3: Component Browser + Capture

| Story | Title | Depends On | Est. |
|-------|-------|-----------|------|
| [3.1](3.1-component-browser.md) | Component Browser | 1.4, 1.2 | 1 session |
| [3.2](3.2-component-preview.md) | Component Preview | 3.1, 2.2 | 1 session |
| [3.3](3.3-capture-tools.md) | Capture Tools (Screenshot + Video) | 2.2, 3.2 | 1 session |

## Phase 4: Annotations

| Story | Title | Depends On | Est. |
|-------|-------|-----------|------|
| [4.1](4.1-annotations.md) | Annotations (Click-to-Comment) | 2.2, 1.3 | 1 session |

## Phase 5: Publishing

| Story | Title | Depends On | Est. |
|-------|-------|-----------|------|
| [5.1](5.1-linkedin-publisher.md) | LinkedIn Publisher | 2.2, 6.2 | 1 session |
| [5.2](5.2-resend-publisher.md) | Resend Newsletter Publisher | 2.2, 6.2 | 1 session |
| [5.3](5.3-blog-publisher.md) | Blog Publisher (Webhook) | 2.2, 6.2 | 1 session |

## Phase 6: Content Library + Settings

| Story | Title | Depends On | Est. |
|-------|-------|-----------|------|
| [6.1](6.1-content-library.md) | Content Library | 2.1, 2.2 | 1 session |
| [6.2](6.2-settings.md) | Settings Panel | 1.1 | 1 session |

## Phase 7: Distribution

| Story | Title | Depends On | Est. |
|-------|-------|-----------|------|
| [7.1](7.1-packaging.md) | Packaging & Distribution | all | 1 session |
| [7.2](7.2-homebrew-npm.md) | Homebrew Cask + npm | 7.1 | 1 session |

## Dependency Graph

```
1.1 ─→ 1.2 ─→ 1.3 ─→ 1.4 ─→ 3.1 ─→ 3.2
       │                              │
       ├─→ 6.2                        ▼
       │                        3.3 (capture)
       ▼
2.1 ─→ 2.2 ─→ 2.3
       │
       ├─→ 4.1 (annotations)
       ├─→ 5.1 (linkedin)
       ├─→ 5.2 (resend)
       ├─→ 5.3 (blog)
       └─→ 6.1 (library)
```

## How to Work on a Story

```bash
cd ~/Desktop/DENKER/ClaudeCode/content-pipeline
claude
# Then say: "Read docs/stories/1.1-scaffold-electron-app.md and implement it"
```

Commit after each milestone. Create a PR when the story is complete.
