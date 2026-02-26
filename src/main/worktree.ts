import { execFile } from 'child_process'
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
      cwd: dir,
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
  branch: string,
): Promise<boolean> {
  try {
    await execFileAsync(
      'git',
      ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
      { cwd: projectRoot },
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
  baseBranch: string,
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
  options?: { pullBeforeCreate?: boolean },
): Promise<WorktreeInfo> {
  if (options?.pullBeforeCreate) {
    await pullLatest(projectRoot)
  }

  const uniqueBranch = await resolveUniqueBranch(projectRoot, branch)

  await execFileAsync(
    'git',
    ['worktree', 'add', worktreePath, '-b', uniqueBranch],
    { cwd: projectRoot },
  )

  return {
    branch: uniqueBranch,
    path: path.resolve(worktreePath),
    contentDir: path.join(path.resolve(worktreePath), 'content'),
  }
}

/**
 * List all git worktrees in the repository.
 */
export async function listWorktrees(
  projectRoot: string,
): Promise<WorktreeInfo[]> {
  const { stdout } = await execFileAsync(
    'git',
    ['worktree', 'list', '--porcelain'],
    { cwd: projectRoot },
  )

  const worktrees: WorktreeInfo[] = []
  let currentPath = ''
  let currentBranch = ''

  for (const line of stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      currentPath = line.slice('worktree '.length)
    } else if (line.startsWith('branch ')) {
      currentBranch = line.slice('branch refs/heads/'.length)
    } else if (line === '') {
      if (currentPath && currentBranch) {
        worktrees.push({
          branch: currentBranch,
          path: currentPath,
          contentDir: path.join(currentPath, 'content'),
        })
      }
      currentPath = ''
      currentBranch = ''
    }
  }

  return worktrees
}

/**
 * Get the branch name for a worktree path.
 */
async function getWorktreeBranch(
  projectRoot: string,
  worktreePath: string,
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd: worktreePath },
    )
    return stdout.trim() || null
  } catch {
    return null
  }
}

/**
 * Remove a git worktree and optionally its local + remote branch.
 */
export async function removeWorktree(
  projectRoot: string,
  worktreePath: string,
  options?: { deleteRemoteBranch?: boolean },
): Promise<void> {
  const branch = await getWorktreeBranch(projectRoot, worktreePath)

  await execFileAsync('git', ['worktree', 'remove', worktreePath, '--force'], {
    cwd: projectRoot,
  })

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
          cwd: projectRoot,
        })
      } catch {
        // Remote branch may not exist or no remote configured
      }
    }
  }
}
