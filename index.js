require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

const USERS_FILE = path.join(__dirname, 'users.json');

// Serve static files from the 'public' directory if you have one
// app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('<h1>Welcome to the Discord OAuth2 Example App</h1><a href="/login">Login with Discord</a>');
});

app.get('/login', (req, res) => {
    const discordOAuthURL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20email`;
    res.redirect(discordOAuthURL);
});

app.get('/api/auth/discord/redirect', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Authorization code is missing.');
    }

    try {
        // Exchange authorization code for an access token
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

        // Fetch user data from Discord API
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

        // Save user data to users.json
        await saveUserData(userData);

        res.redirect('https://discord.com/app');

    } catch (error) {
        console.error('Error during Discord OAuth2 flow:', error.response ? error.response.data : error.message);
        res.status(500).send('An error occurred during authentication.');
    }
});

async function saveUserData(newUser) {
    let users = [];
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        users = JSON.parse(data);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error reading users.json:', error);
            throw error;
        }
        // File doesn't exist, it will be created.
    }

    // Check if user already exists and update their data
    const userIndex = users.findIndex(user => user.discordId === newUser.discordId);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...newUser }; // Update existing user
    } else {
        users.push(newUser); // Add new user
    }

    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'success.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
