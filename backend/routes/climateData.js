/**
 * climateData.js  —  GET /api/climate-data?lat=&lon=
 *
 * Phase 4: Future Climate Prediction Engine
 *
 * Pipeline:
 *   1. Fetch daily temperature + precipitation from Open-Meteo archive (1990→present)
 *   2. Aggregate to yearly averages
 *   3. Blend with real-world CO₂ reference values
 *   4. Phase 4: predictFutureClimate()
 *      a. Linear regression for temperature + damped regression for rainfall
 *      b. Exponential CO₂ extrapolation (more realistic than linear past 2024)
 *      c. Residual std-dev → uncertainty bands (lowerBound / upperBound)
 *   5. Return unified response; fall back to seeded demo data on any error
 */

const express = require('express')
const router  = express.Router()

// ─── CO₂ reference anchors (Global Monitoring Laboratory / NOAA) ──────────────
const CO2_ANCHORS = [
  [1990, 354.4], [1995, 360.8], [2000, 369.5], [2005, 379.8],
  [2010, 389.9], [2015, 400.8], [2020, 412.5], [2024, 422.5],
]

/**
 * CO₂ for a given year:
 *  - Interpolation between anchor points for years ≤ 2024
 *  - Exponential extrapolation past 2024 (CO₂ growth is ~0.6%/yr compounding)
 */
function co2ForYear(year) {
  if (year <= CO2_ANCHORS[0][0]) return CO2_ANCHORS[0][1]

  const lastAnchor = CO2_ANCHORS[CO2_ANCHORS.length - 1]

  if (year >= lastAnchor[0]) {
    // Exponential: C(y) = C_last × (1 + r)^(y - y_last)
    // Growth rate r estimated from last two anchors
    const [y1, c1] = CO2_ANCHORS[CO2_ANCHORS.length - 2]
    const [y2, c2] = lastAnchor
    const r = Math.pow(c2 / c1, 1 / (y2 - y1)) - 1   // ~0.6% per year
    return parseFloat((c2 * Math.pow(1 + r, year - y2)).toFixed(2))
  }

  for (let i = 0; i < CO2_ANCHORS.length - 1; i++) {
    const [y1, c1] = CO2_ANCHORS[i], [y2, c2] = CO2_ANCHORS[i + 1]
    if (year >= y1 && year <= y2) {
      const t = (year - y1) / (y2 - y1)
      return parseFloat((c1 + t * (c2 - c1)).toFixed(2))
    }
  }
}

// ─── Linear regression helper ────────────────────────────────────────────────
function linearRegression(xs, ys) {
  const n   = xs.length
  const sx  = xs.reduce((a, b) => a + b, 0)
  const sy  = ys.reduce((a, b) => a + b, 0)
  const sx2 = xs.reduce((a, b) => a + b * b, 0)
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0)
  const slope     = (n * sxy - sx * sy) / (n * sx2 - sx * sx)
  const intercept = (sy - slope * sx) / n
  // Residual std-dev → used for uncertainty bands
  const residuals = ys.map((y, i) => y - (slope * xs[i] + intercept))
  const residStd  = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / n)
  return { slope, intercept, residStd }
}

// ─── Residual damping for rainfall (avoid unrealistic spikes in projection) ───
function dampedRainfallRegression(xs, ys) {
  const reg = linearRegression(xs, ys)
  // Dampen slope by 30% for rainfall — trend is real but variability is noisy
  return { ...reg, slope: reg.slope * 0.70 }
}

// ─── PHASE 4: predictFutureClimate ───────────────────────────────────────────
/**
 * Takes historical arrays (up to present), runs regression, projects to 2050.
 * Returns full arrays (historical + projected) with uncertainty bands on projected portion.
 *
 * Uncertainty calculation:
 *   - Base: residual standard deviation of the regression fit
 *   - Grows with time: σ(y) = residStd × sqrt(y - projStart + 1)
 *   - Minimum: ±0.5% of projected value (always visible bands)
 *
 * @returns { years, temperature, tempLow, tempHigh, rainfall, rainLow, rainHigh, co2,
 *            projectionStartYear }
 */
function predictFutureClimate(hYears, hTemp, hRain, upToYear = 2050) {
  const projStart = hYears[hYears.length - 1] + 1

  const tempReg = linearRegression(hYears, hTemp)
  const rainReg = dampedRainfallRegression(hYears, hRain)

  const allYears  = [...hYears]
  const tempArr   = [...hTemp]
  const tempLow   = [...hTemp]   // historical: lower = upper = value (no band)
  const tempHigh  = [...hTemp]
  const rainArr   = [...hRain]
  const rainLow   = [...hRain]
  const rainHigh  = [...hRain]

  for (let y = projStart; y <= upToYear; y++) {
    const t = y - projStart + 1   // years into future (grows uncertainty)

    // Temperature projection
    const projTemp = tempReg.slope * y + tempReg.intercept
    const tempBand = Math.max(tempReg.residStd * Math.sqrt(t), projTemp * 0.005)
    allYears.push(y)
    tempArr.push(parseFloat(projTemp.toFixed(2)))
    tempLow.push(parseFloat((projTemp - tempBand).toFixed(2)))
    tempHigh.push(parseFloat((projTemp + tempBand).toFixed(2)))

    // Rainfall projection (damped slope)
    const lastHistRain = hRain[hRain.length - 1]
    // Anchor projection at last recorded value to avoid drift discontinuity
    const rainSlope  = rainReg.slope
    const rainIntcpt = lastHistRain - rainSlope * hYears[hYears.length - 1]
    const projRain   = rainSlope * y + rainIntcpt
    const rainBand   = Math.max(rainReg.residStd * Math.sqrt(t), Math.abs(projRain) * 0.05)
    rainArr.push(parseFloat(projRain.toFixed(1)))
    rainLow.push(parseFloat((projRain - rainBand).toFixed(1)))
    rainHigh.push(parseFloat((projRain + rainBand).toFixed(1)))
  }

  // CO₂: pure NOAA-anchored exponential (no uncertainty band — it's a physical measurement)
  const co2Arr = allYears.map(y => co2ForYear(y))

  return {
    years:       allYears,
    temperature: tempArr,
    tempLow,
    tempHigh,
    rainfall:    rainArr,
    rainLow,
    rainHigh,
    co2:         co2Arr,
    projectionStartYear: projStart,
  }
}

