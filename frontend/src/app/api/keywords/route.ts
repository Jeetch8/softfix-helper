import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import QuestionKeyword from '@/models/QuestionKeyword';
import * as XLSX from 'xlsx';
import { importKeywordsFromDirectory, importKeywordsFromFile, listExcelFiles } from '@/services/localExcelService';

const roundDownToOneDecimal = (val: number | null | undefined) => {
  if (val === null || val === undefined) return val;
  const num = parseFloat(val as unknown as string);
  if (isNaN(num)) return 0;
  return Math.floor(num * 10) / 10;
};

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('_path');

    if (path === '/api/keywords/stats') {
      const userId = searchParams.get('userId');
      const query = userId ? { userId } : {};
      const stats = await QuestionKeyword.aggregate([
        { $match: query },
        { $group: { _id: null, totalKeywords: { $sum: 1 }, avgOverall: { $avg: '$overall' }, avgCompetition: { $avg: '$competition' }, avgSearchVolume: { $avg: '$searchVolume' }, highScoreCount: { $sum: { $cond: [{ $gte: ['$overall', 70] }, 1, 0] } }, lowCompetitionCount: { $sum: { $cond: [{ $lte: ['$competition', 30] }, 1, 0] } } } },
      ]);
      const data = stats[0] || { totalKeywords: 0, avgOverall: 0, avgCompetition: 0, avgSearchVolume: 0, highScoreCount: 0, lowCompetitionCount: 0 };
      return NextResponse.json({ success: true, data: { ...data, avgOverall: Math.round(data.avgOverall * 100) / 100, avgCompetition: Math.round(data.avgCompetition * 100) / 100, avgSearchVolume: Math.round(data.avgSearchVolume) } });
    }

    if (path === '/api/keywords/local/list') {
      const directoryPath = searchParams.get('directoryPath');
      if (!directoryPath) return NextResponse.json({ success: false, message: 'directoryPath query parameter is required' }, { status: 400 });
      return NextResponse.json({ success: true, data: listExcelFiles(directoryPath) });
    }

    // Default: list keywords
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const minOverall = searchParams.get('minOverall');
    const maxOverall = searchParams.get('maxOverall');
    const minSearchVolume = searchParams.get('minSearchVolume');
    const maxSearchVolume = searchParams.get('maxSearchVolume');
    const minCompetition = searchParams.get('minCompetition');
    const maxCompetition = searchParams.get('maxCompetition');
    const addedToTitle = searchParams.get('addedToTitle');
    const sortBy = searchParams.get('sortBy') || 'overall';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: Record<string, any> = {};
    if (userId) query.userId = userId;
    if (addedToTitle !== undefined) query.addedToTitle = addedToTitle === 'true';
    if (search) query.keyword = { $regex: search, $options: 'i' };
    if (minOverall || maxOverall) { query.overall = {}; if (minOverall) query.overall.$gte = parseFloat(minOverall); if (maxOverall) query.overall.$lte = parseFloat(maxOverall); }
    if (minSearchVolume || maxSearchVolume) { query.searchVolume = {}; if (minSearchVolume) query.searchVolume.$gte = parseInt(minSearchVolume); if (maxSearchVolume) query.searchVolume.$lte = parseInt(maxSearchVolume); }
    if (minCompetition || maxCompetition) { query.competition = {}; if (minCompetition) query.competition.$gte = parseFloat(minCompetition); if (maxCompetition) query.competition.$lte = parseFloat(maxCompetition); }

    let sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;
    const total = await QuestionKeyword.countDocuments(query);
    const keywords = await QuestionKeyword.find(query).sort(sort).skip(skip).limit(limit);

    return NextResponse.json({ success: true, data: keywords, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    return NextResponse.json({ success: false, message: 'Error fetching keywords' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('_path');

    if (path === '/api/keywords/local/import-directory') {
      const body = await request.json();
      const { directoryPath, userId = 'default-user' } = body;
      if (!directoryPath) return NextResponse.json({ success: false, message: 'directoryPath is required in request body' }, { status: 400 });
      const result = await importKeywordsFromDirectory(directoryPath, userId);
      if (!result.success) return NextResponse.json({ success: false, message: result.message }, { status: 400 });
      return NextResponse.json({ success: true, message: result.message, data: result });
    }

    if (path === '/api/keywords/local/import-file') {
      const body = await request.json();
      const { filePath, userId = 'default-user' } = body;
      if (!filePath) return NextResponse.json({ success: false, message: 'filePath is required in request body' }, { status: 400 });
      const result = await importKeywordsFromFile(filePath, userId);
      return NextResponse.json({ success: true, message: `Imported keywords from ${result.fileName}`, data: result });
    }

    // Handle Excel file upload
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const userId = formData.get('userId') as string || 'default-user';
    const rowNumbers = formData.get('rowNumbers') as string || '';

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: 'No files uploaded' }, { status: 400 });
    }

    const parseRowNumbers = (str: string) => {
      if (!str || !str.trim()) return null;
      const indices = new Set<number>();
      const parts = str.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-');
          const s = parseInt(start.trim(), 10);
          const e = parseInt(end.trim(), 10);
          if (!isNaN(s) && !isNaN(e)) { for (let i = s; i <= e; i++) indices.add(i); }
        } else {
          const val = parseInt(trimmed, 10);
          if (!isNaN(val)) indices.add(val);
        }
      }
      return indices.size > 0 ? indices : null;
    };

    const targetRows = parseRowNumbers(rowNumbers);
    let totalKeywords = 0, storedKeywords = 0, skippedKeywords = 0, duplicateKeywords = 0;

    for (const file of files) {
      if (file.name.match(/\(\d+\)\.[^.]+$/)) {
        console.log(`Skipping duplicate file: ${file.name}`);
        continue;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const excelRowNumber = i + 2;
        if (targetRows && !targetRows.has(excelRowNumber)) continue;
        totalKeywords++;

        const keywordData: any = {
          keyword: row['Keyword'] || row['keyword'],
          competition: roundDownToOneDecimal(row['Competition'] || row['competition']),
          overall: roundDownToOneDecimal(row['Overall'] || row['overall']),
          searchVolume: parseInt(row['Search volume'] || row['searchVolume'] || row['search_volume']) || 0,
          thirtyDayAgoSearches: parseInt(row['30d ago searches'] || row['thirtyDayAgoSearches']) || 0,
          timestamp: parseInt(row['Timestamp'] || row['timestamp']) || null,
          numberOfWords: parseInt(row['Number of words'] || row['numberOfWords'] || row['number_of_words']) || 1,
          userId,
        };

        if (!keywordData.keyword) { skippedKeywords++; continue; }

        try {
          const existingKeyword = await QuestionKeyword.findOne({ keyword: keywordData.keyword, userId });
          if (existingKeyword) {
            await QuestionKeyword.findByIdAndUpdate(existingKeyword._id, keywordData);
            duplicateKeywords++;
          } else {
            await QuestionKeyword.create(keywordData);
            storedKeywords++;
          }
        } catch (err) {
          console.error(`Error saving keyword "${keywordData.keyword}":`, err);
          skippedKeywords++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Keywords uploaded successfully',
      data: { filesProcessed: files.length, totalKeywords, storedKeywords, updatedKeywords: duplicateKeywords, skippedKeywords },
    });
  } catch (error) {
    console.error('Error uploading keywords:', error);
    return NextResponse.json({ success: false, message: 'Error uploading keywords' }, { status: 500 });
  }
}
