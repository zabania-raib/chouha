require('dotenv').config();
const express = require('express');
const axios = require('axios');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

// The root path is now relative to /api/
router.get('/', (req, res) => {
    res.send('<h1>Welcome to the Discord OAuth2 Example App</h1><a href="/api/login">Login with Discord</a>');
});

// The /login path is now relative to /api/
router.get('/login', (req, res) => {
    const discordOAuthURL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20email`;
    res.redirect(discordOAuthURL);
});

// The callback path is now relative to /api/
router.get('/auth/discord/redirect', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Authorization code is missing.');
    }

    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: DISCORD_REDIRECT_URI,
                scope: 'identify email',
            }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                authorization: `Bearer ${accessToken}`,
            },
        });

        const { id, username, avatar, email } = userResponse.data;
        const avatarURL = avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : null;

        const userData = {
            discordId: id,
            username: username,
            avatarURL: avatarURL,
            email: email,
            timestamp: new Date().toISOString()
        };

        // Pass the Netlify context from the request to the save function
        await saveUserData(userData, req.requestContext);

        res.redirect('https://discord.com/app');

    } catch (error) {
        console.error('Error during Discord OAuth2 flow:', error);
        res.status(500).send('An error occurred during authentication.');
    }
});

async function saveUserData(newUser, context) {
    try {
        // Get the blob store. The store name can be anything you want.
        const { getStore } = await import('@netlify/blobs');
        // Pass the context to getStore to grant it the correct permissions
        const store = getStore('users', { context });
        console.log('Attempting to save user data to Netlify Blobs:', newUser);
        // Save the user data. The key is the user's Discord ID to ensure uniqueness.
        await store.set(newUser.discordId, JSON.stringify(newUser));
        console.log(`User data for ${newUser.discordId} saved successfully.`);
    } catch (error) {
        console.error('Error saving user data to Netlify Blobs:', error);
        throw error; // Re-throw to be caught by the main handler
    }
}

// Mount the router under the /api path
app.use('/api', router);

// Export the handler for Netlify
module.exports.handler = serverless(app);
