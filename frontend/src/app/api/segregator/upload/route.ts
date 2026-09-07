import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import Grouping from '@/models/Grouping';
import GroupingsGroup from '@/models/GroupingsGroup';
import QuestionKeyword from '@/models/QuestionKeyword';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { filterNonEnglishKeywords, segregateKeywordsIntoGroups } from '@/services/geminiService';

const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

async function saveFileToTemp(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = Date.now() + '-' + (file.name || 'file').replace(/[^a-zA-Z0-9.]/g, '_');
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

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

const roundDownToOneDecimal = (val: number | null | undefined) => {
  if (val === null || val === undefined) return val;
  const num = parseFloat(val as unknown as string);
  if (isNaN(num)) return 0;
  return Math.floor(num * 10) / 10;
};

// POST /api/segregator/upload
export async function POST(request: NextRequest) {
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
        const { isLessThan, value: searchVolume } = parseSearchVolume(r['Search volume'] || r['Search Volume'] || r['searchVolume'] || r['search_volume'] || r['Search vol'] || r['Volume']);
        if (isLessThan || searchVolume < 750) continue;
        const overall = parseFloat(String(r['Overall'] || r['overall'] || 0).replace(/[^0-9.-]/g, '')) || 0;
        const normalizedKeyword = keyword.toLowerCase();
        if (!uniqueKeywordsMap.has(normalizedKeyword)) {
          uniqueKeywordsMap.set(normalizedKeyword, { keyword, competition: roundDownToOneDecimal(r['Competition'] || r['competition']), overall: roundDownToOneDecimal(overall), searchVolume, thirtyDayAgoSearches: parseInt(String(r['30d ago searches'] || r['thirtyDayAgoSearches'] || 0).replace(/[^0-9]/g, '')) || 0, timestamp: parseInt(r['Timestamp'] || r['timestamp'], 10) || null, numberOfWords: parseInt(r['Number of words'] || r['numberOfWords'] || r['number_of_words'], 10) || keyword.split(/\s+/).length, userId });
        } else {
          const existing = uniqueKeywordsMap.get(normalizedKeyword);
          if (searchVolume > (existing as any).searchVolume) { uniqueKeywordsMap.set(normalizedKeyword, { ...existing, keyword, searchVolume, competition: roundDownToOneDecimal(r['Competition'] || r['competition']), overall: roundDownToOneDecimal(overall) }); }
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

  const savedKeywordsInfo: any[] = [];
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
  const savedGroups: any[] = [];

  for (const group of groupingsData) {
    const populatedKeywords: any[] = [];
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
