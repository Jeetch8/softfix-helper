# Extra Assets Testing Guide

## Prerequisites

- Backend server running on `http://localhost:3000`
- Frontend running on `http://localhost:5173`
- MongoDB connected via `.env` file
- AWS S3 credentials configured
- FFmpeg installed on system (for MP3 conversion)

## Step-by-Step Testing

### 1. Start the Backend Server

```bash
cd server
npm start
# Expected output:
# ✅ Database connected successfully
# 🎯 Gemini AI Service Initialized
# 🎵 Cron job started...
```

### 2. Start the Frontend

```bash
cd frontend
npm run dev
# Expected output:
# ➜  local:   http://localhost:5173/
```

### 3. Create a Topic

1. Open `http://localhost:5173`
2. Enter topic name (e.g., "How to Learn React")
3. Optional: Add description
4. Click "Create Topic"

### 4. Test Script Generation

- Wait for cron job (runs every 2 minutes) or manually trigger
- Topic should show narration script
- Status should update to "Script Generated ✅"

### 5. Test Title Generation

1. Click "🎬 Generate YouTube Titles"
2. Wait for 10 SEO-optimized titles
3. Select one title
4. Try copying the title with the copy button

### 6. Test Thumbnail Generation

1. Click "🎨 Generate YouTube Thumbnails"
2. Wait for 10 unique thumbnail designs
3. Select one thumbnail
4. Check that S3 uploads work (files in S3 bucket)

### 7. Test Extra Assets Generation (NEW)

1. Click "⭐ Generate Extra Assets"
2. Wait for all 4 assets to generate simultaneously:
   - ✅ SEO Description (150-250 chars)
   - ✅ Tags (12-15 relevant keywords)
   - ✅ Timestamps (5-7 video sections)
   - ✅ MP3 Audio (Gemini TTS conversion)

### 8. Test Individual Copy Buttons

- **SEO Description**: Copy blue section
- **Tags**: Copy all tags as comma-separated list
- **Timestamps**: Copy all timestamps with times
- **Audio**: Copy S3 URL to clipboard

### 9. Test Audio Player

1. Look for embedded audio player in purple section
2. Play the generated MP3
3. Click "Open in new tab" to verify S3 URL works

### 10. Test Regenerate

1. Click "🔄 Regenerate Extra Assets"
2. Verify new assets are generated
3. Check that old MP3 is replaced with new one

## Expected API Responses

### Generate Extra Assets Request

```bash
POST /api/topics/:id/generate-extra-assets
```

### Expected Response

```json
{
  "success": true,
  "message": "Extra assets generated successfully",
  "data": {
    "seoDescription": "Learn React basics with this comprehensive tutorial...",
    "tags": ["React", "JavaScript", "Web Development", ...],
    "timestamps": [
      { "time": "0:00", "description": "Introduction" },
      { "time": "1:30", "description": "React Basics" },
      ...
    ],
    "audioUrl": "https://softfix-helper.sfo3.digitaloceanspaces.com/audio/..."
  }
}
```

## Troubleshooting

### Issue: "FFmpeg not found"

**Solution**: Install FFmpeg

- Windows: `choco install ffmpeg`
- Mac: `brew install ffmpeg`
- Linux: `sudo apt-get install ffmpeg`

### Issue: "Audio generation timeout"

**Solution**:

- May take 1-2 minutes for large scripts
- Check browser console for error messages
- Verify Gemini API key in `.env`

### Issue: "S3 upload fails"

**Solution**:

- Verify AWS credentials in `.env`
- Check S3 bucket name and region
- Ensure bucket has public-read ACL

### Issue: "Tags or description are generic"

**Solution**:

- Regenerate with different script content
- Ensure script has specific details
- Try longer scripts for better context

## Monitoring

### Backend Logs

Look for these success indicators:

```
🎯 Generating extra assets for topic...
✅ Generated and uploaded thumbnail
⏳ Generating audio using Gemini TTS...
💾 Saving temporary WAV file...
🔄 Converting WAV to MP3...
☁️  Uploading MP3 to S3...
✅ Audio file generated and uploaded successfully
✅ Extra assets generated for topic
```

### Frontend Indicators

- Loading spinner appears during generation
- Each section updates with content
- Copy buttons show "✓ Copied!" confirmation
- Audio player becomes interactive

## Performance Notes

- Total generation time: 30-90 seconds (varies with script length)
- MP3 generation is the longest step (20-60 seconds)
- All 4 assets generate in parallel for efficiency
- S3 uploads are relatively fast (< 5 seconds)

## Database Fields Updated

When extra assets are generated, Topic document gets:

```javascript
{
  seoDescription: String,        // YouTube description
  tags: [String],                // Array of keywords
  timestamps: [                  // Array of chapter markers
    {
      time: String,              // MM:SS format
      description: String        // Chapter description
    }
  ],
  audioUrl: String              // S3 URL to MP3 file
}
```

## Success Criteria

- ✅ All 4 assets generate without errors
- ✅ MP3 file plays correctly in browser
- ✅ Copy buttons work for all asset types
- ✅ S3 files are publicly accessible
- ✅ Regenerate creates new unique content
- ✅ UI updates reflect generated data
- ✅ Database stores all assets correctly
