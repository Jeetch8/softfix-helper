# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites

- Docker and Docker Compose installed
- Google Gemini API key ([Get one free](https://makersuite.google.com/app/apikey))

### Step 1: Setup

```bash
# Navigate to project root
cd softfix_helper

# Create .env file with your API key
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### Step 2: Start Services

```bash
# Start MongoDB and API server
docker-compose up -d

# Verify services are running
docker-compose ps
```

### Step 3: Test the API

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

### Step 4: View Results

After ~2 minutes (next cron cycle), check the generated script:

```bash
# Get all topics to find the ID
curl http://localhost:3000/api/topics

# Get specific topic with script
curl http://localhost:3000/api/topics/{topic_id}
```

### Step 5: Stop Services (when done)

```bash
docker-compose down
```

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

- **`.env`** - Your API keys (create this)
- **`docker-compose.yml`** - Docker setup
- **`server/server.js`** - Main API server
- **`server/package.json`** - Dependencies
- **`API_DOCUMENTATION.md`** - Full API docs

---

## 🐛 Common Issues

**MongoDB not connecting?**

```bash
# Wait for MongoDB to be ready (takes ~30 seconds)
docker-compose logs mongodb
```

**API giving 500 errors?**

```bash
# Check logs
docker-compose logs -f api

# Verify .env file has GEMINI_API_KEY
cat .env
```

**Topics not processing?**

```bash
# Manually trigger processing
curl -X POST http://localhost:3000/api/process-now

# Check logs
docker-compose logs -f api
```

---

## 🔗 Useful Links

- [Gemini API Key](https://makersuite.google.com/app/apikey)
- [Full API Documentation](./API_DOCUMENTATION.md)
- [Docker Documentation](https://docs.docker.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

**That's it! You're ready to go. 🎉**
