import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import QuestionKeyword from '../models/QuestionKeyword.js';

/**
 * Local Excel File Service
 * Reads Excel files from local filesystem and imports keywords to database
 */

/**
 * Get all Excel files from a directory
 * @param {string} directoryPath - Path to the directory containing Excel files
 * @returns {string[]} - Array of Excel file paths
 */
export function getExcelFilesFromDirectory(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        throw new Error(`Directory not found: ${directoryPath}`);
    }

    const files = fs.readdirSync(directoryPath);
    const excelFiles = files
        .filter(file => /\.(xlsx|xls)$/i.test(file))
        // Skip duplicate files (files ending with "(1)" etc.)
        .filter(file => !/\(\d+\)\.[^.]+$/.test(file))
        .map(file => path.join(directoryPath, file));

    return excelFiles;
}

/**
 * Read and parse a single Excel file
 * @param {string} filePath - Path to the Excel file
 * @returns {Object[]} - Array of parsed row data
 */
export function parseExcelFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    return data;
}

/**
 * Map Excel row to keyword schema
 * @param {Object} row - Row data from Excel
 * @param {string} userId - User ID to associate with keyword
 * @returns {Object} - Mapped keyword data
 */
export function mapRowToKeyword(row, userId = 'default-user') {
    return {
        keyword: row['Keyword'] || row['keyword'],
        competition: parseFloat(row['Competition'] || row['competition']) || 0,
        overall: parseFloat(row['Overall'] || row['overall']) || 0,
        searchVolume: parseInt(row['Search volume'] || row['searchVolume'] || row['search_volume']) || 0,
        thirtyDayAgoSearches: parseInt(row['30d ago searches'] || row['thirtyDayAgoSearches']) || 0,
        timestamp: parseInt(row['Timestamp'] || row['timestamp']) || null,
        numberOfWords: parseInt(row['Number of words'] || row['numberOfWords'] || row['number_of_words']) || 1,
        userId,
    };
}

/**
 * Import keywords from a single Excel file to database
 * @param {string} filePath - Path to the Excel file
 * @param {string} userId - User ID to associate with keywords
 * @returns {Object} - Import statistics
 */
export async function importKeywordsFromFile(filePath, userId = 'default-user') {
    const stats = {
        fileName: path.basename(filePath),
        totalKeywords: 0,
        storedKeywords: 0,
        updatedKeywords: 0,
        skippedKeywords: 0,
        errors: [],
    };

    try {
        const data = parseExcelFile(filePath);

        for (const row of data) {
            stats.totalKeywords++;

            const keywordData = mapRowToKeyword(row, userId);

            // Skip if keyword is empty
            if (!keywordData.keyword) {
                stats.skippedKeywords++;
                continue;
            }

            // Only store keywords with overall score > 50
            if (keywordData.overall <= 50) {
                stats.skippedKeywords++;
                continue;
            }

            try {
                const existingKeyword = await QuestionKeyword.findOne({
                    keyword: keywordData.keyword,
                    userId,
                });

                if (existingKeyword) {
                    // Update existing keyword with new data
                    await QuestionKeyword.findByIdAndUpdate(existingKeyword._id, keywordData);
                    stats.updatedKeywords++;
                } else {
                    // Create new keyword
                    await QuestionKeyword.create(keywordData);
                    stats.storedKeywords++;
                }
            } catch (err) {
                console.error(`Error saving keyword "${keywordData.keyword}":`, err.message);
                stats.errors.push({ keyword: keywordData.keyword, error: err.message });
                stats.skippedKeywords++;
            }
        }
    } catch (error) {
        stats.errors.push({ file: filePath, error: error.message });
    }

    return stats;
}

/**
 * Import all Excel files from a directory to database
 * @param {string} directoryPath - Path to the directory containing Excel files
 * @param {string} userId - User ID to associate with keywords
 * @returns {Object} - Overall import statistics
 */
export async function importKeywordsFromDirectory(directoryPath, userId = 'default-user') {
    const excelFiles = getExcelFilesFromDirectory(directoryPath);

    if (excelFiles.length === 0) {
        return {
            success: false,
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
        success: true,
        message: `Processed ${excelFiles.length} Excel file(s) from ${directoryPath}`,
        filesProcessed: excelFiles.length,
        ...totalStats,
        fileResults,
    };
}

/**
 * List available Excel files in a directory without importing
 * @param {string} directoryPath - Path to the directory
 * @returns {Object} - List of files with basic info
 */
export function listExcelFiles(directoryPath) {
    const excelFiles = getExcelFilesFromDirectory(directoryPath);

    const fileDetails = excelFiles.map(filePath => {
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
