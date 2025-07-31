require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Discord bot client with enhanced configuration
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ],
    // Add failover options
    failIfNotExists: false,
    allowedMentions: {
        parse: ['users', 'roles'],
        repliedUser: true
    }
});

// Environment variables
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const WELCOME_CHANNEL_ID = process.env.DISCORD_WELCOME_CHANNEL_ID;
const VERIFIED_ROLE_NAME = process.env.VERIFIED_ROLE_NAME;
const NETLIFY_SITE_URL = process.env.NETLIFY_SITE_URL;

// Track processed members to prevent duplicates
const processedMembers = new Map(); // Use Map to store timestamp



// Function to assign verified role to user
async function assignVerifiedRole(userId) {
    try {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) {
            console.error('Bot: Guild not found');
            return false;
        }

        const member = await guild.members.fetch(userId);
        if (!member) {
            console.error('Bot: Member not found');
            return false;
        }

        const role = guild.roles.cache.find(role => role.name === VERIFIED_ROLE_NAME);
        if (!role) {
            console.error(`Bot: Role "${VERIFIED_ROLE_NAME}" not found`);
            return false;
        }

        await member.roles.add(role);
        console.log(`Bot: Successfully assigned "${VERIFIED_ROLE_NAME}" role to ${member.user.username}`);
        return true;
    } catch (error) {
        console.error('Bot: Error assigning role:', error);
        return false;
    }
}

// Function to check if user is verified and assign role (simplified without database)
async function checkAndAssignRole(userId) {
    // Since we're not using a database, this function is simplified
    // Role assignment will be handled through the OAuth callback via Netlify Functions
    console.log(`Bot: Checking role assignment for user ${userId} (no database check needed)`);
}

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Bot: Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Bot: Uncaught Exception:', error);
    // Don't exit the process, just log the error
});

// Discord client error handling
client.on('error', (error) => {
    console.error('Bot: Discord client error:', error);
});

// Handle disconnections
client.on('disconnect', () => {
    console.warn('Bot: Disconnected from Discord. Attempting to reconnect...');
});

// Handle reconnection
client.on('reconnecting', () => {
    console.log('Bot: Reconnecting to Discord...');
});

// Handle rate limits
client.on('rateLimit', (info) => {
    console.warn('Bot: Rate limited:', info);
});

// Handle warnings
client.on('warn', (info) => {
    console.warn('Bot: Warning:', info);
});

// Bot ready event
client.once('ready', async () => {
    console.log(`Bot: ${client.user.tag} is online and ready!`);
    console.log(`Bot: Serving ${client.guilds.cache.size} guild(s) with ${client.users.cache.size} users`);
    
    // Set bot status
    client.user.setActivity('Verifying members | Chouha Community', { type: 'WATCHING' });
    
    console.log('Bot: Ready and waiting for new members to join!');
});

