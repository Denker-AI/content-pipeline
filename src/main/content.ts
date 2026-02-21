import fs from 'fs/promises'
import path from 'path'

import type { ContentItem, ContentType } from '@/shared/types'

/**
 * Detect content type from relative path within content/.
 *
 * Patterns:
 *   newsletters/YYYY-MM/...   → newsletter
 *   linkedin/YYYY-MM-DD-slug/ → linkedin
 *   blog/**\/*.md              → blog
 *   assets/**\/*.html           → asset
 */
function detectContentType(relativePath: string): ContentType {
  const parts = relativePath.split(path.sep)
  const topDir = parts[0]

  if (topDir === 'newsletters') return 'newsletter'
  if (topDir === 'linkedin') return 'linkedin'
  if (topDir === 'blog' && relativePath.endsWith('.md')) return 'blog'
  if (topDir === 'assets' && relativePath.endsWith('.html')) return 'asset'

  return 'unknown'
}

/**
 * Extract a date from the path if one exists.
 *   newsletters/2025-01/...     → "2025-01"
 *   linkedin/2025-01-15-slug/.. → "2025-01-15"
 */
function extractDate(relativePath: string): string | null {
  const dateMatch = relativePath.match(/(\d{4}-\d{2}(?:-\d{2})?)/)
  return dateMatch ? dateMatch[1] : null
}

/**
 * Derive a human-readable title from the path.
 */
function extractTitle(relativePath: string): string {
  const basename = path.basename(relativePath, path.extname(relativePath))
  // Turn slugs into title case: "my-post-title" → "My Post Title"
  return basename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Recursively collect all files under a directory.
 */
async function walkDir(dir: string): Promise<string[]> {
  const files: string[] = []

  let entries: import('fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true }) as import('fs').Dirent[]
  } catch {
    return files
  }

  for (const entry of entries) {
    const name = String(entry.name)
    if (name.startsWith('.')) continue
    const fullPath = path.join(dir, name)
    if (entry.isDirectory()) {
      const nested = await walkDir(fullPath)
      files.push(...nested)
    } else {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * List all content items in the content directory.
 */
export async function listContent(contentDir: string): Promise<ContentItem[]> {
  const files = await walkDir(contentDir)
  const items: ContentItem[] = []

  for (const filePath of files) {
    const relativePath = path.relative(contentDir, filePath)
    const contentType = detectContentType(relativePath)

    items.push({
      type: contentType,
      title: extractTitle(relativePath),
      path: filePath,
      relativePath,
      date: extractDate(relativePath),
    })
  }

  // Sort by date descending, then by title
  items.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date)
    if (a.date) return -1
    if (b.date) return 1
    return a.title.localeCompare(b.title)
  })

  return items
}
