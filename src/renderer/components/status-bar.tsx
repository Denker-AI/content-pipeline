export function StatusBar() {
  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-500">
      <span>Session: —</span>
      <div className="flex gap-4">
        <span>Cost: $0.00</span>
        <span>0 tokens</span>
      </div>
    </div>
  )
}
