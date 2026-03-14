/**
 * AIInsightsCard.jsx  —  Phase 3 upgraded
 *
 * Generates contextual climate insight narratives using REAL data:
 *   - Actual temperature change (tempDelta from API)
 *   - Actual CO₂ level (from API)
 *   - trendLabel from useClimateData hook
 *
 * If climateData is not yet available, falls back to seed estimation.
 *
 * Props:
 *   selectedLocation  – location object { name, lat, lon }
 *   currentYear       – selected year from time travel slider
 *   climateData       – { years, temperature, co2, ... } from useClimateData
 *   trendLabel        – 'Warming Accelerates' | 'Warming Stable' | 'Warming Slowing'
 */

import { useState, useEffect } from 'react'

// ─── City-specific context ────────────────────────────────────────────────────
const CITY_CONTEXT = {
  Varanasi:   { region: 'the Gangetic plains',          economy: 'agriculture, silk weaving, and river trade',       monsoon: 'Indo-Gangetic monsoon'  },
  Delhi:      { region: 'northern India',               economy: 'industry, transportation, and urban activity',     monsoon: 'north Indian monsoon'   },
  Mumbai:     { region: 'the western coast',            economy: 'coastal commerce, fishing, and industry',          monsoon: 'Arabian Sea monsoon'    },
  Bengaluru:  { region: 'the Deccan plateau',           economy: 'technology, manufacturing, and horticulture',      monsoon: 'southwest monsoon'      },
  Chennai:    { region: 'the Coromandel coast',         economy: 'coastal industry, fishing, and commerce',          monsoon: 'northeast monsoon'      },
  Kolkata:    { region: 'the Bengal delta',             economy: 'port trade, manufacturing, and agriculture',       monsoon: 'Bay of Bengal monsoon'  },
  Jaipur:     { region: 'the Thar desert edge',         economy: 'tourism, textiles, and handicrafts',               monsoon: 'northwest monsoon'      },
  Hyderabad:  { region: 'the Deccan plateau',           economy: 'technology, pharmaceuticals, and pearls',          monsoon: 'southwest monsoon'      },
  Lucknow:    { region: 'the Gangetic belt',            economy: 'agriculture, crafts, and public services',         monsoon: 'Indo-Gangetic monsoon'  },
  Ahmedabad:  { region: "Gujarat's semi-arid zone",     economy: 'textiles, chemicals, and trade',                   monsoon: 'Arabian Sea monsoon'    },
  Kanpur:     { region: 'the Gangetic plains',          economy: 'leather, textiles, and manufacturing',             monsoon: 'Indo-Gangetic monsoon'  },
  Patna:      { region: 'the Bihar floodplains',        economy: 'agriculture, trade, and public administration',    monsoon: 'Indo-Gangetic monsoon'  },
  Surat:      { region: "Gujarat's coastal belt",       economy: 'diamond cutting, textiles, and port commerce',     monsoon: 'Arabian Sea monsoon'    },
  Pune:       { region: 'the western Deccan',           economy: 'automotive, IT, and education',                    monsoon: 'southwest monsoon'      },
}

function getCtx(name) {
  return CITY_CONTEXT[name] ?? {
    region: 'this region', economy: 'local industry and communities', monsoon: 'regional monsoon',
  }
}

