import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import QuestionKeyword from '../models/QuestionKeyword.js';
import Grouping from '../models/Grouping.js';
import GroupingsGroup from '../models/GroupingsGroup.js';
import { filterNonEnglishKeywords, segregateKeywordsIntoGroups } from '../services/geminiService.js';
import { fetchKeywordsForGroups } from '../services/keywordHelper.js';

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
        const { title, groupingsGroupId, userId = 'default-user' } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }
        
        const newGroup = await Grouping.create({
            title,
            keywords: [],
            total_average_volume: 0,
            userId,
            groupingsGroupId
        });

        if (groupingsGroupId) {
            await GroupingsGroup.findByIdAndUpdate(groupingsGroupId, {
                $inc: { numberOfGroups: 1 }
            });
        }
        
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
            // Find another group to move keywords to within the same groupings group
            const query = { _id: { $ne: id } };
            if (groupToDelete.groupingsGroupId) {
                query.groupingsGroupId = groupToDelete.groupingsGroupId;
            }
            const otherGroups = await Grouping.find(query);
            
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

        if (groupToDelete.groupingsGroupId) {
            await GroupingsGroup.findByIdAndUpdate(groupToDelete.groupingsGroupId, {
                $inc: { numberOfGroups: -1 }
            });
        }

        await Grouping.findByIdAndDelete(id);
        res.json({ success: true, message: 'Group deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting group:', error.message);
        res.status(500).json({ success: false, message: 'Error deleting group', error: error.message });
    }
});

/**
 * PUT /api/segregator/groups/keyword
 * Update a keyword's group assignments
 */
router.put('/segregator/groups/keyword', async (req, res) => {
    try {
        const { keyword, targetGroupIds, groupingsGroupId, userId = 'default-user' } = req.body;
        if (!keyword || !keyword.id || !Array.isArray(targetGroupIds)) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const query = userId ? { userId } : {};
        if (groupingsGroupId) {
            query.groupingsGroupId = groupingsGroupId;
        }
        const allGroups = await Grouping.find(query);
        
        for (const group of allGroups) {
            const flatKeywords = group.keywords ? group.keywords.flat() : [];
            const hasKeyword = flatKeywords.some(kw => kw.id === keyword.id || kw._id?.toString() === keyword.id);
            const shouldHaveKeyword = targetGroupIds.includes(group._id.toString());
            
            let changed = false;
            let newKeywords = [...flatKeywords];

            if (shouldHaveKeyword && !hasKeyword) {
                newKeywords.push(keyword);
                changed = true;
            } else if (!shouldHaveKeyword && hasKeyword) {
                newKeywords = newKeywords.filter(kw => kw.id !== keyword.id && kw._id?.toString() !== keyword.id);
                changed = true;
            }

            if (changed) {
                group.keywords = [newKeywords];
                group.total_average_volume = newKeywords.reduce((sum, kw) => sum + (Number(kw.search_volume) || 0), 0);
                await group.save();
            }
        }

        res.json({ success: true, message: 'Keyword groups updated successfully' });
    } catch (error) {
        console.error('❌ Error updating keyword groups:', error.message);
        res.status(500).json({ success: false, message: 'Error updating keyword groups', error: error.message });
    }
});

/**
 * PUT /api/segregator/groups/:id
 * Updates a specific group's title
 */
router.put('/segregator/groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        const updatedGroup = await Grouping.findByIdAndUpdate(
            id,
            { title },
            { new: true }
        );

        if (!updatedGroup) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        res.json({ success: true, message: 'Group title updated successfully', data: updatedGroup });
    } catch (error) {
        console.error('❌ Error updating group:', error.message);
        res.status(500).json({ success: false, message: 'Error updating group', error: error.message });
    }
});

/**
 * PUT /api/segregator/groups/:id/description
 * Updates a specific group's description
 */
router.put('/segregator/groups/:id/description', async (req, res) => {
    try {
        const { id } = req.params;
        const { description } = req.body;

        const updatedGroup = await Grouping.findByIdAndUpdate(
            id,
            { description: description ?? '' },
            { new: true }
        );

        if (!updatedGroup) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        res.json({ success: true, message: 'Group description updated successfully', data: updatedGroup });
    } catch (error) {
        console.error('❌ Error updating group description:', error.message);
        res.status(500).json({ success: false, message: 'Error updating group description', error: error.message });
    }
});

