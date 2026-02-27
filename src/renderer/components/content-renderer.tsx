import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { marked } from 'marked'

import type { RenderMode } from '@/shared/types'

import { LinkedInCompositePreview } from './linkedin-composite-preview'

interface ContentRendererProps {
  content: string
  renderMode: RenderMode
  refreshCount: number
  contentDir?: string
  activeTabId?: string | null
}

// Renders HTML in an iframe.
// - naturalWidth + naturalHeight: scale to fit the container (for carousel slides)
// - fill: iframe fills the container height (for asset/unknown)
// - default: iframe auto-sizes to its content height (for newsletter/linkedin)
function HtmlPreview({
  content,
  refreshCount,
  naturalWidth,
  naturalHeight,
  fill,
  allowScripts
}: {
  content: string
  refreshCount: number
  naturalWidth?: number
  naturalHeight?: number
  fill?: boolean
  allowScripts?: boolean
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState(1)
  const [navigatedAway, setNavigatedAway] = useState(false)

  const sandbox = allowScripts
    ? 'allow-scripts allow-same-origin'
    : 'allow-same-origin'

  // Write content into the iframe document
  const writeContent = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return

    doc.open()
    doc.write(content)
    doc.close()
    setNavigatedAway(false)

    // Intercept link clicks to detect navigation
    doc.addEventListener('click', e => {
      const link = (e.target as HTMLElement).closest('a')
      if (link?.href && !link.href.startsWith('javascript:')) {
        e.preventDefault()
        setNavigatedAway(true)
      }
    })
  }, [content])

  useEffect(() => {
    writeContent()

    // Auto-height: grow iframe to match its content so the parent can scroll
    if (!naturalHeight && !fill) {
      const iframe = iframeRef.current

      const measure = () => {
        const doc = iframe?.contentDocument
        if (!doc || !iframe) return
        const h = doc.documentElement.scrollHeight
        if (h > 0) {
          iframe.style.height = `${h}px`
        }
      }

      // Measure at staggered intervals to catch late renders
      measure()
      const t1 = setTimeout(measure, 100)
      const t2 = setTimeout(measure, 300)
      const t3 = setTimeout(measure, 800)

      // Watch for content size changes via ResizeObserver on iframe body
      let obs: ResizeObserver | undefined
      const setupObserver = () => {
        const body = iframe?.contentDocument?.body
        if (body) {
          obs = new ResizeObserver(measure)
          obs.observe(body)
        }
      }
      setupObserver()
      // Body might not be ready yet — retry shortly
      const t4 = setTimeout(setupObserver, 50)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
        clearTimeout(t4)
        obs?.disconnect()
      }
    }
  }, [writeContent, refreshCount, naturalHeight, fill])

  // Scale-to-fit: watch container width and compute scale factor
  useEffect(() => {
    if (!naturalWidth || !wrapperRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / naturalWidth)
    })
    obs.observe(wrapperRef.current)
    return () => obs.disconnect()
  }, [naturalWidth])

  const backButton = navigatedAway && (
    <button
      onClick={writeContent}
      className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded bg-zinc-800/80 px-2 py-1 text-xs text-white shadow hover:bg-zinc-700/90"
    >
      <svg
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
      Back to preview
    </button>
  )

  // Scaled preview (carousel slides): inner div is full natural size, scaled down
  if (naturalWidth && naturalHeight) {
    return (
      <div
        ref={wrapperRef}
        className="relative w-full overflow-hidden"
        style={{ height: naturalHeight * scale }}
      >
        {backButton}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: naturalWidth,
            height: naturalHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
        >
          <iframe
            ref={iframeRef}
            style={{
              width: naturalWidth,
              height: naturalHeight,
              border: 0,
              display: 'block',
              background: 'white'
            }}
            sandbox={sandbox}
            title="Content preview"
          />
        </div>
      </div>
    )
  }

  // Fill preview (asset/unknown): iframe takes the full container height
  if (fill) {
    return (
      <div className="relative h-full w-full">
        {backButton}
        <iframe
          ref={iframeRef}
          className="h-full w-full border-0"
          style={{ background: 'white' }}
          sandbox={sandbox}
          title="Content preview"
        />
      </div>
    )
  }

  // Auto-height preview (newsletter, linkedin): iframe grows to content, parent scrolls
  return (
    <div className="relative">
      {backButton}
      <iframe
        ref={iframeRef}
        className="block w-full border-0"
        style={{ background: 'white' }}
        sandbox={sandbox}
        title="Content preview"
      />
    </div>
  )
}

function MarkdownPreview({ content }: { content: string }) {
  const html = useMemo(() => {
    return marked.parse(content, { async: false }) as string
  }, [content])

  return (
    <div
      className="prose dark:prose-invert max-w-none p-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function LinkedInTextPreview({ content }: { content: string }) {
  const charCount = content.length
  const limit = 3000

  return (
    <div className="mx-auto max-w-[552px] p-6">
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700 dark:text-zinc-200">
          {content}
        </pre>
      </div>
      <div className="mt-2 flex justify-end text-xs">
        <span
          className={
            charCount > limit
              ? 'text-red-400'
              : 'text-zinc-400 dark:text-zinc-500'
          }
        >
          {charCount.toLocaleString()} / {limit.toLocaleString()} chars
        </span>
      </div>
    </div>
  )
}

export function ContentRenderer({
  content,
  renderMode,
  refreshCount,
  contentDir,
  activeTabId
}: ContentRendererProps) {
  // For LinkedIn content with a known contentDir, always show composite
  if (
    contentDir &&
    (renderMode === 'linkedin-text' || renderMode === 'carousel-slide')
  ) {
    return (
      <LinkedInCompositePreview
        contentDir={contentDir}
        renderMode={renderMode}
        textContent={renderMode === 'linkedin-text' ? content : undefined}
        activeTabId={activeTabId}
      />
    )
  }

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
        <p className="text-sm">No content to preview</p>
      </div>
    )
  }

  // Fallback: linkedin-text without contentDir
  if (renderMode === 'linkedin-text') {
    return <LinkedInTextPreview content={content} />
  }

  if (renderMode === 'blog') {
    // HTML blog posts render in a full-height iframe
    if (content.trimStart().startsWith('<')) {
      return (
        <HtmlPreview
          content={content}
          refreshCount={refreshCount}
          fill
          allowScripts
        />
      )
    }
    // Markdown blog posts render as prose — max-w-none inside MarkdownPreview
    // ensures content fills the preview pane width
    return <MarkdownPreview content={content} />
  }

  // Carousel slides: 1080×1350px scaled down to fit the preview pane width
  if (renderMode === 'carousel-slide') {
    return (
      <HtmlPreview
        content={content}
        refreshCount={refreshCount}
        naturalWidth={1080}
        naturalHeight={1350}
        allowScripts
      />
    )
  }

  // Newsletter: constrained to 600px, auto-height so parent panel can scroll
  if (renderMode === 'newsletter') {
    return (
      <div className="mx-auto max-w-[600px] py-4">
        <HtmlPreview content={content} refreshCount={refreshCount} />
      </div>
    )
  }

  // LinkedIn preview: constrained to 552px, auto-height, scripts for toggle + scaler
  if (renderMode === 'linkedin-preview') {
    return (
      <div className="mx-auto max-w-[552px] py-4">
        <HtmlPreview
          content={content}
          refreshCount={refreshCount}
          allowScripts
        />
      </div>
    )
  }

  // Asset / unknown: fill the available preview area, allow scripts
  return (
    <HtmlPreview
      content={content}
      refreshCount={refreshCount}
      fill
      allowScripts
    />
  )
}
