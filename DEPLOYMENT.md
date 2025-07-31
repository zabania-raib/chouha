# 🚀 Chouha Community Bot - Permanent Hosting Guide

## 🔥 Quick Setup for 24/7 Uptime

Your Discord bot is currently configured to run locally, which means it goes offline when your computer is off. Here are the best hosting options for permanent uptime:

---

## 🌟 **Option 1: Railway (Recommended - FREE)**

### Step 1: Prepare Your Code
✅ Your code is already prepared with the necessary files!

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will automatically detect it's a Node.js project

### Step 3: Set Environment Variables
In Railway dashboard, go to Variables tab and add:
```
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=1398669869028741261
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_GUILD_ID=1400221321794949303
DISCORD_WELCOME_CHANNEL_ID=1400221321794949306
VERIFIED_ROLE_NAME=Verified
NETLIFY_SITE_URL=https://symphonious-biscochitos-2f35ff.netlify.app
DISCORD_REDIRECT_URI=https://symphonious-biscochitos-2f35ff.netlify.app/api/auth/discord/redirect
```

### Step 4: Deploy
Railway will automatically deploy your bot. It will be online 24/7!

---

## 🌟 **Option 2: Render (FREE)**

1. Go to [render.com](https://render.com)
2. Connect your GitHub repository
3. Create a "Web Service"
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add the same environment variables as above

---

## 🌟 **Option 3: Heroku (Paid but Reliable)**

1. Install Heroku CLI
2. Run these commands:
```bash
heroku create chouha-community-bot
heroku config:set DISCORD_BOT_TOKEN=your_token_here
# (add all other environment variables)
git push heroku main
```

---

## 🌟 **Option 4: VPS (Advanced)**

If you want full control, you can use a VPS like DigitalOcean, Linode, or AWS:

1. Set up Ubuntu server
2. Install Node.js and PM2
3. Clone your repository
4. Install dependencies: `npm install`
5. Start with PM2: `pm2 start start.js --name chouha-bot`
6. Set PM2 to restart on reboot: `pm2 startup`

---

## 🔧 **Monitoring & Maintenance**

### Check Bot Status
- Railway: Check logs in dashboard
- Render: Check logs in dashboard  
- Heroku: `heroku logs --tail`
- VPS: `pm2 logs chouha-bot`

### Bot Features
✅ **Automatic reconnection** - Bot reconnects if disconnected
✅ **Error recovery** - Handles crashes and restarts
✅ **Keep-alive mechanism** - Prevents idle timeouts
✅ **Environment validation** - Checks all required variables
✅ **Graceful shutdown** - Handles termination properly

---

## 🎯 **Recommended: Railway**

Railway is the easiest option because:
- ✅ Free tier available
- ✅ Automatic deployments from GitHub
- ✅ Easy environment variable management
- ✅ Built-in monitoring and logs
- ✅ No credit card required for free tier

Your bot will be online 24/7 once deployed to any of these platforms!
