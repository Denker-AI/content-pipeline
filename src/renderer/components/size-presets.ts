export interface SizePreset {
  name: string
  width: number
  height: number
  description: string
}

export const SIZE_PRESETS: SizePreset[] = [
  {
    name: 'LinkedIn Carousel',
    width: 1080,
    height: 1350,
    description: 'Carousel slides'
  },
  {
    name: 'OG Image',
    width: 1200,
    height: 627,
    description: 'Social media sharing'
  },
  {
    name: 'Newsletter Hero',
    width: 600,
    height: 300,
    description: 'Email header image'
  }
]

export interface FramePreset {
  name: string
  width: number
  height: number
  label: string
}

export const FRAME_PRESETS: FramePreset[] = [
  { name: 'Square', width: 1080, height: 1080, label: '1:1' },
  { name: 'LinkedIn', width: 1080, height: 1350, label: '4:5' },
  { name: 'TikTok / Reels', width: 1080, height: 1920, label: '9:16' },
  { name: 'Landscape', width: 1920, height: 1080, label: '16:9' }
]
