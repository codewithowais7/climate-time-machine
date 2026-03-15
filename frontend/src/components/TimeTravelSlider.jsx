/**
 * TimeTravelSlider.jsx
 * Year-range slider spanning 1990–2050.
 * Displays tick marks at key decade milestones.
 * Notifies parent of year changes via onYearChange prop.
 */

const MIN_YEAR = 1990
const MAX_YEAR = 2050
const TICKS = [1990, 2000, 2010, 2020, 2030, 2040, 2050]
const TODAY = new Date().getFullYear()  // dynamic — never needs updating

export default function TimeTravelSlider({ currentYear, onYearChange, trendLabel }) {
  const progress = ((currentYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100

  // Era label: use real trendLabel from data when available, else time-based fallback
  const eraFallback =
    currentYear <= 2000 ? { label: 'Pre-2000 Baseline', color: 'text-blue-400', bg: 'bg-blue-500/10' }
      : currentYear <= TODAY ? { label: 'Present Day', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
        : currentYear <= TODAY + 11 ? { label: 'Near-Future Forecast', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
          : { label: 'Long-Range Projection', color: 'text-red-400', bg: 'bg-red-500/10' }

  const TREND_ERA = {
    'Warming Accelerates': { label: 'Warming Accelerates', color: 'text-red-400', bg: 'bg-red-500/10' },
    'Warming Stable': { label: 'Warming Stable', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    'Warming Slowing': { label: 'Warming Slowing', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  }

  const era = (trendLabel && TREND_ERA[trendLabel]) ? TREND_ERA[trendLabel] : eraFallback

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="section-title mb-0">⏳ Climate Time Travel</p>
          <p className="text-xs text-gray-600 mt-0.5">Explore how climate trends have evolved over the decades.</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${era.bg} ${era.color}`}>
          <span>{era.label}</span>
        </div>
      </div>

      {/* Year display */}
      <div className="text-center mb-6">
        <div className="inline-flex items-baseline gap-2">
          <span
            className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {currentYear}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {currentYear === TODAY
            ? 'Present day'
            : currentYear < TODAY
              ? `${TODAY - currentYear} ${TODAY - currentYear === 1 ? 'year' : 'years'} in the past`
              : `${currentYear - TODAY} ${currentYear - TODAY === 1 ? 'year' : 'years'} into the future`}
        </p>
      </div>

      {/* Slider track */}
      <div className="relative px-2">
        {/* Custom track fill */}
        <div className="relative h-2 bg-white/5 rounded-full mb-6">
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-150"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #1d4ed8, #22d3ee)',
            }}
          />
        </div>

        {/* Range input (overlaid) */}
        <input
          type="range"
          min={MIN_YEAR}
          max={MAX_YEAR}
          value={currentYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="absolute inset-x-2 top-0 w-[calc(100%-16px)] h-2 opacity-0 cursor-pointer"
          style={{ zIndex: 10 }}
        />

        {/* Tick marks */}
        <div className="flex justify-between mt-1">
          {TICKS.map((year) => (
            <button
              key={year}
              onClick={() => onYearChange(year)}
              className={`text-xs font-mono transition-all duration-200 hover:text-cyan-400 ${currentYear === year
                ? 'text-cyan-400 font-bold'
                : 'text-gray-600 hover:text-gray-400'
                }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Quick jump buttons */}
      <div className="flex gap-2 mt-5 flex-wrap">
        {TICKS.map((year) => (
          <button
            key={year}
            onClick={() => onYearChange(year)}
            className={`flex-1 min-w-[60px] text-xs py-2 rounded-lg font-mono transition-all duration-200 ${currentYear === year
              ? 'bg-cyan-500 text-[#0a0f1e] font-bold shadow-glow'
              : 'btn-secondary'
              }`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  )
}
