// server.js (backend proxy)
const express = require('express');
const axios = require('axios');
const app = express();

const API_KEY = '2410ec27541243aa967e1edc53275c95';
const GTFS_REALTIME_URL = 'https://api.nationaltransport.ie/gtfsr/v2/gtfsr?format=json';

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/api/bus-realtime', async (req, res) => {
  try {
    const response = await axios.get(GTFS_REALTIME_URL, {
      headers: { 'Ocp-Apim-Subscription-Key': API_KEY }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3002, () => {
  console.log('Bus proxy server running on port 3002');
});