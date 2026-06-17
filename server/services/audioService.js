import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import { uploadImageToS3 } from './s3Service.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Instantiate the Google Cloud Text-to-Speech Client
const client = new textToSpeech.TextToSpeechClient();

/**
 * Generate MP3 from text using Google Cloud Text-to-Speech and upload to S3
 */
export async function generateMP3Audio(script, topicId) {
  const tempDir = path.join(__dirname, '../temp');

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempMp3Path = path.join(tempDir, `audio_${Date.now()}.mp3`);

  try {
    console.log('🎵 Generating audio using Google Cloud Text-to-Speech (Chirp 3 HD)...');

    const request = {
      input: { text: script },
      voice: {
        languageCode: 'en-US',
        // Explicitly call a specific Chirp 3 HD model name variant
        name: 'en-US-Chirp3-HD-Alnilam', 
      },
      audioConfig: {
        audioEncoding: 'MP3',
      },
    };

    console.log('Sending synthesis request to Cloud Text-to-Speech...');
    const [response] = await client.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error('Could not extract audio data from TTS response');
    }

    // Save the binary data stream into a local MP3 file
    console.log('💾 Saving temporary MP3 file...');
    fs.writeFileSync(tempMp3Path, response.audioContent, 'binary');

    // Read MP3 file and upload to S3
    console.log('☁️  Uploading MP3 to S3...');
    const mp3Buffer = fs.readFileSync(tempMp3Path);

    const s3Url = await uploadImageToS3(
      mp3Buffer,
      `audio_${topicId}_${Date.now()}.mp3`,
      'audio/mpeg',
    );

    console.log('✅ Audio file generated and uploaded successfully');

    return s3Url;
  } catch (error) {
    console.error('❌ Error generating audio:', error.message);
    throw new Error(`Failed to generate audio: ${error.message}`);
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempMp3Path)) {
      fs.unlinkSync(tempMp3Path);
    }
  }
}
