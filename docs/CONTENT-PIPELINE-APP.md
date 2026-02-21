# Content Pipeline App — Design Document

A local-first web app that puts a visual UI over Claude Code terminal sessions for content creation, preview, annotation, publishing, and analytics.

## Why Local-First

- **Uses Claude Code subscription** — no separate API billing. The `@anthropic-ai/claude-code` SDK runs locally and authenticates with your existing CLI session.
- **Full codebase access** — Claude Code reads the repo directly. It knows your product features, past content, tone, persona, agents, and skills without any sync.
- **MCP connections preserved** — all MCP servers configured in `.claude/` work automatically.
- **No auth needed** — single user, localhost only.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  localhost:3001  (pipeline-ui/)                               │
│                                                              │
│  ┌─────────────────────────┐  ┌───────────────────────────┐ │
│  │     Preview Pane        │  │      Chat Pane             │ │
│  │                         │  │                            │ │
│  │  Newsletter | LinkedIn  │  │  Claude Code session       │ │
│  │  Blog | Assets          │  │  (streaming via SDK)       │ │
│  │                         │  │                            │ │
│  │  [Comment pins]         │  │  Shows tool usage,         │ │
│  │  [Version tabs]         │  │  agent spawning,           │ │
│  │  [Publish button]       │  │  file changes              │ │
│  └─────────────────────────┘  └───────────────────────────┘ │
│                                                              │
│  API Routes (Next.js server-side, same process)              │
│  ├── /api/chat      → Claude Code SDK (streaming)            │
│  ├── /api/content   → File system read/watch                 │
│  ├── /api/publish   → LinkedIn, Resend, Framer APIs          │
│  └── /api/analytics → PostHog, Resend, GA data               │
└──────────────────────────────────────────────────────────────┘
         │                           │
         │ reads/writes              │ API calls
         ▼                           ▼
