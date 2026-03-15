/**
 * Dashboard.jsx — Phase 5: AI Climate Impact Story with Voice Narration
 *
 * ClimateImpactStory now receives real climateData and trendLabel
 * so it can generate data-driven stories with voice narration embedded.
 * ClimateVoicePlayer removed — voice is now inside ClimateImpactStory.
 */

import Header              from '../components/Header'
import LocationSearch      from '../components/LocationSearch'
import MapView             from '../components/MapView'
import ClimateCharts       from '../components/ClimateCharts'
import TimeTravelSlider    from '../components/TimeTravelSlider'
import AIInsightsCard      from '../components/AIInsightsCard'
import AISearchBox         from '../components/AISearchBox'
import ClimateImpactStory  from '../components/ClimateImpactStory'
import ClimateRiskScore    from '../components/ClimateRiskScore'
import useClimateData      from '../hooks/useClimateData'

export default function Dashboard({
  selectedLocation,
  onLocationChange,
  currentYear,
  onYearChange,
}) {
  // ── Central data fetch (once per location) ─────────────────────────────────
  const {
    allData,
    dataSource,
    projectionStartYear,
    loading,
    trendLabel,
  } = useClimateData(selectedLocation)

  // ── Geocoding bridge for AISearchBox ───────────────────────────────────────
  // Gemini returns a plain city name string; we resolve it to a full location
  // object via the existing geocoding proxy, then pass it to onLocationChange.
  async function handleAILocation(cityName) {
    if (!cityName) return
    try {
      const res  = await fetch(`/api/location/geocode?city=${encodeURIComponent(cityName)}`)
      const data = await res.json()
      const loc  = data.results?.[0]
      if (loc) onLocationChange(loc)
    } catch (err) {
      console.error('[Dashboard] AI location geocoding failed:', err)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Header />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">

        {/* ── 0: AI Natural Language Search ───────────────────────── */}
        <AISearchBox
          onLocationChange={handleAILocation}
          onYearChange={onYearChange}
        />

        {/* ── 1: Location Search ──────────────────────────────────── */}
        <div className="relative">
          <LocationSearch onLocationChange={onLocationChange} />
        </div>


        {/* ── 2: Map + AI Insights ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MapView selectedLocation={selectedLocation} />
          </div>
          <div className="lg:col-span-1">
            <AIInsightsCard
              selectedLocation={selectedLocation}
              currentYear={currentYear}
              climateData={allData}
              trendLabel={trendLabel}
            />
          </div>
        </div>

        {/* ── 3: Climate Impact Story (with embedded voice narration) ─ */}
        <ClimateImpactStory
          selectedLocation={selectedLocation}
          currentYear={currentYear}
          climateData={allData}
          trendLabel={trendLabel}
        />

        {/* ── 4: Time Travel Slider ───────────────────────────────── */}
        <TimeTravelSlider
          currentYear={currentYear}
          onYearChange={onYearChange}
          trendLabel={trendLabel}
        />

        {/* ── 5: Charts + Risk Score ──────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2">
            <ClimateCharts
              selectedLocation={selectedLocation}
              currentYear={currentYear}
              climateData={allData}
              projectionStartYear={projectionStartYear}
              dataSource={dataSource}
              trendLabel={trendLabel}
              loading={loading}
            />
          </div>
          <div className="xl:col-span-1">
            <ClimateRiskScore
              selectedLocation={selectedLocation}
              currentYear={currentYear}
              climateData={allData}
              projectionStartYear={projectionStartYear}
            />
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <footer className="text-center py-6 border-t border-white/5 text-xs text-gray-600">
          <p>
            Climate Time Machine &nbsp;·&nbsp; IIT BHU Hack It Out Hackathon
          </p>
        </footer>
      </main>
    </div>
  )
}
