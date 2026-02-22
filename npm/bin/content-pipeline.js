#!/usr/bin/env node

'use strict'

const { execFile, exec } = require('child_process')
const { existsSync } = require('fs')
const { platform } = require('os')
const { join } = require('path')

const REPO = 'https://github.com/denkerapp/content-pipeline'

const paths = {
  darwin: '/Applications/Content Pipeline.app',
  linux: [
    '/usr/bin/content-pipeline',
    '/usr/local/bin/content-pipeline',
    join(require('os').homedir(), 'Applications', 'Content-Pipeline.AppImage'),
    join(require('os').homedir(), '.local', 'bin', 'Content-Pipeline.AppImage'),
  ],
  win32: [
    join(process.env.LOCALAPPDATA || '', 'Programs', 'content-pipeline', 'Content Pipeline.exe'),
    join(process.env.PROGRAMFILES || '', 'content-pipeline', 'Content Pipeline.exe'),
  ],
}

function launch() {
  const os = platform()

  if (os === 'darwin') {
    const app = paths.darwin
    if (existsSync(app)) {
      exec(`open -a "${app}"`, handleExit)
    } else {
      notInstalled('macOS')
    }
    return
  }

  if (os === 'linux') {
    const app = paths.linux.find(existsSync)
    if (app) {
      execFile(app, { detached: true, stdio: 'ignore' }).unref()
      process.exit(0)
    } else {
      notInstalled('Linux')
    }
    return
  }

  if (os === 'win32') {
    const app = paths.win32.find(existsSync)
    if (app) {
      execFile(app, { detached: true, stdio: 'ignore' }).unref()
      process.exit(0)
    } else {
      notInstalled('Windows')
    }
    return
  }

  console.error(`Unsupported platform: ${os}`)
  console.error(`Download manually: ${REPO}/releases`)
  process.exit(1)
}

function notInstalled(os) {
  console.error(`Content Pipeline is not installed on ${os}.`)
  console.error(`Download the latest release: ${REPO}/releases`)
  if (os === 'macOS') {
    console.error(`Or install via Homebrew: brew install --cask content-pipeline`)
  }
  process.exit(1)
}

function handleExit(err) {
  if (err) {
    console.error(`Failed to launch Content Pipeline: ${err.message}`)
    process.exit(1)
  }
  process.exit(0)
}

launch()
