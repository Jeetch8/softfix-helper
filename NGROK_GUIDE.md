# Ngrok Configuration Guide

This guide explains how to configure your application to work with ngrok tunneling for the backend server while the frontend is deployed on Vercel.

## Overview

- **Frontend**: Deployed on Vercel at `https://softfix-helper.vercel.app/`
- **Backend**: Running locally and tunneled through ngrok at `https://succeedable-perspiringly-aracely.ngrok-free.dev`

## Changes Made

### 1. Backend CORS Configuration (`server/server.js`)

The backend server now allows requests from your Vercel deployment:

```javascript
// CORS configuration with environment variable support
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : [
      'http://localhost:5173',       // Local frontend dev
      'http://localhost:3000',       // Local backend
      'https://softfix-helper.vercel.app'  // Vercel deployment
    ];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  }),
);
```

**Key additions:**
- Added Vercel deployment URL to allowed origins
- Added `ngrok-skip-browser-warning` to allowed headers (required for ngrok)
- Made CORS origins configurable via `CORS_ORIGINS` environment variable

### 2. Frontend API Client (`frontend/src/api/client.js`)

The API client now includes the ngrok bypass header:

```javascript
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',  // Bypass ngrok warning page
  },
});
```

## Deployment Steps

### Step 1: Configure Backend Environment

Create or update your `.env` file in the project root:

```bash
# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string_here

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_s3_bucket_name

# Server Configuration
PORT=3000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://softfix-helper.vercel.app
```

### Step 2: Start Backend with Ngrok

1. **Start your backend server:**
   ```bash
   cd server
   npm start
   ```

2. **In a separate terminal, start ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Copy the ngrok forwarding URL** (e.g., `https://succeedable-perspiringly-aracely.ngrok-free.dev`)

### Step 3: Configure Frontend Environment Variables on Vercel

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Navigate to your project: `softfix-helper`
3. Go to **Settings** → **Environment Variables**
4. Add the following environment variable:

   **Key:** `VITE_API_BASE_URL`  
   **Value:** `https://succeedable-perspiringly-aracely.ngrok-free.dev`

5. Click **Save**
6. **Redeploy your frontend** to apply the new environment variable

### Step 4: Verify the Connection

1. Visit your Vercel deployment: `https://softfix-helper.vercel.app/`
2. Open browser DevTools (F12) → **Console** tab
3. You should see the API Base URL logged: `🔗 API Base URL: https://succeedable-perspiringly-aracely.ngrok-free.dev`
4. Test creating a topic or fetching data to verify the connection

## Troubleshooting

### CORS Error Still Occurs

**Problem:** Getting CORS errors despite configuration  
**Solution:**
1. Verify the Vercel URL is exactly `https://softfix-helper.vercel.app` (no trailing slash)
2. Check that your backend `.env` includes the Vercel URL in `CORS_ORIGINS`
3. Restart your backend server after changing `.env`
4. Clear browser cache and hard reload (Ctrl+Shift+R)

### Ngrok Warning Page Shows

**Problem:** Getting ngrok browser warning instead of API response  
**Solution:**
1. Ensure `ngrok-skip-browser-warning: 1` header is included in all requests
2. This is now automatically added in `frontend/src/api/client.js`
3. If using direct `fetch()`, manually add the header:
   ```javascript
   fetch(url, {
     headers: {
       'ngrok-skip-browser-warning': '1'
     }
   })
   ```

### Environment Variable Not Applied on Vercel

**Problem:** Frontend still using wrong API URL  
**Solution:**
1. Ensure you added the environment variable in Vercel dashboard
2. **Redeploy** your application (environment variables only apply to new deployments)
3. Check the deployment logs to confirm the variable is set

### Ngrok URL Changes Every Time

**Problem:** Ngrok URL changes on every restart (free plan limitation)  
**Solutions:**
- **Option 1 (Free):** Manually update `VITE_API_BASE_URL` in Vercel after each ngrok restart
- **Option 2 (Paid):** Upgrade to ngrok paid plan for a static domain
- **Option 3 (Alternative):** Deploy backend to a permanent hosting service (Railway, Render, etc.)

## Testing Locally

To test the Vercel + ngrok setup locally:

1. Set the frontend environment variable:
   ```bash
   cd frontend
   echo "VITE_API_BASE_URL=https://succeedable-perspiringly-aracely.ngrok-free.dev" > .env
   ```

2. Start the frontend dev server:
   ```bash
   npm run dev
   ```

3. Visit `http://localhost:5173` and test the connection

## Production Recommendations

For production use, consider these alternatives to ngrok:

1. **Deploy backend to a cloud service:**
   - Railway (easiest, free tier available)
   - Render (free tier available)
   - Heroku (paid)
   - AWS/GCP/Azure (more complex, scalable)

2. **Update CORS origins:**
   - Remove development URLs
   - Only allow your production Vercel URL

3. **Use environment-specific configurations:**
   ```bash
   # .env.production
   CORS_ORIGINS=https://softfix-helper.vercel.app
   ```

## Quick Reference

| Environment | Frontend URL | Backend URL | Config Location |
|------------|--------------|-------------|-----------------|
| Local Dev | http://localhost:5173 | http://localhost:3000 | `frontend/.env` |
| Production | https://softfix-helper.vercel.app | ngrok URL | Vercel Dashboard |

## Additional Resources

- [Ngrok Documentation](https://ngrok.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
