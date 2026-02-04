# 🎬 YouTube Narration Script Generator

> **AI-Powered API that generates YouTube video narration scripts automatically** with Gemini AI, MongoDB storage, and Docker deployment.

[![Node.js](https://img.shields.io/badge/Node.js-18.0+-green)]()
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green)]()
[![Express](https://img.shields.io/badge/Express-4.18+-yellow)]()
[![License](https://img.shields.io/badge/License-MIT-purple)]()

---

## ✨ What You Get

```
🤖 Gemini AI Integration       Generate professional narration scripts
📅 Cron Job Automation         Process multiple topics automatically
💾 MongoDB Database            Persistent storage with Docker
🐳 Docker Ready               One-command deployment
🔌 REST API                   8 comprehensive endpoints
📚 Full Documentation         Everything explained
⚡ High-Definition Audio      320k MP3 bitrate
🔄 Status Tracking           Monitor processing in real-time
```

---

## 🚀 Quick Start (3 Commands)

```bash
# 1. Setup environment
echo "GEMINI_API_KEY=your_key_here" > .env

# 2. Start services
docker-compose up -d

# 3. Create your first topic
curl -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -d '{"topicName":"AI Future","userId":"user1"}'
```

**That's it!** Your system is running. Check results in ~2 minutes.

---

## 📖 Documentation

| Document                                           | Purpose                                |
| -------------------------------------------------- | -------------------------------------- |
| **[INDEX.md](./INDEX.md)**                         | 📍 Navigation guide for all docs       |
| **[SETUP_COMPLETE.md](./SETUP_COMPLETE.md)**       | 📚 Complete overview & getting started |
| **[QUICKSTART.md](./QUICKSTART.md)**               | ⚡ 5-minute setup guide                |
| **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** | 🔌 Complete API reference              |
| **[IMPLEMENTATION.md](./IMPLEMENTATION.md)**       | 🏗️ Technical architecture              |
| **[FILE_STRUCTURE.md](./FILE_STRUCTURE.md)**       | 📁 File listing & dependencies         |

### 👉 **Start here:** [INDEX.md](./INDEX.md)

---

## 🔌 API Endpoints

| Endpoint           | Method | Purpose                     |
| ------------------ | ------ | --------------------------- |
| `/api/topics`      | POST   | Create new topic            |
| `/api/topics`      | GET    | List all topics             |
| `/api/topics/:id`  | GET    | Get specific topic + script |
| `/api/status/all`  | GET    | View statistics             |
| `/api/process-now` | POST   | Force processing            |
| `/api/topics/:id`  | DELETE | Delete topic                |
| `/health`          | GET    | Health check                |
| `/`                | GET    | API docs                    |

**[Full API Reference →](./API_DOCUMENTATION.md)**

---

## 🔄 How It Works

```
1. Create Topic
   └─ POST /api/topics with topic name

2. Automatic Processing
   └─ Cron job runs every 2 minutes

3. AI Generation
   └─ Gemini AI creates 300-500 word script

4. Store Results
   └─ MongoDB saves script + metadata

5. Retrieve Results
   └─ GET /api/topics/:id to fetch script
```

**[See data flow diagram →](./IMPLEMENTATION.md#-data-flow)**

---

## 📋 Tech Stack

```
Backend:    Node.js 18+, Express.js 4.18
Database:   MongoDB 7.0 (Docker)
AI:         Google Gemini API
Scheduler:  node-cron 3.0
Container:  Docker & Docker Compose
```

---

## 🐳 Docker Commands

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f api

# Check status
docker-compose ps

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

---

## 🎯 Key Features

✅ **Multiple Topics**

- Create unlimited topics
- Process in batch
- Track status individually

✅ **Automated Processing**

- Cron job every 2 minutes
- Automatic retries
- Error handling

✅ **AI-Powered**

- Google Gemini API
- Professional scripts
- Customizable prompts

✅ **Easy Deployment**

- Docker Compose setup
- One-command start
- Persistent storage

✅ **Fully Documented**

- 5000+ lines docs
- API examples
- Architecture diagrams

---

## 📊 Database Schema

Topics stored in MongoDB with:

- Topic name & description
- Generated narration script
- Processing status (pending/processing/completed/failed)
- Error messages if failed
- User identification
- Creation & update timestamps

---

## 🔗 Integration Example

```javascript
// Create topic
const response = await fetch('http://localhost:3000/api/topics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topicName: 'Your Topic',
    userId: 'user_id',
  }),
});

// Get results after ~2 minutes
const topic = await fetch('http://localhost:3000/api/topics/:id');
const script = await topic.json();
console.log(script.data.narrationScript);
```

---

## 🎵 Use with TTS Converter

The original TTS converter is preserved! Convert scripts to audio:

```bash
# Get script from API
SCRIPT=$(curl -s http://localhost:3000/api/topics/ID | jq -r '.data.narrationScript')

# Convert to high-quality MP3 (320k)
node server/tts-converter.js "$SCRIPT" -o narration.mp3
```

---

## 📁 Project Structure

```
softfix_helper/
├── docker-compose.yml          ← Start here
├── .env                        ← Add your API key
├── .gitignore
│
├── INDEX.md                    ← Navigation guide
├── SETUP_COMPLETE.md           ← Overview
├── QUICKSTART.md               ← Quick setup
├── API_DOCUMENTATION.md        ← API reference
├── IMPLEMENTATION.md           ← Architecture
├── FILE_STRUCTURE.md           ← File listing
│
└── server/
    ├── server.js               ← Main API
    ├── tts-converter.js        ← Original TTS (unchanged)
    ├── package.json            ← Dependencies
    ├── Dockerfile              ← Container config
    │
    ├── config/database.js      ← DB connection
    ├── models/Topic.js         ← DB schema
    ├── routes/topicRoutes.js   ← API endpoints
    └── services/
        ├── cronService.js      ← Automation
        └── geminiService.js    ← AI integration
```

---

## ⚙️ Requirements

- Node.js >= 18.0.0
- Docker & Docker Compose
- Google Gemini API Key ([Get Free](https://makersuite.google.com/app/apikey))
- 1GB RAM minimum

---

## 🔑 Setup Steps

### 1. Get API Key

```
https://makersuite.google.com/app/apikey
```

### 2. Create .env

```bash
echo "GEMINI_API_KEY=your_key_here" > .env
```

### 3. Start Services

```bash
docker-compose up -d
```

### 4. Verify

```bash
curl http://localhost:3000/health
```

### 5. Test

```bash
curl -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -d '{"topicName":"Test Topic"}'
```

---

## 🎯 Status Progression

```
pending ──(2 min)──> processing ──> completed ✅
                         │
                         └──> failed ❌
```

Each topic shows:

- Current status
- Error message if failed
- Processing timestamp
- Generated script when complete

---

## 📈 Example Workflow

```bash
# 1. Create topic
TOPIC_ID=$(curl -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -d '{"topicName":"Blockchain 2026"}' | jq -r '.data._id')

# 2. Wait ~2 minutes
sleep 120

# 3. Check status
curl http://localhost:3000/api/topics/$TOPIC_ID

# 4. Convert to audio (optional)
SCRIPT=$(curl -s http://localhost:3000/api/topics/$TOPIC_ID | jq -r '.data.narrationScript')
node server/tts-converter.js "$SCRIPT" -o narration.mp3
```

---

## 🚨 Troubleshooting

**Port already in use?**

```bash
# Change in docker-compose.yml or
lsof -i :3000 && kill -9 <PID>
```

**MongoDB not connecting?**

```bash
# Wait 30 seconds and check
docker-compose logs mongodb
```

**API returning errors?**

```bash
# Verify .env and check logs
docker-compose logs -f api
```

**Cron job not processing?**

```bash
# Manually trigger
curl -X POST http://localhost:3000/api/process-now
```

**[More troubleshooting →](./SETUP_COMPLETE.md#-troubleshooting)**

---

## 📚 Documentation Hierarchy

```
START HERE (New Users)
    ↓
INDEX.md ─────────────── Navigation guide
    ↓
SETUP_COMPLETE.md ────── Complete overview
    ↓
QUICKSTART.md ────────── 5-minute setup
    ↓
API_DOCUMENTATION.md ─── API reference
    ↓
IMPLEMENTATION.md ────── Technical details
    ↓
FILE_STRUCTURE.md ────── File listing
```

---

## 🎓 Learning Path

### Beginner (30 min)

1. Read [SETUP_COMPLETE.md](./SETUP_COMPLETE.md)
2. Follow [QUICKSTART.md](./QUICKSTART.md)
3. Run `docker-compose up -d`

### Intermediate (1 hour)

1. Read [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
2. Create multiple topics
3. Integrate into your app

### Advanced (2 hours)

1. Read [IMPLEMENTATION.md](./IMPLEMENTATION.md)
2. Modify cron schedule
3. Deploy to production

---

## 🚀 Production Deployment

```bash
# On your server
git clone <your-repo>
cd softfix_helper

# Setup environment
echo "GEMINI_API_KEY=xxx" > .env
echo "NODE_ENV=production" >> .env

# Start
docker-compose up -d

# Monitor
docker-compose logs -f api
```

---

## 🤝 Integration Points

### Frontend

```javascript
fetch('http://localhost:3000/api/topics', {
  method: 'POST',
  body: JSON.stringify({ topicName: 'Your topic' }),
});
```

### Webhooks (Future)

```
POST /webhook?status=completed&topicId=123
```

### Video Generation

```bash
node server/tts-converter.js "$script" -o video.mp3
```

---

## 🎯 Next Steps

1. **[Read INDEX.md](./INDEX.md)** - Navigation guide
2. **[Start with QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup
3. **[Review API docs](./API_DOCUMENTATION.md)** - Learn endpoints
4. **[Deploy](./docker-compose.yml)** - Run `docker-compose up -d`

---

## 📞 Support

- 📖 **Documentation:** [INDEX.md](./INDEX.md)
- 🔌 **API Reference:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- 🏗️ **Architecture:** [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- ⚡ **Quick Start:** [QUICKSTART.md](./QUICKSTART.md)
- 🐛 **Troubleshooting:** [SETUP_COMPLETE.md](./SETUP_COMPLETE.md#-troubleshooting)

---

## 📄 License

MIT - Feel free to use and modify

---

## 🙏 Credits

Built with:

- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Google Generative AI](https://ai.google.dev/)
- [Docker](https://www.docker.com/)
- [node-cron](https://github.com/kelektiv/node-cron)

---

## 📊 Stats

- ✅ 8 API endpoints
- ✅ 5000+ lines of documentation
- ✅ 2 Docker containers
- ✅ 7 JavaScript modules
- ✅ 100% original TTS preserved
- ✅ Ready for production

---

**Let's build amazing things with AI! 🚀**

**[👉 Get started with INDEX.md](./INDEX.md)**
