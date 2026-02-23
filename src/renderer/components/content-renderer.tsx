import { useEffect, useMemo, useRef } from 'react'

import { marked } from 'marked'

import type { RenderMode } from '@/shared/types'

interface ContentRendererProps {
  content: string
  renderMode: RenderMode
  refreshCount: number
}

const modeStyles: Record<RenderMode, string> = {
  newsletter: 'max-w-[600px] mx-auto',
  'linkedin-preview': 'max-w-[552px] mx-auto',
  'linkedin-text': 'max-w-[552px] mx-auto',
  'carousel-slide': 'max-w-[540px] mx-auto aspect-[1080/1350]',
  blog: 'max-w-[720px] mx-auto prose dark:prose-invert',
  asset: 'w-full h-full',
  unknown: 'w-full h-full',
}

function HtmlPreview({
  content,
  className,
  refreshCount,
}: {
  content: string
  className: string
  refreshCount: number
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const doc = iframe.contentDocument
    if (!doc) return

    doc.open()
    doc.write(content)
    doc.close()
  }, [content, refreshCount])

  return (
    <iframe
      ref={iframeRef}
      className={`h-full w-full border-0 bg-white ${className}`}
      sandbox="allow-same-origin"
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
      <div className={modeStyles.blog}>
        <MarkdownPreview content={content} />
      </div>
    )
  }

  // HTML-based modes: newsletter, linkedin-preview, carousel-slide, asset, unknown
  return (
    <div className={`h-full ${modeStyles[renderMode]}`}>
      <HtmlPreview
        content={content}
        className={renderMode === 'carousel-slide' ? 'aspect-[1080/1350]' : ''}
        refreshCount={refreshCount}
      />
    </div>
  )
}
