import path from 'path'
import { chromium } from 'playwright-core'

export interface ScreenshotOptions {
  url?: string
  html?: string
  width: number
  height: number
  outputPath: string
  deviceScaleFactor?: number
}

export interface ScreenshotResult {
  path: string
  size: number
  width: number
  height: number
}

export interface VideoOptions {
  url?: string
  html?: string
  width: number
  height: number
  outputDir: string
  duration: number
  deviceScaleFactor?: number
}

export interface VideoResult {
  path: string
  size: number
  width: number
  height: number
  duration: number
}

function findChromium(): string {
  if (process.platform === 'darwin') {
    const paths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ]
    for (const p of paths) {
      try {
        require('fs').accessSync(p)
        return p
      } catch {
        // not found, try next
      }
    }
  }

  if (process.platform === 'linux') {
    const paths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ]
    for (const p of paths) {
      try {
        require('fs').accessSync(p)
        return p
      } catch {
        // not found, try next
      }
    }
  }

  if (process.platform === 'win32') {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ]
    for (const p of paths) {
      try {
        require('fs').accessSync(p)
        return p
      } catch {
        // not found, try next
      }
    }
  }

  throw new Error(
    'No Chromium-based browser found. Install Google Chrome or Chromium.',
  )
}

export async function takeScreenshot(
  options: ScreenshotOptions,
): Promise<ScreenshotResult> {
  const { url, html, width, height, outputPath, deviceScaleFactor = 2 } = options

  if (!url && !html) {
    throw new Error('Either url or html must be provided')
  }

  const executablePath = findChromium()
  const browser = await chromium.launch({
    executablePath,
    headless: true,
  })

  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor,
    })
    const page = await context.newPage()

    if (url) {
      await page.goto(url, { waitUntil: 'networkidle' })
    } else if (html) {
      await page.setContent(html, { waitUntil: 'networkidle' })
    }

    // Ensure output directory exists
    const fs = await import('fs/promises')
    await fs.mkdir(path.dirname(outputPath), { recursive: true })

    await page.screenshot({ path: outputPath, type: 'png' })

    const stats = await fs.stat(outputPath)

    return {
      path: outputPath,
      size: stats.size,
      width: width * deviceScaleFactor,
      height: height * deviceScaleFactor,
    }
  } finally {
    await browser.close()
  }
}

export async function recordVideo(
  options: VideoOptions,
): Promise<VideoResult> {
  const {
    url,
    html,
    width,
    height,
    outputDir,
    duration,
    deviceScaleFactor = 1,
  } = options

  if (!url && !html) {
    throw new Error('Either url or html must be provided')
  }

  const executablePath = findChromium()
  const browser = await chromium.launch({
    executablePath,
    headless: true,
  })

  try {
    const fs = await import('fs/promises')
    await fs.mkdir(outputDir, { recursive: true })

    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor,
      recordVideo: {
        dir: outputDir,
        size: { width, height },
      },
    })
    const page = await context.newPage()

    if (url) {
      await page.goto(url, { waitUntil: 'networkidle' })
    } else if (html) {
      await page.setContent(html, { waitUntil: 'networkidle' })
    }

    // Wait for the specified duration
    await page.waitForTimeout(duration * 1000)

    // Close page to finalize video
    await page.close()

    const videoPath = await page.video()?.path()
    if (!videoPath) {
      throw new Error('Video recording failed — no file produced')
    }

    await context.close()

    const stats = await fs.stat(videoPath)

    return {
      path: videoPath,
      size: stats.size,
      width,
      height,
      duration,
    }
  } finally {
    await browser.close()
  }
}
