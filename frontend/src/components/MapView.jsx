/**
 * MapView.jsx
 * Interactive world map using react-leaflet.
 * Shows a marker at the selected location with a popup.
 * Dark-styled tiles via CSS filter in index.css.
 */

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet default icon issue with Vite bundler
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom cyan marker icon
const cyberIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Derive a 2-letter country code badge from a country string like "Rajasthan, India"
const COUNTRY_MAP = {
  india: 'IN', japan: 'JP', china: 'CN', 'united states': 'US', usa: 'US',
  'united kingdom': 'UK', uk: 'UK', germany: 'DE', france: 'FR', brazil: 'BR',
  australia: 'AU', canada: 'CA', russia: 'RU', pakistan: 'PK', bangladesh: 'BD',
  nepal: 'NP', 'sri lanka': 'LK', indonesia: 'ID', thailand: 'TH', vietnam: 'VN',
  philippines: 'PH', malaysia: 'MY', singapore: 'SG', turkey: 'TR', egypt: 'EG',
  nigeria: 'NG', kenya: 'KE', 'south africa': 'ZA', mexico: 'MX', argentina: 'AR',
  italy: 'IT', spain: 'ES', portugal: 'PT', netherlands: 'NL', sweden: 'SE',
  norway: 'NO', denmark: 'DK', poland: 'PL', ukraine: 'UA', iran: 'IR', iraq: 'IQ',
  'saudi arabia': 'SA', 'united arab emirates': 'AE', israel: 'IL', greece: 'GR',
}
function getCountryCode(countryStr = '') {
  const lower = countryStr.toLowerCase()
  for (const [name, code] of Object.entries(COUNTRY_MAP)) {
    if (lower.includes(name)) return code
  }
  // Fallback: last word, first 2 chars uppercase
  const parts = countryStr.trim().split(/[\s,]+/)
  const last = parts[parts.length - 1]
  return last ? last.slice(0, 2).toUpperCase() : '??'
}


// Inner component that flies to location when it changes
function MapFlyTo({ location }) {
  const map = useMap()
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lon], 6, { duration: 1.5 })
    }
  }, [location, map])
  return null
}

export default function MapView({ selectedLocation }) {
  return (
    <div className="card p-0 overflow-hidden animate-fade-in flex flex-col">

      {/* ── Location identity header — always above the map ─────────────── */}
      <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0d1526]">
        <div className="flex items-center gap-3 min-w-0">
          <p className="section-title mb-0 shrink-0">🗺️ Geographic View</p>
          {selectedLocation && (
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Dynamic country badge — derived from location.country string */}
              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-1.5 py-0.5 shrink-0">
                {getCountryCode(selectedLocation.country)}
              </span>
              <span className="text-sm font-semibold text-gray-100 truncate">{selectedLocation.name}</span>
              <span className="text-xs text-gray-500 truncate hidden sm:inline">{selectedLocation.country}</span>
            </div>
          )}

        </div>
        {selectedLocation && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono shrink-0 ml-2">
            <svg className="w-3 h-3 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {selectedLocation.lat.toFixed(2)}°N, {selectedLocation.lon.toFixed(2)}°E
          </div>
        )}
      </div>

      {/* ── Map — sits strictly below the header, z-0 ───────────────────── */}
      <div className="relative z-0" style={{ height: '360px' }}>
        <MapContainer
          center={[20, 78]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {selectedLocation && (
            <>
              <Marker position={[selectedLocation.lat, selectedLocation.lon]} icon={cyberIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">{selectedLocation.name}</p>
                    <p className="text-sm opacity-70">{selectedLocation.country}</p>
                  </div>
                </Popup>
              </Marker>
              <MapFlyTo location={selectedLocation} />
            </>
          )}
        </MapContainer>

        {/* Placeholder overlay when no location selected */}
        {!selectedLocation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[400]">
            <div className="bg-[#080d1a]/80 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-4 text-center">
              <svg className="w-8 h-8 text-cyan-400 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-gray-400 text-sm">Search for a location to explore</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
