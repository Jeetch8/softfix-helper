import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET_NAME = process.env.BACKBLAZE_BUCKET_NAME;
const endpointUrl = process.env.BACKBLAZE_ENDPOINT_URL || 'https://s3.us-east-005.backblazeb2.com';

if (!BUCKET_NAME) {
  console.warn('⚠️ BACKBLAZE_BUCKET_NAME not set in environment variables');
}

const s3Client = new S3Client({
  endpoint: endpointUrl,
  region: process.env.BACKBLAZE_REGION || 'us-east-005',
  credentials: {
    accessKeyId: process.env.BACKBLAZE_KEY_ID || '',
    secretAccessKey: process.env.BACKBLAZE_APPLICATION_KEY || '',
  },
});

export async function uploadImageToS3(
  fileBuffer: Buffer,
  fileName: string,
  contentType = 'image/png',
): Promise<string> {
  try {
    if (!BUCKET_NAME) {
      throw new Error('S3 bucket name not configured');
    }

    const folder = contentType.startsWith('audio/') ? 'audio' : 'thumbnails';
    const key = `${folder}/${Date.now()}_${fileName}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    };

    const upload = new Upload({
      client: s3Client,
      params,
    });

    await upload.done();
    const url = `/api/media?key=${encodeURIComponent(key)}`;
    console.log(`✅ Uploaded to Backblaze B2. Media accessible at: ${url}`);
    return url;
  } catch (error) {
    console.error('❌ Error uploading to Backblaze B2:', error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function deleteImageFromS3(s3Url: string): Promise<void> {
  if (!BUCKET_NAME || !s3Url) return;

  let key = '';
  if (s3Url.includes('/api/media?key=')) {
    try {
      const urlObj = new URL(s3Url);
      key = urlObj.searchParams.get('key') || '';
    } catch (e) {
      const paramsStr = s3Url.split('?')[1];
      if (paramsStr) {
        const searchParams = new URLSearchParams(paramsStr);
        key = searchParams.get('key') || '';
      }
    }
  } else {
    const splitToken = `${BUCKET_NAME}/`;
    if (s3Url.includes(splitToken)) {
      key = s3Url.split(splitToken)[1];
    }
  }

  if (!key) return;

  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
  console.log(`✅ Deleted from Backblaze B2: ${s3Url}`);
}

export async function getSignedUrlForS3(key: string): Promise<string> {
  if (!BUCKET_NAME) throw new Error('Bucket name not configured');
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function resolveMediaUrl(url: string | null): Promise<string | null> {
  if (!url || !url.startsWith('/api/media?key=')) return url;
  try {
    const urlObj = new URL(url, 'http://localhost');
    const key = urlObj.searchParams.get('key');
    if (key) {
      return await getSignedUrlForS3(key);
    }
  } catch (e) {
    console.error('Error resolving media URL', e);
  }
  return url;
}

export { s3Client };
export default s3Client;
