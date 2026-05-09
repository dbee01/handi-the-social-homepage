const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;

app.use(cors());

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
  console.log(`   📰 Test News: http://localhost:${PORT}/api/news`);
  console.log(`   ⚡ Test Energy: http://localhost:${PORT}/api/energy`);
  console.log(`   🐘 Test Mastodon: http://localhost:${PORT}/api/mastodon`);
});