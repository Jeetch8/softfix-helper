# Quick Start - Frontend

## 🚀 Get Started in 2 Minutes

### Prerequisites

- Node.js 18+ installed
- API server running on `http://localhost:3000`

### Installation & Start

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Opens at:** http://localhost:5173

---

## 📋 What You Can Do

✅ **View Topics** - See all created topics  
✅ **Create Topics** - Submit new video ideas  
✅ **Track Status** - pending → processing → completed  
✅ **Read Scripts** - View generated narration  
✅ **Filter Topics** - By status or search  
✅ **Delete Topics** - Remove unwanted entries  
✅ **Force Processing** - Manually trigger AI generation  
✅ **Auto-Refresh** - Updates every 30 seconds

---

## 🎨 Features

- 📱 **Responsive Design** - Works on all devices
- 🎨 **Tailwind CSS** - Beautiful styling
- 🔄 **Real-time Updates** - Auto-refresh data
- 📊 **Statistics Dashboard** - See processing stats
- 🎯 **Status Filtering** - Filter by completion status
- 📖 **Detail Modal** - View complete scripts
- ✨ **Clean UI** - Intuitive and easy to use

---

## 🔧 Development

### Build for Production

```bash
npm run build
```

Output: `dist/` folder

### View Production Build

```bash
npm run preview
```

---

## 🌐 API Connection

The frontend connects to: `http://localhost:3000`

Change this in `src/api/client.js` if your API is elsewhere.

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   ├── api/client.js        # API integration
│   ├── App.jsx              # Main app
│   └── main.jsx             # Entry point
│
├── package.json             # Dependencies
├── vite.config.js          # Vite config
├── tailwind.config.js      # Tailwind config
└── index.html              # HTML template
```

---

## 💡 Tips

**Customize the API URL:**
Edit `src/api/client.js` line 3:

```javascript
const API_BASE_URL = 'http://your-api-url:3000';
```

**Change styling:**
Edit `tailwind.config.js` and `src/index.css`

**Add new features:**
Create components in `src/components/`

---

**Now visit http://localhost:5173 and start using!** 🎉
