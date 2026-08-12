import express from 'express';
import multer from 'multer';
import Topic from '../models/Topic.js';
import Grouping from '../models/Grouping.js';
import { processTopicsNow } from '../services/topicProcessor.js';
import {
  generateYouTubeTitles,
  generateYouTubeThumbnails,
  generateSEODescription,
  generateTags,
  generateRecordingCues,
} from '../services/geminiService.js';
import { generateWAVAudio } from '../services/audioService.js';
import { deleteImageFromS3, uploadImageToS3, resolveMediaUrl } from '../services/s3Service.js';

const router = express.Router();

/**
 * Recursively resolves all relative media URLs in a topic object to signed S3 URLs
 */
async function resolveTopicMediaUrls(topicObj) {
  if (topicObj.selectedThumbnail) {
    topicObj.selectedThumbnail = await resolveMediaUrl(topicObj.selectedThumbnail);
  }
  if (topicObj.audioUrl) {
    topicObj.audioUrl = await resolveMediaUrl(topicObj.audioUrl);
  }
  if (topicObj.generatedThumbnails) {
    for (let i = 0; i < topicObj.generatedThumbnails.length; i++) {
      for (let j = 0; j < topicObj.generatedThumbnails[i].length; j++) {
        topicObj.generatedThumbnails[i][j].url = await resolveMediaUrl(topicObj.generatedThumbnails[i][j].url);
      }
    }
  }
  if (topicObj.thumbnailPromptResults) {
    for (let i = 0; i < topicObj.thumbnailPromptResults.length; i++) {
      topicObj.thumbnailPromptResults[i].url = await resolveMediaUrl(topicObj.thumbnailPromptResults[i].url);
    }
  }
  return topicObj;
}

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (.jpg, .png, .webp) are allowed'), false);
    }
  },
});

/**
 * POST /api/topics
 * Create a new topic for narration script generation
 */
router.post('/topics', async (req, res) => {
  try {
    const { topicName, description, stepByStepInstructions, groupingIds, userId } = req.body;

    if (!topicName || topicName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Topic name is required',
      });
    }

    const newTopic = new Topic({
      topicName: topicName.trim(),
      description: description || '',
      stepByStepInstructions: stepByStepInstructions || '',
      groupingIds: Array.isArray(groupingIds) ? groupingIds : [],
      userId: userId || 'default-user',
      status: 'completed',
    });

    await newTopic.save();

    if (newTopic.groupingIds && newTopic.groupingIds.length > 0) {
      await Grouping.updateMany(
        { _id: { $in: newTopic.groupingIds } },
        { $set: { isUsed: true } }
      );
    }

    console.log(`📝 New topic created: "${topicName}" (ID: ${newTopic._id})`);

    res.status(201).json({
      success: true,
      message: 'Topic created successfully.',
      data: newTopic,
    });
  } catch (error) {
    console.error('❌ Error creating topic:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error creating topic',
      error: error.message,
    });
  }
});

/**
 * GET /api/topics
 * Get all topics for the authenticated user (or all topics if no userId specified)
 */
router.get('/topics', async (req, res) => {
  try {
    const { userId } = req.query;
    const query = userId ? { userId } : {};

    const topics = await Topic.find(query).populate('groupingIds').sort({ createdAt: -1 });

    const topicsWithKeywords = await Promise.all(
      topics.map(async (topic) => {
        let topicObj = topic.toObject();
        topicObj.keywords = await topic.getKeywordsString();
        topicObj = await resolveTopicMediaUrls(topicObj);
        return topicObj;
      })
    );

    res.json({
      success: true,
      message: 'Topics retrieved successfully',
      count: topicsWithKeywords.length,
      data: topicsWithKeywords,
    });
  } catch (error) {
    console.error('❌ Error retrieving topics:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving topics',
      error: error.message,
    });
  }
});

/**
 * GET /api/topics/:id
 * Get a specific topic by ID
 */
