# Quick Start Guide - Import Keywords

## 🚀 Fastest Way to Import

### Option 1: Double-Click (Windows)
1. Navigate to: `server\scripts\`
2. Double-click `import-keywords.bat`
3. Done! ✅

### Option 2: Use NPM Script
```bash
cd server
npm run import-keywords
```

### Option 3: Custom Directory
```bash
cd server
npm run import-keywords "C:\Path\To\Your\CSV\Files" "your-user-id"
```

## 📁 Default Settings

- **Directory**: `C:\Users\Jeetk\Documents\Question keywords vidiq`
- **User ID**: `default-user`
- **File Types**: `.csv`, `.xlsx`, `.xls`

## ✅ What Gets Imported

- Keywords with **overall score > 50**
- Non-empty keyword values
- All files except duplicates (files ending with "(1)", etc.)

## 📊 What to Expect

```
✅ Import completed successfully!

📊 Statistics:
   Files processed:    3
   Total keywords:     150
   ✅ New keywords:     120  (newly added)
   🔄 Updated keywords: 20   (already existed, updated)
   ⏭️  Skipped keywords: 10   (overall ≤ 50 or empty)
```

## ⚠️ Before Running

1. Make sure MongoDB is running and accessible
2. Check that `.env` file has correct `MONGODB_URI`
3. Ensure CSV/Excel files are in the correct directory

## 🔍 Need Help?

See full documentation in `README.md`
