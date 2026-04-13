import { useState, useMemo } from "react";
import { sendToSheet } from "../sheets";

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addWorkingDays(date, days) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

function getNextWorkingDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

function fmt(date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function fmtShort(date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const GUIDE_STEPS = [
  {
    step: 1, title: "Register Intent to Sell",
    points: [
      "Seller registers Intent to Sell on HDB Resale Portal via Singpass.",
      "Valid for 12 months. No fee involved.",
      "Mandatory 7-day cooling-off period before OTP can be granted."
    ]
  },
  {
    step: 2, title: "Marketing & Viewings",
    points: [
      "List property on portals (PropertyGuru, 99.co, etc.) and co-broke network.",
      "Arrange viewings and negotiate with potential buyers.",
      "Sign Estate Agency Agreement with appointed agent (CEA-prescribed)."
    ]
  },
  {
    step: 3, title: "Grant Option to Purchase (OTP)",
    points: [
      "Seller grants OTP to buyer at the agreed resale price.",
      "Buyer pays Option Fee of up to $1,000 (negotiable).",
      "OTP is valid for 21 calendar days (including weekends and public holidays).",
      "Expiry time is standardised at 4pm on the 21st day.",
      "Seller cannot offer the flat to any other buyer during this period."
    ]
  },
  {
    step: 4, title: "Buyer Submits Request for Value",
    points: [
      "Buyer (or their agent) must submit Request for Value to HDB by the next working day after OTP is granted.",
      "A scanned copy of page 1 of the OTP is required.",
      "Seller must allow the HDB-assigned valuer to inspect the flat within 3 working days if required.",
      "Result is typically available within 10 working days.",
      "Request for Value result is valid for 3 months.",
      "Buyer must wait for the outcome before exercising the OTP.",
      "If valuation is lower than the agreed price, the difference (COV) must be paid in cash."
    ]
  },
  {
    step: 5, title: "Buyer Exercises OTP",
    points: [
      "Buyer signs on the acceptance section and pays Option Exercise Fee of up to $4,000.",
      "Total deposit: up to $5,000 (Option Fee + Option Exercise Fee).",
      "Must be exercised before 4pm on the 21st calendar day from OTP grant date.",
      "Once exercised, both parties are legally committed.",
      "If not exercised, OTP expires, seller keeps Option Fee."
    ]
  },
  {
    step: 6, title: "Submit Resale Application",
    points: [
      "Both buyer and seller submit their portions on the HDB Resale Portal.",
      "Submission period is mutually agreed and stated on page 4 of the OTP.",
      "Second party must submit within 7 calendar days of the first.",
      "Non-refundable admin fee of $80 per party.",
      "If second party fails to submit within 7 days, application is cancelled."
    ]
  },
  {
    step: 7, title: "HDB Acceptance (within 28 working days)",
    points: [
      "HDB verifies eligibility, checks EIP/SPR quota, reviews documents.",
      "If in order, HDB notifies both parties via SMS/email within 28 working days.",
      "Acceptance ≠ Approval.",
      "The 8-week completion timeline starts from this acceptance date."
    ]
  },
  {
    step: 8, title: "Endorse Documents (~3 weeks after acceptance)",
    points: [
      "~3 weeks after acceptance, HDB posts resale documents on My Flat Dashboard.",
      "Both parties notified via SMS to log in and endorse.",
      "Buyer makes initial payment (stamp duty, down payment).",
      "Must endorse within given timeframe or application may be cancelled."
    ]
  },
  {
    step: 9, title: "HDB Approval (~2 weeks after endorsement)",
    points: [
      "~2 weeks after endorsement, HDB grants approval.",
      "Approval letter states the completion appointment date.",
      "Both parties may mutually agree to defer via MyRequest@HDB."
    ]
  },
  {
    step: 10, title: "Pre-Completion",
    points: [
      "Settle all outstanding Town Council S&CC charges.",
      "Settle all outstanding utility bills (SP Group).",
      "Arrange disconnection or transfer of utilities.",
      "Prepare all sets of keys for handover."
    ]
  },
  {
    step: 11, title: "Resale Completion (HDB Hub)",
    points: [
      "Both parties (or lawyers) attend the completion appointment.",
      "Keys handed over. Flat officially changes ownership.",
      "Seller receives proceeds after deductions: loan, CPF refund, commission, legal fees.",
      "CPF refunds processed within 15 working days."
    ]
  }
];

export default function TimelinePlanner() {
  const [otpDate, setOtpDate] = useState("");
  const [submissionDays, setSubmissionDays] = useState(30);
  const [expandedStep, setExpandedStep] = useState(null);
  const [tracked, setTracked] = useState(false);

  const milestones = useMemo(() => {
    if (!otpDate) return null;
    const otp = new Date(otpDate + "T00:00:00");

    const intentToSell = addDays(otp, -7);
    const requestForValue = getNextWorkingDay(otp);
    const valuationResult = addWorkingDays(otp, 10);
    const exerciseDeadline = addDays(otp, 21);
    const resaleApplication = addDays(exerciseDeadline, submissionDays);
    const hdbAcceptance = addWorkingDays(resaleApplication, 28);
    const endorsement = addWeeks(hdbAcceptance, 3);
    const hdbApproval = addWeeks(endorsement, 2);
    const completion = addWeeks(hdbAcceptance, 8);

    return [
      { label: "Intent to Sell (register by)", date: intentToSell, note: "At least 7 days before OTP", color: "#8B7355", icon: "📋" },
      { label: "OTP Granted", date: otp, note: "Buyer pays Option Fee (up to $1,000)", color: "#2A6B4F", icon: "📝" },
      { label: "Request for Value (submit by)", date: requestForValue, note: "Next working day after OTP", color: "#1B5E8A", icon: "📤" },
      { label: "Valuation Result (est.)", date: valuationResult, note: "Within 10 working days", color: "#1B5E8A", icon: "🏠" },
      { label: "Exercise OTP (deadline)", date: exerciseDeadline, note: "By 4pm · Buyer pays up to $4,000", color: "#C25E3A", icon: "⏰" },
      { label: "Submit Resale Application (by)", date: resaleApplication, note: `${submissionDays}-day agreed period`, color: "#7A6432", icon: "📄" },
      { label: "HDB Acceptance (est.)", date: hdbAcceptance, note: "Within 28 working days · 8-week clock starts", color: "#6B3A5D", icon: "✅" },
      { label: "Endorse Documents (est.)", date: endorsement, note: "~3 weeks after acceptance", color: "#6B3A5D", icon: "✍️" },
      { label: "HDB Approval (est.)", date: hdbApproval, note: "~2 weeks after endorsement", color: "#6B3A5D", icon: "🏛️" },
      { label: "Completion / Keys (est.)", date: completion, note: "8 weeks from acceptance · Earliest possible date", color: "#2A6B4F", icon: "🔑" }
    ];
  }, [otpDate, submissionDays]);

  // Track tool usage once when milestones first appear
  if (milestones && !tracked) {
    setTracked(true);
    sendToSheet({
      type: "tool_usage",
      tool: "Timeline Planner",
      streetName: "",
      flatType: "",
      sizeSqm: "",
      floorLevel: "",
      resultShown: `OTP: ${otpDate}, Submission: ${submissionDays} days`,
      page: "Timeline Planner"
    });
  }

  const totalDays = milestones ? Math.round((milestones[milestones.length - 1].date - milestones[0].date) / (1000 * 60 * 60 * 24)) : 0;
  const totalMonths = milestones ? (totalDays / 30).toFixed(1) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF7", fontFamily: "'DM Sans', sans-serif", color: "#1A1A1A" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet" />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.6s ease-out both; }
        .form-input { width: 100%; padding: 14px 16px; border: 1.5px solid #D4D0C8; border-radius: 10px; font-size: 15px; font-family: 'DM Sans', sans-serif; background: #fff; transition: border-color 0.2s, box-shadow 0.2s; outline: none; color: #1A1A1A; }
        .form-input:focus { border-color: #2A6B4F; box-shadow: 0 0 0 3px rgba(42,107,79,0.1); }
        .milestone-row { transition: background 0.2s; }
        .milestone-row:hover { background: rgba(42,107,79,0.03); }
        .guide-card { transition: all 0.2s; cursor: pointer; border: 1px solid #E8E6E0; }
        .guide-card:hover { border-color: #C8C5BC; }
        select.form-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23888' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; }
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(165deg, #1A2F23 0%, #2A6B4F 100%)", padding: "48px 20px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M20 0v40M0 20h40'/%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>Avenue 88 · Tool</span>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 5vw, 42px)", color: "#fff", lineHeight: 1.2, marginTop: 8, fontWeight: 700 }}>
            HDB Resale Timeline Planner
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 12, lineHeight: 1.5 }}>
            Enter your OTP date and we'll calculate every milestone for you.
          </p>
        </div>
      </div>

      {/* Calculator */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 20px" }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8E6E0", padding: 28, boxShadow: "0 2px 16px rgba(0,0,0,0.04)", marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#1A1A1A" }}>📅 Enter Your Details</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", marginBottom: 6, display: "block" }}>OTP Grant Date *</label>
              <input
                className="form-input"
                type="date"
                value={otpDate}
                onChange={e => setOtpDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", marginBottom: 6, display: "block" }}>Resale Submission Period</label>
              <select className="form-input" value={submissionDays} onChange={e => setSubmissionDays(Number(e.target.value))}>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={21}>21 days</option>
                <option value={30}>30 days</option>
                <option value={45}>45 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {milestones && (
          <div className="fade-up">
            {/* Summary Banner */}
            <div style={{ background: "linear-gradient(135deg, #2A6B4F, #1B5E8A)", borderRadius: 14, padding: "22px 28px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600 }}>Estimated Total Duration</div>
                <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>{totalDays} days (~{totalMonths} months)</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600 }}>OTP to Completion</div>
                <div style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>{fmtShort(milestones[1].date)} → {fmtShort(milestones[milestones.length - 1].date)}</div>
              </div>
            </div>

            {/* Milestone List */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8E6E0", overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #E8E6E0", background: "#F8F7F4" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>Your Milestone Dates</h3>
              </div>
              {milestones.map((m, i) => (
                <div key={i} className="milestone-row" style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr auto",
                  gap: 14,
                  padding: "16px 24px",
                  borderBottom: i < milestones.length - 1 ? "1px solid #F0EFEB" : "none",
                  alignItems: "center"
                }}>
                  <span style={{ fontSize: 24 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{m.label}</div>
                    <div style={{ fontSize: 13, color: "#8A877E", marginTop: 2 }}>{m.note}</div>
                  </div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: m.color,
                    background: `${m.color}12`,
                    padding: "6px 14px",
                    borderRadius: 8,
                    whiteSpace: "nowrap"
                  }}>
                    {fmt(m.date)}
                  </div>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: 16, padding: "14px 18px", background: "#FFF8E1", borderRadius: 10, border: "1px solid #F5E6B8" }}>
              <p style={{ fontSize: 13, color: "#8B7355", lineHeight: 1.6 }}>
                <strong>Note:</strong> Dates are estimated based on standard HDB processing timelines. Actual dates may vary due to public holidays, incomplete documentation, or HDB processing volume. The completion date shown is the earliest possible — both parties may mutually agree to defer.
              </p>
            </div>

            {/* CTA */}
            <div style={{ marginTop: 24, background: "#fff", borderRadius: 14, border: "1px solid #E8E6E0", padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 15, color: "#6B6960", marginBottom: 14 }}>Need help navigating your HDB sale?</p>
              <a href="#" style={{ display: "inline-block", padding: "14px 32px", background: "#2A6B4F", color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: "none" }}>
                Get a Free Consultation →
              </a>
            </div>
          </div>
        )}

        {/* Full Step-by-Step Guide */}
        <div style={{ marginTop: 48 }}>
          <span style={{ color: "#2A6B4F", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Reference Guide</span>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(24px, 4vw, 32px)", marginTop: 8, marginBottom: 24, color: "#1A1A1A", fontWeight: 700 }}>
            Complete HDB Resale Process
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {GUIDE_STEPS.map((s) => (
              <div key={s.step} className="guide-card" style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}
                onClick={() => setExpandedStep(expandedStep === s.step ? null : s.step)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: expandedStep === s.step ? "#2A6B4F" : "#F0EFEB",
                    color: expandedStep === s.step ? "#fff" : "#6B6960",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                    transition: "all 0.2s"
                  }}>
                    {s.step}
                  </div>
                  <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{s.title}</div>
                  <span style={{ color: "#A09E97", fontSize: 18, transform: expandedStep === s.step ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
                </div>
                {expandedStep === s.step && (
                  <div style={{ padding: "0 20px 18px 66px" }}>
                    {s.points.map((p, j) => (
                      <div key={j} style={{ fontSize: 14, color: "#6B6960", lineHeight: 1.7, paddingLeft: 14, position: "relative", marginBottom: 4 }}>
                        <span style={{ position: "absolute", left: 0, color: "#C8C5BC" }}>•</span>
                        {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Key Amounts */}
        <div style={{ marginTop: 36, background: "#fff", borderRadius: 14, border: "1px solid #E8E6E0", overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #E8E6E0", background: "#F8F7F4" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Key Amounts Summary</h3>
          </div>
          {[
            ["Option Fee", "Up to $1,000"],
            ["Option Exercise Fee", "Up to $4,000"],
            ["Resale Application Admin Fee", "$80 per party"],
            ["Agent Commission (seller)", "Typically 2% of sale price"],
            ["Legal / Conveyancing Fees", "~$2,000 to $3,500"],
            ["CPF Refund", "Principal + accrued interest → CPF OA"]
          ].map(([label, val], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "13px 24px", borderBottom: i < 5 ? "1px solid #F0EFEB" : "none" }}>
              <span style={{ fontSize: 14, color: "#6B6960" }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#1A2F23", padding: "28px 20px", textAlign: "center", marginTop: 36 }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Avenue 88 · Huttons / Navis</div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 6 }}>© 2026 Avenue 88. All rights reserved.</div>
      </div>
    </div>
  );
}
