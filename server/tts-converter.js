#!/usr/bin/env node

import { GoogleGenAI } from '@google/genai';
import wav from 'wav';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

/**
 * Save audio buffer to WAV file
 * @param {string} filename - Output filename
 * @param {Buffer} pcmData - PCM audio data
 * @param {number} channels - Number of audio channels
 * @param {number} rate - Sample rate
 * @param {number} sampleWidth - Sample width in bytes
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
 * @param {string} inputPath - Path to input WAV file
 * @param {string} outputPath - Path to output MP3 file
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
 * Check if input is a file path and read its contents
 * @param {string} input - Input text or file path
 * @returns {string} Text content
 */
function readInputText(input) {
  try {
    // Check if input looks like a file path and exists
    if (
      (input.endsWith('.txt') || input.includes('/') || input.includes('\\')) &&
      fs.existsSync(input)
    ) {
      console.log(`📄 Reading text from file: ${input}`);
      return fs.readFileSync(input, 'utf-8').trim();
    }
  } catch (error) {
    console.warn(
      `⚠️  Warning: Could not read file "${input}", treating as text.`,
    );
  }
  return input;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let text = '';
  let outputPath = 'output.mp3';
  let voice = 'Alnilam';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-o' || args[i] === '--output') {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === '-v' || args[i] === '--voice') {
      voice = args[i + 1];
      i++;
    } else if (!args[i].startsWith('-')) {
      text = readInputText(args[i]);
    }
  }

  return { text, outputPath, voice };
}

/**
 * Main TTS conversion function
 */
async function main() {
  console.log('🎵 TTS Converter - Gemini AI to MP3\n');

  const { text, outputPath, voice } = parseArgs();

  if (!text) {
    console.log('Usage: node tts-converter.js <text|file> [options]');
    console.log('Options:');
    console.log(
      '  -o, --output <path>  Output MP3 file path (default: output.mp3)',
    );
    console.log('  -v, --voice <name>   Voice name (default: Alnilam)');
    console.log('\nExamples:');
    console.log(
      '  node tts-converter.js "Hello, this is a test" -o output.mp3 -v Kore',
    );
    console.log('  node tts-converter.js content.txt -o output.mp3');
    process.exit(1);
  }

  try {
    console.log('🎯 Initializing Gemini AI...');
    const ai = new GoogleGenAI({
      apiKey:
        process.env.GEMINI_API_KEY || 'AIzaSyChjx26eWQfkg41XjlBPKZH8rbIumXSOTo',
    });

    console.log('🗣️  Converting text to speech using Gemini AI...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [
        {
          parts: [
            {
              text: `Read aloud in a warm,friendly tone and human voice with no background noise and echo: ${text}`,
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const data =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!data) {
      throw new Error(
        'Could not extract audio data from Gemini response. Note: Ensure your API key has audio generation permissions.',
      );
    }

    const audioBuffer = Buffer.from(data, 'base64');

    // Save temporary WAV file
    const tempWavPath = path.join(
      path.dirname(outputPath),
      `temp_${Date.now()}.wav`,
    );

    console.log('💾 Saving temporary WAV file...');
    await saveWaveFile(tempWavPath, audioBuffer);

    // Convert WAV to MP3
    console.log('🔄 Converting WAV to MP3...');
    await convertWavToMp3(tempWavPath, outputPath);

    // Clean up temporary WAV file
    fs.unlinkSync(tempWavPath);

    console.log(`✅ Success! MP3 file created: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run main function
await main();
