/**
 * Header.jsx
 * Top navigation bar with logo, title, subtitle, and live status badge.
 * Fixed at the top of the viewport for a dashboard feel.
 */

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-md bg-[#080d1a]/90">
      <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* ── Brand ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Animated globe icon */}
          <div className="relative flex items-center justify-center w-10 h-10">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-pulse-slow" />
            <svg
              className="w-6 h-6 text-cyan-400 relative z-10"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>

          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent leading-tight">
              Climate Time Machine
            </h1>
            <p className="text-xs text-gray-400 leading-tight hidden sm:block">
              Understanding how climate has changed in our cities — and what the future might hold.
            </p>
          </div>
        </div>

        {/* ── Status Badges ──────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Live Data</span>
          </div>
        </div>

      </div>
    </header>
  )
}
