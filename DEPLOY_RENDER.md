# Deploying MCD Monitor on Render.com (Free Tier)

## Overview

This guide deploys:
- **Backend API** → Render Web Service (Free tier, with persistent disk for SQLite + uploads)
- **Frontend** → Render Static Site (Free tier)

---

## Step 1: Push Code to GitHub

1. Create a new repository on GitHub: https://github.com/new
   - Name: `mcd-construction-monitor`
   - Set to **Private** (recommended for government apps)
   - Click **Create repository**

2. Push the code from your local machine:
```bash
cd mcd-construction-monitor
git init
git add .
git commit -m "Initial commit - MCD Construction Monitor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mcd-construction-monitor.git
git push -u origin main
```

---

## Step 2: Create a Render Account

1. Go to https://render.com and sign up (use "Sign up with GitHub" for easiest setup)
2. No credit card required for free tier

---

## Step 3: Deploy the Backend API

1. Go to https://dashboard.render.com/new/web-service
2. Connect your GitHub repository `mcd-construction-monitor`
3. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `mcd-monitor-backend` |
| **Region** | Oregon (US West) or closest to you |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | Free |

4. Click **Create Web Service**
5. **Add a Disk** (for persistent database + uploaded files):
   - Go to your service → **Disks** tab → **Add Disk**
   - Name: `mcd-data`
   - Mount Path: `/data`
   - Size: 1 GB (free tier allows 1 disk)

6. Wait for the deploy to complete (~2-3 minutes)
7. Your backend URL will be: `https://mcd-monitor-backend.onrender.com`
8. Verify: visit `https://mcd-monitor-backend.onrender.com/api/health`

---

## Step 4: Deploy the Frontend

1. Go to https://dashboard.render.com/new/static-site
2. Connect the same GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `mcd-monitor-frontend` |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && VITE_API_URL=https://mcd-monitor-backend.onrender.com npm run build` |
| **Publish Directory** | `dist` |

> **IMPORTANT:** Replace `mcd-monitor-backend` in the Build Command with your actual backend service name if different.

4. **Add Rewrite Rule** (for React Router):
   - Go to **Redirects/Rewrites** tab
   - Add: Source: `/*` → Destination: `/index.html` → Type: **Rewrite**

5. Click **Create Static Site**
6. Your frontend URL will be: `https://mcd-monitor-frontend.onrender.com`

---

## Step 5: Verify the Deployment

1. Open your frontend URL: `https://mcd-monitor-frontend.onrender.com`
2. Login with: **admin** / **admin123**
3. Try creating a report and uploading an image
4. Check that images display correctly

---

## Important Notes

### Free Tier Limitations
- **Backend spins down after 15 minutes of inactivity** — first request after idle takes ~30-60 seconds to wake up
- 750 hours/month free (enough for one always-on service)
- 1 persistent disk included free (1 GB)
- Static sites are always free with unlimited bandwidth

### To Keep Backend Always On (Optional)
- Use a free uptime monitor like [UptimeRobot](https://uptimerobot.com) to ping `https://mcd-monitor-backend.onrender.com/api/health` every 14 minutes
- This prevents the free tier from spinning down

### Custom Domain (Optional)
- Go to your service → **Settings** → **Custom Domains**
- Add your domain (e.g., `mcd-monitor.yourdomain.com`)
- Render provides free SSL certificates

### Security Recommendations for Production
1. Change the default admin password immediately after first login
2. Set a strong `SECRET_KEY` environment variable in Render dashboard:
   - Go to Backend Service → **Environment** tab
   - Add: `SECRET_KEY` = (generate a random 32-character string)
3. Update CORS origins in `main.py` to only allow your frontend domain instead of `"*"`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend takes long to respond | Free tier cold start (~30s). Use UptimeRobot to keep it warm |
| Images not loading | Check that VITE_API_URL in frontend build command matches your backend URL exactly |
| Database reset after redeploy | Make sure the Disk is mounted at `/data` — the code stores DB at `/data/mcd_monitor.db` |
| Frontend shows blank page | Add the `/*` → `/index.html` rewrite rule in Render static site settings |

---

## Costs Summary

| Component | Cost |
|-----------|------|
| Backend Web Service | **Free** (750 hrs/month) |
| Frontend Static Site | **Free** (unlimited) |
| Persistent Disk (1 GB) | **Free** (1 disk included) |
| **Total** | **$0/month** |
