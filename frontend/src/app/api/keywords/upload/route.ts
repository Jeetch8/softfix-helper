import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import QuestionKeyword from '@/models/QuestionKeyword';

const roundDownToOneDecimal = (val: any) => {
  if (val === null || val === undefined) return val;
  const num = parseFloat(val);
  if (isNaN(num)) return 0;
  return Math.floor(num * 10) / 10;
};

export async function POST(request: NextRequest) {
  await connectDB();

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const userId = (formData.get('userId') || 'default-user') as string;
    const rowNumbers = (formData.get('rowNumbers') || '') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No files uploaded' },
        { status: 400 },
      );
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
          if (!isNaN(s) && !isNaN(e)) {
            for (let i = s; i <= e; i++) indices.add(i);
          }
        } else {
          const val = parseInt(trimmed, 10);
          if (!isNaN(val)) indices.add(val);
        }
      }
      return indices.size > 0 ? indices : null;
    };

    const targetRows = parseRowNumbers(rowNumbers);
    let totalKeywords = 0;
    let storedKeywords = 0;
    let skippedKeywords = 0;
    let duplicateKeywords = 0;

    for (const file of files) {
      if (file.name.match(/\(\d+\)\.[^.]+$/)) {
        console.log(`Skipping duplicate file: ${file.name}`);
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      for (let i = 0; i < data.length; i++) {
        const row = data[i] as Record<string, any>;
        const excelRowNumber = i + 2;

        if (targetRows && !targetRows.has(excelRowNumber)) continue;

        totalKeywords++;

        const keywordData = {
          keyword: row['Keyword'] || row['keyword'],
          competition: roundDownToOneDecimal(row['Competition'] || row['competition']),
          overall: roundDownToOneDecimal(row['Overall'] || row['overall']),
          searchVolume: parseInt(row['Search volume'] || row['searchVolume'] || row['search_volume']) || 0,
          thirtyDayAgoSearches: parseInt(row['30d ago searches'] || row['thirtyDayAgoSearches']) || 0,
          timestamp: parseInt(row['Timestamp'] || row['timestamp']) || null,
          numberOfWords: parseInt(row['Number of words'] || row['numberOfWords'] || row['number_of_words']) || 1,
          userId,
        };

        if (!keywordData.keyword) {
          skippedKeywords++;
          continue;
        }

        try {
          const existingKeyword = await QuestionKeyword.findOne({
            keyword: keywordData.keyword,
            userId,
          });

          if (existingKeyword) {
            await QuestionKeyword.findByIdAndUpdate(existingKeyword._id, keywordData);
            duplicateKeywords++;
          } else {
            await QuestionKeyword.create(keywordData);
            storedKeywords++;
          }
        } catch (err) {
          console.error(`Error saving keyword "${keywordData.keyword}":`, err instanceof Error ? err.message : String(err));
          skippedKeywords++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Keywords uploaded successfully',
      data: {
        filesProcessed: files.length,
        totalKeywords,
        storedKeywords,
        updatedKeywords: duplicateKeywords,
        skippedKeywords,
      },
    });
  } catch (error) {
    console.error('❌ Error uploading keywords:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error uploading keywords',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
