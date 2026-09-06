import OpenAI from 'openai';
import { uploadImageToS3 } from './s3Service.js';

const apiKey =
  process.env.OPENAI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.API_KEY ||
  '';

const baseURL =
  process.env.OPENAI_BASE_URL ||
  process.env.OPENAI_ENDPOINT ||
  (process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY
    ? 'https://api.openai.com/v1'
    : 'https://generativelanguage.googleapis.com/v1beta/openai/');

const openai = new OpenAI({
  apiKey: apiKey || 'missing-key',
  baseURL: baseURL,
});

// Single model used across all text operations
export const MODEL =
  process.env.OPENAI_MODEL ||
  process.env.MODEL ||
  process.env.GEMINI_MODEL ||
  'auto';

export const IMAGE_MODEL =
  process.env.OPENAI_IMAGE_MODEL ||
  process.env.IMAGE_MODEL ||
  'dall-e-3';

// Export aliases for backwards compatibility
export const PRO_MODEL = MODEL;
export const FLASH_MODEL = MODEL;

if (!apiKey) {
  console.warn(
    '⚠️ Warning: No API key found. Please set OPENAI_API_KEY or GEMINI_API_KEY in your .env.',
  );
} else {
  console.log(
    `🎯 OpenAI API Initialized (Endpoint: ${baseURL}, Model: ${MODEL})`,
  );
}

