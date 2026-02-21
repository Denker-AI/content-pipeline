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
 * Create a new git worktree with a dedicated branch.
 */
export async function createWorktree(
  projectRoot: string,
  branch: string,
  worktreePath: string,
): Promise<WorktreeInfo> {
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
 * Remove a git worktree.
 */
export async function removeWorktree(
  projectRoot: string,
  worktreePath: string,
): Promise<void> {
  await execFileAsync('git', ['worktree', 'remove', worktreePath], {
    cwd: projectRoot,
  })
}
