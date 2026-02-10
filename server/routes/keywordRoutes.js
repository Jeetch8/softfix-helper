import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import QuestionKeyword from '../models/QuestionKeyword.js';
import Topic from '../models/Topic.js';
import Idea from '../models/Idea.js';
import {
    importKeywordsFromDirectory,
    importKeywordsFromFile,
    listExcelFiles,
} from '../services/localExcelService.js';

const router = express.Router();

// Configure multer for file upload (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream',
        ];
        if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
        }
    },
});

/**
 * POST /api/keywords/upload
 * Upload Excel file(s) and parse keywords
 */
router.post('/keywords/upload', upload.array('files', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded',
            });
        }

        const { userId = 'default-user' } = req.body;
        let totalKeywords = 0;
        let storedKeywords = 0;
        let skippedKeywords = 0;
        let duplicateKeywords = 0;

        for (const file of req.files) {
            // Skip duplicate files (files ending with "(1)" etc.)
            if (file.originalname.match(/\(\d+\)\.[^.]+$/)) {
                console.log(`⏭️ Skipping duplicate file: ${file.originalname}`);
                continue;
            }

            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            for (const row of data) {
                totalKeywords++;

                // Map Excel columns to our schema
                const keywordData = {
                    keyword: row['Keyword'] || row['keyword'],
                    competition: parseFloat(row['Competition'] || row['competition']) || 0,
                    overall: parseFloat(row['Overall'] || row['overall']) || 0,
                    searchVolume: parseInt(row['Search volume'] || row['searchVolume'] || row['search_volume']) || 0,
                    thirtyDayAgoSearches: parseInt(row['30d ago searches'] || row['thirtyDayAgoSearches']) || 0,
                    timestamp: parseInt(row['Timestamp'] || row['timestamp']) || null,
                    numberOfWords: parseInt(row['Number of words'] || row['numberOfWords'] || row['number_of_words']) || 1,
                    userId,
                };

                // Skip if keyword is empty
                if (!keywordData.keyword) {
                    skippedKeywords++;
                    continue;
                }

                // Only store keywords with overall score > 50
                if (keywordData.overall <= 50) {
                    skippedKeywords++;
                    continue;
                }

                // Check for existing keyword (update if exists)
                try {
                    const existingKeyword = await QuestionKeyword.findOne({
                        keyword: keywordData.keyword,
                        userId,
                    });

                    if (existingKeyword) {
                        // Update existing keyword with new data
                        await QuestionKeyword.findByIdAndUpdate(existingKeyword._id, keywordData);
                        duplicateKeywords++;
                    } else {
                        // Create new keyword
                        await QuestionKeyword.create(keywordData);
                        storedKeywords++;
                    }
                } catch (err) {
                    console.error(`Error saving keyword "${keywordData.keyword}":`, err.message);
                    skippedKeywords++;
                }
            }
        }

        res.json({
            success: true,
            message: 'Keywords uploaded successfully',
            data: {
                filesProcessed: req.files.length,
                totalKeywords,
                storedKeywords,
                updatedKeywords: duplicateKeywords,
                skippedKeywords,
            },
        });
    } catch (error) {
        console.error('❌ Error uploading keywords:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error uploading keywords',
            error: error.message,
        });
    }
});

/**
 * GET /api/keywords/local/list
 * List Excel files in a local directory
 */
router.get('/keywords/local/list', async (req, res) => {
    try {
        const { directoryPath } = req.query;

        if (!directoryPath) {
            return res.status(400).json({
                success: false,
                message: 'directoryPath query parameter is required',
            });
        }

        const result = listExcelFiles(directoryPath);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('❌ Error listing Excel files:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error listing Excel files',
            error: error.message,
        });
    }
});

/**
 * POST /api/keywords/local/import-directory
 * Import all Excel files from a local directory
 */