function stripMarkdownFence(text) {
  let cleaned = (text || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/```$/, '')
      .trim();
  }
  return cleaned;
}

/**
 * Robust helper to extract text content from OpenAI completion responses
 */
function getTextFromResponse(result) {
  if (!result) return '';
  if (result.choices?.[0]?.message?.content !== undefined) {
    return result.choices[0].message.content || '';
  }
  if (typeof result === 'string') {
    return result;
  }
  return '';
}

/**
 * Helper to call OpenAI endpoint for text generation with optional features
 */
async function generateText(
  arg1,
  arg2 = null,
  arg3 = false,
) {
  try {
    // Supports both generateText(prompt, systemInstruction, isJson)
    // and legacy generateText(modelName, prompt, systemInstruction, isJson)
    let prompt;
    let systemInstruction = null;
    let isJson = false;

    if (typeof arg2 === 'string') {
      prompt = arg2;
      systemInstruction = typeof arg3 === 'string' ? arg3 : null;
      isJson = Boolean(arguments[3] ?? (typeof arg3 === 'boolean' ? arg3 : false));
    } else {
      prompt = arg1;
      systemInstruction = arg2;
      isJson = Boolean(arg3);
    }

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const requestPayload = {
      model: MODEL,
      messages: messages,
    };

    const response = await openai.chat.completions.create(requestPayload);
    return getTextFromResponse(response);
  } catch (error) {
    console.error('❌ Error in generateText (OpenAI API):', error.message);
    throw error;
  }
}

/**
 * Helper to call OpenAI endpoint for image generation
 */
async function generateImage(arg1, arg2 = 0.9) {
  try {
    const prompt = typeof arg2 === 'string' ? arg2 : arg1;
    const imgPayload = {
      model: IMAGE_MODEL,
      prompt: prompt,
      n: 1,
      response_format: 'b64_json',
      size: '1024x1024',
    };

    const imgResponse = await openai.images.generate(imgPayload);
    const b64 = imgResponse.data?.[0]?.b64_json;
    if (b64) {
      return { inlineData: { data: b64, mimeType: 'image/png' } };
    }

    const imgUrl = imgResponse.data?.[0]?.url;
    if (imgUrl) {
      const resp = await fetch(imgUrl);
      const arrayBuf = await resp.arrayBuffer();
      return {
        inlineData: {
          data: Buffer.from(arrayBuf).toString('base64'),
          mimeType: 'image/png',
        },
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Error in generateImage (OpenAI API):', error.message);
    throw error;
  }
}

export async function generateRecordingCues(script) {
  try {
    const prompt = `Given the following script of a tech tutorial YouTube video, list all the key cues that will guide me while recording the screen (stand-alone screen recording, without narration).
    
Format requirements:
- Use clean, structured Markdown format.
- Use headers (like ##), lists (ordered or unordered), bold text (**bold**), or inline code (\`UI elements/buttons\`) where helpful.
- Keep the cues extremely concise, brief, and action-oriented. Do not include lengthy explanations or paragraphs.
- Return ONLY the cues.
- Do NOT include any introductory greetings, meta-commentary, notes, or outro.
- Do NOT wrap the entire output in code blocks like \`\`\`markdown or \`\`\`. Just return the raw markdown content.

Script:
"${script}"`;
    
    console.log('⏳ Generating recording cues...');
    let responseText = await generateText(prompt);
    console.log('✅ Generated recording cues');
    
    // Clean up markdown code blocks if the model wrapped the response
    if (responseText) {
      responseText = responseText.trim();
      if (responseText.startsWith('```markdown')) {
        responseText = responseText.substring(11).trim();
      } else if (responseText.startsWith('```')) {
        responseText = responseText.substring(3).trim();
      }
      if (responseText.endsWith('```')) {
        responseText = responseText.substring(0, responseText.length - 3).trim();
      }
    }
    
    return responseText;
  } catch (error) {
    console.error('❌ Error generating recording cues:', error.message);
    throw new Error(`Failed to generate recording cues: ${error.message}`);
  }
}

export async function generateNarrationScript(
  topic,
  videoTitle,
  description = '',
  stepByStepInstructions = '',
  keywords = '',
  regenerationComments = null,
) {
//	console.log(keywords);
  try {
    const titleText = videoTitle
      ? `\n\nVideo Title: "${videoTitle}"`
      : '';
    const descriptionText = description
      ? `\n\nAdditional context: ${description}`
      : '';
    const stepByStepInstructionsText = stepByStepInstructions
      ? `\n\nStep-by-step instructions to follow/incorporate:\n${stepByStepInstructions}`
      : '';
    const stepsText = stepByStepInstructionsText;
    const keywordsText = keywords
      ? `\nKeywords: ${keywords}\nMake sure to incorporate these keywords into the script, but ONLY if they sound natural or make sense in a sentence, and ensure the resulting sentence also makes complete sense.`
      : '';
    const additionalInstructionsText = regenerationComments
      ? `\n\nREGENERATION FEEDBACK / COMMENTS:\nPlease rewrite the script taking into account the following feedback from the user to improve or adjust the script:\n"${regenerationComments}"`
      : '';

    let prompt = `You are a professional scriptwriter for "Softfix Central," a YouTube channel that publishes clear, efficient tech tutorials solving everyday software and computer problems — Windows, Google Chrome, Excel, FL Studio, and similar everyday tools. Create a narration script for a screen-recorded tutorial video about: "${topic}".${titleText}${descriptionText}${keywordsText}${stepsText}${additionalInstructionsText}

NARRATION CONTEXT (read carefully):
This script will be read aloud over a screen recording. The viewer is watching the exact steps happen on their own screen in real time while listening to you. Every sentence in the main content should feel like you're looking at the same screen as the viewer — guiding their eyes to buttons, menus, and results as they appear, not describing the process in the abstract.

SCRIPT STRUCTURE:

OPENING (follow this exact pattern every time):
- Start with the video topic phrased as a question or short statement — exactly like the title of the video. Examples: "How to hide apps on iPhone." / "What's the best free VPN for a Windows PC or laptop?"
- Immediately follow with: "In this video, I'm going to show you [specific description of what will be demonstrated — be precise about devices/platforms/scope]."
- Then add the engagement line in this exact form: "And if this video helps you, please consider giving it a like, and also subscribe to my channel because that really helps me out."
- Do NOT say "let's get straight into it" or similar — go directly from the engagement line into the main content

MAIN CONTENT (follow the provided steps — do not invent or skip steps):
- Go straight into the first step immediately after the opening — no separate setup, framing, or "why this matters" paragraph
- Turn the step-by-step outline into flowing, continuous paragraphs—NOT numbered or bulleted lists
- Narrate each action as it would appear on screen: name the exact menu, button, setting, or option the viewer should look for, and describe what happens after they click or select it
- Be precise and detailed, anticipating points of confusion (e.g., what to do if a menu looks different or an option is missing)
- Use transitional phrases like "Next," "Now," "After that," "Once you've done this," or "You'll now see"
- Maintain a professional but approachable tone
- Assume viewers are following along on their own screen in real time, one action at a time
- Stay faithful to the provided outline — expand it with natural narration detail, but don't add steps it doesn't imply

KEYWORD INTEGRATION:
- Weave the provided keywords into the script naturally, wherever they fit the sentence
- Prioritize keywords with higher search volume — they should appear earlier and/or more often than lower-volume keywords
- Never force a keyword in a way that breaks natural sentence flow or reads like a list

CLOSING (vary the phrasing each time):
- Brief thank you for watching
- Invite viewers to comment with questions or video requests
- Keep it under 30 words and natural

CRITICAL RULES:
- No headings, subheadings, or section labels in the output
- No numbered steps or bullet points
- Follow the opening pattern exactly as specified — do not vary its wording or structure
- Vary the closing wording each time
- Smooth transition directly from the opening into the first step of main content
- Output ONLY the script—no meta-commentary, no explanations, no formatting markers
- If "Additional Instructions" are provided above, they override any rule in this prompt they conflict with — follow them exactly. If none are provided, follow the default structure and tone above.
- If the provided instructions or context include any web links or URLs, DO NOT include the raw URL in the narration script. Instead, simply say "the link will be in the description of this video" at the appropriate moment.

VOICE & TONE (TTS OPTIMIZATION):
Write this as spoken narration for a calm, knowledgeable tech-support voice — not documentation.
Use contractions. Vary sentence length. Use natural connector phrases ("Alright,", "Now,", "Once that's done,") between steps instead of always starting a new sentence cold.
Insert [short pause] before naming a specific button, menu, or click target, and after confirming a step is complete.
Insert [long pause] between major sections (setup vs. install vs. usage).
Keep tone understated — no hype, no exclamation-heavy enthusiasm.
The script should sound like a knowledgeable friend sitting beside the viewer, narrating their own screen back to them as they work through it — direct, clear, and efficient.`;

    console.log(`⏳ Generating narration script...`);
    const responseText = await generateText(prompt);
    console.log(`✅ Generated narration script`);

    return [responseText];
  } catch (error) {
    console.error('❌ Error generating narration script:', error.message);
    throw new Error(`Failed to generate narration script: ${error.message}`);
  }
}

/**
 * Annotates the narration script with section-specific director's notes for TTS.
 */
export async function annotateScriptChunks(script) {
  const paragraphs = script.split(/\n\n+/).filter(p => p.trim());
  const prompt = `Here is a tutorial narration script split into ${paragraphs.length} paragraphs.
For each paragraph, assign the best fitting section modifier from the following list:

- "This is the opening — sound a touch more upbeat and welcoming, like you're glad to help." (Intro/hook)
- "This is an instructional section — stay clear, patient, and measured. Give exact click targets a beat of emphasis." (Step-by-step)
- "This part matters for accuracy — sound slightly more careful and deliberate here." (Troubleshooting/warning)
- "This is the payoff moment — let a little quiet satisfaction come through, nothing showy." (Feature reveal / payoff)
- "This is the closing — sound relaxed and genuinely friendly, not scripted." (Outro/CTA)

Return ONLY a JSON array of strings, where each string is the exact modifier (without the parentheses type label) for the corresponding paragraph in order. There must be exactly ${paragraphs.length} strings in the array.

Paragraphs:
${paragraphs.map((p, i) => `[Paragraph ${i + 1}]:\n${p}`).join('\n\n')}
`;

  try {
    const responseText = await generateText(prompt, null, true);
    let modifiers = JSON.parse(stripMarkdownFence(responseText));
    if (!Array.isArray(modifiers) && typeof modifiers === 'object' && modifiers !== null) {
      const possibleArray = Object.values(modifiers).find(Array.isArray);
      if (possibleArray) modifiers = possibleArray;
    }
    return paragraphs.map((text, i) => ({ text, modifier: (Array.isArray(modifiers) && modifiers[i]) || "This is an instructional section — stay clear, patient, and measured. Give exact click targets a beat of emphasis." }));
  } catch (e) {
    console.error("❌ Error generating script chunk annotations:", e.message);
    // Fallback to instructional modifier for all chunks if it fails
    const fallbackModifier = "This is an instructional section — stay clear, patient, and measured. Give exact click targets a beat of emphasis.";
    return paragraphs.map(text => ({ text, modifier: fallbackModifier }));
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

          const responseText = await generateText(fullPrompt);
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

        const part = await generateImage(fullPrompt, 0.9);
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

          const responseText = await generateText(fullPrompt);
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

    const responseText = await generateText(prompt);

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

        const part = await generateImage(designPrompt, 0.9);
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

/**
 * Generate YouTube video chapters from a timestamped transcript.
 * @param {string} transcript - User-provided timestamped transcript
 * @param {string} topic - Topic name
 * @param {string} title - Selected video title
 * @returns {Promise<Array<{time: string, description: string}>>}
 */
export async function generateVideoChapters(transcript, topic = '', title = '') {
  try {
    const contextParts = [];
    if (title) contextParts.push(`Video Title: "${title}"`);
    if (topic) contextParts.push(`Topic: "${topic}"`);
    const contextText = contextParts.length
      ? `\n${contextParts.join('\n')}\n`
      : '';

    const prompt = `You are a YouTube chapter editor for "Softfix Central," a tech tutorial channel. Create video chapters from this timestamped transcript.
${contextText}
Transcript:
${transcript}

CHAPTER RULES:
- Produce 5-12 chapters covering distinct sections of the video (intro, major steps, closing). Do not create a chapter for every tiny action.
- The FIRST chapter MUST start at 0:00 (or 00:00). If the transcript starts later, still use 0:00 for the opening chapter.
- Use the transcript timestamps as the source of truth. Chapter start times must correspond to real moments in the transcript, rounded to the nearest sensible second.
- Format times as M:SS or H:MM:SS (no leading hour unless the video is 1 hour+). Examples: 0:00, 0:45, 12:08, 1:02:15.
- Chapter titles should be short (3-8 words), specific, and useful in the YouTube description. Name the actual step or topic, not vague labels like "Part 2".
- Do not invent content that is not in the transcript.
- Chapters must be in chronological order with strictly increasing times.
- Return ONLY valid JSON: an array of objects with "time" and "description" keys.

Example:
[
  { "time": "0:00", "description": "Intro" },
  { "time": "0:38", "description": "Open Settings" }
]`;

    console.log('⏳ Generating video chapters...');
    const responseText = await generateText(prompt, null, true);
    console.log('✅ Generated video chapters');

    let parsed = JSON.parse(stripMarkdownFence(responseText));
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
      const possibleArray = Object.values(parsed).find(Array.isArray);
      if (possibleArray) parsed = possibleArray;
    }
    if (!Array.isArray(parsed)) {
      throw new Error('Chapter generator did not return an array');
    }

    const chapters = parsed
      .map((item) => ({
        time: String(item.time || item.timestamp || '').trim(),
        description: String(item.description || item.title || item.name || '').trim(),
      }))
      .filter((item) => item.time && item.description);

    if (chapters.length === 0) {
      throw new Error('No valid chapters were generated');
    }

    if (chapters[0].time !== '0:00' && chapters[0].time !== '00:00') {
      chapters[0] = { ...chapters[0], time: '0:00' };
    }

    return chapters;
  } catch (error) {
    console.error('❌ Error generating video chapters:', error.message);
    throw new Error(`Failed to generate video chapters: ${error.message}`);
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

LINKS (if applicable):
- If the topic or script mentions any web links (e.g., login pages, download links) that should be in the description, place them at the VERY TOP of the description (before the hook).
- Extract the link and create a clear label for it based on context. 
- Format: [Label] - [Link] (e.g., "vidIQ Login Page - https://app.vidiq.com/auth/login")

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

    const responseText = await generateText(prompt);
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

    const responseText = await generateText(prompt);

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
      `🔍 Filtering non-English keywords from ${keywordsArray.length} items...`,
    );

    if (!keywordsArray || keywordsArray.length === 0) {
      return [];
    }

    const CHUNK_SIZE = 250;
    const allEnglishKeywords = [];

    for (let i = 0; i < keywordsArray.length; i += CHUNK_SIZE) {
      const chunk = keywordsArray.slice(i, i + CHUNK_SIZE);
      const prompt = `You are a language detection assistant. Given the following list of keywords, return ONLY a JSON array containing the keywords that are in English. Exclude any keywords that are primarily in another language.

CRITICAL RULES:
1. Do NOT deduplicate, merge, or filter out similar or closely-related keywords.
2. Every unique keyword string from the input (even if they are minor variations of each other, e.g., 'idm alternate' vs 'idm alternative', or 'idm alternative for pc' vs 'idm alternative for pc free') must be kept in the output array if they are in English.
3. Do NOT add markdown formatting around the output, just return the raw JSON array of strings.

Keywords to filter:
${JSON.stringify(chunk)}
`;

      const responseText = await generateText(prompt, null, true);

      try {
        let englishKeywords = JSON.parse(stripMarkdownFence(responseText));
        if (!Array.isArray(englishKeywords) && typeof englishKeywords === 'object' && englishKeywords !== null) {
          const possibleArray = Object.values(englishKeywords).find(Array.isArray);
          if (possibleArray) englishKeywords = possibleArray;
        }
        if (Array.isArray(englishKeywords)) {
          allEnglishKeywords.push(...englishKeywords);
        }
      } catch (parseErr) {
        console.warn('⚠️ Could not parse language detection response for chunk, keeping all items:', parseErr.message);
        allEnglishKeywords.push(...chunk);
      }

      if (i + CHUNK_SIZE < keywordsArray.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(
      `✅ Filtered down to ${allEnglishKeywords.length} English keywords.`,
    );
    return allEnglishKeywords;
  } catch (error) {
    console.error('❌ Error filtering keywords:', error.message);
    throw new Error(`Failed to filter non-English keywords: ${error.message}`);
  }
}

function parseCustomGroupsList(customGroupsList) {
  if (!customGroupsList || !String(customGroupsList).trim()) return [];

  const parts = String(customGroupsList).split(/[\n,]+/);
  const parsed = [];
  const seen = new Set();

  for (const part of parts) {
    let line = part.trim();
    if (!line) continue;
    if (line.startsWith('-')) line = line.substring(1).trim();

    const splitIndex = line.indexOf('|');
    const title = (splitIndex !== -1 ? line.substring(0, splitIndex) : line).trim();
    const description = splitIndex !== -1 ? line.substring(splitIndex + 1).trim() : '';
    if (!title) continue;

    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push({ title, description });
  }

  return parsed;
}

function normalizeGroupingTitle(rawTitle) {
  let title = String(rawTitle || '').trim();
  if (title.startsWith('-')) title = title.substring(1).trim();
  const pipeIndex = title.indexOf('|');
  if (pipeIndex !== -1) {
    title = title.substring(0, pipeIndex).trim();
  }
  return title;
}

export async function segregateKeywordsIntoGroups(keywordsWithData, customGroupsList = '') {
  try {
    console.log(
      `🧠 Segregating ${keywordsWithData.length} keywords into groups...`,
    );

    if (!keywordsWithData || keywordsWithData.length === 0) {
      return [];
    }

    const providedGroups = parseCustomGroupsList(customGroupsList);
    let providedGroupsInstruction = '';
    if (providedGroups.length > 0) {
      const formattedGroups = providedGroups
        .map((g) =>
          g.description
            ? `- Title: "${g.title}"\n  Description: ${g.description}`
            : `- Title: "${g.title}"`,
        )
        .join('\n');

      providedGroupsInstruction = `
I have provided a specific list of groups (with titles and descriptions) below. You MUST segregate the keywords into these provided groups based on their description.
If a keyword fits into one or more of these provided groups, you must add it to them.
You can create additional groups if you find keywords that do not fit into any of the provided groups, but DO NOT skip any of the provided groups if there are keywords that fit them.

CRITICAL TITLE RULE: Each provided group has a Title and an optional Description. The JSON "title" field MUST be exactly the Title only. NEVER copy the Description into the title. NEVER use "Title | Description" as the group title.

Provided Groups:
${formattedGroups}
`;
    }

    // Chunk keywords to ensure the model can comfortably process and return complete JSON without hitting token limits
    const CHUNK_SIZE = 100;
    const chunks = [];
    for (let i = 0; i < keywordsWithData.length; i += CHUNK_SIZE) {
      chunks.push(keywordsWithData.slice(i, i + CHUNK_SIZE));
    }

    console.log(
      `📦 Split ${keywordsWithData.length} keywords into ${chunks.length} chunk(s) (max ${CHUNK_SIZE} keywords per chunk).`,
    );

    // Map of groupTitle (lowercase) -> { title: string, keywords: Array<{ id: string }> }
    const mergedGroupsMap = new Map();
    // Track keyword IDs already assigned to each group to prevent duplicates
    const groupKeywordIdSets = new Map();

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const currentChunk = chunks[chunkIndex];
      console.log(
        `⏳ Processing chunk ${chunkIndex + 1}/${chunks.length} (${currentChunk.length} keywords)...`,
      );

      const prompt = `You are an SEO grouping assistant. I have a list of keywords with their search volume, overall scores, competition scores, and ids. 
Segregate these keywords into logical groups based on matching interest in the solution of the keyword or question.
A keyword can be placed into multiple groups if it is appropriate.
${providedGroupsInstruction}

CRITICAL RULES FOR GROUPING:
1. EVERY SINGLE keyword ID from the input list MUST be assigned to at least one group. Do NOT discard, omit, or leave out any keyword under any circumstances.
2. The "title" of each group must be a short group name only. If a provided group is "Title | Description", use only "Title". Do not create a second group whose title is the full "Title | Description" string.
3. DO NOT deduplicate, merge, or discard keywords that have similar phrasing or meaning. You must treat similar keywords as distinct, unique items.
   - For example: if both 'idm alternative for pc' and 'idm alternative for pc free' are present, BOTH must be retained and assigned to groups.
   - For example: if both 'idm alternate' and 'idm alternative' are present, BOTH must be retained and assigned to groups.
   - Every input ID must find its way into the final grouped JSON structure.
4. Do not attempt to merge close synonyms or keyword variants into a single representative ID. Keep every ID unique and intact.

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
${JSON.stringify(currentChunk)}
`;

      const responseText = await generateText(prompt, null, true);

      let chunkGroupings = [];
      try {
        chunkGroupings = JSON.parse(stripMarkdownFence(responseText));
        if (!Array.isArray(chunkGroupings) && typeof chunkGroupings === 'object' && chunkGroupings !== null) {
          const possibleArray = Object.values(chunkGroupings).find(Array.isArray);
          if (possibleArray) chunkGroupings = possibleArray;
        }
        if (!Array.isArray(chunkGroupings)) {
          console.warn(`⚠️ Chunk ${chunkIndex + 1} did not return an array, fallback to default group.`);
          chunkGroupings = [];
        }
      } catch (parseErr) {
        console.error(`❌ Failed to parse JSON response for chunk ${chunkIndex + 1}:`, parseErr.message);
        chunkGroupings = [
          {
            title: "General",
            keywords: currentChunk.map((k) => ({ id: k.id })),
          },
        ];
      }

      // Track which IDs from the current chunk were assigned to at least one group
      const assignedChunkIds = new Set();

      for (const group of chunkGroupings) {
        if (!group || !group.title) continue;
        const cleanTitle = normalizeGroupingTitle(group.title);
        if (!cleanTitle) continue;
        const titleKey = cleanTitle.toLowerCase();

        if (!mergedGroupsMap.has(titleKey)) {
          mergedGroupsMap.set(titleKey, {
            title: cleanTitle,
            keywords: [],
          });
          groupKeywordIdSets.set(titleKey, new Set());
        }

        const targetGroup = mergedGroupsMap.get(titleKey);
        const targetIdSet = groupKeywordIdSets.get(titleKey);

        if (Array.isArray(group.keywords)) {
          for (const kw of group.keywords) {
            const kwId = kw?.id ? String(kw.id).trim() : null;
            if (kwId) {
              assignedChunkIds.add(kwId);
              if (!targetIdSet.has(kwId)) {
                targetIdSet.add(kwId);
                targetGroup.keywords.push({ id: kwId });
              }
            }
          }
        }
      }

      // Safeguard: Ensure no keyword in currentChunk was dropped
      const unassignedKeywords = currentChunk.filter(
        (k) => !assignedChunkIds.has(String(k.id)),
      );
      if (unassignedKeywords.length > 0) {
        console.warn(
          `⚠️ Chunk ${chunkIndex + 1}: ${unassignedKeywords.length} keywords were unassigned by the model. Adding to 'General' group.`,
        );
        const fallbackTitle = "General";
        const fallbackKey = fallbackTitle.toLowerCase();
        if (!mergedGroupsMap.has(fallbackKey)) {
          mergedGroupsMap.set(fallbackKey, {
            title: fallbackTitle,
            keywords: [],
          });
          groupKeywordIdSets.set(fallbackKey, new Set());
        }
        const fallbackGroup = mergedGroupsMap.get(fallbackKey);
        const fallbackIdSet = groupKeywordIdSets.get(fallbackKey);
        for (const unassigned of unassignedKeywords) {
          const uId = String(unassigned.id);
          if (!fallbackIdSet.has(uId)) {
            fallbackIdSet.add(uId);
            fallbackGroup.keywords.push({ id: uId });
          }
        }
      }

      console.log(`✅ Finished chunk ${chunkIndex + 1}/${chunks.length}`);

      // Short delay between chunks to avoid rate limiting
      if (chunkIndex < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    const finalGroupings = Array.from(mergedGroupsMap.values());
    console.log(`✅ Successfully segregated all keywords into ${finalGroupings.length} total groups.`);
    return finalGroupings;
  } catch (error) {
    console.error('❌ Error segregating keywords:', error.message);
    throw new Error(`Failed to segregate keywords: ${error.message}`);
  }
}
