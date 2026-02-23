import { useCallback, useState } from 'react'

import type { ContentType, SEOAnalysisResult } from '@/shared/types'

interface SeoPanelProps {
  contentDir?: string
  activeContentType?: ContentType
}

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 70 ? 'text-green-500' : score >= 40 ? 'text-yellow-500' : 'text-red-500'
  const strokeColor =
    score >= 70 ? 'stroke-green-500' : score >= 40 ? 'stroke-yellow-500' : 'stroke-red-500'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={4}
            className="stroke-zinc-200 dark:stroke-zinc-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={strokeColor}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${color}`}>{score}</span>
        </div>
      </div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
    </div>
  )
}

export function SeoPanel({ contentDir, activeContentType }: SeoPanelProps) {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SEOAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = useCallback(async () => {
    if (!contentDir || !keyword.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const analysis = await window.electronAPI.seo.analyze(contentDir, keyword.trim())
      setResult(analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [contentDir, keyword])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleAnalyze()
    },
    [handleAnalyze],
  )

  if (activeContentType !== 'blog') {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
        <p className="text-sm">SEO analysis is available for blog content only</p>
      </div>
    )
  }

  if (!contentDir) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
        <p className="text-sm">Select a blog post to analyze</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Keyword input */}
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Target keyword..."
          className="flex-1 rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !keyword.trim()}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Analyzing content & competitors...
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="m-4 rounded border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="flex-1 space-y-4 p-4">
          {/* Score cards */}
          <div className="flex items-center justify-around rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
            <ScoreRing score={result.score} label="Overall" size={90} />
            <ScoreRing score={result.seoScore} label="SEO" />
            <ScoreRing score={result.readabilityScore} label="Readability" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 text-center">
              <div className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                {result.wordCount.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Words</div>
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 text-center">
              <div className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                {result.keywordDensity}%
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Keyword Density</div>
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 text-center">
              <div className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                {result.readabilityGrade}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Reading Level</div>
            </div>
          </div>

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Suggestions
              </h3>
              <div className="space-y-1.5">
                {result.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className={`rounded px-3 py-2 text-xs ${
                      s.type === 'good'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : s.type === 'warning'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <span className="mr-1.5">
                      {s.type === 'good' ? '+' : s.type === 'warning' ? '!' : '-'}
                    </span>
                    {s.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitor analysis */}
          {result.competitors.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Competitor Analysis
                <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  avg score: {result.competitorAvgScore}
                </span>
              </h3>
              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                      <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                        #
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                        Page
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
                        Score
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
                        Words
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.competitors.map((c, i) => {
                      const beats = result.score >= c.score && c.score > 0
                      return (
                        <tr
                          key={i}
                          className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                        >
                          <td className="px-3 py-2 text-zinc-400 dark:text-zinc-500">
                            {i + 1}
                          </td>
                          <td className="max-w-[200px] truncate px-3 py-2 text-zinc-700 dark:text-zinc-300">
                            <div className="truncate" title={c.title}>
                              {c.title}
                            </div>
                            <div className="truncate text-zinc-400 dark:text-zinc-500" title={c.url}>
                              {c.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={
                                beats
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-zinc-700 dark:text-zinc-300'
                              }
                            >
                              {c.score > 0 ? c.score : '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-500 dark:text-zinc-400">
                            {c.wordCount > 0 ? c.wordCount.toLocaleString() : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Add a Brave Search API key in Settings for competitor analysis
            </div>
          )}
        </div>
      )}

      {/* Initial empty state */}
      {!result && !loading && !error && (
        <div className="flex flex-1 items-center justify-center text-zinc-400 dark:text-zinc-500">
          <p className="text-sm">Enter a keyword and click Analyze</p>
        </div>
      )}
    </div>
  )
}