// ─── Seeded fallback (used when real API fails) ───────────────────────────────
function generateFallback(lat, lon) {
  const seed = Math.abs(Math.round(lat * 10 + lon * 10)) % 20 + 1
  const hYears = [], hTemp = [], hRain = []
  const TODAY  = new Date().getFullYear()

  for (let y = 1990; y <= TODAY; y++) {
    hYears.push(y)
    hTemp.push(parseFloat((14.5 + seed * 0.3 + (lat > 20 ? 10 : 0) + ((y - 1990) / 60) * 1.8 + Math.sin(y * 0.7 + seed) * 0.4).toFixed(2)))
    hRain.push(parseFloat((800 + seed * 20 - ((y - 1990) / 60) * 60 + Math.cos(y * 0.5 + seed) * 15).toFixed(1)))
  }
  return predictFutureClimate(hYears, hTemp, hRain)
}

// ─── Aggregate daily Open-Meteo data to yearly means ─────────────────────────
function aggregateToYearly(times, tempValues, precipValues) {
  const yearMap = {}
  for (let i = 0; i < times.length; i++) {
    const year = parseInt(times[i].slice(0, 4), 10)
    if (!yearMap[year]) yearMap[year] = { temps: [], precips: [] }
    if (tempValues[i]   != null) yearMap[year].temps.push(tempValues[i])
    if (precipValues[i] != null) yearMap[year].precips.push(precipValues[i])
  }

  const years = [], temperature = [], rainfall = []
  for (const year of Object.keys(yearMap).map(Number).sort()) {
    const d = yearMap[year]
    if (d.temps.length === 0) continue
    years.push(year)
    temperature.push(parseFloat((d.temps.reduce((a, b) => a + b, 0) / d.temps.length).toFixed(2)))
    rainfall.push(parseFloat(d.precips.reduce((a, b) => a + b, 0).toFixed(1)))
  }
  return { years, temperature, rainfall }
}

// ─── Main route: GET /api/climate-data ───────────────────────────────────────
router.get('/', async (req, res) => {
  const lat = parseFloat(req.query.lat)
  const lon = parseFloat(req.query.lon)

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ success: false, message: 'lat and lon are required' })
  }

  try {
    const today  = new Date().toISOString().slice(0, 10)
    const apiUrl =
      `https://archive-api.open-meteo.com/v1/archive?` +
      `latitude=${lat}&longitude=${lon}` +
      `&start_date=1990-01-01&end_date=${today}` +
      `&daily=temperature_2m_mean,precipitation_sum` +
      `&timezone=auto`

    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(12000) })
    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`)

    const raw = await response.json()
    const { time, temperature_2m_mean, precipitation_sum } = raw.daily

    // Step 1: aggregate daily → yearly
    const { years: hYears, temperature: hTemp, rainfall: hRain } =
      aggregateToYearly(time, temperature_2m_mean, precipitation_sum)

    if (hYears.length < 5) throw new Error('Insufficient data from Open-Meteo')

    // Step 2: Phase 4 prediction engine — projects + uncertainty bands
    const predicted = predictFutureClimate(hYears, hTemp, hRain)

    return res.json({
      success:             true,
      dataSource:          'open-meteo-archive',
      projectionStartYear: predicted.projectionStartYear,
      units:               { temperature: '°C', rainfall: 'mm/year', co2: 'ppm' },
      data: {
        years:       predicted.years,
        temperature: predicted.temperature,
        tempLow:     predicted.tempLow,
        tempHigh:    predicted.tempHigh,
        rainfall:    predicted.rainfall,
        rainLow:     predicted.rainLow,
        rainHigh:    predicted.rainHigh,
        co2:         predicted.co2,
      },
    })

  } catch (err) {
    console.warn('[climate-data] API fetch failed, using fallback:', err.message)
    const fb = generateFallback(lat, lon)
    return res.json({
      success:             true,
      dataSource:          'estimated',
      projectionStartYear: fb.projectionStartYear,
      units:               { temperature: '°C', rainfall: 'mm/year', co2: 'ppm' },
      data: {
        years:       fb.years,
        temperature: fb.temperature,
        tempLow:     fb.tempLow,
        tempHigh:    fb.tempHigh,
        rainfall:    fb.rainfall,
        rainLow:     fb.rainLow,
        rainHigh:    fb.rainHigh,
        co2:         fb.co2,
      },
    })
  }
})

module.exports = router
