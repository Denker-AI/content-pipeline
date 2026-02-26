export const LINKEDIN_PREVIEW_TEMPLATE = `<!--
  LINKEDIN POST PREVIEW TEMPLATE
  ================================
  A pixel-accurate LinkedIn feed post mockup.

  HOW TO USE:
  1. Copy this file to: content/linkedin/YYYY-MM-DD-[topic]/preview.html
  2. Replace the placeholder sections:
     - {{FIRST_LINE}}, {{SECOND_LINE}}, {{THIRD_LINE}}: First ~3 lines visible before "see more"
     - {{FULL_POST_HTML}}: Complete post with <p> tags for paragraphs, <br> for line breaks
     - {{PASTE_VISUAL_ASSET_HTML_HERE}}: Paste visual asset HTML directly into .asset-scaler div
     - {{DATE}}: Today's date (e.g. "Feb 19")
  3. For hashtags: <span class="hashtag">#Tag</span>
  4. Open in browser to preview

  RULES:
  - NO emojis for UI elements - use SVG icons (see actions/reactions below)
  - NO iframe - inline the asset HTML directly into .asset-scaler
  - Text uses <p> tags (NOT white-space: pre-wrap)
  - "...see more" appears INLINE at end of last truncated line
  - "...see less" appears at bottom of expanded text
  - Image section: 1080x1350 asset scaled via CSS transform to fit 555px card width
  - All action bar icons are LinkedIn SVGs, not unicode/emoji
-->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LinkedIn Post Preview</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        background: #f4f2ee;
        font-family:
          -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto,
          'Helvetica Neue', 'Fira Sans', Ubuntu, Oxygen, 'Oxygen Sans',
          Cantarell, 'Droid Sans', 'Apple Color Emoji', 'Segoe UI Emoji',
          'Segoe UI Symbol', 'Lucida Grande', Helvetica, Arial, sans-serif;
        display: flex;
        justify-content: center;
        padding: 40px 16px;
        min-height: 100vh;
        -webkit-font-smoothing: antialiased;
      }

      .wrapper {
        max-width: 555px;
        width: 100%;
      }

      .card {
        background: #fff;
        border: 1px solid #d6d6d6;
        border-radius: 8px;
        overflow: hidden;
      }

      /* ===== HEADER ===== */
      .header {
        padding: 12px 16px 0;
        display: flex;
        gap: 8px;
      }

      .avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #044b2b, #065f38);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .avatar-letter {
        color: #3af88c;
        font-size: 20px;
        font-weight: 700;
        font-family: 'Inter', sans-serif;
      }

      .meta {
        flex: 1;
        min-width: 0;
      }
      .author {
        font-size: 14px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.9);
        line-height: 20px;
      }
      .author:hover {
        color: #0a66c2;
        text-decoration: underline;
        cursor: pointer;
      }
      .headline {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
        line-height: 16px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .timestamp {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
        line-height: 16px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .timestamp svg {
        flex-shrink: 0;
      }

      .more-btn {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        cursor: pointer;
        flex-shrink: 0;
        margin-top: -4px;
      }
      .more-btn:hover {
        background: rgba(0, 0, 0, 0.08);
      }

      /* ===== POST TEXT ===== */
      .body {
        padding: 8px 16px 12px;
        font-size: 14px;
        line-height: 20px;
        color: rgba(0, 0, 0, 0.9);
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      .body p {
        margin-bottom: 8px;
      }
      .body p:last-child {
        margin-bottom: 0;
      }

      .truncated {
        display: block;
      }
      .full {
        display: none;
      }
      .card.expanded .truncated {
        display: none;
      }
      .card.expanded .full {
        display: block;
      }

      .see-more,
      .see-less {
        color: rgba(0, 0, 0, 0.6);
        cursor: pointer;
        font-size: 14px;
        line-height: 20px;
      }
      .see-more:hover,
      .see-less:hover {
        color: #0a66c2;
        text-decoration: underline;
      }

      .hashtag {
        color: #0a66c2;
        cursor: pointer;
      }
      .hashtag:hover {
        text-decoration: underline;
      }

      /* ===== IMAGE (JS sets height dynamically based on data-w / data-h) ===== */
      .image-section {
        width: 100%;
        overflow: hidden;
        position: relative;
      }
      .asset-scaler {
        transform-origin: top left;
      }

      /* ===== ENGAGEMENT ===== */
      .engagement {
        padding: 8px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
        line-height: 16px;
      }
      .reactions-row {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .reaction-pills {
        display: flex;
        align-items: center;
      }
      .pill {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: -4px;
        border: 2px solid #fff;
        position: relative;
      }
      .pill:first-child {
        z-index: 3;
      }
      .pill:nth-child(2) {
        z-index: 2;
      }
      .pill:nth-child(3) {
        z-index: 1;
      }
      .pill-like {
        background: #378fe9;
      }
      .pill-celebrate {
        background: #44b37d;
      }
      .pill-love {
        background: #df704d;
      }
      .pill svg {
        width: 12px;
        height: 12px;
      }
      .reaction-count {
        margin-left: 8px;
      }
      .comment-stats {
        display: flex;
        gap: 8px;
      }
      .comment-stats span:hover {
        color: #0a66c2;
        text-decoration: underline;
        cursor: pointer;
      }

      .divider {
        height: 1px;
        background: #e0dfdc;
        margin: 0 16px;
      }

      /* ===== ACTIONS (SVG icons, not emoji) ===== */
      .actions {
        display: flex;
        padding: 4px 8px;
      }
      .action {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 12px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.6);
        transition: background 0.15s;
        -webkit-user-select: none;
        user-select: none;
      }
      .action:hover {
        background: rgba(0, 0, 0, 0.08);
      }
      .action svg {
        flex-shrink: 0;
      }
      .action span {
        font-size: 13px;
      }

      .label {
        text-align: center;
        padding: 20px;
        font-size: 11px;
        color: rgba(0, 0, 0, 0.4);
        letter-spacing: 0.5px;
        text-transform: uppercase;
        font-family: 'Inter', sans-serif;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="card" id="card">
        <!-- HEADER -->
        <div class="header">
          <div class="avatar"><span class="avatar-letter">D</span></div>
          <div class="meta">
            <div class="author">Juan Zhang</div>
            <div class="headline">Building Denker AI</div>
            <div class="timestamp">
              <span>1d</span><span>&#183;</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                width="16"
                height="16"
                fill="rgba(0,0,0,0.6)"
              >
                <path
                  d="M8 1a7 7 0 107 7 7 7 0 00-7-7zM3 8a5 5 0 011-3.12V5c0 .66.54 1.2 1.2 1.2h.6v.6c0 .33.13.64.36.87l.9.9V10H6.5a1.2 1.2 0 00-1.08.67L4.61 12.3A5 5 0 013 8zm5 5a5 5 0 003.41-1.34L10.8 11c-.22-.22-.34-.52-.34-.84V9.5l1.5-1.5h.6A1.2 1.2 0 0013.8 6.8v-.22A5 5 0 018 3v.2c0 .66-.54 1.2-1.2 1.2H5.6v.6c0 .66-.54 1.2-1.2 1.2h-.44A5 5 0 008 13z"
                />
              </svg>
            </div>
          </div>
          <div class="more-btn">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="rgba(0,0,0,0.6)"
            >
              <path
                d="M14 12a2 2 0 11-4 0 2 2 0 014 0zM14 6a2 2 0 11-4 0 2 2 0 014 0zM14 18a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
        </div>

        <!-- POST TEXT: Replace truncated and full content -->
        <div class="body">
          <div class="truncated">
            <p>{{FIRST_LINE}}</p>
            <p>{{SECOND_LINE}}</p>
            <p>
              {{THIRD_LINE}}...<span class="see-more" onclick="toggle()"
                >see more</span
              >
            </p>
          </div>
          <div class="full">
            <!-- Full post text here using <p> tags for paragraphs -->
            {{FULL_POST_HTML}}
            <p><span class="see-less" onclick="toggle()">...see less</span></p>
          </div>
        </div>

        <!-- IMAGE: Paste visual asset HTML directly into .asset-scaler
             Set data-w and data-h to the asset's natural dimensions -->
        <div class="image-section">
          <div class="asset-scaler" data-w="1080" data-h="1350">{{PASTE_VISUAL_ASSET_HTML_HERE}}</div>
        </div>

        <!-- ENGAGEMENT (placeholder counts) -->
        <div class="engagement">
          <div class="reactions-row">
            <div class="reaction-pills">
              <div class="pill pill-like">
                <svg viewBox="0 0 16 16" fill="#fff">
                  <path
                    d="M8 0a8 8 0 110 16A8 8 0 018 0zm2.91 5.39h-1.6c.12-.53.18-1.1.18-1.36 0-1.05-.67-1.78-1.38-1.78-.57 0-.75.35-.8.62l-.26 1.42c-.17.86-.64 1.58-1.26 2.05l-.07.05v4.47c.92.31 1.85.55 2.63.55h2.14c.61 0 1.04-.49 1.04-.97 0-.07-.01-.14-.03-.21.41-.14.7-.52.7-.97 0-.18-.05-.35-.13-.49.29-.18.48-.5.48-.86 0-.35-.18-.66-.45-.84.17-.17.28-.4.28-.66 0-.56-.52-1.02-1.08-1.02z"
                  />
                </svg>
              </div>
              <div class="pill pill-celebrate">
                <svg viewBox="0 0 16 16" fill="#fff">
                  <path
                    d="M8 0a8 8 0 110 16A8 8 0 018 0zm-.42 4.72c-.36-.52-.98-.72-1.56-.72-.47 0-.83.28-.83.66 0 .2.09.4.3.55l2.7 1.97-.71.98-2.7-1.97c-.57-.41-.87-.97-.87-1.55C3.91 3.72 4.72 3 5.82 3c.96 0 1.58.43 1.92.87L8 4.22l.26-.35C8.6 3.43 9.22 3 10.18 3c1.1 0 1.91.72 1.91 1.64 0 .58-.3 1.14-.87 1.55L8.52 8.16l-.71-.98 2.7-1.97c.21-.15.3-.35.3-.55 0-.38-.36-.66-.83-.66-.58 0-1.2.2-1.56.72L8 5.27l-.42-.55z"
                  />
                </svg>
              </div>
              <div class="pill pill-love">
                <svg viewBox="0 0 16 16" fill="#fff">
                  <path
                    d="M8 0a8 8 0 110 16A8 8 0 018 0zm0 3.22c.67-.83 1.61-1.22 2.64-1.22C12.57 2 14 3.46 14 5.53 14 9.42 8 13 8 13S2 9.42 2 5.53C2 3.46 3.43 2 5.36 2c1.03 0 1.97.39 2.64 1.22z"
                  />
                </svg>
              </div>
            </div>
            <span class="reaction-count">42</span>
          </div>
          <div class="comment-stats">
            <span>3 comments</span><span>&#183;</span><span>1 repost</span>
          </div>
        </div>

        <div class="divider"></div>

        <!-- ACTIONS (LinkedIn SVG icons) -->
        <div class="actions">
          <div class="action">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="rgba(0,0,0,0.6)"
            >
              <path
                d="M19.46 11l-3.91-3.91a7 7 0 01-1.69-2.74l-.49-1.47A2.76 2.76 0 0010.76 1 2.75 2.75 0 008 3.74v1.12a9.19 9.19 0 00.46 2.85L8.89 9H4.12A2.12 2.12 0 002 11.12a2.16 2.16 0 00.92 1.76A2.11 2.11 0 002 14.62a2.14 2.14 0 001.28 2 2 2 0 00-.28 1 2.12 2.12 0 002 2.12v.14A2.12 2.12 0 007.12 22h7.49a8.08 8.08 0 003.58-.84l.31-.16H21V11zM19.5 19.5h-.83l-.66.34a6.09 6.09 0 01-2.7.66H7.12a.62.62 0 01-.62-.62v-.15a.48.48 0 00-.49-.49h-.26A.62.62 0 015.13 18v-.28a.47.47 0 00-.47-.47H4.4a.63.63 0 01-.4-1.11.49.49 0 00.18-.38.5.5 0 00-.39-.49.63.63 0 01-.49-.62.62.62 0 01.62-.62h.5a.49.49 0 00.41-.22.5.5 0 00.05-.47l-.87-2.37A7.2 7.2 0 014.5 8.86V3.74A1.25 1.25 0 0110.76 2.5a1.27 1.27 0 011.2.88l.49 1.47a8.51 8.51 0 002.06 3.33L18.42 12H19.5z"
              />
            </svg>
            <span>Like</span>
          </div>
          <div class="action">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="rgba(0,0,0,0.6)"
            >
              <path
                d="M7 9h10v1H7zm0 4h7v-1H7zm16-2a6.78 6.78 0 01-2.84 5.61L12 22v-5.6H5a3 3 0 01-3-3V6a3 3 0 013-3h14a3 3 0 013 3zm-2 0a1 1 0 00-1-1H5a1 1 0 00-1 1v7.4a1 1 0 001 1h8.5v3.33l5.58-4.2A4.77 4.77 0 0021 11z"
              />
            </svg>
            <span>Comment</span>
          </div>
          <div class="action">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="rgba(0,0,0,0.6)"
            >
              <path
                d="M13.96 5H6c-.55 0-1 .45-1 1v10H3V6a3 3 0 013-3h7.96zM20 8a3 3 0 013 3v10a1 1 0 01-1.56.83l-3.2-2.15A3 3 0 0116.56 19H10a3 3 0 01-3-3v-5a3 3 0 013-3zm0 2H10a1 1 0 00-1 1v5a1 1 0 001 1h6.56a1 1 0 01.56.17L21 19.77V11a1 1 0 00-1-1z"
              />
            </svg>
            <span>Repost</span>
          </div>
          <div class="action">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="rgba(0,0,0,0.6)"
            >
              <path d="M21 3L0 10l7.66 4.26L20 6l-8.26 12.34L16 22l5-19z" />
            </svg>
            <span>Send</span>
          </div>
        </div>
      </div>
      <div class="label">
        LinkedIn Post Preview &mdash; Denker AI &mdash; {{DATE}}
      </div>
    </div>

    <script>
      function toggle() {
        document.getElementById('card').classList.toggle('expanded')
      }

      // Scale .asset-scaler to fit the card width, set .image-section height
      ;(function scaleAsset() {
        var scaler = document.querySelector('.asset-scaler')
        var section = document.querySelector('.image-section')
        if (!scaler || !section) return
        var w = parseInt(scaler.getAttribute('data-w') || '1080')
        var h = parseInt(scaler.getAttribute('data-h') || '1350')
        var cardW = document.querySelector('.wrapper') ? document.querySelector('.wrapper').offsetWidth : 555
        var scale = cardW / w
        scaler.style.width = w + 'px'
        scaler.style.height = h + 'px'
        scaler.style.transform = 'scale(' + scale.toFixed(4) + ')'
        section.style.height = Math.round(h * scale) + 'px'
        window.addEventListener('resize', scaleAsset)
      })()
    </script>
  </body>
</html>
`

