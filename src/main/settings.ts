import fs from 'fs/promises'
import os from 'os'
import path from 'path'

import type { ProjectSettings, UserSettings } from '@/shared/types'

const USER_SETTINGS_DIR = path.join(os.homedir(), '.content-pipeline')
const USER_SETTINGS_FILE = path.join(USER_SETTINGS_DIR, 'settings.json')
const PROJECT_SETTINGS_FILE = 'content-pipeline.json'

const DEFAULT_USER_SETTINGS: UserSettings = {
  appUrl: 'http://localhost:3000',
  authCookies: {},
  linkedinToken: '',
  resendApiKey: '',
  blogWebhookUrl: '',
  braveApiKey: '',
  theme: 'dark',
  repos: [],
}

const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  persona: {
    company: '',
    product: '',
    tone: '',
    audience: '',
  },
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

async function readJsonFile<T>(filePath: string, defaults: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return { ...defaults, ...JSON.parse(raw) } as T
  } catch {
    return { ...defaults }
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export async function loadUserSettings(): Promise<UserSettings> {
  return readJsonFile(USER_SETTINGS_FILE, DEFAULT_USER_SETTINGS)
}

export async function saveUserSettings(
  settings: UserSettings,
): Promise<void> {
  await writeJsonFile(USER_SETTINGS_FILE, settings)
}

export async function loadProjectSettings(
  projectRoot: string,
): Promise<ProjectSettings> {
  const filePath = path.join(projectRoot, PROJECT_SETTINGS_FILE)
  return readJsonFile(filePath, DEFAULT_PROJECT_SETTINGS)
}

export async function saveProjectSettings(
  projectRoot: string,
  settings: ProjectSettings,
): Promise<void> {
  const filePath = path.join(projectRoot, PROJECT_SETTINGS_FILE)
  await writeJsonFile(filePath, settings)
}
