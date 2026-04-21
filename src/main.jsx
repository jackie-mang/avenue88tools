import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import TimelinePlanner from './pages/TimelinePlanner'
import ValuationChecker from './pages/ValuationChecker'
import UpgraderTimeline from './pages/UpgraderTimeline'
import FinancialSummary from './pages/FinancialSummary'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/timeline" element={<TimelinePlanner />} />
        <Route path="/valuation" element={<ValuationChecker />} />
        <Route path="/upgrader" element={<UpgraderTimeline />} />
        <Route path="/summary" element={<FinancialSummary />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
