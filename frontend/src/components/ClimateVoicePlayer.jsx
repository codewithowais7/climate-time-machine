/**
 * ClimateVoicePlayer.jsx
 * Narrates the AI climate insight using the Web Speech API.
 *
 * Architecture note:
 *   LANGUAGES is the single source of truth for all language config.
 *   To add a new language in the future:
 *     1. Add an entry to LANGUAGES with enabled: true
 *     2. Add a translation of the script in generateNarration()
 *   No other code needs to change.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Language registry ──────────────────────────────────────────────────────────
// Set enabled: false to define future languages without exposing them in the UI.
const LANGUAGES = [
  {
    id:      'en',
    label:   'English',
    native:  'English',
    bcp47:   'en-IN',           // prefer Indian English accent
    rate:    0.88,              // slightly slower = documentary feel
    pitch:   1.0,
    enabled: true,
  },
  {
    id:      'hi',
    label:   'Hindi',
    native:  'हिंदी',
    bcp47:   'hi-IN',
    rate:    0.85,
    pitch:   1.0,
    enabled: true,
  },
  // ── Future languages — add enabled: true to surface in the UI ────────────────
  { id: 'bn', label: 'Bengali',    native: 'বাংলা',     bcp47: 'bn-IN', rate: 0.87, pitch: 1.0, enabled: false },
  { id: 'ta', label: 'Tamil',      native: 'தமிழ்',      bcp47: 'ta-IN', rate: 0.87, pitch: 1.0, enabled: false },
  { id: 'mr', label: 'Marathi',    native: 'मराठी',      bcp47: 'mr-IN', rate: 0.87, pitch: 1.0, enabled: false },
  { id: 'te', label: 'Telugu',     native: 'తెలుగు',     bcp47: 'te-IN', rate: 0.87, pitch: 1.0, enabled: false },
  { id: 'gu', label: 'Gujarati',   native: 'ગુજરાતી',    bcp47: 'gu-IN', rate: 0.87, pitch: 1.0, enabled: false },
]

const ACTIVE_LANGUAGES = LANGUAGES.filter((l) => l.enabled)

// ─── Narration text generator ──────────────────────────────────────────────────
function generateNarration(selectedLocation, currentYear, langId) {
  if (!selectedLocation) return null

  const city     = selectedLocation.name
  const yearsAgo = currentYear - 1990
  const tempShift= ((yearsAgo / 60) * 1.8).toFixed(1)
  const isFuture = currentYear > new Date().getFullYear()

  if (langId === 'hi') {
    return isFuture
      ? `${city} के लिए ${currentYear} का जलवायु पूर्वानुमान। \
वर्ष 1990 की तुलना में औसत तापमान में लगभग ${tempShift} डिग्री सेल्सियस की वृद्धि हो सकती है। \
मानसून की अनिश्चितता और बढ़ते तापमान के कारण इस क्षेत्र में जलवायु जोखिम बढ़ सकता है। \
यह एक मॉडल-आधारित अनुमान है।`
      : `${city} की जलवायु, वर्ष ${currentYear}। \
1990 के आधार रेखा की तुलना में, तापमान में लगभग ${tempShift} डिग्री सेल्सियस की वृद्धि दर्ज की गई है। \
यह वृद्धि क्षेत्रीय शहरीकरण और वैश्विक जलवायु परिवर्तन दोनों के प्रभावों को दर्शाती है।`
  }

  // Default: English
  return isFuture
    ? `Climate forecast for ${city}, year ${currentYear}. \
      Under moderate warming scenarios, average temperatures could be approximately ${tempShift} degrees Celsius \
      above the 1990 baseline. Monsoon variability and heat stress are projected to increase, \
      posing growing challenges for communities in this region. This is a model-based projection.`
    : `Climate profile for ${city}, year ${currentYear}. \
      Over the decades since 1990, this region has recorded a gradual warming of approximately \
      ${tempShift} degrees Celsius. Rainfall patterns have grown more variable, \
      reflecting both local urbanisation and broader global climate shifts.`
}

// ─── Voice selection ────────────────────────────────────────────────────────────
function pickVoice(bcp47) {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  // 1. Exact locale match (e.g. hi-IN)
  let voice = voices.find((v) => v.lang === bcp47)
  // 2. Language prefix match (e.g. hi)
  if (!voice) voice = voices.find((v) => v.lang.startsWith(bcp47.split('-')[0]))
  // 3. Fallback to first available
  return voice ?? voices[0]
}

// ─── Playback states ────────────────────────────────────────────────────────────
const STATE = { IDLE: 'idle', SPEAKING: 'speaking', PAUSED: 'paused' }

export default function ClimateVoicePlayer({ selectedLocation, currentYear }) {
  const [activeLang, setActiveLang]   = useState(ACTIVE_LANGUAGES[0])
  const [playState, setPlayState]     = useState(STATE.IDLE)
  const [voicesReady, setVoicesReady] = useState(false)
  const utteranceRef = useRef(null)

  // Wait for voice list to load (async on some browsers)
  useEffect(() => {
    const load = () => setVoicesReady(true)
    if (window.speechSynthesis.getVoices().length > 0) {
      setVoicesReady(true)
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', load)
    }
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  // Stop playback whenever location / year / language changes
  useEffect(() => {
    window.speechSynthesis.cancel()
    setPlayState(STATE.IDLE)
  }, [selectedLocation, currentYear, activeLang])

  const handlePlay = useCallback(() => {
    const text = generateNarration(selectedLocation, currentYear, activeLang.id)
    if (!text) return

    window.speechSynthesis.cancel()

    const utterance       = new SpeechSynthesisUtterance(text)
    utterance.rate        = activeLang.rate
    utterance.pitch       = activeLang.pitch
    utterance.lang        = activeLang.bcp47
    const voice           = pickVoice(activeLang.bcp47)
    if (voice) utterance.voice = voice

    utterance.onstart  = () => setPlayState(STATE.SPEAKING)
    utterance.onend    = () => setPlayState(STATE.IDLE)
    utterance.onerror  = () => setPlayState(STATE.IDLE)
    utterance.onpause  = () => setPlayState(STATE.PAUSED)
    utterance.onresume = () => setPlayState(STATE.SPEAKING)

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [selectedLocation, currentYear, activeLang])

  const handlePause = () => {
    window.speechSynthesis.pause()
    setPlayState(STATE.PAUSED)
  }

  const handleResume = () => {
    window.speechSynthesis.resume()
    setPlayState(STATE.SPEAKING)
  }

  const handleStop = () => {
    window.speechSynthesis.cancel()
    setPlayState(STATE.IDLE)
  }

  const isSpeaking = playState === STATE.SPEAKING
  const isPaused   = playState === STATE.PAUSED
  const isIdle     = playState === STATE.IDLE

  const supported = 'speechSynthesis' in window

  return (
    <div className="card animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
          isSpeaking ? 'bg-cyan-500/30' : 'bg-cyan-500/10'
        }`}>
          <svg className={`w-5 h-5 text-cyan-400 ${isSpeaking ? 'animate-pulse' : ''}`}
               viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8"  y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <div>
          <p className="font-semibold text-gray-100 text-sm">Climate Voice Narrator</p>
          <p className="text-xs text-gray-500">
            {isSpeaking ? (
              <span className="text-cyan-400 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                Narrating in {activeLang.native}…
              </span>
            ) : isPaused ? (
              <span className="text-yellow-400">Paused</span>
            ) : (
              'Press play to hear the climate narrative'
            )}
          </p>
        </div>
      </div>

      {/* ── Language selector ────────────────────────────────────────────────── */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2 font-medium">Language</p>
        <div className="flex gap-2 flex-wrap">
          {ACTIVE_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setActiveLang(lang)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                activeLang.id === lang.id
                  ? 'bg-cyan-500 border-cyan-500 text-[#0a0f1e] font-bold shadow-glow'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:border-cyan-500/40 hover:text-cyan-400'
              }`}
            >
              {lang.native}
            </button>
          ))}
        </div>
        {/* Helper text */}
        <p className="text-[11px] text-gray-700 mt-2 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Currently available in English and Hindi. More languages coming in future updates.
        </p>
      </div>

      {/* ── No location empty state ──────────────────────────────────────────── */}
      {!selectedLocation && (
        <div className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-gray-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <p className="text-xs text-gray-500">Select a city first to enable narration.</p>
        </div>
      )}

      {/* ── Unsupported browser warning ──────────────────────────────────────── */}
      {!supported && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Your browser does not support the Web Speech API. Try Chrome or Edge.
        </div>
      )}

      {/* ── Playback controls ────────────────────────────────────────────────── */}
      {selectedLocation && supported && (
        <div className="flex items-center gap-3 mt-1">
          {/* Play / Resume */}
          {(isIdle || isPaused) && (
            <button
              onClick={isPaused ? handleResume : handlePlay}
              className="flex items-center gap-2 btn-primary text-sm px-5 py-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
              {isPaused ? 'Resume' : 'Play'}
            </button>
          )}

          {/* Pause */}
          {isSpeaking && (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 btn-primary text-sm px-5 py-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
              Pause
            </button>
          )}

          {/* Stop */}
          {!isIdle && (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 btn-secondary text-sm px-4 py-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
              Stop
            </button>
          )}
        </div>
      )}

      {/* ── Waveform animation while speaking ───────────────────────────────── */}
      {isSpeaking && (
        <div className="flex items-end gap-0.5 h-6 mt-4">
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-full bg-cyan-500/60 animate-pulse"
              style={{
                height:           `${25 + Math.abs(Math.sin(i * 0.6)) * 75}%`,
                animationDelay:   `${(i % 7) * 0.1}s`,
                animationDuration:`${0.5 + (i % 3) * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
