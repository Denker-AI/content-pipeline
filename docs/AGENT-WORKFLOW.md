# Autonomous Session Workflow

Each Claude Code session is fully autonomous. No human interaction needed.
Follow this protocol exactly, step by step.

---

## Phase 1: Orient (read-only, ~2 min)

```
1. Read docs/PROGRESS.md → find the next story with status "Ready"
2. Read the story file in docs/stories/<story>.md → understand acceptance criteria
3. Run: git log --oneline -5
4. Run: git branch → confirm on main
5. Run: git status → confirm clean working tree
```

**STOP if**: no story is Ready (all blocked or complete). Post to Slack and exit.

---

## Phase 2: Plan (read-only, ~5 min)

```
1. Read EVERY file listed in the story's "Files to Create/Edit" section
2. Read related files to understand patterns (check imports, types, existing code)
3. Write a brief plan as a comment to yourself (do NOT create a file):
   - List exact files to create/modify/delete
   - Note any tricky parts or edge cases
   - Confirm the story is implementable as-written
```

**STOP if**: story spec is unclear or contradicts existing code. Post to Slack asking for clarification and exit.

---

## Phase 3: Implement (write code, ~15 min)

```
1. Create branch: git checkout -b feature/story-<X.Y>-<short-name>
2. Write code — follow these rules:
   - Read a file BEFORE editing it
   - TypeScript strict, Tailwind only, no console.log
   - Single quotes, no semicolons, 2-space indent
   - Use optional chaining for window.electronAPI?.
   - No duplicate functions, no unused imports
   - Follow existing patterns in the codebase
3. Commit after each logical milestone (don't wait until the end)
```

---

## Phase 4: Verify (mandatory, ~3 min)

```
1. bun lint → fix any errors
2. bun typecheck → fix any errors
3. bun run build → fix any errors (NOT "bun build")
4. Re-read each modified file → check for:
   - Duplicate functions
   - Unused imports
   - Mixed old/new patterns
   - Missing cleanup in ipc.ts (removeHandler)
```

**Loop**: if anything fails, fix and re-verify. Do NOT skip this phase.

---

## Phase 5: Merge (git operations, ~1 min)

```
1. git checkout main
2. git merge feature/story-<X.Y>-<short-name> --no-edit
3. git push --no-verify
4. git branch -d feature/story-<X.Y>-<short-name>
```

NO pull requests. Direct merge to main during development.

---

## Phase 6: Update Docs (~2 min)

```
1. Update docs/PROGRESS.md:
   - Move completed story from execution order to completed section
   - Update "Next Story" to the next Ready story
   - Unblock any stories that depended on the completed one (change "Blocked" → "Ready")
   - Add milestone log entry
2. Commit: git add docs/PROGRESS.md && git commit -m "chore: mark story X.Y complete"
3. git push --no-verify
```

---

## Phase 7: Notify (~1 min)

Post to Slack channel `#content-pipeline-app` (ID: `C0AGCQNCKPU`):

```
*Content Pipeline | Story X.Y — Title COMPLETE*
Summary: 1-2 sentences of what was built
Files: N created, M modified
Next: Story X.Y — Title
```

---

## Phase 8: Exit

Session is done. The next session will pick up the next Ready story.

---

## Rules

### DO
- Follow the phases in order, every time
- Read files before editing them
- Run all three checks (lint, typecheck, build) before merging
- Update PROGRESS.md after every story
- Post to Slack after every story
- Keep commits small and descriptive

### DO NOT
- Skip the verify phase
- Merge broken code to main
- Work on multiple stories in one session
- Create files not mentioned in the story spec
- Add features beyond the acceptance criteria
- Use subagents or parallel execution — work sequentially
- Leave uncommitted changes

### Recovery
If a session dies mid-story:
1. Next session reads PROGRESS.md → sees story still "Ready"
2. Checks git status/log for partial work
3. Continues from where it left off (don't restart)

---

## File Conventions

- Story specs: `docs/stories/<X.Y>-<name>.md`
- Progress: `docs/PROGRESS.md` (source of truth for what's next)
- Main process: `src/main/` (Node.js, file I/O, IPC)
- Renderer: `src/renderer/` (React, Tailwind)
- Shared types: `src/shared/types.ts`
- Preload: `src/main/preload.cjs` (CommonJS)
- Config: tsconfig.json, .eslintrc.json, vitest.config.ts, prettier.config.js

## Commit Message Format

```
feat: <what was added>     — new functionality
fix: <what was fixed>      — bug fix
chore: <what changed>      — docs, config, tooling
```