export const CONTENT_CLAUDE_MD = `# Content Pipeline

When creating content in this project, follow these file structures exactly.
The Content Pipeline app only renders previews when the right files are present.

## LinkedIn Post (text + optional image)
Directory: \`content/linkedin/YYYY-MM-DD-topic/\`
Required:
- \`post-text.md\` — post text (max 3000 chars, no emojis, founder voice)
- \`preview.html\` — LinkedIn feed mockup (copy \`content/templates/linkedin-post-preview.html\`, fill in text)

## LinkedIn Carousel
Directory: \`content/linkedin/YYYY-MM-DD-topic/\`
Required:
- \`slide-1-*.html\` … \`slide-N-*.html\` — 1080×1350px HTML slides
- \`preview.html\` — feed mockup with inline carousel navigation (all slides inlined)
- \`post-text.md\` — carousel caption text

## Newsletter
Directory: \`content/newsletters/YYYY-MM-DD-topic/\`
Required: \`email.html\`

## Blog Post
Directory: \`content/blog/YYYY-MM-DD-topic/\`
Required: \`post.md\`

Always create ALL required files. Never skip preview.html for LinkedIn content.
`

import type { BrandConfig } from '@/shared/types'

export function generateBrandClaudeMd(brand: BrandConfig): string {
  const sections: string[] = []

  sections.push('# Content Pipeline — Brand Guidelines')
  sections.push('')

  if (brand.company || brand.product) {
    sections.push('## Brand Identity')
    if (brand.company) sections.push(`- **Company**: ${brand.company}`)
    if (brand.product) sections.push(`- **Product**: ${brand.product}`)
    sections.push('')
  }

  if (brand.voiceTone) {
    sections.push('## Voice & Tone')
    sections.push(brand.voiceTone)
    sections.push('')
  }

  if (brand.targetAudience) {
    sections.push('## Target Audience')
    sections.push(brand.targetAudience)
    sections.push('')
  }

  if (brand.dos) {
    sections.push('## Do')
    const doLines = brand.dos.split('\n').filter(l => l.trim())
    for (const line of doLines) {
      sections.push(`- ${line.trim()}`)
    }
    sections.push('')
  }

  if (brand.donts) {
    sections.push("## Don't")
    const dontLines = brand.donts.split('\n').filter(l => l.trim())
    for (const line of dontLines) {
      sections.push(`- ${line.trim()}`)
    }
    sections.push('')
  }

  if (brand.examplePosts) {
    sections.push('## Example Posts')
    sections.push('Use these as reference for voice and style:')
    sections.push('')
    sections.push(brand.examplePosts)
    sections.push('')
  }

  sections.push('---')
  sections.push('')
  sections.push(CONTENT_CLAUDE_MD)

  return sections.join('\n')
}

