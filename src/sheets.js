// Avenue 88 Tools — Google Sheets Integration
// This sends data to Jackie's Google Sheet for lead tracking

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby3dHmwpGu5rQQCDOtk7hs6lh8r1xoi9iG1-5Lxvj3CydySxZXzD7wEveMT8O2O3OeO/exec";

export function sendToSheet(data) {
  try {
    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.log("Sheet logging failed:", e);
  }
}