router.post('/keywords/local/import-directory', async (req, res) => {
    try {
        const { directoryPath, userId = 'default-user' } = req.body;

        if (!directoryPath) {
            return res.status(400).json({
                success: false,
                message: 'directoryPath is required in request body',
            });
        }

        console.log(`📂 Starting local import from: ${directoryPath}`);

        const result = await importKeywordsFromDirectory(directoryPath, userId);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message,
            });
        }

        res.json({
            success: true,
            message: result.message,
            data: {
                filesProcessed: result.filesProcessed,
                totalKeywords: result.totalKeywords,
                storedKeywords: result.storedKeywords,
                updatedKeywords: result.updatedKeywords,
                skippedKeywords: result.skippedKeywords,
                fileResults: result.fileResults,
            },
        });
    } catch (error) {
        console.error('❌ Error importing from directory:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error importing keywords from directory',
            error: error.message,
        });
    }
});

/**
 * POST /api/keywords/local/import-file
 * Import a single local Excel file
 */
router.post('/keywords/local/import-file', async (req, res) => {
    try {
        const { filePath, userId = 'default-user' } = req.body;

        if (!filePath) {
            return res.status(400).json({
                success: false,
                message: 'filePath is required in request body',
            });
        }

        console.log(`📄 Starting local import from file: ${filePath}`);

        const result = await importKeywordsFromFile(filePath, userId);

        res.json({
            success: true,
            message: `Imported keywords from ${result.fileName}`,
            data: result,
        });
    } catch (error) {
        console.error('❌ Error importing from file:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error importing keywords from file',
            error: error.message,
        });
    }
});

/**
 * GET /api/keywords
 * Get all keywords with filtering and search
 */
router.get('/keywords', async (req, res) => {
    try {
        const {
            userId,
            search,
            minOverall,
            maxOverall,
            minSearchVolume,
            maxSearchVolume,
            minCompetition,
            maxCompetition,
            addedToTitle,
            sortBy = 'overall',
            sortOrder = 'desc',
            page = 1,
            limit = 50,
        } = req.query;

        // Build query
        const query = {};

        if (userId) query.userId = userId;
        if (addedToTitle !== undefined) query.addedToTitle = addedToTitle === 'true';

        // Search by keyword
        if (search) {
            query.keyword = { $regex: search, $options: 'i' };
        }

        // Filter by overall score
        if (minOverall || maxOverall) {
            query.overall = {};
            if (minOverall) query.overall.$gte = parseFloat(minOverall);
            if (maxOverall) query.overall.$lte = parseFloat(maxOverall);
        }

        // Filter by search volume
        if (minSearchVolume || maxSearchVolume) {
            query.searchVolume = {};
            if (minSearchVolume) query.searchVolume.$gte = parseInt(minSearchVolume);
            if (maxSearchVolume) query.searchVolume.$lte = parseInt(maxSearchVolume);
        }

        // Filter by competition
        if (minCompetition || maxCompetition) {
            query.competition = {};
            if (minCompetition) query.competition.$gte = parseFloat(minCompetition);
            if (maxCompetition) query.competition.$lte = parseFloat(maxCompetition);
        }

        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get total count for pagination
        const total = await QuestionKeyword.countDocuments(query);

        const keywords = await QuestionKeyword.find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: keywords,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('❌ Error fetching keywords:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching keywords',
            error: error.message,
        });
    }
});

/**
 * GET /api/keywords/stats
 * Get keyword statistics for dashboard
 */
router.get('/keywords/stats', async (req, res) => {
    try {
        const { userId } = req.query;
        const query = userId ? { userId } : {};

        const stats = await QuestionKeyword.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalKeywords: { $sum: 1 },
                    avgOverall: { $avg: '$overall' },
                    avgCompetition: { $avg: '$competition' },
                    avgSearchVolume: { $avg: '$searchVolume' },
                    highScoreCount: {
                        $sum: { $cond: [{ $gte: ['$overall', 70] }, 1, 0] },
                    },
                    lowCompetitionCount: {
                        $sum: { $cond: [{ $lte: ['$competition', 30] }, 1, 0] },
                    },
                },
            },
        ]);

        const data = stats[0] || {
            totalKeywords: 0,
            avgOverall: 0,
            avgCompetition: 0,
            avgSearchVolume: 0,
            highScoreCount: 0,
            lowCompetitionCount: 0,
        };

        res.json({
            success: true,
            data: {
                ...data,
                avgOverall: Math.round(data.avgOverall * 100) / 100,
                avgCompetition: Math.round(data.avgCompetition * 100) / 100,
                avgSearchVolume: Math.round(data.avgSearchVolume),
            },
        });
    } catch (error) {
        console.error('❌ Error fetching keyword stats:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching keyword stats',
            error: error.message,
        });
    }
});

