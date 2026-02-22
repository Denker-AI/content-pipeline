import fs from 'fs/promises'
import path from 'path'

import type { ResendAudience, ResendSendResult } from '@/shared/types'

const API_BASE = 'https://api.resend.com'

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

export async function listAudiences(
  apiKey: string,
): Promise<ResendAudience[]> {
  if (!apiKey) {
    throw new Error('Resend API key not configured. Set it in Settings.')
  }

  const res = await fetch(`${API_BASE}/audiences`, {
    headers: authHeaders(apiKey),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to list audiences (${res.status}): ${text}`)
  }

  const data = (await res.json()) as {
    data: Array<{ id: string; name: string }>
  }
  return data.data.map((a) => ({ id: a.id, name: a.name }))
}

async function findEmailHtml(contentDir: string): Promise<string> {
  const htmlPath = path.join(contentDir, 'email.html')
  try {
    const html = await fs.readFile(htmlPath, 'utf-8')
    return html.trim()
  } catch {
    throw new Error(`No email.html found in ${contentDir}`)
  }
}

async function createBroadcast(
  apiKey: string,
  audienceId: string,
  subject: string,
  previewText: string,
  html: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/broadcasts`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      audience_id: audienceId,
      from: 'onboarding@resend.dev',
      subject,
      preview_text: previewText,
      html,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create broadcast (${res.status}): ${text}`)
  }
  const data = (await res.json()) as { id: string }
  return data.id
}

async function sendBroadcast(
  apiKey: string,
  broadcastId: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/broadcasts/${broadcastId}/send`, {
    method: 'POST',
    headers: authHeaders(apiKey),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to send broadcast (${res.status}): ${text}`)
  }
}

export async function sendNewsletter(
  contentDir: string,
  apiKey: string,
  audienceId: string,
  subject: string,
  previewText: string,
): Promise<ResendSendResult> {
  if (!apiKey) {
    throw new Error('Resend API key not configured. Set it in Settings.')
  }

  const html = await findEmailHtml(contentDir)
  if (!html) {
    throw new Error('email.html is empty')
  }

  // Create the broadcast
  const broadcastId = await createBroadcast(
    apiKey,
    audienceId,
    subject,
    previewText,
    html,
  )

  // Send it
  await sendBroadcast(apiKey, broadcastId)

  // Write newsletter.json with publish info
  const newsletterJsonPath = path.join(contentDir, 'newsletter.json')
  const newsletterJson = {
    broadcast_id: broadcastId,
    status: 'sent',
    sent_at: new Date().toISOString(),
    audience_id: audienceId,
    subject,
  }
  await fs.writeFile(
    newsletterJsonPath,
    JSON.stringify(newsletterJson, null, 2),
    'utf-8',
  )

  return { broadcastId }
}
