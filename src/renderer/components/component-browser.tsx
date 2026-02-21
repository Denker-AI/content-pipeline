import { useCallback, useEffect, useState } from 'react'

import type { DetectedComponent } from '@/shared/types'

import { ComponentCard } from './component-card'

interface ComponentBrowserProps {
  onPreview: (component: DetectedComponent) => void
}

export function ComponentBrowser({ onPreview }: ComponentBrowserProps) {
  const [components, setComponents] = useState<DetectedComponent[]>([])

  const addComponent = useCallback((component: DetectedComponent) => {
    setComponents((prev) => {
      // Deduplicate by path
      if (prev.some((c) => c.path === component.path)) {
        return prev
      }
      return [...prev, component]
    })
  }, [])

  useEffect(() => {
    const api = window.electronAPI?.components
    if (!api) return

    const cleanup = api.onComponentFound(addComponent)
    return cleanup
  }, [addComponent])

  const handlePreview = useCallback(
    (component: DetectedComponent) => {
      // Type a prompt into the terminal asking Claude to create a preview page
      const prompt = `Create a preview page for ${component.name} at ${component.path} with realistic mock data. Write it to app/content-preview/page.tsx`
      window.electronAPI?.terminal.sendInput(prompt + '\n')
      onPreview(component)
    },
    [onPreview],
  )

  if (components.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        <p className="text-sm">Ask Claude to search for components</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="flex flex-col gap-2">
        {components.map((component) => (
          <ComponentCard
            key={component.path}
            component={component}
            onPreview={handlePreview}
          />
        ))}
      </div>
    </div>
  )
}
