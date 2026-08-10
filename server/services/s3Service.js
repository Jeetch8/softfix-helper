import fs from 'fs';
import path from 'path';
import { fileURLToPath, URL } from 'url';
import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables required for Backblaze B2 S3 API
// BACKBLAZE_BUCKET_NAME (e.g., 'your-bucket-name', not the Bucket ID)
// BACKBLAZE_ENDPOINT_URL (e.g., 'https://s3.us-east-005.backblazeb2.com')
// BACKBLAZE_REGION (e.g., 'us-east-005')
// BACKBLAZE_KEY_ID (mapped to AWS_ACCESS_KEY_ID)
// BACKBLAZE_APPLICATION_KEY (mapped to AWS_SECRET_ACCESS_KEY)

const BUCKET_NAME = process.env.BACKBLAZE_BUCKET_NAME;

if (!BUCKET_NAME) {
  console.warn('⚠️ BACKBLAZE_BUCKET_NAME not set in environment variables');
}

const endpointUrl = process.env.BACKBLAZE_ENDPOINT_URL || 'https://s3.us-east-005.backblazeb2.com';

// Configure AWS SDK S3 Client for Backblaze B2
const s3Client = new S3Client({
  endpoint: endpointUrl,
  region: process.env.BACKBLAZE_REGION || 'us-east-005',
  credentials: {
    accessKeyId: process.env.BACKBLAZE_KEY_ID,
    secretAccessKey: process.env.BACKBLAZE_APPLICATION_KEY,
  },
});

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer (image or audio)
 * @param {string} fileName - File name for S3
 * @param {string} contentType - MIME type (default: image/png)
 * @returns {Promise<string>} - S3 URL of uploaded file
 */
export async function uploadImageToS3(
  fileBuffer,
  fileName,
  contentType = 'image/png',
) {
  try {
    if (!BUCKET_NAME) {
      throw new Error('S3 bucket name not configured');
    }

    // Determine folder based on content type
    const folder = contentType.startsWith('audio/') ? 'audio' : 'thumbnails';
    const key = `${folder}/${Date.now()}_${fileName}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      // Note: ACL 'public-read' is not used here since the bucket is Private.
    };

    const upload = new Upload({
      client: s3Client,
      params,
    });

    const result = await upload.done();
    
    // Create a local API URL that will redirect to a pre-signed S3 URL when accessed
    // We use a relative path so it seamlessly works with ngrok and Vite proxies
    const url = `/api/media?key=${encodeURIComponent(key)}`;
    
    console.log(`✅ Uploaded to Backblaze B2. Media accessible at: ${url}`);
    return url;
  } catch (error) {
    console.log(error);
    console.error('❌ Error uploading to Backblaze B2:', error.message);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
}

/**
 * Delete image from S3
 * @param {string} s3Url - S3 URL of the image
 */
export async function deleteImageFromS3(s3Url) {
  try {
    if (!BUCKET_NAME || !s3Url) return;

    let key = '';
    // Handle our custom media URL format
    if (s3Url.includes('/api/media?key=')) {
      try {
        const urlObj = new URL(s3Url);
        key = urlObj.searchParams.get('key');
      } catch (e) {
        // Fallback for relative paths or malformed URLs
        const paramsStr = s3Url.split('?')[1];
        if (paramsStr) {
          const searchParams = new URLSearchParams(paramsStr);
          key = searchParams.get('key');
        }
      }
    } else {
      // Fallback for direct S3 URLs
      const splitToken = `${BUCKET_NAME}/`;
      if (s3Url.includes(splitToken)) {
        key = s3Url.split(splitToken)[1];
      }
    }

    if (!key) return;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`✅ Deleted from Backblaze B2: ${s3Url}`);
  } catch (error) {
    console.error('⚠️ Error deleting from Backblaze B2:', error.message);
  }
}

/**
 * Generate a pre-signed URL for viewing a private S3 object
 * @param {string} key - S3 object key
 * @returns {Promise<string>} - Pre-signed S3 URL
 */
export async function getSignedUrlForS3(key) {
  if (!BUCKET_NAME) throw new Error('Bucket name not configured');
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  // Set expiration to 1 hour (3600 seconds)
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

/**
 * Resolves a local media URL to a signed S3 URL if necessary
 * @param {string} url - URL to resolve
 * @returns {Promise<string>} - Resolved URL
 */
export async function resolveMediaUrl(url) {
  if (url && url.startsWith('/api/media?key=')) {
    try {
      const urlObj = new URL(url, 'http://localhost');
      const key = urlObj.searchParams.get('key');
      if (key) {
        return await getSignedUrlForS3(key);
      }
    } catch (e) {
      console.error('Error resolving media URL', e);
    }
  }
  return url;
}

export default s3Client;
