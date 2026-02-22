import fs from 'fs/promises'
import { Marked } from 'marked'
import path from 'path'

import type { BlogPublishResult } from '@/shared/types'

interface BlogFrontmatter {
  title: string
  slug: string
  description?: string
  tags?: string[]
  status?: string
  published_at?: string
  [key: string]: unknown
}

function parseFrontmatter(raw: string): {
  frontmatter: BlogFrontmatter
  body: string
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) {
    throw new Error('No YAML frontmatter found. Blog post must start with ---')
  }

  const yamlBlock = match[1]
  const body = match[2]

  const frontmatter: Record<string, unknown> = {}
  for (const line of yamlBlock.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue

    const key = trimmed.slice(0, colonIdx).trim()
    let value: unknown = trimmed.slice(colonIdx + 1).trim()

    // Handle arrays (simple single-line format: [a, b, c])
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    }

    // Strip surrounding quotes
    if (typeof value === 'string') {
      value = value.replace(/^["']|["']$/g, '')
    }

    frontmatter[key] = value
  }

  if (!frontmatter.title || typeof frontmatter.title !== 'string') {
    throw new Error('Blog frontmatter must include a "title" field')
  }
  if (!frontmatter.slug || typeof frontmatter.slug !== 'string') {
    throw new Error('Blog frontmatter must include a "slug" field')
  }

  return { frontmatter: frontmatter as BlogFrontmatter, body }
}

async function findBlogMarkdown(contentDir: string): Promise<{
  filePath: string
  raw: string
}> {
  const entries = await fs.readdir(contentDir, { withFileTypes: true })
  // Look for .md files (prefer blog.md or post.md, fall back to first .md)
  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name)

  const preferred = ['blog.md', 'post.md', 'index.md']
  const picked = preferred.find((p) => mdFiles.includes(p)) ?? mdFiles[0]

  if (!picked) {
    throw new Error(`No .md file found in ${contentDir}`)
  }

  const filePath = path.join(contentDir, picked)
  const raw = await fs.readFile(filePath, 'utf-8')
  return { filePath, raw }
}

function updateFrontmatterStatus(raw: string): string {
  const now = new Date().toISOString()
  let updated = raw

  // Replace or add status
  if (/^status\s*:/m.test(updated)) {
    updated = updated.replace(/^status\s*:.*$/m, `status: published`)
  } else {
    // Add before closing ---
    updated = updated.replace(/\n---\n/, `\nstatus: published\n---\n`)
  }

  // Replace or add published_at
  if (/^published_at\s*:/m.test(updated)) {
    updated = updated.replace(/^published_at\s*:.*$/m, `published_at: ${now}`)
  } else {
    updated = updated.replace(/\n---\n/, `\npublished_at: ${now}\n---\n`)
  }

  return updated
}

export async function publishBlogToWebhook(
  contentDir: string,
  webhookUrl: string,
): Promise<BlogPublishResult> {
  if (!webhookUrl) {
    throw new Error('Blog webhook URL not configured. Set it in Settings.')
  }

  // Find and read blog markdown
  const { filePath, raw } = await findBlogMarkdown(contentDir)
  const { frontmatter, body } = parseFrontmatter(raw)

  // Convert markdown body to HTML
  const marked = new Marked()
  const html = await marked.parse(body)

  // POST to webhook
  const payload = {
    title: frontmatter.title,
    slug: frontmatter.slug,
    description: frontmatter.description ?? '',
    tags: frontmatter.tags ?? [],
    content: html,
    markdown: body,
    metadata: frontmatter,
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Webhook failed (${res.status}): ${text}`)
  }

  // Update frontmatter in the source file
  const updatedRaw = updateFrontmatterStatus(raw)
  await fs.writeFile(filePath, updatedRaw, 'utf-8')

  // Write blog.json with publish info
  const blogJsonPath = path.join(contentDir, 'blog.json')
  const blogJson = {
    webhook_url: webhookUrl,
    status: 'published',
    published_at: new Date().toISOString(),
    title: frontmatter.title,
    slug: frontmatter.slug,
    status_code: res.status,
  }
  await fs.writeFile(blogJsonPath, JSON.stringify(blogJson, null, 2), 'utf-8')

  return {
    title: frontmatter.title,
    slug: frontmatter.slug,
    webhookUrl,
    statusCode: res.status,
  }
}

export { findBlogMarkdown,parseFrontmatter }