// New member join event with enhanced error handling
client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`Bot: New member joined: ${member.user.username} (${member.id})`);
        
        // Validate member object
        if (!member || !member.user) {
            console.error('Bot: Invalid member object received');
            return;
        }
        
        // Check if we've already processed this member recently (prevent duplicates)
        const now = Date.now();
        const lastProcessed = processedMembers.get(member.id);
        
        if (lastProcessed && (now - lastProcessed) < 30000) { // 30 seconds cooldown
            console.log(`Bot: Member ${member.user.username} (${member.id}) already processed ${Math.floor((now - lastProcessed) / 1000)}s ago, skipping duplicate`);
            return;
        }
        
        // Add member to processed map with timestamp
        processedMembers.set(member.id, now);
        console.log(`Bot: Processing welcome message for ${member.user.username} (${member.id})`);
        
        // Clean up old entries (older than 5 minutes)
        for (const [userId, timestamp] of processedMembers.entries()) {
            if (now - timestamp > 300000) { // 5 minutes
                processedMembers.delete(userId);
            }
        }
        
        // Check if bot is ready - if not, wait without re-emitting
        if (!client.readyAt) {
            console.warn('Bot: Bot not ready yet, waiting...');
            // Wait for bot to be ready instead of re-emitting
            let attempts = 0;
            while (!client.readyAt && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }
            if (!client.readyAt) {
                console.error('Bot: Bot still not ready after waiting, skipping welcome message');
                processedMembers.delete(member.id); // Remove from processed map
                return;
            }
        }
        
        const welcomeChannel = client.channels.cache.get(WELCOME_CHANNEL_ID);
        if (!welcomeChannel) {
            console.error('Bot: Welcome channel not found. Attempting to fetch...');
            try {
                const fetchedChannel = await client.channels.fetch(WELCOME_CHANNEL_ID);
                if (!fetchedChannel) {
                    console.error('Bot: Could not fetch welcome channel');
                    processedMembers.delete(member.id); // Remove from processed map
                    return;
                }
            } catch (fetchError) {
                console.error('Bot: Error fetching welcome channel:', fetchError.message);
                processedMembers.delete(member.id); // Remove from processed map
                return;
            }
        }

        // Create professional welcome embed
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#FF0000') // Red color matching your theme
            .setTitle('🔥 Welcome to Chouha Community! 🔥')
            .setDescription(`Welcome ${member.user}, and thank you for joining our exclusive underworld community!`)
            .addFields(
                {
                    name: '⚡ Get Verified',
                    value: 'To gain full access to our server and receive the **Verified** role, please complete the verification process by clicking the button below.',
                    inline: false
                },
                {
                    name: '🔒 Verification Process',
                    value: '• Click the "Verify Account" button\n• Authorize our bot through Discord\n• Receive your **Verified** role automatically\n• Gain access to all server channels',
                    inline: false
                },
                {
                    name: '💀 Join the Darkness',
                    value: 'Once verified, you\'ll have full access to our community and all its features. Welcome to the abyss!',
                    inline: false
                }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ 
                text: 'Chouha Community - Enter the Darkness',
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        // Create verification button
        const verifyButton = new ButtonBuilder()
            .setLabel('🔥 Verify Account')
            .setStyle(ButtonStyle.Link)
            .setURL(NETLIFY_SITE_URL)
            .setEmoji('⚡');

        const actionRow = new ActionRowBuilder()
            .addComponents(verifyButton);

        // Send welcome message
        await welcomeChannel.send({
            content: `${member.user} has entered the realm! 👹`,
            embeds: [welcomeEmbed],
            components: [actionRow]
        });

        console.log(`Bot: Welcome message sent for ${member.user.username}`);

    } catch (error) {
        console.error('Bot: Error sending welcome message:', error);
    }
});

// Export function to assign role (to be called from OAuth callback)
async function assignRoleToUser(userId) {
    return await assignVerifiedRole(userId);
}

// Keep-alive mechanism to prevent the bot from going idle
function keepAlive() {
    setInterval(() => {
        if (client.readyAt) {
            console.log(`Bot: Keep-alive ping - Status: Online | Uptime: ${Math.floor(client.uptime / 1000)}s`);
        }
    }, 300000); // Every 5 minutes
}

// Periodic role assignment check (simplified without database)
function startPeriodicRoleCheck() {
    setInterval(async () => {
        if (!client.readyAt) return;
        
        try {
            console.log('Bot: Running periodic status check...');
            const guild = client.guilds.cache.get(GUILD_ID);
            if (!guild) return;
            
            const role = guild.roles.cache.find(role => role.name === VERIFIED_ROLE_NAME);
            if (!role) {
                console.warn(`Bot: Verified role "${VERIFIED_ROLE_NAME}" not found in guild`);
                return;
            }
            
            // Just log status since we're not using database
            const members = await guild.members.fetch();
            const unverifiedMembers = members.filter(member => 
                !member.roles.cache.has(role.id) && !member.user.bot
            );
            
            console.log(`Bot: Status check - ${unverifiedMembers.size} members without verified role`);
        } catch (error) {
            console.error('Bot: Error during periodic status check:', error.message);
        }
    }, 300000); // Every 5 minutes (less frequent since no database operations)
}

// Enhanced bot startup with reconnection logic
async function startBot() {
    if (!BOT_TOKEN) {
        console.error('Bot: DISCORD_BOT_TOKEN not found in environment variables');
        return;
    }

    try {
        console.log('Bot: Starting Discord bot...');
        await client.login(BOT_TOKEN);
        
        // Start keep-alive mechanism
        keepAlive();
        
        // Start periodic role assignment check
        startPeriodicRoleCheck();
        
        console.log('Bot: Successfully logged in to Discord');
    } catch (error) {
        console.error('Bot: Failed to login to Discord:', error.message);
        
        // Retry login after delay
        console.log('Bot: Retrying login in 10 seconds...');
        setTimeout(() => {
            startBot();
        }, 10000);
    }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
    console.log('Bot: Received SIGINT, shutting down gracefully...');
    
    client.destroy();
    console.log('Bot: Discord client destroyed');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Bot: Received SIGTERM, shutting down gracefully...');
    
    client.destroy();
    console.log('Bot: Discord client destroyed');
    process.exit(0);
});

// Start the bot
startBot();

module.exports = { assignRoleToUser, checkAndAssignRole };
