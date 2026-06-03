import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import QuestionKeyword from '../models/QuestionKeyword.js';
import Grouping from '../models/Grouping.js';
import { filterNonEnglishKeywords, segregateKeywordsIntoGroups } from '../services/geminiService.js';

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
                
                // 2. Filter out keywords with search volume < 5000
                if (!keyword || searchVolume < 5000) continue;

                // 3. Remove duplicates across files
                if (!uniqueKeywordsMap.has(keyword)) {
                    uniqueKeywordsMap.set(keyword, {
                        keyword,
                        competition: parseFloat(row['Competition'] || row['competition']) || 0,
                        overall: parseFloat(row['Overall'] || row['overall']) || 0,
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
