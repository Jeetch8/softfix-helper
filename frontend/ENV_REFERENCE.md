# Environment Variables Reference

## Frontend Environment Variables

### VITE_API_BASE_URL

**Type:** String (URL)  
**Required:** No  
**Default:** Auto-detected based on hostname

#### Description
Specifies the base URL for the backend API. If not set, the frontend will automatically detect the API URL based on the current hostname.

#### Auto-detection Behavior
- **localhost/127.0.0.1**: `http://localhost:3000`
- **Remote server**: `http://<current-hostname>:3000` or `https://<current-hostname>:3000`

#### Usage Examples

**Local Development:**
```env
# Usually not needed, auto-detection works
VITE_API_BASE_URL=http://localhost:3000
```

**Digital Ocean Droplet (IP-based):**
```env
# If your droplet IP is 142.93.123.45
VITE_API_BASE_URL=http://142.93.123.45:3000
```

**Digital Ocean with Domain:**
```env
# If you have a domain pointing to your droplet
VITE_API_BASE_URL=https://api.yourdomain.com
```

**Production (Same Domain, Different Port):**
```env
VITE_API_BASE_URL=https://yourdomain.com:3000
```

**Production (Separate API Domain):**
```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

## Quick Setup Guide

### 1. Copy the example file
```bash
cp .env.example .env
```

### 2. Edit for your environment

**For local development:**
- No changes needed, or comment out `VITE_API_BASE_URL`

**For Digital Ocean droplet:**
```env
VITE_API_BASE_URL=http://YOUR_DROPLET_IP:3000
```

**For production with domain:**
```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

### 3. Restart the dev server
```bash
npm run dev
```

## Debugging

To see which API URL is being used:
1. Open the browser console
2. Look for the message: `🔗 API Base URL: <url>`
3. This message only appears in development mode

## Notes

- Environment variables must start with `VITE_` to be exposed to the client
- Changes to `.env` require restarting the dev server
- Never commit `.env` with sensitive data (it's in `.gitignore`)
- Use `.env.example` as a template for team members
