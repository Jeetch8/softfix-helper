import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import QuestionKeyword from '@/models/QuestionKeyword';

const roundDownToOneDecimal = (val: number | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(val as unknown as string);
  if (isNaN(num)) return 0;
  return Math.floor(num * 10) / 10;
};

export function getExcelFilesFromDirectory(directoryPath: string): string[] {
  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory not found: ${directoryPath}`);
  }

  const files = fs.readdirSync(directoryPath);
  return files
    .filter((file) => /\.(xlsx|xls)$/i.test(file))
    .filter((file) => !/\(\d+\)\.[^.]+$/.test(file))
    .map((file) => path.join(directoryPath, file));
}

export function parseExcelFile(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

export function mapRowToKeyword(row: Record<string, any>, userId = 'default-user') {
  return {
    keyword: String(row['Keyword'] || row['keyword'] || ''),
    competition: roundDownToOneDecimal(row['Competition'] || row['competition']),
    overall: roundDownToOneDecimal(row['Overall'] || row['overall']),
    searchVolume: parseInt(row['Search volume'] || row['searchVolume'] || row['search_volume'], 10) || 0,
    thirtyDayAgoSearches: parseInt(row['30d ago searches'] || row['thirtyDayAgoSearches'], 10) || 0,
    timestamp: parseInt(row['Timestamp'] || row['timestamp'], 10) || null,
    numberOfWords: parseInt(row['Number of words'] || row['numberOfWords'] || row['number_of_words'], 10) || 1,
    userId,
  };
}

export async function importKeywordsFromFile(filePath: string, userId = 'default-user') {
  const stats = {
    fileName: path.basename(filePath),
    totalKeywords: 0,
    storedKeywords: 0,
    updatedKeywords: 0,
    skippedKeywords: 0,
    errors: [] as { keyword?: string; file?: string; error: string }[],
  };

  try {
    const data = parseExcelFile(filePath);

    for (const row of data) {
      stats.totalKeywords++;
      const keywordData = mapRowToKeyword(row, userId);

      if (!keywordData.keyword) {
        stats.skippedKeywords++;
        continue;
      }

      try {
        const existingKeyword = await QuestionKeyword.findOne({
          keyword: keywordData.keyword,
          userId,
        });

        if (existingKeyword) {
          await QuestionKeyword.findByIdAndUpdate(existingKeyword._id, keywordData as any);
          stats.updatedKeywords++;
        } else {
          await QuestionKeyword.create(keywordData as any);
          stats.storedKeywords++;
        }
      } catch (err) {
        console.error(`Error saving keyword "${keywordData.keyword}":`, err);
        stats.errors.push({ keyword: keywordData.keyword, error: err instanceof Error ? err.message : String(err) });
        stats.skippedKeywords++;
      }
    }
  } catch (error) {
    stats.errors.push({ file: filePath, error: error instanceof Error ? error.message : String(error) });
  }

  return stats;
}

export async function importKeywordsFromDirectory(directoryPath: string, userId = 'default-user') {
  const excelFiles = getExcelFilesFromDirectory(directoryPath);

  if (excelFiles.length === 0) {
    return {
      success: false as const,
      message: `No Excel files found in directory: ${directoryPath}`,
      filesProcessed: 0,
      fileResults: [],
    };
  }

  console.log(`📂 Found ${excelFiles.length} Excel file(s) in ${directoryPath}`);

  const fileResults = [];
  let totalStats = {
    totalKeywords: 0,
    storedKeywords: 0,
    updatedKeywords: 0,
    skippedKeywords: 0,
  };

  for (const filePath of excelFiles) {
    console.log(`📄 Processing: ${path.basename(filePath)}`);
    const result = await importKeywordsFromFile(filePath, userId);
    fileResults.push(result);
    totalStats.totalKeywords += result.totalKeywords;
    totalStats.storedKeywords += result.storedKeywords;
    totalStats.updatedKeywords += result.updatedKeywords;
    totalStats.skippedKeywords += result.skippedKeywords;
  }

  return {
    success: true as const,
    message: `Processed ${excelFiles.length} Excel file(s) from ${directoryPath}`,
    filesProcessed: excelFiles.length,
    ...totalStats,
    fileResults,
  };
}

export function listExcelFiles(directoryPath: string) {
  const excelFiles = getExcelFilesFromDirectory(directoryPath);
  const fileDetails = excelFiles.map((filePath) => {
    const stats = fs.statSync(filePath);
    return {
      fileName: path.basename(filePath),
      path: filePath,
      sizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    };
  });

  return {
    directory: directoryPath,
    fileCount: fileDetails.length,
    files: fileDetails,
  };
}
