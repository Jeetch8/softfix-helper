import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import QuestionKeyword from '../models/QuestionKeyword.js';
import Grouping from '../models/Grouping.js';
import { filterNonEnglishKeywords, segregateKeywordsIntoGroups } from '../services/geminiService.js';

const roundDownToOneDecimal = (val) => {
    if (val === null || val === undefined) return val;
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    return Math.floor(num * 10) / 10;
};

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream',
            'text/csv'
        ];
        if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel/CSV files (.xlsx, .xls, .csv) are allowed'), false);
        }
    },
});

/**
 * DELETE /api/segregator/groups
 * Deletes all documents in grouping model
 */
router.delete('/segregator/groups', async (req, res) => {
    try {
        await Grouping.deleteMany({});
        res.json({ success: true, message: 'All groupings deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting groupings:', error.message);
        res.status(500).json({ success: false, message: 'Error deleting groupings', error: error.message });
    }
});

/**
 * POST /api/segregator/groups
 * Creates a new empty group
 */
router.post('/segregator/groups', async (req, res) => {
    try {
        const { title, userId = 'default-user' } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }
        
        const newGroup = await Grouping.create({
            title,
            keywords: [],
            total_average_volume: 0,
            userId
        });
        
        res.json({ success: true, message: 'Group created successfully', data: newGroup });
    } catch (error) {
        console.error('❌ Error creating group:', error.message);
        res.status(500).json({ success: false, message: 'Error creating group', error: error.message });
    }
});

/**
 * DELETE /api/segregator/groups/:id
 * Deletes a specific group and redistributes its keywords to another random group
 */
router.delete('/segregator/groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const groupToDelete = await Grouping.findById(id);
        
        if (!groupToDelete) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        const flatKeywords = groupToDelete.keywords ? groupToDelete.keywords.flat() : [];
        
        if (flatKeywords.length > 0) {
            // Find another group to move keywords to
            const otherGroups = await Grouping.find({ _id: { $ne: id } });
            
            if (otherGroups.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Cannot delete the last group if it contains keywords. Please create another group first or delete the keywords.' 
                });
            }
            
            // Pick a random group
            const randomGroup = otherGroups[Math.floor(Math.random() * otherGroups.length)];
            
            // Append keywords to the random group (Wrapping in an array since schema expects [[{...}]])
            randomGroup.keywords.push(flatKeywords);
            await randomGroup.save();
        }

        await Grouping.findByIdAndDelete(id);
        res.json({ success: true, message: 'Group deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting group:', error.message);
        res.status(500).json({ success: false, message: 'Error deleting group', error: error.message });
    }
});

/**
 * GET /api/segregator/groups
 * Returns all groups and their keywords
 */
router.get('/segregator/groups', async (req, res) => {
    try {
        const { userId } = req.query;
        const query = userId ? { userId } : {};

        const groups = await Grouping.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            message: 'Groupings retrieved successfully',
            count: groups.length,
            data: groups,
        });
    } catch (error) {
        console.error('❌ Error retrieving groupings:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error retrieving groupings',
            error: error.message,
        });
    }
});

/**
 * POST /api/segregator/upload
 * Upload files, filter, and segregate keywords
 */
router.post('/segregator/upload', upload.array('files', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const { userId = 'default-user' } = req.body;
        const uniqueKeywordsMap = new Map();

        // 1. Read files and load into array
        for (const file of req.files) {
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            for (const row of data) {
                const keyword = row['Keyword'] || row['keyword'];
                const searchVolume = parseInt(row['Search volume'] || row['searchVolume'] || row['search_volume']) || 0;
                const overall = parseFloat(row['Overall'] || row['overall']) || 0;
                
                // 2. Filter out keywords with search volume < 5000 (do not filter by overall score)
                if (!keyword || searchVolume < 5000) continue;

                // 3. Remove duplicates across files
                if (!uniqueKeywordsMap.has(keyword)) {
                    uniqueKeywordsMap.set(keyword, {
                        keyword,
                        competition: roundDownToOneDecimal(row['Competition'] || row['competition']),
                        overall: roundDownToOneDecimal(overall),
                        searchVolume,
                        thirtyDayAgoSearches: parseInt(row['30d ago searches'] || row['thirtyDayAgoSearches']) || 0,
                        timestamp: parseInt(row['Timestamp'] || row['timestamp']) || null,
                        numberOfWords: parseInt(row['Number of words'] || row['numberOfWords'] || row['number_of_words']) || 1,
                        userId
                    });
                }
            }

        }

        const allParsedKeywords = Array.from(uniqueKeywordsMap.values());
        
        if (allParsedKeywords.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid keywords found after initial filtering' });
        }

        // 4. Use Gemini to filter out non-English keywords
        const keywordStrings = allParsedKeywords.map(k => k.keyword);
        const englishKeywordsList = await filterNonEnglishKeywords(keywordStrings);
        
        const englishKeywordSet = new Set(englishKeywordsList.map(k => k.toLowerCase()));
        
        const finalFilteredKeywordsData = allParsedKeywords.filter(k => 
            englishKeywordSet.has(k.keyword.toLowerCase())
        );

        if (finalFilteredKeywordsData.length === 0) {
            return res.status(400).json({ success: false, message: 'No English keywords found after language filtering' });
        }

        // 5. Push all filtered keywords to QuestionKeyword
        const savedKeywordsInfo = [];
        for (const kData of finalFilteredKeywordsData) {
            let savedKeyword;
            const existing = await QuestionKeyword.findOne({ keyword: kData.keyword, userId: kData.userId });
            if (existing) {
                savedKeyword = await QuestionKeyword.findByIdAndUpdate(existing._id, kData, { new: true });
            } else {
                savedKeyword = await QuestionKeyword.create(kData);
            }
            savedKeywordsInfo.push({
                id: savedKeyword._id,
                keyword: savedKeyword.keyword,
                search_volume: savedKeyword.searchVolume,
                overall: savedKeyword.overall,
                competition: savedKeyword.competition,
                thirtyDayAgoSearches: savedKeyword.thirtyDayAgoSearches,
                numberOfWords: savedKeyword.numberOfWords
            });
        }

        // 6. Send keywords to Gemini for segregation
        const groupingsData = await segregateKeywordsIntoGroups(savedKeywordsInfo);
        
        // groupingsData expected format: 
        // [ { title: "Group 1", keywords: [ { id: "123", keyword: "kw1", search_volume: 5000, overall: 60, ... } ] }, ... ]

        // 7. Save generated groups to Grouping DB
        const savedGroups = [];
        for (const group of groupingsData) {
            const totalVolume = group.keywords.reduce((sum, kw) => sum + (kw.search_volume || 0), 0);
            const newGroup = await Grouping.create({
                title: group.title,
                keywords: [group.keywords], // Note: Grouping model expects [[ { ... } ]]
                total_average_volume: totalVolume,
                userId
            });
            savedGroups.push(newGroup);
        }

        res.json({
            success: true,
            message: 'Keywords segregated and saved successfully',
            data: savedGroups
        });

    } catch (error) {
        console.error('❌ Error processing keywords:', error.message);
        res.status(500).json({ success: false, message: 'Error processing keywords', error: error.message });
    }
});

export default router;
