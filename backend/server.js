/**
 * Climate Time Machine — Express Backend
 * Serves mock climate and location data for Phase 1.
 * Designed for easy extension with real APIs in future phases.
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const climateRoutes     = require('./routes/climate');
const climateDataRoutes = require('./routes/climateData');
const locationRoutes    = require('./routes/location');
const aiSearchRoutes    = require('./routes/aiSearch');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/climate',      climateRoutes);
app.use('/api/climate-data', climateDataRoutes);
app.use('/api/location',     locationRoutes);
app.use('/api/ai-search',    aiSearchRoutes);      // Phase 7: Gemini NL search

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: '🌍 Climate Time Machine API is running',
    version: '1.0.0',
    endpoints: ['/api/climate', '/api/location'],
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌍 Climate Time Machine API`);
  console.log(`✅ Server running on http://localhost:${PORT}\n`);
});
