/**
 * /api/climate route
 * Returns mock historical + predicted climate data.
 * In future phases: integrate with Open-Meteo, NASA POWER, or NOAA APIs.
 */

const express = require('express');
const router = express.Router();

// ─── Mock Data Generator ───────────────────────────────────────────────────────
// Generates climate data arrays from 1990–2050 for a given "location seed"
const generateMockClimateData = (locationSeed = 1) => {
  const years = [];
  const temperature = [];
  const rainfall = [];
  const co2 = [];

  for (let year = 1990; year <= 2050; year++) {
    years.push(year);

    // Temperature: slight upward trend with variation (~1.5°C rise by 2050)
    const baseTempC = 14.5 + locationSeed * 0.3;
    const tempTrend = ((year - 1990) / 60) * 1.8;
    const tempNoise = Math.sin(year * 0.7 + locationSeed) * 0.4;
    temperature.push(parseFloat((baseTempC + tempTrend + tempNoise).toFixed(2)));

    // Rainfall: slight downward trend (mm/year)
    const baseRainfall = 800 + locationSeed * 20;
    const rainfallTrend = -((year - 1990) / 60) * 60;
    const rainfallNoise = Math.cos(year * 0.5 + locationSeed) * 15;
    rainfall.push(
      parseFloat((baseRainfall + rainfallTrend + rainfallNoise).toFixed(1))
    );

    // CO₂: real-world trajectory (ppm) — 354 ppm in 1990 → ~550 ppm by 2050
    const co2Value = 354 + ((year - 1990) / 60) * 196 + Math.random() * 0.3;
    co2.push(parseFloat(co2Value.toFixed(2)));
  }

  return { years, temperature, rainfall, co2 };
};

// ─── GET /api/climate ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { location = 'World', seed = 1 } = req.query;
  const data = generateMockClimateData(parseFloat(seed));

  res.json({
    success: true,
    location,
    unit: {
      temperature: '°C',
      rainfall: 'mm/year',
      co2: 'ppm',
    },
    data,
  });
});

module.exports = router;
