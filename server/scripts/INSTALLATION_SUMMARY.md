# 📦 CSV/Excel Keywords Import Tool - Installation Summary

## ✅ What Has Been Created

### 1. Main Import Script
📄 **Location**: `server/scripts/import-csv-keywords.js`

**Features**:
- ✅ Reads CSV and Excel files (`.csv`, `.xlsx`, `.xls`)
- ✅ Processes entire directories automatically
- ✅ Filters keywords by overall score (> 50)
- ✅ Updates existing keywords or creates new ones
- ✅ Handles various column name formats
- ✅ Provides detailed statistics
- ✅ Connects to MongoDB database
- ✅ Error handling and logging

### 2. Windows Batch File
📄 **Location**: `server/scripts/import-keywords.bat`

**Purpose**: Easy one-click execution for Windows users

**Usage**: Just double-click the file!

### 3. Documentation
📄 **Locations**:
- `server/scripts/README.md` - Full documentation
- `server/scripts/QUICKSTART.md` - Quick reference guide

### 4. NPM Script
📄 **Added to**: `server/package.json`

**Command**: `npm run import-keywords`

## 🎯 How to Use

### Method 1: Easiest (Windows)
```
Navigate to: server/scripts/
Double-click: import-keywords.bat
```

### Method 2: Using NPM
```bash
cd server
npm run import-keywords
```

### Method 3: Custom Path
```bash
cd server
node scripts/import-csv-keywords.js "C:\Your\Custom\Path" "your-user-id"
```

## 📁 Default Configuration

**Directory**: `C:\Users\Jeetk\Documents\Question keywords vidiq`

This directory contains CSV files like:
- account_question_keywords.csv
- adobe_question_keywords.csv
- youtube_question_keywords.csv
- zoom_question_keywords.csv
- And many more...

**User ID**: `default-user`

## 🔧 CSV File Format Expected

The script is flexible and accepts various column names:

| Data | Accepted Column Names |
|------|----------------------|
| Keyword | Keyword, keyword, Question, question |
| Overall Score | Overall, overall, Score, score |
| Competition | Competition, competition, Comp |
| Search Volume | Search volume, searchVolume, Volume |
| 30-Day Searches | 30d ago searches, thirtyDayAgoSearches |
| Timestamp | Timestamp, timestamp, Time |
| Word Count | Number of words, numberOfWords |

**Example CSV**:
```csv
Keyword,Overall,Competition,Search volume,30d ago searches
"how to make pizza",75,45,5000,4800
"best laptop 2024",82,60,8000,7500
```

## 📊 Import Process

1. **Scans directory** for CSV/Excel files
2. **Reads each file** and parses data
3. **Filters keywords**:
   - Removes empty keywords
   - Only keeps keywords with overall > 50
   - Skips duplicate files (ending with "(1)", etc.)
4. **Saves to database**:
   - Creates new keywords
   - Updates existing keywords
5. **Reports statistics**:
   - Files processed
   - Keywords added/updated/skipped
   - Errors (if any)

## ⚙️ Technical Details

**Database Model**: `QuestionKeyword`

**Schema Fields**:
- `keyword` (String) - The keyword/question
- `overall` (Number) - Overall score (min: 50)
- `competition` (Number) - Competition score
- `searchVolume` (Number) - Search volume
- `thirtyDayAgoSearches` (Number) - 30-day ago searches
- `timestamp` (Number) - Unix timestamp
- `numberOfWords` (Number) - Word count
- `addedToTitle` (Boolean) - Whether added to title
- `userId` (String) - User identifier

## 🚀 Next Steps

1. **Test the import**:
   ```bash
   cd server
   npm run import-keywords
   ```

2. **Verify data in database**:
   - Check MongoDB for imported keywords
   - Use the API: `GET /api/keywords`

3. **View statistics**:
   - Use API: `GET /api/keywords/stats`

## 📞 Support & Troubleshooting

Common issues and solutions are documented in:
- `server/scripts/README.md` (Troubleshooting section)

Key checks:
- ✅ MongoDB connection is working
- ✅ `.env` file has correct `MONGODB_URI`
- ✅ Directory path is correct
- ✅ CSV/Excel files are properly formatted

## 🎉 Ready to Go!

Everything is set up and ready to use. Just run the import script and your keywords will be uploaded to the database!
