import { GoogleGenAI } from '@google/genai';
import { uploadImageToS3 } from './s3Service.js';

let ai;
let PRO_MODEL;
let FLASH_MODEL;
let IMAGE_MODEL;

// Force Vertex AI by default as requested by user constraints to avoid 403 API Key service blocked errors.
const useVertexAI = process.env.USE_VERTEX_AI !== 'false';

if (useVertexAI) {
  const location = 'global';
  // const location = process.env.GCP_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || process.env.VERTEXAI_LOCATION || "global";
  ai = new GoogleGenAI({
    vertexai: true,
    project:
      process.env.GCP_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      'softfix-498215',
    location: location,
  });
  PRO_MODEL = process.env.VERTEX_PRO_MODEL || 'gemini-3.1-pro-preview';
  FLASH_MODEL = process.env.VERTEX_FLASH_MODEL || 'gemini-3.5-flash';
  IMAGE_MODEL = process.env.VERTEX_IMAGE_MODEL || 'imagen-3.0-generate-001';
  console.log(
    `🎯 Vertex AI Service Initialized (using @google/genai in ${location})`,
  );
} else if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  PRO_MODEL = process.env.VERTEX_PRO_MODEL || 'gemini-2.5-pro';
  FLASH_MODEL = process.env.VERTEX_FLASH_MODEL || 'gemini-2.5-flash';
  IMAGE_MODEL = process.env.VERTEX_IMAGE_MODEL || 'imagen-3.0-generate-002';
  console.log(
    `🎯 Google AI Studio Service Initialized (using standard Gemini API with GEMINI_API_KEY)`,
  );
} else {
  const location =
    process.env.GCP_LOCATION ||
    process.env.GOOGLE_CLOUD_LOCATION ||
    process.env.VERTEXAI_LOCATION ||
    'global';
  ai = new GoogleGenAI({
    vertexai: true,
    project:
      process.env.GCP_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      'softfix-498215',
    location: location,
  });
  PRO_MODEL = process.env.VERTEX_PRO_MODEL || 'gemini-3.1-pro-preview';
  FLASH_MODEL = process.env.VERTEX_FLASH_MODEL || 'gemini-3.5-flash';
  IMAGE_MODEL = process.env.VERTEX_IMAGE_MODEL || 'imagen-3.0-generate-001';
  console.log(
    `🎯 Vertex AI Service Initialized as Fallback (using @google/genai in ${location})`,
  );
}

/**
 * Robust helper to extract text content from generateContent responses
 */
