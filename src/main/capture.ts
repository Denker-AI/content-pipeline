import path from 'path'

import type { CaptureClipRegion, ContentType } from '@/shared/types'

import type { ScreenshotResult, VideoResult } from './screenshot'
import { recordVideo, takeScreenshot } from './screenshot'

export interface CaptureScreenshotRequest {
  url?: string
  html?: string
  width: number
  height: number
  presetName: string
  contentDir: string
  contentType?: ContentType
  clip?: CaptureClipRegion
}

export interface CaptureVideoRequest {
  url?: string
  html?: string
  width: number
  height: number
  duration?: number
  maxDuration?: number
  contentDir: string
  componentName?: string
  clip?: CaptureClipRegion
}

function generateFilename(prefix: string, ext: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${prefix}-${ts}.${ext}`
}

function getScreenshotDir(
  contentDir: string,
  contentType?: ContentType,
  presetName?: string
): string {
  // For LinkedIn carousel preset, use carousel-images subdirectory
  if (contentType === 'linkedin' && presetName === 'LinkedIn Carousel') {
    return path.join(contentDir, 'carousel-images')
  }
  return path.join(contentDir, 'screenshots')
}

export async function captureScreenshot(
  request: CaptureScreenshotRequest
): Promise<ScreenshotResult> {
  const outputDir = getScreenshotDir(
    request.contentDir,
    request.contentType,
    request.presetName
  )
  const filename = generateFilename(
    request.presetName.toLowerCase().replace(/\s+/g, '-'),
    'png'
  )
  const outputPath = path.join(outputDir, filename)

  return takeScreenshot({
    url: request.url,
    html: request.html,
    width: request.width,
    height: request.height,
    outputPath,
    deviceScaleFactor: 2,
    clip: request.clip
  })
}

export async function captureVideo(
  request: CaptureVideoRequest
): Promise<VideoResult> {
  const outputDir = path.join(request.contentDir, 'videos')
  const prefix = request.componentName
    ? request.componentName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
    : 'video'

  const result = await recordVideo({
    url: request.url,
    html: request.html,
    width: request.width,
    height: request.height,
    outputDir,
    duration: request.duration,
    maxDuration: request.maxDuration,
    clip: request.clip
  })

  // Rename Playwright's random UUID filename to component-name-based
  const desiredName = generateFilename(prefix, path.extname(result.path).slice(1))
  const desiredPath = path.join(outputDir, desiredName)
  if (result.path !== desiredPath) {
    const fsPromises = await import('fs/promises')
    await fsPromises.rename(result.path, desiredPath)
    result.path = desiredPath
  }

  return result
}
