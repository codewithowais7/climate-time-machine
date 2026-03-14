/**
 * LocationSearch.jsx
 * Dynamic city search using the /api/location/geocode endpoint (Open-Meteo proxy).
 * Supports: live autocomplete, quick-pick chips, not-found messaging, and error states.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { normalizeCityName } from '../utils/normalizeCityName'

// ─── Quick-pick shortcuts (always shown) ────────────────────────────────────────
const QUICK_PICKS = [
  { name: 'Varanasi',  country: 'Uttar Pradesh, India', lat: 25.3176, lon: 82.9739,  seed: 8  },
  { name: 'Delhi',     country: 'Delhi, India',         lat: 28.6139, lon: 77.2090,  seed: 5  },
  { name: 'Mumbai',    country: 'Maharashtra, India',   lat: 19.0760, lon: 72.8777,  seed: 7  },
  { name: 'Bengaluru', country: 'Karnataka, India',     lat: 12.9716, lon: 77.5946,  seed: 4  },
  { name: 'Chennai',   country: 'Tamil Nadu, India',    lat: 13.0827, lon: 80.2707,  seed: 6  },
  { name: 'Kolkata',   country: 'West Bengal, India',   lat: 22.5726, lon: 88.3639,  seed: 3  },
]

// ─── Geocoding API call (via backend proxy) ─────────────────────────────────────
async function fetchCityCoordinates(cityName) {
  const res = await fetch(
    `/api/location/geocode?city=${encodeURIComponent(cityName)}`
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Geocoding service error')
  }
  const data = await res.json()
  // Clean display names without touching coordinates
  return (data.results ?? []).map((loc) => ({
    ...loc,
    name: normalizeCityName(loc.name),
  }))
}

// ─── Status states ───────────────────────────────────────────────────────────────
const STATUS = { IDLE: 'idle', LOADING: 'loading', NOT_FOUND: 'not_found', ERROR: 'error' }

export default function LocationSearch({ onLocationChange }) {
  const [query, setQuery]               = useState('')
  const [suggestions, setSuggestions]   = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [status, setStatus]             = useState(STATUS.IDLE)
  const [activeChip, setActiveChip]     = useState(null)
  const inputRef     = useRef(null)
  const abortRef     = useRef(null)
  const skipSearchRef = useRef(false)  // true when query is set programmatically

  // ── Debounced live autocomplete while typing ───────────────────────────────────
  useEffect(() => {
    // Skip API call when query was set programmatically (quick-pick / dropdown select)
    if (skipSearchRef.current) {
      skipSearchRef.current = false
      return
    }

    const q = query.trim()
    if (q.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      setStatus(STATUS.IDLE)
      return
    }

    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current()
    let cancelled = false
    abortRef.current = () => { cancelled = true }

    setStatus(STATUS.LOADING)

    const timer = setTimeout(async () => {
      try {
        const results = await fetchCityCoordinates(q)
        if (cancelled) return
        setSuggestions(results)
        setShowDropdown(results.length > 0)
        setStatus(results.length === 0 ? STATUS.NOT_FOUND : STATUS.IDLE)
      } catch {
        if (cancelled) return
        setStatus(STATUS.ERROR)
        setSuggestions([])
        setShowDropdown(false)
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  // ── Select a city from suggestions or quick-picks ─────────────────────────────
  const handleSelect = useCallback((location) => {
    skipSearchRef.current = true   // don't geocode the selected name
    setQuery(location.name)
    setShowDropdown(false)
    setSuggestions([])
    setStatus(STATUS.IDLE)
    setActiveChip(location.name)
    onLocationChange(location)
  }, [onLocationChange])

  // ── "Explore" button: search or pick first suggestion ─────────────────────────
  const handleExplore = async () => {
    const q = query.trim()
    if (!q) return

    // Already have suggestions → pick the first
    if (suggestions.length > 0) {
      handleSelect(suggestions[0])
      return
    }

    setStatus(STATUS.LOADING)
    try {
      const results = await fetchCityCoordinates(q)
      if (results.length === 0) {
        setStatus(STATUS.NOT_FOUND)
      } else {
        handleSelect(results[0])
      }
    } catch {
      setStatus(STATUS.ERROR)
    }
  }

  // ── Quick-pick chip click ──────────────────────────────────────────────────────
  const handleQuickPick = (loc) => {
    skipSearchRef.current = true   // don't geocode the chip name
    setQuery(loc.name)
    setShowDropdown(false)
    setSuggestions([])
    setStatus(STATUS.IDLE)
    setActiveChip(loc.name)
    onLocationChange(loc)
  }

  const isLoading = status === STATUS.LOADING

  return (
    <div className="card animate-fade-in">
      {/* Row: label + hint */}
      <div className="flex items-center justify-between mb-3">
        <p className="section-title mb-0">📍 Select a City</p>
        <span className="text-xs text-gray-600">Search any city worldwide</span>
      </div>

      {/* Search input row */}
      <div className="relative flex gap-3">
        <div className="relative flex-1">
          {/* Search icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          <input
            ref={inputRef}
            type="text"
            className="input-field pl-11 pr-10"
            placeholder="Type any city, e.g. Kanpur, Patna, Jaipur..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveChip(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handleExplore()}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 160)}
          />

          {/* Spinner / clear button */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoading && (
              <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            )}
            {query && !isLoading && (
              <button
                onClick={() => { setQuery(''); setSuggestions([]); setStatus(STATUS.IDLE); setActiveChip(null) }}
                className="text-gray-600 hover:text-gray-300 transition-colors"
                title="Clear"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Explore button */}
        <button
          className="btn-primary whitespace-nowrap"
          onClick={handleExplore}
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-[#0a0f1e] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          )}
          Explore
        </button>
      </div>

      {/* Status messages */}
      {status === STATUS.NOT_FOUND && (
        <div className="mt-2 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 animate-fade-in">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          City not found. Please try another location, e.g. <strong className="ml-1">Lucknow, Patna, Jaipur</strong>.
        </div>
      )}
      {status === STATUS.ERROR && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 animate-fade-in">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          Search unavailable. Check your connection and try again.
        </div>
      )}

      {/* Quick-pick chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="text-xs text-gray-600 self-center mr-1">Quick pick:</span>
        {QUICK_PICKS.map((loc) => (
          <button
            key={loc.name}
            onClick={() => handleQuickPick(loc)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 font-medium ${
              activeChip === loc.name
                ? 'bg-cyan-500 border-cyan-500 text-[#0a0f1e] font-bold shadow-glow'
                : 'border-white/10 bg-white/5 text-gray-300 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-400'
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Live autocomplete dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          className="absolute z-50 mt-2 w-full bg-[#1a2235] border border-white/10 rounded-xl shadow-card overflow-hidden animate-fade-in"
          style={{ top: '100%', left: 0, right: 0 }}
        >
          {suggestions.map((loc, i) => (
            <button
              key={`${loc.name}-${i}`}
              className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
              onMouseDown={() => handleSelect(loc)}
            >
              {/* India flag for Indian cities, globe for others */}
              <span className="text-base shrink-0">
                {loc.country?.includes('India') ? '🇮🇳' : '🌍'}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-100 font-medium">{loc.name}</span>
                <span className="text-gray-500 text-xs ml-2 truncate">{loc.country}</span>
              </div>
              <span className="text-xs text-gray-600 font-mono shrink-0">
                {loc.lat.toFixed(2)}°N
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
