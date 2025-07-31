require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// Test script to verify welcome message functionality
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const WELCOME_CHANNEL_ID = process.env.DISCORD_WELCOME_CHANNEL_ID;

client.once('ready', async () => {
    console.log(`Test Bot: ${client.user.tag} is online!`);
    
    try {
        // Test if we can access the guild
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) {
            console.error('❌ Guild not found in cache, trying to fetch...');
            const fetchedGuild = await client.guilds.fetch(GUILD_ID);
            if (!fetchedGuild) {
                console.error('❌ Could not fetch guild');
                process.exit(1);
            }
            console.log('✅ Guild fetched successfully:', fetchedGuild.name);
        } else {
            console.log('✅ Guild found in cache:', guild.name);
        }
        
        // Test if we can access the welcome channel
        const welcomeChannel = client.channels.cache.get(WELCOME_CHANNEL_ID);
        if (!welcomeChannel) {
            console.error('❌ Welcome channel not found in cache, trying to fetch...');
            const fetchedChannel = await client.channels.fetch(WELCOME_CHANNEL_ID);
            if (!fetchedChannel) {
                console.error('❌ Could not fetch welcome channel');
                process.exit(1);
            }
            console.log('✅ Welcome channel fetched successfully:', fetchedChannel.name);
        } else {
            console.log('✅ Welcome channel found in cache:', welcomeChannel.name);
        }
        
        // Test bot permissions in the welcome channel
        const permissions = welcomeChannel.permissionsFor(client.user);
        console.log('Bot permissions in welcome channel:');
        console.log('- Send Messages:', permissions.has('SendMessages'));
        console.log('- Embed Links:', permissions.has('EmbedLinks'));
        console.log('- Use External Emojis:', permissions.has('UseExternalEmojis'));
        console.log('- Add Reactions:', permissions.has('AddReactions'));
        
        // Test sending a simple message
        console.log('Testing message send...');
        await welcomeChannel.send('🔥 Test message from bot - Welcome functionality check! 👹');
        console.log('✅ Test message sent successfully!');
        
    } catch (error) {
        console.error('❌ Error during testing:', error);
    }
    
    console.log('Test completed. Shutting down...');
    client.destroy();
    process.exit(0);
});

client.login(BOT_TOKEN);
