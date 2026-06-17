import textToSpeech from '@google-cloud/text-to-speech';

async function test() {
  const client = new textToSpeech.TextToSpeechClient();
  const request = {
    input: { text: 'Hello world' },
    voice: { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Alnilam' },
    audioConfig: { sampleRateHertz: 22050, audioEncoding: 'LINEAR16' },
  };
  const [response] = await client.synthesizeSpeech(request);
  const buffer = Buffer.from(response.audioContent);
  console.log('First 4 bytes:', buffer.subarray(0, 4).toString('utf8'));
}
test().catch(console.error);
