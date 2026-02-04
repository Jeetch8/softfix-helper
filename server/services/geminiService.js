import { GoogleGenAI } from '@google/genai';
import { uploadImageToS3 } from './s3Service.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
console.log('🎯 Gemini AI Service Initialized');

export async function generateNarrationScript(topic, description = '') {
  console.log({ topic, description });
  try {
    const descriptionText = description
      ? `\n\nAdditional context: ${description}`
      : '';
    const prompt = `You are a professional YouTube video scriptwriter. Create a comprehensive narration script for a YouTube video about the topic: "${topic}".${descriptionText}

Generate a straight forward narration script for YouTube video. Start with "in this video..." Say what the video is about, give a short intro about video and start explaining steps.the steps should be precious and detailed. The end should be short something like (not eaxctly this but something simillar), thank you for watching,like and subscribe if you liked, comment if you want me to make video on a specific topic. Do not include any headings or sub headings in the output.

Please provide only the script without any additional commentary.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [
          {
            googleSearch: {},
          },
        ],
      },
    });

    const text = response.text;

    return text;
  } catch (error) {
    console.error('❌ Error generating narration script:', error.message);
    throw new Error(`Failed to generate narration script: ${error.message}`);
  }
}

export async function generateYouTubeTitles(topic, script, description = '') {
  try {
    const descriptionText = description
      ? `\n\nAdditional context: ${description}`
      : '';
    const prompt = `You are a YouTube SEO expert. Generate exactly 10 highly optimized YouTube video titles based on the following information:

Topic: "${topic}"${descriptionText}

Script Summary: ${script.substring(0, 500)}...

Requirements for the titles:
- Each title should be 50-60 characters (optimal for YouTube)
- Include relevant keywords for SEO
- Be compelling and clickable
- Start with power words when appropriate
- Different angles and approaches (how-to, tips, guide, tutorial, etc.)
- Make them engaging and curiosity-inducing

Return ONLY the 10 titles, one per line, numbered 1-10. No additional text or explanation.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const text = response.text;
    const titles = text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.replace(/^[\d]+[\.\)]\s*/, '').trim())
      .filter((title) => title.length > 0);

    return titles.slice(0, 10);
  } catch (error) {
    console.error('❌ Error generating YouTube titles:', error.message);
    throw new Error(`Failed to generate YouTube titles: ${error.message}`);
  }
}

export async function generateYouTubeThumbnails(topic, title, script) {
  try {
    const thumbnails = [];

    console.log(`🎨 Starting thumbnail generation for: "${title}"`);

    // Generate 10 images sequentially
    for (let i = 0; i < 10; i++) {
      try {
        const designPrompt = `You are a YouTube thumbnail designer. Design #${i + 1}.

Create a YouTube thumbnail image for a video with:
- Topic: "${topic}"
- Title: "${title}"

Requirements:
- Eye-catching and attention-grabbing
- High contrast colors
- Bold, readable text overlay
- Professional YouTube thumbnail style
- Clear focal point
- Vibrant and engaging

This is design variation ${i + 1} of 10. Make it unique and different from typical thumbnails.`;

        console.log(`⏳ Generating thumbnail ${i + 1}/10...`);

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: [
            {
              text: designPrompt,
            },
          ],
        });

        if (response && response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData) {
                const base64Image = part.inlineData.data;

                // Convert base64 to buffer
                const imageBuffer = Buffer.from(base64Image, 'base64');

                // Upload to S3
                const s3Url = await uploadImageToS3(
                  imageBuffer,
                  `thumbnail_${i + 1}.png`,
                );

                thumbnails.push({
                  index: i + 1,
                  url: s3Url,
                });
                console.log(`✅ Generated and uploaded thumbnail ${i + 1}/10`);
                break;
              }
            }
          }
        }

        // Small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`⚠️ Error generating thumbnail ${i + 1}:`, err.message);
        // Continue with next image even if one fails
      }
    }

    if (thumbnails.length === 0) {
      throw new Error('Failed to generate any thumbnails. Please try again.');
    }

    console.log(`✅ Successfully generated ${thumbnails.length} thumbnails`);
    return thumbnails;
  } catch (error) {
    console.error('❌ Error generating thumbnails:', error.message);
    throw new Error(`Failed to generate thumbnails: ${error.message}`);
  }
}

export async function generateSEODescription(topic, script) {
  try {
    const prompt = `You are a YouTube SEO expert. Generate a compelling and SEO-optimized YouTube video description based on the following:

Topic: "${topic}"

Script: ${script.substring(0, 1000)}...

Requirements:
- 300-500 words (optimal for YouTube)
- Include main keywords naturally
- Be compelling and encourage clicks
- Include call-to-action (like, subscribe, comment)
- Professional and informative tone
- Front-load important information

Return ONLY the description text, no additional formatting or explanation.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error('❌ Error generating SEO description:', error.message);
    throw new Error(`Failed to generate SEO description: ${error.message}`);
  }
}

export async function generateTags(topic, script, title) {
  try {
    const prompt = `You are a YouTube SEO expert. Generate 12-15 highly relevant tags for a YouTube video based on:

Topic: "${topic}"
Title: "${title}"
Script excerpt: ${script.substring(0, 500)}...

Requirements:
- Tags should be specific and relevant
- Include short tags (1-3 words) and longer tags (2-4 words)
- Cover main topic, subtopics, and related searches
- Include trending keywords if relevant
- Mix broad and specific terms

Return ONLY the tags, one per line, WITHOUT the # symbol. No additional text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const tags = response.text
      .split('\n')
      .filter((tag) => tag.trim())
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    return tags.slice(0, 15);
  } catch (error) {
    console.error('❌ Error generating tags:', error.message);
    throw new Error(`Failed to generate tags: ${error.message}`);
  }
}

export async function generateTimestamps(script) {
  try {
    const prompt = `You are a YouTube video editor. Analyze the following script and generate 5-7 important timestamps with descriptions for chapter markers.

Script: ${script}

Requirements:
- Extract 5-7 key sections/moments from the script
- Each timestamp should be in MM:SS format (assuming ~5-10 minute video)
- Include brief description of what happens at that timestamp (5-10 words)
- Start with "0:00" for introduction
- Make timestamps progressively later
- Descriptions should be clear and clickable

Format ONLY as:
MM:SS - Description

One per line. No additional text or formatting.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const timestamps = response.text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const match = line.match(/^(\d{1,2}:\d{2})\s*-\s*(.+)$/);
        if (match) {
          return {
            time: match[1],
            description: match[2].trim(),
          };
        }
        return null;
      })
      .filter((ts) => ts !== null);

    return timestamps;
  } catch (error) {
    console.error('❌ Error generating timestamps:', error.message);
    throw new Error(`Failed to generate timestamps: ${error.message}`);
  }
}
