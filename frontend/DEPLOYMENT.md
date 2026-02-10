# Digital Ocean Deployment Guide

## Frontend Deployment in Development Mode

The frontend is configured to be accessible from outside when running in development mode on a Digital Ocean droplet.

### Configuration

1. **Host Binding**: The Vite dev server is configured to bind to `0.0.0.0` (all network interfaces), making it accessible from outside the server.

2. **API Auto-detection**: The frontend automatically detects the API URL:
   - **Local development**: Uses `http://localhost:3000`
   - **Remote server**: Auto-detects and uses `http://<your-server-ip>:3000`
   - **Custom URL**: Can be overridden with `VITE_API_BASE_URL` environment variable

### Deployment Steps

#### 1. Setup on Digital Ocean Droplet

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Navigate to the frontend directory
cd /path/to/softfix-helper/frontend

# Install dependencies (if not already done)
npm install
```

#### 2. Configure Firewall

Make sure ports are open on your droplet:

```bash
# Allow port 5173 for frontend
sudo ufw allow 5173/tcp

# Allow port 3000 for backend
sudo ufw allow 3000/tcp

# Check firewall status
sudo ufw status
```

#### 3. Configure Environment (Optional)

The frontend will auto-detect the API URL, but you can override it:

```bash
# Copy the example env file
cp .env.example .env

# Edit .env if you need custom API URL
nano .env
```

For auto-detection, you can leave `.env` with default values or comment out `VITE_API_BASE_URL`.

For manual configuration:
```env
# If backend is on the same server
VITE_API_BASE_URL=http://your-droplet-ip:3000

# Or if you have a domain
VITE_API_BASE_URL=https://api.yourdomain.com
```

#### 4. Start the Development Server

```bash
# Start in foreground (for testing)
npm run dev

# Or use PM2 for production-like deployment
npm install -g pm2
pm2 start npm --name "softfix-frontend" -- run dev
pm2 save
pm2 startup
```

#### 5. Access the Application

Open your browser and navigate to:
```
http://your-droplet-ip:5173
```

The frontend will automatically connect to the backend at `http://your-droplet-ip:3000`

### Advanced Configuration

#### Using a Process Manager (PM2)

Create a PM2 ecosystem file (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [{
    name: 'softfix-frontend',
    script: 'npm',
    args: 'run dev',
    cwd: '/path/to/softfix-helper/frontend',
    env: {
      NODE_ENV: 'development',
      VITE_API_BASE_URL: 'http://your-droplet-ip:3000'
    }
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
```

#### Using Nginx as Reverse Proxy (Optional)

If you want to use port 80/443 instead of 5173:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Troubleshooting

#### Can't access from outside

1. Check if Vite is binding to `0.0.0.0`:
   ```bash
   # Should show vite.config.js has host: '0.0.0.0'
   cat vite.config.js | grep host
   ```

2. Check if port 5173 is open:
   ```bash
   sudo ufw status
   netstat -tuln | grep 5173
   ```

3. Check if the server is running:
   ```bash
   curl http://localhost:5173
   ```

#### API connection issues

1. Check backend is running:
   ```bash
   curl http://localhost:3000/api/topics
   ```

2. Check CORS configuration on backend server

3. Open browser console and check the API_BASE_URL:
   - Open DevTools → Console
   - The API calls should show the correct base URL

### Security Notes

⚠️ **Important**: Running in development mode on a public server is NOT recommended for production use. For production:

1. Build the application: `npm run build`
2. Use a proper web server (Nginx, Apache) to serve the built files
3. Use HTTPS with SSL certificates (Let's Encrypt)
4. Implement proper authentication and security headers
5. Use environment-specific configuration

### Production Build (Recommended for Long-term Deployment)

```bash
# Build the production bundle
npm run build

# The built files will be in the 'dist' directory
# Serve them with Nginx or any static file server
```

Example Nginx configuration for production:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/softfix-helper/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
