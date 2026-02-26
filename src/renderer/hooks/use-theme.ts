import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'auto'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  // Load theme from settings on mount
  useEffect(() => {
    const load = async () => {
      const settings = await window.electronAPI?.settings.getUser()
      if (settings?.theme) {
        setTheme(settings.theme)
      }
    }
    load()
  }, [])

  // Apply theme to <html> element
  useEffect(() => {
    const apply = (isDark: boolean) => {
      document.documentElement.classList.toggle('dark', isDark)
    }

    if (theme === 'dark') {
      apply(true)
    } else if (theme === 'light') {
      apply(false)
    } else {
      // auto — follow system preference
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mq.matches)

      const handler = (e: MediaQueryListEvent) => apply(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  return { theme, setTheme }
}
