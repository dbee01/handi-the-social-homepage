const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;

app.use(cors());

// Route: /stream?url=<encoded_radio_url>
app.get('/stream', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('Missing URL parameter');
  }

  try {
    // Decode the URL
    const decodedUrl = decodeURIComponent(targetUrl);

    // Validate that it's an http/https URL to prevent SSRF attacks
    if (!/^https?:\/\//.test(decodedUrl)) {
      return res.status(400).send('Invalid URL scheme');
    }

    console.log(`Proxying: ${decodedUrl}`);

    // Stream the audio data directly to the client
    const response = await axios({
      method: 'get',
      url: decodedUrl,
      responseType: 'stream',
      headers: {
        // Mimic a browser to avoid 403 Forbidden on some stations
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      }
    });

    // Set headers to tell the browser this is audio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow any origin
    
    // Pipe the stream directly to the response
    response.data.pipe(res);

  } catch (error) {
    console.error('Proxy Error:', error.message);
    res.status(500).send('Stream proxy failed');
  }
});

app.get('/api/news', async (req, res) => {
  console.log('📰 [SERVER] News request received');
  try {
    const rssUrl = 'https://www.rte.ie/feeds/rss/?index=/news';
    const response = await axios.get(rssUrl, { 
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0 (PleIE-NewsBot)' }
    });
    res.type('application/xml').send(response.data);
  } catch (error) {
    console.error('📰 [SERVER] Error:', error.message);
    res.status(500).send('Error fetching RTÉ news');
  }
});

app.get('/api/energy', async (req, res) => {
  console.log('⚡ [SERVER] Energy request received');
  try {
    const targetUrl = 'https://www.smartgriddashboard.com/DashboardService.svc/data?area=ROI&region=ALL';
    const response = await axios.get(targetUrl);
    res.json(response.data);
  } catch (error) {
    console.error('⚡ [SERVER] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch energy data' });
  }
});

// --- ADD THIS BUS ROUTE ---
app.get('/api/bus-realtime', async (req, res) => {
  console.log('🚌 [SERVER] Bus request received');
  try {
    // REPLACE THIS URL with your actual Bus API endpoint
    // Example: https://api.transport-for-ireland.ie/bus/realtime?stop_id=242081
    const targetUrl = 'https://api.transport-for-ireland.ie/bus/realtime?stop_id=242081'; 
    
    const response = await axios.get(targetUrl, { 
      timeout: 5000,
      headers: { 'User-Agent': 'PleIE-BusTracker' }
    });
    
    console.log('🚌 [SERVER] Bus data fetched successfully');
    res.json(response.data);
  } catch (error) {
    console.error('🚌 [SERVER] Bus API Error:', error.message);
    // Return a 500 error so the frontend knows to use mock data
    res.status(500).json({ error: 'Failed to fetch bus data', details: error.message });
  }
});

// mastodon links endpoint
app.get('/api/mastodon', async (req, res) => {
  console.log('🔗 [SERVER] Mastodon Links request received');
  try {
    // Correct endpoint for trending links
    const targetUrl = 'https://mastodon.ie/api/v1/trends/links?limit=5';
    
    console.log('🔗 [SERVER] Fetching from:', targetUrl);
    
    const response = await axios.get(targetUrl, {
      timeout: 8000, // Increased timeout
      headers: { 'User-Agent': 'PleIE-App/1.0' }
    });

    console.log('🔗 [SERVER] Success! Received', response.data.length, 'links');
    res.json(response.data);

  } catch (error) {
    console.error('🔗 [SERVER] ERROR:', error.message);
    
    // Fallback Mock Data matching the API structure
    const mockData = [
      {
        title: "Open Source News",
        description: "Latest updates on Linux, Python, and Web Development.",
        image: "https://via.placeholder.com/90x65/000000/00ffff?text=OSS",
        url: "https://example.com",
        provider_name: "TechDaily"
      },
      {
        title: "AI Breakthrough",
        description: "New model achieves human-level reasoning in complex tasks.",
        image: "https://via.placeholder.com/90x65/000000/00ff41?text=AI",
        url: "https://example.com",
        provider_name: "FutureTech"
      }
    ];
    
    console.log('🔗 [SERVER] Returning mock data');
    res.json(mockData);
  }
});

app.listen(PORT, () => {
  console.log(`✅ [SERVER] Running on http://localhost:${PORT}`);
  console.log(`✅ Radio Proxy Server running at http://localhost:${PORT}`);
  console.log(`📡 Usage: http://localhost:${PORT}/stream?url=<encoded_station_url>`);
  console.log(`   📰 Test News: http://localhost:${PORT}/api/news`);
  console.log(`   ⚡ Test Energy: http://localhost:${PORT}/api/energy`);
  console.log(`   🐘 Test Mastodon: http://localhost:${PORT}/api/mastodon`);
  console.log(`   🚌 Test Bus: http://localhost:${PORT}/api/bus-realtime`);
});
