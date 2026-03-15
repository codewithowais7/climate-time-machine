/**
 * AISearchBox.jsx — Gemini-powered natural language climate search
 *
 * Accepts free-form questions like:
 *   "Show climate stats for Jaipur in 2040"
 *   "What is the rainfall trend in Delhi?"
 *
 * On submit → POST /api/ai-search → Gemini extracts { location, year, metric, answer }
 * → calls onLocationChange(city) and/or onYearChange(year) to drive the dashboard
 *
 * Props:
 *   onLocationChange – fn(cityName: string)
 *   onYearChange     – fn(year: number)
 */

import { useState, useRef } from 'react'

// ─── Example queries for the placeholder rotation ─────────────────────────────
const EXAMPLES = [
  'Show climate stats for Jaipur in 2040',
  'How has rainfall changed in Delhi?',
  'What is the climate risk for Mumbai in 2050?',
  'Temperature trend for Bengaluru since 1990',
  'CO₂ levels in Varanasi in 2030',
  'Is Chennai getting hotter?',
]

// ─── Metric → colour mapping for the highlighted badge ───────────────────────
const METRIC_COLOR = {
  temperature: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  rainfall:    'text-cyan-400   bg-cyan-500/10   border-cyan-500/20',
  co2:         'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  risk:        'text-red-400    bg-red-500/10    border-red-500/20',
  summary:     'text-violet-400 bg-violet-500/10 border-violet-500/20',
}
const METRIC_LABEL = {
  temperature: '🌡️ Temperature',
  rainfall:    '🌧️ Rainfall',
  co2:         '🌿 CO₂',
  risk:        '⚠️ Risk',
  summary:     '📋 Summary',
}

export default function AISearchBox({ onLocationChange, onYearChange }) {
  const [query,     setQuery]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)   // { intent, city, year, risk_level, summary }
  const [error,     setError]     = useState(null)
  const [exIdx,     setExIdx]     = useState(0)
  const inputRef = useRef(null)

  // Cycle through example placeholders every time the input is empty + clicked
  const placeholder = EXAMPLES[exIdx % EXAMPLES.length]

  async function handleSubmit(e) {
    e?.preventDefault()
    const q = query.trim()
    if (!q || loading) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const API_URL = import.meta.env.PROD 
        ? 'https://climate-time-machine.onrender.com' 
        : 'http://localhost:5000'
      
      const res  = await fetch(`${API_URL}/api/ai-search`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: q }),
      })

      if (!res.ok) {
        let errorMsg = 'Backend request failed'
        try {
          const data = await res.json()
          errorMsg = data.error ?? errorMsg
        } catch (e) {
          // If response isn't JSON, rely on the default errorMsg
        }
        throw new Error(errorMsg)
      }

      const data = await res.json()
      setResult(data)

      // ── Drive dashboard state ──────────────────────────────────────────────
      if (data.city) {
        onLocationChange?.(data.city)    // triggers geocoding + map fly-to
      }
      if (data.year && data.year >= 1990 && data.year <= 2050) {
        onYearChange?.(data.year)            // moves time travel slider
      }
    } catch (err) {
      setError(err.message || 'Network error. Make sure the backend is running.')
      console.error('[AISearchBox]', err)
    } finally {
      setLoading(false)
    }
  }

  function handleExampleClick(ex) {
    setQuery(ex)
    setExIdx(i => i + 1)
    inputRef.current?.focus()
  }

  return (
    <div className="card border border-violet-500/20 bg-violet-500/5 space-y-4">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-violet-500/20 rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round"/>
            <path d="M17 3l4 4-2 2-4-4 2-2zM13 7l4 4-6 6H7v-4l6-6z" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="font-semibold text-gray-100 text-sm">AI Climate Search</p>
          <p className="text-xs text-gray-500">Ask anything about climate in natural language</p>
        </div>
        <span className="ml-auto text-[10px] font-bold text-violet-400 bg-violet-500/10
                         border border-violet-500/20 rounded-full px-2 py-0.5 tracking-wider">
          GEMINI
        </span>
      </div>

      {/* ── Search input ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 shrink-0"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setExIdx(i => i + 1)}
            placeholder={placeholder}
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5
                       text-sm text-gray-200 placeholder:text-gray-600
                       focus:outline-none focus:border-violet-500/50 focus:ring-1
                       focus:ring-violet-500/30 transition disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                     disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl
                     transition flex items-center gap-2 shrink-0"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent
                                rounded-full animate-spin" />
            : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2">
                <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z" strokeLinejoin="round"/>
              </svg>
          }
          {loading ? 'Thinking…' : 'Ask AI'}
        </button>
      </form>

      {/* ── Example chips ─────────────────────────────────────────────────── */}
      {!result && !error && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.slice(0, 4).map((ex, i) => (
            <button
              key={i}
              onClick={() => handleExampleClick(ex)}
              className="text-xs text-gray-500 bg-white/5 hover:bg-white/10 border
                         border-white/5 hover:border-white/10 rounded-lg px-2.5 py-1
                         transition text-left"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20
                        rounded-xl p-3 text-sm text-red-300">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Result panel ──────────────────────────────────────────────────── */}
      {result && (
        <div className="bg-white/3 border border-violet-500/20 rounded-xl p-4 space-y-3
                        animate-fade-in">

          {/* Extracted intent tags */}
          <div className="flex flex-wrap gap-2">
            {result.city && (
              <span className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20
                               rounded-full px-2.5 py-1 font-medium">
                📍 {result.city}
              </span>
            )}
            {result.year && (
              <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20
                               rounded-full px-2.5 py-1 font-mono">
                🗓 {result.year}
              </span>
            )}
            {result.intent && (
              <span className={`text-xs border rounded-full px-2.5 py-1 font-medium text-emerald-400 bg-emerald-500/10 border-emerald-500/20`}>
                🧠 {result.intent.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </span>
            )}
            {result.risk_level && (
              <span className={`text-xs border rounded-full px-2.5 py-1 font-medium text-red-400 bg-red-500/10 border-red-500/20`}>
                ⚠️ {result.risk_level.toUpperCase()} RISK
              </span>
            )}
          </div>

          {/* Gemini answer */}
          {result.summary && (
            <p className="text-sm text-gray-200 leading-relaxed">{result.summary}</p>
          )}

          {/* Dashboard update confirmation */}
          {(result.city || result.year) && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <svg className="w-3 h-3 text-emerald-400 shrink-0" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Dashboard updated
              {result.city && <strong className="text-gray-400"> → {result.city}</strong>}
              {result.year && <strong className="text-gray-400"> · {result.year}</strong>}
            </p>
          )}

          {/* Not found */}
          {!result.city && !result.year && (
            <p className="text-xs text-gray-500 italic">
              Could not determine city or year. Try being more specific — e.g. "Climate for Jaipur in 2040".
            </p>
          )}
        </div>
      )}
    </div>
  )
}