router.get('/topics/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findById(id).populate('groupingIds');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    let topicObj = topic.toObject();
    topicObj.keywords = await topic.getKeywordsString();
    topicObj = await resolveTopicMediaUrls(topicObj);

    res.json({
      success: true,
      message: 'Topic retrieved successfully',
      data: topicObj,
    });
  } catch (error) {
    console.error('❌ Error retrieving topic:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving topic',
      error: error.message,
    });
  }
});

/**
 * GET /api/topics/status/all
 * Get topics grouped by status
 */
router.get('/status/all', async (req, res) => {
  try {
    const stats = await Topic.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCount = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    stats.forEach((stat) => {
      statusCount[stat._id] = stat.count;
    });

    res.json({
      success: true,
      message: 'Topic status statistics',
      data: statusCount,
    });
  } catch (error) {
    console.error('❌ Error retrieving status stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving status statistics',
      error: error.message,
    });
  }
});

/**
 * POST /api/process-now
 * Manually trigger the processor to process pending topics immediately
 */
router.post('/process-now', async (req, res) => {
  try {
    await processTopicsNow();
    res.json({
      success: true,
      message: 'Topic processing triggered successfully',
    });
  } catch (error) {
    console.error('❌ Error triggering processing:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error triggering processing',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/topics/:id
 * Delete a topic
 */
router.delete('/topics/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findByIdAndDelete(id);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    if (topic.groupingIds && topic.groupingIds.length > 0) {
      for (const groupId of topic.groupingIds) {
        const count = await Topic.countDocuments({ groupingIds: groupId });
        if (count === 0) {
          await Grouping.findByIdAndUpdate(groupId, { isUsed: false });
        }
      }
    }

    res.json({
      success: true,
      message: 'Topic deleted successfully',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error deleting topic:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting topic',
      error: error.message,
    });
  }
});

/**
 * POST /api/topics/:id/regenerate
 * Regenerate the narration script for a topic
 */
router.post('/topics/:id/regenerate', async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const topic = await Topic.findById(id);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    // Set status to pending for reprocessing
    topic.status = 'pending';
    topic.narrationScript = null;
    topic.errorMessage = null;
    topic.regenerationComments = comments || null;
    await topic.save();
    await topic.populate('groupingIds');

    console.log(
      `🔄 Topic regeneration triggered: "${topic.topicName}" (ID: ${topic._id})`,
    );

    // Trigger immediate processing
    await processTopicsNow();

    res.json({
      success: true,
      message: 'Narration script regeneration triggered',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error regenerating topic:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error regenerating topic',
      error: error.message,
    });
  }
});

/**
 * PUT /api/topics/:id/script
 * Manually update/edit the narration script
 */
router.put('/topics/:id/script', async (req, res) => {
  try {
    const { id } = req.params;
    const { narrationScript } = req.body;

    if (!narrationScript || narrationScript.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Narration script is required',
      });
    }

    const topic = await Topic.findByIdAndUpdate(
      id,
      {
        $set: {
          narrationScript: narrationScript.trim(),
          status: 'completed',
          processedAt: new Date(),
        },
        $push: {
          scriptVersions: {
            script: narrationScript.trim(),
            comments: 'Manual edit',
            generatedAt: new Date(),
          },
        },
      },
      { new: true },
    ).populate('groupingIds');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    console.log(
      `✏️ Topic script updated: "${topic.topicName}" (ID: ${topic._id})`,
    );

    res.json({
      success: true,
      message: 'Narration script updated successfully',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error updating topic script:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating topic script',
      error: error.message,
    });
  }
});

/**
 * PUT /api/topics/:id/description
 * Update the topic description
 */
router.put('/topics/:id/description', async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    if (description === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Description is required',
      });
    }

    const topic = await Topic.findByIdAndUpdate(
      id,
      {
        description: description.trim(),
      },
      { new: true },
    ).populate('groupingIds');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    console.log(
      `✏️ Topic description updated: "${topic.topicName}" (ID: ${topic._id})`,
    );

    res.json({
      success: true,
      message: 'Description updated successfully',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error updating topic description:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating topic description',
      error: error.message,
    });
  }
});

