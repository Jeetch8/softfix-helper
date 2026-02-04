import AWS from 'aws-sdk';

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint:
    process.env.AWS_ENDPOINT_URL || 'https://sfo3.digitaloceanspaces.com',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

if (!BUCKET_NAME) {
  console.warn('⚠️ AWS_S3_BUCKET_NAME not set in environment variables');
}

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

    const result = await s3.upload(params).promise();
    console.log(`✅ Uploaded to S3: ${result.Location}`);
    return result.Location;
  } catch (error) {
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

    await s3.deleteObject(params).promise();
    console.log(`✅ Deleted from S3: ${s3Url}`);
  } catch (error) {
    console.error('⚠️ Error deleting from S3:', error.message);
  }
}

export default s3;
