import { PreviewPane } from './components/preview-pane'
import { SplitPane } from './components/split-pane'
import { StatusBar } from './components/status-bar'
import { TerminalPane } from './components/terminal-pane'

export function App() {
  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <div className="flex-1 overflow-hidden">
        <SplitPane
          left={<TerminalPane />}
          right={<PreviewPane />}
        />
      </div>
      <StatusBar />
    </div>
  )
}
