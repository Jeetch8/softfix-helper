# TTS Narration API - YouTube Video Script Generator

A powerful Express.js API that generates YouTube video narration scripts using Google's Gemini AI, with MongoDB storage and automated cron job processing.

## Features

✨ **Core Features:**

- 🤖 AI-powered narration script generation using Gemini AI
- 📅 Automated cron job processing for multiple topics (runs every 2 minutes)
- 💾 MongoDB database storage for all topics and results
- 🐳 Full Docker and Docker Compose support for easy deployment
- 🔄 Async processing with status tracking (pending → processing → completed/failed)
- ⚡ RESTful API with comprehensive endpoints
- 🔍 Query topics by ID or retrieve all topics for a user
- 📊 Status statistics and filtering capabilities

## Prerequisites

- Node.js >= 18.0.0
- Docker and Docker Compose
- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))
- FFmpeg (included in Docker image)

## Project Structure

```
server/
├── server.js                 # Main Express application
├── package.json             # Dependencies
├── Dockerfile               # Container image definition
├── .env                     # Environment variables (create with your API key)
├── tts-converter.js         # Original TTS converter (kept as-is)
├── config/
│   └── database.js          # MongoDB connection setup
├── models/
│   └── Topic.js             # MongoDB Topic schema
├── routes/
│   └── topicRoutes.js       # API routes and endpoints
└── services/
    ├── cronService.js       # Cron job scheduler
    └── geminiService.js     # Gemini AI integration
```

## Installation & Setup

### Option 1: Local Development

1. **Clone and navigate to project:**

   ```bash
   cd server
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - Create `.env` file in the server directory
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     MONGODB_URI=mongodb://localhost:27017/tts-narration
     PORT=3000
     ```

4. **Start MongoDB locally:**

   ```bash
   mongod
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

### Option 2: Docker Deployment (Recommended)

1. **Navigate to project root:**

   ```bash
   cd ..
   ```

2. **Create `.env` file:**

   ```bash
   echo "GEMINI_API_KEY=your_api_key_here" > .env
   ```

3. **Build and run with Docker Compose:**

   ```bash
   docker-compose up -d
   ```

4. **View logs:**

   ```bash
   docker-compose logs -f api
   ```

5. **Stop services:**
   ```bash
   docker-compose down
   ```

## API Endpoints

### 1. Create Topic

**POST** `/api/topics`

Creates a new topic that will be queued for narration script generation.

**Request Body:**

```json
{
  "topicName": "The Future of Artificial Intelligence",
  "description": "An in-depth exploration of AI trends",
  "userId": "user123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Topic created successfully. It will be processed by the cron job.",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "topicName": "The Future of Artificial Intelligence",
    "description": "An in-depth exploration of AI trends",
    "status": "pending",
    "userId": "user123",
    "createdAt": "2026-02-04T10:30:00.000Z",
    "updatedAt": "2026-02-04T10:30:00.000Z"
  }
}
```

---

### 2. Get All Topics

**GET** `/api/topics`

Retrieves all topics (with optional user filtering).

**Query Parameters:**

- `userId` (optional): Filter topics by user ID

**Example:**

```
GET /api/topics
GET /api/topics?userId=user123
```

**Response:**

```json
{
  "success": true,
  "message": "Topics retrieved successfully",
  "count": 5,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "topicName": "The Future of Artificial Intelligence",
      "status": "completed",
      "narrationScript": "Welcome to our exploration...",
      "processedAt": "2026-02-04T10:32:15.000Z",
      "createdAt": "2026-02-04T10:30:00.000Z"
    }
  ]
}
```

---

### 3. Get Topic by ID

**GET** `/api/topics/:id`

Retrieves detailed information about a specific topic.

**Example:**

```
GET /api/topics/507f1f77bcf86cd799439011
```

**Response:**

```json
{
  "success": true,
  "message": "Topic retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "topicName": "The Future of Artificial Intelligence",
    "description": "An in-depth exploration of AI trends",
    "narrationScript": "Welcome to our exploration of artificial intelligence...",
    "status": "completed",
    "userId": "user123",
    "processedAt": "2026-02-04T10:32:15.000Z",
    "createdAt": "2026-02-04T10:30:00.000Z",
    "updatedAt": "2026-02-04T10:32:15.000Z"
  }
}
```

---

### 4. Get Status Statistics

**GET** `/api/status/all`

Retrieves aggregated statistics of all topics grouped by status.

**Response:**

```json
{
  "success": true,
  "message": "Topic status statistics",
  "data": {
    "pending": 2,
    "processing": 1,
    "completed": 5,
    "failed": 0
  }
}
```

---

### 5. Manually Trigger Processing

**POST** `/api/process-now`

Immediately triggers the cron job to process all pending topics (useful for testing).

**Response:**

```json
{
  "success": true,
  "message": "Topic processing triggered successfully"
}
```

---

### 6. Delete Topic

**DELETE** `/api/topics/:id`

Deletes a specific topic from the database.

**Example:**

```
DELETE /api/topics/507f1f77bcf86cd799439011
```

**Response:**

```json
{
  "success": true,
  "message": "Topic deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "topicName": "The Future of Artificial Intelligence"
  }
}
```

---

### 7. Health Check

**GET** `/health`

Simple endpoint to verify the server is running.

**Response:**

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-02-04T10:30:00.000Z"
}
```

