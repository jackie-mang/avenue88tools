# Avenue 88 Tools — HDB Upgrader Toolkit

## Pages
- `/` — Landing Page (lead capture hub)
- `/timeline` — HDB Resale Timeline Planner
- `/valuation` — HDB Valuation Checker

## Tech Stack
- React 18 + Vite
- React Router for page navigation
- data.gov.sg API for live HDB transaction data
- Google Sheets for lead tracking

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to vercel.com/new
3. Import the repository
4. Click Deploy
5. Add your custom domain in Settings > Domains

## Google Sheets Integration
The Google Apps Script URL is configured in `src/sheets.js`.
All leads and tool usage are logged to the connected Google Sheet.
