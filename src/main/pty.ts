import type { IPty } from 'node-pty'
import pty from 'node-pty'
import os from 'os'

let ptyProcess: IPty | null = null

export function createPty(onData: (data: string) => void): IPty {
  const shell =
    process.env.SHELL ||
    (process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh')
  const home = process.env.HOME || os.homedir()

  // Clean env for the PTY shell
  const env = { ...process.env } as Record<string, string>
  if (!env.PATH) {
    env.PATH = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
  }
  // Remove Claude Code session markers so `claude` can launch inside the terminal
  delete env.CLAUDECODE
  delete env.CLAUDE_CODE_SESSION

  ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: home,
    env
  })

  ptyProcess.onData(onData)

  return ptyProcess
}

export function writePty(data: string) {
  ptyProcess?.write(data)
}

export function resizePty(cols: number, rows: number) {
  ptyProcess?.resize(cols, rows)
}

export function destroyPty() {
  ptyProcess?.kill()
  ptyProcess = null
}
