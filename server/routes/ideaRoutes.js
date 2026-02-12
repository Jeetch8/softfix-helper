import express from 'express';
import Idea from '../models/Idea.js';
import Topic from '../models/Topic.js';

const router = express.Router();

/**
 * GET /api/ideas
 * Get all ideas with optional search and pagination
 */
router.get('/ideas', async (req, res) => {
  try {
    const {
      userId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};
    if (userId) query.userId = userId;

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Idea.countDocuments(query);

    const ideas = await Idea.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: ideas,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching ideas:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching ideas',
      error: error.message,
    });
  }
});

/**
 * GET /api/ideas/stats
 * Get idea statistics for dashboard
 */
router.get('/ideas/stats', async (req, res) => {
  try {
    const { userId } = req.query;
    const query = userId ? { userId } : {};

    const stats = await Idea.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalIdeas: { $sum: 1 },
          convertedCount: {
            $sum: { $cond: ['$convertedToTopic', 1, 0] },
          },
        },
      },
    ]);

    const data = stats[0] || {
      totalIdeas: 0,
      convertedCount: 0,
    };

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('❌ Error fetching idea stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching idea stats',
      error: error.message,
    });
  }
});

/**
 * GET /api/ideas/:id
 * Get a single idea
 */
router.get('/ideas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idea = await Idea.findById(id);

    if (!idea) {
      return res.status(404).json({
        success: false,
        message: 'Idea not found',
      });
    }

    res.json({
      success: true,
      data: idea,
    });
  } catch (error) {
    console.error('❌ Error fetching idea:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching idea',
      error: error.message,
    });
  }
});

/**
 * PUT /api/ideas/:id
 * Update an idea (only title and description are editable)
 */
router.put('/ideas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;

    const idea = await Idea.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!idea) {
      return res.status(404).json({
        success: false,
        message: 'Idea not found',
      });
    }

    res.json({
      success: true,
      message: 'Idea updated successfully',
      data: idea,
    });
  } catch (error) {
    console.error('❌ Error updating idea:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating idea',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/ideas/:id
 * Delete an idea
 */
router.delete('/ideas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idea = await Idea.findByIdAndDelete(id);

    if (!idea) {
      return res.status(404).json({
        success: false,
        message: 'Idea not found',
      });
    }

    res.json({
      success: true,
      message: 'Idea deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting idea:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting idea',
      error: error.message,
    });
  }
});

/**
 * POST /api/ideas/:id/convert-to-topic
 * Convert an idea into a topic
 */
router.post('/ideas/:id/convert-to-topic', async (req, res) => {
  try {
    const { id } = req.params;
    const { topicName, description } = req.body;

    const idea = await Idea.findById(id);

    if (!idea) {
      return res.status(404).json({
        success: false,
        message: 'Idea not found',
      });
    }

    if (idea.convertedToTopic) {
      return res.status(400).json({
        success: false,
        message: 'Idea has already been converted to a topic',
      });
    }

    // Use provided topicName and description, or fall back to idea's title and description
    const finalTopicName =
      topicName && topicName.trim() ? topicName.trim() : idea.title;
    const finalDescription =
      description !== undefined ? description.trim() : idea.description || '';

    // Create a new Topic from the idea
    const newTopic = await Topic.create({
      topicName: finalTopicName,
      description: finalDescription,
      userId: idea.userId || 'default-user',
      status: 'pending',
      level: 'scripting',
    });

    // Mark the idea as converted
    idea.convertedToTopic = true;
    await idea.save();

    res.json({
      success: true,
      message: 'Idea converted to topic successfully',
      data: {
        idea,
        topic: newTopic,
      },
    });
  } catch (error) {
    console.error('❌ Error converting idea to topic:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error converting idea to topic',
      error: error.message,
    });
  }
});

export default router;