export const LINKEDIN_POST_COMMAND = `Create a LinkedIn post about: $ARGUMENTS

1. Create directory: content/linkedin/YYYY-MM-DD-[kebab-slug]/
2. Write post-text.md: founder voice, no emojis, max 3000 chars, punchy hook first line
3. Copy content/templates/linkedin-post-preview.html → preview.html in the new directory
4. Edit preview.html:
   - Replace {{FIRST_LINE}} with the first line of the post as plain text
   - Replace {{SECOND_LINE}} with the second line/paragraph as plain text
   - Replace {{THIRD_LINE}} with the beginning of the third line (truncated)
   - Replace {{FULL_POST_HTML}} with the complete post using <p> tags for paragraphs
     and <br> for line breaks, ending with nothing (the see-less span is already there)
   - Replace {{DATE}} with today's date (e.g. "Feb 19")
   - If a visual asset exists, replace {{PASTE_VISUAL_ASSET_HTML_HERE}} with its HTML
     and set data-w / data-h on .asset-scaler to the asset's natural pixel dimensions
     (e.g. data-w="1080" data-h="1350" for a portrait slide, data-w="1200" data-h="627" for landscape)
   - If no visual asset, remove the entire .image-section div

Output: two files — post-text.md and preview.html — inside the new content directory.
`
