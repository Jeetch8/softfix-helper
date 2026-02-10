# CSV/Excel Keywords Import Script

This script allows you to import question keywords from CSV and Excel files into the database.

## Features

- ✅ Supports both CSV and Excel files (`.csv`, `.xlsx`, `.xls`)
- ✅ Automatically processes all files in a directory
- ✅ Skips duplicate files (files ending with `(1)`, `(2)`, etc.)
- ✅ Filters keywords by overall score (only stores keywords with overall > 50)
- ✅ Updates existing keywords if they already exist in the database
- ✅ Handles various column name formats (case-insensitive)
- ✅ Provides detailed import statistics
- ✅ Error handling for individual keywords

## Files

- **import-csv-keywords.js** - Main Node.js script
- **import-keywords.bat** - Windows batch file for easy execution

## Prerequisites

1. Node.js installed (v18 or higher)
2. MongoDB connection configured in `.env` file
3. Required npm packages installed (`npm install`)

## Usage

### Method 1: Using the Batch File (Windows - Easiest)

Double-click `import-keywords.bat` or run it from command line:

```batch
# Use default directory
import-keywords.bat

# Specify custom directory
import-keywords.bat "C:\Path\To\Your\CSV\Files"

# Specify directory and user ID
import-keywords.bat "C:\Path\To\Your\CSV\Files" "user-123"
```

### Method 2: Using Node.js Directly

```bash
# Navigate to server directory
cd server

# Use default directory (C:\Users\Jeetk\Documents\Question keywords vidiq)
node scripts/import-csv-keywords.js

# Specify custom directory
node scripts/import-csv-keywords.js "C:\Path\To\Your\CSV\Files"

# Specify directory and user ID
node scripts/import-csv-keywords.js "C:\Path\To\Your\CSV\Files" "user-123"
```

## Expected CSV/Excel Format

The script supports flexible column naming. It will recognize the following column names (case-insensitive):

| Required Field | Accepted Column Names |
|----------------|----------------------|
| Keyword | `Keyword`, `keyword`, `Question`, `question` |
| Overall Score | `Overall`, `overall`, `Score`, `score` |
| Competition | `Competition`, `competition`, `Comp` |
| Search Volume | `Search volume`, `searchVolume`, `search_volume`, `Volume`, `volume` |
| 30-Day Searches | `30d ago searches`, `thirtyDayAgoSearches`, `30_day_searches` |
| Timestamp | `Timestamp`, `timestamp`, `Time`, `time` |
| Number of Words | `Number of words`, `numberOfWords`, `number_of_words`, `WordCount`, `word_count` |

### Example CSV Format:

```csv
Keyword,Overall,Competition,Search volume,30d ago searches,Timestamp,Number of words
"how to make pizza",75,45,5000,4800,1707456000,4
"best laptop 2024",82,60,8000,7500,1707456000,3
"learn python programming",65,35,12000,11500,1707456000,3
```

### Example Excel Format:

| Keyword | Overall | Competition | Search volume | 30d ago searches | Timestamp | Number of words |
|---------|---------|-------------|---------------|------------------|-----------|----------------|
| how to make pizza | 75 | 45 | 5000 | 4800 | 1707456000 | 4 |
| best laptop 2024 | 82 | 60 | 8000 | 7500 | 1707456000 | 3 |

## Import Rules

1. **Overall Score Filter**: Only keywords with `overall > 50` are imported
2. **Empty Keywords**: Rows with empty keyword fields are skipped
3. **Duplicate Keywords**: If a keyword already exists for the same user, it will be updated with the new data
4. **Duplicate Files**: Files with names ending in `(1)`, `(2)`, etc. are automatically skipped

## Output

The script provides detailed statistics:

```
╔════════════════════════════════════════════════════════════════╗
║                      Import Summary                            ║
╚════════════════════════════════════════════════════════════════╝

📊 Statistics:
   Files processed:    3
   Total keywords:     150
   ✅ New keywords:     120
   🔄 Updated keywords: 20
   ⏭️  Skipped keywords: 10

⏱️  Total time: 2.45s

✅ Import completed successfully!
```

## Troubleshooting

### Error: "Directory not found"
- Verify the directory path is correct
- Make sure to use quotes if the path contains spaces
- Use absolute paths (e.g., `C:\Users\...`)

### Error: "MONGODB_URI environment variable is not set"
- Check that `.env` file exists in the `server` directory
- Verify that `MONGODB_URI` is set in the `.env` file

### Error: "No CSV or Excel files found"
- Check that the directory contains `.csv`, `.xlsx`, or `.xls` files
- Verify file permissions

### Some keywords are being skipped
- Check that the `overall` score is greater than 50
- Verify that the keyword field is not empty
- Look for error messages in the console output

## Integration with API

While this is a standalone script, you can also use the API endpoints for importing:

```bash
# Import from a local directory via API
curl -X POST http://localhost:3000/api/keywords/local/import-directory \
  -H "Content-Type: application/json" \
  -d '{
    "directoryPath": "C:\\Users\\Jeetk\\Documents\\Question keywords vidiq",
    "userId": "default-user"
  }'

# List files in a directory
curl "http://localhost:3000/api/keywords/local/list?directoryPath=C:\\Users\\Jeetk\\Documents\\Question%20keywords%20vidiq"
```

## Advanced Usage

### Process Specific File Only

Edit the script to process a single file by modifying the `main()` function:

```javascript
// In import-csv-keywords.js
const filePath = 'C:\\Users\\Jeetk\\Documents\\Question keywords vidiq\\keywords.csv';
const result = await importKeywordsFromFile(filePath, userId);
```

### Custom Filtering

You can modify the filtering logic in the script to customize what keywords get imported:

```javascript
// Example: Only import keywords with high search volume
if (keywordData.searchVolume < 1000) {
    stats.skippedKeywords++;
    continue;
}
```

## Notes

- The script connects to your MongoDB database, so ensure it's accessible
- Large files may take some time to process
- The script automatically handles both CSV and Excel formats
- All file processing is logged to the console for tracking
