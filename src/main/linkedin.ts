import fs from 'fs/promises'
import path from 'path'

import type { LinkedInPublishResult } from '@/shared/types'

const API_BASE = 'https://api.linkedin.com'
const API_VERSION = '202401'

interface LinkedInProfile {
  sub: string // person URN ID
}

interface RegisterUploadResponse {
  value: {
    uploadMechanism: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
        uploadUrl: string
      }
    }
    image: string // image URN
  }
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': API_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
  }
}

async function getPersonUrn(token: string): Promise<string> {
  const res = await fetch(`${API_BASE}/v2/userinfo`, {
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LinkedIn auth failed (${res.status}): ${text}`)
  }
  const data = (await res.json()) as LinkedInProfile
  return `urn:li:person:${data.sub}`
}

async function registerImageUpload(
  token: string,
  personUrn: string,
): Promise<{ uploadUrl: string; imageUrn: string }> {
  const res = await fetch(
    `${API_BASE}/rest/images?action=initializeUpload`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: personUrn,
        },
      }),
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Image upload registration failed (${res.status}): ${text}`)
  }
  const data = (await res.json()) as RegisterUploadResponse
  return {
    uploadUrl:
      data.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ].uploadUrl,
    imageUrn: data.value.image,
  }
}

async function uploadImageBinary(
  uploadUrl: string,
  imagePath: string,
  token: string,
): Promise<void> {
  const imageBuffer = await fs.readFile(imagePath)
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/octet-stream',
    },
    body: imageBuffer,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Image upload failed (${res.status}): ${text}`)
  }
}

async function createTextPost(
  token: string,
  personUrn: string,
  text: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/rest/posts`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      author: personUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Post creation failed (${res.status}): ${text}`)
  }
  // Post ID is in the x-restli-id header
  const postId = res.headers.get('x-restli-id') ?? ''
  return postId
}

async function createImagePost(
  token: string,
  personUrn: string,
  text: string,
  imageUrns: string[],
): Promise<string> {
  const content: Record<string, unknown> = imageUrns.length === 1
    ? {
        media: {
          id: imageUrns[0],
        },
      }
    : {
        multiImage: {
          images: imageUrns.map((urn) => ({ id: urn })),
        },
      }

  const res = await fetch(`${API_BASE}/rest/posts`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      author: personUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      content,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Post creation failed (${res.status}): ${body}`)
  }
  const postId = res.headers.get('x-restli-id') ?? ''
  return postId
}

async function findPostText(contentDir: string): Promise<string> {
  const postTextPath = path.join(contentDir, 'post-text.md')
  try {
    const text = await fs.readFile(postTextPath, 'utf-8')
    return text.trim()
  } catch {
    throw new Error(`No post-text.md found in ${contentDir}`)
  }
}

async function findCarouselImages(contentDir: string): Promise<string[]> {
  const carouselDir = path.join(contentDir, 'carousel-images')
  try {
    const entries = await fs.readdir(carouselDir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && /\.(png|jpg|jpeg|gif|webp)$/i.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => path.join(carouselDir, e.name))
  } catch {
    return []
  }
}

function postIdToUrl(postId: string): string {
  // Extract the activity ID from the URN for the URL
  // Format: urn:li:share:12345 or urn:li:ugcPost:12345
  const match = postId.match(/:(\d+)$/)
  if (match) {
    return `https://www.linkedin.com/feed/update/urn:li:activity:${match[1]}/`
  }
  return `https://www.linkedin.com/feed/`
}

export async function publishToLinkedIn(
  contentDir: string,
  token: string,
): Promise<LinkedInPublishResult> {
  if (!token) {
    throw new Error('LinkedIn token not configured. Set it in Settings.')
  }

  // Get user profile
  const personUrn = await getPersonUrn(token)

  // Read post content
  const postText = await findPostText(contentDir)
  if (!postText) {
    throw new Error('Post text is empty')
  }

  // Find images
  const imagePaths = await findCarouselImages(contentDir)

  let postId: string

  if (imagePaths.length === 0) {
    // Text-only post
    postId = await createTextPost(token, personUrn, postText)
  } else {
    // Upload all images
    const imageUrns: string[] = []
    for (const imgPath of imagePaths) {
      const { uploadUrl, imageUrn } = await registerImageUpload(token, personUrn)
      await uploadImageBinary(uploadUrl, imgPath, token)
      imageUrns.push(imageUrn)
    }
    // Create post with images
    postId = await createImagePost(token, personUrn, postText, imageUrns)
  }

  const postUrl = postIdToUrl(postId)

  // Write post.json with publish info
  const postJsonPath = path.join(contentDir, 'post.json')
  const postJson = {
    linkedin_post_id: postId,
    status: 'published',
    published_at: new Date().toISOString(),
    url: postUrl,
  }
  await fs.writeFile(postJsonPath, JSON.stringify(postJson, null, 2), 'utf-8')

  return { postId, postUrl }
}
