import mongoose from 'mongoose';
import { resolveMediaUrl } from './services/s3Service.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const url = '/api/media?key=audio%2F1787501581164_audio_6a7d37121798406d9f607c02_1787501581164_0.wav';
  console.log("Original URL:", url);
  const resolved = await resolveMediaUrl(url);
  console.log("Resolved URL:", resolved);
  process.exit(0);
}
test();