┌─────────────────┐   ┌──────────────────────────────────────┐
│  Project Root    │   │  External Services                   │
│  ├── content/    │   │  ├── LinkedIn API (OAuth2)           │
│  ├── .claude/    │   │  ├── Resend API (broadcasts)         │
│  ├── scripts/    │   │  ├── Framer CMS API (blog posts)     │
│  ├── docs/       │   │  ├── PostHog API (events/funnels)    │
│  └── ...         │   │  └── Google Analytics API (traffic)   │
└─────────────────┘   └──────────────────────────────────────┘
```

**Key design decision**: Everything runs in one Next.js process. API routes handle Claude Code SDK, file operations, and external API calls. No separate backend server needed.

---

## Project Structure

```
pipeline-ui/                          ← New subfolder in repo root
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── .env.local                        ← API keys (LinkedIn, Resend, PostHog, GA)
│
├── app/
│   ├── layout.tsx                    ← Shell: sidebar nav + main area
│   ├── page.tsx                      ← Dashboard: split pane (preview + chat)
│   ├── library/
│   │   └── page.tsx                  ← Content library: browse all content
│   ├── analytics/
│   │   └── page.tsx                  ← Analytics dashboard: funnel + metrics
│   ├── calendar/
│   │   └── page.tsx                  ← Content calendar: planned vs published
│   ├── settings/
│   │   └── page.tsx                  ← Persona, tone, API key config
│   │
│   └── api/
│       ├── chat/
│       │   └── route.ts              ← Claude Code SDK streaming endpoint
│       ├── content/
│       │   ├── list/route.ts         ← List content files by type
│       │   ├── read/route.ts         ← Read a content file
│       │   └── watch/route.ts        ← SSE: file change notifications
│       ├── publish/
│       │   ├── linkedin/route.ts     ← Post to LinkedIn
│       │   ├── resend/route.ts       ← Create/send Resend broadcast
│       │   └── framer/route.ts       ← Publish blog to Framer CMS
│       ├── analytics/
│       │   ├── resend/route.ts       ← Resend campaign metrics
│       │   ├── linkedin/route.ts     ← LinkedIn page analytics
│       │   ├── posthog/route.ts      ← PostHog funnel data
│       │   └── ga/route.ts           ← Google Analytics data
│       └── comments/
│           └── route.ts              ← Save/load annotation comments (JSON file)
│
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx             ← Sidebar + header + main content area
│   │   ├── sidebar-nav.tsx           ← Navigation: Dashboard, Library, Analytics, Calendar, Settings
│   │   └── split-pane.tsx            ← Resizable left/right split
│   │
│   ├── chat/
│   │   ├── chat-pane.tsx             ← Full chat interface container
│   │   ├── message-list.tsx          ← Scrollable message history
│   │   ├── message-bubble.tsx        ← Single message (text, markdown)
│   │   ├── tool-use-card.tsx         ← Collapsible card showing tool usage (file edits, bash, agent spawn)
│   │   ├── agent-progress.tsx        ← Shows sub-agent progress (e.g. "newsletter-composer running...")
│   │   ├── chat-input.tsx            ← Input with skill autocomplete (/newsletter, /linkedin, etc.)
│   │   └── skill-picker.tsx          ← Dropdown for available skills
│   │
│   ├── preview/
│   │   ├── preview-pane.tsx          ← Container with content type tabs
│   │   ├── content-renderer.tsx      ← Sandboxed iframe for HTML content
│   │   ├── comment-overlay.tsx       ← Click-to-comment layer over iframe
│   │   ├── comment-pin.tsx           ← Individual comment marker
│   │   ├── comment-sidebar.tsx       ← List of all comments with resolve/send-to-chat actions
│   │   ├── version-selector.tsx      ← Dropdown: v1, v2, ..., final
│   │   └── diff-view.tsx             ← Side-by-side diff between versions
│   │
│   ├── library/
│   │   ├── content-grid.tsx          ← Card grid of all content
│   │   ├── content-card.tsx          ← Single content card (thumbnail, title, status, date)
│   │   ├── filter-bar.tsx            ← Filter by type, status, date range
│   │   └── content-detail.tsx        ← Full detail view with preview + metadata
│   │
│   ├── analytics/
│   │   ├── funnel-chart.tsx          ← Content → Engagement → Conversion funnel
│   │   ├── metric-card.tsx           ← Single KPI card (open rate, engagement, etc.)
│   │   ├── channel-comparison.tsx    ← Newsletter vs LinkedIn vs Blog performance
│   │   ├── timeline-chart.tsx        ← Performance over time
│   │   └── top-content.tsx           ← Best performing content ranked
│   │
│   ├── publish/
│   │   ├── publish-dialog.tsx        ← Confirmation dialog before publishing
│   │   ├── linkedin-publisher.tsx    ← LinkedIn post form (text preview, image upload, schedule)
│   │   ├── resend-sender.tsx         ← Newsletter send form (segment select, preview, schedule)
│   │   └── framer-publisher.tsx      ← Blog publish form (CMS fields, SEO preview)
│   │
│   └── ui/                           ← Shared primitives (shadcn/ui)
│       ├── button.tsx
│       ├── card.tsx
│       ├── tabs.tsx
│       ├── dialog.tsx
│       ├── tooltip.tsx
│       └── ...
│
├── lib/
│   ├── claude.ts                     ← Claude Code SDK wrapper + session management
│   ├── file-watcher.ts              ← Watch content/ directory for changes (chokidar)
│   ├── content-parser.ts            ← Parse newsletter.json, post.json, blog frontmatter
│   ├── linkedin-api.ts              ← LinkedIn OAuth2 + posting + analytics
│   ├── resend-api.ts                ← Resend broadcast + metrics (wraps existing script)
│   ├── framer-api.ts                ← Framer CMS API for blog publishing
│   ├── posthog-api.ts               ← PostHog events + funnels API
│   ├── ga-api.ts                    ← Google Analytics Data API
│   ├── types.ts                     ← Shared TypeScript types
│   └── constants.ts                 ← Content paths, status values, etc.
│
├── hooks/
│   ├── use-chat.ts                  ← Chat state management + streaming
│   ├── use-content.ts               ← Content file listing + watching
│   ├── use-comments.ts              ← Comment CRUD
│   └── use-analytics.ts             ← Analytics data fetching
│
└── data/
    └── comments.json                ← Local comment storage (gitignored)
