# 📁 Complete File Structure

## Root Directory (`softfix_helper/`)

```
softfix_helper/
│
├── 📄 docker-compose.yml                   # Start Docker services here
├── 📄 .env                                 # Your environment variables (add API key)
├── 📄 .gitignore                           # Git ignore rules
│
├── 📚 Documentation Files
├── 📄 SETUP_COMPLETE.md                    # This is what you need to read first!
├── 📄 QUICKSTART.md                        # 5-minute quick start
├── 📄 API_DOCUMENTATION.md                 # Complete API reference (2000+ lines)
├── 📄 IMPLEMENTATION.md                    # Technical implementation details
│
└── 📁 server/                              # Node.js application directory
    │
    ├── 📄 server.js                        # ⭐ Main Express API server
    ├── 📄 tts-converter.js                 # Original TTS tool (unchanged)
    ├── 📄 package.json                     # Dependencies & scripts
    ├── 📄 package-lock.json                # Locked dependency versions
    │
    ├── 🐳 Deployment Files
    ├── 📄 Dockerfile                       # Docker image definition
    ├── 📄 .env                             # Server environment vars
    ├── 📄 .env.example                     # Template for .env
    │
    ├── 📚 Documentation
    ├── 📄 README.md                        # Original TTS docs
    ├── 📄 README_API.md                    # API server documentation
    │
    ├── 📁 config/                          # Configuration modules
    │   └── 📄 database.js                  # MongoDB connection setup
    │
    ├── 📁 models/                          # Database schemas
    │   └── 📄 Topic.js                     # Topic schema for MongoDB
    │
    ├── 📁 routes/                          # API route handlers
    │   └── 📄 topicRoutes.js               # All API endpoints (8 routes)
    │
    └── 📁 services/                        # Business logic services
        ├── 📄 cronService.js               # Automated cron job processor
        └── 📄 geminiService.js             # Gemini AI integration

```

---

## What Each File Does

### 🔴 Critical Files (Start Here)

| File                 | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `docker-compose.yml` | **START HERE** - Runs everything with one command |
| `.env`               | Your API keys and configuration                   |
| `SETUP_COMPLETE.md`  | **READ THIS FIRST** - Overview and quick start    |

### 🟠 Documentation

| File                   | Content                             |
| ---------------------- | ----------------------------------- |
| `QUICKSTART.md`        | 5-minute setup guide                |
| `SETUP_COMPLETE.md`    | Complete overview & getting started |
| `API_DOCUMENTATION.md` | Exhaustive API reference            |
| `IMPLEMENTATION.md`    | Technical architecture details      |
| `server/README_API.md` | Server-specific documentation       |

### 🟡 Application Files

| File                      | Purpose                       |
| ------------------------- | ----------------------------- |
| `server/server.js`        | Main Express server (core)    |
| `server/package.json`     | Node.js dependencies          |
| `server/Dockerfile`       | Docker image configuration    |
| `server/tts-converter.js` | Original TTS tool (preserved) |

### 🟢 Configuration & Services

| File                        | Purpose                                    |
| --------------------------- | ------------------------------------------ |
| `config/database.js`        | MongoDB connection management              |
| `services/cronService.js`   | Automatic topic processing every 2 minutes |
| `services/geminiService.js` | Gemini AI script generation                |

### 🔵 Database & Routes

| File                    | Purpose                   |
| ----------------------- | ------------------------- |
| `models/Topic.js`       | MongoDB schema definition |
| `routes/topicRoutes.js` | All 8 API endpoints       |

---

## File Sizes & Line Counts

