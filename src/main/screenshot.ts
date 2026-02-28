import { execFile } from 'child_process'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { chromium } from 'playwright-core'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface ClipRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface ScreenshotOptions {
  url?: string
  html?: string
  width: number
  height: number
  outputPath: string
  deviceScaleFactor?: number
  clip?: ClipRegion
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
  duration?: number // explicit duration in seconds; if omitted, auto-detect
  maxDuration?: number // hard cap in seconds (default: 30)
  deviceScaleFactor?: number
  clip?: ClipRegion
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
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    ]
    for (const p of paths) {
      try {
        fs.accessSync(p)
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
      '/usr/bin/chromium'
    ]
    for (const p of paths) {
      try {
        fs.accessSync(p)
        return p
      } catch {
        // not found, try next
      }
    }
  }

  if (process.platform === 'win32') {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ]
    for (const p of paths) {
      try {
        fs.accessSync(p)
        return p
      } catch {
        // not found, try next
      }
    }
  }

  throw new Error(
    'No Chromium-based browser found. Install Google Chrome or Chromium.'
  )
}

export async function takeScreenshot(
  options: ScreenshotOptions
): Promise<ScreenshotResult> {
  const {
    url,
    html,
    width,
    height,
    outputPath,
    deviceScaleFactor = 2
  } = options

  if (!url && !html) {
    throw new Error('Either url or html must be provided')
  }

  const executablePath = findChromium()
  const browser = await chromium.launch({
    executablePath,
    headless: true
  })

  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor
    })
    const page = await context.newPage()

    if (url) {
      await page.goto(url, { waitUntil: 'networkidle' })
    } else if (html) {
      await page.setContent(html, { waitUntil: 'networkidle' })
    }

    // Ensure output directory exists
    await fsPromises.mkdir(path.dirname(outputPath), { recursive: true })

    await page.screenshot({
      path: outputPath,
      type: 'png',
      ...(options.clip ? { clip: options.clip } : {})
    })

    const stats = await fsPromises.stat(outputPath)

    return {
      path: outputPath,
      size: stats.size,
      width: width * deviceScaleFactor,
      height: height * deviceScaleFactor
    }
  } finally {
    await browser.close()
  }
}

export async function recordVideo(options: VideoOptions): Promise<VideoResult> {
  const {
    url,
    html,
    width,
    height,
    outputDir,
    duration,
    deviceScaleFactor = 1,
    clip
  } = options

  if (!url && !html) {
    throw new Error('Either url or html must be provided')
  }

  const executablePath = findChromium()
  const browser = await chromium.launch({
    executablePath,
    headless: true
  })

  try {
    await fsPromises.mkdir(outputDir, { recursive: true })

    // When clip is provided, set viewport to clip dimensions and offset content
    const recordWidth = clip ? clip.width : width
    let recordHeight = clip ? clip.height : height

    if (!clip && html) {
      // Measure the content's natural dimensions first so the recording
      // matches exactly what the component preview shows (no white-space).
      const measureCtx = await browser.newContext({
        viewport: { width, height: 10000 }
      })
      const measurePage = await measureCtx.newPage()
      await measurePage.setContent(html, { waitUntil: 'networkidle' })
      const measured = await measurePage.evaluate(() =>
        document.documentElement.scrollHeight
      )
      if (measured > 0 && measured < 10000) {
        recordHeight = measured
      }
      await measureCtx.close()
    }

    const context = await browser.newContext({
      viewport: { width: recordWidth, height: recordHeight },
      deviceScaleFactor,
      recordVideo: {
        dir: outputDir,
        size: { width: recordWidth, height: recordHeight }
      }
    })
    const page = await context.newPage()

    if (url) {
      await page.goto(url, { waitUntil: 'networkidle' })
    } else if (html) {
      await page.setContent(html, { waitUntil: 'networkidle' })
    }

    // Strip default margins so content fills the viewport edge-to-edge
    await page.addStyleTag({
      content: 'html, body { margin: 0; padding: 0; }'
    })

    // Offset content so the clip region fills the viewport
    if (clip) {
      await page.addStyleTag({
        content: `html { margin-top: -${clip.y}px; margin-left: -${clip.x}px; }`
      })
    }

    // Determine recording duration
    const maxDur = options.maxDuration ?? 30
    let recordDuration: number

    if (options.duration && options.duration > 0) {
      // Explicit duration provided
      recordDuration = Math.min(options.duration, maxDur)
    } else {
      // Auto-detect from CSS animations / JS animation API
      const detected = await page.evaluate(() => {
        const anims = document.getAnimations()
        if (anims.length === 0) return 0
        let longest = 0
        for (const a of anims) {
          const timing = a.effect?.getComputedTiming()
          if (timing) {
            const dur = (timing.endTime as number) || 0
            if (dur > longest && dur < 120_000) longest = dur
          }
        }
        return longest / 1000 // convert ms to seconds
      })
      // Use detected duration + 1s buffer, minimum 5s, capped at maxDuration
      recordDuration = Math.min(Math.max(detected > 0 ? detected + 1 : 5, 3), maxDur)
    }

    await page.waitForTimeout(recordDuration * 1000)

    // Close page to finalize video
    await page.close()

    const videoPath = await page.video()?.path()
    if (!videoPath) {
      throw new Error('Video recording failed — no file produced')
    }

    await context.close()

    // Convert WebM → MP4 (H.264) for LinkedIn compatibility
    const mp4Path = videoPath.replace(/\.webm$/i, '.mp4')
    try {
      await execFileAsync('ffmpeg', [
        '-i', videoPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-an',  // no audio
        '-y',   // overwrite
        mp4Path
      ])
      // Remove the original WebM
      await fsPromises.unlink(videoPath)
      const stats = await fsPromises.stat(mp4Path)
      return {
        path: mp4Path,
        size: stats.size,
        width: recordWidth,
        height: recordHeight,
        duration: recordDuration
      }
    } catch {
      // ffmpeg not available — fall back to WebM
      const stats = await fsPromises.stat(videoPath)
      return {
        path: videoPath,
        size: stats.size,
        width: recordWidth,
        height: recordHeight,
        duration: recordDuration
      }
    }
  } finally {
    await browser.close()
  }
}