```

---

## Core Features

### 1. Chat Pane — Claude Code in the Browser

The right pane is a chat interface that wraps the Claude Code SDK.

**How it works:**

```
Browser                    Next.js API Route              Claude Code SDK
   │                            │                              │
   │  POST /api/chat            │                              │
   │  { message, sessionId }    │                              │
   │ ──────────────────────────>│                              │
   │                            │  claude.stream({             │
   │                            │    prompt: message,          │
   │                            │    cwd: PROJECT_ROOT,        │
   │                            │    allowedTools: [...]       │
   │                            │  })                          │
   │                            │ ────────────────────────────>│
   │                            │                              │
   │   SSE: text chunk          │  <── event: text             │
   │ <──────────────────────────│                              │
   │   SSE: tool_use            │  <── event: tool_use         │
   │ <──────────────────────────│      (Read, Write, Bash...)  │
   │   SSE: tool_result         │  <── event: tool_result      │
   │ <──────────────────────────│                              │
   │   SSE: agent_spawn         │  <── event: task_start       │
   │ <──────────────────────────│      (newsletter-composer)   │
   │   ...                      │                              │
   │   SSE: done                │  <── stream ends             │
   │ <──────────────────────────│                              │
```

**SDK integration** (`lib/claude.ts`):

```typescript
import { claude } from '@anthropic-ai/claude-code'

