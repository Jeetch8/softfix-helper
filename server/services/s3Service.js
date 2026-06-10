import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

if (!BUCKET_NAME) {
  console.warn('⚠️ AWS_S3_BUCKET_NAME not set in environment variables');
}

let endpointUrl =
  process.env.AWS_ENDPOINT_URL || 'https://sf03.digitaloceanspaces.com';

// Fix for DigitalOcean Spaces where the bucket name might be accidentally included in the endpoint URL
if (BUCKET_NAME && endpointUrl.includes(`${BUCKET_NAME}.`)) {
  endpointUrl = endpointUrl.replace(`${BUCKET_NAME}.`, '');
}

// Configure AWS
const s3Client = new S3Client({
  endpoint: endpointUrl,
  region: process.env.AWS_REGION || 'sf03', // Fallback region to prevent AWS SDK errors
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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

    const params = {
      Bucket: BUCKET_NAME,
      Key: `${folder}/${Date.now()}_${fileName}`,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: 'public-read',
    };

    const upload = new Upload({
      client: s3Client,
      params,
    });

    const result = await upload.done();
    console.log(`✅ Uploaded to S3: ${result.Location}`);
    return result.Location;
  } catch (error) {
    console.log(error);
    console.error('❌ Error uploading to S3:', error.message);
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

    // Extract key from URL
    const key = s3Url.split(`${BUCKET_NAME}/`)[1];
    if (!key) return;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`✅ Deleted from S3: ${s3Url}`);
  } catch (error) {
    console.error('⚠️ Error deleting from S3:', error.message);
  }
}

export default s3Client;
