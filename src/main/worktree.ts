import { execFile } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'

import type { WorktreeInfo } from '../shared/types'

const execFileAsync = promisify(execFile)

/**
 * Check if a directory is inside a git repository.
 */
export async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: dir
    })
    return true
  } catch {
    return false
  }
}

/**
 * Check if a branch name already exists in the repo.
 */
async function branchExists(
  projectRoot: string,
  branch: string
): Promise<boolean> {
  try {
    await execFileAsync(
      'git',
      ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
      { cwd: projectRoot }
    )
    return true
  } catch {
    return false
  }
}

/**
 * Resolve a unique branch name by appending -2, -3, etc. if needed.
 */
async function resolveUniqueBranch(
  projectRoot: string,
  baseBranch: string
): Promise<string> {
  let candidate = baseBranch
  let suffix = 2
  while (await branchExists(projectRoot, candidate)) {
    candidate = `${baseBranch}-${suffix}`
    suffix++
  }
  return candidate
}

/**
 * Pull latest from origin (best-effort, silently ignored if no remote).
 */
async function pullLatest(projectRoot: string): Promise<void> {
  try {
    await execFileAsync('git', ['pull', '--ff-only'], { cwd: projectRoot })
  } catch {
    // No remote, no tracking branch, or conflicts — skip silently
  }
}

/**
 * Create a new git worktree with a dedicated branch.
 * Optionally pulls from origin first so the worktree starts from latest code.
 */
export async function createWorktree(
  projectRoot: string,
  branch: string,
  worktreePath: string,
  options?: { pullBeforeCreate?: boolean }
): Promise<WorktreeInfo> {
  if (options?.pullBeforeCreate) {
    await pullLatest(projectRoot)
  }

  const uniqueBranch = await resolveUniqueBranch(projectRoot, branch)

  await execFileAsync(
    'git',
    ['worktree', 'add', worktreePath, '-b', uniqueBranch],
    { cwd: projectRoot }
  )

  return {
    branch: uniqueBranch,
    path: path.resolve(worktreePath),
    contentDir: path.join(path.resolve(worktreePath), 'content')
  }
}

/**
 * List all git worktrees in the repository.
 * Automatically prunes stale (prunable) worktrees before returning.
 */
export async function listWorktrees(
  projectRoot: string
): Promise<WorktreeInfo[]> {
  // Auto-prune stale worktrees (directories deleted but git record remains)
  try {
    await execFileAsync('git', ['worktree', 'prune'], { cwd: projectRoot })
  } catch {
    // Prune is best-effort
  }

  const { stdout } = await execFileAsync(
    'git',
    ['worktree', 'list', '--porcelain'],
    { cwd: projectRoot }
  )

  const worktrees: WorktreeInfo[] = []
  let currentPath = ''
  let currentBranch = ''
  let isPrunable = false

  for (const line of stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      currentPath = line.slice('worktree '.length)
    } else if (line.startsWith('branch ')) {
      currentBranch = line.slice('branch refs/heads/'.length)
    } else if (line === 'prunable') {
      isPrunable = true
    } else if (line === '') {
      if (currentPath && currentBranch && !isPrunable) {
        worktrees.push({
          branch: currentBranch,
          path: currentPath,
          contentDir: path.join(currentPath, 'content')
        })
      }
      currentPath = ''
      currentBranch = ''
      isPrunable = false
    }
  }

  return worktrees
}

/**
 * Get the branch name for a worktree path.
 */
async function getWorktreeBranch(
  projectRoot: string,
  worktreePath: string
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd: worktreePath }
    )
    return stdout.trim() || null
  } catch {
    return null
  }
}

/**
 * Remove a git worktree and optionally its local + remote branch.
 * Also clears worktree references from the content metadata.
 */
export async function removeWorktree(
  projectRoot: string,
  worktreePath: string,
  options?: { deleteRemoteBranch?: boolean }
): Promise<void> {
  const branch = await getWorktreeBranch(projectRoot, worktreePath)

  await execFileAsync('git', ['worktree', 'remove', worktreePath, '--force'], {
    cwd: projectRoot
  })

  // Clean up metadata that referenced this worktree
  await clearWorktreeMetadata(projectRoot, worktreePath)

  // Delete the local branch after worktree is removed
  if (branch && branch !== 'main' && branch !== 'master') {
    try {
      await execFileAsync('git', ['branch', '-D', branch], { cwd: projectRoot })
    } catch {
      // Branch may already be deleted
    }

    // Delete remote branch if requested
    if (options?.deleteRemoteBranch) {
      try {
        await execFileAsync('git', ['push', 'origin', '--delete', branch], {
          cwd: projectRoot
        })
      } catch {
        // Remote branch may not exist or no remote configured
      }
    }
  }
}

/**
 * Find and clear worktree references in metadata.json files
 * that point to the given worktree path.
 */
async function clearWorktreeMetadata(
  projectRoot: string,
  worktreePath: string
): Promise<void> {
  const contentDir = path.join(projectRoot, 'content')
  try {
    const typeDirs = await fs.readdir(contentDir, { withFileTypes: true })
    for (const typeDir of typeDirs) {
      if (!typeDir.isDirectory() || typeDir.name.startsWith('.')) continue
      const typePath = path.join(contentDir, typeDir.name)
      const items = await fs.readdir(typePath, { withFileTypes: true })
      for (const item of items) {
        if (!item.isDirectory()) continue
        const metaPath = path.join(typePath, item.name, 'metadata.json')
        try {
          const raw = await fs.readFile(metaPath, 'utf-8')
          const meta = JSON.parse(raw)
          if (meta.worktreePath === worktreePath) {
            delete meta.worktreePath
            delete meta.worktreeBranch
            await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
          }
        } catch {
          // No metadata or parse error — skip
        }
      }
    }
  } catch {
    // Content dir doesn't exist — skip
  }
}