export async function* streamChat(message: string, sessionId?: string) {
  const stream = claude.stream({
    prompt: message,
    options: {
      cwd: process.env.PROJECT_ROOT || path.resolve(__dirname, '../..'),
      allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'Task'],
      // Resume previous session if sessionId provided
      ...(sessionId ? { resume: sessionId } : {}),
    }
  })

  for await (const event of stream) {
    yield event  // { type: 'text' | 'tool_use' | 'tool_result' | ... }
  }
}
```

**Chat input features:**
- Skill autocomplete: type `/` to see available skills (`/newsletter`, `/linkedin`, `/content-run`, etc.)
- Comment injection: "Send comments to Claude" button packages all unresolved preview comments as context
- Quick actions: buttons for common operations ("Create newsletter", "Create LinkedIn post", "Run full pipeline")
- Session persistence: resume previous conversations

**Tool usage display:**
- Collapsible cards for each tool invocation
- File edits shown as diffs (green/red highlighting)
- Bash commands shown with output
- Agent spawns shown as progress indicators with agent name and status

### 2. Preview Pane — Live Content Preview with Annotations

The left pane shows the content being created/edited, with real-time updates.

**Content type tabs:**

| Tab | What it renders | Source file |
|-----|----------------|-------------|
| Newsletter | Email HTML in 600px-wide iframe | `content/newsletters/YYYY-MM/email.html` |
| LinkedIn | LinkedIn feed mockup | `content/linkedin/YYYY-MM-slug/preview.html` |
| Blog | Rendered markdown | `content/blog/YYYY-MM-DD-slug.md` |
| Assets | Raw HTML assets | `content/assets/*.html` |

**Live reload:**
- File watcher (chokidar) monitors `content/` directory
- When Claude creates/edits a file, the preview auto-refreshes
- SSE endpoint (`/api/content/watch`) pushes file change events to the browser

**Version navigation:**
- Dropdown shows available versions: `v1`, `v2`, ..., `final`
- For newsletters: reads `content/newsletters/YYYY-MM/drafts/v*.html`
- Side-by-side diff view between any two versions

**Annotation system (Figma-style):**

```
┌──────────────────────────────────────┐
│  [Newsletter Preview]                │
│                                      │
│  ┌──────────────────────────────┐   │
│  │                              │   │
│  │   Denker Newsletter          │   │
│  │                      (1)●    │   │  ← Comment pin #1
│  │   Your AI assistant that     │   │
│  │   learns how you work        │   │
│  │              (2)●            │   │  ← Comment pin #2
│  │                              │   │
│  └──────────────────────────────┘   │
│                                      │
│  Comments ─────────────────────────  │
│  (1) "Make this headline bigger"     │
│  (2) "Change tone to more casual"    │
│                                      │
│  [ Send all comments to Claude → ]   │
└──────────────────────────────────────┘
```

**How comments become Claude instructions:**
1. User clicks on preview → pin appears at click position
2. User types comment (e.g., "make this headline bigger")
3. Comments accumulate in the sidebar
4. User clicks "Send to Claude" → all comments are packaged into a prompt:

```
Revise content/newsletters/2026-02/email.html based on these comments:

1. [at y=120px, near "Denker Newsletter"]: "Make this headline bigger"
2. [at y=280px, near "Your AI assistant"]: "Change tone to more casual"

Apply all changes and maintain brand guidelines.
```

### 3. Content Library — Browse Everything

A grid/list view of all content across all types.

**Content card shows:**
- Thumbnail (auto-generated from HTML preview or first slide)
- Title (from newsletter.json subject or post.json title)
- Type badge (Newsletter / LinkedIn / Blog)
- Status badge (Draft → Reviewed → Published)
- Date created
- Performance metrics (if published): open rate, engagement, views

**Filters:**
- By type: Newsletter, LinkedIn, Blog
- By status: Draft, Reviewed, Published
- By date range
- Search by keyword

**Actions per card:**
- Open in preview pane
- Edit (opens split pane with chat)
- Publish (opens publish dialog)
- Duplicate (create new version)
- Delete

### 4. Publishing — One-Click to LinkedIn, Resend, Framer

Each content type has a dedicated publisher:

#### LinkedIn Publisher

```
┌──────────────────────────────────────┐
│  Publish to LinkedIn                 │
│                                      │
│  Post text (from post-text.md):      │
│  ┌──────────────────────────────┐   │
│  │ Building AI that actually     │   │
│  │ remembers context is hard.    │   │
│  │ Here's what we learned...     │   │
│  └──────────────────────────────┘   │
│                                      │
│  Images: 5 carousel slides           │
│  [slide-1.png] [slide-2.png] ...     │
│                                      │
│  Schedule: [Now ▼] or [Pick time]    │
│                                      │
│  [ Cancel ]  [ Publish to LinkedIn ] │
└──────────────────────────────────────┘
```

**Implementation:**
- LinkedIn OAuth2 flow (one-time setup in Settings)
- `POST /api/publish/linkedin` → calls LinkedIn Share API
- Supports: text posts, single image, multi-image (carousel via document upload)
- Stores LinkedIn post ID in `post.json` after publishing
- Updates status to `published`

#### Resend Newsletter Sender

```
┌──────────────────────────────────────┐
│  Send Newsletter via Resend          │
│                                      │
│  Subject: AI that learns how you work│
│  From: Team Denker <team@denker.ai>  │
│                                      │
│  Segment: [All Subscribers ▼]        │
│  Recipients: 847 active contacts     │
│                                      │
│  ☑ Deploy browser version first      │
│                                      │
│  Schedule: [Now ▼] or [Pick time]    │
│                                      │
│  [ Cancel ]  [ Send Newsletter ]     │
└──────────────────────────────────────┘
```

**Implementation:**
- Wraps existing `scripts/send-newsletter-broadcast.ts` logic
- `POST /api/publish/resend` → create broadcast + send
- Auto-deploys browser.html to newsletter-site/ before sending
- Shows recipient count from segment
- Updates newsletter.json status after send

#### Framer Blog Publisher

```
┌──────────────────────────────────────┐
│  Publish Blog to Framer              │
│                                      │
│  Title: Why AI Keeps Forgetting      │
│  Slug: why-ai-keeps-forgetting       │
│  Category: [Product ▼]              │
│  Tags: [AI] [Memory] [Context]       │
│                                      │
│  SEO Preview:                        │
│  Why AI Keeps Forgetting Your Cont..│
│  www.denker.ai/blog/why-ai-keeps... │
│  Most AI tools treat every conversa..│
│                                      │
│  [ Cancel ]  [ Publish to Framer ]   │
└──────────────────────────────────────┘
```

**Implementation:**
- Framer CMS API: create/update collection item
- Reads markdown frontmatter for metadata
- Converts markdown to HTML for Framer rich text field
- Updates blog post status after publishing

### 5. Analytics Dashboard — Full Funnel View

Aggregates data from all channels into one view.

**Funnel visualization:**

```
Content Created    Distributed    Engaged    Converted
     │                │              │           │
     ▼                ▼              ▼           ▼
  ┌──────┐      ┌──────────┐   ┌────────┐  ┌────────┐
  │  12  │ ───> │  847     │──>│  212   │─>│   34   │
  │pieces│      │recipients│   │engaged │  │signups │
  └──────┘      └──────────┘   └────────┘  └────────┘
                                25% rate     4% rate
```

**Data sources:**

| Source | What it provides | API |
|--------|-----------------|-----|
| Resend | Opens, clicks, bounces, unsubscribes per newsletter | Resend API |
| LinkedIn | Impressions, engagement, clicks, followers per post | LinkedIn Analytics API |
| PostHog | Custom events: page views, CTA clicks, sign-ups | PostHog Events API |
| Google Analytics | Traffic sources, page views, sessions | GA4 Data API |
| Framer | Blog page views (via GA or Framer analytics) | Framer API / GA |

**Dashboard panels:**

1. **KPI Cards** — Open rate, engagement rate, click rate, conversion rate (current month vs previous)
2. **Channel Comparison** — Side-by-side: Newsletter vs LinkedIn vs Blog performance
3. **Content Performance** — Table ranking all content by engagement
4. **Timing Analysis** — Best day/time to publish (from historical data)
5. **Funnel** — End-to-end: content → views → engagement → website visits → sign-ups
6. **Trend** — Line chart of key metrics over time

**Data collection flow:**

```
Resend webhooks ──┐
LinkedIn API ─────┤
PostHog API ──────┼──> /api/analytics/* ──> Aggregate ──> Dashboard
GA4 API ──────────┤
Framer API ───────┘
```

Analytics data is cached locally in `pipeline-ui/data/analytics-cache.json` to avoid repeated API calls. Refreshed on demand or every 6 hours.

### 6. Content Calendar

Simple calendar view showing:
- Planned content (from drafts in `content/`)
- Published content (with dates from metadata)
- Gaps (weeks without content)
- Quick-add: click a date to start creating content for that date

### 7. Settings

- **Persona**: Name, title, company, tone preferences, banned phrases
- **API Keys**: LinkedIn OAuth tokens, Resend API key, PostHog project key, GA property ID, Framer API key
- **Content Defaults**: Default hashtags, CTA URLs, email from address
- **Brand**: Primary colors, font preferences (loaded from `docs/BRAND-GUIDELINES.md`)

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 15 (App Router) | Already used in main project, great DX |
| UI | Tailwind CSS + shadcn/ui | Already used, consistent with main app |
| Chat streaming | Server-Sent Events | Simple, reliable for streaming text |
| Claude integration | `@anthropic-ai/claude-code` SDK | Uses existing subscription, full tool access |
| File watching | chokidar | Standard Node.js file watcher |
| Content rendering | iframe (sandboxed) | Safe HTML rendering, supports all email HTML |
| Charts | Recharts or Chart.js | Lightweight, good for dashboards |
| Split pane | react-resizable-panels | Popular, accessible, keyboard support |
| Local storage | JSON files in `pipeline-ui/data/` | No database needed for single user |
| Icons | Lucide React | Already used in main app |

---

## API Routes Detail

### `/api/chat` — Claude Code Streaming

```typescript
// POST /api/chat
// Request: { message: string, sessionId?: string }
// Response: SSE stream of Claude Code events

// Event types streamed to client:
{ type: 'text', content: 'Here is the newsletter...' }
{ type: 'tool_use', tool: 'Write', input: { path: '...', content: '...' } }
{ type: 'tool_result', tool: 'Write', output: 'File written successfully' }
{ type: 'agent_start', agent: 'newsletter-composer', prompt: '...' }
{ type: 'agent_end', agent: 'newsletter-composer', result: '...' }
{ type: 'done', sessionId: 'abc123' }
```

### `/api/content/list` — Content Listing

```typescript
// GET /api/content/list?type=newsletter|linkedin|blog|all
// Response:
{
  items: [
    {
      id: '2026-02',
      type: 'newsletter',
      title: 'AI that learns how you work',
      status: 'draft',
      date: '2026-02-18',
      path: 'content/newsletters/2026-02/',
      files: ['email.html', 'browser.html', 'newsletter.json'],
      versions: ['v1', 'v2'],
      thumbnail: null // or base64 screenshot
    },
    ...
  ]
}
```

### `/api/content/watch` — File Change Notifications

```typescript
// GET /api/content/watch (SSE)
// Streams file change events:
{ type: 'created', path: 'content/newsletters/2026-02/email.html' }
{ type: 'modified', path: 'content/newsletters/2026-02/email.html' }
{ type: 'deleted', path: 'content/linkedin/2026-02-old/post.json' }
```

### `/api/publish/linkedin` — LinkedIn Posting

```typescript
// POST /api/publish/linkedin
// Request: {
//   postDir: 'content/linkedin/2026-02-21-slug/',
//   scheduledAt?: string // ISO datetime
// }
// Reads post-text.md + carousel-images/*.png from the directory
// Posts via LinkedIn API
// Updates post.json with linkedin_post_id and status
```

### `/api/publish/resend` — Newsletter Sending

```typescript
// POST /api/publish/resend
// Request: {
//   month: '2026-02',
//   segmentId: 'seg_abc123',
//   scheduledAt?: string
// }
// Creates Resend broadcast from email.html
// Deploys browser.html to newsletter-site/
// Sends broadcast
// Updates newsletter.json with broadcast_id and status
```

### `/api/analytics/summary` — Aggregated Metrics

```typescript
// GET /api/analytics/summary?period=30d
// Response:
{
  newsletter: {
    sent: 2,
    total_recipients: 1694,
    avg_open_rate: 0.27,
    avg_click_rate: 0.04,
    total_unsubscribes: 3
  },
  linkedin: {
    posts: 8,
    total_impressions: 12500,
    avg_engagement_rate: 0.056,
    total_clicks: 340
  },
  blog: {
    posts: 3,
    total_views: 2100,
    avg_time_on_page: '3:24'
  },
  funnel: {
    content_pieces: 13,
    total_reach: 15194,
    total_engaged: 3040,
    total_conversions: 127,
    conversion_rate: 0.008
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation + Chat (Week 1)

**Goal**: Split pane UI with working Claude Code chat.

**Files:**
- `pipeline-ui/` scaffolding (Next.js, Tailwind, shadcn/ui)
- `app/layout.tsx`, `app/page.tsx` — shell + split pane
- `components/layout/split-pane.tsx` — resizable panels
- `components/chat/chat-pane.tsx` — message list + input
- `components/chat/message-bubble.tsx` — text + markdown rendering
- `components/chat/tool-use-card.tsx` — collapsible tool display
- `components/chat/chat-input.tsx` — input with `/` skill autocomplete
- `lib/claude.ts` — SDK wrapper
- `app/api/chat/route.ts` — streaming endpoint

**Testable**: Type a message, see Claude Code respond with streaming. Tool usage displayed. Skills autocomplete works.

### Phase 2: Preview Pane + File Watching (Week 1-2)

**Goal**: Live content preview that updates when Claude creates/edits files.

**Files:**
- `components/preview/preview-pane.tsx` — tabbed preview container
- `components/preview/content-renderer.tsx` — sandboxed iframe
- `components/preview/version-selector.tsx` — version dropdown
- `lib/file-watcher.ts` — chokidar watching `content/`
- `app/api/content/watch/route.ts` — SSE file changes
- `app/api/content/list/route.ts` — list content files
- `app/api/content/read/route.ts` — read file content
- `hooks/use-content.ts` — content state + auto-refresh

**Testable**: Ask Claude to create a newsletter. Preview pane auto-shows the HTML. Switch between versions. Tabs for different content types.

### Phase 3: Annotations + Comments (Week 2)

**Goal**: Click on preview to add comments, send them to Claude as revision instructions.

**Files:**
- `components/preview/comment-overlay.tsx` — click handler + pin placement
- `components/preview/comment-pin.tsx` — numbered pin marker
- `components/preview/comment-sidebar.tsx` — comment list
- `app/api/comments/route.ts` — save/load comments
- `hooks/use-comments.ts` — comment CRUD
- `data/comments.json` — local storage

**Testable**: Click on preview → add comment → see pin. Click "Send to Claude" → comments become revision prompt. Claude applies changes → preview updates.

### Phase 4: Content Library (Week 2-3)

**Goal**: Browse all past content with status tracking.

**Files:**
- `app/library/page.tsx`
- `components/library/content-grid.tsx`
- `components/library/content-card.tsx`
- `components/library/filter-bar.tsx`
- `lib/content-parser.ts` — parse metadata from JSON/frontmatter

**Testable**: See all newsletters, LinkedIn posts, blogs in a grid. Filter by type/status. Click to open in preview.

### Phase 5: Publishing (Week 3)

**Goal**: One-click publish to LinkedIn, Resend, Framer.

**Files:**
- `components/publish/publish-dialog.tsx`
- `components/publish/linkedin-publisher.tsx`
- `components/publish/resend-sender.tsx`
- `components/publish/framer-publisher.tsx`
- `app/api/publish/linkedin/route.ts`
- `app/api/publish/resend/route.ts`
- `app/api/publish/framer/route.ts`
- `lib/linkedin-api.ts`
- `lib/resend-api.ts` — wraps existing script logic
- `lib/framer-api.ts`
- `app/settings/page.tsx` — API key configuration

**Testable**: Click "Publish" on a LinkedIn post → it posts. Click "Send" on a newsletter → Resend broadcast created and sent. Blog → published to Framer CMS.

### Phase 6: Analytics Dashboard (Week 4)

**Goal**: See performance data from all channels in one place.

**Files:**
- `app/analytics/page.tsx`
- `components/analytics/funnel-chart.tsx`
- `components/analytics/metric-card.tsx`
- `components/analytics/channel-comparison.tsx`
- `components/analytics/timeline-chart.tsx`
- `app/api/analytics/resend/route.ts`
- `app/api/analytics/linkedin/route.ts`
- `app/api/analytics/posthog/route.ts`
- `app/api/analytics/ga/route.ts`
- `lib/posthog-api.ts`
- `lib/ga-api.ts`
- `hooks/use-analytics.ts`

**Testable**: See newsletter open rates, LinkedIn engagement, blog views. Funnel chart shows content → engagement → conversion. Compare channels side by side.

### Phase 7: Calendar + Polish (Week 4-5)

**Goal**: Content calendar, keyboard shortcuts, mobile responsiveness.

**Files:**
- `app/calendar/page.tsx`
- Polish: loading states, error handling, empty states, responsive layout

---

## Running the App

```bash
# From project root
cd pipeline-ui
bun install
bun dev  # Starts on localhost:3001

# Environment variables needed in pipeline-ui/.env.local:
PROJECT_ROOT=..                          # Path to main project root
RESEND_FULL_ACCESS_API_KEY=re_...        # For newsletter sending + metrics
LINKEDIN_CLIENT_ID=...                   # LinkedIn OAuth2
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_ACCESS_TOKEN=...                # After OAuth flow
POSTHOG_API_KEY=phx_...                  # PostHog project API key
POSTHOG_PROJECT_ID=...
GA_PROPERTY_ID=...                       # Google Analytics 4
GA_SERVICE_ACCOUNT_KEY=...               # GA service account JSON (base64)
FRAMER_API_KEY=...                       # Framer CMS API key
FRAMER_SITE_ID=...
```

---

## Key Design Decisions

### Why not deploy on Vercel?

The chat feature requires Claude Code SDK which runs as a local process. It uses your Claude subscription authentication stored on your machine. Deploying to Vercel would require API keys instead (different billing). The preview, library, and analytics features *could* be deployed, but the chat is the core — so local-first makes sense.

**Future option**: If you want remote access, you could deploy the UI on Vercel and connect to a local Claude Code backend via a tunnel (e.g., ngrok or Cloudflare Tunnel). But for now, local is simpler and free.

### Why a separate subfolder instead of routes in the main app?

- The main app is the customer-facing Denker chatbot — internal tooling shouldn't be mixed in
- Different deployment target (local vs Fly.io)
- Different dependencies (Claude Code SDK, chokidar)
- Can iterate independently without affecting the main app
- Still in the same git repo, so Claude Code has full codebase access

### Why JSON files instead of a database for comments/cache?

- Single user, no concurrency issues
- No database setup needed
- Easy to inspect and debug
- Can be gitignored (comments) or committed (config)
- If it grows, can migrate to SQLite later

### Comment-to-prompt architecture

Comments are not just text — they include positional context:

```json
{
  "id": "c1",
  "file": "content/newsletters/2026-02/email.html",
  "x": 0.45,      // percentage position in iframe
  "y": 0.12,
  "text": "Make this headline bigger",
  "nearestText": "Denker Newsletter Feb 2026",  // extracted from DOM at click point
  "resolved": false,
  "createdAt": "2026-02-21T10:30:00Z"
}
```

When "Send to Claude" is clicked, comments are formatted as a structured prompt with file path, position context, and the nearest visible text. This gives Claude enough information to find and modify the right element.
