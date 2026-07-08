import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { uploadImageToS3 } from './s3Service.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let ai;
const useVertexAI = process.env.USE_VERTEX_AI !== 'false';

if (useVertexAI) {
  ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'softfix-498215',
    location: process.env.GCP_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || process.env.VERTEXAI_LOCATION || 'global'
  });
  console.log(`🎯 Vertex AI Service Initialized for Audio Service`);
} else if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log(`🎯 Google AI Studio (Gemini API) Initialized for Audio Service using GEMINI_API_KEY`);
} else {
  ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'softfix-498215',
    location: "global"
  });
  console.log(`🎯 Vertex AI Service Initialized as Fallback for Audio Service`);
}

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
      '🎵 Generating audio using Gemini TTS via Vertex AI...',
    );

    const result = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: script,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Alnilam' },
          },
        },
      },
    });

    const audioData =
      result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      throw new Error('Could not extract audio data from Gemini response');
    }

    // Convert to WAV buffer
    const rawBuffer = Buffer.from(audioData, 'base64');
    const wavBuffer = convertLinear16ToWav(rawBuffer, 24000, 1, 16);

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
