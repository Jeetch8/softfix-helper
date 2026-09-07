import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import Grouping from '@/models/Grouping';
import GroupingsGroup from '@/models/GroupingsGroup';
import QuestionKeyword from '@/models/QuestionKeyword';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { filterNonEnglishKeywords, segregateKeywordsIntoGroups } from '@/services/geminiService';
import { fetchKeywordsForGroups } from '@/services/keywordHelper';

const roundDownToOneDecimal = (val: number | null | undefined) => {
  if (val === null || val === undefined) return val;
  const num = parseFloat(val as unknown as string);
  if (isNaN(num)) return 0;
  return Math.floor(num * 10) / 10;
};

const parseSearchVolume = (val: any) => {
  if (val === null || val === undefined) return { isLessThan: false, value: 0 };
  if (typeof val === 'number') return { isLessThan: false, value: isNaN(val) ? 0 : Math.round(val) };
  const str = String(val).trim();
  if (!str) return { isLessThan: false, value: 0 };
  const isLessThan = str.startsWith('<');
  const cleanNumStr = str.replace(/[<>, "']/g, '');
  const num = parseInt(cleanNumStr, 10);
  return { isLessThan, value: isNaN(num) ? 0 : num };
};

const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// ---- Helper to read form data file uploads ----
async function getFilesFromForm(formData: FormData): Promise<File[]> {
  const files = formData.getAll('files') as File[];
  return files;
}

async function saveFileToTemp(file: File & { name?: string }): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = Date.now() + '-' + (file.name || file['webkitRelativePath'] || 'file').replace(/[^a-zA-Z0-9.]/g, '_');
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// ============ ROUTES ============

// GET /api/segregator/groups/keywords
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('_path');

  if (path === '/api/segregator/groups/keywords') {
    const groupIds = searchParams.get('groupIds');
    if (!groupIds) return NextResponse.json({ success: false, message: 'Group IDs are required' }, { status: 400 });
    const ids = typeof groupIds === 'string' ? groupIds.split(',').map((id) => id.trim()) : [groupIds];
    const keywords = await fetchKeywordsForGroups(ids);
    return NextResponse.json({ success: true, message: 'Unique keywords retrieved successfully', count: keywords.length, data: keywords });
  }

  if (path === '/api/segregator/groups') {
    await connectDB();
    const userId = searchParams.get('userId');
    const groupingsGroupId = searchParams.get('groupingsGroupId');
    const query: Record<string, any> = userId ? { userId } : {};
    if (groupingsGroupId) query.groupingsGroupId = groupingsGroupId;
    const groups = await Grouping.find(query).sort({ createdAt: -1 });
    for (const group of groups) {
      const obj = ((group as any).toObject({ defaults: false }) as any);
      if (obj.priority === undefined) {
        await Grouping.findByIdAndUpdate(group._id, { priority: false });
        group.priority = false;
        // @ts-ignore - _doc is set by Mongoose
      if (group._doc) (group as any)._doc.priority = false;
      }
    }
    return NextResponse.json({ success: true, message: 'Groupings retrieved successfully', count: groups.length, data: groups });
  }

  if (path === '/api/segregator/groupings-groups') {
    await connectDB();
    const userId = searchParams.get('userId');
    const query = userId ? { userId } : {};
    const groups = await GroupingsGroup.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: groups });
  }

  return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
}

