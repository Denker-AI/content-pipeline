import { useCallback, useEffect, useState } from 'react'

import type { ProjectSettings, UserSettings } from '@/shared/types'

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
}

const DEFAULT_PROJECT: ProjectSettings = {
  persona: {
    company: '',
    product: '',
    tone: '',
    audience: '',
  },
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER)
  const [projectSettings, setProjectSettings] =
    useState<ProjectSettings>(DEFAULT_PROJECT)
  const [userSaved, setUserSaved] = useState(false)
  const [projectSaved, setProjectSaved] = useState(false)
  const [cookiesText, setCookiesText] = useState('{}')

  const loadSettings = useCallback(async () => {
    const api = window.electronAPI?.settings
    if (!api) return

    const user = await api.getUser()
    setUserSettings(user)
    setCookiesText(JSON.stringify(user.authCookies, null, 2))

    const project = await api.getProject()
    setProjectSettings(project)
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadSettings()
      setUserSaved(false)
      setProjectSaved(false)
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
    setUserSaved(true)
    setTimeout(() => setUserSaved(false), 2000)
  }

  const handleSaveProject = async () => {
    const api = window.electronAPI?.settings
    if (!api) return

    await api.saveProject(projectSettings)
    setProjectSaved(true)
    setTimeout(() => setProjectSaved(false), 2000)
  }

  if (!isOpen) return null

  const inputClass =
    'w-full rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-blue-500 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl">
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
                <button
                  onClick={() =>
                    setUserSettings({ ...userSettings, theme: 'dark' })
                  }
                  className={`rounded px-3 py-1.5 text-sm ${
                    userSettings.theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() =>
                    setUserSettings({ ...userSettings, theme: 'light' })
                  }
                  className={`rounded px-3 py-1.5 text-sm ${
                    userSettings.theme === 'light'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                  }`}
                >
                  Light
                </button>
              </div>
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

        {/* Project Settings Section */}
        <section>
          <h2 className="mb-4 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Project Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                Company
              </label>
              <input
                type="text"
                className={inputClass}
                value={projectSettings.persona.company}
                onChange={(e) =>
                  setProjectSettings({
                    ...projectSettings,
                    persona: {
                      ...projectSettings.persona,
                      company: e.target.value,
                    },
                  })
                }
                placeholder="Company name"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                Product
              </label>
              <input
                type="text"
                className={inputClass}
                value={projectSettings.persona.product}
                onChange={(e) =>
                  setProjectSettings({
                    ...projectSettings,
                    persona: {
                      ...projectSettings.persona,
                      product: e.target.value,
                    },
                  })
                }
                placeholder="Product name"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">Tone</label>
              <input
                type="text"
                className={inputClass}
                value={projectSettings.persona.tone}
                onChange={(e) =>
                  setProjectSettings({
                    ...projectSettings,
                    persona: {
                      ...projectSettings.persona,
                      tone: e.target.value,
                    },
                  })
                }
                placeholder="e.g. Professional, casual, technical"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                Audience
              </label>
              <input
                type="text"
                className={inputClass}
                value={projectSettings.persona.audience}
                onChange={(e) =>
                  setProjectSettings({
                    ...projectSettings,
                    persona: {
                      ...projectSettings.persona,
                      audience: e.target.value,
                    },
                  })
                }
                placeholder="e.g. Developers, marketers, founders"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveProject}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500"
              >
                Save Project Settings
              </button>
              {projectSaved && (
                <span className="text-xs text-green-400">Saved</span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
