/**
 * ClimateImpactStory.jsx  —  Phase 5
 *
 * Unified component: real-data-driven climate story + built-in voice narration.
 *
 * Story generation uses REAL climate data:
 *   - Actual temperature change since 1990 (from API)
 *   - Actual rainfall change since 1990 (from API)
 *   - Actual CO₂ level at selected year
 *   - trendLabel from useClimateData hook
 *
 * Voice narration:
 *   - Web Speech API (speechSynthesis)
 *   - English (en-IN) and Hindi (hi-IN)
 *   - Documentary pace (rate 0.88)
 *   - Language toggle inside the card
 *
 * Props:
 *   selectedLocation   – location object { name, lat, lon, ... }
 *   currentYear        – selected year from time travel slider
 *   climateData        – full 1990-2050 arrays from useClimateData
 *   trendLabel         – 'Warming Accelerates' | 'Warming Stable' | 'Warming Slowing'
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ─── Language registry ────────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'en', label: 'English', native: 'English', bcp47: 'en-IN', rate: 0.88, pitch: 1.0, enabled: true },
  { id: 'hi', label: 'Hindi',   native: 'हिंदी',   bcp47: 'hi-IN', rate: 0.85, pitch: 1.0, enabled: true },
  // Future: set enabled: true to surface in the UI
  { id: 'bn', label: 'Bengali', native: 'বাংলা',   bcp47: 'bn-IN', rate: 0.87, pitch: 1.0, enabled: false },
  { id: 'ta', label: 'Tamil',   native: 'தமிழ்',    bcp47: 'ta-IN', rate: 0.87, pitch: 1.0, enabled: false },
  { id: 'mr', label: 'Marathi', native: 'मराठी',    bcp47: 'mr-IN', rate: 0.87, pitch: 1.0, enabled: false },
]
const ACTIVE_LANGUAGES = LANGUAGES.filter(l => l.enabled)

// ─── City-specific context (grounds the story in local detail) ────────────────
const CITY_CONTEXT = {
  Varanasi:  { region: 'the Gangetic plains',    economy: 'agriculture, silk weaving, and river trade', monsoon: 'Indo-Gangetic monsoon' },
  Delhi:     { region: 'northern India',          economy: 'industry, transport, and urban activity',   monsoon: 'north Indian monsoon'  },
  Mumbai:    { region: 'the western coast',       economy: 'coastal commerce, fishing, and industry',  monsoon: 'Arabian Sea monsoon'   },
  Bengaluru: { region: 'the Deccan plateau',      economy: 'technology, manufacturing, and horticulture', monsoon: 'southwest monsoon'  },
  Chennai:   { region: 'the Coromandel coast',    economy: 'coastal industry, fishing, and commerce',  monsoon: 'northeast monsoon'     },
  Kolkata:   { region: 'the Bengal delta',        economy: 'port trade, manufacturing, and agriculture', monsoon: 'Bay of Bengal monsoon' },
  Jaipur:    { region: 'the Thar desert edge',    economy: 'tourism, textiles, and heritage crafts',   monsoon: 'northwest monsoon'     },
  Hyderabad: { region: 'the Deccan plateau',      economy: 'technology, pharmaceuticals, and trade',   monsoon: 'southwest monsoon'     },
  Lucknow:   { region: 'the Gangetic belt',       economy: 'agriculture, crafts, and public services', monsoon: 'Indo-Gangetic monsoon' },
  Ahmedabad: { region: "Gujarat's semi-arid zone", economy: 'textiles, chemicals, and trade',           monsoon: 'Arabian Sea monsoon'  },
}
function getCityCtx(name) {
  return CITY_CONTEXT[name] ?? {
    region: 'this region', economy: 'local communities', monsoon: 'regional monsoon',
  }
}

// ─── Real-data-driven story generator ────────────────────────────────────────
/**
 * generateStory(location, currentYear, climateData, trendLabel, lang)
 *
 * Returns { observation, implication, outlook, fullNarration }
 * using real temperature / rainfall / CO₂ values from the data arrays.
 */