// POST /api/segregator/*
export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  try {
    if (pathname === '/api/segregator/groups') {
      await connectDB();
      const body = await request.json();
      const { title, groupingsGroupId, userId = 'default-user' } = body;
      if (!title) return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 });
      const newGroup = await Grouping.create({ title, keywords: [], total_average_volume: 0, userId, groupingsGroupId });
      if (groupingsGroupId) {
        await GroupingsGroup.findByIdAndUpdate(groupingsGroupId, { $inc: { numberOfGroups: 1 } });
      }
      return NextResponse.json({ success: true, message: 'Group created successfully', data: newGroup });
    }

    if (pathname.startsWith('/api/segregator/groups/') && pathname.endsWith('/upload')) {
      const groupIdMatch = pathname.match(/\/api\/segregator\/groups\/([^/]+)\/upload/);
      if (!groupIdMatch) return NextResponse.json({ success: false, message: 'Invalid route' }, { status: 404 });
      await connectDB();
      const parentGroupId = groupIdMatch[1];
      const parentGroup = await GroupingsGroup.findById(parentGroupId);
      if (!parentGroup) return NextResponse.json({ success: false, message: 'Groupings group not found' }, { status: 404 });

      const formData = await request.formData();
      const files = formData.getAll('files') as File[];
      const userId = formData.get('userId') as string || 'default-user';
      const rowNumbers = formData.get('rowNumbers') as string || '';

      if (!files || files.length === 0) return NextResponse.json({ success: false, message: 'No files uploaded' }, { status: 400 });

      const parseRowNumbers = (str: string) => {
        if (!str || !str.trim()) return null;
        const indices = new Set<number>();
        for (const part of str.split(',')) {
          const trimmed = part.trim();
          if (!trimmed) continue;
          if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-');
            const s = parseInt(start.trim(), 10);
            const e = parseInt(end.trim(), 10);
            if (!isNaN(s) && !isNaN(e)) for (let i = s; i <= e; i++) indices.add(i);
          } else {
            const val = parseInt(trimmed, 10);
            if (!isNaN(val)) indices.add(val);
          }
        }
        return indices.size > 0 ? indices : null;
      };

      const targetRows = parseRowNumbers(rowNumbers);
      const uniqueKeywordsMap = new Map<string, any>();

      for (const file of files) {
        const filePath = await saveFileToTemp(file);
        const fileBuffer = fs.readFileSync(filePath);
        fs.unlinkSync(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);

        for (let i = 0; i < data.length; i++) {
          const row = data[i] as Record<string, any>;
          if (targetRows && !targetRows.has(i + 2)) continue;
          let rawKeyword = row['Keyword'] || row['keyword'];
          if (!rawKeyword || typeof rawKeyword !== 'string') continue;
          const keyword = rawKeyword.trim().replace(/\s+/g, ' ');
          if (!keyword) continue;
          const { isLessThan, value: searchVolume } = parseSearchVolume(row['Search volume'] || row['Search Volume'] || row['searchVolume'] || row['search_volume'] || row['Search vol'] || row['Volume']);
          const overall = parseFloat(String(row['Overall'] || row['overall'] || 0).replace(/[^0-9.-]/g, '')) || 0;
          if (isLessThan || searchVolume < 750) continue;
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
              userId,
            });
          }
        }
      }

      const allParsedKeywords = Array.from(uniqueKeywordsMap.values());
      if (allParsedKeywords.length === 0) return NextResponse.json({ success: false, message: 'No valid keywords found after initial filtering' }, { status: 400 });

      const populatedKeywords = [];
      let highestSearchVolume = 0;

      for (const kData of allParsedKeywords) {
        let savedKeyword: any;
        const existing = await QuestionKeyword.findOne({ keyword: { $regex: new RegExp('^' + kData.keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }, userId: kData.userId });
        if (existing) {
          savedKeyword = await QuestionKeyword.findByIdAndUpdate(existing._id, kData, { new: true });
        } else {
          savedKeyword = await QuestionKeyword.create(kData);
        }
        populatedKeywords.push({ id: (savedKeyword as any)._id.toString(), keyword: (savedKeyword as any).keyword, search_volume: (savedKeyword as any).searchVolume, overall: (savedKeyword as any).overall, competition: (savedKeyword as any).competition });
        if (savedKeyword.searchVolume > highestSearchVolume) highestSearchVolume = savedKeyword.searchVolume;
      }

      let uploadedGroup = await Grouping.findOne({ groupingsGroupId: parentGroupId, title: { $regex: /^uploaded$/i } });
      if (!uploadedGroup) {
        uploadedGroup = await Grouping.create({ title: 'uploaded', description: 'Keywords directly uploaded to this session', keywords: [], total_average_volume: 0, userId, groupingsGroupId: parentGroupId, priority: highestSearchVolume >= 20000 });
        await GroupingsGroup.findByIdAndUpdate(parentGroupId, { $inc: { numberOfGroups: 1 } });
      }

      const existingFlat = uploadedGroup.keywords ? uploadedGroup.keywords.flat() : [];
      const existingIds = new Set(existingFlat.map((k: any) => k.id));
      const allSessionGroups = await Grouping.find({ groupingsGroupId: parentGroupId, _id: { $ne: uploadedGroup._id } });
      const allOtherSessionKeywordIds = new Set<string>();
      for (const group of allSessionGroups) {
        const groupKeywords = group.keywords ? group.keywords.flat() : [];
        for (const k of groupKeywords) { if ((k as any).id) allOtherSessionKeywordIds.add((k as any).id.toString()); }
      }
      const newKeywordsToPush = populatedKeywords.filter((k) => !existingIds.has(k.id) && !allOtherSessionKeywordIds.has(k.id));
      if (newKeywordsToPush.length > 0) {
        const mergedKeywords = [...existingFlat, ...newKeywordsToPush];
        // @ts-ignore - Mongoose nested array assignment
        uploadedGroup.keywords = [mergedKeywords];
        uploadedGroup.total_average_volume = mergedKeywords.reduce((sum: number, kw: any) => sum + (Number(kw.search_volume) || 0), 0);
        if (highestSearchVolume >= 20000) uploadedGroup.priority = true;
        await uploadedGroup.save();
      }

      return NextResponse.json({ success: true, message: `Successfully uploaded and added ${newKeywordsToPush.length} new keywords to 'uploaded' group`, data: uploadedGroup });
    }

    if (pathname === '/api/segregator/upload') {
      await connectDB();
      const formData = await request.formData();
      const files = formData.getAll('files') as File[];
      const userId = formData.get('userId') as string || 'default-user';
      const groupingsGroupTitle = formData.get('groupingsGroupTitle') as string || 'Untitled Groupings Group';
      const customGroupsList = formData.get('customGroupsList') as string || '';

      if (!files || files.length === 0) return NextResponse.json({ success: false, message: 'No files uploaded' }, { status: 400 });

      const uniqueKeywordsMap = new Map<string, any>();
      for (const file of files) {
        const filePath = await saveFileToTemp(file);
        const fileBuffer = fs.readFileSync(filePath);
        fs.unlinkSync(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;
          const data = XLSX.utils.sheet_to_json(worksheet);
          for (const row of data as any[]) {
            const r = row as Record<string, any>;
            let rawKeyword = r['Keyword'] || r['keyword'] || r['KEYWORD'];
            if (!rawKeyword) continue;
            if (typeof rawKeyword !== 'string') { if (typeof rawKeyword.toString === 'function') rawKeyword = rawKeyword.toString(); else continue; }
            const keyword = rawKeyword.trim().replace(/\s+/g, ' ');
            if (!keyword) continue;
            const { isLessThan, value: searchVolume } = parseSearchVolume(row['Search volume'] || row['Search Volume'] || row['searchVolume'] || row['search_volume'] || row['Search vol'] || row['Volume']);
            if (isLessThan || searchVolume < 750) continue;
            const overall = parseFloat(String(r['Overall'] || r['overall'] || 0).replace(/[^0-9.-]/g, '')) || 0;
            const normalizedKeyword = keyword.toLowerCase();
            if (!uniqueKeywordsMap.has(normalizedKeyword)) {
              uniqueKeywordsMap.set(normalizedKeyword, { keyword, competition: roundDownToOneDecimal(r['Competition'] || r['competition']), overall: roundDownToOneDecimal(overall), searchVolume, thirtyDayAgoSearches: parseInt(String(r['30d ago searches'] || r['thirtyDayAgoSearches'] || 0).replace(/[^0-9]/g, '')) || 0, timestamp: parseInt(r['Timestamp'] || r['timestamp'], 10) || null, numberOfWords: parseInt(r['Number of words'] || r['numberOfWords'] || r['number_of_words'], 10) || keyword.split(/\s+/).length, userId });
            } else {
              const existing = uniqueKeywordsMap.get(normalizedKeyword);
              if (searchVolume > existing.searchVolume) { uniqueKeywordsMap.set(normalizedKeyword, { ...existing, keyword, searchVolume, competition: roundDownToOneDecimal(r['Competition'] || r['competition']), overall: roundDownToOneDecimal(overall) }); }
            }
          }
        }
      }

      const allParsedKeywords = Array.from(uniqueKeywordsMap.values());
      if (allParsedKeywords.length === 0) return NextResponse.json({ success: false, message: 'No valid keywords found after initial filtering' }, { status: 400 });

      const keywordStrings = allParsedKeywords.map((k: any) => k.keyword);
      const englishKeywordsList = await filterNonEnglishKeywords(keywordStrings);
      const englishKeywordSet = new Set(englishKeywordsList.map((k: string) => k.toLowerCase()));
      const finalFilteredKeywordsData = allParsedKeywords.filter((k: any) => englishKeywordSet.has(k.keyword.toLowerCase()));
      if (finalFilteredKeywordsData.length === 0) return NextResponse.json({ success: false, message: 'No English keywords found after language filtering' }, { status: 400 });

      const savedKeywordsInfo = [];
      for (const kData of finalFilteredKeywordsData) {
        const existing = await QuestionKeyword.findOne({ keyword: { $regex: new RegExp('^' + kData.keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }, userId: kData.userId });
        const savedKeyword = (existing ? await QuestionKeyword.findByIdAndUpdate(existing._id, kData, { new: true }) : await QuestionKeyword.create(kData)) as any;
        savedKeywordsInfo.push({ id: savedKeyword._id, keyword: savedKeyword.keyword, search_volume: savedKeyword.searchVolume, overall: savedKeyword.overall, competition: savedKeyword.competition, thirtyDayAgoSearches: savedKeyword.thirtyDayAgoSearches, numberOfWords: savedKeyword.numberOfWords });
      }

      const groupingsData = await segregateKeywordsIntoGroups(savedKeywordsInfo, customGroupsList);
      const customGroupsDescriptions: Record<string, string> = {};
      if (customGroupsList) {
        for (const part of customGroupsList.split(/[\n,]+/)) {
          const splitIndex = part.indexOf('|');
          if (splitIndex !== -1) {
            let t = part.substring(0, splitIndex).trim();
            if (t.startsWith('-')) t = t.substring(1).trim();
            const d = part.substring(splitIndex + 1).trim();
            if (t) customGroupsDescriptions[t.toLowerCase()] = d;
          }
        }
      }

      const groupingsGroup = await GroupingsGroup.create({ title: groupingsGroupTitle, numberOfGroups: groupingsData.length, userId, customGroupsList });
      const keywordsMap = new Map(savedKeywordsInfo.map((k: any) => [k.id.toString(), k]));
      const savedGroups = [];

      for (const group of groupingsData) {
        const populatedKeywords = [];
        let highestSearchVolume = 0;
        if (group.keywords && Array.isArray(group.keywords)) {
          for (const kw of group.keywords) {
            const kwIdStr = kw.id ? kw.id.toString() : '';
            const fullInfo = keywordsMap.get(kwIdStr);
            if (fullInfo) {
              populatedKeywords.push({ id: fullInfo.id.toString(), keyword: fullInfo.keyword, search_volume: fullInfo.search_volume, overall: fullInfo.overall, competition: fullInfo.competition });
              if (fullInfo.search_volume > highestSearchVolume) highestSearchVolume = fullInfo.search_volume;
            }
          }
        }
        const totalVolume = populatedKeywords.reduce((sum: number, kw: any) => sum + (kw.search_volume || 0), 0);
        const priority = highestSearchVolume >= 20000;
        const groupTitleLower = group.title ? group.title.toLowerCase() : '';
        const description = customGroupsDescriptions[groupTitleLower] || '';
        const newGroup = await Grouping.create({ title: group.title, description, keywords: [populatedKeywords], total_average_volume: totalVolume, userId, groupingsGroupId: groupingsGroup._id, priority });
        savedGroups.push(newGroup);
      }

      return NextResponse.json({ success: true, message: 'Keywords segregated and saved successfully', data: savedGroups });
    }

    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Error processing segregator request:', error);
    return NextResponse.json({ success: false, message: 'Error processing request' }, { status: 500 });
  }
}

