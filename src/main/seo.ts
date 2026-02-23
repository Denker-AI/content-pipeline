import { Marked } from 'marked'
import { SeoCheck } from 'seord'

import type { SEOAnalysisResult, SEOCompetitor, SEOSuggestion } from '@/shared/types'

import { findBlogMarkdown, parseFrontmatter } from './webhook'

// Dynamic import for ESM-only text-readability
let readability: {
  fleschReadingEase: (text: string) => number
  fleschKincaidGrade: (text: string) => number
  lexiconCount: (text: string) => number
} | null = null

async function getReadability() {
  if (!readability) {
    const mod = await import('text-readability')
    readability = mod.default
  }
  return readability!
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function scoreContent(
  html: string,
  keyword: string,
  title: string,
  description: string,
): Promise<{
  seoScore: number
  readabilityScore: number
  readabilityGrade: string
  wordCount: number
  keywordDensity: number
  suggestions: SEOSuggestion[]
}> {
  const seoCheck = new SeoCheck(
    {
      title,
      keyword,
      subKeywords: [],
      htmlText: html,
      metaDescription: description,
      languageCode: 'en',
      countryCode: 'us',
    },
    null,
    false,
  )

  const seoResult = await seoCheck.analyzeSeo()

  // Readability analysis on plain text
  const plainText = stripHtmlTags(html)
  const rd = await getReadability()

  let fleschScore = 0
  let gradeLevel = 0
  if (rd.lexiconCount(plainText) > 10) {
    fleschScore = rd.fleschReadingEase(plainText)
    gradeLevel = rd.fleschKincaidGrade(plainText)
  }

  // Convert Flesch Reading Ease (0-100, higher=easier) to a 0-100 readability score
  const readabilityScore = Math.max(0, Math.min(100, Math.round(fleschScore)))
  const readabilityGrade =
    gradeLevel > 0 ? `Grade ${Math.round(gradeLevel)}` : 'N/A'

  // Collect suggestions
  const suggestions: SEOSuggestion[] = []
  for (const msg of seoResult.messages.goodPoints) {
    suggestions.push({ type: 'good', message: msg })
  }
  for (const msg of seoResult.messages.warnings) {
    suggestions.push({ type: 'warning', message: msg })
  }
  for (const msg of seoResult.messages.minorWarnings) {
    suggestions.push({ type: 'minor', message: msg })
  }

  return {
    seoScore: seoResult.seoScore,
    readabilityScore,
    readabilityGrade,
    wordCount: seoResult.wordCount,
    keywordDensity: Math.round(seoResult.keywordDensity * 100) / 100,
    suggestions,
  }
}

interface BraveWebResult {
  title: string
  url: string
  description: string
}

interface BraveSearchResponse {
  web?: {
    results?: BraveWebResult[]
  }
}

async function fetchCompetitors(
  keyword: string,
  braveApiKey: string,
): Promise<SEOCompetitor[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(keyword)}&count=5`

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': braveApiKey,
    },
  })

  if (!res.ok) {
    console.error(`Brave Search API error: ${res.status}`)
    return []
  }

  const data = (await res.json()) as BraveSearchResponse
  const results = data.web?.results ?? []
  const competitors: SEOCompetitor[] = []

  for (const result of results) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const pageRes = await fetch(result.url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ContentPipeline/1.0; SEO analysis)',
        },
      })
      clearTimeout(timeout)

      if (!pageRes.ok) {
        competitors.push({
          url: result.url,
          title: result.title,
          description: result.description,
          score: 0,
          wordCount: 0,
        })
        continue
      }

      const pageHtml = await pageRes.text()

      // Extract title from page HTML
      const titleMatch = pageHtml.match(/<title[^>]*>([^<]*)<\/title>/i)
      const pageTitle = titleMatch ? titleMatch[1].trim() : result.title

      // Extract meta description
      const descMatch = pageHtml.match(
        /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i,
      )
      const pageDesc = descMatch ? descMatch[1].trim() : result.description

      const seoCheck = new SeoCheck(
        {
          title: pageTitle,
          keyword,
          subKeywords: [],
          htmlText: pageHtml,
          metaDescription: pageDesc,
          languageCode: 'en',
          countryCode: 'us',
        },
        null,
        false,
      )

      const seoResult = await seoCheck.analyzeSeo()

      competitors.push({
        url: result.url,
        title: result.title,
        description: result.description,
        score: seoResult.seoScore,
        wordCount: seoResult.wordCount,
      })
    } catch {
      competitors.push({
        url: result.url,
        title: result.title,
        description: result.description,
        score: 0,
        wordCount: 0,
      })
    }
  }

  return competitors
}

export async function analyzeSEO(
  contentDir: string,
  keyword: string,
  braveApiKey?: string,
): Promise<SEOAnalysisResult> {
  // Read and parse the blog markdown
  const { raw } = await findBlogMarkdown(contentDir)
  const { frontmatter, body } = parseFrontmatter(raw)

  // Convert markdown to HTML
  const marked = new Marked()
  const html = await marked.parse(body)

  // Score local content
  const local = await scoreContent(
    html,
    keyword,
    frontmatter.title,
    frontmatter.description ?? '',
  )

  // Composite score: weighted average of SEO + readability
  const compositeScore = Math.round(local.seoScore * 0.7 + local.readabilityScore * 0.3)

  // Competitor analysis
  let competitors: SEOCompetitor[] = []
  let competitorAvgScore = 0

  if (braveApiKey) {
    competitors = await fetchCompetitors(keyword, braveApiKey)
    const scored = competitors.filter((c) => c.score > 0)
    if (scored.length > 0) {
      competitorAvgScore = Math.round(
        scored.reduce((sum, c) => sum + c.score, 0) / scored.length,
      )
    }
  }

  return {
    score: compositeScore,
    seoScore: local.seoScore,
    readabilityScore: local.readabilityScore,
    readabilityGrade: local.readabilityGrade,
    wordCount: local.wordCount,
    keywordDensity: local.keywordDensity,
    suggestions: local.suggestions,
    keyword,
    competitors,
    competitorAvgScore,
  }
}
