# Agent Workflow Guide

This document governs how Claude Code sessions and subagents work on this project.
Every session (orchestrator or subagent) MUST follow these rules.

---

## Session Startup (EVERY session)

1. **Read `docs/PROGRESS.md`** — know what's done and what's next
2. **Read the current story** in `docs/stories/` — understand acceptance criteria
3. **Run `git log --oneline -10`** — see recent commits
4. **Run `git branch`** — confirm correct branch

Do NOT start writing code until you've done all four.

---

## Orchestrator Role

The orchestrator (main Claude Code session) is responsible for:

- **Planning**: Break the story into small milestones (max 3-5 files per milestone)
- **Delegating**: Spawn subagents for focused file-writing tasks
- **Verifying**: Read key files after subagent returns, run checks
- **Committing**: Git commit after each verified milestone
- **Updating progress**: Update `docs/PROGRESS.md` after each commit

### Orchestrator Loop

```
For each milestone in the story:
  1. Spawn subagent with focused task + exact file specs
  2. Wait for subagent to return
  3. Verify: quick file read + run checks (typecheck, lint)
  4. Fix any issues (small fixes directly, big issues re-delegate)
  5. Git commit with descriptive message
  6. Update docs/PROGRESS.md
  → Next milestone
```

### Context Protection

- **Never** accumulate large file contents in orchestrator context
- Delegate file writing to subagents — they handle the details
- Keep orchestrator messages short: status updates, decisions, commits
- If context is getting large, commit current work and note status in PROGRESS.md

---

## Subagent Rules

When spawned as a subagent:

1. **Read the task description carefully** — it contains everything you need
2. **Write only the files specified** — do not create extra files
3. **Follow existing patterns** — check existing config files if unsure about style
4. **No git operations** — the orchestrator handles all commits
5. **No architectural decisions** — follow the specs given to you
6. **Return a clear summary** — list files created/modified and any issues encountered

### File Writing Standards

- TypeScript strict mode — no `any` types unless absolutely necessary
- Single quotes, no semicolons, 2-space indent (prettier config)
- Import order: react/electron → packages → @/shared → @/main → @/renderer → relative
- No `console.log` in production code (use `console.warn` or `console.error` if needed)
- No duplicate functions or unused imports

---

## Git Commit Strategy

### Branch Naming
```
feature/story-X.Y-short-description
```

### Commit Messages
```
feat: short description of what was added
fix: short description of what was fixed
chore: tooling, config, or docs update
```

### When to Commit
- After each milestone (group of related files that work together)
- After fixing a failing check
- Before moving to the next logical step
- **NEVER** commit broken code — verify first

### Commit Checklist
Before every commit:
- [ ] `bun typecheck` passes (once package.json exists)
- [ ] `bun lint` passes (once package.json exists)
- [ ] No duplicate functions
- [ ] No unused imports
- [ ] Files match the story spec

---

## Progress Tracking

### Slack Updates (MANDATORY for orchestrator)

Channel: `#content-pipeline-app` — ID: `C0AGCQNCKPU`

Post a Slack message after each milestone commit using this format:
```
*Content Pipeline | Story X.Y — Title*
Step N/total complete: Brief description of what was done
Commit: <hash>
Next: What comes next
```

Post a summary when a story is fully complete:
```
*Content Pipeline | Story X.Y COMPLETE*
All acceptance criteria met. PR ready / merged.
Next story: X.Y — Title
```

### After Each Commit
Update `docs/PROGRESS.md` with:
- What was committed
- Current status of the story
- What's next

### After Each Story
Update `docs/PROGRESS.md` with:
- Story marked as complete
- Any notes for the next story
- Update the "Current Story" field

---

## Parallel Work

Subagents can run in parallel when their files don't overlap:
- Main process files (src/main/*) and renderer files (src/renderer/*) are independent
- Config files should be written sequentially (they may reference each other)
- Always verify after parallel agents return — check for conflicts

---

## Recovery

If a session dies or context overflows:
1. Check `docs/PROGRESS.md` for last known state
2. Run `git log --oneline -10` to see committed work
3. Run `git status` to see uncommitted changes
4. Continue from where things left off — don't restart the story
