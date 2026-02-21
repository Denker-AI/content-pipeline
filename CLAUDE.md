# CLAUDE.md — Content Pipeline

An open-source Electron desktop app that wraps Claude Code with a visual layer for content creation.

## Architecture

- **Electron** app shell (electron-builder for packaging)
- **Left pane**: Real terminal via xterm.js + node-pty (runs your `claude` CLI)
- **Right pane**: React + Tailwind UI (preview, components, library, publish)
- **Vite** for renderer bundling
- **chokidar** for file watching
- **Playwright** (bundled) for screenshots + video capture

See `docs/PRD-CONTENT-PIPELINE.md` for full specification.

## Project Structure

```
src/
├── main/           # Electron main process (Node.js)
│   ├── index.ts    # App entry, window management
│   ├── pty.ts      # Terminal PTY (node-pty)
│   ├── ipc.ts      # IPC handler registry
│   └── ...
├── renderer/       # Electron renderer (React + Vite)
│   ├── App.tsx     # Root: split pane layout
│   ├── components/ # UI components
│   ├── hooks/      # React hooks
│   └── styles/     # Tailwind CSS
├── shared/
│   └── types.ts    # Shared types (IPC messages, content metadata)
├── package.json
├── electron-builder.yml
└── vite.config.ts
```

## Key Commands

```bash
bun install          # Install dependencies
bun dev              # Start in dev mode (Electron + Vite HMR)
bun build            # Build for production
bun package          # Package as .dmg / .AppImage / .exe
bun lint             # ESLint
bun typecheck        # TypeScript checks
bun test:run         # Run tests (Vitest)
bun format:check     # Prettier check
```

## Development Workflow

1. **Stories live in `docs/stories/`** — each is a small, shippable unit of work
2. **One branch per story**: `feature/story-X.Y-description`
3. **Commit after each milestone** within a story
4. **Run all checks before PR**: `bun lint && bun typecheck && bun test:run && bun build`
5. **PRD is source of truth**: `docs/PRD-CONTENT-PIPELINE.md`

## Implementation Phases

| Phase | What | Stories |
|-------|------|---------|
| 1 | Electron Shell + Terminal | 1.1–1.4 |
| 2 | Live Preview + File Watching | 2.1–2.3 |
| 3 | Component Browser + Capture | 3.1–3.3 |
| 4 | Annotations | 4.1 |
| 5 | Publishing | 5.1–5.3 |
| 6 | Content Library + Settings | 6.1–6.2 |
| 7 | Distribution | 7.1–7.2 |

## Coding Conventions

- TypeScript strict mode
- Tailwind CSS for styling (no CSS modules)
- React functional components with hooks
- IPC communication between main and renderer processes
- All file I/O in main process, never in renderer
- Shared types in `src/shared/types.ts`

## Pre-PR Checklist

- [ ] No duplicate functions
- [ ] No unused imports or variables
- [ ] Tests for new functionality
- [ ] Existing tests pass
- [ ] Follows existing patterns
- [ ] No console.log in production code
