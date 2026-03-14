/**
 * useClimateData.js  —  Custom hook  (Phase 3)
 *
 * Single source of truth for real climate data.
 * Fetched once per location, then sliced per year across all consumers.
 *
 * Returns:
 *   allData      – full 1990-2050 arrays { years, temperature, rainfall, co2 }
 *   getSlice     – getSlice(year) → data arrays trimmed to [1990 .. year]
 *   dataSource   – 'open-meteo-archive' | 'estimated'
 *   projectionStartYear – first year that is model-projected, not recorded
 *   loading      – boolean
 *   trendLabel   – 'Warming Accelerates' | 'Warming Stable' | 'Warming Slowing'
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ─── CO₂ reference anchors (same as backend) ─────────────────────────────────
const CO2_ANCHORS = [
  [1990, 354.4], [1995, 360.8], [2000, 369.5], [2005, 379.8],
  [2010, 389.9], [2015, 400.8], [2020, 412.5], [2024, 422.5],
]
function co2ForYear(year) {
  if (year <= CO2_ANCHORS[0][0]) return CO2_ANCHORS[0][1]
  const last = CO2_ANCHORS[CO2_ANCHORS.length - 1]
  if (year >= last[0]) {
    const [y1, c1] = CO2_ANCHORS[CO2_ANCHORS.length - 2]
    const slope = (last[1] - c1) / (last[0] - y1)
    return parseFloat((last[1] + slope * (year - last[0])).toFixed(2))
  }
  for (let i = 0; i < CO2_ANCHORS.length - 1; i++) {
    const [y1, c1] = CO2_ANCHORS[i], [y2, c2] = CO2_ANCHORS[i + 1]
    if (year >= y1 && year <= y2) {
      return parseFloat((c1 + (c2 - c1) * (year - y1) / (y2 - y1)).toFixed(2))
    }
  }
}

// ─── Seeded fallback (mirrors backend) ───────────────────────────────────────
function generateFallback(lat = 20, lon = 78, seed = 1) {
  const years = [], temperature = [], rainfall = [], co2 = []
  for (let y = 1990; y <= 2050; y++) {
    years.push(y)
    temperature.push(parseFloat(
      (14.5 + seed * 0.3 + ((y - 1990) / 60) * 1.8 + Math.sin(y * 0.7 + seed) * 0.4).toFixed(2)
    ))
    rainfall.push(parseFloat(
      (800 + seed * 20 - ((y - 1990) / 60) * 60 + Math.cos(y * 0.5 + seed) * 15).toFixed(1)
    ))
    co2.push(co2ForYear(y))
  }
  return { years, temperature, rainfall, co2 }
}

// ─── Trend detector: compares slope of last 10 years vs previous 10 years ────
function computeTrendLabel(years, temperature) {
  if (!years || years.length < 20) return 'Warming Stable'
  const now = new Date().getFullYear()
  const nowIdx = years.indexOf(now)
  if (nowIdx < 15) return 'Warming Stable'

  const slice = (from, to) => {
    const s = years.slice(from, to).map((_, i) => i)
    const t = temperature.slice(from, to)
    const n = s.length
    const sx = s.reduce((a, b) => a + b, 0)
    const sy = t.reduce((a, b) => a + b, 0)
    const sxy = s.reduce((a, x, i) => a + x * t[i], 0)
    const sx2 = s.reduce((a, x) => a + x * x, 0)
    return (n * sxy - sx * sy) / (n * sx2 - sx * sx)
  }

  const recent   = slice(nowIdx - 10, nowIdx)
  const previous = slice(nowIdx - 20, nowIdx - 10)
  const ratio    = recent / (previous || 0.001)

  if (ratio > 1.15)       return 'Warming Accelerates'
  if (ratio < 0.85)       return 'Warming Slowing'
  return 'Warming Stable'
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export default function useClimateData(selectedLocation) {
  const [allData, setAllData]               = useState(null)
  const [loading, setLoading]               = useState(false)
  const [dataSource, setDataSource]         = useState('estimated')
  const [projectionStartYear, setProjStart] = useState(new Date().getFullYear())
  const abortRef                            = useRef(null)

  useEffect(() => {
    if (!selectedLocation) {
      const fb = generateFallback()
      setAllData(fb)
      setDataSource('estimated')
      setProjStart(new Date().getFullYear())
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    const { lat, lon, seed } = selectedLocation

    fetch(`/api/climate-data?lat=${lat}&lon=${lon}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setAllData(json.data)
          setDataSource(json.dataSource ?? 'estimated')
          setProjStart(json.projectionStartYear ?? new Date().getFullYear())
        } else throw new Error('bad response')
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setAllData(generateFallback(lat, lon, seed ?? 1))
        setDataSource('estimated')
        setProjStart(new Date().getFullYear())
      })
      .finally(() => setLoading(false))

    return () => ctrl.abort()
  }, [selectedLocation])

  /**
   * getSlice(year) — returns all arrays trimmed to [1990..year]
   * with a flag for each value: isProjected (true if year > projectionStartYear)
   */
  const getSlice = useCallback((year) => {
    if (!allData) return null
    const endIdx = allData.years.findLastIndex(y => y <= year)
    if (endIdx < 0) return null
    return {
      years:       allData.years.slice(0, endIdx + 1),
      temperature: allData.temperature.slice(0, endIdx + 1),
      rainfall:    allData.rainfall.slice(0, endIdx + 1),
      co2:         allData.co2.slice(0, endIdx + 1),
    }
  }, [allData])

  const trendLabel = useMemo(
    () => allData ? computeTrendLabel(allData.years, allData.temperature) : 'Warming Stable',
    [allData]
  )

  return {
    allData,
    getSlice,
    dataSource,
    projectionStartYear,
    loading,
    trendLabel,
  }
}
