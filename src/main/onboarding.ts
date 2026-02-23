import fs from 'fs/promises'
import path from 'path'

import {
  CONTENT_CLAUDE_MD,
  LINKEDIN_POST_COMMAND,
  LINKEDIN_PREVIEW_TEMPLATE,
} from './content-templates'

const CANARY_FILE = '.claude/commands/linkedin-post.md'

export async function isProjectConfigured(projectRoot: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectRoot, CANARY_FILE))
    return true
  } catch {
    return false
  }
}

export async function installProjectConfig(projectRoot: string): Promise<void> {
  const files: { filePath: string; content: string }[] = [
    {
      filePath: path.join(projectRoot, 'content', 'CLAUDE.md'),
      content: CONTENT_CLAUDE_MD,
    },
    {
      filePath: path.join(
        projectRoot,
        'content',
        'templates',
        'linkedin-post-preview.html',
      ),
      content: LINKEDIN_PREVIEW_TEMPLATE,
    },
    {
      filePath: path.join(projectRoot, CANARY_FILE),
      content: LINKEDIN_POST_COMMAND,
    },
  ]

  for (const { filePath, content } of files) {
    // Skip if already exists
    try {
      await fs.access(filePath)
      continue
    } catch {
      // File doesn't exist — write it
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
  }
}
