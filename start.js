#!/usr/bin/env node

// Enhanced startup script for permanent uptime hosting
require('dotenv').config();

console.log('🔥 Starting Chouha Community Discord Bot...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Platform:', process.platform);
console.log('Node.js version:', process.version);

// Validate environment variables before starting
const requiredVars = [
    'DISCORD_BOT_TOKEN',
    'DISCORD_GUILD_ID', 
    'DISCORD_WELCOME_CHANNEL_ID',
    'NETLIFY_SITE_URL'
];

const missing = requiredVars.filter(varName => !process.env[varName]);
if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please set these variables in your hosting platform environment settings.');
    process.exit(1);
}

console.log('✅ All environment variables validated');
console.log('🚀 Launching Discord bot...');

// Start the bot
require('./discord-bot.js');
