# 🎯 QUICK REFERENCE GUIDE

## ⚡ TL;DR - Get Running in 3 Commands

```bash
# 1. Set API key
echo "GEMINI_API_KEY=your_key_here" > .env

# 2. Start everything
docker-compose up -d

# 3. Create a topic
curl -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -d '{"topicName":"Your Topic"}'
```

**Check results in ~2 minutes at:** `http://localhost:3000/api/topics`

---

## 📚 Which Document Do I Need?

| I want to...            | Read this                                      |
| ----------------------- | ---------------------------------------------- |
| Get overview            | [README.md](./README.md)                       |
| Find all docs           | [INDEX.md](./INDEX.md)                         |
| Setup in 5 min          | [QUICKSTART.md](./QUICKSTART.md)               |
| Understand how it works | [SETUP_COMPLETE.md](./SETUP_COMPLETE.md)       |
| Use the API             | [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) |
| Understand architecture | [IMPLEMENTATION.md](./IMPLEMENTATION.md)       |
| Know the files          | [FILE_STRUCTURE.md](./FILE_STRUCTURE.md)       |
| See what was built      | [DELIVERY.md](./DELIVERY.md)                   |

---

## 🔌 API Quick Reference

### Create Topic

```bash
curl -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -d '{
    "topicName": "AI Future",
    "description": "About AI",
    "userId": "user1"
  }'
```

### Get All Topics

```bash
curl http://localhost:3000/api/topics
```

### Get Specific Topic

```bash
curl http://localhost:3000/api/topics/{topic_id}
```

### Check Status

```bash
curl http://localhost:3000/api/status/all
```

### Force Processing

```bash
curl -X POST http://localhost:3000/api/process-now
```

### Delete Topic

```bash
curl -X DELETE http://localhost:3000/api/topics/{topic_id}
```

### Health Check

```bash
curl http://localhost:3000/health
```

---

## 🐳 Docker Quick Reference

```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f api           # API logs
docker-compose logs -f mongodb       # Database logs

# Check status
docker-compose ps

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build

# Full cleanup
docker-compose down -v
```

---

## ⏱️ Processing Timeline

```
0 min:   Create topic via API
2 min:   Cron job finds it
2-3 min: Gemini AI generates script
3 min:   Results stored in MongoDB
5 min:   Retrieve via API
```

---

## 🔑 Key Concepts

| Concept       | Meaning                                      |
| ------------- | -------------------------------------------- |
| **Topic**     | A YouTube video idea you want a script for   |
| **Status**    | pending → processing → completed/failed      |
| **Cron Job**  | Automated process runs every 2 minutes       |
| **Gemini AI** | Generates the narration script               |
| **MongoDB**   | Stores all data persistently                 |
| **Docker**    | Containerizes everything for easy deployment |

---

## 🚨 Troubleshooting Quick Fix

| Problem               | Fix                                                  |
| --------------------- | ---------------------------------------------------- |
| API not responding    | `docker-compose logs -f api`                         |
| MongoDB error         | `docker-compose ps` and wait 30s                     |
| Port 3000 in use      | Change PORT in .env                                  |
| No API key error      | Check .env has GEMINI_API_KEY                        |
| Topics not processing | `curl -X POST http://localhost:3000/api/process-now` |
| Docker won't start    | Run `docker-compose down -v` then `up -d`            |

---

## 📁 Important Files

| File                  | Purpose                      |
| --------------------- | ---------------------------- |
| `.env`                | Your API keys (create this!) |
| `docker-compose.yml`  | Starts everything            |
| `server/server.js`    | Main API                     |
| `server/package.json` | Dependencies                 |
| `Dockerfile`          | Container config             |

---

## 🎓 Learning Path

```
5 min  → Read README.md + QUICKSTART.md
10 min → Run docker-compose up -d
10 min → Test with curl
30 min → Read API_DOCUMENTATION.md
60 min → Integrate with your app
```

---

## ✨ What You Have

✅ **Express API** - 8 endpoints  
✅ **MongoDB** - Persistent storage  
✅ **Gemini AI** - Script generation  
✅ **Cron Job** - Automated processing  
✅ **Docker** - Easy deployment  
✅ **Documentation** - 5000+ lines  
✅ **Original TTS** - Completely preserved

---

## 🚀 Next Action

### NOW:

1. Get API key: https://makersuite.google.com/app/apikey
2. Add to .env: `echo "GEMINI_API_KEY=xxx" > .env`
3. Start: `docker-compose up -d`

### THEN:

1. Create topic with curl
2. Wait 2 minutes
3. Retrieve results
4. Integrate with your app

---

## 📞 Got Questions?

- **How do I...?** → Check [INDEX.md](./INDEX.md)
- **Where is...?** → Check [FILE_STRUCTURE.md](./FILE_STRUCTURE.md)
- **What's the API?** → Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **How does it work?** → Check [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- **It's broken!** → Check [SETUP_COMPLETE.md](./SETUP_COMPLETE.md#-troubleshooting)

---

## 🎯 Current Status

✅ **API Server** - Running  
✅ **Database** - Ready  
✅ **AI Integration** - Configured  
✅ **Cron Job** - Scheduled  
✅ **Docker** - Containerized  
✅ **Documentation** - Complete  
✅ **Original Code** - Preserved

**Everything is ready to go!** 🚀

---

## 💡 Pro Tips

```bash
# Monitor processing in real-time
watch -n 5 'curl -s http://localhost:3000/api/status/all | jq'

# Get script and convert to audio
SCRIPT=$(curl -s http://localhost:3000/api/topics/ID | jq -r '.data.narrationScript')
node server/tts-converter.js "$SCRIPT" -o output.mp3

# Bulk create topics
for topic in "AI" "ML" "Blockchain"; do
  curl -X POST http://localhost:3000/api/topics \
    -H "Content-Type: application/json" \
    -d "{\"topicName\": \"$topic\"}"
done

# Check all services
docker-compose ps

# See live logs
docker-compose logs -f
```

---

**You're all set! Start with [README.md](./README.md) or jump to [QUICKSTART.md](./QUICKSTART.md)** ⚡
