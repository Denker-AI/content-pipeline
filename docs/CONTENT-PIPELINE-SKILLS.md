# Content Pipeline Skill System

## Context

You have 8 content agents defined in `.claude/agents/` but no user-facing skills to trigger them. All orchestration has been manual. Carousel render scripts are hardcoded to specific campaigns. This plan creates 5 skills (`/content-run`, `/newsletter`, `/linkedin`, `/send-newsletter`, `/render-slides`) and 1 generic render script to replace the hardcoded ones.

## Current State

### Agents (already exist in `.claude/agents/`)

| Agent | Model | Purpose |
|-------|-------|---------|
| `content-orchestrator` | opus | Master coordinator, 7-phase pipeline |
| `newsletter-composer` | sonnet | Creates email.html, browser.html, newsletter.json |
| `linkedin-post-writer` | sonnet | Creates post.json, post-text.md, preview.html, slide HTMLs |
| `changelog-writer` | sonnet | Creates markdown + JSON changelogs from git |
| `visual-asset-generator` | sonnet | Creates HTML/CSS visual assets |
| `brand-reviewer` | sonnet | Quality gate, writes to content/reviews/ |
| `blog-writer` | opus | SEO-optimized blog posts |
| `seo-optimizer` | sonnet | Improves existing blog posts |
| `metrics-analyzer` | sonnet | Analyzes Resend + LinkedIn performance |

### Scripts (already exist in `scripts/`)

| Script | Status | Notes |
|--------|--------|-------|
| `send-newsletter-broadcast.ts` | Working | Resend API: list segments, create broadcast, send |
| `render-carousel-slides.ts` | Hardcoded | Only works for `2026-02-your-ai-your-context` |
| `render-founder-carousel-0219.ts` | Hardcoded | Only works for `2026-02-19-founder` |
| `capture-carousel-slides.mjs` | Legacy | Puppeteer version, replaced by Playwright scripts |

### Gaps