function getTextFromResponse(result) {
  if (!result) return '';
  if (typeof result.text === 'string') {
    return result.text;
  }
  if (typeof result.text === 'function') {
    return result.text();
  }
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Robust helper to extract inline base64 image data from generateContent responses
 */
function getImagePartFromResponse(result) {
  const parts = result?.candidates?.[0]?.content?.parts;
  if (!parts) return null;
  return parts.find((p) => p.inlineData);
}

/**
 * Helper to call Vertex AI for text generation with optional features
 */
async function generateText(
  modelName,
  prompt,
  systemInstruction = null,
  isJson = false,
  hasSearch = false,
) {
  try {
    const config = {};

    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    if (hasSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    if (isJson) {
      config.responseMimeType = 'application/json';
    }

    const result = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: config,
    });
    return getTextFromResponse(result);
  } catch (error) {
    console.error('❌ Error in generateText:', error.message);
    if (error.response) {
      try {
        const rawBody =
          typeof error.response.text === 'function'
            ? await error.response.text()
            : typeof error.response === 'string'
              ? error.response
              : JSON.stringify(error.response);
        console.error('📄 Raw GCP Error Response:', rawBody);
        const titleMatch = rawBody.match(/<title>([\s\S]*?)<\/title>/i);
        const bodyMatch = rawBody.match(/<body>([\s\S]*?)<\/body>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        const body = bodyMatch
          ? bodyMatch[1].trim().replace(/<[^>]*>/g, ' ')
          : '';
        throw new Error(
          `GCP Vertex AI API Error: ${title || 'Forbidden/Error'} - ${body.substring(0, 300) || 'Check GCP console configuration.'}`,
        );
      } catch (e) {
        throw new Error(
          `GCP Vertex AI API Error: ${error.message}. Additional context: ${e.message}`,
        );
      }
    }
    throw error;
  }
}

/**
 * Helper to call Vertex AI for image generation
 */
async function generateImage(modelName, prompt, temperature = 0.9) {
  try {
    const result = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature,
      },
    });
    const part = getImagePartFromResponse(result);
    return part;
  } catch (error) {
    console.error('❌ Error in generateImage:', error.message);
    if (error.response) {
      try {
        const rawBody =
          typeof error.response.text === 'function'
            ? await error.response.text()
            : typeof error.response === 'string'
              ? error.response
              : JSON.stringify(error.response);
        console.error('📄 Raw GCP Error Response:', rawBody);
        const titleMatch = rawBody.match(/<title>([\s\S]*?)<\/title>/i);
        const bodyMatch = rawBody.match(/<body>([\s\S]*?)<\/body>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        const body = bodyMatch
          ? bodyMatch[1].trim().replace(/<[^>]*>/g, ' ')
          : '';
        throw new Error(
          `GCP Vertex AI API Error: ${title || 'Forbidden/Error'} - ${body.substring(0, 300) || 'Check GCP console configuration.'}`,
        );
      } catch (e) {
        throw new Error(
          `GCP Vertex AI API Error: ${error.message}. Additional context: ${e.message}`,
        );
      }
    }
    throw error;
  }
}

export async function generateNarrationScript(
  topic,
  videoTitle,
  description = '',
  keywords = '',
  regenerationComments = null,
) {
  try {
    const descriptionText = description
      ? `\n\nAdditional context: ${description}`
      : '';
    const keywordsText = keywords
      ? `\nKeywords (format: keyword | search volume): ${keywords}\nMake sure to naturally incorporate these keywords into the script, prioritizing those with higher search volume.`
      : '';
    let prompt = `System Role & Context:
Act as an expert YouTube tech creator and scriptwriter. You run a highly successful tutorial channel that solves everyday software, mobile app, and tech-related problems (Windows, iOS, Android, specific software, etc.). Your style is fast-paced, casual, direct, and highly informative.

Task:
Write a video transcript based on the specific inputs provided below.

Inputs:

Topic Name: ${topic}
Video Title: ${videoTitle}
Video Description: ${description}
Keywords (Keyword | Search Volume):
${keywords}
Step-by-Step Instructions:
${description}

Script Guidelines & Style Rules:

The Hook & Intro: Start immediately by stating what you are going to do (e.g., "Hey guys, [Your Name] here, and in this video I'm going to show you how to..." or "Let's [action]..."). Keep it under 15 seconds.
Early CTA: Right after the hook, include a quick, casual call-to-action to subscribe (e.g., "It's pretty quick and easy, but first, hit that subscribe button down below, it really helps me out. Thanks guys. Now let's open up...").
Keyword Integration: Naturally weave the provided keywords into the script. Crucially, prioritize keywords with higher search volumes by placing them in the intro, early in the steps, or repeating them naturally. Do not make them sound forced. Use the Video Description and Title to inform the context of how you speak about the topic.
The Walkthrough (Body): Narrate the Step-by-Step instructions exactly as if you are holding the phone or looking at the computer screen right now. Use conversational transition phrases like "Now that we're here...", "Essentially you want to...", "Let's tap on...", "Midway down you'll see...", and "Let's hop out of here...".
The Outro: End quickly and smoothly without dragging it out. (e.g., "I hope this helps. If it did, hit the like button down below and leave a comment if you still have any questions. Catch you on the next one!").
Formatting: Write it as a continuous, spoken-word transcript. You do not need to add timestamps or speaker labels. Just provide the exact words the creator should read into the microphone.`;

    if (regenerationComments) {
      prompt += `\n\nREGENERATION FEEDBACK / COMMENTS:\nPlease rewrite the script taking into account the following feedback from the user to improve or adjust the script:\n"${regenerationComments}"`;
    }

    console.log(`⏳ Generating narration script using FLASH model...`);
    const responseText = await generateText(
      FLASH_MODEL,
      prompt,
      null,
      false,
      true,
    );
    console.log(`✅ Generated narration script`);

    return [responseText];
  } catch (error) {
    console.error('❌ Error generating narration script:', error.message);
    throw new Error(`Failed to generate narration script: ${error.message}`);
  }
}

