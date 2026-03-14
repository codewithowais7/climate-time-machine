/**
 * normalizeCityName.js
 * Cleans geocoding API city names before displaying them in the UI.
 * Handles two cases:
 *   1. Historical/alternate names  →  mapped to modern official names
 *   2. Noisy suffixes              →  stripped from the end of the name
 *
 * Important: this function only affects the *display* name.
 * Coordinates (lat/lon) are never touched.
 */

// ─── Historical / alternate name corrections ────────────────────────────────────
const HISTORICAL_NAMES = {
  // Indian cities — colonial-era → modern official names
  'Calcutta':       'Kolkata',
  'Bombay':         'Mumbai',
  'Bangalore':      'Bengaluru',
  'Madras':         'Chennai',
  'Benares':        'Varanasi',
  'Poona':          'Pune',
  'Baroda':         'Vadodara',
  'Trivandrum':     'Thiruvananthapuram',
  'Simla':          'Shimla',
  'Quilon':         'Kollam',
  'Calicut':        'Kozhikode',
  'Cochin':         'Kochi',
  'Ooty':           'Udhagamandalam',
}

// ─── Noise suffixes to strip from the end of a city name ───────────────────────
// Applied in order — longest/most-specific first
const NOISE_PATTERNS = [
  /\s+international\s+airport$/i,
  /\s+domestic\s+airport$/i,
  /\s+airport$/i,
  /\s+metropolitan\s+area$/i,
  /\s+urban\s+agglomeration$/i,
  /\s+cantonment$/i,
  /\s+township$/i,
  /\s+district$/i,
  /\s+division$/i,
  /\s+region$/i,
  /\s+tehsil$/i,
  /\s+taluk$/i,
  /\s+nagar\s+panchayat$/i,
]

/**
 * normalizeCityName(name)
 * @param {string} name  - Raw city name from the geocoding API
 * @returns {string}     - Clean, display-ready city name
 */
export function normalizeCityName(name) {
  if (!name || typeof name !== 'string') return name

  const trimmed = name.trim()

  // 1. Exact match in historical name map
  if (HISTORICAL_NAMES[trimmed]) return HISTORICAL_NAMES[trimmed]

  // 2. Strip trailing noise suffixes
  let cleaned = trimmed
  for (const pattern of NOISE_PATTERNS) {
    const next = cleaned.replace(pattern, '').trim()
    if (next.length > 0) cleaned = next
  }

  return cleaned
}