/**
 * PUT /api/topics/:id/keywords
 * Update the topic keywords
 */
router.put('/topics/:id/keywords', async (req, res) => {
  try {
    const { id } = req.params;
    const { keywords } = req.body;

    if (keywords === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Keywords are required',
      });
    }

    const topic = await Topic.findByIdAndUpdate(
      id,
      {
        keywords: keywords.trim(),
        groupingIds: [], // Clear groupingIds so manual edits take precedence
      },
      { new: false },
    );

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    if (topic.groupingIds && topic.groupingIds.length > 0) {
      for (const groupId of topic.groupingIds) {
        const count = await Topic.countDocuments({ groupingIds: groupId });
        if (count === 0) {
          await Grouping.findByIdAndUpdate(groupId, { isUsed: false });
        }
      }
    }

    const updatedTopic = await Topic.findById(id).populate('groupingIds');
    const topicObj = updatedTopic.toObject();
    topicObj.keywords = await updatedTopic.getKeywordsString();

    console.log(
      `✏️ Topic keywords updated: "${topic.topicName}" (ID: ${topic._id})`,
    );

    res.json({
      success: true,
      message: 'Keywords updated successfully',
      data: topicObj,
    });
  } catch (error) {
    console.error('❌ Error updating topic keywords:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating topic keywords',
      error: error.message,
    });
  }
});

/**
 * PUT /api/topics/:id/name
 * Update the topic name
 */
router.put('/topics/:id/name', async (req, res) => {
  try {
    const { id } = req.params;
    const { topicName } = req.body;

    if (!topicName || topicName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Topic name is required',
      });
    }

    const topic = await Topic.findByIdAndUpdate(
      id,
      {
        topicName: topicName.trim(),
      },
      { new: true },
    ).populate('groupingIds');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    const topicObj = topic.toObject();
    topicObj.keywords = await topic.getKeywordsString();

    console.log(
      `✏️ Topic name updated to: "${topic.topicName}" (ID: ${topic._id})`,
    );

    res.json({
      success: true,
      message: 'Topic name updated successfully',
      data: topicObj,
    });
  } catch (error) {
    console.error('❌ Error updating topic name:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating topic name',
      error: error.message,
    });
  }
});

/**
 * PUT /api/topics/:id/instructions
 * Update the topic step-by-step instructions
 */
router.put('/topics/:id/instructions', async (req, res) => {
  try {
    const { id } = req.params;
    const { stepByStepInstructions } = req.body;

    if (stepByStepInstructions === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Step-by-step instructions are required',
      });
    }

    const topic = await Topic.findByIdAndUpdate(
      id,
      {
        stepByStepInstructions: stepByStepInstructions.trim(),
      },
      { new: true },
    ).populate('groupingIds');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    console.log(
      `✏️ Topic instructions updated: "${topic.topicName}" (ID: ${topic._id})`,
    );

    res.json({
      success: true,
      message: 'Instructions updated successfully',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error updating topic instructions:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating topic instructions',
      error: error.message,
    });
  }
});

/**
 * POST /api/topics/:id/generate-titles
 * Generate SEO-optimized YouTube titles for a topic
 */