function generateStory(location, currentYear, climateData, trendLabel, lang = 'en') {
  if (!location || !climateData) return null

  const ctx = getCityCtx(location.name)
  const { years, temperature, rainfall, co2 } = climateData

  // Find index for selected year (or last available)
  const yearIdx  = years.findLastIndex(y => y <= currentYear)
  if (yearIdx < 0) return null

  const tempNow    = temperature[yearIdx]
  const tempBase   = temperature[0]
  const tempDelta  = parseFloat((tempNow - tempBase).toFixed(1))
  const tempSign   = tempDelta >= 0 ? '+' : ''

  const rainNow    = Math.round(rainfall[yearIdx])
  const rainBase   = Math.round(rainfall[0])
  const rainDelta  = rainNow - rainBase
  const rainSign   = rainDelta >= 0 ? '+' : ''

  const co2Now     = Math.round(co2[yearIdx])
  const co2Base    = Math.round(co2[0])

  const isFuture   = currentYear > new Date().getFullYear()
  const today      = new Date().getFullYear()
  const yearsAhead = currentYear - today
  const decadeStr  = Math.round((currentYear - 1990) / 10)

  const trend = trendLabel ?? 'Warming Stable'

  if (lang === 'hi') {
    // Hindi: sign-aware temperature phrasing
    const hiTempPhrase =
      Math.abs(tempDelta) < 0.1
        ? `तापमान 1990 से अपेक्षाकृत स्थिर रहा है।`
        : tempDelta > 0
        ? `1990 की तुलना में औसत तापमान में लगभग +${tempDelta.toFixed(1)}°C की वृद्धि अनुमानित है।`
        : `1990 की तुलना में औसत तापमान में लगभग ${Math.abs(tempDelta).toFixed(1)}°C की कमी अनुमानित है।`

    const hiTempPhraseHist =
      Math.abs(tempDelta) < 0.1
        ? `तापमान 1990 से अपेक्षाकृत स्थिर रहा है।`
        : tempDelta > 0
        ? `1990 के आधार स्तर की तुलना में औसत तापमान में ${tempSign}${tempDelta.toFixed(1)}°C की वृद्धि दर्ज की गई है।`
        : `1990 के आधार स्तर की तुलना में औसत तापमान में ${Math.abs(tempDelta).toFixed(1)}°C की कमी दर्ज की गई है।`

    const observation = isFuture
      ? `${currentYear} के जलवायु मॉडल के अनुसार, ${location.name} में ${hiTempPhrase} वर्षा में भी ${rainDelta >= 0 ? 'वृद्धि' : 'कमी'} देखी जा सकती है।`
      : `पिछले ${decadeStr} दशकों में, ${location.name} में ${hiTempPhraseHist} वार्षिक वर्षा में ${rainSign}${Math.abs(rainDelta)} मिमी का परिवर्तन आया है।`

    const implication = `वायुमंडलीय CO₂ स्तर 1990 के ${co2Base} ppm से बढ़कर ${co2Now} ppm हो गया है। ${ctx.monsoon} की अनिश्चितता बढ़ रही है, जिसका असर ${ctx.economy} पर पड़ सकता है।`

    const outlook = isFuture
      ? `यह एक सांख्यिकीय अनुमान है। यदि वर्तमान ${trend === 'Warming Accelerates' ? 'तीव्र' : trend === 'Warming Slowing' ? 'धीमी' : 'स्थिर'} तापन प्रवृत्ति जारी रही, तो ${location.name} को 2050 तक गंभीर जलवायु चुनौतियों का सामना करना पड़ सकता है।`
      : `यदि यह प्रवृत्ति जारी रही, तो 2050 तक तापमान में और वृद्धि हो सकती है। ${trend === 'Warming Accelerates' ? 'वर्तमान में तेज़ी से वार्मिंग हो रही है।' : trend === 'Warming Slowing' ? 'वार्मिंग की गति धीमी हो रही है।' : 'वार्मिंग की दर स्थिर है।'}`

    const fullNarration = `${location.name} में जलवायु परिवर्तन। ${observation} ${implication} ${outlook}`

    return { observation, implication, outlook, fullNarration }
  }

  // ── English story ──────────────────────────────────────────────────────────
  // Sign-aware temperature phrase
  const tempPhrase =
    Math.abs(tempDelta) < 0.1
      ? 'temperature has remained relatively stable since 1990'
      : tempDelta > 0
      ? `warming of **+${tempDelta.toFixed(1)}°C** since 1990`
      : `cooling of **${Math.abs(tempDelta).toFixed(1)}°C** since 1990`

  const trendPhrase =
    trend === 'Warming Accelerates' ? 'the rate of warming is accelerating' :
    trend === 'Warming Slowing'     ? 'the rate of warming has been slowing' :
    'the temperature trend has been progressing steadily'

  const observation = isFuture
    ? `According to climate projections for **${currentYear}**, ${location.name} — situated in ${ctx.region} — could experience an average temperature shift of approximately **${tempSign}${tempDelta}°C** relative to the 1990 baseline. Annual rainfall may change by around **${rainSign}${Math.abs(rainDelta)} mm**.`
    : `Over the ${decadeStr > 1 ? `${decadeStr} decades` : 'decade'} to **${currentYear}**, ${location.name} has recorded a ${tempPhrase}. Annual precipitation has shifted by **${rainSign}${Math.abs(rainDelta)} mm** over the same period — ${trendPhrase}.`

  const implication = isFuture
    ? `Atmospheric CO₂ is projected to reach approximately **${co2Now} ppm** by ${currentYear} — up from ${co2Base} ppm in 1990. As temperatures rise, the **${ctx.monsoon}** may grow more erratic, putting pressure on ${ctx.economy} that the region depends on.`
    : `Global atmospheric CO₂ reached **${co2Now} ppm** during this period — a rise of ${co2Now - co2Base} ppm from 1990. In ${location.name}, this has contributed to shifting monsoon patterns affecting the **${ctx.monsoon}**. Systems tied to ${ctx.economy} have had to adapt to this variability.`

  const outlook = isFuture
    ? `These are model-based projections, not certainties. Acting early on adaptation — water harvesting, heat resilient urban planning, green corridors — can meaningfully reduce risk for communities in ${ctx.region} over the coming ${yearsAhead} years.`
    : tempDelta >= 0
    ? `If the current warming trajectory continues through 2050, ${location.name} could see significantly more intense heat periods and altered rainfall seasons. The trajectory is tracked — next steps depend on both global emission trends and local adaptation policy.`
    : `The observed cooling trend may reflect natural variability or localised land-use changes. Long-term projections still indicate global warming pressure — monitoring local data through 2050 remains important.`

  const fullNarration =
    `Climate profile for ${location.name}, year ${currentYear}. ${observation.replace(/\*\*/g, '')} ${implication.replace(/\*\*/g, '')} ${outlook}`

  return { observation, implication, outlook, fullNarration }
}

