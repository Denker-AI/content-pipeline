import fs from 'fs/promises'
import path from 'path'

const MAX_FILES = 25
const MAX_BYTES = 50_000

const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.js', '.jsx']

// Match import statements, skip `import type`
const IMPORT_RE = /^import\s+(?!type\s).*?\s+from\s+['"]([^'"]+)['"]/gm

// Match icon imports from known libraries (lucide-react, heroicons, etc.)
const ICON_IMPORT_RE = /^import\s+\{([^}]+)\}\s+from\s+['"](lucide-react|@heroicons\/react\/\w+|react-icons\/\w+)['"]/gm

/**
 * Find the project root by walking up from a file to find package.json
 */
async function findProjectRoot(filePath: string): Promise<string> {
  let dir = path.dirname(path.resolve(filePath))
  const root = path.parse(dir).root

  while (dir !== root) {
    try {
      await fs.access(path.join(dir, 'package.json'))
      return dir
    } catch {
      dir = path.dirname(dir)
    }
  }
  return path.dirname(filePath)
}

/**
 * Read tsconfig.json paths from a project and build alias map.
 * Returns pairs like ['@/', '/absolute/path/to/src/']
 */
async function readTsconfigPaths(
  projectRoot: string
): Promise<[string, string][]> {
  const aliases: [string, string][] = []

  for (const configName of ['tsconfig.json', 'tsconfig.app.json']) {
    try {
      const raw = await fs.readFile(
        path.join(projectRoot, configName),
        'utf-8'
      )
      // Strip comments (// and /* */) for JSON parsing
      const stripped = raw
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
      const config = JSON.parse(stripped)
      const paths = config?.compilerOptions?.paths
      if (!paths) continue

      // Sort by specificity (longer prefix first)
      const entries = Object.entries(paths).sort(
        (a, b) => b[0].length - a[0].length
      )

      for (const [pattern, targets] of entries) {
        const target = (targets as string[])[0]
        if (!pattern.endsWith('/*') || !target) continue
        const prefix = pattern.slice(0, -1) // '@/*' → '@/'
        const targetDir = target.slice(0, -1) // './src/*' → './src/'
        const absoluteTarget = path.join(projectRoot, targetDir)
        aliases.push([prefix, absoluteTarget + '/'])
      }

      if (aliases.length > 0) break
    } catch {
      continue
    }
  }

  return aliases
}

function resolveAlias(
  specifier: string,
  aliases: [string, string][]
): string | null {
  for (const [prefix, absoluteTarget] of aliases) {
    if (specifier.startsWith(prefix)) {
      return path.join(absoluteTarget, specifier.slice(prefix.length))
    }
  }
  return null
}

function isLocalImport(specifier: string): boolean {
  return (
    specifier.startsWith('./') ||
    specifier.startsWith('../') ||
    specifier.startsWith('@/')
  )
}

async function tryResolve(base: string): Promise<string | null> {
  for (const ext of ['', ...EXTENSIONS]) {
    const full = base + ext
    try {
      const stat = await fs.stat(full)
      if (stat.isFile()) return full
    } catch {
      // not found, try next
    }
  }
  return null
}

/**
 * Extract icon names from npm icon library imports.
 * Returns a list like ['Search', 'Globe', 'ChevronDown']
 */
function extractIconImports(source: string): string[] {
  const icons: string[] = []
  const matches = source.matchAll(ICON_IMPORT_RE)
  for (const match of matches) {
    const names = match[1]
      .split(',')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('type '))
    icons.push(...names)
  }
  return icons
}

/**
 * Find and extract CSS variable definitions (--var: value) from the project's
 * global CSS file (globals.css, global.css, app.css, index.css).
 * Also reads tailwind.config.ts/js for theme extensions.
 * Returns a compact string of CSS variable → value mappings.
 */
