import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import Grouping from '@/models/Grouping';
import GroupingsGroup from '@/models/GroupingsGroup';
import QuestionKeyword from '@/models/QuestionKeyword';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

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

// POST /api/segregator/groups/:id/upload
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const parentGroup = await GroupingsGroup.findById(id);
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

  const populatedKeywords: any[] = [];
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

  let uploadedGroup = await Grouping.findOne({ groupingsGroupId: id, title: { $regex: /^uploaded$/i } });
  if (!uploadedGroup) {
    uploadedGroup = await Grouping.create({ title: 'uploaded', description: 'Keywords directly uploaded to this session', keywords: [], total_average_volume: 0, userId, groupingsGroupId: id, priority: highestSearchVolume >= 20000 });
    await GroupingsGroup.findByIdAndUpdate(id, { $inc: { numberOfGroups: 1 } });
  }

  const existingFlat = uploadedGroup.keywords ? uploadedGroup.keywords.flat() : [];
  const existingIds = new Set(existingFlat.map((k: any) => k.id));
  const allSessionGroups = await Grouping.find({ groupingsGroupId: id, _id: { $ne: uploadedGroup._id } });
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