/**
 * GET /api/keywords/:id
 * Get a single keyword
 */
router.get('/keywords/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const keyword = await QuestionKeyword.findById(id);

        if (!keyword) {
            return res.status(404).json({
                success: false,
                message: 'Keyword not found',
            });
        }

        res.json({
            success: true,
            data: keyword,
        });
    } catch (error) {
        console.error('❌ Error fetching keyword:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching keyword',
            error: error.message,
        });
    }
});

/**
 * PUT /api/keywords/:id
 * Update a keyword
 */
router.put('/keywords/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Prevent updating to overall <= 50
        if (updates.overall !== undefined && updates.overall <= 50) {
            return res.status(400).json({
                success: false,
                message: 'Overall score must be greater than 50',
            });
        }

        const keyword = await QuestionKeyword.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        });

        if (!keyword) {
            return res.status(404).json({
                success: false,
                message: 'Keyword not found',
            });
        }

        res.json({
            success: true,
            message: 'Keyword updated successfully',
            data: keyword,
        });
    } catch (error) {
        console.error('❌ Error updating keyword:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating keyword',
            error: error.message,
        });
    }
});

/**
 * DELETE /api/keywords/:id
 * Delete a keyword
 */
router.delete('/keywords/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const keyword = await QuestionKeyword.findByIdAndDelete(id);

        if (!keyword) {
            return res.status(404).json({
                success: false,
                message: 'Keyword not found',
            });
        }

        res.json({
            success: true,
            message: 'Keyword deleted successfully',
        });
    } catch (error) {
        console.error('❌ Error deleting keyword:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error deleting keyword',
            error: error.message,
        });
    }
});

/**
 * POST /api/keywords/:id/add-to-ideas
 * Create an Idea from the keyword data and delete the keyword
 */
router.post('/keywords/:id/add-to-ideas', async (req, res) => {
    try {
        const { id } = req.params;

        const keyword = await QuestionKeyword.findById(id);

        if (!keyword) {
            return res.status(404).json({
                success: false,
                message: 'Keyword not found',
            });
        }

        // Create an Idea from the keyword data
        const newIdea = await Idea.create({
            title: keyword.keyword,
            description: '',
            competition: keyword.competition,
            overall: keyword.overall,
            searchVolume: keyword.searchVolume,
            thirtyDayAgoSearches: keyword.thirtyDayAgoSearches,
            numberOfWords: keyword.numberOfWords,
            userId: keyword.userId || 'default-user',
        });

        // Delete the keyword from the keywords list
        await QuestionKeyword.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Keyword added to ideas and removed from keywords',
            data: {
                idea: newIdea,
            },
        });
    } catch (error) {
        console.error('❌ Error adding keyword to ideas:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error adding keyword to ideas',
            error: error.message,
        });
    }
});

/**
 * POST /api/keywords/:id/remove-from-ideas
 * Remove keyword from ideas - recreate the keyword and delete the idea
 */
router.post('/keywords/:id/remove-from-ideas', async (req, res) => {
    try {
        const { ideaId } = req.body;

        if (!ideaId) {
            return res.status(400).json({
                success: false,
                message: 'ideaId is required in request body',
            });
        }

        const idea = await Idea.findById(ideaId);

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found',
            });
        }

        // Recreate the keyword from the idea data
        const restoredKeyword = await QuestionKeyword.create({
            keyword: idea.title,
            competition: idea.competition,
            overall: idea.overall || 51,
            searchVolume: idea.searchVolume,
            thirtyDayAgoSearches: idea.thirtyDayAgoSearches,
            numberOfWords: idea.numberOfWords,
            userId: idea.userId || 'default-user',
            addedToTitle: false,
        });

        // Delete the idea
        await Idea.findByIdAndDelete(ideaId);

        res.json({
            success: true,
            message: 'Idea removed and keyword restored',
            data: {
                keyword: restoredKeyword,
            },
        });
    } catch (error) {
        console.error('❌ Error removing from ideas:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error removing from ideas',
            error: error.message,
        });
    }
});

export default router;
