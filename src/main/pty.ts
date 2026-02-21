import type { IPty } from 'node-pty'
import pty from 'node-pty'
import os from 'os'

let ptyProcess: IPty | null = null

export function createPty(onData: (data: string) => void): IPty {
  const shell = process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh')

  ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME || os.homedir(),
    env: process.env as Record<string, string>
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
