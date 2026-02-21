// Parsed terminal event types
export interface ParsedEvent {
  type: 'file-changed' | 'session-id' | 'token-cost'
  data: Record<string, string | number>
}

// Terminal IPC API exposed via preload script
export interface TerminalAPI {
  onData: (callback: (data: string) => void) => () => void
  onParsed: (callback: (event: ParsedEvent) => void) => () => void
  sendInput: (data: string) => void
  resize: (cols: number, rows: number) => void
}

// Global window type augmentation
export interface ElectronAPI {
  terminal: TerminalAPI
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
