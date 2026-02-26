import { useCallback, useEffect, useState } from 'react'

import type {
  ResendAudience,
  ResendSendResult,
  ResendTestResult
} from '@/shared/types'

import { PublishDialog } from './publish-dialog'

interface ResendSenderProps {
  isOpen: boolean
  onClose: () => void
  contentDir: string
}

export function ResendSender({
  isOpen,
  onClose,
  contentDir
}: ResendSenderProps) {
  const [audiences, setAudiences] = useState<ResendAudience[]>([])
  const [selectedAudienceId, setSelectedAudienceId] = useState('')
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [loadingAudiences, setLoadingAudiences] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResendSendResult | null>(null)
  const [testResult, setTestResult] = useState<ResendTestResult | null>(null)

  // Load audiences when dialog opens
  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setResult(null)
    setTestResult(null)
    setLoadingAudiences(true)

    const load = async () => {
      try {
        const list = await window.electronAPI?.publish.resendListAudiences()
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

  const handleSendTest = useCallback(async () => {
    if (!testEmail || !subject) return

    setTestLoading(true)
    setError(null)
    setTestResult(null)

    try {
      const sendResult = await window.electronAPI?.publish.resendSendTest({
        contentDir,
        to: testEmail,
        subject,
        previewText
      })
      if (sendResult) {
        setTestResult(sendResult)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send test email'
      setError(message)
    } finally {
      setTestLoading(false)
    }
  }, [contentDir, testEmail, subject, previewText])

  const handleSend = useCallback(async () => {
    if (!selectedAudienceId || !subject) return

    setLoading(true)
    setError(null)

    try {
      const sendResult = await window.electronAPI?.publish.resendSend({
        contentDir,
        audienceId: selectedAudienceId,
        subject,
        previewText
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
  const canSendTest = testEmail.trim().length > 0 && subject.trim().length > 0

  return (
    <PublishDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleSend}
      title="Send Newsletter"
      confirmLabel={result ? 'Done' : 'Send to Audience'}
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
          {/* Subject */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
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
              onChange={e => setPreviewText(e.target.value)}
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

          {/* Divider — Send Test Section */}
          <div className="border-t border-zinc-700 pt-4">
            <label className="mb-2 block text-xs font-medium text-zinc-300">
              Send Test Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={e => {
                  setTestEmail(e.target.value)
                  setTestResult(null)
                }}
                placeholder="your@email.com"
                className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSendTest}
                disabled={!canSendTest || testLoading}
                className="rounded bg-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {testLoading ? 'Sending...' : 'Send Test'}
              </button>
            </div>
            {testResult && (
              <div className="mt-2 rounded bg-green-900/30 p-2 text-xs text-green-300">
                Test sent! Check your inbox. Subject will be prefixed with
                [TEST].
              </div>
            )}
          </div>

          {/* Divider — Broadcast Section */}
          <div className="border-t border-zinc-700 pt-4">
            <label className="mb-2 block text-xs font-medium text-zinc-300">
              Send to Audience
            </label>
            {/* Audience selector */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Audience
              </label>
              {audiences.length > 0 ? (
                <select
                  value={selectedAudienceId}
                  onChange={e => setSelectedAudienceId(e.target.value)}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
                >
                  {audiences.map(a => (
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
