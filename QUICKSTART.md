# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites

- Node.js >= 18.0.0
- MongoDB running (via Docker or locally)
- Google Gemini API key ([Get one free](https://makersuite.google.com/app/apikey))

### Step 1: Setup

```bash
# Navigate to project root
cd softfix-helper

# Install dependencies for all projects
npm run install:all

# Create .env file in server directory with your API key
echo "GEMINI_API_KEY=your_api_key_here" > server/.env
```

### Step 2: Start Development Servers

**Option A: Single Command (Recommended)**

```bash
# Start both frontend and backend servers
npm run dev
```

**Option B: Windows Batch File**

```bash
# Double-click or run
dev.bat
```

**Option C: Start Separately**

```bash
# Terminal 1 - Backend (port 3000)
cd server
npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend
npm run dev
```

### Step 3: Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Docs**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### Step 4: Test the API

```bash
# Create a new topic
curl -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -d '{
    "topicName": "Introduction to Blockchain",
    "description": "A beginner-friendly overview",
    "userId": "test-user"
  }'

# Get all topics
curl http://localhost:3000/api/topics

# Check status
curl http://localhost:3000/api/status/all
```

### Step 5: View Results

After ~2 minutes (next cron cycle), check the generated script:

```bash
# Get all topics to find the ID
curl http://localhost:3000/api/topics

# Get specific topic with script
curl http://localhost:3000/api/topics/{topic_id}
```

---

## 📋 Development Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start both frontend and backend      |
| `npm run dev:server`   | Start backend server only            |
| `npm run dev:frontend` | Start frontend server only           |
| `npm run install:all`  | Install all dependencies             |
| `dev.bat`              | Windows batch file to start both     |

---

## 📋 API Cheat Sheet

| Action                 | Command                   |
| ---------------------- | ------------------------- |
| **Create topic**       | `POST /api/topics`        |
| **List all topics**    | `GET /api/topics`         |
| **Get specific topic** | `GET /api/topics/{id}`    |
| **View statistics**    | `GET /api/status/all`     |
| **Force processing**   | `POST /api/process-now`   |
| **Delete topic**       | `DELETE /api/topics/{id}` |
| **Health check**       | `GET /health`             |

---

## 📁 Important Files

- **`.env`** - Your API keys (create in server directory)
- **`package.json`** - Root dependencies and dev scripts
- **`server/server.js`** - Main API server
- **`frontend/src/`** - React frontend code
- **`API_DOCUMENTATION.md`** - Full API docs

---

## 🐛 Common Issues

**MongoDB not connecting?**

```bash
# Check if MongoDB is running
docker-compose ps

# Or start MongoDB via Docker
docker-compose up -d mongodb
```

**API giving 500 errors?**

```bash
# Check logs
cd server
npm run dev

# Verify .env file has GEMINI_API_KEY
cat server/.env
```

**Topics not processing?**

```bash
# Manually trigger processing
curl -X POST http://localhost:3000/api/process-now

# Check server logs for errors
```

**Port already in use?**

```bash
# Find and kill process using port 3000 (backend)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Find and kill process using port 5173 (frontend)
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

## 🔗 Useful Links

- [Gemini API Key](https://makersuite.google.com/app/apikey)
- [Full API Documentation](./API_DOCUMENTATION.md)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

**That's it! You're ready to go. 🎉**