---

### 8. API Documentation

**GET** `/`

Returns all available endpoints and their descriptions.

## Topic Status Lifecycle

Topics go through the following status progression:

```
pending → processing → completed (success)
        └─→ processing → failed (error)
```

- **pending**: Topic created, waiting to be processed by cron job
- **processing**: Currently generating narration script via Gemini AI
- **completed**: Successfully generated narration script
- **failed**: Error occurred during processing (error message stored)

## Cron Job Details

The automated cron job:

- ⏰ Runs every 2 minutes
- 📋 Processes up to 5 pending topics per execution
- 🔄 Updates topic status throughout processing
- 💾 Stores generated scripts in MongoDB
- 📝 Logs error messages if processing fails

**To modify the schedule**, edit [cronService.js](server/services/cronService.js#L11):

```javascript
cronJob = cron.schedule('*/2 * * * *', async () => {
  // Change the cron expression here
  // Current: */2 * * * * (every 2 minutes)
});
```

## Usage Examples

### Create Multiple Topics

```bash
# Topic 1
curl -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -d '{
    "topicName": "Machine Learning Basics",
    "description": "Introduction to ML concepts",
    "userId": "user1"
  }'

# Topic 2
curl -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -d '{
    "topicName": "Web Development Trends 2026",
    "userId": "user1"
  }'
```

### Check Status After Processing

```bash
# Check all topics
curl http://localhost:3000/api/topics

# Check specific topic
curl http://localhost:3000/api/topics/507f1f77bcf86cd799439011

# Check status statistics
curl http://localhost:3000/api/status/all

# Manually trigger processing (if needed)
curl -X POST http://localhost:3000/api/process-now
```

## Database Schema

### Topic Model

```javascript
{
  topicName: String,           // YouTube video topic
  description: String,         // Optional description
  narrationScript: String,     // Generated script (null until processed)
  status: String,              // pending, processing, completed, failed
  errorMessage: String,        // Error details if failed (null otherwise)
  processedAt: Date,           // Timestamp when processing completed
  userId: String,              // User identifier
  createdAt: Date,             // Auto-generated creation timestamp
  updatedAt: Date              // Auto-generated update timestamp
}
```

## Environment Variables

| Variable         | Default                               | Description                       |
| ---------------- | ------------------------------------- | --------------------------------- |
| `PORT`           | 3000                                  | Server port                       |
| `MONGODB_URI`    | mongodb://mongodb:27017/tts-narration | MongoDB connection string         |
| `GEMINI_API_KEY` | -                                     | Your Gemini AI API key (REQUIRED) |
| `NODE_ENV`       | development                           | Environment mode                  |

## Docker Commands

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down

# Remove volumes (careful - deletes data)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build

# Access MongoDB shell
docker exec -it tts_mongodb mongosh

# Check service health
docker-compose ps
```

## Troubleshooting

### MongoDB Connection Error

- Ensure MongoDB is running: `docker-compose ps`
- Check MongoDB logs: `docker-compose logs mongodb`
- Verify connection string in `.env` file

### Gemini API Key Issues

- Verify API key is set in `.env`: `GEMINI_API_KEY=your_key`
- Check API key is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Ensure API is enabled in Google Cloud Console

### Cron Job Not Processing

- Check server logs for errors: `docker-compose logs -f api`
- Manually trigger: `POST /api/process-now`
- Verify MongoDB connection

### Port Already in Use

- Change port in `docker-compose.yml` or `.env`
- Or kill existing process: `lsof -i :3000`

## Integration with TTS Converter

The existing `tts-converter.js` remains unchanged and can be used separately:

```bash
# Original usage still works
node tts-converter.js "Your text here" -o output.mp3
```

You can also enhance it later to use the narration scripts from the API:

```bash
# Get a script and convert to speech
node tts-converter.js "$(curl -s http://localhost:3000/api/topics/ID | jq -r '.data.narrationScript')" -o narration.mp3
```

## Performance Considerations

- **Cron Interval**: Currently 2 minutes - adjust based on API rate limits
- **Batch Size**: Processing 5 topics per cron run - modify in `cronService.js`
- **MongoDB Indexing**: Add indexes for frequent queries (userId, status)
- **API Rate Limits**: Be aware of Gemini AI API rate limits

## Future Enhancements

Potential improvements:

- ✅ Authentication and authorization (JWT)
- ✅ Video generation from scripts
- ✅ Email notifications on completion
- ✅ WebSocket updates for real-time status
- ✅ Advanced filtering and search
- ✅ Script editing and versioning
- ✅ Cost tracking and analytics

## License

MIT

## Support

For issues or questions, please check the logs or submit an issue to the repository.

---

**Happy generating! 🚀**