// ============ PUT ============
export async function PUT(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  try {
    await connectDB();
    const body = await request.json();

    if (pathname === '/api/segregator/groups/keyword') {
      const { keyword, targetGroupIds, groupingsGroupId, userId = 'default-user' } = body;
      if (!keyword || !keyword.id || !Array.isArray(targetGroupIds)) {
        return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
      }
      const query: Record<string, any> = userId ? { userId } : {};
      if (groupingsGroupId) query.groupingsGroupId = groupingsGroupId;
      const allGroups = await Grouping.find(query);
      for (const group of allGroups) {
        const flatKeywords = group.keywords ? group.keywords.flat() : [];
        const hasKeyword = flatKeywords.some((kw: any) => kw.id === keyword.id || kw._id?.toString() === keyword.id);
        const shouldHaveKeyword = targetGroupIds.includes(group._id.toString());
        let changed = false;
        let newKeywords = [...flatKeywords];
        if (shouldHaveKeyword && !hasKeyword) { newKeywords.push(keyword); changed = true; }
        else if (!shouldHaveKeyword && hasKeyword) { newKeywords = newKeywords.filter((kw: any) => kw.id !== keyword.id && kw._id?.toString() !== keyword.id); changed = true; }
        if (changed) { group.keywords = [newKeywords] as any; group.total_average_volume = newKeywords.reduce((sum: number, kw: any) => sum + (Number(kw.search_volume) || 0), 0); await group.save(); }
      }
      return NextResponse.json({ success: true, message: 'Keyword groups updated successfully' });
    }

    const idMatch = pathname.match(/\/api\/segregator\/groups\/([^/]+)/);
    if (idMatch) {
      const id = idMatch[1];
      if (pathname.includes('/description')) {
        const updatedGroup = await Grouping.findByIdAndUpdate(id, { description: body.description ?? '' }, { new: true });
        if (!updatedGroup) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 });
        return NextResponse.json({ success: true, message: 'Group description updated successfully', data: updatedGroup });
      }
      if (pathname.includes('/priority')) {
        if (body.priority === undefined) return NextResponse.json({ success: false, message: 'Priority boolean is required' }, { status: 400 });
        const updatedGroup = await Grouping.findByIdAndUpdate(id, { priority: !!body.priority }, { new: true });
        if (!updatedGroup) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 });
        return NextResponse.json({ success: true, message: 'Group priority updated successfully', data: updatedGroup });
      }
      if (pathname.endsWith('/groups')) {
        const { title } = body;
        if (!title) return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 });
        const updatedGroup = await Grouping.findByIdAndUpdate(id, { title }, { new: true });
        if (!updatedGroup) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 });
        return NextResponse.json({ success: true, message: 'Group title updated successfully', data: updatedGroup });
      }
    }

    const groupMatch = pathname.match(/\/api\/segregator\/groupings-groups\/([^/]+)/);
    if (groupMatch) {
      const { title, description } = body;
      const updateFields: Record<string, any> = {};
      if (title !== undefined) { if (!title) return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 }); updateFields.title = title; }
      if (description !== undefined) updateFields.description = description;
      const group = await GroupingsGroup.findByIdAndUpdate(groupMatch[1], updateFields, { new: true });
      if (!group) return NextResponse.json({ success: false, message: 'Groupings group not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: group });
    }

    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Error in PUT segregator:', error);
    return NextResponse.json({ success: false, message: 'Error updating' }, { status: 500 });
  }
}

