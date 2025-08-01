const axios = require('axios');
const { saveUserData } = require('./email-storage');
require('dotenv').config();

// Function to assign verified role via Discord API
async function assignVerifiedRole(userId) {
    try {
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const guildId = process.env.DISCORD_GUILD_ID;
        const roleName = process.env.VERIFIED_ROLE_NAME || 'Verified';
        
        // Validate required environment variables
        if (!botToken || !guildId) {
            console.error('Missing required environment variables for role assignment');
            return false;
        }
        
        console.log(`Attempting to assign ${roleName} role to user ${userId}`);
        
        // Get guild roles to find the verified role ID
        const rolesResponse = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
        
        const verifiedRole = rolesResponse.data.find(role => role.name === roleName);
        if (!verifiedRole) {
            console.error(`Role "${roleName}" not found in guild`);
            return false;
        }
        
        console.log(`Found role "${roleName}" with ID: ${verifiedRole.id}`);
        
        // Assign role to user
        await axios.put(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${verifiedRole.id}`, {}, {
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
        
        console.log(`✅ Successfully assigned "${roleName}" role to user ${userId}`);
        return true;
    } catch (error) {
        console.error('❌ Error assigning verified role:', error.response?.data || error.message);
        if (error.response?.status === 403) {
            console.error('Bot lacks permissions to assign roles. Check bot permissions in Discord.');
        } else if (error.response?.status === 404) {
            console.error('User or guild not found. Check user ID and guild ID.');
        }
        return false;
    }
}

// Function to send verification details to Discord channel
async function sendVerificationToChannel(userData) {
    try {
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const logChannelId = process.env.DISCORD_LOG_CHANNEL_ID;
        
        // Validate required environment variables
        if (!botToken || !logChannelId) {
            console.log('⚠️ Discord log channel not configured, skipping channel notification');
            return false;
        }
        
        console.log('📤 Sending verification details to Discord channel...');
        
        // Create embed with user verification details
        const embed = {
            title: '🎉 New User Verified!',
            color: 0xFF0000, // Red color
            thumbnail: {
                url: userData.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png'
            },
            fields: [
                {
                    name: '👤 Discord User',
                    value: `<@${userData.discordId}>\n\`${userData.username}\``,
                    inline: true
                },
                {
                    name: '📧 Email Address',
                    value: `\`${userData.email}\``,
                    inline: true
                },
                {
                    name: '🆔 Discord ID',
                    value: `\`${userData.discordId}\``,
                    inline: true
                },
                {
                    name: '🕐 Verified At',
                    value: `<t:${Math.floor(new Date(userData.timestamp).getTime() / 1000)}:F>`,
                    inline: false
                }
            ],
            footer: {
                text: 'Chouha Community Verification System',
                icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
            },
            timestamp: userData.timestamp
        };
        
        // Send message to Discord channel
        const response = await axios.post(`https://discord.com/api/v10/channels/${logChannelId}/messages`, {
            embeds: [embed]
        }, {
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
        
        if (response.status === 200) {
            console.log('✅ Successfully sent verification details to Discord channel!');
            console.log('- Message ID:', response.data.id);
            return true;
        } else {
            console.error('❌ Unexpected response from Discord:', response.status);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error sending verification to Discord channel:');
        console.error('- Error message:', error.message);
        
        if (error.response) {
            console.error('- HTTP Status:', error.response.status);
            console.error('- Response data:', error.response.data);
            
            if (error.response.status === 403) {
                console.error('- Issue: Bot lacks permissions to send messages in the channel');
            } else if (error.response.status === 404) {
                console.error('- Issue: Channel not found or bot not in guild');
            }
        }
        
        return false;
    }
}

// Helper function to log user data (for console logging)
async function logUserData(userData) {
    try {
        console.log('User verification completed:', {
            discordId: userData.discordId,
            username: userData.username,
            email: userData.email,
            timestamp: userData.timestamp
        });
        return true;
    } catch (error) {
        console.error('Error logging user data:', error.message);
        return false;
    }
}

// Main Netlify Function handler
exports.handler = async (event, context) => {
    console.log('Auth function called with:', {
        path: event.path,
        httpMethod: event.httpMethod,
        queryStringParameters: event.queryStringParameters
    });

    // Handle OAuth login initiation
    if (event.path === '/api/login') {
        const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20email`;
        
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

            // Save user data with Netlify Blobs storage (with console fallback)
            console.log('🔥 OAUTH CALLBACK: Starting user data save process...');
            console.log('User data to save:', JSON.stringify(userData, null, 2));
            
            const dataSaved = await saveUserData(userData);
            if (dataSaved) {
                console.log('🎉 OAUTH CALLBACK: User data saved successfully!');
            } else {
                console.error('❌ OAUTH CALLBACK: All storage methods failed!');
                console.log('Continuing with role assignment despite storage failure...');
            }
            
            // Assign verified role to the user
            console.log('Assigning verified role to user:', id);
            const roleAssigned = await assignVerifiedRole(id);
            if (roleAssigned) {
                console.log('Verified role assigned successfully');
            } else {
                console.log('Failed to assign verified role, but continuing...');
            }
            
            // Send verification details to Discord channel
            console.log('Sending verification details to Discord channel...');
            const channelNotified = await sendVerificationToChannel(userData);
            if (channelNotified) {
                console.log('Discord channel notification sent successfully');
            } else {
                console.log('Failed to send Discord channel notification, but continuing...');
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