// ─── Voice helpers ────────────────────────────────────────────────────────────
const SPEECH_SUPPORTED = 'speechSynthesis' in window

function pickVoice(bcp47) {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  return (
    voices.find(v => v.lang === bcp47) ??
    voices.find(v => v.lang.startsWith(bcp47.split('-')[0])) ??
    voices[0]
  )
}

const PLAY = { IDLE: 'idle', SPEAKING: 'speaking', PAUSED: 'paused' }

// ─── Waveform animation ───────────────────────────────────────────────────────
function Waveform({ active }) {
  if (!active) return null
  return (
    <div className="flex items-end gap-0.5 h-5 mt-3">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-full bg-cyan-500/60 animate-pulse"
          style={{
            height:            `${25 + Math.abs(Math.sin(i * 0.6)) * 75}%`,
            animationDelay:    `${(i % 7) * 0.1}s`,
            animationDuration: `${0.5 + (i % 3) * 0.15}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Story block ─────────────────────────────────────────────────────────────
function StoryBlock({ label, icon, color, text }) {
  return (
    <div className={`border rounded-xl p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p
        className="text-sm text-gray-300 leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-100">$1</strong>'),
        }}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ClimateImpactStory({
  selectedLocation,
  currentYear,
  climateData,
  trendLabel,
}) {
  const [activeLang, setActiveLang] = useState(ACTIVE_LANGUAGES[0])
  const [playState,  setPlayState]  = useState(PLAY.IDLE)
  const [visible,    setVisible]    = useState(false)
  const utteranceRef = useRef(null)

  // Generate story from real data
  const story = useMemo(
    () => generateStory(selectedLocation, currentYear, climateData, trendLabel, activeLang.id),
    [selectedLocation, currentYear, climateData, trendLabel, activeLang.id]
  )

  // Fade-in animation on story change
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(t)
  }, [story])

  // Stop speech when key data changes
  useEffect(() => {
    window.speechSynthesis?.cancel()
    setPlayState(PLAY.IDLE)
  }, [selectedLocation, currentYear, activeLang])

  // Play narration
  const handlePlay = useCallback(() => {
    if (!story?.fullNarration) return
    window.speechSynthesis.cancel()
    const u      = new SpeechSynthesisUtterance(story.fullNarration)
    u.lang       = activeLang.bcp47
    u.rate       = activeLang.rate
    u.pitch      = activeLang.pitch
    const voice  = pickVoice(activeLang.bcp47)
    if (voice) u.voice = voice
    u.onstart   = () => setPlayState(PLAY.SPEAKING)
    u.onend     = () => setPlayState(PLAY.IDLE)
    u.onerror   = () => setPlayState(PLAY.IDLE)
    u.onpause   = () => setPlayState(PLAY.PAUSED)
    u.onresume  = () => setPlayState(PLAY.SPEAKING)
    utteranceRef.current = u
    window.speechSynthesis.speak(u)
  }, [story, activeLang])

  const handlePause  = () => { window.speechSynthesis.pause();  setPlayState(PLAY.PAUSED)   }
  const handleResume = () => { window.speechSynthesis.resume(); setPlayState(PLAY.SPEAKING) }
  const handleStop   = () => { window.speechSynthesis.cancel(); setPlayState(PLAY.IDLE)     }

  const isSpeaking = playState === PLAY.SPEAKING
  const isPaused   = playState === PLAY.PAUSED
  const isIdle     = playState === PLAY.IDLE

  const STORY_STEPS = [
    { label: 'What we observe',      icon: '🔍', key: 'observation', color: 'border-blue-500/30   bg-blue-500/5'  },
    { label: 'Possible explanation',  icon: '🧩', key: 'implication', color: 'border-amber-500/30  bg-amber-500/5' },
    { label: 'What this could mean',  icon: '📅', key: 'outlook',     color: 'border-red-500/30    bg-red-500/5'   },
  ]

  return (
    <div className="card animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="section-title mb-0">📖 Climate Impact Story</p>
          <p className="text-xs text-gray-600 mt-0.5">
            {selectedLocation
              ? `A data-driven summary for ${selectedLocation.name}, ${currentYear}`
              : 'Ground-level climate perspective'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Data-driven badge */}
          {selectedLocation && climateData && (
            <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded px-1.5 py-0.5 font-mono">
              ✦ AI-generated
            </span>
          )}
          {selectedLocation && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-xs text-emerald-400 font-medium">
              {selectedLocation.name}
            </div>
          )}
        </div>
      </div>

      {/* ── Story blocks ─────────────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity duration-500 mb-5 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {story
          ? STORY_STEPS.map(s => (
              <StoryBlock
                key={s.key}
                label={s.label}
                icon={s.icon}
                color={s.color}
                text={story[s.key]}
              />
            ))
          : STORY_STEPS.map(s => (
              <div key={s.key} className={`border rounded-xl p-4 ${s.color} animate-pulse`}>
                <div className="h-3 bg-white/5 rounded w-1/2 mb-3" />
                <div className="h-3 bg-white/5 rounded w-full mb-1.5" />
                <div className="h-3 bg-white/5 rounded w-4/5" />
              </div>
            ))
        }
      </div>

      {/* ── Voice Narration ──────────────────────────────────────────────── */}
      <div className="border-t border-white/5 pt-4">
        <div className="flex flex-wrap items-center gap-4">

          {/* Language toggle */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">🔊 Narration Language</p>
            <div className="flex gap-2">
              {ACTIVE_LANGUAGES.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setActiveLang(lang)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                    activeLang.id === lang.id
                      ? 'bg-cyan-500 border-cyan-500 text-[#0a0f1e] font-bold'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:border-cyan-500/40 hover:text-cyan-400'
                  }`}
                >
                  {lang.native}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-700 mt-1">
              Currently available in English and Hindi. More languages coming soon.
            </p>
          </div>

          {/* Playback controls */}
          {SPEECH_SUPPORTED ? (
            <div className="flex items-center gap-2 ml-auto">
              {selectedLocation && story ? (
                <>
                  {(isIdle || isPaused) && (
                    <button
                      onClick={isPaused ? handleResume : handlePlay}
                      className="flex items-center gap-1.5 btn-primary text-xs px-4 py-2"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21"/>
                      </svg>
                      {isPaused ? 'Resume' : 'Play'}
                    </button>
                  )}
                  {isSpeaking && (
                    <button
                      onClick={handlePause}
                      className="flex items-center gap-1.5 btn-primary text-xs px-4 py-2"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                      </svg>
                      Pause
                    </button>
                  )}
                  {!isIdle && (
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-1.5 btn-secondary text-xs px-3 py-2"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="2"/>
                      </svg>
                      Stop
                    </button>
                  )}
                  {/* Narrating indicator */}
                  {isSpeaking && (
                    <span className="flex items-center gap-1 text-xs text-cyan-400">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"/>
                      Narrating in {activeLang.native}…
                    </span>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-600">Select a city to enable narration</p>
              )}
            </div>
          ) : (
            <p className="ml-auto text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
              Voice not supported — try Chrome or Edge
            </p>
          )}
        </div>

        {/* Waveform */}
        <Waveform active={isSpeaking} />
      </div>
    </div>
  )
}
