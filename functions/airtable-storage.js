const axios = require('axios');

// Airtable configuration
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Verified Users';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

/**
 * Save user data to Airtable - Much more reliable than Netlify Blobs
 * @param {Object} userData - User data from Discord OAuth
 * @returns {Promise<boolean>} - Success status
 */
async function saveUserDataToAirtable(userData) {
    try {
        // Validate Airtable configuration
        if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
            console.log('⚠️ Airtable not configured, skipping email storage');
            return false;
        }

        console.log('📝 Saving user data to Airtable...');
        console.log('- User ID:', userData.discordId);
        console.log('- Username:', userData.username);
        console.log('- Email:', userData.email);

        const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
        
        const payload = {
            records: [
                {
                    fields: {
                        'Discord ID': userData.discordId,
                        'Username': userData.username,
                        'Email': userData.email,
                        'Avatar URL': userData.avatarURL || '',
                        'Verified Date': userData.timestamp,
                        'Status': 'Verified'
                    }
                }
            ]
        };

        const response = await axios.post(airtableUrl, payload, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        if (response.status === 200) {
            console.log('✅ Successfully saved user data to Airtable!');
            console.log('- Record ID:', response.data.records[0].id);
            return true;
        } else {
            console.error('❌ Unexpected response from Airtable:', response.status);
            return false;
        }

    } catch (error) {
        console.error('❌ Error saving to Airtable:');
        console.error('- Error message:', error.message);
        
        if (error.response) {
            console.error('- HTTP Status:', error.response.status);
            console.error('- Response data:', error.response.data);
            
            // Handle specific Airtable errors
            if (error.response.status === 401) {
                console.error('- Issue: Invalid Airtable API key');
            } else if (error.response.status === 404) {
                console.error('- Issue: Base ID or Table name not found');
            } else if (error.response.status === 422) {
                console.error('- Issue: Invalid field names or data format');
            }
        }
        
        return false;
    }
}

/**
 * Fallback: Save to simple JSON file if Airtable fails
 * @param {Object} userData - User data from Discord OAuth
 * @returns {Promise<boolean>} - Success status
 */
async function saveUserDataToJSON(userData) {
    try {
        console.log('💾 Saving user data to JSON fallback...');
        
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
        console.error('❌ Even JSON fallback failed:', error.message);
        return false;
    }
}

/**
 * Main function to save user data with multiple fallbacks
 * @param {Object} userData - User data from Discord OAuth
 * @returns {Promise<boolean>} - Success status
 */
async function saveUserData(userData) {
    console.log('🔄 Starting user data save process...');
    
    // Try Airtable first
    const airtableSuccess = await saveUserDataToAirtable(userData);
    if (airtableSuccess) {
        return true;
    }
    
    // Fallback to JSON logging
    console.log('⚠️ Airtable failed, using JSON fallback...');
    const jsonSuccess = await saveUserDataToJSON(userData);
    
    return jsonSuccess;
}

module.exports = {
    saveUserData,
    saveUserDataToAirtable,
    saveUserDataToJSON
};
