/**
 * ClimateCharts.jsx  —  Phase 4: Future Climate Prediction Engine
 *
 * Accepts pre-fetched real climate data via props (from Dashboard's useClimateData).
 * Phase 4 adds confidence bands (tempLow/tempHigh, rainLow/rainHigh) to the projection.
 *
 * Props:
 *   climateData        – { years, temperature, tempLow, tempHigh, rainfall, rainLow, rainHigh, co2 }
 *   projectionStartYear – first year whose data is modelled, not recorded
 *   dataSource         – 'open-meteo-archive' | 'estimated'
 *   trendLabel         – 'Warming Accelerates' | 'Warming Stable' | 'Warming Slowing'
 *   currentYear        – currently selected year (slider)
 *   selectedLocation   – location object
 */

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
)

// ─── Data filtering: returns sliced arrays up to selectedYear ──────────────────
export function getDataUntilYear(climateData, selectedYear) {
  if (!climateData) return null
  const { years, temperature, tempLow, tempHigh, rainfall, rainLow, rainHigh, co2 } = climateData
  const endIdx = years.findLastIndex(y => y <= selectedYear)
  if (endIdx < 0) return null
  return {
    years:       years.slice(0, endIdx + 1),
    temperature: temperature.slice(0, endIdx + 1),
    tempLow:     (tempLow   ?? temperature).slice(0, endIdx + 1),
    tempHigh:    (tempHigh  ?? temperature).slice(0, endIdx + 1),
    rainfall:    rainfall.slice(0, endIdx + 1),
    rainLow:     (rainLow   ?? rainfall).slice(0, endIdx + 1),
    rainHigh:    (rainHigh  ?? rainfall).slice(0, endIdx + 1),
    co2:         co2.slice(0, endIdx + 1),
  }
}

// ─── Build Chart.js datasets: recorded (solid) + projected (dashed) + confidence band ──
function buildDatasets(labels, data, lowData, highData, splitIdx, color, projColor) {
  const bandColor = projColor + '22'   // ~13% opacity fill
  return {
    labels,
    datasets: [
      // 1. Recorded portion — solid fill
      {
        label: 'Recorded Data',
        data: data.map((v, i) => i < splitIdx ? v : null),
        borderColor: color,
        backgroundColor: `${color}18`,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        order: 1,
      },
      // 2. Upper confidence bound (invisible line, fills down to lower)
      {
        label: '_upper',   // underscore prefix → hidden from tooltip
        data: data.map((v, i) => i >= splitIdx - 1 ? highData[i] : null),
        borderColor: 'transparent',
        backgroundColor: bandColor,
        borderWidth: 0,
        fill: '+1',         // fill DOWN to the next dataset (lower bound)
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
        order: 3,
      },
      // 3. Lower confidence bound (invisible line)
      {
        label: 'Projection Range',
        data: data.map((v, i) => i >= splitIdx - 1 ? lowData[i] : null),
        borderColor: 'transparent',
        backgroundColor: bandColor,
        borderWidth: 0,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
        order: 4,
      },
      // 4. Projected trend line — dashed, drawn on top
      {
        label: 'Projected Trend',
        data: data.map((v, i) => i >= splitIdx - 1 ? v : null),
        borderColor: projColor,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        order: 2,
      },
    ],
  }
}

// ─── Shared chart options ──────────────────────────────────────────────────────
function buildOptions(unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400, easing: 'easeInOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#e5e7eb',
        bodyColor: '#9ca3af',
        padding: 12,
        filter: (item) => !item.dataset.label.startsWith('_'),  // hide internal band datasets
        callbacks: {
          label: (ctx) => {
            const label = ctx.dataset.label
            if (label === 'Projection Range') return null  // hidden
            return ` ${ctx.parsed.y != null ? ctx.parsed.y : ''} ${unit}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: { color: '#6b7280', maxTicksLimit: 7, font: { size: 10, family: 'JetBrains Mono' } },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: { color: '#6b7280', font: { size: 10, family: 'JetBrains Mono' } },
      },
    },
  }
}

// ─── Chart card ───────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, icon, value, unit, change, chartData, accentColor }) {
  const options = useMemo(() => buildOptions(unit), [unit])
  return (
    <div className="card flex flex-col gap-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="section-title mb-0.5">{icon} {title}</p>
          <p className="text-xs text-gray-600 mb-1">{subtitle}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-100" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {value}
            </span>
            <span className="text-sm text-gray-500">{unit}</span>
          </div>
        </div>
        <div className={`text-xs font-semibold px-2 py-1 rounded-lg ${change >= 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change)} {unit}
        </div>
      </div>
      <div style={{ height: '140px', position: 'relative' }}>
        <Line data={chartData} options={options} />
      </div>
      {/* Legend: 3 entries */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: accentColor }} />
          <span>Recorded Data</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: accentColor, opacity: 0.5 }} />
          <span>Projected Trend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2 rounded-sm opacity-30" style={{ background: accentColor }} />
          <span>Projection Range</span>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card flex flex-col gap-4 animate-pulse">
      <div className="h-4 bg-white/5 rounded w-1/2" />
      <div className="h-3 bg-white/5 rounded w-1/3" />
      <div className="bg-white/5 rounded" style={{ height: '140px' }} />
    </div>
  )
}