async function resolveThemeConfig(projectRoot: string): Promise<string> {
  const parts: string[] = []

  // Look for global CSS with CSS variables (shadcn defines --background, --muted, --border, etc.)
  const cssLocations = [
    'src/app/globals.css',
    'src/styles/globals.css',
    'src/styles/global.css',
    'app/globals.css',
    'src/index.css',
    'src/app.css',
    'styles/globals.css'
  ]

  for (const loc of cssLocations) {
    try {
      const css = await fs.readFile(path.join(projectRoot, loc), 'utf-8')
      // Extract CSS custom property declarations
      const varLines: string[] = []
      const varRegex = /--([\w-]+)\s*:\s*([^;]+);/g
      let match
      while ((match = varRegex.exec(css)) !== null) {
        varLines.push(`--${match[1]}: ${match[2].trim()}`)
      }
      if (varLines.length > 0) {
        parts.push(`## CSS Variables (from ${loc})\n${varLines.join('\n')}\n`)
      }
      break // found the CSS file
    } catch {
      continue
    }
  }

  // Look for Tailwind config theme extensions
  const configLocations = [
    'tailwind.config.ts',
    'tailwind.config.js',
    'tailwind.config.mjs'
  ]

  for (const loc of configLocations) {
    try {
      const config = await fs.readFile(path.join(projectRoot, loc), 'utf-8')
      // Only include if it has theme/extend (otherwise it's just boilerplate)
      if (config.includes('theme') && config.includes('extend')) {
        // Truncate to keep it manageable
        const trimmed = config.length > 3000 ? config.slice(0, 3000) + '\n// ... truncated' : config
        parts.push(`## Tailwind Config (${loc})\n\`\`\`ts\n${trimmed}\n\`\`\`\n`)
      }
      break
    } catch {
      continue
    }
  }

  return parts.join('\n')
}

export interface ImportResolverResult {
  dependencies: Record<string, string>
  iconNames: string[]
  themeConfig: string
}

/**
 * Recursively resolve local imports starting from entryFile.
 * Auto-detects the project root and reads tsconfig paths.
 * Returns dependencies (relative path → source) and icon names from npm libs.
 * Skips the entry file itself (caller already has it).
 */
export async function resolveImports(
  entryFile: string,
  _projectRoot: string
): Promise<ImportResolverResult> {
  // Find the REAL project root from the component file location
  const componentProjectRoot = await findProjectRoot(entryFile)
  const aliases = await readTsconfigPaths(componentProjectRoot)

  const visited = new Set<string>()
  const result: Record<string, string> = {}
  const allIconNames: string[] = []
  let totalBytes = 0

  async function walk(filePath: string): Promise<void> {
    const resolved = path.resolve(filePath)
    if (visited.has(resolved)) return
    visited.add(resolved)

    if (visited.size > MAX_FILES + 1 || totalBytes >= MAX_BYTES) return

    let source: string
    try {
      source = await fs.readFile(resolved, 'utf-8')
    } catch {
      return
    }

    // Collect icon imports from npm libraries
    const icons = extractIconImports(source)
    allIconNames.push(...icons)

    // Don't include the entry file in dependencies
    const entryResolved = path.resolve(entryFile)
    if (resolved !== entryResolved) {
      const relativePath = path.relative(componentProjectRoot, resolved)
      if (totalBytes + source.length > MAX_BYTES) return
      result[relativePath] = source
      totalBytes += source.length
    }

    // Find all imports
    const matches = source.matchAll(IMPORT_RE)
    for (const match of matches) {
      const specifier = match[1]
      if (!specifier) continue

      // Skip npm packages (no ./ ../ or @/ prefix)
      if (!isLocalImport(specifier)) continue

      let target: string | null = null
      if (specifier.startsWith('@/') || specifier.startsWith('@')) {
        target = resolveAlias(specifier, aliases)
      }
      if (!target) {
        target = path.resolve(path.dirname(resolved), specifier)
      }

      const resolvedPath = await tryResolve(target)
      if (resolvedPath) {
        await walk(resolvedPath)
      }
    }
  }

  await walk(entryFile)

  // Deduplicate icon names
  const uniqueIcons = [...new Set(allIconNames)]

  // Resolve theme config (CSS variables + Tailwind config)
  const themeConfig = await resolveThemeConfig(componentProjectRoot)

  return { dependencies: result, iconNames: uniqueIcons, themeConfig }
}
