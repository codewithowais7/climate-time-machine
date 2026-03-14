/**
 * ClimateRiskScore.jsx  —  Phase 6: Climate Risk Score Engine
 *
 * calculateClimateRisk() implements the exact point-based scoring model:
 *
 *   Temperature score:  +1°C → 20pts | +2°C → 40pts | +3°C → 60pts
 *   Rainfall score:     >10% decline → 20pts | >20% decline → 40pts
 *   CO₂ score:          >40 ppm rise → 20pts | >80 ppm rise → 40pts
 *
 *   Total = sum of three scores, clamped to 0–100
 *   Level: 0–25 Low | 26–50 Moderate | 51–75 High | 76–100 Critical
 *
 * Each factor shows its point contribution so judges can verify the logic.
 * Score bar animates smoothly when currentYear changes (time travel compatible).
 *
 * Props:
 *   selectedLocation    – location object
 *   currentYear         – selected year from time travel slider
 *   climateData         – { years, temperature, rainfall, co2 } full 1990-2050
 *   projectionStartYear – year beyond which data is modelled
 */

import { useMemo } from 'react'

// ─── Level config ─────────────────────────────────────────────────────────────
const LEVELS = {
  Low:      { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', bar: '#10b981', range: '0–25'   },
  Moderate: { color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  bar: '#f59e0b', range: '26–50'  },
  High:     { color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  bar: '#f97316', range: '51–75'  },
  Critical: { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     bar: '#ef4444', range: '76–100' },
}

function scoreToLevel(score) {
  if (score <= 25) return 'Low'
  if (score <= 50) return 'Moderate'
  if (score <= 75) return 'High'
  return 'Critical'
}

// ─── calculateClimateRisk ─────────────────────────────────────────────────────
/**
 * Converts real climate data at a selected year into a 0-100 risk score.
 *
 * Scoring table:
 *   Temperature change since 1990:
 *     ≥ 3.0°C → 60 pts
 *     ≥ 2.0°C → 40 pts
 *     ≥ 1.0°C → 20 pts
 *     < 1.0°C →  0 pts
 *
 *   Rainfall % change since 1990:
 *     ≤ −20% → 40 pts
 *     ≤ −10% → 20 pts
 *     > −10% →  0 pts  (increase doesn't reduce score)
 *
 *   CO₂ increase since 1990:
 *     ≥ 80 ppm → 40 pts
 *     ≥ 40 ppm → 20 pts
 *     < 40 ppm →  0 pts
 *
 * Returns { score, level, factors[] }
 */
export function calculateClimateRisk(climateData, selectedYear) {
  if (!climateData) return null
  const { years, temperature, rainfall, co2 } = climateData

  const yearIdx = years.findLastIndex(y => y <= selectedYear)
  if (yearIdx < 0) return null

  // Raw values
  const tempNow   = temperature[yearIdx]
  const tempBase  = temperature[0]
  const tempDelta = parseFloat((tempNow - tempBase).toFixed(2))

  const rainNow   = rainfall[yearIdx]
  const rainBase  = rainfall[0]
  const rainPct   = ((rainNow - rainBase) / Math.abs(rainBase)) * 100  // % change

  const co2Now    = co2[yearIdx]
  const co2Base   = co2[0]
  const co2Delta  = parseFloat((co2Now - co2Base).toFixed(1))

  // ── Score each factor ──────────────────────────────────────────────────────
  const tempScore =
    tempDelta >= 3.0 ? 60 :
    tempDelta >= 2.0 ? 40 :
    tempDelta >= 1.0 ? 20 : 0

  const rainScore =
    rainPct <= -20 ? 40 :
    rainPct <= -10 ? 20 : 0

  const co2Score =
    co2Delta >= 80 ? 40 :
    co2Delta >= 40 ? 20 : 0

  const raw   = tempScore + rainScore + co2Score
  const score = Math.min(100, Math.max(0, raw))
  const level = scoreToLevel(score)

  const factors = [
    {
      id:     'temperature',
      icon:   '🌡️',
      label:  'Temperature Shift',
      raw:    `${tempDelta >= 0 ? '+' : ''}${tempDelta.toFixed(1)}°C from 1990`,
      points: tempScore,
      maxPts: 60,
      level:  scoreToLevel(tempScore * (100 / 60)),   // proportional level for colour
      detail:
        tempScore >= 60 ? 'Severe warming — exceeds IPCC 1.5°C safe threshold by far.' :
        tempScore >= 40 ? 'Major warming trend. Sustained heat stress risk.' :
        tempScore >= 20 ? 'Measurable warming detected. Heat events more frequent.' :
                          'Within natural variation range. Low concern.',
    },
    {
      id:     'rainfall',
      icon:   '🌧️',
      label:  'Rainfall Trend',
      raw:    `${rainPct >= 0 ? '+' : ''}${rainPct.toFixed(1)}% from 1990 baseline`,
      points: rainScore,
      maxPts: 40,
      level:  rainScore >= 40 ? 'Critical' : rainScore >= 20 ? 'High' : 'Low',
      detail:
        rainScore >= 40 ? 'Sharp decline. Water stress risk very high.' :
        rainScore >= 20 ? 'Moderate decline. Monsoon reliability reducing.' :
        rainPct > 0     ? 'Rainfall has increased — may raise flood risk in some areas.' :
                          'Minimal change from baseline. Monsoon pattern stable.',
    },
    {
      id:     'co2',
      icon:   '🏭',
      label:  'CO₂ Concentration',
      raw:    `+${co2Delta.toFixed(0)} ppm (${Math.round(co2Base)} → ${Math.round(co2Now)} ppm)`,
      points: co2Score,
      maxPts: 40,
      level:  co2Score >= 40 ? 'Critical' : co2Score >= 20 ? 'High' : 'Moderate',
      detail:
        co2Score >= 40 ? 'Extreme CO₂ rise. Major greenhouse feedback effects active.' :
        co2Score >= 20 ? 'Significant CO₂ increase. Enhanced greenhouse effect ongoing.' :
                         'CO₂ rise below 40 ppm threshold. Contribution still real.',
    },
  ]

  return { score, level, factors, raw, tempDelta, rainPct, co2Delta }
}

// ─── Factor row ───────────────────────────────────────────────────────────────
function FactorRow({ factor }) {
  const s   = LEVELS[factor.level] ?? LEVELS.Moderate
  const pct = Math.round((factor.points / factor.maxPts) * 100)
  return (
    <div className={`border rounded-xl p-3.5 ${s.bg} ${s.border}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-base mt-0.5 shrink-0">{factor.icon}</span>
        <div className="flex-1 min-w-0">
          {/* Top row: label + level badge + points */}
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold text-gray-200">{factor.label}</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.bg} ${s.color} border ${s.border}`}>
              {factor.level}
            </span>
            <span className={`ml-auto text-xs font-mono font-bold ${s.color}`}>
              +{factor.points} pts
            </span>
          </div>
          {/* Mini progress bar showing pts / maxPts */}
          <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: s.bar }}
            />
          </div>
          {/* Data value */}
          <p className="text-xs text-gray-500 font-mono mb-0.5">{factor.raw}</p>
          <p className="text-xs text-gray-400 leading-snug">{factor.detail}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Circular score dial ──────────────────────────────────────────────────────
function ScoreDial({ score, level }) {
  const s = LEVELS[level]
  const R = 42
  const C = 2 * Math.PI * R
  const arc = C * (1 - score / 100)
  return (
    <div className="relative w-[110px] h-[110px]">
      {/* SVG arc ring */}
      <svg
        width="110" height="110" viewBox="0 0 110 110"
        className="rotate-[-90deg]"
      >
        {/* Track */}
        <circle cx="55" cy="55" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        {/* Filled arc */}
        <circle
          cx="55" cy="55" r={R}
          fill="none"
          stroke="url(#riskGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={arc}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <defs>
          <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor={s.bar} />
          </linearGradient>
        </defs>
      </svg>

      {/* Score text — absolutely centered over the SVG, no margin hacks */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center leading-none gap-0.5">
          <span className={`text-3xl font-bold font-mono leading-none ${s.color}`}>{score}</span>
          <span className="text-[10px] text-gray-500 font-mono leading-none">/ 100</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ClimateRiskScore({
  selectedLocation,
  currentYear,
  climateData,
  projectionStartYear,
}) {
  if (!selectedLocation) return null

  const risk = useMemo(
    () => calculateClimateRisk(climateData, currentYear),
    [climateData, currentYear]
  )

  if (!risk) return null

  const { score, level, factors } = risk
  const s = LEVELS[level]
  const isProjected = projectionStartYear != null && currentYear >= projectionStartYear

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="section-title mb-0">⚠️ Climate Risk Assessment</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Computed from temperature, rainfall, and CO₂ indicators
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-semibold text-sm ${s.bg} ${s.border} ${s.color}`}>
          {level} Risk
        </div>
      </div>

      {/* Projection notice */}
      {isProjected && (
        <div className="mb-4 text-[10px] bg-blue-500/5 border border-blue-500/15 text-blue-400 rounded-lg px-3 py-2 font-mono">
          🔭 Projected risk for {currentYear} — based on modelled climate trends
        </div>
      )}

      {/* Score dial + score breakdown */}
      <div className="flex items-center justify-around mb-5 px-2">
        <ScoreDial score={score} level={level} />
        <div className="text-sm space-y-2 text-right">
          <div>
            <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">Risk Score</p>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{score}<span className="text-sm text-gray-500">/100</span></p>
          </div>
          <div className="text-xs text-gray-500 font-mono space-y-0.5">
            <p>🌡️ Temp:   +{factors[0].points} pts</p>
            <p>🌧️ Rain:   +{factors[1].points} pts</p>
            <p>🏭 CO₂:    +{factors[2].points} pts</p>
          </div>
          <div className={`text-[10px] font-mono px-2 py-0.5 rounded border ${s.bg} ${s.border} ${s.color}`}>
            Level: {s.range}
          </div>
        </div>
      </div>

      {/* Linear gauge */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-[10px] text-gray-600 mb-1 font-mono">
          <span>Low (0)</span><span>Moderate (26)</span><span>High (51)</span><span>Critical (76)</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
          {/* Zone markers */}
          {[25, 50, 75].map(p => (
            <div key={p} className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: `${p}%` }} />
          ))}
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, background: `linear-gradient(90deg, #22d3ee, ${s.bar})` }}
          />
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="space-y-2.5">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider font-mono px-0.5">
          Factor breakdown
        </p>
        {factors.map(f => <FactorRow key={f.id} factor={f} />)}
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-700 mt-3 flex items-center gap-1.5">
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Climate risk is calculated using temperature change, rainfall trends, and atmospheric CO₂ levels.
        {isProjected ? ' Values are model-based projections.' : ' Values from Open-Meteo recorded data.'}
      </p>
    </div>
  )
}