- No skills/commands to trigger agents from Claude Code
- No generic slide renderer (all hardcoded per campaign)
- No publisher workflow (content-publisher agent referenced but doesn't exist)
- `content/changelogs/` is empty — pipeline never run end-to-end
- `content/metrics/` is empty — no metrics data collected yet

---

## Files to Create

| File | Purpose |
|------|---------|
| `.claude/skills/content-run/SKILL.md` | Full weekly pipeline: analyze → changelog → assets → newsletter → LinkedIn → review |
| `.claude/skills/newsletter/SKILL.md` | Create newsletter (spawns newsletter-composer + brand-reviewer) |
| `.claude/skills/linkedin/SKILL.md` | Create LinkedIn post + render carousel slides + brand review |
| `.claude/skills/send-newsletter/SKILL.md` | Validate → deploy browser version → Resend broadcast → send |
| `.claude/skills/render-slides/SKILL.md` | Render slide-*.html to PNG via Playwright (utility) |
| `scripts/render-slides.ts` | Generic Playwright renderer (replaces hardcoded scripts) |

No existing files are modified. The two hardcoded scripts can be deleted later.

---

## 1. `scripts/render-slides.ts` — Generic Carousel Renderer

Replaces the campaign-specific scripts with a single reusable script.

**Usage:**
```bash
bun run scripts/render-slides.ts --dir content/linkedin/2026-02-your-ai-your-context
bun run scripts/render-slides.ts --dir content/linkedin/2026-02-19-founder --output carousel-images
```

**CLI Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `--dir` | (required) | LinkedIn post directory containing slide-*.html |
| `--output` | `carousel-images` | Output subdirectory name |
| `--width` | `1080` | Viewport width |
| `--height` | `1350` | Viewport height |
| `--scale` | `2` | Device scale factor (retina) |
| `--wait` | `2000` | Font/animation wait time in ms |

**Logic:**
1. Parse `--dir` from CLI args (required, exits with error if missing)
2. Resolve `--dir` to absolute path relative to project root
3. Glob `slide-*.html` in the directory, sorted naturally (slide-1 before slide-2)
4. Create `<dir>/<output>/` directory
5. Launch Playwright chromium with `deviceScaleFactor`
6. For each slide: set viewport → `setContent(html)` → `waitForTimeout` → screenshot with clip → save PNG
7. Print summary with file sizes
8. Exit non-zero on errors

**Based on:** `scripts/render-carousel-slides.ts` (exact same Playwright pattern, just parameterized)

---

## 2. `/render-slides` Skill

**Frontmatter:**
```yaml
name: render-slides
description: Render carousel slide HTML files to PNG images using Playwright.
argument-hint: '<path/to/linkedin/post/directory>'
allowed-tools: Bash(bun run scripts/render-slides.ts *), Bash(ls *), Read, Glob
```

**Steps:**
1. Validate directory exists and contains `slide-*.html` files
2. Run `bun run scripts/render-slides.ts --dir $ARGUMENTS`
3. Report results table (slide file → PNG → size)

---

## 3. `/newsletter` Skill

**Frontmatter:**
```yaml
name: newsletter
description: Create a complete newsletter. Spawns newsletter-composer and brand-reviewer agents.
argument-hint: '[topic or content description]'
allowed-tools: Task, Bash(git log *), Bash(ls *), Read, Glob
```

**Steps:**
1. **Determine month**: Current YYYY-MM. Warn if `email.html` already exists
2. **Gather context**: Check `content/changelogs/*.json`, run `git log --since="7 days ago"`
3. **Spawn newsletter-composer**: Task tool → passes topic, changelogs, month. Agent creates:
   - `content/newsletters/YYYY-MM/drafts/v1.html` (draft)
   - `content/newsletters/YYYY-MM/email.html` (final Resend version)
   - `content/newsletters/YYYY-MM/browser.html` (web version)
   - `content/newsletters/YYYY-MM/newsletter.json` (metadata)
4. **Spawn brand-reviewer**: Task tool → reviews `email.html`, saves report to `content/reviews/`
5. **Report**: Table of created files + brand review score
6. **Next steps**: Preview browser.html, then `/send-newsletter YYYY-MM`

---

## 4. `/linkedin` Skill

**Frontmatter:**
```yaml
name: linkedin
description: Create a LinkedIn post with visual assets and optional carousel. Renders slides to PNG.
argument-hint: '[topic] [--type carousel|single|text]'
allowed-tools: Task, Bash(bun run scripts/render-slides.ts *), Bash(ls *), Bash(git log *), Read, Glob
```

**Steps:**
1. **Parse arguments**: Extract topic and optional `--type` (carousel/single/text, default: auto)
2. **Gather context**: Check changelogs, existing visual assets
3. **Spawn linkedin-post-writer**: Task tool → passes topic, type, date, context. Agent creates:
   - `content/linkedin/YYYY-MM-DD-slug/post.json`
   - `content/linkedin/YYYY-MM-DD-slug/post-text.md`
   - `content/linkedin/YYYY-MM-DD-slug/preview.html`
   - `content/linkedin/YYYY-MM-DD-slug/slide-*.html` (if carousel)
4. **Render slides** (if carousel): Check for `slide-*.html`, run `bun run scripts/render-slides.ts --dir <post-dir>`
5. **Spawn brand-reviewer**: Task tool → reviews post.json + preview.html
6. **Report**: Table of all created files, slide count, PNG count, brand score

---

## 5. `/send-newsletter` Skill

**Frontmatter:**
```yaml
name: send-newsletter
description: Send a completed newsletter via Resend Broadcast. Validates, deploys browser version, sends.
argument-hint: '<YYYY-MM> [segment-id]'
allowed-tools: Bash(bun run scripts/send-newsletter-broadcast.ts *), Bash(ls *), Bash(cp *), Bash(mkdir *), Bash(cd *), Read, Write
```

**Steps:**
1. **Parse arguments**: MONTH (required) + optional SEGMENT_ID
2. **Validate prerequisites**:
   - `email.html` must exist → abort if missing
   - `newsletter.json` status must be "draft" → abort if "sent"
   - Warn if no brand review found in `content/reviews/`
3. **Show preview**: Subject, preview text, HTML size from newsletter.json
4. **Segment selection**:
   - If no segment ID → run `--list-segments`, show options, tell user to re-run with ID → STOP
   - If segment ID provided → run `--list-contacts --segment <id>`, show recipient count
5. **Deploy browser version**:
   - `mkdir -p newsletter-site/YYYY-MM`
   - `cp content/newsletters/YYYY-MM/browser.html newsletter-site/YYYY-MM/index.html`
   - `cd newsletter-site && vercel --prod`
6. **Create Resend broadcast**: `--create --html <path> --subject <subject> --segment <id>`
7. **Send**: Show final confirmation summary, then `--send <broadcast-id>`
8. **Update newsletter.json**: Set `status: "sent"`, `resend_broadcast_id`, `sent_at`
9. **Report**: Final summary table (month, subject, recipients, broadcast ID, browser URL, status)

---

## 6. `/content-run` Skill — Full Weekly Pipeline

**Frontmatter:**
```yaml
name: content-run
description: Full weekly content pipeline. Analyzes changes, creates changelogs, newsletter, LinkedIn posts, renders slides, runs brand review.
argument-hint: '[optional: "last 14 days" or "PR #123 #124"]'
allowed-tools: Task, Bash(git log *), Bash(git show *), Bash(gh pr *), Bash(ls *), Bash(bun run scripts/render-slides.ts *), Read, Glob
```

**Phases:**

### Phase 1: Analyze recent changes
- `git log --oneline --since="7 days ago"`
- `gh pr list --state merged --limit 10 --json number,title,body,mergedAt`
- Categorize: HERO_FEATURE, SECONDARY_FEATURES[], FIXES[]

### Phase 2: Create changelogs
- Spawn `changelog-writer` via Task for each significant item
- Output: `content/changelogs/YYYY-MM-DD-slug.md` + `.json`

### Phase 3: Generate visual assets
- Spawn `visual-asset-generator` via Task for hero feature
- Output: `content/assets/<feature>-illustration.html`

### Phase 4: Create newsletter
- Spawn `newsletter-composer` via Task with all changelogs as input
- Output: `content/newsletters/YYYY-MM/email.html` + `browser.html` + `newsletter.json`

### Phase 5: Create LinkedIn posts
- Spawn `linkedin-post-writer` via Task (carousel for hero, text for updates)
- Output: `content/linkedin/YYYY-MM-DD-slug/` with all files

### Phase 6: Brand review
- Spawn `brand-reviewer` via Task for all created content
- Output: `content/reviews/YYYY-MM-DD-weekly-run-review.md`

### Phase 7: Render carousel slides
- Run `bun run scripts/render-slides.ts --dir <post-dir>` for any carousel posts
- Output: PNG files in `carousel-images/` subdirectories

### Phase 8: Summary report
- Comprehensive table of ALL files created across all phases
- Next steps: preview links, `/send-newsletter YYYY-MM`

---

## Workflow Diagram

```
/content-run (full pipeline)
  ├── Phase 1: git log + gh pr list (no agent)
  ├── Phase 2: Task → changelog-writer (×N)
  ├── Phase 3: Task → visual-asset-generator (after Phase 2)
  ├── Phase 4: Task → newsletter-composer (after Phase 2+3)
  ├── Phase 5: Task → linkedin-post-writer (after Phase 2+3)
  ├── Phase 6: Task → brand-reviewer (after Phase 4+5)
  └── Phase 7: bun run scripts/render-slides.ts (after Phase 5)

/newsletter (standalone)
  ├── git log + ls changelogs (no agent)
  ├── Task → newsletter-composer
  └── Task → brand-reviewer

/linkedin (standalone)
  ├── ls changelogs + assets (no agent)
  ├── Task → linkedin-post-writer
  ├── bun run scripts/render-slides.ts (if carousel)
  └── Task → brand-reviewer

/send-newsletter (deployment)
  ├── Validate email.html + newsletter.json
  ├── cp + vercel --prod (deploy browser version)
  ├── bun run scripts/send-newsletter-broadcast.ts --create
  └── bun run scripts/send-newsletter-broadcast.ts --send

/render-slides (utility)
  └── bun run scripts/render-slides.ts --dir <path>
```

---

## Verification Plan

After implementation, test each skill:

1. **`/render-slides content/linkedin/2026-02-your-ai-your-context`** — should produce PNGs matching the existing hardcoded script output
2. **`/newsletter "February product update"`** — should create files in `content/newsletters/2026-02/`
3. **`/linkedin "Workflow Builder launch --type carousel"`** — should create post directory + render slides
4. **`/send-newsletter 2026-02`** — should list segments on first run (without segment ID)
5. **`/content-run`** — full pipeline test (most comprehensive)
