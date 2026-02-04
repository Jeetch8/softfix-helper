import express from 'express';
import Topic from '../models/Topic.js';
import { processTopicsNow } from '../services/cronService.js';
import {
  generateYouTubeTitles,
  generateYouTubeThumbnails,
  generateSEODescription,
  generateTags,
  generateTimestamps,
} from '../services/geminiService.js';
import { generateMP3Audio } from '../services/audioService.js';
import { deleteImageFromS3 } from '../services/s3Service.js';

const router = express.Router();

/**
 * POST /api/topics
 * Create a new topic for narration script generation
 */
router.post('/topics', async (req, res) => {
  try {
    const { topicName, description, userId } = req.body;

    if (!topicName || topicName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Topic name is required',
      });
    }

    const newTopic = new Topic({
      topicName: topicName.trim(),
      description: description || '',
      userId: userId || 'default-user',
      status: 'pending',
    });

    await newTopic.save();

    console.log(`📝 New topic created: "${topicName}" (ID: ${newTopic._id})`);

    res.status(201).json({
      success: true,
      message:
        'Topic created successfully. It will be processed by the cron job.',
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

    const topics = await Topic.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Topics retrieved successfully',
      count: topics.length,
      data: topics,
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

    const topic = await Topic.findById(id);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    res.json({
      success: true,
      message: 'Topic retrieved successfully',
      data: topic,
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
 * Manually trigger the cron job to process pending topics immediately
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
    await topic.save();

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
        narrationScript: narrationScript.trim(),
        status: 'completed',
        processedAt: new Date(),
      },
      { new: true },
    );

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

    if (!topic.narrationScript) {
      return res.status(400).json({
        success: false,
        message: 'Topic must have a narration script before generating titles',
      });
    }

    console.log(
      `🎬 Generating YouTube titles for: "${topic.topicName}" (ID: ${topic._id})`,
    );

    // Generate titles using Gemini AI
    const titles = await generateYouTubeTitles(
      topic.topicName,
      topic.narrationScript,
      topic.description,
    );

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
    );

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
    );

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

    if (!topic.narrationScript) {
      return res.status(400).json({
        success: false,
        message: 'Topic must have a narration script',
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
    );

    // Update topic with generated thumbnails
    topic.generatedThumbnails = thumbnails;
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
        generatedThumbnails: thumbnails.map((t) => ({
          index: t.index,
          image: t.image,
        })),
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
    );

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
    const [seoDescription, tags, timestamps, audioUrl] = await Promise.all([
      generateSEODescription(topic.topicName, topic.narrationScript),
      generateTags(topic.topicName, topic.narrationScript, topic.selectedTitle),
      generateTimestamps(topic.narrationScript),
      generateMP3Audio(topic.narrationScript, topic._id),
    ]);

    // Update topic with generated assets
    topic.seoDescription = seoDescription;
    topic.tags = tags;
    topic.timestamps = timestamps;
    topic.audioUrl = audioUrl;

    await topic.save();

    console.log(`✅ Extra assets generated for topic "${topic.topicName}"`);

    res.json({
      success: true,
      message: 'Extra assets generated successfully',
      data: {
        seoDescription,
        tags,
        timestamps,
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

export default router;
