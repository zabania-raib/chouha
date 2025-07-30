require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MongoClient } = require('mongodb');

// Discord bot client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Environment variables
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const WELCOME_CHANNEL_ID = process.env.DISCORD_WELCOME_CHANNEL_ID;
const VERIFIED_ROLE_NAME = process.env.VERIFIED_ROLE_NAME;
const NETLIFY_SITE_URL = process.env.NETLIFY_SITE_URL;
const MONGO_URI = process.env.MONGO_URI;

let db;

// Connect to MongoDB
async function connectToDb() {
    if (db) return;
    try {
        const mongoClient = new MongoClient(MONGO_URI);
        await mongoClient.connect();
        db = mongoClient.db('discord_users');
        console.log('Bot: Successfully connected to MongoDB.');
    } catch (error) {
        console.error('Bot: Failed to connect to MongoDB:', error);
    }
}

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

// Function to check if user is verified and assign role
async function checkAndAssignRole(userId) {
    await connectToDb();
    
    if (!db) {
        console.error('Bot: Database not connected');
        return;
    }

    try {
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ discordId: userId });
        
        if (user) {
            console.log(`Bot: User ${userId} found in database, assigning role...`);
            await assignVerifiedRole(userId);
        }
    } catch (error) {
        console.error('Bot: Error checking user in database:', error);
    }
}

// Bot ready event
client.once('ready', async () => {
    console.log(`Bot: ${client.user.tag} is online and ready!`);
    await connectToDb();
    
    // Check for any users who completed OAuth but haven't received roles yet
    console.log('Bot: Checking for users who need role assignment...');
    
    try {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (guild) {
            const members = await guild.members.fetch();
            const role = guild.roles.cache.find(role => role.name === VERIFIED_ROLE_NAME);
            
            if (role) {
                // Check members without the verified role
                const unverifiedMembers = members.filter(member => 
                    !member.roles.cache.has(role.id) && !member.user.bot
                );
                
                console.log(`Bot: Found ${unverifiedMembers.size} unverified members`);
                
                // Check each unverified member against database
                for (const [userId, member] of unverifiedMembers) {
                    await checkAndAssignRole(userId);
                }
            }
        }
    } catch (error) {
        console.error('Bot: Error during startup role check:', error);
    }
});

// New member join event
client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`Bot: New member joined: ${member.user.username} (${member.id})`);
        
        const welcomeChannel = client.channels.cache.get(WELCOME_CHANNEL_ID);
        if (!welcomeChannel) {
            console.error('Bot: Welcome channel not found');
            return;
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

// Start the bot
if (BOT_TOKEN) {
    client.login(BOT_TOKEN);
} else {
    console.error('Bot: DISCORD_BOT_TOKEN not found in environment variables');
}

module.exports = { assignRoleToUser, checkAndAssignRole };
