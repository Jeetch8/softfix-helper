#!/usr/bin/env node

/**
 * Import CSV/Excel Keywords Script
 * 
 * This script reads all CSV and Excel files from a specified directory
 * and uploads them to the database after processing.
 * 
 * Usage:
 *   node import-csv-keywords.js [directoryPath] [userId]
 * 
 * Examples:
 *   node import-csv-keywords.js "C:\Users\Jeetk\Documents\Question keywords vidiq"
 *   node import-csv-keywords.js "C:\Users\Jeetk\Documents\Question keywords vidiq" "user-123"
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { connectDB, disconnectDB } from '../config/database.js';
import QuestionKeyword from '../models/QuestionKeyword.js';
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1']);

// Default directory path
const DEFAULT_DIRECTORY = 'C:\\Users\\Jeetk\\Documents\\Question keywords vidiq';
const DEFAULT_USER_ID = 'default-user';

/**
 * Get all CSV and Excel files from a directory
 */
function getDataFilesFromDirectory(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        throw new Error(`Directory not found: ${directoryPath}`);
    }

    const files = fs.readdirSync(directoryPath);
    const dataFiles = files
        .filter(file => /\.(csv|xlsx|xls)$/i.test(file))
        // Skip duplicate files (files ending with "(1)" etc.)
        .filter(file => !/\(\d+\)\.[^.]+$/.test(file))
        .map(file => path.join(directoryPath, file));

    return dataFiles;
}

/**
 * Read and parse a CSV or Excel file
 */
function parseDataFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    let workbook;

    if (ext === '.csv') {
        // Read CSV file and remove BOM if present
        let csvContent = fs.readFileSync(filePath, 'utf8');
        // Remove BOM (Byte Order Mark) if present
        if (csvContent.charCodeAt(0) === 0xFEFF) {
            csvContent = csvContent.slice(1);
        }
        workbook = XLSX.read(csvContent, { type: 'string' });
    } else {
        // Read Excel file
        workbook = XLSX.readFile(filePath);
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    let data = XLSX.utils.sheet_to_json(worksheet);

    // Clean up column names by removing BOM and trimming whitespace
    data = data.map(row => {
        const cleanRow = {};
        for (const [key, value] of Object.entries(row)) {
            // Remove BOM and trim whitespace from column names
            const cleanKey = key.replace(/^\uFEFF/, '').trim();
            cleanRow[cleanKey] = value;
        }
        return cleanRow;
    });

    return data;
}

/**
 * Map row data to keyword schema
 * Uses the same mapping approach as keywordRoutes.js for consistency
 */
function mapRowToKeyword(row, userId) {
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
 * Import keywords from a single file
 */
async function importKeywordsFromFile(filePath, userId) {
    const stats = {
        fileName: path.basename(filePath),
        totalKeywords: 0,
        storedKeywords: 0,
        updatedKeywords: 0,
        skippedKeywords: 0,
        errors: [],
    };

    try {
        console.log(`  📄 Processing: ${stats.fileName}`);
        const data = parseDataFile(filePath);

        for (const row of data) {
            stats.totalKeywords++;

            const keywordData = mapRowToKeyword(row, userId);

            // Skip if keyword is empty
            if (!keywordData.keyword || keywordData.keyword.trim() === '') {
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
                console.error(`    ⚠️  Error saving keyword "${keywordData.keyword}": ${err.message}`);
                stats.errors.push({ keyword: keywordData.keyword, error: err.message });
                stats.skippedKeywords++;
            }
        }

        console.log(`    ✅ ${stats.fileName}: ${stats.storedKeywords} new, ${stats.updatedKeywords} updated, ${stats.skippedKeywords} skipped`);
    } catch (error) {
        console.error(`    ❌ Error processing file: ${error.message}`);
        stats.errors.push({ file: filePath, error: error.message });
    }

    return stats;
}

/**
 * Import all files from directory
 */
async function importKeywordsFromDirectory(directoryPath, userId) {
    console.log(`\n📂 Scanning directory: ${directoryPath}`);

    const dataFiles = getDataFilesFromDirectory(directoryPath);

    if (dataFiles.length === 0) {
        console.log(`  ⚠️  No CSV or Excel files found in directory`);
        return {
            success: false,
            message: `No CSV or Excel files found in directory: ${directoryPath}`,
            filesProcessed: 0,
        };
    }

    console.log(`  📊 Found ${dataFiles.length} file(s) to process\n`);

    const fileResults = [];
    const totalStats = {
        totalKeywords: 0,
        storedKeywords: 0,
        updatedKeywords: 0,
        skippedKeywords: 0,
        totalErrors: 0,
    };

    for (const filePath of dataFiles) {
        const result = await importKeywordsFromFile(filePath, userId);
        fileResults.push(result);

        totalStats.totalKeywords += result.totalKeywords;
        totalStats.storedKeywords += result.storedKeywords;
        totalStats.updatedKeywords += result.updatedKeywords;
        totalStats.skippedKeywords += result.skippedKeywords;
        totalStats.totalErrors += result.errors.length;
    }

    return {
        success: true,
        message: `Successfully processed ${dataFiles.length} file(s)`,
        filesProcessed: dataFiles.length,
        ...totalStats,
        fileResults,
    };
}

/**
 * Main execution function
 */
async function main() {
    const startTime = Date.now();

    // Get command line arguments
    const directoryPath = process.argv[2] || DEFAULT_DIRECTORY;
    const userId = process.argv[3] || DEFAULT_USER_ID;

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║           CSV/Excel Keyword Import Script                     ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`\n📋 Configuration:`);
    console.log(`   Directory: ${directoryPath}`);
    console.log(`   User ID:   ${userId}`);

    try {
        // Connect to database
        console.log(`\n🔌 Connecting to database...`);
        await connectDB();

        // Import keywords
        const result = await importKeywordsFromDirectory(directoryPath, userId);

        // Display results
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║                      Import Summary                            ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log(`\n📊 Statistics:`);
        console.log(`   Files processed:    ${result.filesProcessed}`);
        console.log(`   Total keywords:     ${result.totalKeywords}`);
        console.log(`   ✅ New keywords:     ${result.storedKeywords}`);
        console.log(`   🔄 Updated keywords: ${result.updatedKeywords}`);
        console.log(`   ⏭️  Skipped keywords: ${result.skippedKeywords}`);
        if (result.totalErrors > 0) {
            console.log(`   ❌ Errors:           ${result.totalErrors}`);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n⏱️  Total time: ${duration}s`);
        console.log(`\n✅ Import completed successfully!\n`);

        // Disconnect from database
        await disconnectDB();
        process.exit(0);
    } catch (error) {
        console.error(`\n❌ Import failed: ${error.message}`);
        console.error(error.stack);
        await disconnectDB();
        process.exit(1);
    }
}

// Run the script
main();
