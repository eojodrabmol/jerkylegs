// EXPOSES THE ENVIRONMENT VARIABLES IN THE LOG FILE FOR TESTING
const express = require('express');
const axios = require('axios');
const app = express();

// Use Render's PORT or default to 3000 for local testing
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

const config = {
    clientId: process.env.GOTO_CLIENT_ID,
    clientSecret: process.env.GOTO_CLIENT_SECRET,
    gotoPhoneNumber: process.env.GOTO_PHONE_NUMBER,
    myPhoneNumber: process.env.MY_PHONE_NUMBER,
    tokenUrl: 'https://authentication.logmeininc.com/oauth/token',
    smsApiUrl: 'https://api.goto.com/messaging/v1/messages'
};

// Store the access token and expiry
let accessToken = null;
let tokenExpiry = null;

// Function to get or refresh the access token
async function getAccessToken() {
    if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
        return accessToken;
    }

    try {
        console.log('Requesting new access token...');
        
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', config.clientId);
        params.append('client_secret', config.clientSecret);
        params.append('scope', 'messaging.v1.send');

        const response = await axios.post(config.tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 3600;
        tokenExpiry = new Date(Date.now() + ((expiresIn - 300) * 1000));
        
        console.log('Access token obtained successfully');
        return accessToken;
    } catch (error) {
        console.error('Error obtaining access token:', error.response?.data || error.message);
        throw error;
    }
}

// Function to send SMS
async function sendSMS(message, phoneNumber) {
    try {
        const token = await getAccessToken();
        
        console.log('Sending SMS...');
        console.log('- From:', config.gotoPhoneNumber);
        console.log('- To:', phoneNumber);
        console.log('- Message:', message);
        
        const options = {
            method: 'POST',
            url: config.smsApiUrl,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: {
                ownerPhoneNumber: config.gotoPhoneNumber,
                contactPhoneNumbers: [phoneNumber],
                body: message
            }
        };

        const response = await axios.request(options);
        console.log('SMS sent successfully');
        return response.data;
    } catch (error) {
        console.error('Error sending SMS:', error.response?.data || error.message);
        throw error;
    }
}

// Simple webhook endpoint
app.post('/webhook', async (req, res) => {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    
    try {
        // Extract caller info from the webhook payload
        const callerNumber = req.body.callerNumber || req.body.caller || req.body.from || 'Unknown';
        const extension = req.body.extension || req.body.extensionNumber || req.body.to || 'N/A';
        
        // Create message
        const message = `Call Alert\nFrom: ${callerNumber}\nTo: ${extension}\nTime: ${new Date().toLocaleString()}`;
        
        // Send SMS
        await sendSMS(message, config.myPhoneNumber);
        
        res.status(200).json({
            success: true,
            message: 'SMS sent successfully'
        });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'running',
        webhook: `https://${req.get('host')}/webhook`,
        timestamp: new Date().toISOString()
    });
});

// Start the server
app.listen(port, () => {
    console.log('========================================');
    console.log('Minimal SMS Webhook Server');
    console.log('========================================');
    console.log(`Server running on port ${port}`);
    console.log('Webhook endpoint: /webhook');
    console.log('');
    console.log('Environment Variables:');
    console.log('- GOTO_CLIENT_ID:', config.clientId);
    console.log('- GOTO_CLIENT_SECRET:', config.clientSecret);
    console.log('- GOTO_PHONE_NUMBER:', config.gotoPhoneNumber);
    console.log('- MY_PHONE_NUMBER:', config.myPhoneNumber);
    console.log('========================================');
});
