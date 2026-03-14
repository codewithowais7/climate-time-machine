/**
 * /api/location route
 * Provides city geocoding by proxying to the Open-Meteo Geocoding API.
 * No API key required. Falls back gracefully on network errors.
 */

const express = require('express');
const router = express.Router();

// ─── Deterministic seed from city name (for consistent chart data) ─────────────
function cityToSeed(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return (Math.abs(hash) % 10) + 1; // 1–10
}

// ─── GET /api/location — quick-pick list (kept for offline fallback) ───────────
router.get('/', (req, res) => {
  const INDIA_CITIES = [
    { name: 'Varanasi',  country: 'Uttar Pradesh, India', lat: 25.3176, lon: 82.9739  },
    { name: 'Delhi',     country: 'Delhi, India',         lat: 28.6139, lon: 77.2090  },
    { name: 'Mumbai',    country: 'Maharashtra, India',   lat: 19.0760, lon: 72.8777  },
    { name: 'Bengaluru', country: 'Karnataka, India',     lat: 12.9716, lon: 77.5946  },
    { name: 'Chennai',   country: 'Tamil Nadu, India',    lat: 13.0827, lon: 80.2707  },
    { name: 'Kolkata',   country: 'West Bengal, India',   lat: 22.5726, lon: 88.3639  },
  ].map((c) => ({ ...c, seed: cityToSeed(c.name) }));

  res.json({ success: true, results: INDIA_CITIES });
});

// ─── GET /api/location/geocode?city=Kanpur ─────────────────────────────────────
// Proxies to Open-Meteo Geocoding API and normalises the response.
router.get('/geocode', async (req, res) => {
  const { city } = req.query;

  if (!city || city.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Provide a city name with at least 2 characters.' });
  }

  try {
    const params = new URLSearchParams({
      name:     city.trim(),
      count:    '6',
      language: 'en',
      format:   'json',
    });

    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.json({ success: true, results: [] });
    }

    // Normalise geocoding results to the app's location schema
    const results = data.results.map((r) => ({
      name:    r.name,
      country: [r.admin1, r.country].filter(Boolean).join(', '),
      lat:     r.latitude,
      lon:     r.longitude,
      seed:    cityToSeed(r.name),
      population: r.population ?? null,
      timezone:   r.timezone   ?? null,
    }));

    res.json({ success: true, results });
  } catch (err) {
    console.error('[/api/location/geocode] Error:', err.message);
    res.status(502).json({
      success: false,
      message: 'Could not reach the geocoding service. Please try again.',
    });
  }
});

module.exports = router;
