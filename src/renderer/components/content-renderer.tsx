import { useEffect, useMemo, useRef, useState } from 'react'

import { marked } from 'marked'

import type { RenderMode } from '@/shared/types'

interface ContentRendererProps {
  content: string
  renderMode: RenderMode
  refreshCount: number
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
  allowScripts,
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

  const sandbox = allowScripts
    ? 'allow-scripts allow-same-origin'
    : 'allow-same-origin'

  // Write content into the iframe document
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return

    doc.open()
    doc.write(content)
    doc.close()

    // Auto-height: grow iframe to match its content so the parent can scroll
    if (!naturalHeight && !fill) {
      const measure = () => {
        const h = iframeRef.current?.contentDocument?.documentElement?.scrollHeight
        if (h && h > 0 && iframeRef.current) {
          iframeRef.current.style.height = `${h}px`
        }
      }
      measure()
      const t = setTimeout(measure, 300)
      return () => clearTimeout(t)
    }
  }, [content, refreshCount, naturalHeight, fill])

  // Scale-to-fit: watch container width and compute scale factor
  useEffect(() => {
    if (!naturalWidth || !wrapperRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / naturalWidth)
    })
    obs.observe(wrapperRef.current)
    return () => obs.disconnect()
  }, [naturalWidth])

  // Scaled preview (carousel slides): inner div is full natural size, scaled down
  if (naturalWidth && naturalHeight) {
    return (
      <div
        ref={wrapperRef}
        className="relative w-full overflow-hidden"
        style={{ height: naturalHeight * scale }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: naturalWidth,
            height: naturalHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <iframe
            ref={iframeRef}
            style={{
              width: naturalWidth,
              height: naturalHeight,
              border: 0,
              display: 'block',
              background: 'white',
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
      <iframe
        ref={iframeRef}
        className="h-full w-full border-0"
        style={{ background: 'white' }}
        sandbox={sandbox}
        title="Content preview"
      />
    )
  }

  // Auto-height preview (newsletter, linkedin): iframe grows to content, parent scrolls
  return (
    <iframe
      ref={iframeRef}
      className="block w-full border-0"
      style={{ background: 'white' }}
      sandbox={sandbox}
      title="Content preview"
    />
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
          className={charCount > limit ? 'text-red-400' : 'text-zinc-400 dark:text-zinc-500'}
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
}: ContentRendererProps) {
  if (!content) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
        <p className="text-sm">No content to preview</p>
      </div>
    )
  }

  if (renderMode === 'linkedin-text') {
    return <LinkedInTextPreview content={content} />
  }

  if (renderMode === 'blog') {
    return (
      <div className="max-w-[720px] mx-auto prose dark:prose-invert">
        <MarkdownPreview content={content} />
      </div>
    )
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
        <HtmlPreview content={content} refreshCount={refreshCount} allowScripts />
      </div>
    )
  }

  // Asset / unknown: fill the available preview area, allow scripts
  return (
    <HtmlPreview content={content} refreshCount={refreshCount} fill allowScripts />
  )
}
