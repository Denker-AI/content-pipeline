import fs from 'fs/promises'
import path from 'path'

import type { ComponentRenderResult } from '@/shared/types'

import { analyzeComponentSource } from './component-analyzer'

export async function renderComponentToHtml(
  filePath: string,
  projectRoot: string
): Promise<ComponentRenderResult> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(projectRoot, filePath)

  try {
    const source = await fs.readFile(absolutePath, 'utf-8')
    const analysis = analyzeComponentSource(source)
    // Return source + analysis so the renderer can build a smart prompt for Claude
    return { ok: false, source, analysis, error: 'source-only' }
  } catch (err) {
    return {
      ok: false,
      source: '',
      analysis: {
        props: [],
        interactions: [],
        stateHooks: [],
        asyncPatterns: [],
        hasAnimations: false,
        animationTypes: []
      },
      error: `Could not read file: ${String(err)}`
    }
  }
}
