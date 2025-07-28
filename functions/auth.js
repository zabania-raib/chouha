const axios = require('axios');
require('dotenv').config();

// Helper function to save user data to Netlify Blobs
async function saveUserData(newUser) {
    try {
        const { getStore } = await import('@netlify/blobs');
        const store = getStore('users', {
            siteID: process.env.SITE_ID,
            token: process.env.NETLIFY_API_TOKEN,
        });
        await store.set(newUser.discordId, JSON.stringify(newUser));
        console.log(`User data for ${newUser.discordId} saved successfully.`);
    } catch (error) {
        console.error('Error saving user data to Netlify Blobs:', error);
        // Re-throw the error to be caught by the main handler
        throw error;
    }
}

// Main Netlify Function handler
exports.handler = async (event, context) => {
    // Route for initiating Discord OAuth2 login
    if (event.path.endsWith('/api/login')) {
        const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20email`;
        return {
            statusCode: 302,
            headers: {
                Location: discordAuthUrl,
            },
        };
    }

    // Route for handling the Discord OAuth2 redirect
    if (event.path.endsWith('/api/auth/discord/redirect')) {
        const { code } = event.queryStringParameters;

        if (!code) {
            return {
                statusCode: 400,
                body: 'Authorization code is missing.',
            };
        }

        try {
            console.log('Starting OAuth2 flow with code:', code);
            console.log('Environment variables check:', {
                hasClientId: !!process.env.DISCORD_CLIENT_ID,
                hasClientSecret: !!process.env.DISCORD_CLIENT_SECRET,
                hasRedirectUri: !!process.env.DISCORD_REDIRECT_URI,
                hasSiteId: !!process.env.SITE_ID,
                hasNetlifyToken: !!process.env.NETLIFY_API_TOKEN
            });

            const tokenResponse = await axios.post('https://discord.com/api/oauth2/token',
                new URLSearchParams({
                    client_id: process.env.DISCORD_CLIENT_ID,
                    client_secret: process.env.DISCORD_CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: process.env.DISCORD_REDIRECT_URI,
                    scope: 'identify email',
                }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });

            console.log('Token exchange successful');
            const accessToken = tokenResponse.data.access_token;

            const userResponse = await axios.get('https://discord.com/api/users/@me', {
                headers: {
                    authorization: `Bearer ${accessToken}`,
                },
            });

            console.log('User data fetched successfully');
            const { id, username, avatar, email } = userResponse.data;
            const avatarURL = avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : null;

            const userData = {
                discordId: id,
                username: username,
                avatarURL: avatarURL,
                email: email,
                timestamp: new Date().toISOString(),
            };

            console.log('Attempting to save user data to Netlify Blobs');
            await saveUserData(userData);
            console.log('User data saved successfully, redirecting to Discord');

            // Redirect user to the Discord app
            return {
                statusCode: 302,
                headers: {
                    Location: 'https://discord.com/app',
                },
            };

        } catch (error) {
            console.error('Detailed error information:');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            if (error.response) {
                console.error('HTTP Status:', error.response.status);
                console.error('Response data:', error.response.data);
                console.error('Response headers:', error.response.headers);
            }
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Authentication failed',
                    message: error.message,
                    details: error.response ? error.response.data : 'No additional details'
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }
    }

    // Fallback for any other route
    return {
        statusCode: 404,
        body: 'Not Found',
    };
};