router.post('/topics/:id/generate-titles', async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findById(id);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }



    console.log(
      `🎬 Generating YouTube titles for: "${topic.topicName}" (ID: ${topic._id})`,
    );

    // Locally create the title with top search volume keywords (without using Gemini AI)
    let titleStr = '';
    const keywords = await topic.getKeywordsString();
    if (keywords.trim()) {
      // Split by comma or newline
      const items = keywords.split(/[,\n]/);
      const kwList = [];
      for (let item of items) {
        if (!item.trim()) continue;
        const parts = item.split('|');
        const kwName = parts[0]?.trim();
        const kwVolume = parseInt(parts[1]?.trim()) || 0;
        if (kwName) {
          kwList.push({ name: kwName, volume: kwVolume });
        }
      }

      // Sort by search volume descending
      kwList.sort((a, b) => b.volume - a.volume);

      const titleParts = [];
      let currentLen = 0;

      for (const kw of kwList) {
        // Capitalize words nicely
        const capitalized = kw.name
          .split(/\s+/)
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
          // Joined with " | " which is 3 characters
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

    // Fallback: if no keywords are provided or parsed, fallback to capitalized topicName
    if (!titleStr) {
      titleStr = topic.topicName
        .split(/\s+/)
        .map((w) =>
          w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '',
        )
        .join(' ');
      if (titleStr.length > 100) {
        titleStr = titleStr.substring(0, 100);
      }
    }

    const titles = [titleStr];

    // Update topic with generated titles
    topic.generatedTitles = titles;
    topic.level = 'title';
    await topic.save();

    console.log(
      `✅ Generated ${titles.length} titles for topic: "${topic.topicName}"`,
    );

    res.json({
      success: true,
      message: 'YouTube titles generated successfully',
      data: {
        _id: topic._id,
        topicName: topic.topicName,
        generatedTitles: titles,
      },
    });
  } catch (error) {
    console.error('❌ Error generating titles:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error generating titles',
      error: error.message,
    });
  }
});

/**
 * POST /api/topics/:id/select-title
 * Select one of the generated titles
 */
router.post('/topics/:id/select-title', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    const topic = await Topic.findByIdAndUpdate(
      id,
      {
        selectedTitle: title.trim(),
        level: 'thumbnail',
      },
      { new: true },
    ).populate('groupingIds');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    console.log(`✅ Title selected for topic "${topic.topicName}": "${title}"`);

    res.json({
      success: true,
      message: 'Title selected successfully',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error selecting title:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error selecting title',
      error: error.message,
    });
  }
});

/**
 * PUT /api/topics/:id/update-title
 * Update/edit the selected title
 */
router.put('/topics/:id/update-title', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    const topic = await Topic.findByIdAndUpdate(
      id,
      {
        selectedTitle: title.trim(),
      },
      { new: true },
    ).populate('groupingIds');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    console.log(`✏️ Title updated for topic "${topic.topicName}": "${title}"`);

    res.json({
      success: true,
      message: 'Title updated successfully',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error updating title:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating title',
      error: error.message,
    });
  }
});

/**
 * POST /api/topics/:id/generate-thumbnails
 * Generate YouTube thumbnails for a topic
 */
router.post('/topics/:id/generate-thumbnails', async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findById(id);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }



    if (!topic.selectedTitle) {
      return res.status(400).json({
        success: false,
        message: 'Topic must have a selected title',
      });
    }

    console.log(
      `🎨 Generating thumbnails for: "${topic.topicName}" (ID: ${topic._id})`,
    );

    // Generate thumbnails using Gemini AI
    const thumbnails = await generateYouTubeThumbnails(
      topic.topicName,
      topic.selectedTitle,
      topic.narrationScript,
      await topic.getKeywordsString()
    );

    // Handle migration of old flat array data if necessary
    if (topic.generatedThumbnails && topic.generatedThumbnails.length > 0 && !Array.isArray(topic.generatedThumbnails[0])) {
      topic.generatedThumbnails = [topic.generatedThumbnails];
    }

    // Append new thumbnails pair to the array
    topic.generatedThumbnails.push(thumbnails);
    topic.level = 'thumbnail';
    await topic.save();

    console.log(
      `✅ Generated ${thumbnails.length} thumbnails for topic: "${topic.topicName}"`,
    );

    res.json({
      success: true,
      message: 'YouTube thumbnails generated successfully',
      data: {
        _id: topic._id,
        topicName: topic.topicName,
        generatedThumbnails: topic.generatedThumbnails,
      },
    });
  } catch (error) {
    console.error('❌ Error generating thumbnails:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error generating thumbnails',
      error: error.message,
    });
  }
});

