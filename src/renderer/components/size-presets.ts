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
    description: 'Carousel slides',
  },
  {
    name: 'OG Image',
    width: 1200,
    height: 627,
    description: 'Social media sharing',
  },
  {
    name: 'Newsletter Hero',
    width: 600,
    height: 300,
    description: 'Email header image',
  },
]
