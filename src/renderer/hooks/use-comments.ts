import { useCallback, useState } from 'react'

import type { AnnotationComment } from '@/shared/types'

let nextId = 1

export function useComments() {
  const [comments, setComments] = useState<AnnotationComment[]>([])
  const [annotating, setAnnotating] = useState(false)

  const toggleAnnotating = useCallback(() => {
    setAnnotating((prev) => !prev)
  }, [])

  const addComment = useCallback(
    (x: number, y: number, text: string, nearText: string) => {
      const id = `comment-${nextId++}`
      setComments((prev) => {
        const pinNumber = prev.filter((c) => !c.resolved).length + 1
        return [
          ...prev,
          { id, pinNumber, x, y, text, nearText, resolved: false },
        ]
      })
      return id
    },
    [],
  )

  const resolveComment = useCallback((id: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: true } : c)),
    )
  }, [])

  const deleteComment = useCallback((id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setComments([])
    setAnnotating(false)
  }, [])

  const buildPrompt = useCallback(
    (filePath: string) => {
      const active = comments.filter((c) => !c.resolved)
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
    [comments],
  )

  const sendToTerminal = useCallback(
    (filePath: string, tabId?: string | null) => {
      const prompt = buildPrompt(filePath)
      if (!prompt || !tabId) return
      window.electronAPI?.terminal.sendInput(tabId, prompt + '\n')
    },
    [buildPrompt],
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
    sendToTerminal,
  }
}
