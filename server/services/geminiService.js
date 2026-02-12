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
    const prompt = `You are a professional scriptwriter for "Softfix Central," a YouTube channel known for clear, efficient tech tutorials. Create a narration script for a video about: "${topic.topicName}".${topic.description}

SCRIPT STRUCTURE:

OPENING (vary the phrasing each time):
- Begin with "In this video, [topic/what viewers will learn]"
- Smoothly transition to asking viewers to subscribe and like
- Include "let's get straight into this video" or a natural variation
- Flow should feel conversational, not formulaic

INTRODUCTION (100-200 characters):
Provide a brief, engaging setup that does ONE or MORE of these:
- Identify the problem viewers are facing
- Explain why this matters or when they'd need this
- Preview what will be covered
- Keep it concise and relevant

MAIN CONTENT:
- Present steps as flowing, continuous paragraphs—NOT numbered or bulleted lists
- Be precise and detailed, anticipating user questions
- Use transitional phrases like "Next," "Now," "After that," or "Once you've done this"
- Maintain a professional but approachable tone
- Assume viewers are following along in real-time

CLOSING (vary the phrasing each time):
- Brief thank you for watching
- Invite viewers to comment with questions or video requests
- Keep it under 30 words and natural

CRITICAL RULES:
- No headings, subheadings, or section labels in the output
- No numbered steps or bullet points
- Vary the subscribe/like call-to-action wording each time
- Vary the closing wording each time
- Smooth transitions between all sections
- Output ONLY the script—no meta-commentary, no explanations, no formatting markers

The script should sound like a knowledgeable friend walking someone through a process—direct, clear, and efficient.`;

    // Generate 2 variations with the same prompt
    const promises = [1, 2].map(async (i) => {
      console.log(`⏳ Generating script variation ${i}...`);
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
      console.log(`✅ Generated script variation ${i}`);
      return response.text;
    });

    const scripts = await Promise.all(promises);
    return scripts;
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
 * @returns {Array<{prompt: string, result: string}>}
 */
export async function generateNarrationScriptVariations(
  topic,
  description = '',
  prompts,
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
          const fullPrompt = `${customPrompt}

Topic: "${topic}"${descriptionText}`;

          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: fullPrompt,
            config: {
              tools: [
                {
                  googleSearch: {},
                },
              ],
            },
          });

          const result = response.text;
          console.log(`✅ Generated variation ${index + 1}/${prompts.length}`);

          return {
            prompt: customPrompt,
            result: result,
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
 * @returns {Array<{prompt: string, url: string}>}
 */
export async function generateThumbnailVariations(topic, title, prompts) {
  console.log(
    `🎨 Generating ${prompts.length} thumbnail variations for topic: ${topic}`,
  );

  try {
    // Generate all variations in parallel (but we'll add small delays to avoid rate limits)
    const results = [];

    for (let i = 0; i < prompts.length; i++) {
      try {
        console.log(
          `⏳ Generating thumbnail variation ${i + 1}/${prompts.length}...`,
        );

        const customPrompt = prompts[i];
        const fullPrompt = `${customPrompt}

Topic: "${topic}"
Title: "${title}"`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: [{ text: fullPrompt }],
        });

        const part = response?.candidates?.[0]?.content?.parts?.find(
          (p) => p.inlineData,
        );
        if (part) {
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
 * @returns {Array<{prompt: string, result: string}>}
 */
export async function generateTitleVariations(
  topic,
  description = '',
  narrationScript = '',
  prompts,
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
          const fullPrompt = `${customPrompt}

Topic: "${topic}"${descriptionText}${scriptText}`;

          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: fullPrompt,
            config: {
              tools: [
                {
                  googleSearch: {},
                },
              ],
            },
          });

          const result = response.text;
          console.log(
            `✅ Generated title variation ${index + 1}/${prompts.length}`,
          );

          return {
            prompt: customPrompt,
            result: result,
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

export async function generateYouTubeTitles(topic, script, description = '') {
  try {
    const descriptionText = description
      ? `\n\nAdditional context: ${description}`
      : '';
    const prompt = `You are a title creator for "Softfix Central," a YouTube channel known for straightforward, efficient tech tutorials. Generate exactly 20 optimized video titles based on:

Topic: "${topic}"${descriptionText}

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

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });

    const text = response.text;
    const titles = text
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

export async function generateYouTubeThumbnails(topic, title, script) {
  try {
    const thumbnails = [];
    console.log(`🎨 Starting thumbnail generation for: "${title}"`);

    for (let i = 0; i < 2; i++) {
      try {
        const designPrompt = `You are a thumbnail designer for "Softfix Central," a YouTube channel known for clear, professional tech tutorials. Create a single high-quality image containing a 3x3 grid of 9 distinct thumbnail variations for:

Topic: "${topic.topicName}"
Title: "${topic.selectedTitle}"
Description: "${topic.selectedDescription}"
Script: "${topic.selectedScript}"

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

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: [{ text: designPrompt }],
        });

        const part = response?.candidates?.[0]?.content?.parts?.find(
          (p) => p.inlineData,
        );
        if (part) {
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

export async function generateSEODescription(topic, script) {
  try {
    const prompt = `You are a YouTube SEO specialist for "Softfix Central," a tech tutorial channel. Generate a fully optimized video description for:

Topic: "${topic}"
Title: "${title}"
Script: ${script}

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
    const prompt = `You are a tag strategist for "Softfix Central," a tech tutorial YouTube channel. Generate 15-25 highly targeted tags for:

Topic: "${topic}"
Title: "${title}"
Script: ${script}

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
