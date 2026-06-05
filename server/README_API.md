# TTS Narration API Server

A complete backend solution for generating YouTube video narration scripts using Google's Gemini AI, with automatic processing via cron jobs and MongoDB storage.

## 🎯 What's Included

### Original TTS Converter (Preserved)

- **`tts-converter.js`** - Original command-line tool (unchanged, still fully functional)
  ```bash
  node tts-converter.js "Your text here" -o output.mp3
  ```

### New API Server

- **`server.js`** - Main Express API server
- **Cron Job System** - Automatic narration script generation every 2 minutes
- **MongoDB Integration** - Store all topics and results
- **Docker Support** - Full containerization for easy deployment

## 🚀 Quick Start

### Option 1: Docker Deployment (Recommended)

```bash
# From project root
docker-compose up -d
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Add your Gemini API key to .env
echo "GEMINI_API_KEY=your_key_here" > .env

# Start MongoDB locally, then
npm start
```

## 📊 API Endpoints

| Endpoint           | Method | Description          |
| ------------------ | ------ | -------------------- |
| `/api/topics`      | POST   | Create new topic     |
| `/api/topics`      | GET    | Get all topics       |
| `/api/topics/:id`  | GET    | Get specific topic   |
| `/api/status/all`  | GET    | Get statistics       |
| `/api/process-now` | POST   | Force process topics |
| `/health`          | GET    | Health check         |

**Full documentation:** See [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)

## 📁 Project Structure

```
server/
├── server.js                    # Main API
├── tts-converter.js             # Original TTS tool
├── package.json                 # Dependencies
├── .env                         # Environment variables
├── Dockerfile                   # Container image
│
├── config/
│   └── database.js              # MongoDB connection
│
├── models/
│   └── Topic.js                 # MongoDB schema
│
├── routes/
│   └── topicRoutes.js          # API routes
│
└── services/
    ├── cronService.js           # Cron job scheduler
    └── geminiService.js         # Gemini AI integration
```

## 🔧 Environment Setup

Create a `.env` file:

```env
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/tts-narration
GEMINI_API_KEY=your_api_key_here
NODE_ENV=development
```

[Get Gemini API Key](https://makersuite.google.com/app/apikey)

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Rebuild
docker-compose up -d --build
```

## 💡 Usage Example

```bash
# 1. Create a topic
curl -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -d '{"topicName": "AI Future", "userId": "user1"}'

# 2. Wait ~2 minutes for processing

# 3. Get the generated script
curl http://localhost:3000/api/topics/{id}
```

## 🔄 How It Works

1. **Create Topic** → API stores topic in MongoDB with `status: "pending"`
2. **Cron Job** → Runs every 2 minutes, finds pending topics
3. **Generate Script** → Gemini AI creates narration script
4. **Store Result** → Updates topic with script and `status: "completed"`
5. **Query Results** → Retrieve via API endpoint

## 📈 Status Lifecycle

```
pending → processing → completed ✅
       └→ processing → failed ❌
```

## 🎵 Integration with TTS Converter

Generate narration script and convert to speech:

```bash
# Get script from API
SCRIPT=$(curl -s http://localhost:3000/api/topics/ID | jq -r '.data.narrationScript')

# Convert to MP3 (high quality - 320k bitrate)
node tts-converter.js "$SCRIPT" -o narration.mp3
```

## 📚 Documentation

- [Quick Start Guide](../QUICKSTART.md)
- [Full API Documentation](../API_DOCUMENTATION.md)
- [Original TTS Converter Docs](./README.md)

## 🛠️ Tech Stack

- **Node.js** - Runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **node-cron** - Scheduling
- **Google Gemini AI** - AI engine
- **Docker** - Containerization

## 📝 Features

✅ Multiple topic support  
✅ Automatic batch processing  
✅ Error handling and logging  
✅ MongoDB persistence  
✅ RESTful API design  
✅ Docker deployment  
✅ Health checks  
✅ Status tracking  
✅ User filtering  
✅ Statistics aggregation

## 🤝 Integration Points

The system is designed to work with:

- **Your Frontend** - Submit topics via POST endpoint
- **TTS Converter** - Use generated scripts for audio
- **MongoDB** - Store and retrieve data
- **Docker** - Deploy as microservice

## 📞 API Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Server Error

## 🔐 Security Notes

- Add authentication middleware for production
- Validate and sanitize all inputs
- Use environment variables for secrets
- Implement rate limiting
- Add CORS policies as needed

## 🚀 Deployment

### Production Checklist

- [ ] Set strong `GEMINI_API_KEY` in production
- [ ] Use `NODE_ENV=production`
- [ ] Configure persistent MongoDB volumes
- [ ] Set up monitoring and logging
- [ ] Add authentication middleware
- [ ] Configure CORS for your domain
- [ ] Set up SSL/HTTPS
- [ ] Add rate limiting
- [ ] Backup MongoDB regularly

## 📋 Cron Schedule

Edit [cronService.js](./services/cronService.js) to change:

```javascript
// Currently: Every 2 minutes
cronJob = cron.schedule('*/2 * * * *', ...)

// Options:
// Every minute: '* * * * *'
// Every 5 minutes: '*/5 * * * *'
// Every hour: '0 * * * *'
```

## ⚡ Performance Tips

- Adjust cron interval based on API rate limits
- Monitor MongoDB indexes
- Implement caching for frequently accessed topics
- Use pagination for large result sets
- Monitor server resources in Docker

## 🐛 Troubleshooting

**Check MongoDB connection:**

```bash
docker-compose logs mongodb
```

**Check API logs:**

```bash
docker-compose logs -f api
```

**Verify Gemini API key:**

```bash
echo $GEMINI_API_KEY
```

## 📄 License

MIT

## 🙏 Support

For detailed information, see:

- [Full API Documentation](../API_DOCUMENTATION.md)
- [Quick Start Guide](../QUICKSTART.md)