```
CRITICAL:
  docker-compose.yml          ~60 lines   - Start services
  .env                        ~20 lines   - Your configuration
  SETUP_COMPLETE.md           ~400 lines  - Read this first

DOCUMENTATION:
  API_DOCUMENTATION.md        ~2000 lines - Complete reference
  QUICKSTART.md               ~150 lines  - Quick 5-min setup
  IMPLEMENTATION.md           ~500 lines  - Technical details
  server/README_API.md        ~250 lines  - Server docs

APPLICATION:
  server/server.js            ~120 lines  - Main server
  server/package.json         ~40 lines   - Dependencies
  services/cronService.js     ~80 lines   - Cron job logic
  services/geminiService.js   ~40 lines   - AI integration
  routes/topicRoutes.js       ~200 lines  - API endpoints
  models/Topic.js             ~40 lines   - Database schema
  config/database.js          ~30 lines   - DB connection
```

---

## Getting Started Path

```
1. START HERE
   └─> Read: SETUP_COMPLETE.md (this file!)
       └─> Understand the overview & architecture

2. QUICK SETUP (5 min)
   └─> Read: QUICKSTART.md
       └─> Follow 5-minute setup steps

3. RUN IT
   └─> docker-compose up -d
       └─> Server starts automatically

4. TEST IT
   └─> Create topic with curl
       └─> Check results after 2 minutes

5. DEEP DIVE (Optional)
   └─> Read: API_DOCUMENTATION.md
       └─> Learn all endpoints & details
```

---

## Technology Stack

```
📦 RUNTIME: Node.js >= 18.0.0
🌐 WEB: Express.js 4.18.2
💾 DATABASE: MongoDB 7.0
🤖 AI: Google Gemini API
⏰ SCHEDULER: node-cron 3.0.2
🐳 CONTAINER: Docker & Docker Compose
🔌 ODM: Mongoose 7.0.0
📝 CONFIG: dotenv 16.0.3
🎵 AUDIO: fluent-ffmpeg 2.1.2
```

---

## How It Fits Together

```
┌─────────────────────────────────────────────────────┐
│         User or Frontend Application                │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ HTTP Requests
                   ▼
┌─────────────────────────────────────────────────────┐
│        server.js (Express Server)                   │
│   Routes requests to appropriate handlers           │
└──────────────────┬──────────────────────────────────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
      ▼            ▼            ▼
  CREATE      UPDATE          GET
  TOPICS      STATUS          TOPICS
      │            │            │
      └────────────┼────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│    topicRoutes.js (API Route Handlers)              │
│   8 endpoints for all operations                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│        MongoDB Database (In Container)              │
│   Stores topics, scripts, status, metadata          │
└─────────────────────────────────────────────────────┘

                   │
            (Every 2 minutes)
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  cronService.js (Automatic Processor)               │
│  Finds pending topics & processes them              │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  geminiService.js (AI Integration)                  │
│  Calls Google Gemini API to generate scripts        │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│        Google Gemini AI API                         │
│   Generates narration scripts (remote service)      │
└─────────────────────────────────────────────────────┘
```

---

## File Dependencies

```
server.js
├── imports: config/database.js
├── imports: services/cronService.js
├── imports: routes/topicRoutes.js
└── imports: dotenv

cronService.js
├── imports: models/Topic.js
└── imports: services/geminiService.js

topicRoutes.js
├── imports: express
└── imports: models/Topic.js

models/Topic.js
└── imports: mongoose

config/database.js
└── imports: mongoose

services/geminiService.js
└── imports: @google/generative-ai
```

---

## Configuration Hierarchy

```
Docker Environment
│
├─ .env (Root)
│  ├─ GEMINI_API_KEY
│  └─ MONGODB_URI (for docker services)
│
└─ docker-compose.yml
   ├─ mongodb service
   │  └─ Exposes port 27017
   │
   └─ api service
      ├─ Runs server/server.js
      ├─ Sets environment variables
      ├─ Links to mongodb
      └─ Exposes port 3000
```

---

## API Request Flow

