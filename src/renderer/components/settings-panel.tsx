import { useCallback, useEffect, useState } from 'react'

import type { UserSettings } from '@/shared/types'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

const DEFAULT_USER: UserSettings = {
  appUrl: 'http://localhost:3000',
  authCookies: {},
  linkedinToken: '',
  resendApiKey: '',
  blogWebhookUrl: '',
  braveApiKey: '',
  theme: 'dark',
  repos: [],
  repoLabels: {},
}

function applyTheme(theme: 'light' | 'dark' | 'auto') {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', isDark)
  }
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER)
  const [userSaved, setUserSaved] = useState(false)
  const [cookiesText, setCookiesText] = useState('{}')
  const [claudeMd, setClaudeMd] = useState('')
  const [claudeMdSaved, setClaudeMdSaved] = useState(false)

  const loadSettings = useCallback(async () => {
    const api = window.electronAPI?.settings
    if (!api) return

    const user = await api.getUser()
    setUserSettings(user)
    setCookiesText(JSON.stringify(user.authCookies, null, 2))

    const claudeContent = await window.electronAPI?.project.readClaudeMd()
    setClaudeMd(claudeContent ?? '')
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadSettings()
      setUserSaved(false)
      setClaudeMdSaved(false)
    }
  }, [isOpen, loadSettings])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSaveUser = async () => {
    const api = window.electronAPI?.settings
    if (!api) return

    let parsedCookies: Record<string, string> = {}
    try {
      parsedCookies = JSON.parse(cookiesText) as Record<string, string>
    } catch {
      // keep existing cookies if JSON is invalid
      parsedCookies = userSettings.authCookies
    }

    const updated = { ...userSettings, authCookies: parsedCookies }
    await api.saveUser(updated)
    setUserSettings(updated)

    // Apply theme immediately
    applyTheme(updated.theme)

    setUserSaved(true)
    setTimeout(() => setUserSaved(false), 2000)
  }

  const handleSaveClaudeMd = async () => {
    await window.electronAPI?.project.writeClaudeMd(claudeMd)
    setClaudeMdSaved(true)
    setTimeout(() => setClaudeMdSaved(false), 2000)
  }

  if (!isOpen) return null

  const inputClass =
    'w-full rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-blue-500 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto thin-scrollbar rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          aria-label="Close settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <h1 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">Settings</h1>

        {/* User Settings Section */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            User Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                App URL
              </label>
              <input
                type="text"
                className={inputClass}
                value={userSettings.appUrl}
                onChange={(e) =>
                  setUserSettings({ ...userSettings, appUrl: e.target.value })
                }
                placeholder="http://localhost:3000"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                Auth Cookies (JSON)
              </label>
              <textarea
                className={`${inputClass} h-20 resize-y font-mono text-xs`}
                value={cookiesText}
                onChange={(e) => setCookiesText(e.target.value)}
                placeholder='{"cookie_name": "cookie_value"}'
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                LinkedIn Token
              </label>
              <input
                type="password"
                className={inputClass}
                value={userSettings.linkedinToken}
                onChange={(e) =>
                  setUserSettings({
                    ...userSettings,
                    linkedinToken: e.target.value,
                  })
                }
                placeholder="Enter LinkedIn access token"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                Resend API Key
              </label>
              <input
                type="password"
                className={inputClass}
                value={userSettings.resendApiKey}
                onChange={(e) =>
                  setUserSettings({
                    ...userSettings,
                    resendApiKey: e.target.value,
                  })
                }
                placeholder="Enter Resend API key"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                Blog Webhook URL
              </label>
              <input
                type="text"
                className={inputClass}
                value={userSettings.blogWebhookUrl}
                onChange={(e) =>
                  setUserSettings({
                    ...userSettings,
                    blogWebhookUrl: e.target.value,
                  })
                }
                placeholder="https://example.com/webhook"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                Brave Search API Key
              </label>
              <input
                type="password"
                className={inputClass}
                value={userSettings.braveApiKey}
                onChange={(e) =>
                  setUserSettings({
                    ...userSettings,
                    braveApiKey: e.target.value,
                  })
                }
                placeholder="Enter Brave Search API key"
              />
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Free at search.brave.com/api (2,000 queries/mo)
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">Theme</label>
              <div className="flex gap-2">
                {(['light', 'dark', 'auto'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setUserSettings({ ...userSettings, theme: t })
                    }
                    className={`rounded px-3 py-1.5 text-sm capitalize ${
                      userSettings.theme === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={userSettings.pullBeforeWorktree ?? true}
                  onChange={(e) =>
                    setUserSettings({ ...userSettings, pullBeforeWorktree: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 accent-blue-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-200">
                  Pull latest from origin before creating worktree
                </span>
              </label>
              <p className="mt-1 ml-6 text-xs text-zinc-400 dark:text-zinc-500">
                Ensures new content branches start from the latest remote code
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveUser}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500"
              >
                Save User Settings
              </button>
              {userSaved && (
                <span className="text-xs text-green-400">Saved</span>
              )}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mb-8 border-t border-zinc-200 dark:border-zinc-700" />

        {/* Brand Guidelines Section */}
        <section>
          <h2 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Brand Guidelines
          </h2>
          <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">
            This is your content/CLAUDE.md file. Claude reads this before creating any content.
          </p>
          <textarea
            className={`${inputClass} h-64 resize-y font-mono text-xs leading-relaxed`}
            value={claudeMd}
            onChange={(e) => setClaudeMd(e.target.value)}
            placeholder="# Brand Guidelines..."
            spellCheck={false}
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleSaveClaudeMd}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500"
            >
              Save Brand Guidelines
            </button>
            {claudeMdSaved && (
              <span className="text-xs text-green-400">Saved</span>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
