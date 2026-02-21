# PRD: Content Pipeline

**An open-source desktop app that wraps Claude Code with a visual layer for content creation.**

Like Superset is to databases, Content Pipeline is to Claude Code — it doesn't replace the terminal, it puts a visual interface around it.

```bash
# macOS
brew install --cask content-pipeline

# npm (cross-platform)
npm install -g content-pipeline && content-pipeline

# Download
https://github.com/denker-ai/content-pipeline/releases
```

---

## Problem

Every Claude Code user who creates marketing content (newsletters, LinkedIn posts, blogs) hits three walls:

1. **Blind creation** — Claude writes HTML in a terminal. You can't see it until you manually open the file. You can't point at something and say "change this."

2. **Fake visuals** — Claude builds HTML/CSS mockups of your product UI, but canvas-rendered graphs, SVG diagrams, and React components can't be faked in static HTML. The result never looks like your actual product.

3. **Copy-paste publishing** — After creation, you manually copy text to LinkedIn, run scripts to send newsletters, push blog posts. Every time.

## Solution

A desktop app with a real terminal on the left and a visual preview on the right:

```
┌─────────────────────────────────────────────────────────┐
│  Content Pipeline                              — □ ✕    │
│─────────────────────────────────────────────────────────│
│                         │                               │
│   Terminal              │   Preview + Tools             │
│   (real Claude Code)    │                               │
│                         │   [Content] [Components]      │
│   $ claude              │                               │
│   > Create a newsletter │   ┌───────────────────────┐  │
│     about Memory Graph  │   │                       │  │
│                         │   │  [email.html render   │  │
│   I'll read the code-   │   │   auto-refreshing     │  │
│   base first...         │   │   as Claude writes]   │  │
│                         │   │                       │  │
│   ▌Read components/     │   │       📌 (1)          │  │
│     memory/knowledge-   │   │                       │  │
│     graph.tsx           │   └───────────────────────┘  │
│   ▌Write content/       │                               │
│     newsletters/2026-02 │   v1 | v2 | final             │
│     /email.html         │                               │
│                         │   [📷 PNG] [🎥 Video]        │
│   Newsletter created.   │   [Publish ▼]                 │
│   $                     │                               │
│   $ █                   │   Comments:                   │
│                         │   (1) "bigger headline"       │
│                         │   [Send to Claude →]          │
│─────────────────────────┴───────────────────────────────│
│  Session: abc1  │ Cost: $0.04 │ 12.4k tokens │ ◉ 3000  │
└─────────────────────────────────────────────────────────┘
```

**The left pane IS the real terminal.** Not a chat UI — the actual Claude Code CLI running in a PTY with full ANSI colors, progress bars, tool output. You type `claude` and interact normally.

**The right pane is what the terminal can't do.** Live preview, component browser, annotations, capture, publish.

**It connects to your existing Claude Code.** Your subscription, your agents, your skills, your MCP servers, your CLAUDE.md — all of it works because it IS your Claude Code, just with a window next to it.

---

## How It Works

| Superset | Content Pipeline |
|----------|-----------------|
| You have a database | You have Claude Code installed |
| `brew install superset` | `brew install content-pipeline` |
| Connects to your DB | Wraps your `claude` CLI in a PTY |
| Gives you charts and dashboards | Gives you content preview and publishing |
| Doesn't replace SQL | Doesn't replace the terminal |

**Under the hood:**

```
Electron App
│
├── Terminal pane (xterm.js + node-pty)
│   └── Runs your shell → you type `claude`
│   └── Watches stdout for file-write patterns → triggers preview refresh
│
├── Preview pane (webview)
│   └── chokidar watches content/ directory
│   └── Auto-renders HTML/markdown when files change
│
├── Component browser
│   └── Claude searches codebase → shows component list
│   └── User picks one → Claude renders it with mock data
│   └── Preview shows real component → capture PNG or record video
│
├── Capture (Playwright, bundled)
│   └── Screenshots preview at exact dimensions → PNG
│   └── Records interactions → MP4/GIF
│
└── Publish (from main process)
    └── LinkedIn API, Resend API, blog webhooks
    └── Direct fs + API access, no HTTP server needed
```

**No API key needed.** No server running. No port to configure. The terminal uses your existing Claude Code auth. Everything runs in one Electron process.

---

## Target User

**Claude Code builders** who market their own products.