// ─── Trend badge colours ───────────────────────────────────────────────────────
const TREND_STYLE = {
  'Warming Accelerates': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Warming Stable':      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Warming Slowing':     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ClimateCharts({
  selectedLocation,
  currentYear,
  climateData,         // full 1990-2050 arrays from useClimateData hook
  projectionStartYear,
  dataSource,
  trendLabel,
  loading,
}) {
  // Slice data to [1990 .. currentYear]
  const sliced = useMemo(
    () => getDataUntilYear(climateData, currentYear),
    [climateData, currentYear]
  )

  // Split index: where recording ends and projection starts (within sliced data)
  const splitIdx = useMemo(() => {
    if (!sliced) return 0
    const psYear = projectionStartYear ?? new Date().getFullYear()
    const idx = sliced.years.findLastIndex(y => y < psYear)
    return idx >= 0 ? idx + 1 : sliced.years.length
  }, [sliced, projectionStartYear])

  const labels = sliced?.years.map(String) ?? []

  // Stat values: current year's entry (last item of sliced)
  const safeAt = (arr) => arr?.[arr.length - 1] ?? null

  const currentTemp = safeAt(sliced?.temperature)
  const tempChange  = currentTemp != null && sliced?.temperature[0] != null
    ? parseFloat((currentTemp - sliced.temperature[0]).toFixed(1)) : 0

  const currentRain = Math.round(safeAt(sliced?.rainfall) ?? 0)
  const rainChange  = sliced?.rainfall
    ? Math.round(currentRain - sliced.rainfall[0]) : 0

  const currentCo2 = safeAt(sliced?.co2)
  const co2Change  = currentCo2 != null && sliced?.co2[0] != null
    ? parseFloat((currentCo2 - sliced.co2[0]).toFixed(1)) : 0

  // Build Chart.js datasets (pass uncertainty band arrays for temp and rain)
  const tempChart = useMemo(() => sliced
    ? buildDatasets(labels, sliced.temperature, sliced.tempLow, sliced.tempHigh, splitIdx, '#f97316', '#fb923c')
    : null, [sliced, labels, splitIdx])
  const rainChart = useMemo(() => sliced
    ? buildDatasets(labels, sliced.rainfall, sliced.rainLow, sliced.rainHigh, splitIdx, '#3b82f6', '#60a5fa')
    : null, [sliced, labels, splitIdx])
  // CO₂ has no uncertainty band — pass main array for both bounds (no visible shading)
  const co2Chart  = useMemo(() => sliced
    ? buildDatasets(labels, sliced.co2, sliced.co2, sliced.co2, splitIdx, '#a855f7', '#c084fc')
    : null, [sliced, labels, splitIdx])

  const trendStyle = TREND_STYLE[trendLabel] ?? TREND_STYLE['Warming Stable']

  return (
    <div>
      {/* Section header */}
      <div className="flex flex-wrap items-center gap-2 px-1 mb-3">
        <p className="section-title mb-0">📊 Climate Data Trends</p>
        <span className="text-xs text-gray-600">
          {selectedLocation
            ? `Showing 1990–${currentYear} data for ${selectedLocation.name}`
            : 'Select a city to see localised trends'}
        </span>

        {/* Trend indicator */}
        {trendLabel && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${trendStyle}`}>
            ⬆ {trendLabel}
          </span>
        )}

        {/* Data source badge */}
        {dataSource === 'open-meteo-archive' ? (
          <span className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5 font-mono">
            ✦ Live Data
          </span>
        ) : (
          <span className="ml-auto text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5 font-mono">
            ~ Estimated
          </span>
        )}
      </div>

      {loading || !sliced ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChartCard
            title="Temperature Rise"
            subtitle={`Avg. surface temp, 1990–${currentYear}`}
            icon="🌡️"
            value={currentTemp?.toFixed(1) ?? '—'}
            unit="°C"
            change={tempChange}
            chartData={tempChart}
            accentColor="#f97316"
          />
          <ChartCard
            title="Monsoon Rainfall Pattern"
            subtitle="Annual precipitation trends"
            icon="🌧️"
            value={currentRain || '—'}
            unit="mm/yr"
            change={rainChange}
            chartData={rainChart}
            accentColor="#3b82f6"
          />
          <ChartCard
            title="CO₂ — Atmospheric Load"
            subtitle="Global CO₂ concentration (ppm)"
            icon="🏭"
            value={currentCo2?.toFixed(0) ?? '—'}
            unit="ppm"
            change={co2Change}
            chartData={co2Chart}
            accentColor="#a855f7"
          />
        </div>
      )}
    </div>
  )
}