/**
 * POST /api/topics/:id/upload-thumbnail
 * Upload a manual thumbnail for a topic
 */
router.post('/topics/:id/upload-thumbnail', upload.single('thumbnail'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No thumbnail file uploaded',
      });
    }

    const topic = await Topic.findById(id);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    // Upload to S3
    const s3Url = await uploadImageToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Update topic
    topic.selectedThumbnail = s3Url;
    topic.level = 'finished'; // Move to next level
    await topic.save();
    await topic.populate('groupingIds');

    console.log(`✅ Manual thumbnail uploaded and selected for topic "${topic.topicName}"`);

    res.json({
      success: true,
      message: 'Thumbnail uploaded and selected successfully',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error uploading thumbnail:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error uploading thumbnail',
      error: error.message,
    });
  }
});

/**
 * POST /api/topics/:id/skip-thumbnail
 * Skip thumbnail upload for a topic
 */
router.post('/topics/:id/skip-thumbnail', async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findByIdAndUpdate(
      id,
      {
        selectedThumbnail: 'skipped',
        level: 'finished',
      },
      { new: true },
    ).populate('groupingIds');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    console.log(`⏭️ Thumbnail skipped for topic "${topic.topicName}"`);

    res.json({
      success: true,
      message: 'Thumbnail skipped successfully',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error skipping thumbnail:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error skipping thumbnail',
      error: error.message,
    });
  }
});

/**
 * POST /api/topics/:id/select-thumbnail
 * Select one of the generated thumbnails
 */
router.post('/topics/:id/select-thumbnail', async (req, res) => {
  try {
    const { id } = req.params;
    const { thumbnail } = req.body;

    if (!thumbnail) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail is required',
      });
    }

    const topic = await Topic.findByIdAndUpdate(
      id,
      {
        selectedThumbnail: thumbnail,
        level: 'finished',
      },
      { new: true },
    ).populate('groupingIds');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    console.log(`✅ Thumbnail selected for topic "${topic.topicName}"`);

    res.json({
      success: true,
      message: 'Thumbnail selected successfully',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error selecting thumbnail:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error selecting thumbnail',
      error: error.message,
    });
  }
});

/**
 * POST /api/topics/:id/generate-extra-assets
 * Generate SEO description, tags, timestamps, and MP3 audio
 */
router.post('/topics/:id/generate-extra-assets', async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findById(id);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    if (!topic.narrationScript) {
      return res.status(400).json({
        success: false,
        message: 'Narration script not generated yet',
      });
    }

    if (!topic.selectedTitle) {
      return res.status(400).json({
        success: false,
        message: 'Title not selected yet',
      });
    }

    console.log(`🎯 Generating extra assets for topic "${topic.topicName}"...`);

    // Generate all assets simultaneously
    const [seoDescription, tags, audioUrl] = await Promise.all([
      generateSEODescription(
        topic.topicName,
        topic.narrationScript,
        topic.selectedTitle,
        await topic.getKeywordsString()
      ),
      generateTags(topic.topicName, topic.narrationScript, topic.selectedTitle, await topic.getKeywordsString()),
      generateWAVAudio(topic.narrationScript, topic._id),
    ]);

    // Update topic with generated assets
    topic.seoDescription = seoDescription;
    topic.tags = tags;
    topic.audioUrl = audioUrl;
    topic.audioVersions.push({ audioUrl, generatedAt: new Date() });

    await topic.save();

    console.log(`✅ Extra assets generated for topic "${topic.topicName}"`);

    res.json({
      success: true,
      message: 'Extra assets generated successfully',
      data: {
        seoDescription,
        tags,
        audioUrl,
      },
    });
  } catch (error) {
    console.error('❌ Error generating extra assets:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error generating extra assets',
      error: error.message,
    });
  }
});

