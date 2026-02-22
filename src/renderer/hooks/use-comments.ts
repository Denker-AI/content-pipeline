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
      const pinNumber =
        comments.filter((c) => !c.resolved).length + 1
      const comment: AnnotationComment = {
        id: `comment-${nextId++}`,
        pinNumber,
        x,
        y,
        text,
        nearText,
        resolved: false,
      }
      setComments((prev) => [...prev, comment])
      return comment.id
    },
    [comments],
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
    (filePath: string) => {
      const prompt = buildPrompt(filePath)
      if (!prompt) return
      window.electronAPI?.terminal.sendInput(prompt + '\n')
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
