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

app.get('/api/mastodon', async (req, res) => {
  console.log('🐘 [SERVER] Mastodon request received');
  try {
    const targetUrl = 'https://mastodon.social/api/v1/trends?limit=5';
    const response = await axios.get(targetUrl);
    res.json(response.data);
  } catch (error) {
    console.error('🐘 [SERVER] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Mastodon trends' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ [SERVER] Running on http://localhost:${PORT}`);
  console.log(`   📰 Test News: http://localhost:${PORT}/api/news`);
  console.log(`   ⚡ Test Energy: http://localhost:${PORT}/api/energy`);
  console.log(`   🐘 Test Mastodon: http://localhost:${PORT}/api/mastodon`);
});