```
Client Request
    │
    ▼
server.js (Port 3000)
    │
    ▼
topicRoutes.js
    │
    ├─ POST /api/topics
    │  └─ Validates input → Creates document → Returns 201
    │
    ├─ GET /api/topics
    │  └─ Queries MongoDB → Returns array
    │
    ├─ GET /api/topics/:id
    │  └─ Finds by ID → Returns document with script
    │
    ├─ GET /api/status/all
    │  └─ Aggregates by status → Returns counts
    │
    ├─ POST /api/process-now
    │  └─ Manually triggers cron → Returns status
    │
    └─ DELETE /api/topics/:id
       └─ Deletes document → Returns success
```

---

## Processing Flow

```
1. CREATE PHASE
   Topic Created (pending)
        │
        ├─ Stored in MongoDB
        ├─ User receives ID
        └─ Status: pending

2. WAIT PHASE
   Waiting for Cron Job
        │
        └─ Next cycle (2 min max)

3. PROCESS PHASE
   Cron finds pending topics
        │
        ├─ Updates status: processing
        ├─ Calls Gemini AI
        ├─ Gets script response
        └─ Updates status: completed

4. RETRIEVE PHASE
   User queries by ID
        │
        ├─ MongoDB returns complete document
        ├─ Includes narration script
        └─ Ready for next step (TTS, video, etc.)
```

---

## Security Considerations

```
Authentication (TODO):
  ├─ Add JWT middleware
  ├─ User authentication routes
  └─ Permission-based access

API Keys:
  ├─ Stored in .env (never in code)
  ├─ Not logged or exposed
  └─ Should be rotated regularly

Database:
  ├─ Runs in isolated Docker network
  ├─ No external exposure
  └─ Should backup regularly

Rate Limiting (TODO):
  ├─ Add on Express server
  ├─ Prevent API abuse
  └─ Protect Gemini API quota

Input Validation:
  ├─ Topic names validated
  ├─ Mongoose schema enforcement
  └─ Error messages don't leak info
```

---

## Deployment Checklist

```
Before Deploying:
  ☐ .env file created with real API key
  ☐ docker-compose.yml reviewed
  ☐ PORT not conflicting
  ☐ MongoDB storage configured
  ☐ Firewall rules set

After Starting:
  ☐ docker-compose ps shows 2 running
  ☐ curl health check succeeds
  ☐ MongoDB logs show connected
  ☐ API logs show server started
  ☐ Cron job log shows scheduled

During Operation:
  ☐ Monitor docker container logs
  ☐ Check cron job processing
  ☐ Verify Gemini API responses
  ☐ Monitor error rates
  ☐ Check database disk space
```

---

## Monitoring & Logs

```
View All Logs:
  docker-compose logs -f

View Specific Service:
  docker-compose logs -f api          # API logs
  docker-compose logs -f mongodb      # DB logs

Common Log Patterns:
  "processing topic"      → Cron job working
  "successfully generated"  → AI generation worked
  "Error"                 → Something failed
  "connected"             → MongoDB ok
  "listening on port"     → Server started
```

---

## Development vs Production

```
DEVELOPMENT (Local)
  ├─ NODE_ENV=development
  ├─ Logs go to console
  ├─ Hot reload possible
  └─ For testing

PRODUCTION (Docker)
  ├─ NODE_ENV=production
  ├─ Persistent logs
  ├─ Health checks enabled
  └─ Ready for load

DOCKER (Recommended)
  ├─ Isolated environment
  ├─ Easy scaling
  ├─ Same in all environments
  └─ Simple deployment
```

---

## What's Next

```
STEP 1: Get API Key
  └─> https://makersuite.google.com/app/apikey

STEP 2: Setup & Start
  └─> docker-compose up -d

STEP 3: Test API
  └─> curl -X POST http://localhost:3000/api/topics ...

STEP 4: Check Results
  └─> curl http://localhost:3000/api/topics

STEP 5: Convert to Audio (Optional)
  └─> node server/tts-converter.js "script" -o audio.mp3

STEP 6: Deploy Production
  └─> Push to your server, run docker-compose
```

---

**Read [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) next for quick start!** 🚀
