import { useCallback, useEffect, useState } from 'react'

import type { ResendAudience, ResendSendResult } from '@/shared/types'

import { PublishDialog } from './publish-dialog'

interface ResendSenderProps {
  isOpen: boolean
  onClose: () => void
  contentDir: string
}

export function ResendSender({
  isOpen,
  onClose,
  contentDir,
}: ResendSenderProps) {
  const [audiences, setAudiences] = useState<ResendAudience[]>([])
  const [selectedAudienceId, setSelectedAudienceId] = useState('')
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingAudiences, setLoadingAudiences] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResendSendResult | null>(null)

  // Load audiences when dialog opens
  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setResult(null)
    setLoadingAudiences(true)

    const load = async () => {
      try {
        const list =
          await window.electronAPI?.publish.resendListAudiences()
        if (list) {
          setAudiences(list)
          if (list.length > 0 && !selectedAudienceId) {
            setSelectedAudienceId(list[0].id)
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load audiences'
        setError(message)
      } finally {
        setLoadingAudiences(false)
      }
    }

    load()
  }, [isOpen, selectedAudienceId])

  const handleSend = useCallback(async () => {
    if (!selectedAudienceId || !subject) return

    setLoading(true)
    setError(null)

    try {
      const sendResult = await window.electronAPI?.publish.resendSend({
        contentDir,
        audienceId: selectedAudienceId,
        subject,
        previewText,
      })
      if (sendResult) {
        setResult(sendResult)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send newsletter'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [contentDir, selectedAudienceId, subject, previewText])

  const canSend = selectedAudienceId && subject.trim().length > 0

  return (
    <PublishDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleSend}
      title="Send Newsletter"
      confirmLabel={result ? 'Done' : 'Send'}
      confirmDisabled={!canSend || !!result}
      loading={loading}
    >
      {loadingAudiences ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-zinc-500">Loading audiences...</p>
        </div>
      ) : result ? (
        <div className="space-y-3">
          <div className="rounded bg-green-900/30 p-3 text-sm text-green-300">
            Newsletter sent successfully!
          </div>
          <div className="text-xs text-zinc-400">
            <span className="text-zinc-500">Broadcast ID:</span>{' '}
            <span className="font-mono">{result.broadcastId}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Audience selector */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Audience
            </label>
            {audiences.length > 0 ? (
              <select
                value={selectedAudienceId}
                onChange={(e) => setSelectedAudienceId(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
              >
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-500">
                No audiences found. Create one in Resend dashboard.
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Newsletter subject line"
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500"
            />
          </div>

          {/* Preview text */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Preview Text
            </label>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Text shown in inbox before opening (optional)"
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500"
            />
          </div>

          {/* Content info */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Content
            </label>
            <div className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300">
              Sending email.html from content directory
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded bg-red-900/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Warning */}
          {canSend && (
            <div className="rounded bg-yellow-900/30 p-2 text-xs text-yellow-300">
              This will send the newsletter to all contacts in the selected
              audience. This action cannot be undone.
            </div>
          )}
        </div>
      )}
    </PublishDialog>
  )
}
