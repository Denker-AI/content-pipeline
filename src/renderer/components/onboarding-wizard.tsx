import { useState } from 'react'

import type { BrandConfig } from '@/shared/types'

import { CheckIcon, CodeIcon, FolderOpenIcon, NewsletterIcon, SparkleIcon } from './icons'

interface OnboardingWizardProps {
  onComplete: () => void
}

const STEPS = 5

const EMPTY_BRAND: BrandConfig = {
  company: '',
  product: '',
  voiceTone: '',
  targetAudience: '',
  dos: '',
  donts: '',
  examplePosts: '',
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [brand, setBrand] = useState<BrandConfig>(EMPTY_BRAND)
  const [installing, setInstalling] = useState(false)

  const next = () => setStep((s) => Math.min(s + 1, STEPS - 1))
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const handleOpenProject = async () => {
    const result = await window.electronAPI?.content.openProject()
    if (result) {
      setProjectPath(result)
    }
  }

  const handleInstall = async () => {
    setInstalling(true)
    try {
      await window.electronAPI?.project.installWithBrand(brand)
      next()
    } catch (err) {
      console.error('Install failed:', err)
    } finally {
      setInstalling(false)
    }
  }

  const updateBrand = (field: keyof BrandConfig, value: string) => {
    setBrand((prev) => ({ ...prev, [field]: value }))
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        {/* Step dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-blue-500' : i < step ? 'w-1.5 bg-blue-500/50' : 'w-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Back button */}
        {step > 0 && step < STEPS - 1 && (
          <button
            onClick={prev}
            className="absolute left-4 top-4 rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
              <SparkleIcon className="h-7 w-7 text-blue-400" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold text-white">Welcome to Content Pipeline</h1>
            <p className="mb-8 text-sm text-zinc-400">
              Create LinkedIn posts, blogs, and newsletters with AI — all from one place.
            </p>

            <div className="mb-8 grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <CodeIcon className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="text-xs font-medium text-zinc-300">Terminal</p>
                <p className="mt-1 text-[11px] text-zinc-500">Write with Claude Code in a real terminal</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                  <NewsletterIcon className="h-5 w-5 text-purple-400" />
                </div>
                <p className="text-xs font-medium text-zinc-300">Preview</p>
                <p className="mt-1 text-[11px] text-zinc-500">Live preview of posts, blogs, newsletters</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                  <FolderOpenIcon className="h-5 w-5 text-amber-400" />
                </div>
                <p className="text-xs font-medium text-zinc-300">Pipeline</p>
                <p className="mt-1 text-[11px] text-zinc-500">Organize from idea to published</p>
              </div>
            </div>

            <button
              onClick={next}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 1: Connect Repository */}
        {step === 1 && (
          <div>
            <h2 className="mb-2 text-lg font-semibold text-white">Connect Repository</h2>
            <p className="mb-6 text-sm text-zinc-400">
              Select the project folder where your content lives. This should be a git repository.
            </p>

            {projectPath ? (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-800/50 bg-green-900/20 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                  <CheckIcon className="h-5 w-5 text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-green-300">Project connected</p>
                  <p className="truncate text-xs text-green-400/70">{projectPath}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleOpenProject}
                className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-700 p-8 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <FolderOpenIcon className="h-8 w-8" />
                <span className="text-sm font-medium">Choose a folder</span>
              </button>
            )}

            <div className="flex justify-end">
              <button
                onClick={next}
                disabled={!projectPath}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Brand Setup */}
        {step === 2 && (
          <div>
            <h2 className="mb-2 text-lg font-semibold text-white">Brand Setup</h2>
            <p className="mb-6 text-sm text-zinc-400">
              Tell Claude about your brand. This generates a CLAUDE.md file that guides all content creation.
            </p>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto thin-scrollbar pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Company</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={brand.company}
                    onChange={(e) => updateBrand('company', e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Product</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={brand.product}
                    onChange={(e) => updateBrand('product', e.target.value)}
                    placeholder="Acme Platform"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-400">Voice & Tone</label>
                <textarea
                  className={`${inputClass} h-16 resize-none`}
                  value={brand.voiceTone}
                  onChange={(e) => updateBrand('voiceTone', e.target.value)}
                  placeholder="Professional but approachable, technically credible, founder voice..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-400">Target Audience</label>
                <input
                  type="text"
                  className={inputClass}
                  value={brand.targetAudience}
                  onChange={(e) => updateBrand('targetAudience', e.target.value)}
                  placeholder="Developers, CTOs, technical founders..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Do (one per line)</label>
                  <textarea
                    className={`${inputClass} h-20 resize-none`}
                    value={brand.dos}
                    onChange={(e) => updateBrand('dos', e.target.value)}
                    placeholder={"Use concrete examples\nBe specific about technical details\nShare real numbers"}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">{"Don't (one per line)"}</label>
                  <textarea
                    className={`${inputClass} h-20 resize-none`}
                    value={brand.donts}
                    onChange={(e) => updateBrand('donts', e.target.value)}
                    placeholder={"No emojis\nDon't be salesy\nAvoid buzzwords"}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-400">Example Posts</label>
                <textarea
                  className={`${inputClass} h-20 resize-none`}
                  value={brand.examplePosts}
                  onChange={(e) => updateBrand('examplePosts', e.target.value)}
                  placeholder="Paste 1-2 example posts that represent your brand voice..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={next}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Install Skills */}
        {step === 3 && (
          <div>
            <h2 className="mb-2 text-lg font-semibold text-white">Install Skills</h2>
            <p className="mb-6 text-sm text-zinc-400">
              These files will be created in your project. Claude reads them to understand your brand and content structure.
            </p>

            <div className="mb-6 space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 mt-0.5">
                  <CodeIcon className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">content/CLAUDE.md</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{"Brand guidelines for Claude — voice, audience, dos/don'ts"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 mt-0.5">
                  <CodeIcon className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">.claude/commands/linkedin-post.md</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Slash command: /linkedin-post</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 mt-0.5">
                  <CodeIcon className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">content/templates/linkedin-post-preview.html</p>
                  <p className="mt-0.5 text-xs text-zinc-500">LinkedIn preview template</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleInstall}
                disabled={installing}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-40"
              >
                {installing ? 'Installing...' : 'Install'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10">
              <CheckIcon className="h-7 w-7 text-green-400" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-white">{"You're all set!"}</h2>
            <p className="mb-2 text-sm text-zinc-400">
              Your content pipeline is ready. Brand guidelines, slash commands, and templates are installed.
            </p>
            <p className="mb-8 text-xs text-zinc-500">
              Tip: Edit your brand guidelines anytime in Settings (Cmd+,)
            </p>

            <button
              onClick={onComplete}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              Start Creating
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