// ─── Narrative generator — uses real data when available ─────────────────────
function generateInsight(location, year, climateData, trendLabel) {
  const ctx       = getCtx(location.name)
  const isFuture  = year > new Date().getFullYear()
  const decadesObs = Math.max(1, Math.floor((year - 1990) / 10))

  // Use real data if available, else seed estimation
  let tempShift, co2Est, dataNote

  if (climateData) {
    const { years, temperature, co2 } = climateData
    const i = years.findLastIndex(y => y <= year)
    if (i >= 0) {
      tempShift = parseFloat((temperature[i] - temperature[0]).toFixed(1))
      co2Est    = Math.round(co2[i])
      dataNote  = '📡 Insight derived from Open-Meteo recorded climate data.'
    }
  }

  // Fallback seed estimation
  if (tempShift == null) {
    const yearsFromBase = year - 1990
    tempShift = parseFloat(((yearsFromBase / 60) * 1.8).toFixed(1))
    co2Est    = Math.round(354 + (yearsFromBase / 60) * 140)
    dataNote  = '📊 Insight estimated from modelled climate trends.'
  }

  // Sign-aware temperature phrase
  const tempPhrase =
    Math.abs(tempShift) < 0.1
      ? 'temperature has remained relatively stable since 1990'
      : tempShift > 0
      ? `warming of **+${tempShift.toFixed(1)}°C** from 1990`
      : `cooling of **${Math.abs(tempShift).toFixed(1)}°C** from 1990`

  const trend  = trendLabel ?? 'Warming Stable'   // fix: use the actual param name
  const sign    = tempShift >= 0 ? '+' : ''        // fix: derive sign from tempShift

  const trendStr =
    trend === 'Warming Accelerates' ? 'the rate of warming has been accelerating' :
    trend === 'Warming Slowing'     ? 'the rate of warming has been slowing slightly' :
    'the temperature trend has progressed steadily'

  const opening = isFuture
    ? `Looking ahead to **${year}**, climate models suggest ${location.name} — in ${ctx.region} — could see a temperature shift of **${sign}${tempShift.toFixed(1)}°C** vs the 1990 baseline. ${trendStr.charAt(0).toUpperCase() + trendStr.slice(1)} in this region.`
    : `Over the ${decadesObs > 1 ? `${decadesObs} decades` : 'decade'} to **${year}**, ${location.name} recorded a ${tempPhrase}. Notably, ${trendStr} — a pattern consistent with wider changes across ${ctx.region}.`

  const rainfallNote = isFuture
    ? `Rainfall patterns shaped by the **${ctx.monsoon}** may grow more erratic. Shorter, more intense rain events could stress the water and drainage systems that **${ctx.economy}** depends on.`
    : `Rainfall variability across the **${ctx.monsoon}** increased over this period. Seasons that once followed predictable rhythms grew less consistent — a real-world signal for **${ctx.economy}**.`

  const future = isFuture
    ? `🔭 At projected CO₂ levels of **~${co2Est} ppm**, urban heat and water stress could intensify by ${year}. Early adaptation — water harvesting, heat-resilient urban planning — will be critical for communities in ${ctx.region}.`
    : `📊 Atmospheric CO₂ reached approximately **${co2Est} ppm** during this period. For ${location.name}, embedded in ${ctx.region}, the early signs of a changing climate were already visible in temperature and rainfall records.`

  return { paragraphs: [opening, rainfallNote, future], dataNote }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AIInsightsCard({ selectedLocation, currentYear, climateData, trendLabel }) {
  const [insight, setInsight] = useState(null)

  // Derived loading: only show spinner once a city is selected AND
  // climateData has arrived but insight hasn't been generated yet.
  // This can never get permanently stuck because it depends only on
  // whether climateData exists, not on any manual flag.
  const isLoading = !!selectedLocation && !!climateData && !insight

  useEffect(() => {
    // Clear insight when location is deselected
    if (!selectedLocation) {
      setInsight(null)
      return
    }

    // Wait until climateData is available before generating insight.
    // While the API is loading, keep showing whatever insight already exists
    // (or nothing if this is the first load). Once data arrives the effect
    // re-runs and populates insight.
    if (!climateData) return

    // Both location and data are ready — generate insight.
    // Clear first so isLoading becomes true briefly, then set immediately.
    let cancelled = false

    setInsight(null)                            // triggers loading skeleton

    try {
      const result = generateInsight(selectedLocation, currentYear, climateData, trendLabel)
      if (!cancelled) setInsight(result)        // clears loading immediately
    } catch (err) {
      console.error('[AIInsightsCard] insight generation failed:', err)
      if (!cancelled) {
        // Fallback always resolves isLoading — spinner never stays permanent
        setInsight({
          paragraphs: [
            `Climate data for **${selectedLocation.name}** in **${currentYear}** was retrieved, but the insight summary could not be generated. The charts and risk score above show the full data.`,
          ],
          dataNote: '⚠️ Insight generation failed — raw data is still available above.',
        })
      }
    }

    return () => { cancelled = true }
  }, [selectedLocation, currentYear, climateData, trendLabel])




  return (
    <div className="card animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-9 h-9 bg-violet-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 10h8M8 14h5" strokeLinecap="round"/>
            </svg>
          </div>
          {isLoading && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-400 rounded-full animate-ping" />
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-100 text-sm">Climate Insight</p>
          <p className="text-xs text-gray-500">
            {climateData ? 'Data-driven analysis' : 'Contextual analysis'} for{' '}
            {selectedLocation?.name ?? 'selected city'}
          </p>
        </div>
        {selectedLocation && (
          <div className="ml-auto bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5 text-xs text-violet-400 font-mono">
            {currentYear}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!selectedLocation && (
        <div className="flex flex-col items-center justify-center flex-1 py-6 text-center gap-3">
          <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center shimmer">
            <svg className="w-7 h-7 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Pick a city to begin</p>
            <p className="text-gray-600 text-xs mt-1 max-w-[200px]">
              Select any city worldwide to read a contextual summary of its climate trajectory.
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton — derived from data presence, never gets stuck */}
      {isLoading && (
        <div className="space-y-3 flex-1">
          {[80, 95, 70].map((w, i) => (
            <div key={i} className="shimmer h-4 rounded-lg" style={{ width: `${w}%` }} />
          ))}
          <div className="flex items-center gap-2 text-xs text-violet-400 mt-4">
            <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <span>Reading climate data for {selectedLocation?.name}…</span>
          </div>
        </div>
      )}

      {/* Paragraphs */}
      {/* Insight paragraphs — renders as soon as insight is populated */}
      {insight && (
        <div className="space-y-3 animate-fade-in flex-1">
          {insight.paragraphs.map((text, i) => (
            <div key={i} className="bg-white/3 border border-white/5 rounded-xl p-3">
              <p
                className="text-sm text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-100">$1</strong>'),
                }}
              />
            </div>
          ))}
          <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-1">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {insight.dataNote}
          </p>
        </div>
      )}
    </div>
  )
}
