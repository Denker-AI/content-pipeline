import { useCallback, useRef, useState } from 'react'

import type { AnnotationComment } from '@/shared/types'

let nextId = 1

export function useComments() {
  const [comments, setComments] = useState<AnnotationComment[]>([])
  const [annotating, setAnnotating] = useState(false)
  const sendingRef = useRef(false)

  const toggleAnnotating = useCallback(() => {
    setAnnotating(prev => !prev)
  }, [])

  const addComment = useCallback(
    (x: number, y: number, text: string, nearText: string) => {
      const id = `comment-${nextId++}`
      setComments(prev => {
        const pinNumber = prev.filter(c => !c.resolved).length + 1
        return [
          ...prev,
          { id, pinNumber, x, y, text, nearText, resolved: false }
        ]
      })
      return id
    },
    []
  )

  const resolveComment = useCallback((id: string) => {
    setComments(prev =>
      prev.map(c => (c.id === id ? { ...c, resolved: true } : c))
    )
  }, [])

  const deleteComment = useCallback((id: string) => {
    setComments(prev => prev.filter(c => c.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setComments([])
    setAnnotating(false)
  }, [])

  const buildPrompt = useCallback(
    (filePath: string) => {
      const active = comments.filter(c => !c.resolved)
      if (active.length === 0) return ''

      const lines = [`Revise ${filePath}:`]
      active.forEach((c, i) => {
        const nearRef = c.nearText
          ? `Near "${c.nearText}"`
          : `At position ${Math.round(c.x)}%, ${Math.round(c.y)}%`
        lines.push(`(${i + 1}) ${nearRef}: "${c.text}"`)
      })
      lines.push('Apply changes following brand guidelines.')
      return lines.join('\n')
    },
    [comments]
  )

  const sendToTerminal = useCallback(
    async (
      filePath: string,
      tabId?: string | null,
      htmlContent?: string,
      contentDir?: string
    ) => {
      const prompt = buildPrompt(filePath)
      if (!prompt || !tabId || sendingRef.current) return
      sendingRef.current = true

      // Capture a screenshot of the current preview so Claude can see it
      let screenshotPath = ''
      if (htmlContent && contentDir) {
        try {
          const result = await window.electronAPI?.capture.screenshot({
            html: htmlContent,
            width: 800,
            height: 600,
            presetName: 'annotation-preview',
            contentDir
          })
          if (result?.path) {
            screenshotPath = result.path
          }
        } catch {
          // Screenshot failed — send prompt without image
        }
      }

      const fullPrompt = screenshotPath
        ? `${prompt}\n\nScreenshot of current preview: ${screenshotPath}`
        : prompt

      // Use bracketed paste mode so multi-line text is treated as a single
      // paste (prevents each \n from submitting a separate message in Claude CLI).
      // No trailing \n — let the user review and press Enter to send.
      const PASTE_START = '\x1b[200~'
      const PASTE_END = '\x1b[201~'
      window.electronAPI?.terminal.sendInput(
        tabId,
        PASTE_START + fullPrompt + PASTE_END
      )
      // Reset after a short delay to prevent rapid double-clicks
      setTimeout(() => {
        sendingRef.current = false
      }, 1000)
    },
    [buildPrompt]
  )

  return {
    comments,
    annotating,
    toggleAnnotating,
    addComment,
    resolveComment,
    deleteComment,
    clearAll,
    buildPrompt,
    sendToTerminal
  }
}
