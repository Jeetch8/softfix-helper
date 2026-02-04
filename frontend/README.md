# 🎬 YouTube Narration Generator - Frontend

React.js frontend for the AI-powered YouTube narration script generator.

## Features

✨ **Functional Features:**

- 📋 View all topics with real-time status
- ✍️ Create new topics with descriptions
- 📊 View processing statistics
- 🔍 Filter topics by status (pending/processing/completed/failed)
- 📖 View complete topic details and generated scripts
- 🗑️ Delete topics
- 🚀 Manually trigger processing
- 🔄 Auto-refresh every 30 seconds

🎨 **Design:**

- Beautiful Tailwind CSS styling
- Responsive design (mobile & desktop)
- Status badges with emojis
- Loading states
- Error handling
- Modal for detailed view

## Setup

### Prerequisites

- Node.js >= 18.0.0
- API server running on http://localhost:3000

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Opens at: http://localhost:5173

### Build for Production

```bash
npm run build
```

Output in: `dist/` folder

## Project Structure

```
frontend/
├── package.json              # Dependencies
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
├── postcss.config.js        # PostCSS config
├── index.html               # Entry HTML
│
├── src/
│   ├── main.jsx             # Entry point
│   ├── App.jsx              # Main component
│   ├── index.css            # Tailwind imports
│   │
│   ├── api/
│   │   └── client.js        # API client (axios)
│   │
│   └── components/
│       ├── TopicsList.jsx   # Main list component
│       ├── TopicCard.jsx    # Individual topic card
│       ├── TopicModal.jsx   # Detail modal
│       ├── CreateTopicForm.jsx  # Create form
│       └── StatusBadge.jsx  # Status indicator
```

## Components

### TopicsList

Main component that manages all topics and displays them in a grid.

- Fetches topics from API
- Displays statistics
- Handles filtering by status
- Auto-refreshes every 30 seconds

### CreateTopicForm

Form to create new topics.

- Input for topic name, description, and user ID
- Success/error messages
- Triggers list refresh on success

### TopicCard

Individual topic card in the grid.

- Displays topic info
- Shows status badge
- Preview of narration script
- View and delete buttons
- Error message display

### TopicModal

Full-screen modal for viewing topic details.

- Complete narration script
- All metadata
- Status and timestamps
- Error details

### StatusBadge

Status indicator component.

- Color-coded badges
- Status emojis
- Reusable across components

## API Integration

All API calls handled through `api/client.js`:

- `getTopics()` - Fetch all topics
- `getTopic(id)` - Get specific topic
- `createTopic(data)` - Create new topic
- `deleteTopic(id)` - Delete topic
- `getStatusStats()` - Get statistics
- `triggerProcessing()` - Force processing

## Styling with Tailwind CSS

Beautiful, responsive design using Tailwind utilities:

- Responsive grid layout
- Color-coded status badges
- Smooth transitions and hover effects
- Mobile-first design
- Dark text on light backgrounds

## Features in Detail

### Create Topics

- Enter topic name (required)
- Add optional description
- Set user ID
- Success confirmation
- Auto-refresh list

### View Topics

- Grid/list view
- Status indicators
- Script preview
- Metadata display
- Created/processed dates

### Filter Topics

- All (default)
- Pending
- Processing
- Completed
- Failed

### Statistics Dashboard

- Pending count
- Processing count
- Completed count
- Failed count

### Manual Processing

- Force immediate processing
- Updates stats and list
- Shows loading state

### Responsive Design

- Mobile-optimized
- Tablet-friendly
- Desktop full-featured
- Touch-friendly buttons

## Development Tips

### Add CORS Headers (if needed)

Update API client in `src/api/client.js` to handle CORS:

```javascript
const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Modify API URL

Change `API_BASE_URL` in `src/api/client.js`:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
```

### Styling Customization

Edit `tailwind.config.js` to customize colors, fonts, etc.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Deployment

### Deploy to Vercel

```bash
npm run build
# Deploy the dist/ folder to Vercel
```

### Deploy to Netlify

```bash
npm run build
# Connect repository to Netlify
# Auto-deploys on push
```

### Docker (Optional)

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Environment Variables

Create `.env` (optional):

```
VITE_API_URL=http://localhost:3000
```

Use in code:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

## Troubleshooting

### CORS Issues

- Ensure API server is running
- Check API URL in `api/client.js`
- Verify API allows requests from frontend URL

### API Connection Failed

- Verify API is running: `docker-compose ps`
- Check MONGODB_URI is set
- View logs: `docker-compose logs -f api`

### Build Issues

```bash
# Clear cache
rm -rf node_modules
npm install
npm run build
```

## Future Enhancements

- Authentication (login/logout)
- User-specific topic list
- Search and advanced filtering
- Export scripts to file
- Copy-to-clipboard functionality
- Dark mode
- Real-time updates with WebSocket
- Video preview integration

## License

MIT

## Support

Refer to main project documentation at root level.
