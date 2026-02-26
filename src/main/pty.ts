import type { IPty } from 'node-pty'
import pty from 'node-pty'

const ptyProcesses = new Map<string, IPty>()

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

  const shell =
    process.env.SHELL ||
    (process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh')

  const proc = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd,
    env: makeEnv()
  })

  proc.onData(onData)
  ptyProcesses.set(tabId, proc)
  return proc
}

export function writePtyForTab(tabId: string, data: string) {
  ptyProcesses.get(tabId)?.write(data)
}

export function resizePtyForTab(tabId: string, cols: number, rows: number) {
  ptyProcesses.get(tabId)?.resize(cols, rows)
}

export function destroyPtyForTab(tabId: string) {
  const proc = ptyProcesses.get(tabId)
  if (proc) {
    proc.kill()
    ptyProcesses.delete(tabId)
  }
}

export function destroyAllPtys() {
  for (const proc of ptyProcesses.values()) {
    proc.kill()
  }
  ptyProcesses.clear()
}
