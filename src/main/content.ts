import fs from 'fs/promises'
import path from 'path'

import type {
  ContentItem,
  ContentType,
  ContentVersion,
  DirEntry,
} from '@/shared/types'

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

/**
 * List immediate children of a directory (non-recursive).
 * Directories first, then files. Sorted alphabetically within each group.
 */
export async function listDir(
  dirPath: string,
  contentDir: string,
): Promise<DirEntry[]> {
  let entries: import('fs').Dirent[]
  try {
    entries = (await fs.readdir(dirPath, {
      withFileTypes: true,
    })) as import('fs').Dirent[]
  } catch {
    return []
  }

  const dirs: DirEntry[] = []
  const files: DirEntry[] = []

  for (const entry of entries) {
    const name = String(entry.name)
    if (name.startsWith('.')) continue

    const fullPath = path.join(dirPath, name)
    const relativePath = path.relative(contentDir, fullPath)

    const item: DirEntry = {
      name,
      path: fullPath,
      relativePath,
      isDirectory: entry.isDirectory(),
      contentType: entry.isDirectory() ? 'unknown' : detectContentType(relativePath),
      date: extractDate(relativePath),
    }

    if (entry.isDirectory()) {
      dirs.push(item)
    } else {
      files.push(item)
    }
  }

  dirs.sort((a, b) => a.name.localeCompare(b.name))
  files.sort((a, b) => a.name.localeCompare(b.name))

  return [...dirs, ...files]
}

/**
 * List versions for a content item.
 * Looks for drafts/v*.html siblings and email.html as final.
 *
 * Structure:
 *   newsletters/2025-01/
 *     drafts/v1.html, drafts/v2.html
 *     email.html  (final)
 */
export async function listVersions(
  filePath: string,
  contentDir: string,
): Promise<ContentVersion[]> {
  const relativePath = path.relative(contentDir, filePath)
  const contentType = detectContentType(relativePath)

  // Only newsletters have versions for now
  if (contentType !== 'newsletter') return []

  // Find the newsletter directory (parent of the file, or parent of drafts/)
  const parts = relativePath.split(path.sep)
  // e.g. newsletters/2025-01/email.html → newsletters/2025-01
  // e.g. newsletters/2025-01/drafts/v1.html → newsletters/2025-01
  let newsletterDir: string
  if (parts.includes('drafts')) {
    const draftsIdx = parts.indexOf('drafts')
    newsletterDir = path.join(contentDir, ...parts.slice(0, draftsIdx))
  } else {
    newsletterDir = path.join(contentDir, ...parts.slice(0, -1))
  }

  const versions: ContentVersion[] = []

  // Check for drafts/v*.html
  const draftsDir = path.join(newsletterDir, 'drafts')
  try {
    const entries = (await fs.readdir(draftsDir)) as string[]
    const draftFiles = entries
      .filter((f: string) => /^v\d+\.html$/i.test(f))
      .sort((a: string, b: string) => {
        const numA = parseInt(a.match(/\d+/)?.[0] ?? '0')
        const numB = parseInt(b.match(/\d+/)?.[0] ?? '0')
        return numA - numB
      })

    for (const draft of draftFiles) {
      const label = path.basename(draft, '.html')
      versions.push({
        label,
        path: path.join(draftsDir, draft),
        isFinal: false,
      })
    }
  } catch {
    // No drafts directory
  }

  // Check for email.html (final)
  const finalPath = path.join(newsletterDir, 'email.html')
  try {
    await fs.access(finalPath)
    versions.push({
      label: 'final',
      path: finalPath,
      isFinal: true,
    })
  } catch {
    // No final version
  }

  return versions
}
