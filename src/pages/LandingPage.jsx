import { useState } from "react";
import { Link } from "react-router-dom";
import { sendToSheet } from "../sheets";

const TOWNS = [
  "Ang Mo Kio", "Bedok", "Bishan", "Bukit Batok", "Bukit Merah", "Bukit Panjang",
  "Choa Chu Kang", "Clementi", "Geylang", "Hougang", "Jurong East", "Jurong West",
  "Kallang/Whampoa", "Marine Parade", "Pasir Ris", "Punggol", "Queenstown",
  "Sembawang", "Sengkang", "Serangoon", "Tampines", "Toa Payoh", "Woodlands", "Yishun"
];

const PROPERTY_TYPES = ["3-Room HDB", "4-Room HDB", "5-Room HDB", "Executive HDB", "EC (after MOP)", "Private Condo"];
const HELP_OPTIONS = ["Selling my HDB", "Buying a resale HDB", "Upgrading to condo/EC", "Just exploring options"];

export default function LandingPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", town: "", propertyType: "", helpWith: "" });
  const [submitted, setSubmitted] = useState(false);
  const [activeToolTip, setActiveToolTip] = useState(null);

  const tools = [
    {
      icon: "📅",
      title: "HDB Resale Timeline Planner",
      desc: "Input your OTP date and get every milestone date calculated automatically — from Intent to Sell right through to Completion.",
      status: "Live",
      color: "#2A6B4F",
      link: "/timeline"
    },
    {
      icon: "🏠",
      title: "HDB Valuation Checker",
      desc: "Get an indicative valuation range for your flat based on real HDB transaction data from data.gov.sg.",
      status: "Live",
      color: "#1B5E8A",
      link: "/valuation"
    },
    {
      icon: "💰",
      title: "Sales Proceeds Calculator",
      desc: "Find out how much cash you walk away with after loan repayment, CPF refund, agent commission, and legal fees.",
      status: "Coming Soon",
      color: "#7A6432",
      link: null
    },
    {
      icon: "📊",
      title: "Affordability Calculator",
      desc: "Check your TDSR-based borrowing power, monthly repayments, and whether your upgrade plan is financially feasible.",
      status: "Coming Soon",
      color: "#6B3A5D",
      link: null
    }
  ];

  const handleSubmit = () => {
    if (!form.name || !form.phone) return;
    sendToSheet({
      type: "lead",
      name: form.name,
      phone: form.phone,
      email: form.email,
      town: form.town,
      propertyType: form.propertyType,
      helpWith: form.helpWith,
      sourcePage: "Landing Page"
    });
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF7", fontFamily: "'DM Sans', sans-serif", color: "#1A1A1A" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet" />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        .fade-up { animation: fadeUp 0.7s ease-out both; }
        .fade-up-d1 { animation: fadeUp 0.7s ease-out 0.1s both; }
        .fade-up-d2 { animation: fadeUp 0.7s ease-out 0.2s both; }
        .fade-up-d3 { animation: fadeUp 0.7s ease-out 0.3s both; }
        .fade-up-d4 { animation: fadeUp 0.7s ease-out 0.4s both; }
        .tool-card { transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: pointer; }
        .tool-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
        .form-input { width: 100%; padding: 14px 16px; border: 1.5px solid #D4D0C8; border-radius: 10px; font-size: 15px; font-family: 'DM Sans', sans-serif; background: #fff; transition: border-color 0.2s, box-shadow 0.2s; outline: none; color: #1A1A1A; }
        .form-input:focus { border-color: #2A6B4F; box-shadow: 0 0 0 3px rgba(42,107,79,0.1); }
        .form-input::placeholder { color: #A09E97; }
        select.form-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23888' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; }
        .submit-btn { width: 100%; padding: 16px; background: #2A6B4F; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: background 0.2s, transform 0.1s; }
        .submit-btn:hover { background: #235A42; }
        .submit-btn:active { transform: scale(0.98); }
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
      `}</style>

      {/* Hero Section */}
      <div style={{ background: "linear-gradient(165deg, #1A2F23 0%, #2A6B4F 50%, #1B5E8A 100%)", padding: "0 20px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", opacity: 0.5 }} />

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 0 50px", position: "relative", zIndex: 1 }}>
          <div className="fade-up" style={{ marginBottom: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>Avenue 88</span>
          </div>
          <h1 className="fade-up-d1" style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 6vw, 52px)", color: "#fff", lineHeight: 1.15, marginBottom: 20, fontWeight: 700 }}>
            Plan Your HDB Sale<br />With Confidence
          </h1>
          <p className="fade-up-d2" style={{ fontSize: "clamp(16px, 2.5vw, 19px)", color: "rgba(255,255,255,0.8)", lineHeight: 1.6, maxWidth: 560, marginBottom: 32 }}>
            Free tools built by agents who do this every day. Check your timeline, estimate your valuation, and understand your proceeds — before you commit.
          </p>
          <div className="fade-up-d3" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="#tools" style={{ display: "inline-block", padding: "14px 28px", background: "#fff", color: "#2A6B4F", borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: "none", transition: "transform 0.2s" }}>
              Explore Tools ↓
            </a>
            <a href="#contact" style={{ display: "inline-block", padding: "14px 28px", background: "rgba(255,255,255,0.12)", color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.25)", transition: "transform 0.2s" }}>
              Talk to Us
            </a>
          </div>
        </div>
      </div>

      {/* Tools Section */}
      <div id="tools" style={{ maxWidth: 800, margin: "0 auto", padding: "56px 20px" }}>
        <div style={{ marginBottom: 36 }}>
          <span style={{ color: "#2A6B4F", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Your Toolkit</span>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", marginTop: 8, color: "#1A1A1A", fontWeight: 700 }}>
            Everything You Need to Plan Your Sale
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {tools.map((tool, i) => {
            const CardWrapper = tool.link ? Link : "div";
            const cardProps = tool.link ? { to: tool.link, style: { textDecoration: "none", color: "inherit" } } : {};
            return (
              <CardWrapper key={i} {...cardProps}>
                <div className="tool-card" style={{
                  background: "#fff",
                  borderRadius: 14,
                  padding: 28,
                  border: "1px solid #E8E6E0",
                  position: "relative",
                  overflow: "hidden",
                  height: "100%"
                }}
                  onMouseEnter={() => setActiveToolTip(i)}
                  onMouseLeave={() => setActiveToolTip(null)}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: tool.color, opacity: activeToolTip === i ? 1 : 0.4, transition: "opacity 0.3s" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <span style={{ fontSize: 32 }}>{tool.icon}</span>
                    <span className="status-badge" style={{
                      background: tool.status === "Live" ? "#E8F5E9" : "#FFF3E0",
                      color: tool.status === "Live" ? "#2E7D32" : "#E65100"
                    }}>
                      {tool.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#1A1A1A" }}>{tool.title}</h3>
                  <p style={{ fontSize: 14, color: "#6B6960", lineHeight: 1.6 }}>{tool.desc}</p>
                  {tool.status === "Live" && tool.link && (
                    <div style={{ marginTop: 18 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: tool.color }}>
                        Try it now →
                      </span>
                    </div>
                  )}
                </div>
              </CardWrapper>
            );
          })}
        </div>
      </div>

      {/* Why Avenue 88 */}
      <div style={{ background: "#F0EFEB", padding: "56px 20px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <span style={{ color: "#2A6B4F", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Why Avenue 88</span>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", marginTop: 8, marginBottom: 16, color: "#1A1A1A", fontWeight: 700 }}>
            Your HDB Upgrader Specialists
          </h2>
          <p style={{ fontSize: 16, color: "#6B6960", lineHeight: 1.7, maxWidth: 600, marginBottom: 28 }}>
            Avenue 88 is a dedicated division of real estate professionals specialising in helping HDB owners upgrade to their next home — whether it's a resale flat, EC, or private condominium. We combine data-driven analysis with hands-on guidance at every step of your journey.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 28 }}>
            {[
              { icon: "📊", label: "Data-Driven Analysis", sub: "PrimeKey Analysis & OCTA framework to evaluate every upgrading option objectively" },
              { icon: "🏠", label: "HDB Upgrading Experts", sub: "Deep expertise across HDB resale, ECs, and private condos — we know the full upgrading path" },
              { icon: "🤝", label: "End-to-End Guidance", sub: "From selling your HDB to securing your next home, we handle the entire transition for you" }
            ].map((item, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #E8E6E0" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: "#8A877E", lineHeight: 1.5 }}>{item.sub}</div>
              </div>
            ))}
          </div>

          <a href="https://www.avenue88property.com/hdb-upgrading" target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", padding: "14px 28px", background: "#2A6B4F", color: "#fff",
            borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: "none", transition: "background 0.2s"
          }}>
            Learn More About Avenue 88 →
          </a>
        </div>
      </div>

      {/* Lead Capture Form */}
      <div id="contact" style={{ maxWidth: 800, margin: "0 auto", padding: "56px 20px" }}>
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E8E6E0", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ background: "linear-gradient(135deg, #1A2F23, #2A6B4F)", padding: "32px 32px 28px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(24px, 4vw, 32px)", color: "#fff", fontWeight: 700, marginBottom: 8 }}>
              Get Your Free Consultation
            </h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, lineHeight: 1.5 }}>
              Tell us about your property and we'll reach out with a personalised plan — no obligations.
            </p>
          </div>

          <div style={{ padding: "28px 32px 36px" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 12, color: "#2A6B4F" }}>
                  Thank You, {form.name}!
                </h3>
                <p style={{ fontSize: 15, color: "#6B6960", lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
                  We've received your details. Our team will reach out to you within 24 hours via WhatsApp or phone. In the meantime, feel free to explore our tools above.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", marginBottom: 6, display: "block" }}>Name *</label>
                    <input className="form-input" placeholder="Your full name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", marginBottom: 6, display: "block" }}>Phone *</label>
                    <input className="form-input" placeholder="9XXX XXXX" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", marginBottom: 6, display: "block" }}>Email</label>
                  <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", marginBottom: 6, display: "block" }}>Current Town</label>
                    <select className="form-input" value={form.town} onChange={e => setForm({...form, town: e.target.value})}>
                      <option value="">Select town</option>
                      {TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", marginBottom: 6, display: "block" }}>Property Type</label>
                    <select className="form-input" value={form.propertyType} onChange={e => setForm({...form, propertyType: e.target.value})}>
                      <option value="">Select type</option>
                      {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", marginBottom: 6, display: "block" }}>What do you need help with?</label>
                  <select className="form-input" value={form.helpWith} onChange={e => setForm({...form, helpWith: e.target.value})}>
                    <option value="">Select one</option>
                    {HELP_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <button className="submit-btn" onClick={handleSubmit} style={{ marginTop: 4 }}>
                  Get My Free Consultation →
                </button>
                <p style={{ fontSize: 12, color: "#A09E97", textAlign: "center", marginTop: 4 }}>
                  We respect your privacy. No spam, ever.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#1A2F23", padding: "36px 20px", textAlign: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500 }}>
          Avenue 88 · Huttons / Navis · CEA Licence No. L3008899K
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 8 }}>
          © 2026 Avenue 88. All rights reserved.
        </div>
      </div>
    </div>
  );
}
