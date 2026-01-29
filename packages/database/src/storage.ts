import { S3Client } from '@aws-sdk/client-s3'

if (
  !process.env.R2_ACCOUNT_ID ||
  !process.env.R2_ACCESS_KEY_ID ||
  !process.env.R2_SECRET_ACCESS_KEY
) {
  throw new Error('R2 environment variables are not set')
}

// Cloudflare R2 endpoint format
const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

export const s3Client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '10xstudent-resources'

// Placeholder functions for future implementation
export async function getSignedUploadUrl(key: string, contentType: string): Promise<string> {
  // TODO: Implement using @aws-sdk/s3-request-presigner
  throw new Error('Not implemented')
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  // TODO: Implement using @aws-sdk/s3-request-presigner
  throw new Error('Not implemented')
}
