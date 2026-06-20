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
 * Converts LINEAR16 raw PCM audio buffer to a valid WAV buffer.
 * If the buffer already contains a RIFF header, it returns the buffer as is.
 */
function convertLinear16ToWav(
  audioBuffer,
  sampleRate = 22050,
  numChannels = 1,
  bitDepth = 16,
) {
  if (audioBuffer.length > 4 && audioBuffer.toString('utf8', 0, 4) === 'RIFF') {
    return audioBuffer;
  }

  const wavHeader = Buffer.alloc(44);
  const dataLength = audioBuffer.length;

  // "RIFF" chunk descriptor
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + dataLength, 4);
  wavHeader.write('WAVE', 8);

  // "fmt " sub-chunk
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20); // PCM
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(sampleRate * numChannels * (bitDepth / 8), 28);
  wavHeader.writeUInt16LE(numChannels * (bitDepth / 8), 32);
  wavHeader.writeUInt16LE(bitDepth, 34);

  // "data" sub-chunk
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(dataLength, 40);

  return Buffer.concat([wavHeader, audioBuffer]);
}

/**
 * Generate WAV from text using Google Cloud Text-to-Speech and upload to S3
 */
export async function generateWAVAudio(script, topicId) {
  const tempDir = path.join(__dirname, '../temp');

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempWavPath = path.join(tempDir, `audio_${Date.now()}.wav`);

  try {
    console.log(
      '🎵 Generating audio using Google Cloud Text-to-Speech (Chirp 3 HD)...',
    );

    const request = {
      input: { text: script },
      voice: {
        languageCode: 'en-US',
        // Explicitly call a specific Chirp 3 HD model name variant
        name: 'en-US-Chirp3-HD-Alnilam',
      },
      audioConfig: {
        sampleRateHertz: 44100,
        speakingRate: 1,
        audioEncoding: 'LINEAR16',
      },
    };

    console.log('Sending synthesis request to Cloud Text-to-Speech...');
    const [response] = await client.synthesizeSpeech(request);

    if (!response.audioContent) {
      throw new Error('Could not extract audio data from TTS response');
    }

    // Convert to WAV buffer
    const rawBuffer = Buffer.from(response.audioContent, 'binary');
    const wavBuffer = convertLinear16ToWav(rawBuffer, 22050, 1, 16);

    // Save the binary data stream into a local WAV file
    console.log('💾 Saving temporary WAV file...');
    fs.writeFileSync(tempWavPath, wavBuffer);

    // Read WAV file and upload to S3
    console.log('☁️  Uploading WAV to S3...');
    const fileBufferToUpload = fs.readFileSync(tempWavPath);

    const s3Url = await uploadImageToS3(
      fileBufferToUpload,
      `audio_${topicId}_${Date.now()}.wav`,
      'audio/wav',
    );

    console.log('✅ Audio file generated and uploaded successfully');

    return s3Url;
  } catch (error) {
    console.error('❌ Error generating audio:', error.message);
    throw new Error(`Failed to generate audio: ${error.message}`);
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempWavPath)) {
      fs.unlinkSync(tempWavPath);
    }
  }
}