/**
 * PUT /api/segregator/groups/:id/priority
 * Updates a specific group's priority status
 */
router.put('/segregator/groups/:id/priority', async (req, res) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;
        if (priority === undefined) {
            return res.status(400).json({ success: false, message: 'Priority boolean is required' });
        }

        const updatedGroup = await Grouping.findByIdAndUpdate(
            id,
            { priority: !!priority },
            { new: true }
        );

        if (!updatedGroup) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        res.json({ success: true, message: `Group priority updated successfully`, data: updatedGroup });
    } catch (error) {
        console.error('❌ Error updating group priority:', error.message);
        res.status(500).json({ success: false, message: 'Error updating group priority', error: error.message });
    }
});

/**
 * GET /api/segregator/groups/keywords
 * Fetches unique keywords for provided groups.
 * Accepts multiple group IDs (comma-separated or array).
 */
router.get('/segregator/groups/keywords', async (req, res) => {
    try {
        const { groupIds } = req.query;
        if (!groupIds) {
            return res.status(400).json({ success: false, message: 'Group IDs are required' });
        }
        const ids = typeof groupIds === 'string' ? groupIds.split(',').map(id => id.trim()) : groupIds;
        const keywords = await fetchKeywordsForGroups(ids);
        res.json({
            success: true,
            message: 'Unique keywords retrieved successfully',
            count: keywords.length,
            data: keywords
        });
    } catch (error) {
        console.error('❌ Error fetching keywords for groups:', error.message);
        res.status(500).json({ success: false, message: 'Error fetching keywords for groups', error: error.message });
    }
});

/**
 * GET /api/segregator/groups
 * Returns all groups and their keywords
 */
router.get('/segregator/groups', async (req, res) => {
    try {
        const { userId, groupingsGroupId } = req.query;
        const query = userId ? { userId } : {};
        if (groupingsGroupId) {
            query.groupingsGroupId = groupingsGroupId;
        }

        const groups = await Grouping.find(query).sort({ createdAt: -1 });

        for (const group of groups) {
            const obj = group.toObject({ defaults: false });
            if (obj.priority === undefined) {
                await Grouping.findByIdAndUpdate(group._id, { priority: false });
                group.priority = false;
                if (group._doc) {
                    group._doc.priority = false;
                }
            }
        }

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
 * GET /api/segregator/groupings-groups
 * Returns all groupings groups
 */
router.get('/segregator/groupings-groups', async (req, res) => {
    try {
        const { userId } = req.query;
        const query = userId ? { userId } : {};

        const groups = await GroupingsGroup.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: groups,
        });
    } catch (error) {
        console.error('❌ Error retrieving groupings groups:', error.message);
        res.status(500).json({ success: false, message: 'Error retrieving groupings groups', error: error.message });
    }
});

/**
 * GET /api/segregator/groupings-groups/:id
 * Returns a specific groupings group
 */
router.get('/segregator/groupings-groups/:id', async (req, res) => {
    try {
        const group = await GroupingsGroup.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Groupings group not found' });
        }
        res.json({
            success: true,
            data: group,
        });
    } catch (error) {
        console.error('❌ Error retrieving groupings group:', error.message);
        res.status(500).json({ success: false, message: 'Error retrieving groupings group', error: error.message });
    }
});

/**
 * PUT /api/segregator/groupings-groups/:id
 * Updates groupings group title and/or description
 */
router.put('/segregator/groupings-groups/:id', async (req, res) => {
    try {
        const { title, description } = req.body;
        const updateFields = {};
        if (title !== undefined) {
            if (!title) {
                return res.status(400).json({ success: false, message: 'Title is required' });
            }
            updateFields.title = title;
        }
        if (description !== undefined) {
            updateFields.description = description;
        }

        const group = await GroupingsGroup.findByIdAndUpdate(req.params.id, updateFields, { new: true });
        if (!group) {
            return res.status(404).json({ success: false, message: 'Groupings group not found' });
        }
        res.json({
            success: true,
            data: group,
        });
    } catch (error) {
        console.error('❌ Error updating groupings group:', error.message);
        res.status(500).json({ success: false, message: 'Error updating groupings group', error: error.message });
    }
});

