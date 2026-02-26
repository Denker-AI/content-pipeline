import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  ContentStage,
  ContentType,
  PipelineItem,
} from '@/shared/types'

const SECTION_TYPES: ContentType[] = ['linkedin', 'blog', 'newsletter']

export function usePipeline() {
  const [items, setItems] = useState<PipelineItem[]>([])
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<ContentType>>(
    () => new Set(SECTION_TYPES),
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [isConfigured, setIsConfigured] = useState(true)

  // Load items
  const loadItems = useCallback(async () => {
    const api = window.electronAPI?.pipeline
    if (!api) return

    try {
      const [pipelineItems, active] = await Promise.all([
        api.listPipelineItems(),
        api.getActiveContent(),
      ])
      setItems(pipelineItems)
      if (active) {
        setActiveItemId(active.id)
      }
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Check if project is configured
  const checkConfigured = useCallback(async () => {
    const api = window.electronAPI?.project
    if (!api) return
    const configured = await api.isConfigured()
    setIsConfigured(configured)
  }, [])

  // Install config
  const installConfig = useCallback(async () => {
    const api = window.electronAPI?.project
    if (!api) return
    await api.install()
    setIsConfigured(true)
  }, [])

  // Load on mount
  useEffect(() => {
    loadItems()
    checkConfigured()
  }, [loadItems, checkConfigured])

  // Subscribe to pipeline changes
  useEffect(() => {
    const api = window.electronAPI?.pipeline
    if (!api) return

    const cleanup = api.onPipelineChanged(() => {
      loadItems()
    })
    return cleanup
  }, [loadItems])

  // Re-check config when project changes
  useEffect(() => {
    const api = window.electronAPI?.content
    if (!api) return

    const cleanup = api.onProjectChanged(() => {
      checkConfigured()
    })
    return cleanup
  }, [checkConfigured])

  // Create content — returns the item so the caller can open a tab
  const createContent = useCallback(async (type: ContentType): Promise<PipelineItem | null> => {
    const api = window.electronAPI?.pipeline
    if (!api) return null

    const item = await api.createContent(type)
    setActiveItemId(item.id)
    return item
  }, [])

  // Activate content
  const activateItem = useCallback(async (item: PipelineItem) => {
    const api = window.electronAPI?.pipeline
    if (!api) return

    await api.activateContent(item)
    setActiveItemId(item.id)
  }, [])

  // Update stage
  const updateStage = useCallback(
    async (item: PipelineItem, stage: ContentStage) => {
      const api = window.electronAPI?.pipeline
      if (!api) return

      await api.updateStage(item.metadataPath, stage)
    },
    [],
  )

  // Toggle section
  const toggleSection = useCallback((type: ContentType) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  // Filter and group items
  const groupedItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    const filtered = query
      ? items.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.contentDir.toLowerCase().includes(query),
        )
      : items

    const groups: Record<ContentType, PipelineItem[]> = {
      linkedin: [],
      blog: [],
      newsletter: [],
      asset: [],
      unknown: [],
    }

    for (const item of filtered) {
      const bucket = groups[item.type]
      if (bucket) {
        bucket.push(item)
      } else {
        groups.unknown.push(item)
      }
    }

    return groups
  }, [items, searchQuery])

  return {
    items,
    groupedItems,
    activeItemId,
    loading,
    expandedSections,
    searchQuery,
    setSearchQuery,
    isConfigured,
    createContent,
    activateItem,
    updateStage,
    toggleSection,
    installConfig,
  }
}
