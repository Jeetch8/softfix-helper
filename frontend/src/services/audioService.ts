import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { uploadImageToS3 } from './s3Service';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const useVertexAI = process.env.USE_VERTEX_AI === 'true';

let ai: GoogleGenAI;
if (useVertexAI) {
  ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'softfix-498215',
    location: process.env.GCP_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || process.env.VERTEXAI_LOCATION || 'global',
  });
  console.log('🎯 Vertex AI Service Initialized for Audio Service');
} else {
  ai = new GoogleGenAI({ apiKey: apiKey || '' });
  if (!apiKey) {
    console.warn('⚠️ Warning: Neither GEMINI_API_KEY nor GOOGLE_API_KEY was found. Please set GEMINI_API_KEY in your .env file.');
  } else {
    console.log('🎯 Google AI Studio (Gemini API) Initialized for Audio Service using GEMINI_API_KEY');
  }
}

function convertLinear16ToWav(
  audioBuffer: Buffer,
  sampleRate = 22050,
  numChannels = 1,
  bitDepth = 16,
): Buffer {
  if (audioBuffer.length > 4 && audioBuffer.toString('utf8', 0, 4) === 'RIFF') {
    return audioBuffer;
  }

  const wavHeader = Buffer.alloc(44);
  const dataLength = audioBuffer.length;

  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + dataLength, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(sampleRate * numChannels * (bitDepth / 8), 28);
  wavHeader.writeUInt16LE(numChannels * (bitDepth / 8), 32);
  wavHeader.writeUInt16LE(bitDepth, 34);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(dataLength, 40);

  return Buffer.concat([wavHeader, audioBuffer]);
}

export async function generateWAVAudio(chunks: { text: string; modifier: string }[], topicId: string): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    const tempWavPath = path.join(tempDir, `audio_${Date.now()}.wav`);

    let scriptChunks = chunks;
    if (typeof chunks === 'string') {
      scriptChunks = [{ text: chunks, modifier: "This is an instructional section — stay clear, patient, and measured. Give exact click targets a beat of emphasis." }];
    }

    const fixedPersonaBlock = `AUDIO PROFILE: A calm, knowledgeable tech-support narrator for the SoftFix YouTube channel.
Think: the coworker who actually knows how to fix your laptop, explaining it to you in person —
not a call-center script reader, not a hype announcer.

DIRECTOR'S NOTES:
- Tone: warm, unhurried, quietly confident. Sound like you already know this works.
- Pace: natural conversational speed — not rushed, not overly deliberate. Slightly slower
  and clearer right before naming a button, menu, or exact click target.
- Energy: understated. No excitement spikes, no salesy enthusiasm. Think "helpful," not "hyped."
- Delivery: let your pitch fall slightly at the end of completed steps, and rise very slightly
  when introducing something new — the way people naturally do when walking through instructions.
`;

    const ttsModel = process.env.TTS_MODEL || process.env.GEMINI_TTS_MODEL || 'gemini-2.5-pro-preview-tts';
    console.log(`🎵 Generating audio for ${scriptChunks.length} chunks using ${ttsModel}...`);

    const rawBuffers: Buffer[] = [];

    for (let i = 0; i < scriptChunks.length; i++) {
      const chunk = scriptChunks[i];
      const chunkPrompt = fixedPersonaBlock + "\n" + chunk.modifier;

      console.log(`⏳ Processing audio chunk ${i + 1}/${scriptChunks.length}...`);

      const result = await ai.models.generateContent({
        model: ttsModel,
        contents: [
          { text: chunkPrompt },
          { text: chunk.text }
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Alnilam' },
            },
          },
        },
      });

      const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!audioData) {
        throw new Error(`Could not extract audio data from Gemini response for chunk ${i + 1}`);
      }

      rawBuffers.push(Buffer.from(audioData, 'base64'));

      if (i < scriptChunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    const combinedRawBuffer = Buffer.concat(rawBuffers);
    const wavBuffer = convertLinear16ToWav(combinedRawBuffer, 24000, 1, 16);

    console.log('💾 Saving temporary WAV file...');
    fs.writeFileSync(tempWavPath, wavBuffer);

    console.log('☁️  Uploading WAV to S3...');
    const fileBufferToUpload = fs.readFileSync(tempWavPath);

    const s3Url = await uploadImageToS3(fileBufferToUpload, `audio_${topicId}_${Date.now()}.wav`, 'audio/wav');

    if (fs.existsSync(tempWavPath)) {
      fs.unlinkSync(tempWavPath);
    }

    console.log('✅ Audio generated and uploaded successfully');
    return s3Url;
  } catch (error) {
    console.error('❌ Error generating audio:', error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : String(error)}`);
  }
}