/**
 * DELETE /api/segregator/groupings-groups/:id
 * Deletes a groupings group and all its sub-groupings
 */
router.delete('/segregator/groupings-groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Grouping.deleteMany({ groupingsGroupId: id });
        const deleted = await GroupingsGroup.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Groupings group not found' });
        }
        res.json({
            success: true,
            message: 'Groupings group deleted successfully',
        });
    } catch (error) {
        console.error('❌ Error deleting groupings group:', error.message);
        res.status(500).json({ success: false, message: 'Error deleting groupings group', error: error.message });
    }
});

/**
 * DELETE /api/segregator/groupings-groups
 * Deletes all groupings groups and all sub-groupings
 */
router.delete('/segregator/groupings-groups', async (req, res) => {
    try {
        await Grouping.deleteMany({});
        await GroupingsGroup.deleteMany({});
        res.json({
            success: true,
            message: 'All groupings groups and groupings deleted successfully',
        });
    } catch (error) {
        console.error('❌ Error flushing groupings groups:', error.message);
        res.status(500).json({ success: false, message: 'Error flushing groupings groups', error: error.message });
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

        const { userId = 'default-user', groupingsGroupTitle = 'Untitled Groupings Group' } = req.body;
        const uniqueKeywordsMap = new Map();

        // 1. Read files and load into array
        for (const file of req.files) {
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            for (const row of data) {
                let rawKeyword = row['Keyword'] || row['keyword'];
                if (!rawKeyword) continue;

                if (typeof rawKeyword !== 'string') {
                    if (typeof rawKeyword.toString === 'function') {
                        rawKeyword = rawKeyword.toString();
                    } else {
                        continue;
                    }
                }

                const keyword = rawKeyword.trim().replace(/\s+/g, ' ');
                const searchVolume = parseInt(row['Search volume'] || row['searchVolume'] || row['search_volume']) || 0;
                const overall = parseFloat(row['Overall'] || row['overall']) || 0;
                
                // 2. Filter out keywords with search volume < 5000 (do not filter by overall score)
                if (!keyword || searchVolume < 5000) continue;

                // 3. Remove duplicates across files (normalized case-insensitively)
                const normalizedKeyword = keyword.toLowerCase();
                if (!uniqueKeywordsMap.has(normalizedKeyword)) {
                    uniqueKeywordsMap.set(normalizedKeyword, {
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
            const existing = await QuestionKeyword.findOne({ 
                keyword: { $regex: new RegExp('^' + kData.keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }, 
                userId: kData.userId 
            });
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
        
        // Create the GroupingsGroup parent document first
        const groupingsGroup = await GroupingsGroup.create({
            title: groupingsGroupTitle,
            numberOfGroups: groupingsData.length,
            userId
        });

        // 7. Save generated groups to Grouping DB, populating keyword info from memory mapping and linking to GroupingsGroup parent
        const keywordsMap = new Map(savedKeywordsInfo.map(k => [k.id.toString(), k]));
        const savedGroups = [];
        for (const group of groupingsData) {
            const populatedKeywords = [];
            if (group.keywords && Array.isArray(group.keywords)) {
                for (const kw of group.keywords) {
                    const kwIdStr = kw.id ? kw.id.toString() : '';
                    const fullInfo = keywordsMap.get(kwIdStr);
                    if (fullInfo) {
                        populatedKeywords.push({
                            id: fullInfo.id.toString(),
                            keyword: fullInfo.keyword,
                            search_volume: fullInfo.search_volume,
                            overall: fullInfo.overall,
                            competition: fullInfo.competition
                        });
                    }
                }
            }

            const totalVolume = populatedKeywords.reduce((sum, kw) => sum + (kw.search_volume || 0), 0);
            const newGroup = await Grouping.create({
                title: group.title,
                keywords: [populatedKeywords], // Note: Grouping model expects [[ { ... } ]]
                total_average_volume: totalVolume,
                userId,
                groupingsGroupId: groupingsGroup._id
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