- Solo founders, indie hackers, small dev teams
- They build products in Claude Code
- They need to produce weekly/biweekly content: newsletters, LinkedIn posts, blog articles
- They want content with real product visuals, not mockups
- They already have: Claude Code installed, a running web app, LinkedIn account, newsletter audience

---

## Core Features

### 1. Real Terminal (Left Pane)

The left pane is a real terminal emulator, not a chat UI.

**Tech:** xterm.js (rendering) + node-pty (PTY spawning) — same combo VS Code uses for its integrated terminal.

**What the user sees:**
- Full ANSI colors, cursor control, progress bars
- Claude Code's native output: text, tool usage, agent spawning, all of it
- You type `claude` and interact exactly like you do in iTerm/Terminal today
- Copy/paste, scroll, search, select — full terminal experience

**What the app does behind the scenes:**
- Watches terminal stdout for file-write patterns (`Write`, `Edit` tool outputs)
- Extracts the file path from Claude's tool output
- Triggers preview pane refresh when a `content/` file is created or modified
- Captures session IDs from Claude output for session management
- Tracks token/cost from result messages in the status bar

**Why real terminal, not chat UI:**
- You keep all Claude Code keyboard shortcuts, colors, tool formatting
- You can run other commands: `git status`, `bun dev`, `ls content/`
- Skills/agents render with their native formatting
- No re-implementation of Claude Code's output — it just works

### 2. Live Preview (Right Pane — Content Tab)

Watches the `content/` directory. Auto-updates when Claude creates or edits files.

**Auto-detection by file pattern:**

| File | Renders as |
|------|-----------|
| `**/email.html`, `**/browser.html` | Newsletter (600px-wide iframe) |
| `**/preview.html` | LinkedIn post mockup |
| `**/post-text.md` | LinkedIn text (with character count, "see more" cutoff marker) |
| `**/slide-*.html` | Carousel slides (1080×1350, scaled to fit) |
| `content/blog/**/*.md` | Blog post (rendered markdown with frontmatter) |
| `content/assets/**/*.html` | Visual assets (raw HTML) |

**Version navigation:**
- Detects `drafts/v1.html`, `v2.html`, etc. in newsletter directories
- Tab bar to switch versions
- Final version (`email.html`) highlighted
- Side-by-side diff between any two versions (optional)

**File watcher:**
- chokidar on the project's `content/` directory (from Electron main process)
- IPC message to renderer when files change
- Preview webview reloads on change (debounced 500ms)
- Shows which file changed in the status bar

### 3. Component Browser (Right Pane — Components Tab)

**The killer feature.** Instead of fake HTML mockups, use your real React/Vue/Svelte components with mock data, then capture as PNG or video.

**No config files. No pre-registration. Claude searches your codebase live.**

**The flow:**

```
You (in terminal): "I need a visual of the memory graph for a carousel"

Claude: searches codebase with Grep/Glob, finds components

App detects component search results in Claude's output
and renders them as clickable cards in the Components tab:

┌─────────────────────────────────────────┐
│ Components                              │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │  KnowledgeGraph                     │ │
│ │  components/memory/knowledge-       │ │
│ │  graph.tsx                          │ │
│ │  ForceGraph2D, zoom, glow nodes    │ │
│ │  [Preview →]                        │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │  MemoryGraphMini                    │ │
│ │  components/memory/memory-graph-    │ │
│ │  mini.tsx                           │ │
│ │  Compact 180px variant             │ │
│ │  [Preview →]                        │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │  WorkflowDiagram                    │ │
│ │  components/workflow/workflow-       │ │
│ │  diagram-redesign.tsx               │ │
│ │  SVG with Mermaid layout           │ │
│ │  [Preview →]                        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**User clicks "Preview" on KnowledgeGraph:**

```
You: "Preview it with 50 nodes, dark mode"

Claude writes: app/content-preview/page.tsx
  → imports the REAL KnowledgeGraph component
  → generates 50 mock nodes with realistic names
  → dark theme, fullscreen render

Next.js HMR picks it up instantly
(your app at localhost:3000 must be running)

Preview pane loads: localhost:3000/content-preview
  → shows the REAL ForceGraph2D rendering
```

**User iterates via terminal:**
```
You: "Add more nodes, zoom into the center cluster"
Claude: edits the preview page → HMR refreshes → preview updates

