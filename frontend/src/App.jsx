/**
 * App.jsx — Root application component
 * Manages global state: selected location and current year.
 * Passes state down to Dashboard via props.
 */

import { useState } from 'react'
import Dashboard from './pages/Dashboard'

function App() {
  // Global state shared across all dashboard components
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  return (
    <div className="min-h-screen bg-[#080d1a]">
      <Dashboard
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        currentYear={currentYear}
        onYearChange={setCurrentYear}
      />
    </div>
  )
}

export default App
