// modules/webrtc/server.js - Standalone WebRTC server
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.WEBRTC_PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the webrtc directory
app.use(express.static(__dirname));
app.use('/modules/webrtc', express.static(__dirname));

// Infobip Configuration
const INFOBIP_CONFIG = {
    baseUrl: 'https://6znmkr.api.infobip.com',  // Make sure https:// is included
    apiKey: '70929deeb2e26455844c61611b0047bd-cd988d1d-b19d-4c4e-8bd1-8f9895b54f66',
    applicationId: 'HANDIHOMEPAGE_APP',
    entityId: 'HANDIHOMEPAGE'
};

// In-memory contact storage
const userContacts = new Map();

userContacts.set('alice', [
    { id: 1, name: 'Bob Smith', webrtcId: 'bob', phoneNumber: '+1987654321' },
    { id: 2, name: 'Carol Davis', webrtcId: 'carol', phoneNumber: '+1122334455' }
]);

userContacts.set('bob', [
    { id: 1, name: 'Alice Johnson', webrtcId: 'alice', phoneNumber: '+1234567890' },
    { id: 2, name: 'Carol Davis', webrtcId: 'carol', phoneNumber: '+1122334455' }
]);

userContacts.set('carol', [
    { id: 1, name: 'Alice Johnson', webrtcId: 'alice', phoneNumber: '+1234567890' },
    { id: 2, name: 'Bob Smith', webrtcId: 'bob', phoneNumber: '+1987654321' }
]);

// API route to get token - NO MOCK FALLBACK
app.post('/api/webrtc/token', async (req, res) => {
    try {
        const { userId, displayName } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        console.log(`[Infobip] Generating token for: ${userId}`);

        const response = await fetch(`${INFOBIP_CONFIG.baseUrl}/webrtc/1/token`, {
            method: 'POST',
            headers: {
                'Authorization': `App ${INFOBIP_CONFIG.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                identity: userId,
                displayName: displayName || userId,
                applicationId: INFOBIP_CONFIG.applicationId,
                entityId: INFOBIP_CONFIG.entityId
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Infobip] Error ${response.status}:`, errorText);
            return res.status(response.status).json({ 
                error: `Infobip API error: ${response.status}`,
                details: errorText
            });
        }

        const data = await response.json();
        console.log(`[Infobip] Token generated for ${userId}, expires: ${data.expirationTime}`);
        
        res.json({ 
            success: true, 
            token: data.token,
            identity: userId,
            displayName: displayName || userId,
            expiresAt: data.expirationTime
        });
    } catch (error) {
        console.error('[Infobip] Token generation failed:', error.message);
        res.status(500).json({ error: `Failed to generate token: ${error.message}` });
    }
});

// Validate caller
app.post('/api/webrtc/validate-caller', async (req, res) => {
    try {
        const { userId, callerIdentity } = req.body;
        const contacts = userContacts.get(userId) || [];
        const isAllowed = contacts.some(contact => 
            contact.webrtcId === callerIdentity || 
            contact.phoneNumber === callerIdentity
        );
        
        res.json({ 
            allowed: isAllowed,
            message: isAllowed ? 'Caller verified' : 'Caller not in contacts'
        });
    } catch (error) {
        res.json({ allowed: false, error: 'Validation failed' });
    }
});

// Get contacts
app.get('/api/webrtc/contacts/:userId', async (req, res) => {
    const { userId } = req.params;
    const contacts = userContacts.get(userId) || [];
    res.json({ success: true, contacts });
});

// Add contact
app.post('/api/webrtc/contacts', async (req, res) => {
    const { userId, name, webrtcId, phoneNumber } = req.body;
    
    if (!userContacts.has(userId)) {
        userContacts.set(userId, []);
    }
    
    const contacts = userContacts.get(userId);
    const newContact = {
        id: Date.now(),
        name,
        webrtcId: webrtcId || '',
        phoneNumber: phoneNumber || ''
    };
    contacts.push(newContact);
    userContacts.set(userId, contacts);
    
    res.json({ success: true, contact: newContact });
});

// Delete contact
app.delete('/api/webrtc/contacts/:userId/:contactId', async (req, res) => {
    const { userId, contactId } = req.params;
    const contacts = userContacts.get(userId) || [];
    const filtered = contacts.filter(c => c.id !== parseInt(contactId));
    userContacts.set(userId, filtered);
    res.json({ success: true });
});

// Serve index.html
app.get(['/', '/modules/webrtc', '/modules/webrtc/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/api/webrtc/health', (req, res) => {
    res.json({ 
        status: 'ok',
        infobipConfigured: true,
        baseUrl: INFOBIP_CONFIG.baseUrl
    });
});

app.listen(PORT, () => {
    console.log(`\n✅ WebRTC Server Running!`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}/api/webrtc/health`);
    console.log(`\n🔑 Using REAL Infobip credentials\n`);
});

module.exports = app;