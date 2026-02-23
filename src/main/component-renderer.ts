import fs from 'fs/promises'
import path from 'path'

export type ComponentRenderResult =
  | { ok: true; html: string }
  | { ok: false; source: string; error: string }

export async function renderComponentToHtml(
  filePath: string,
  projectRoot: string,
): Promise<ComponentRenderResult> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(projectRoot, filePath)

  try {
    const source = await fs.readFile(absolutePath, 'utf-8')
    // Return source so the renderer can send it to Claude for HTML generation
    return { ok: false, source, error: 'source-only' }
  } catch (err) {
    return { ok: false, source: '', error: `Could not read file: ${String(err)}` }
  }
}
