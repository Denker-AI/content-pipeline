import { useState } from 'react'

const tabs = ['Content', 'Components', 'Library'] as const
type Tab = (typeof tabs)[number]

const tabContent: Record<Tab, string> = {
  Content: 'Content preview',
  Components: 'Component browser',
  Library: 'Content library',
}

export function PreviewPane() {
  const [activeTab, setActiveTab] = useState<Tab>('Content')

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      <div className="flex shrink-0 border-b border-zinc-700">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex flex-1 items-center justify-center text-zinc-500">
        <p className="text-sm">{tabContent[activeTab]}</p>
      </div>
    </div>
  )
}