/**
 * Generate multiple narration script variations using different prompts
 * @param {string} topic - The topic name
 * @param {string} description - Topic description
 * @param {Array<string>} prompts - Array of 4 custom prompts (user will add these in code)
 * @param {string} keywords - Comma separated keywords
 * @returns {Array<{prompt: string, result: string}>}
 */
export async function generateNarrationScriptVariations(
  topic,
  description = '',
  prompts,
  keywords = '',
) {
  console.log(
    `🎬 Generating ${prompts.length} narration script variations for topic: ${topic}`,
  );

  try {
    // Generate all variations in parallel
    const results = await Promise.all(
      prompts.map(async (customPrompt, index) => {
        try {
          console.log(
            `⏳ Generating variation ${index + 1}/${prompts.length}...`,
          );

          const descriptionText = description
            ? `\n\nAdditional context: ${description}`
            : '';
          const keywordsText = keywords
            ? `\nKeywords (format: keyword | search volume): ${keywords}\nMake sure to naturally incorporate these keywords into the script, prioritizing those with higher search volume.`
            : '';
          const fullPrompt = `${customPrompt}

Topic: "${topic}"${descriptionText}${keywordsText}`;

          const responseText = await generateText(
            PRO_MODEL,
            fullPrompt,
            null,
            false,
            true,
          );
          console.log(`✅ Generated variation ${index + 1}/${prompts.length}`);

          return {
            prompt: customPrompt,
            result: responseText,
          };
        } catch (err) {
          console.error(
            `❌ Error generating variation ${index + 1}:`,
            err.message,
          );
          return {
            prompt: customPrompt,
            result: `Error: ${err.message}`,
          };
        }
      }),
    );

    return results;
  } catch (error) {
    console.error(
      '❌ Error generating narration script variations:',
      error.message,
    );
    throw new Error(
      `Failed to generate narration script variations: ${error.message}`,
    );
  }
}

/**
 * Generate multiple thumbnail variations using different prompts
 * @param {string} topic - The topic name
 * @param {string} title - The selected title
 * @param {Array<string>} prompts - Array of 4 custom prompts (user will add these in code)
 * @param {string} keywords - Comma separated keywords
 * @returns {Array<{prompt: string, url: string}>}
 */
