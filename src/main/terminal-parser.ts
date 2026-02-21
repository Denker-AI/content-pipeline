// Strip ANSI escape sequences for pattern matching
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g

function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '')
}

export interface ParsedEvent {
  type: 'file-changed' | 'session-id' | 'token-cost' | 'component-found'
  data: Record<string, string | number>
}

type EventCallback = (event: ParsedEvent) => void

export class TerminalParser {
  private buffer = ''
  private listeners: EventCallback[] = []

  onEvent(callback: EventCallback): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  feed(data: string) {
    this.buffer += data

    // Process complete lines
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''

    for (const line of lines) {
      this.parseLine(stripAnsi(line))
    }
  }

  private parseLine(line: string) {
    this.parseFileChange(line)
    this.parseSessionId(line)
    this.parseTokenCost(line)
    this.parseComponentPath(line)
  }

  private parseFileChange(line: string) {
    // Match Claude Code Write/Edit tool output with file paths
    const writeMatch = line.match(
      /(?:Write|Edit|Created|Updated|Wrote)\s+(?:file\s+)?[`"]?([^\s`"]+\.\w+)[`"]?/i
    )
    if (writeMatch) {
      this.emit({
        type: 'file-changed',
        data: { path: writeMatch[1] },
      })
      return
    }

    // Match file paths in content/ directory
    const contentMatch = line.match(/(?:content\/[^\s]+\.\w+)/i)
    if (contentMatch) {
      this.emit({
        type: 'file-changed',
        data: { path: contentMatch[0] },
      })
    }
  }

  private parseSessionId(line: string) {
    const match = line.match(/Session:\s*([a-zA-Z0-9_-]+)/)
    if (match) {
      this.emit({
        type: 'session-id',
        data: { sessionId: match[1] },
      })
    }
  }

  private parseTokenCost(line: string) {
    // Match token counts like "1,234 tokens" or "1234 tokens"
    const tokenMatch = line.match(/([\d,]+)\s*tokens?/i)
    // Match cost like "$0.05" or "$1.23"
    const costMatch = line.match(/\$(\d+\.?\d*)/i)

    if (tokenMatch || costMatch) {
      const event: ParsedEvent = {
        type: 'token-cost',
        data: {},
      }
      if (tokenMatch) {
        event.data.tokens = parseInt(tokenMatch[1].replace(/,/g, ''), 10)
      }
      if (costMatch) {
        event.data.cost = parseFloat(costMatch[1])
      }
      this.emit(event)
    }
  }

  private parseComponentPath(line: string) {
    // Match file paths ending in .tsx or .jsx (e.g. src/components/Button.tsx)
    const match = line.match(
      /(?:^|\s|['"`])([./\w-]+\/[\w-]+\.(?:tsx|jsx))\b/,
    )
    if (!match) return

    const filePath = match[1]
    // Extract filename without extension
    const filename = filePath.split('/').pop()?.replace(/\.(tsx|jsx)$/, '')
    if (!filename) return

    // Convert filename to PascalCase component name
    // Handle kebab-case (my-component), snake_case (my_component), or already PascalCase
    const name = filename
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')

    this.emit({
      type: 'component-found',
      data: { path: filePath, name },
    })
  }

  private emit(event: ParsedEvent) {
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}
