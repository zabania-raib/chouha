const axios = require('axios');
require('dotenv').config();

// Function to assign verified role via Discord API
async function assignVerifiedRole(userId) {
    try {
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const guildId = process.env.DISCORD_GUILD_ID;
        const roleName = process.env.VERIFIED_ROLE_NAME || 'Verified';
        
        // Get guild roles to find the verified role ID
        const rolesResponse = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const verifiedRole = rolesResponse.data.find(role => role.name === roleName);
        if (!verifiedRole) {
            console.error(`Role "${roleName}" not found in guild`);
            return false;
        }
        
        // Assign role to user
        await axios.put(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${verifiedRole.id}`, {}, {
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Successfully assigned "${roleName}" role to user ${userId}`);
        return true;
    } catch (error) {
        console.error('Error assigning verified role:', error.response?.data || error.message);
        return false;
    }
}

// Helper function to save user data to Netlify Blobs
async function saveUserData(newUser) {
    try {
        console.log('Environment variables check:', {
            SITE_ID: process.env.SITE_ID ? 'present' : 'missing',
            NETLIFY_API_TOKEN: process.env.NETLIFY_API_TOKEN ? 'present' : 'missing',
            NODE_ENV: process.env.NODE_ENV,
            NETLIFY: process.env.NETLIFY ? 'present' : 'missing'
        });
        
        const { getStore } = await import('@netlify/blobs');
        
        // Try automatic detection first (recommended for Netlify Functions)
        let store;
        try {
            console.log('Attempting automatic Netlify Blobs detection...');
            store = getStore('users');
        } catch (autoError) {
            console.log('Auto-detection failed, trying manual configuration:', autoError.message);
            // Fallback to manual configuration
            store = getStore({
                name: 'users',
                siteID: process.env.SITE_ID,
                token: process.env.NETLIFY_API_TOKEN,
            });
        }
        
        await store.set(newUser.discordId, JSON.stringify(newUser));
        console.log(`User data for ${newUser.discordId} saved successfully.`);
    } catch (error) {
        console.error('Error saving user data to Netlify Blobs:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
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
            console.log('User data saved successfully');
            
            // Assign verified role to the user
            console.log('Attempting to assign verified role to user:', id);
            const roleAssigned = await assignVerifiedRole(id);
            if (roleAssigned) {
                console.log('Verified role assigned successfully');
            } else {
                console.log('Failed to assign verified role, but continuing...');
            }

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
