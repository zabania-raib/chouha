const { getStore } = require('@netlify/blobs');

/**
 * Save user data to Netlify Blobs
 * @param {Object} userData - User data from Discord OAuth
 * @returns {Promise<boolean>} - Success status
 */
async function saveUserDataToBlobs(userData) {
    try {
        console.log('📝 Saving user data to Netlify Blobs...');
        console.log('- User ID:', userData.discordId);
        console.log('- Username:', userData.username);
        console.log('- Email:', userData.email);

        // Get the Netlify Blobs store
        const store = getStore('user-emails');
        
        // Create a unique key for this user
        const userKey = `user-${userData.discordId}`;
        
        // Prepare user data for storage
        const userRecord = {
            discordId: userData.discordId,
            username: userData.username,
            email: userData.email,
            avatarURL: userData.avatarURL || '',
            verifiedDate: userData.timestamp,
            status: 'Verified'
        };

        // Save to Netlify Blobs
        await store.set(userKey, JSON.stringify(userRecord));
        
        console.log('✅ Successfully saved user data to Netlify Blobs!');
        console.log('- Storage key:', userKey);
        return true;

    } catch (error) {
        console.error('❌ Error saving to Netlify Blobs:');
        console.error('- Error message:', error.message);
        console.error('- Error stack:', error.stack);
        return false;
    }
}

/**
 * Fallback: Log user data to console if Netlify Blobs fails
 * @param {Object} userData - User data from Discord OAuth
 * @returns {Promise<boolean>} - Success status
 */
async function logUserDataToConsole(userData) {
    try {
        console.log('💾 Logging user data to console as fallback...');
        
        // Simple console logging as fallback
        console.log('📋 USER VERIFICATION DATA:');
        console.log('==========================================');
        console.log('Discord ID:', userData.discordId);
        console.log('Username:', userData.username);
        console.log('Email:', userData.email);
        console.log('Avatar URL:', userData.avatarURL);
        console.log('Timestamp:', userData.timestamp);
        console.log('==========================================');
        
        return true;
    } catch (error) {
        console.error('❌ Even console logging failed:', error.message);
        return false;
    }
}

/**
 * Main function to save user data with fallback to console logging
 * @param {Object} userData - User data from Discord OAuth
 * @returns {Promise<boolean>} - Success status
 */
async function saveUserData(userData) {
    console.log('🔄 Starting user data save process...');
    
    // Try Netlify Blobs first
    const blobsSuccess = await saveUserDataToBlobs(userData);
    if (blobsSuccess) {
        return true;
    }
    
    // Fallback to console logging
    console.log('⚠️ Netlify Blobs failed, using console logging fallback...');
    const consoleSuccess = await logUserDataToConsole(userData);
    
    return consoleSuccess;
}

module.exports = {
    saveUserData,
    saveUserDataToBlobs,
    logUserDataToConsole
};