export async function generateThumbnailVariations(
  topic,
  title,
  prompts,
  keywords = '',
) {
  console.log(
    `🎨 Generating ${prompts.length} thumbnail variations for topic: ${topic}`,
  );

  try {
    const results = [];

    for (let i = 0; i < prompts.length; i++) {
      try {
        console.log(
          `⏳ Generating thumbnail variation ${i + 1}/${prompts.length}...`,
        );

        const customPrompt = prompts[i];
        const keywordsText = keywords
          ? `\nKeywords (format: keyword | search volume): ${keywords}`
          : '';
        const fullPrompt = `${customPrompt}

Topic: "${topic}"
Title: "${title}"${keywordsText}`;

        const part = await generateImage(IMAGE_MODEL, fullPrompt, 0.9);
        if (part && part.inlineData) {
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          const s3Url = await uploadImageToS3(
            imageBuffer,
            `thumbnail_variation_${i + 1}_${Date.now()}.png`,
          );

          results.push({
            prompt: customPrompt,
            url: s3Url,
          });

          console.log(
            `✅ Generated thumbnail variation ${i + 1}/${prompts.length}`,
          );
        } else {
          results.push({
            prompt: customPrompt,
            url: null,
          });
        }

        // Add delay between requests to avoid rate limits
        if (i < prompts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch (err) {
        console.error(
          `❌ Error generating thumbnail variation ${i + 1}:`,
          err.message,
        );
        results.push({
          prompt: prompts[i],
          url: null,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Error generating thumbnail variations:', error.message);
    throw new Error(
      `Failed to generate thumbnail variations: ${error.message}`,
    );
  }
}

/**
 * Generate multiple title variations using different prompts
 * @param {string} topic - The topic name
 * @param {string} description - Topic description
 * @param {string} narrationScript - The narration script
 * @param {Array<string>} prompts - Array of 4 custom prompts (user will add these in code)
 * @param {string} keywords - Comma separated keywords
 * @returns {Array<{prompt: string, result: string}>}
 */
export async function generateTitleVariations(
  topic,
  description = '',
  narrationScript = '',
  prompts,
  keywords = '',
) {
  console.log(
    `🎬 Generating ${prompts.length} title variations for topic: ${topic}`,
  );

  try {
    // Generate all variations in parallel
    const results = await Promise.all(
      prompts.map(async (customPrompt, index) => {
        try {
          console.log(
            `⏳ Generating title variation ${index + 1}/${prompts.length}...`,
          );

          const descriptionText = description
            ? `\n\nAdditional context: ${description}`
            : '';
          const scriptText = narrationScript
            ? `\n\nScript Summary: ${narrationScript.substring(0, 500)}...`
            : '';
          const keywordsText = keywords
            ? `\nKeywords (format: keyword | search volume): ${keywords}\nMake sure to incorporate these keywords into the titles where appropriate, prioritizing those with higher search volume.`
            : '';
          const fullPrompt = `${customPrompt}

Topic: "${topic}"${descriptionText}${scriptText}${keywordsText}`;

          const responseText = await generateText(
            FLASH_MODEL,
            fullPrompt,
            null,
            false,
            true,
          );
          console.log(
            `✅ Generated title variation ${index + 1}/${prompts.length}`,
          );

          return {
            prompt: customPrompt,
            result: responseText,
          };
        } catch (err) {
          console.error(
            `❌ Error generating title variation ${index + 1}:`,
            err.message,
          );
          return {
            prompt: customPrompt,
            result: `Error: ${err.message}`,
          };
        }
      }),
    );

    return results;
  } catch (error) {
    console.error('❌ Error generating title variations:', error.message);
    throw new Error(`Failed to generate title variations: ${error.message}`);
  }
}

export async function generateYouTubeTitles(
  topic,
  script,
  description = '',
  keywords = '',
) {
  try {
    let titleStr = '';
    if (keywords) {
      const kwList = keywords
        .split(',')
        .map((k) => {
          const parts = k.split('|');
          return {
            keyword: parts[0]?.trim(),
            volume: parseInt(parts[1]?.trim()) || 0,
          };
        })
        .filter((k) => k.keyword);

      kwList.sort((a, b) => b.volume - a.volume);

      const titleParts = [];
      let currentLen = 0;

      for (const kw of kwList) {
        const capitalized = kw.keyword
          .split(' ')
          .map((w) =>
            w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '',
          )
          .join(' ');

        const partLen = capitalized.length;
        if (currentLen === 0) {
          if (partLen > 100) {
            titleParts.push(capitalized.substring(0, 100));
            break;
          }
          titleParts.push(capitalized);
          currentLen += partLen;
        } else {
          if (currentLen + 3 + partLen <= 100) {
            titleParts.push(capitalized);
            currentLen += 3 + partLen;
          } else {
            break;
          }
        }
      }

      titleStr = titleParts.join(' | ');
    }

    if (titleStr) {
      return [titleStr];
    }

    const descriptionText = description
      ? `\n\nAdditional context: ${description}`
      : '';
    const keywordsText = keywords
      ? `\nKeywords (format: keyword | search volume): ${keywords}\nMake sure to incorporate these keywords into the titles where appropriate, prioritizing those with higher search volume.`
      : '';
    const prompt = `You are a title creator for "Softfix Central," a YouTube channel known for straightforward, efficient tech tutorials. Generate exactly 20 optimized video titles based on:

Topic: "${topic}"${descriptionText}${keywordsText}

Script: ${script}

SOFTFIX CENTRAL TITLE PRINCIPLES:

CLARITY FIRST:
- Front-load the main action or solution (first 3-5 words are critical)
- Make the outcome immediately clear—viewers should know exactly what they'll learn
- Keep titles between 50-65 characters for optimal display
- Every word must earn its place—no filler

SEO ELEMENTS (use naturally):
- Include primary keywords early in the title
- Add specific software/OS version when relevant (e.g., "Windows 11", "iPhone 15")
- Use year (2025) only for time-sensitive content
- Use numbers when they add value ("3 Ways", "5 Steps")

TITLE PATTERNS FOR TECH TUTORIALS:
- Direct How-To: "How to [Specific Action] in [Software/OS]"
- Problem-Solution: "Fix [Specific Problem] in [Software] - Quick Guide"
- Feature Tutorial: "[Action] Using [Feature] in [Software]"
- Complete Process: "[Task] in [Software]: Complete Tutorial"
- Comparison: "[Option A] vs [Option B] in [Software] - Which is Better?"

TONE REQUIREMENTS:
- Professional and straightforward—no hype or clickbait
- Descriptive, not mysterious—tell them exactly what's in the video
- Use action verbs: Fix, Create, Enable, Disable, Change, Set Up, Configure
- Avoid: "Amazing", "You Won't Believe", "Secret", excessive punctuation

WHAT MAKES A GOOD SOFTFIX CENTRAL TITLE:
✓ "How to Enable Dark Mode in Windows 11"
✓ "Fix Bluetooth Connection Issues on Mac - 3 Methods"
✓ "Create Custom Shortcuts in Excel (2025 Guide)"
✗ "This Windows Feature Will BLOW YOUR MIND!"
✗ "The Secret Mac Setting Everyone's Talking About"

Return ONLY the 20 titles, numbered 1-20, one per line. No additional commentary.`;

    const responseText = await generateText(PRO_MODEL, prompt);

    const titles = responseText
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.replace(/^[\d]+[\.)]\s*/, '').trim())
      .filter((title) => title.length > 0);

    return titles.slice(0, 20);
  } catch (error) {
    console.error('❌ Error generating YouTube titles:', error.message);
    throw new Error(`Failed to generate YouTube titles: ${error.message}`);
  }
}

export async function generateYouTubeThumbnails(
  topic,
  title,
  script,
  keywords = '',
) {
  try {
    const thumbnails = [];
    console.log(`🎨 Starting thumbnail generation for: "${title}"`);

    for (let i = 0; i < 2; i++) {
      try {
        const keywordsText = keywords
          ? `\nKeywords (format: keyword | search volume): ${keywords}`
          : '';
        const designPrompt = `You are a thumbnail designer for "Softfix Central," a YouTube channel known for clear, professional tech tutorials. Create a single high-quality image containing a 3x3 grid of 9 distinct thumbnail variations for:

Topic: "${topic.topicName}"
Title: "${title}"
Script: "${script}"${keywordsText}

SOFTFIX CENTRAL THUMBNAIL PRINCIPLES:

BRAND IDENTITY:
- Professional and clean—no flashy, clickbait-style designs
- Straightforward and informative—viewers should immediately understand what the video covers
- Trust-building—design should convey credibility and expertise
- Tech-focused—appropriate for educational tutorial content

DESIGN REQUIREMENTS:

Visual Clarity:
- High contrast for easy viewing at small sizes
- Clean layouts with clear focal points
- Minimal clutter—every element must serve a purpose
- Use whitespace effectively to improve readability

Text Elements:
- Bold, highly readable sans-serif fonts
- Keep text concise (3-6 words maximum per thumbnail)
- Use actual software/feature names, not vague descriptions
- Text should complement, not overwhelm, the visual

Color Palette:
- Use colors that match the software/OS being discussed (Windows blue, Mac gray, etc.)
- Maintain professional color schemes—avoid overly bright or neon colors
- Ensure strong contrast between text and background
- Consistency with tech brand colors when relevant

Visual Content (use variety across the 9 thumbnails):
- Clean screenshots of the actual software/interface
- Simple icons or symbols related to the tech topic
- Device mockups (laptop, phone, desktop) when relevant
- Before/after comparisons for fix/solution videos
- Arrows or highlights pointing to specific features
- Minimal human elements—focus on the technology

VARIATION STRATEGY (ensure all 9 are different):
- Different text placements (left, right, center, top, bottom)
- Different visual approaches (screenshot-focused, icon-based, split-screen)
- Different color schemes while maintaining professionalism
- Different composition styles (close-up, full interface, detail focus)
- Mix of text-heavy and visual-heavy designs

WHAT TO AVOID:
- Exaggerated facial expressions or reaction shots
- Excessive emojis or symbols
- Red circles/arrows pointing to nothing specific
- All-caps sensationalized text
- Busy backgrounds that distract from the message
- Stock photos unrelated to the actual content
- Overly dramatic lighting or effects

GRID OUTPUT:
- Single image containing all 9 thumbnails in a 3x3 grid
- Each thumbnail clearly separated and labeled (1-9)
- Consistent aspect ratio (16:9) for each thumbnail
- High enough resolution that text remains readable when zoomed

The thumbnails should look like they belong to a trusted, professional tech tutorial channel—not a clickbait entertainment channel.`;

        console.log(`⏳ Generating thumbnail set ${i + 1}/2...`);

        const part = await generateImage(IMAGE_MODEL, designPrompt, 0.9);
        if (part && part.inlineData) {
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          const s3Url = await uploadImageToS3(
            imageBuffer,
            `thumbnail_set_${i + 1}.png`,
          );
          thumbnails.push({ index: i + 1, url: s3Url });
          console.log(`✅ Generated and uploaded thumbnail set ${i + 1}/2`);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(
          `⚠️ Error generating thumbnail set ${i + 1}:`,
          err.message,
        );
      }
    }

    if (thumbnails.length === 0) {
      throw new Error('Failed to generate any thumbnails. Please try again.');
    }

    return thumbnails;
  } catch (error) {
    console.error('❌ Error generating thumbnails:', error.message);
    throw new Error(`Failed to generate thumbnails: ${error.message}`);
  }
}

export async function generateSEODescription(
  topic,
  script,
  title,
  keywords = '',
) {
  try {
    const keywordsText = keywords
      ? `\nKeywords (format: keyword | search volume): ${keywords}\nMake sure to explicitly include MOST of these keywords naturally throughout the description for SEO optimization, prioritizing those with higher search volume.`
      : '';
    const prompt = `You are a YouTube SEO specialist for "Softfix Central," a tech tutorial channel. Generate a fully optimized video description for:

Topic: "${topic}"
Title: "${title}"
Script: ${script}${keywordsText}

DESCRIPTION STRUCTURE (300-500 words total):

HOOK - First 150 Characters (appears before "Show more"):
- Open with the main keyword and core benefit/solution
- Make it compelling enough to encourage clicking "Show more"
- Include a clear value proposition
- This text also appears in search results—make it count

MAIN DESCRIPTION (Paragraphs 2-3):
- Expand on what viewers will learn with specific details
- Naturally incorporate 3-5 primary keywords related to the topic
- Mention the software/OS version and relevant technical terms
- Explain the problem being solved and the outcome viewers will achieve
- Keep sentences clear and scannable

VIDEO BREAKDOWN (if script is detailed):
- Brief overview of what's covered, using natural language (not a numbered list)
- Mention key features, settings, or tools discussed
- Include secondary keywords and related search terms

CALL-TO-ACTION:
- Subscribe request (vary the phrasing)
- Like and comment invitation
- Mention turning on notifications if relevant
- Keep it brief and natural

HASHTAGS (3-5 maximum, placed at the end):
- Use specific, relevant hashtags: #[Software/OS], #TechTutorial, #HowTo
- Include the main topic keyword as a hashtag
- Avoid generic or overused hashtags
- Format: #WordsLikeThis (no spaces)

SEO OPTIMIZATION REQUIREMENTS:

Keyword Placement:
- Primary keyword in the first sentence
- Primary keyword appears 2-3 times naturally throughout
- Include 5-8 related/secondary keywords (software names, features, problem terms)
- Use exact phrases people search for (e.g., "how to fix", "enable dark mode")

Readability:
- Write for humans first, search engines second
- Use natural language—no keyword stuffing
- Short paragraphs (2-3 sentences each)
- Professional but conversational tone matching Softfix Central's brand

Technical Elements:
- Mention specific software/OS versions (e.g., "Windows 11," "macOS Sonoma")
- Include year (2025) for time-sensitive content
- Reference related features or settings that viewers might also search for
- Use proper technical terminology

WHAT TO INCLUDE (if relevant):
- Prerequisites or system requirements
- Related videos or topics (in text, not links)
- Common problems this solves
- Alternative methods or related features

WHAT TO AVOID:
- Clickbait language or exaggeration
- Excessive emoji usage
- Keyword stuffing or unnatural repetition
- More than 5 hashtags
- Vague descriptions that could apply to any video
- Walls of text without paragraph breaks

TONE:
- Professional and informative (matching Softfix Central's brand)
- Helpful and straightforward
- No hype or sensationalism
- Focus on value delivery

Return ONLY the description text with hashtags at the end. No additional commentary, formatting markers, or explanations.`;

    const responseText = await generateText(FLASH_MODEL, prompt);
    return responseText.trim();
  } catch (error) {
    console.error('❌ Error generating SEO description:', error.message);
    throw new Error(`Failed to generate SEO description: ${error.message}`);
  }
}

export async function generateTags(topic, script, title, keywords = '') {
  try {
    const keywordsText = keywords
      ? `\nKeywords (format: keyword | search volume): ${keywords}\nMake sure to explicitly include any of these keywords that were NOT used in the video description in your final list of tags, prioritizing those with higher search volume.`
      : '';
    const prompt = `You are a tag strategist for "Softfix Central," a tech tutorial YouTube channel. Generate 15-25 highly targeted tags for:

Topic: "${topic}"
Title: "${title}"
Script: ${script}${keywordsText}

TAG STRATEGY FOR SOFTFIX CENTRAL:

TAG HIERARCHY (use this order of priority):

PRIMARY TAGS (3-5 tags):
- Exact main keyword from the title
- Specific software/OS name and version (e.g., "Windows 11", "Excel 2025")
- Core action or problem being solved (e.g., "fix bluetooth", "enable dark mode")
- These should match what people actually type in YouTube search

SECONDARY TAGS (5-8 tags):
- Related features or settings mentioned in the video
- Alternative ways people might search for this topic
- Specific tools, menus, or functions covered
- Problem-based phrases (e.g., "bluetooth not working", "connection issues")

BROAD TAGS (3-5 tags):
- General category tags (e.g., "tech tutorial", "how to guide")
- Platform/software category (e.g., "Windows tutorial", "Mac tips")
- General problem area (e.g., "troubleshooting", "productivity tips")

LONG-TAIL TAGS (4-7 tags):
- 3-5 word specific phrases people search for
- Complete questions or problems (e.g., "how to fix bluetooth on windows 11")
- Step-by-step related terms (e.g., "windows 11 settings tutorial")

TAG OPTIMIZATION RULES:

Relevance:
- Every tag must be directly relevant to the video content
- Use exact terminology from the software/OS being discussed
- Include specific version numbers when applicable
- Match the actual search intent of your target audience

Format:
- Use lowercase for better matching (YouTube is case-insensitive, but lowercase is standard)
- Multi-word tags should be natural phrases, not keyword stuffing
- Mix of 1-word, 2-word, and 3-5 word tags
- Keep individual tags under 30 characters when possible

Strategic Inclusion:
- Channel name: "softfix central" (helps with brand searches)
- Software/platform name (exact spelling)
- Year (2025) if content is time-sensitive or version-specific
- Related tech topics viewers might also search for
- Common misspellings ONLY if they're frequently searched

WHAT TO INCLUDE (if relevant):
- Specific error messages or error codes
- Feature names exactly as they appear in the software
- Alternative names for the same feature
- Related problems this video also solves
- Competitor software (if doing comparisons)

WHAT TO AVOID:
- Irrelevant trending tags just for views
- Tags for topics not covered in the video
- Spam or repeated variations of the same tag
- Single-letter or overly generic tags (e.g., "video", "tutorial" alone)
- Tags with special characters or excessive punctuation
- Misleading tags that don't match content
- More than 25 tags total (focus on quality over quantity)

TAG EXAMPLES FOR TECH TUTORIALS:
✓ "windows 11 dark mode"
✓ "enable dark mode windows"
✓ "windows 11 settings"
✓ "how to enable dark mode"
✓ "windows customization"
✗ "BEST TUTORIAL EVER"
✗ "viral"
✗ "trending"

PRIORITY PRINCIPLE:
Better to have 15 highly relevant tags than 25 mediocre ones. Focus on tags that will bring the RIGHT viewers who are actually looking for this specific solution.

Return ONLY the tags, one per line, in lowercase, WITHOUT the # symbol. No numbering, no additional text or explanation.`;

    const responseText = await generateText(FLASH_MODEL, prompt);

    const tags = responseText
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

export async function filterNonEnglishKeywords(keywordsArray) {
  try {
    console.log(
      `🔍 Filtering non-English keywords from ${keywordsArray.length} items using small model...`,
    );
    const prompt = `You are a language detection assistant. Given the following list of keywords, return ONLY a JSON array containing the keywords that are in English. Exclude any keywords that are primarily in another language. Do NOT add markdown formatting around the output, just return the raw JSON array of strings.

Keywords to filter:
${JSON.stringify(keywordsArray)}
`;

    const responseText = await generateText(FLASH_MODEL, prompt, null, true);

    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '')
        .trim();
    }
    const englishKeywords = JSON.parse(cleanedText);
    console.log(
      `✅ Filtered down to ${englishKeywords.length} English keywords.`,
    );
    return englishKeywords;
  } catch (error) {
    console.error('❌ Error filtering keywords:', error.message);
    throw new Error(`Failed to filter non-English keywords: ${error.message}`);
  }
}

export async function segregateKeywordsIntoGroups(keywordsWithData) {
  try {
    console.log(keywordsWithData);
    console.log(
      `🧠 Segregating ${keywordsWithData.length} keywords into groups using reasoning model...`,
    );

    const prompt = `You are an SEO grouping assistant. I have a list of keywords with their search volume, overall scores, competition scores, and ids. 
Segregate these keywords into logical groups based on matching interest in the solution of the keyword or question.
A keyword can be placed into multiple groups if it is appropriate.

Provide the result as a JSON array of objects. Each object must have a "title" (the name of the group) and "keywords" (an array of keyword objects belonging to this group). Each keyword object in the array must contain ONLY the "id" of the keyword. Do NOT include keyword text, search_volume, overall, or competition in the output keywords list.

Example Output Format:
[
  {
    "title": "Bluetooth Connection Issues",
    "keywords": [
      {
        "id": "123456789"
      }
    ]
  }
]

Keywords to segregate:
${JSON.stringify(keywordsWithData)}
`;

    const responseText = await generateText(PRO_MODEL, prompt, null, true);

    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '')
        .trim();
    }
    const groupings = JSON.parse(cleanedText);
    console.log(`✅ Generated ${groupings.length} keyword groups.`);
    return groupings;
  } catch (error) {
    console.error('❌ Error segregating keywords:', error.message);
    throw new Error(`Failed to segregate keywords: ${error.message}`);
  }
}
