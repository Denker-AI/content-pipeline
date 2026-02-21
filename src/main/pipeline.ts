import fs from 'fs/promises'
import path from 'path'

import type {
  ContentMetadata,
  ContentStage,
  ContentType,
  PipelineItem,
} from '@/shared/types'

const METADATA_FILE = 'metadata.json'

// Type directory names used in the content folder
const TYPE_DIR_MAP: Record<string, ContentType> = {
  newsletters: 'newsletter',
  linkedin: 'linkedin',
  blog: 'blog',
  assets: 'asset',
}

function detectTypeFromDir(dirName: string): ContentType {
  return TYPE_DIR_MAP[dirName] ?? 'unknown'
}

function formatTypeLabel(type: ContentType): string {
  const labels: Record<ContentType, string> = {
    newsletter: 'Newsletter',
    linkedin: 'LinkedIn Post',
    blog: 'Blog Post',
    asset: 'Asset',
    unknown: 'Content',
  }
  return labels[type]
}

function generateDateSlug(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function generateAutoTitle(type: ContentType): string {
  const now = new Date()
  const month = now.toLocaleString('en-US', { month: 'short' })
  const day = now.getDate()
  return `${formatTypeLabel(type)} - ${month} ${day}`
}

// Map ContentType to the directory name used in content/
function typeToDirName(type: ContentType): string {
  const map: Record<ContentType, string> = {
    newsletter: 'newsletters',
    linkedin: 'linkedin',
    blog: 'blog',
    asset: 'assets',
    unknown: 'other',
  }
  return map[type]
}

async function readJsonFile<T>(filePath: string, defaults: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return { ...defaults, ...JSON.parse(raw) } as T
  } catch {
    return { ...defaults }
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

const DEFAULT_METADATA: ContentMetadata = {
  type: 'unknown',
  stage: 'idea',
  title: '',
  createdAt: '',
  updatedAt: '',
}

export async function readMetadata(metadataPath: string): Promise<ContentMetadata> {
  return readJsonFile(metadataPath, DEFAULT_METADATA)
}

export async function writeMetadata(
  metadataPath: string,
  updates: Partial<ContentMetadata>,
): Promise<ContentMetadata> {
  const existing = await readMetadata(metadataPath)
  const merged: ContentMetadata = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  await writeJsonFile(metadataPath, merged)
  return merged
}

export async function updateStage(
  metadataPath: string,
  stage: ContentStage,
): Promise<void> {
  await writeMetadata(metadataPath, { stage })
}

function extractDate(dirName: string): string {
  const match = dirName.match(/(\d{4}-\d{2}(?:-\d{2})?)/)
  return match ? match[1] : ''
}

function buildPipelineItem(
  contentDir: string,
  itemDir: string,
  metadata: ContentMetadata,
): PipelineItem {
  const relativePath = path.relative(contentDir, itemDir)
  const parts = relativePath.split(path.sep)
  const typeDir = parts[0]
  const slug = parts.slice(1).join('/')
  const id = `${typeDir}/${slug}`

  return {
    id,
    type: metadata.type,
    stage: metadata.stage,
    title: metadata.title,
    date: extractDate(path.basename(itemDir)),
    metadataPath: path.join(itemDir, METADATA_FILE),
    contentDir: itemDir,
    worktreeBranch: metadata.worktreeBranch,
    worktreePath: metadata.worktreePath,
  }
}

export async function listPipelineItems(
  contentDir: string,
): Promise<PipelineItem[]> {
  const items: PipelineItem[] = []

  let typeDirs: import('fs').Dirent[]
  try {
    typeDirs = await fs.readdir(contentDir, { withFileTypes: true }) as import('fs').Dirent[]
  } catch {
    return items
  }

  for (const typeEntry of typeDirs) {
    const typeName = String(typeEntry.name)
    if (!typeEntry.isDirectory() || typeName.startsWith('.')) continue

    const typePath = path.join(contentDir, typeName)
    const contentType = detectTypeFromDir(typeName)

    let subDirs: import('fs').Dirent[]
    try {
      subDirs = await fs.readdir(typePath, { withFileTypes: true }) as import('fs').Dirent[]
    } catch {
      continue
    }

    for (const subEntry of subDirs) {
      const subName = String(subEntry.name)
      if (!subEntry.isDirectory() || subName.startsWith('.')) continue

      const itemDir = path.join(typePath, subName)
      const metadataPath = path.join(itemDir, METADATA_FILE)

      let hasMetadata = false
      try {
        await fs.access(metadataPath)
        hasMetadata = true
      } catch {
        // No metadata.json — legacy content
      }

      if (hasMetadata) {
        const metadata = await readMetadata(metadataPath)
        items.push(buildPipelineItem(contentDir, itemDir, metadata))
      } else {
        // Legacy content: create a PipelineItem with stage 'idea'
        const date = extractDate(subName)
        const title = subName
          .replace(/^\d{4}-\d{2}(-\d{2})?-?/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim() || `${formatTypeLabel(contentType)} - ${date}`

        items.push({
          id: `${typeName}/${subName}`,
          type: contentType,
          stage: 'idea',
          title,
          date,
          metadataPath,
          contentDir: itemDir,
        })
      }
    }
  }

  // Sort by date descending
  items.sort((a, b) => b.date.localeCompare(a.date))

  return items
}

export async function createContentPiece(
  contentDir: string,
  type: ContentType,
): Promise<PipelineItem> {
  const dateSlug = generateDateSlug()
  const title = generateAutoTitle(type)
  const dirName = typeToDirName(type)
  const itemDir = path.join(contentDir, dirName, dateSlug)

  const now = new Date().toISOString()
  const metadata: ContentMetadata = {
    type,
    stage: 'idea',
    title,
    createdAt: now,
    updatedAt: now,
  }

  const metadataPath = path.join(itemDir, METADATA_FILE)
  await writeJsonFile(metadataPath, metadata)

  return buildPipelineItem(contentDir, itemDir, metadata)
}

// Active content tracking (in-memory)
let activeContent: PipelineItem | null = null

export function setActiveContent(item: PipelineItem | null): void {
  activeContent = item
}

export function getActiveContent(): PipelineItem | null {
  return activeContent
}
