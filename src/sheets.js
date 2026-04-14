// Avenue 88 Tools — Google Sheets Integration
// This sends data to Jackie's Google Sheet for lead tracking

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby3dHmwpGu5rQQCDOtk7hs6lh8r1xoi9iG1-5Lxvj3CydySxZXzD7wEveMT8O2O3OeO/exec";

export function sendToSheet(data) {
  try {
    // Use URL params via GET request — most reliable method for Google Apps Script
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      params.append(key, value);
    });
    fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`, {
      method: "GET",
      mode: "no-cors"
    });
  } catch (e) {
    console.log("Sheet logging failed:", e);
  }
}
