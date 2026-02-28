import fs from 'fs/promises'
import path from 'path'

import type { ComponentRenderResult } from '@/shared/types'

import { analyzeComponentSource } from './component-analyzer'
import { resolveImports } from './import-resolver'

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
    const { dependencies, iconNames, themeConfig } = await resolveImports(absolutePath, projectRoot)
    // Return source + analysis + dependencies so the renderer can build a smart prompt for Claude
    return { ok: false, source, analysis, error: 'source-only', dependencies, iconNames, themeConfig }
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
      error: `Could not read file: ${String(err)}`,
      dependencies: {},
      iconNames: [],
      themeConfig: ''
    }
  }
}