You: "Highlight the user_profile node"
Claude: edits props → preview updates
```

**User captures:**
- **📷 Capture PNG** → Playwright screenshots at specified dimensions (1080×1350 for carousel, 1200×627 for OG image, etc.)
- **🎥 Record Video** → Playwright records while the component animates or user interacts

**For video, Claude writes animation code directly:**
```
You: "Record a 5-second video of the graph settling"

Claude: edits the preview page so nodes start offscreen and animate in
  → Playwright records 5 seconds
  → Saves content/videos/memory-graph-settle.mp4
```

**No pre-configuration needed.** Claude searches the codebase, understands the component's props/types, generates appropriate mock data, writes a temp preview page. The preview page is a real page in your app rendered by your dev server — all providers, CSS, dependencies work because it's your actual app.

**After capture, Claude uses the image:**
```
Claude:
  1. Has content/screenshots/memory-graph-1080x1350.png
  2. Creates carousel slide HTML embedding the real screenshot
  3. Adds branded overlay: title, subtitle, gradient, logo
  4. Screenshots the composite → final marketing PNG
```

### 4. Annotations

Click on the preview to add comments. Comments get typed into the terminal as Claude instructions.

**Flow:**
1. Click anywhere on preview → pin appears at that position
2. Type comment: "make this headline bigger"
3. Comments accumulate in a sidebar below the preview
4. Click **"Send to Claude →"** → the app types this into the terminal:

```
Revise content/newsletters/2026-02/email.html:
(1) Near "Denker Newsletter" heading: "make this headline bigger"
(2) Near CTA button: "change color to brand accent"
Apply changes following brand guidelines.
```

5. Claude revises the file → file watcher triggers → preview auto-updates
6. Check the result, resolve comments, or add more

**"Send to Claude" literally types into the PTY.** It's the same as if you typed the message yourself. Claude handles it normally.

### 5. Capture Tools

Buttons in the preview toolbar.

**Screenshot (PNG):**
- Playwright captures the preview content at exact pixel dimensions
- Presets: LinkedIn carousel (1080×1350), OG image (1200×627), Newsletter hero (600×300), Custom
- Saves to `content/screenshots/` or `content/linkedin/YYYY-MM-slug/carousel-images/`
- Status bar shows: "Captured: memory-graph-1080x1350.png (245 KB)"

**Video Recording (MP4/GIF):**
- Playwright records the preview for a set duration
- Captures component animations (force graph settling, workflow executing)
- Or records while user interacts (hover tooltips, expand panels)
- Saves to `content/videos/`
- Format: MP4 (default), GIF (for LinkedIn/email), WebM

**Overlay composition:**
- Claude generates an HTML template that wraps a captured screenshot with branded elements (title, subtitle, gradient, logo)
- App renders the template in a hidden webview and captures the composite
- Result: marketing-ready image with real product visuals + brand text

### 6. Publishing

Buttons in the preview toolbar. One-click to publish.

**LinkedIn:**
- Reads `post-text.md` + `carousel-images/*.png` (or video)
- Posts via LinkedIn API (OAuth2 — one-time setup in settings)
- Supports: text, single image, carousel (document upload), video
- Updates `post.json` with `linkedin_post_id` and `status: published`

**Newsletter (Resend):**
- Reads `email.html` + `newsletter.json`
- Lists segments in a dropdown, user picks one
- Creates Resend broadcast + sends
- Deploys `browser.html` to web (runs deploy command from config)
- Updates `newsletter.json` with `broadcast_id` and `status: sent`

**Blog (webhook):**
- Reads markdown + YAML frontmatter
- POSTs to a configured webhook URL (Framer CMS, Vercel, GitHub, any endpoint)
- Updates frontmatter with `status: published` and `published_at`

**All publishing runs from Electron main process** — direct API calls, no HTTP server in between.

### 7. Content Library

A third tab in the right pane (or a sidebar toggle).

- Scans `content/` directory: newsletters, linkedin posts, blog posts
- Grid of cards: thumbnail, title, type badge, status badge, date
- Filter by type (newsletter/linkedin/blog) and status (draft/published)
- Click a card → opens in the preview pane
- Shows published metrics inline if available (from post.json/newsletter.json)

### 8. Settings

Accessible from the app menu or a gear icon.

| Setting | What |
|---------|------|
| App URL | `http://localhost:3000` — for component preview + screenshots |
| Auth cookies | Session cookie for authenticated screenshots |
| LinkedIn | OAuth2 connect button |
| Resend | API key input |
| Blog webhook | URL input |
| Persona | Company name, product, tone, target audience, banned phrases |
| Theme | Light/dark for the app itself |

Settings stored in `~/.content-pipeline/settings.json` (per-user, not committed to git).

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Electron                                                │
│                                                          │
│  Main Process (Node.js)                                  │
│  ├── node-pty → spawns shell for terminal                │
│  ├── chokidar → watches content/ directory               │
│  ├── Playwright → screenshots + video recording          │
│  ├── LinkedIn API → publishing                           │
│  ├── Resend API → newsletter sending                     │
│  ├── fs → direct file system access                      │
│  └── IPC bridge to renderer                              │
│                                                          │
│  Renderer Process (Chromium)                             │
│  ├── Left: xterm.js terminal                             │
│  ├── Right: React app                                    │
│  │   ├── Preview tab (webview/iframe)                    │
│  │   ├── Components tab (search + preview)               │
│  │   ├── Library tab (content grid)                      │
│  │   └── Toolbar (capture, publish, annotate)            │
│  └── Status bar                                          │
│                                                          │
└──────────────────┬───────────────────┬───────────────────┘
                   │                   │
          PTY shell + claude           │ Playwright
                   │                   │
                   ▼                   ▼
          ┌──────────────┐    ┌──────────────────┐
          │ Claude Code  │    │ Your App         │
          │ (CLI)        │    │ (localhost:3000)  │
          │              │    │                  │
          │ Your auth    │    │ Real components  │
          │ Your agents  │    │ Real UI          │
          │ Your skills  │    │ Real data        │
          │ Your MCP     │    │                  │
          │ Your CLAUDE  │    │                  │
          └──────────────┘    └──────────────────┘
```

**No HTTP server.** No ports. No API routes. Everything communicates via Electron IPC between main and renderer processes.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| App shell | Electron | Desktop app, wraps terminal natively, cross-platform |
| Terminal | xterm.js + node-pty | Real PTY — same as VS Code's terminal |
| Right pane UI | React + Tailwind | Fast, clean, familiar |
| Preview render | Electron webview | Sandboxed, loads localhost URLs for component preview |
| File watching | chokidar | Cross-platform, from main process |
| Screenshots | Playwright (bundled) | Headless capture at exact dimensions |
| Video | Playwright page.video() | Records interactions as MP4/WebM |
| Build/package | electron-builder | DMG (macOS), AppImage (Linux), NSIS (Windows) |
| Auto-update | electron-updater | Check GitHub releases, prompt to update |

---

## Distribution

### Download & Install

**macOS:**
```bash
brew install --cask content-pipeline
# or download .dmg from GitHub releases
```

**Linux:**
```bash
# AppImage (no install needed)
wget https://github.com/denker-ai/content-pipeline/releases/latest/download/content-pipeline.AppImage
chmod +x content-pipeline.AppImage
./content-pipeline.AppImage

# or snap / flatpak (future)
```

**Windows:**
```bash
# Download installer from GitHub releases
# or winget (future)
winget install denker.content-pipeline
```

**npm (all platforms, for developers):**
```bash
npm install -g content-pipeline
content-pipeline
```

### First Run

1. App checks for `claude` CLI → shows install instructions if missing
2. Opens with terminal in the current directory (or home)
3. Right pane shows a welcome screen:
   - "Open a project" (file picker → sets working directory)
   - "Configure app URL" (for component preview)
   - "Connect LinkedIn" (OAuth2)
   - "Add Resend key" (API key input)
4. User types `claude` in terminal → starts creating content
5. Preview pane auto-populates as files are created

### Prerequisites

| Requirement | Why | How to check |
|-------------|-----|-------------|
| Claude Code CLI | The AI engine | `claude --version` |
| Node.js 18+ | For Playwright | `node --version` |
| (Optional) Your app running | For component preview | `curl localhost:3000` |

### Config

Per-project config in `content-pipeline.json` (committed to git):

```json
{
  "content_dir": "content",
  "app_url": "http://localhost:3000",
  "publish": {
    "newsletter": {
      "provider": "resend",
      "from": "Team <team@example.com>",
      "deploy_command": "cd newsletter-site && vercel --prod"
    },
    "blog": {
      "provider": "webhook",
      "url": "https://api.framer.com/cms/..."
    }
  },
  "persona": {
    "company": "Denker",
    "product": "AI chatbot with memory and workflows",
    "tone": "Professional, approachable, no corporate jargon",
    "target_audience": "Solo founders and small dev teams"
  }
}
```

Per-user config in `~/.content-pipeline/settings.json` (not committed):

```json
{
  "theme": "dark",
  "linkedin_access_token": "...",
  "resend_api_key": "re_...",
  "auth_cookies": { "session": "..." }
}
```

### License

MIT. Open source. Contributions welcome.

---

## Implementation Phases

### Phase 1: Electron Shell + Terminal (3 days)

Ship a working Electron app with a real terminal.

```
src/
├── main/
│   ├── index.ts              # Electron main process entry
│   ├── pty.ts                # node-pty shell management
│   ├── ipc.ts                # IPC handlers (terminal ↔ renderer)
│   └── window.ts             # Window creation, menu, tray
├── renderer/
│   ├── index.html
│   ├── App.tsx               # Split pane layout
│   ├── components/
│   │   ├── terminal-pane.tsx  # xterm.js integration
│   │   └── preview-pane.tsx   # Empty placeholder
│   └── styles/
│       └── globals.css        # Tailwind
├── package.json
└── electron-builder.yml
```

**Done when:** App opens. Terminal on the left works (type `claude`, get responses with full colors). Right pane is empty placeholder. Builds as .dmg / .AppImage.

### Phase 2: Live Preview + File Watching (2 days)

Right pane shows content as Claude creates it.

```
src/main/
├── file-watcher.ts           # chokidar on content/
└── content.ts                # List/read content files via IPC

src/renderer/components/
├── preview-pane.tsx           # Tabbed container (Content | Components | Library)
├── content-renderer.tsx       # Webview for HTML, markdown renderer for .md
└── version-selector.tsx       # Draft version tabs
```

**Done when:** Type `claude` → ask it to create a newsletter → preview pane auto-shows the HTML as it's being written. Tabs for different content types. Version selector for drafts.

### Phase 3: Component Browser + Capture (3 days)

Search components, preview with mock data, capture PNG/video.

```
src/main/
├── screenshot.ts             # Playwright screenshot + video
└── capture.ts                # Overlay composition

src/renderer/components/
├── component-browser.tsx     # Component search results as cards
├── component-preview.tsx     # Webview showing localhost:3000/content-preview
├── capture-toolbar.tsx       # PNG/video buttons, size presets
└── size-presets.ts           # LinkedIn carousel, OG image, newsletter hero
```

**Done when:** Ask Claude to find a component → cards appear in Components tab → click Preview → Claude writes temp page with mock data → real component renders → click Capture PNG at 1080×1350 → real screenshot saved. Video recording works.

### Phase 4: Annotations (1 day)

Click on preview to comment, send to Claude.

```
src/renderer/components/
├── comment-overlay.tsx       # Click handler on webview
├── comment-pin.tsx           # Numbered pin marker
└── comment-sidebar.tsx       # Comment list + "Send to Claude" button
```

**Done when:** Click on preview → drop pin → type comment → "Send to Claude" types the revision request into the terminal → Claude revises → preview updates.

### Phase 5: Publishing (2 days)

One-click publish to LinkedIn and Resend.

```
src/main/
├── linkedin.ts               # LinkedIn OAuth2 + Share API
├── resend.ts                 # Resend Broadcast API
└── webhook.ts                # Generic webhook for blog

src/renderer/components/
├── publish-dialog.tsx        # Confirmation with preview
├── linkedin-publisher.tsx    # Post form (text + images/video)
├── resend-sender.tsx         # Segment picker + send confirmation
└── blog-publisher.tsx        # Webhook publish form
```

**Done when:** "Publish to LinkedIn" sends the post with carousel images. "Send Newsletter" creates Resend broadcast and sends. Status updates in metadata files.

### Phase 6: Content Library + Settings (2 days)

Browse past content. Configure connections.

```
src/renderer/components/
├── content-library.tsx       # Grid view of all content
├── content-card.tsx          # Card with thumbnail, title, status
├── filter-bar.tsx            # Type + status filter
└── settings-panel.tsx        # App URL, API keys, persona, theme
```

### Phase 7: Distribution (2 days)

Package for all platforms. Auto-updater. Homebrew cask.

```
├── electron-builder.yml      # Build config for DMG, AppImage, NSIS
├── .github/workflows/
│   └── release.yml           # Build + publish on git tag
├── Caskfile                  # Homebrew cask formula
└── README.md                 # Installation, usage, screenshots, GIFs
```

**Done when:** `brew install --cask content-pipeline` works on macOS. GitHub releases have .dmg, .AppImage, .exe. Auto-updater checks for new versions.

---

## Why CLI + Terminal, Not Agent SDK

| | Real terminal (xterm.js + node-pty) | Agent SDK | Chat UI (spawn + parse JSON) |
|-|-|---|---|
| **Auth** | Your subscription, zero config | Requires API key ($) | Your subscription |
| **Experience** | Full Claude Code: colors, progress, formatting | Raw events only | Re-implemented (lossy) |
| **Agents/Skills** | All work, native rendering | Must re-register | Work, but output is parsed |
| **MCP servers** | All connected | Must re-configure | All connected |
| **CLAUDE.md** | Loaded automatically | Must pass manually | Loaded automatically |
| **Other commands** | `git`, `bun`, `ls` — full shell | AI only | AI only |
| **Complexity** | Low (PTY passthrough) | Medium (SDK integration) | Medium (JSON parsing) |
| **Open source** | Contributors need zero keys | Contributors need API keys | Contributors need zero keys |

The real terminal is the simplest and most capable option. It's a 1:1 match with the existing Claude Code experience, plus visual panels around it.

---

## File Summary

```
src/
├── main/                     # Electron main process
│   ├── index.ts              # App entry, window management
│   ├── pty.ts                # Terminal PTY (node-pty)
│   ├── file-watcher.ts       # chokidar on content/
│   ├── content.ts            # File listing + reading
│   ├── screenshot.ts         # Playwright capture
│   ├── capture.ts            # Overlay composition
│   ├── linkedin.ts           # LinkedIn API
│   ├── resend.ts             # Resend API
│   ├── webhook.ts            # Generic webhook
│   ├── ipc.ts                # IPC handler registry
│   └── window.ts             # Window creation + menu
│
├── renderer/                 # Electron renderer (React)
│   ├── index.html
│   ├── App.tsx               # Root: split pane layout
│   ├── components/
│   │   ├── terminal-pane.tsx  # xterm.js
│   │   ├── preview-pane.tsx   # Tabbed right pane
│   │   ├── content-renderer.tsx
│   │   ├── component-browser.tsx
│   │   ├── component-preview.tsx
│   │   ├── capture-toolbar.tsx
│   │   ├── comment-overlay.tsx
│   │   ├── comment-pin.tsx
│   │   ├── comment-sidebar.tsx
│   │   ├── version-selector.tsx
│   │   ├── publish-dialog.tsx
│   │   ├── linkedin-publisher.tsx
│   │   ├── resend-sender.tsx
│   │   ├── content-library.tsx
│   │   ├── content-card.tsx
│   │   ├── filter-bar.tsx
│   │   ├── settings-panel.tsx
│   │   └── status-bar.tsx
│   ├── hooks/
│   │   ├── use-terminal.ts
│   │   ├── use-content.ts
│   │   └── use-comments.ts
│   └── styles/
│       └── globals.css
│
├── shared/
│   └── types.ts              # Shared types (IPC messages, content metadata)
│
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts            # Vite for renderer bundling
```

~30 files. No database. No HTTP server. No API key. Download, install, open, create.

---

## Success Metrics

### Does it work?

- Time: "I need a newsletter" → sent: **< 30 min** (currently 2+ hours)
- Content uses real product components: **100%** (currently 0%)
- Publish to multiple platforms from one session: **Yes**

### Does it grow?

- GitHub stars first month: > 500
- Downloads first month: > 1,000
- Contributors first quarter: > 5
- Community adapters (new publish targets): > 3

---

## For Other Claude Code Users

### Why they'd use this

1. **See what Claude creates** → live preview, not blind terminal output
2. **Real component visuals** → search codebase, render with mock data, capture
3. **One-click publish** → LinkedIn, newsletter, blog from one app
4. **No extra cost** → uses their existing Claude Code subscription
5. **Just download** → no API keys, no server setup, no configuration

### What they need

| Prerequisite | They already have it? |
|-------------|----------------------|
| Claude Code CLI | Yes (they're the target user) |
| Node.js 18+ | Yes (they're developers) |
| A web app to screenshot | Yes (they're marketing their product) |

### What they optionally connect

| Service | For what |
|---------|----------|
| LinkedIn | Publishing posts |
| Resend / Mailchimp / ConvertKit | Sending newsletters |
| Framer / Vercel / any webhook | Publishing blog posts |