/**
 * POST /api/topics/:id/mark-editing
 * Mark a topic as editing (before uploaded)
 */
router.post('/topics/:id/mark-editing', async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findById(id);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    if (!topic.seoDescription || !topic.audioUrl) {
      return res.status(400).json({
        success: false,
        message: 'Extra assets must be generated before marking as editing',
      });
    }

    topic.level = 'editing';
    await topic.save();
    await topic.populate('groupingIds');

    console.log(`✏️ Topic marked as editing: "${topic.topicName}"`);

    res.json({
      success: true,
      message: 'Topic marked as editing successfully',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error marking topic as editing:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error marking topic as editing',
      error: error.message,
    });
  }
});

/**
 * POST /api/topics/:id/mark-uploaded
 * Mark a topic as uploaded (final step)
 */
router.post('/topics/:id/mark-uploaded', async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findById(id);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    if (!topic.seoDescription || !topic.audioUrl) {
      return res.status(400).json({
        success: false,
        message: 'Extra assets must be generated before marking as uploaded',
      });
    }

    topic.level = 'uploaded';
    await topic.save();
    await topic.populate('groupingIds');

    console.log(`📤 Topic marked as uploaded: "${topic.topicName}"`);

    res.json({
      success: true,
      message: 'Topic marked as uploaded successfully',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error marking topic as uploaded:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error marking topic as uploaded',
      error: error.message,
    });
  }
});

/**
 * POST /api/topics/:id/generate-cues
 * Generate recording cues for a topic based on narration script
 */
router.post('/topics/:id/generate-cues', async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findById(id);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    if (!topic.narrationScript) {
      return res.status(400).json({
        success: false,
        message: 'Narration script not generated yet',
      });
    }

    console.log(`🎯 Generating recording cues for topic "${topic.topicName}"...`);

    const recordingCues = await generateRecordingCues(topic.narrationScript);

    topic.recordingCues = recordingCues;
    await topic.save();

    console.log(`✅ Recording cues generated for topic "${topic.topicName}"`);

    res.json({
      success: true,
      message: 'Recording cues generated successfully',
      data: topic,
    });
  } catch (error) {
    console.error('❌ Error generating recording cues:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error generating recording cues',
      error: error.message,
    });
  }
});

/**
 * POST /api/topics/:id/regenerate-audio
 * Regenerate WAV audio for a topic
 */
router.post('/topics/:id/regenerate-audio', async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findById(id);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    if (!topic.narrationScript) {
      return res.status(400).json({
        success: false,
        message: 'Narration script not generated yet',
      });
    }

    console.log(`🎯 Regenerating WAV audio for topic "${topic.topicName}"...`);

    const audioUrl = await generateWAVAudio(topic.narrationScript, topic._id);

    topic.audioUrl = audioUrl;
    topic.audioVersions.push({ audioUrl, generatedAt: new Date() });
    await topic.save();

    console.log(`✅ Audio regenerated for topic "${topic.topicName}"`);

    res.json({
      success: true,
      message: 'Audio regenerated successfully',
      data: {
        audioUrl,
      },
    });
  } catch (error) {
    console.error('❌ Error regenerating audio:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error regenerating audio',
      error: error.message,
    });
  }
});

/**
 * PUT /api/topics/:id/audio
 * Manually update the audio URL
 */
router.put('/topics/:id/audio', async (req, res) => {
  try {
    const { id } = req.params;
    const { audioUrl } = req.body;

    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        message: 'Audio URL is required',
      });
    }

    const topic = await Topic.findByIdAndUpdate(
      id,
      { audioUrl: audioUrl.trim() },
      { new: true }
    ).populate('groupingIds');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    const topicObj = await resolveTopicMediaUrls(topic.toObject());

    res.json({
      success: true,
      message: 'Audio URL updated successfully',
      data: topicObj,
    });
  } catch (error) {
    console.error('❌ Error updating audio URL:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating audio URL',
      error: error.message,
    });
  }
});

export default router;
