import express from 'express';
import { getSignedUrlForS3 } from '../services/s3Service.js';

const router = express.Router();

/**
 * GET /api/media
 * Redirects to a pre-signed S3 URL for a private bucket
 */
router.get('/media', async (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Key is required',
      });
    }

    const signedUrl = await getSignedUrlForS3(key);
    
    // Redirect to the signed URL
    res.redirect(signedUrl);
  } catch (error) {
    console.error('❌ Error generating signed URL:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error accessing media',
      error: error.message,
    });
  }
});

export default router;
