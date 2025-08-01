const { getStore } = require('@netlify/blobs');

/**
 * Netlify Function to export all stored emails from Netlify Blobs
 * This function can only run in the Netlify environment where Blobs are available
 */
exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }

    try {
        // Basic authentication check
        const authHeader = event.headers.authorization;
        const expectedToken = process.env.EXPORT_API_TOKEN;
        
        if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized' }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        console.log('Export function: Starting email export from Netlify Blobs...');
        
        // Get the Netlify Blobs store
        const store = getStore('user-emails');
        
        // List all stored user data
        const { blobs } = await store.list();
        
        if (!blobs || blobs.length === 0) {
            console.log('Export function: No emails found in storage');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'No emails found in storage',
                    data: {
                        exportInfo: {
                            exportDate: new Date().toISOString(),
                            totalRecords: 0,
                            source: 'Chouha Community Netlify Function'
                        },
                        users: []
                    }
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }
        
        console.log(`Export function: Found ${blobs.length} stored user records`);
        
        // Retrieve all user data
        const allUserData = [];
        
        for (const blob of blobs) {
            try {
                const userData = await store.get(blob.key);
                if (userData) {
                    const parsedData = JSON.parse(userData);
                    
                    // Format data to match requested structure
                    const formattedData = {
                        _id: `blob_${blob.key}`,
                        userid: parsedData.discordId,
                        username: parsedData.username,
                        premium_type: 0, // Default value
                        email: parsedData.email,
                        verified: parsedData.status === 'Verified',
                        avatarURL: parsedData.avatarURL || '',
                        verifiedDate: parsedData.verifiedDate,
                        storage_key: blob.key,
                        last_updated: blob.lastModified || new Date().toISOString()
                    };
                    
                    allUserData.push(formattedData);
                }
            } catch (error) {
                console.error(`Export function: Error parsing data for key ${blob.key}:`, error.message);
            }
        }
        
        console.log(`Export function: Successfully exported ${allUserData.length} user records`);
        
        // Return the export data
        const exportData = {
            exportInfo: {
                exportDate: new Date().toISOString(),
                totalRecords: allUserData.length,
                source: 'Chouha Community Netlify Function'
            },
            users: allUserData
        };
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: `Successfully exported ${allUserData.length} user records`,
                data: exportData
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
    } catch (error) {
        console.error('Export function: Error exporting emails from Netlify Blobs:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: `Export failed: ${error.message}`,
                error: error.message
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
