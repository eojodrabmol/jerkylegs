const express = require('express');
const axios = require('axios');
const app = express();

const port = process.env.PORT || 3000;
app.use(express.json());

const config = {
    clientId: '37a5b08c-98bb-443a-bb9e-07a23e77d41f',
    clientSecret: 'BfKLMfgn9EGLyyg9arHQ76ty',
    tokenUrl: 'https://authentication.logmeininc.com/oauth/token'
};

// Simple webhook endpoint - just get token and return it
app.post('/webhook', async (req, res) => {
    console.log('Webhook called, attempting to get token...');
    
    try {
        // Encode credentials in Base64
        const credentials = `${config.clientId}:${config.clientSecret}`;
        const encodedCredentials = Buffer.from(credentials).toString('base64');
        
        console.log('Making OAuth request...');
        
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('scope', 'messaging.v1.send');

        const response = await axios.post(config.tokenUrl, params, {
            headers: {
                'Authorization': `Basic ${encodedCredentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        });

        const token = response.data.access_token;
        console.log('Token obtained successfully!');
        console.log('Token starts with:', token.substring(0, 30) + '...');
        
        res.json({
            success: true,
            message: 'Token obtained successfully',
            token: token,
            expires_in: response.data.expires_in,
            scope: response.data.scope
        });
        
    } catch (error) {
        console.error('Error getting token:', error.response?.data || error.message);
        
        res.status(500).json({
            success: false,
            error: error.response?.data || error.message
        });
    }
});

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'running',
        webhook: `https://${req.get('host')}/webhook`,
        message: 'POST to /webhook to test OAuth token'
    });
});

app.listen(port, () => {
    console.log(`Token test server running on port ${port}`);
    console.log('POST to /webhook to test OAuth token retrieval');
});