// ============ DELETE ============
export async function DELETE(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  try {
    await connectDB();

    if (pathname === '/api/segregator/groups') {
      await Grouping.deleteMany({});
      return NextResponse.json({ success: true, message: 'All groupings deleted successfully' });
    }
    if (pathname === '/api/segregator/groupings-groups') {
      await Grouping.deleteMany({});
      await GroupingsGroup.deleteMany({});
      return NextResponse.json({ success: true, message: 'All groupings groups and groupings deleted successfully' });
    }

    const groupMatch = pathname.match(/\/api\/segregator\/groups\/([^/]+)/);
    if (groupMatch) {
      const id = groupMatch[1];
      const groupToDelete = await Grouping.findById(id);
      if (!groupToDelete) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 });
      const flatKeywords = groupToDelete.keywords ? groupToDelete.keywords.flat() : [];
      if (flatKeywords.length > 0) {
        const query: Record<string, any> = { _id: { $ne: id } };
        if (groupToDelete.groupingsGroupId) query.groupingsGroupId = groupToDelete.groupingsGroupId;
        const otherGroups = await Grouping.find(query);
        if (otherGroups.length === 0) return NextResponse.json({ success: false, message: 'Cannot delete the last group if it contains keywords.' }, { status: 400 });
        const randomGroup = otherGroups[Math.floor(Math.random() * otherGroups.length)];
        randomGroup.keywords.push(flatKeywords);
        await randomGroup.save();
      }
      if (groupToDelete.groupingsGroupId) await GroupingsGroup.findByIdAndUpdate(groupToDelete.groupingsGroupId, { $inc: { numberOfGroups: -1 } });
      await Grouping.findByIdAndDelete(id);
      return NextResponse.json({ success: true, message: 'Group deleted successfully' });
    }

    const groupingsGroupMatch = pathname.match(/\/api\/segregator\/groupings-groups\/([^/]+)/);
    if (groupingsGroupMatch) {
      const id = groupingsGroupMatch[1];
      await Grouping.deleteMany({ groupingsGroupId: id });
      const deleted = await GroupingsGroup.findByIdAndDelete(id);
      if (!deleted) return NextResponse.json({ success: false, message: 'Groupings group not found' }, { status: 404 });
      return NextResponse.json({ success: true, message: 'Groupings group deleted successfully' });
    }

    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Error in DELETE segregator:', error);
    return NextResponse.json({ success: false, message: 'Error deleting' }, { status: 500 });
  }
}
