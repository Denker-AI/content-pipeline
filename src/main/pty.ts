import fs from 'fs'

import type { IPty } from 'node-pty'
import pty from 'node-pty'

const ptyProcesses = new Map<string, IPty>()

// Buffer PTY output until the renderer signals it's ready to receive data.
// Without this, shell init output (prompt, motd) is lost because the xterm
// listener attaches ~2 animation frames after the PTY spawns.
const dataBuffers = new Map<string, string[]>()
const dataCallbacks = new Map<string, (data: string) => void>()

function makeEnv(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>
  if (!env.PATH) {
    env.PATH = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
  }
  // Remove Claude Code session markers so `claude` can launch inside the terminal
  delete env.CLAUDECODE
  delete env.CLAUDE_CODE_SESSION
  return env
}

export function createPtyForTab(
  tabId: string,
  cwd: string,
  onData: (data: string) => void
): IPty {
  // Kill existing PTY for this tab if any
  destroyPtyForTab(tabId)

  // Start buffering until renderer is ready
  dataBuffers.set(tabId, [])
  dataCallbacks.set(tabId, onData)

  // Validate cwd — fallback to HOME if path doesn't exist (stale worktree)
  let safeCwd = cwd
  try {
    fs.accessSync(safeCwd)
  } catch {
    safeCwd = process.env.HOME || '/'
  }

  const shell =
    process.env.SHELL ||
    (process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh')

  const proc = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: safeCwd,
    env: makeEnv()
  })

  proc.onData((data: string) => {
    const buf = dataBuffers.get(tabId)
    if (buf) {
      // Renderer not ready yet — buffer the data
      buf.push(data)
    } else {
      // Renderer is attached — send directly
      const cb = dataCallbacks.get(tabId)
      cb?.(data)
    }
  })

  ptyProcesses.set(tabId, proc)
  return proc
}

/**
 * Called by the renderer once xterm is mounted and the data listener is attached.
 * Flushes any buffered PTY output and switches to direct forwarding.
 */
export function flushPtyBuffer(tabId: string) {
  const buf = dataBuffers.get(tabId)
  const cb = dataCallbacks.get(tabId)
  if (buf && cb) {
    for (const chunk of buf) {
      cb(chunk)
    }
  }
  // Remove buffer — future data goes directly via callback
  dataBuffers.delete(tabId)
}

export function writePtyForTab(tabId: string, data: string) {
  ptyProcesses.get(tabId)?.write(data)
}

export function resizePtyForTab(tabId: string, cols: number, rows: number) {
  try {
    ptyProcesses.get(tabId)?.resize(cols, rows)
  } catch {
    // PTY file descriptor already closed — ignore EBADF
  }
}

export function destroyPtyForTab(tabId: string) {
  const proc = ptyProcesses.get(tabId)
  if (proc) {
    proc.kill()
    ptyProcesses.delete(tabId)
  }
  dataBuffers.delete(tabId)
  dataCallbacks.delete(tabId)
}

export function destroyAllPtys() {
  for (const proc of ptyProcesses.values()) {
    proc.kill()
  }
  ptyProcesses.clear()
  dataBuffers.clear()
  dataCallbacks.clear()
}
