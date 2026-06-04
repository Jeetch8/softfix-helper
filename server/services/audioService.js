import { VertexAI } from '@google-cloud/vertexai';
import wav from 'wav';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { uploadImageToS3 } from './s3Service.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vertexAI = new VertexAI({
  project: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'softfix-helper',
  location: process.env.GCP_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
});

/**
 * Save audio buffer to WAV file
 */
async function saveWaveFile(
  filename,
  pcmData,
  channels = 1,
  rate = 24000,
  sampleWidth = 2,
) {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, {
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    writer.on('finish', resolve);
    writer.on('error', reject);

    writer.write(pcmData);
    writer.end();
  });
}

/**
 * Convert WAV file to MP3 using FFmpeg
 */
function convertWavToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioCodec('libmp3lame')
      .audioBitrate('320k')
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(new Error(`FFmpeg conversion error: ${err.message}`));
      })
      .save(outputPath);
  });
}

/**
 * Generate MP3 from text using Gemini TTS and upload to S3
 */
export async function generateMP3Audio(script, topicId) {
  const tempDir = path.join(__dirname, '../temp');

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempWavPath = path.join(tempDir, `temp_${Date.now()}.wav`);
  const tempMp3Path = path.join(tempDir, `audio_${Date.now()}.mp3`);

  try {
    console.log('🎵 Generating audio using Gemini TTS via Vertex AI...');

    // Generate audio using Gemini TTS via Vertex AI
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-tts',
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Alnilam' },
          },
        },
      },
    });

    const result = await model.generateContent({
      contents: [
        {
          parts: [
            {
              text: `Read aloud in a warm, friendly, professional tone with no background noise, Professional yet approachable, Clear, precise instructions, Confident and knowledgeable tone: ${script}`,
            },
          ],
        },
      ],
    });

    const response = result.response;
    const audioData =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      throw new Error('Could not extract audio data from Gemini response');
    }

    const audioBuffer = Buffer.from(audioData, 'base64');

    // Save to temporary WAV file
    console.log('💾 Saving temporary WAV file...');
    await saveWaveFile(tempWavPath, audioBuffer);

    // Convert WAV to MP3
    console.log('🔄 Converting WAV to MP3...');
    await convertWavToMp3(tempWavPath, tempMp3Path);

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
    // Clean up temporary files
    if (fs.existsSync(tempWavPath)) {
      fs.unlinkSync(tempWavPath);
    }
    if (fs.existsSync(tempMp3Path)) {
      fs.unlinkSync(tempMp3Path);
    }
  }
}
