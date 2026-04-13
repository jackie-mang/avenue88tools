import { useState, useCallback } from "react";
import { sendToSheet } from "../sheets";

const API_URL = "https://data.gov.sg/api/action/datastore_search";
const DATASET_ID = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc";

const FLAT_TYPES = ["2 ROOM", "3 ROOM", "4 ROOM", "5 ROOM", "EXECUTIVE"];
const FLOOR_LEVELS = [
  { label: "Low (1–6)", value: "01 TO 03,04 TO 06", storeys: [1,6] },
  { label: "Mid (7–12)", value: "07 TO 09,10 TO 12", storeys: [7,12] },
  { label: "High (13–18)", value: "13 TO 15,16 TO 18", storeys: [13,18] },
  { label: "Very High (19+)", value: "19 TO 21,22 TO 24,25 TO 27,28 TO 30,31 TO 33,34 TO 36,37 TO 39,40 TO 42,43 TO 45,46 TO 48,49 TO 51", storeys: [19,99] }
];

function formatCurrency(num) {
  return "$" + Math.round(num).toLocaleString();
}

function parsePSF(price, areaSqm) {
  const sqft = areaSqm * 10.764;
  return Math.round(price / sqft);
}

export default function ValuationChecker() {
  const [streetName, setStreetName] = useState("");
  const [flatType, setFlatType] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [floor, setFloor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const fetchData = useCallback(async () => {
    if (!streetName || !flatType) return;
    setLoading(true);
    setError("");
    setResult(null);
    setTransactions([]);

    try {
      // Search by street name and flat type — get last 100 transactions
      const searchStreet = streetName.toUpperCase().trim();
      const query = JSON.stringify({ street_name: searchStreet, flat_type: flatType });
      const url = `${API_URL}?resource_id=${DATASET_ID}&q=${encodeURIComponent(query)}&sort=month desc&limit=100`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success || !data.result || !data.result.records || data.result.records.length === 0) {
        // Try a broader search with just street name keywords
        const keywords = searchStreet.split(" ").filter(w => w.length > 2).join(" ");
        const url2 = `${API_URL}?resource_id=${DATASET_ID}&q=${encodeURIComponent(keywords)}&sort=month desc&limit=200`;
        const response2 = await fetch(url2);
        const data2 = await response2.json();

        if (!data2.success || !data2.result || !data2.result.records || data2.result.records.length === 0) {
          setError("No transactions found for this address. Try a different street name (e.g. 'ANG MO KIO AVE 10' instead of full address).");
          setLoading(false);
          return;
        }

        // Filter results to match flat type and street
        const filtered = data2.result.records.filter(r =>
          r.flat_type === flatType &&
          r.street_name.toUpperCase().includes(searchStreet.split(" ").slice(-2).join(" "))
        );

        if (filtered.length === 0) {
          setError(`No ${flatType} transactions found near "${streetName}". Try entering just the street name (e.g. "ANG MO KIO ST 51").`);
          setLoading(false);
          return;
        }

        processResults(filtered);
      } else {
        // Filter to ensure flat_type matches (q is a full-text search)
        const filtered = data.result.records.filter(r => r.flat_type === flatType);
        if (filtered.length === 0) {
          setError(`No ${flatType} transactions found on "${streetName}". Try a nearby street or different flat type.`);
          setLoading(false);
          return;
        }
        processResults(filtered);
      }
    } catch (err) {
      setError("Unable to connect to HDB data. Please try again in a moment.");
      console.error(err);
    }
    setLoading(false);
  }, [streetName, flatType, sizeSqm, floor]);

  function processResults(records) {
    // Sort by month descending
    records.sort((a, b) => b.month.localeCompare(a.month));

    // Get last 12 months of data for valuation
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const recentStr = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, "0")}`;

    const recent = records.filter(r => r.month >= recentStr);
    const dataToUse = recent.length >= 3 ? recent : records.slice(0, 20); // fallback to last 20

    const prices = dataToUse.map(r => parseFloat(r.resale_price));
    const areas = dataToUse.map(r => parseFloat(r.floor_area_sqm));
    const psfValues = dataToUse.map((r, i) => parsePSF(prices[i], areas[i]));

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
    const avgPSF = psfValues.reduce((a, b) => a + b, 0) / psfValues.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minPSF = Math.min(...psfValues);
    const maxPSF = Math.max(...psfValues);

    // If user provided size, calculate adjusted estimate
    const userSize = parseFloat(sizeSqm);
    let estimatedLow, estimatedHigh, estimatedMid;

    if (userSize && userSize > 0) {
      const userSqft = userSize * 10.764;
      estimatedMid = Math.round(avgPSF * userSqft / 1000) * 1000;
      estimatedLow = Math.round(minPSF * userSqft / 1000) * 1000;
      estimatedHigh = Math.round(maxPSF * userSqft / 1000) * 1000;
    } else {
      estimatedMid = Math.round(medianPrice / 1000) * 1000;
      estimatedLow = Math.round(minPrice / 1000) * 1000;
      estimatedHigh = Math.round(maxPrice / 1000) * 1000;
    }

    // Floor adjustment
    const selectedFloor = FLOOR_LEVELS.find(f => f.label === floor);
    let floorAdj = 0;
    let floorNote = "";
    if (selectedFloor) {
      const [lo] = selectedFloor.storeys;
      if (lo >= 19) { floorAdj = 0.06; floorNote = "Very high floor (+6%)"; }
      else if (lo >= 13) { floorAdj = 0.04; floorNote = "High floor (+4%)"; }
      else if (lo >= 7) { floorAdj = 0.02; floorNote = "Mid floor (+2%)"; }
      else { floorAdj = 0; floorNote = "Low floor (baseline)"; }
    }

    estimatedLow = Math.round(estimatedLow * (1 + floorAdj) / 1000) * 1000;
    estimatedMid = Math.round(estimatedMid * (1 + floorAdj) / 1000) * 1000;
    estimatedHigh = Math.round(estimatedHigh * (1 + floorAdj) / 1000) * 1000;

    // Lease info from first record
    const sampleRecord = dataToUse[0];
    const leaseCommence = sampleRecord.lease_commence_date;
    const remainingLease = sampleRecord.remaining_lease;
    const town = sampleRecord.town;

    setResult({
      estimatedLow, estimatedHigh, estimatedMid,
      avgPSF: Math.round(avgPSF), minPSF, maxPSF,
      avgPrice: Math.round(avgPrice),
      medianPrice: Math.round(medianPrice),
      totalTransactions: dataToUse.length,
      dateRange: `${dataToUse[dataToUse.length - 1].month} to ${dataToUse[0].month}`,
      town, leaseCommence, remainingLease,
      floorNote, floorAdj,
      streetName: sampleRecord.street_name,
    });

    // Log to Google Sheets
    sendToSheet({
      type: "tool_usage",
      tool: "Valuation Checker",
      streetName: sampleRecord.street_name,
      flatType: flatType,
      sizeSqm: sizeSqm || "",
      floorLevel: floor || "",
      resultShown: `$${estimatedLow.toLocaleString()}–$${estimatedHigh.toLocaleString()} (Avg PSF: $${Math.round(avgPSF)}, ${dataToUse.length} txns)`,
      page: "Valuation Checker"
    });

    // Show individual transactions (last 10)
    setTransactions(records.slice(0, 15).map(r => ({
      month: r.month,
      block: r.block,
      street: r.street_name,
      storey: r.storey_range,
      area: r.floor_area_sqm,
      price: parseFloat(r.resale_price),
      psf: parsePSF(parseFloat(r.resale_price), parseFloat(r.floor_area_sqm)),
      model: r.flat_model,
      lease: r.remaining_lease
    })));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF7", fontFamily: "'DM Sans', sans-serif", color: "#1A1A1A" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-up { animation: fadeUp 0.6s ease-out both; }
        .scale-in { animation: scaleIn 0.5s ease-out both; }
        .form-input { width: 100%; padding: 14px 16px; border: 1.5px solid #D4D0C8; border-radius: 10px; font-size: 15px; font-family: 'DM Sans', sans-serif; background: #fff; transition: border-color 0.2s, box-shadow 0.2s; outline: none; color: #1A1A1A; }
        .form-input:focus { border-color: #1B5E8A; box-shadow: 0 0 0 3px rgba(27,94,138,0.1); }
        .form-input::placeholder { color: #A09E97; }
        select.form-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23888' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; }
        .calc-btn { width: 100%; padding: 16px; background: #1B5E8A; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: background 0.2s, transform 0.1s; }
        .calc-btn:hover { background: #164E74; }
        .calc-btn:active { transform: scale(0.98); }
        .calc-btn:disabled { background: #C8C5BC; cursor: not-allowed; }
        .spinner { width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px; }
        .tx-row { display: grid; grid-template-columns: 70px 1fr 80px 80px 80px; gap: 8px; padding: 10px 16px; font-size: 13px; align-items: center; border-bottom: 1px solid #F0EFEB; }
        .tx-row:hover { background: rgba(27,94,138,0.03); }
        @media (max-width: 600px) { .tx-row { grid-template-columns: 60px 1fr 65px 65px; } .tx-hide-mobile { display: none; } }
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(165deg, #0E3A5C 0%, #1B5E8A 100%)", padding: "48px 20px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 50%)" }} />
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>Avenue 88 · Tool</span>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 5vw, 42px)", color: "#fff", lineHeight: 1.2, marginTop: 8, fontWeight: 700 }}>
            HDB Valuation Checker
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 12, lineHeight: 1.5 }}>
            Real transaction data from HDB. Updated monthly.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 20px" }}>
        {/* Input Form */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8E6E0", padding: 28, boxShadow: "0 2px 16px rgba(0,0,0,0.04)", marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>🏠 Check Your Flat's Value</h3>
          <p style={{ fontSize: 13, color: "#8A877E", marginBottom: 20 }}>Enter your street name to find real transacted prices from HDB's official records.</p>

          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", marginBottom: 6, display: "block" }}>Street Name *</label>
              <input className="form-input" placeholder="e.g. ANG MO KIO ST 51" value={streetName} onChange={e => setStreetName(e.target.value)} style={{ fontSize: 16, padding: "16px 18px", textTransform: "uppercase" }} />
              <div style={{ fontSize: 11, color: "#A09E97", marginTop: 4 }}>Enter the street name as shown on your address (without block number)</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", marginBottom: 6, display: "block" }}>Flat Type *</label>
                <select className="form-input" value={flatType} onChange={e => setFlatType(e.target.value)}>
                  <option value="">Select type</option>
                  {FLAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", marginBottom: 6, display: "block" }}>Size (sqm)</label>
                <input className="form-input" type="number" placeholder="e.g. 93" min="30" max="200" value={sizeSqm} onChange={e => setSizeSqm(e.target.value)} />
                {sizeSqm && parseFloat(sizeSqm) > 0 && <div style={{ fontSize: 11, color: "#8A877E", marginTop: 4 }}>≈ {Math.round(parseFloat(sizeSqm) * 10.764)} sqft</div>}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", marginBottom: 6, display: "block" }}>Floor Level</label>
              <select className="form-input" value={floor} onChange={e => setFloor(e.target.value)}>
                <option value="">Select floor (optional)</option>
                {FLOOR_LEVELS.map(f => <option key={f.label} value={f.label}>{f.label}</option>)}
              </select>
            </div>

            <button className="calc-btn" disabled={!streetName || !flatType || loading} onClick={fetchData} style={{ marginTop: 4 }}>
              {loading ? <><span className="spinner" /> Searching HDB records...</> : "Search Transactions →"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="fade-up" style={{ padding: "16px 20px", background: "#FFF3F3", borderRadius: 10, border: "1px solid #FFCDD2", marginBottom: 24 }}>
            <p style={{ fontSize: 14, color: "#C62828" }}>{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="scale-in">
            {/* Valuation Range */}
            <div style={{ background: "linear-gradient(135deg, #0E3A5C, #1B5E8A)", borderRadius: 16, padding: 32, marginBottom: 24, textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                Estimated Valuation Range
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(30px, 6vw, 46px)", color: "#fff", fontWeight: 800, marginBottom: 6 }}>
                {formatCurrency(result.estimatedLow)} — {formatCurrency(result.estimatedHigh)}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 4 }}>
                Median: {formatCurrency(result.medianPrice)} · Avg PSF: ${result.avgPSF}
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>
                {result.town} · {result.streetName} · {flatType} · {result.totalTransactions} transactions
              </div>
            </div>

            {/* Key Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Avg PSF", value: `$${result.avgPSF}`, sub: `Range: $${result.minPSF}–$${result.maxPSF}` },
                { label: "Avg Price", value: formatCurrency(result.avgPrice), sub: `Based on ${result.totalTransactions} txns` },
                { label: "Data Period", value: result.dateRange, sub: "Most recent transactions" },
                { label: "Lease Start", value: result.leaseCommence, sub: `Remaining: ${result.remainingLease}` }
              ].map((s, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #E8E6E0", textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#8A877E", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#A09E97", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Floor adjustment note */}
            {result.floorNote && result.floorAdj > 0 && (
              <div style={{ padding: "12px 16px", background: "#E8F5E9", borderRadius: 10, marginBottom: 20, fontSize: 13, color: "#2E7D32" }}>
                📊 Floor adjustment applied: {result.floorNote} — estimate adjusted upward by {(result.floorAdj * 100)}%
              </div>
            )}

            {/* Transaction History */}
            {transactions.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E8E6E0", overflow: "hidden", marginBottom: 24 }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #E8E6E0", background: "#F8F7F4" }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700 }}>Recent Transactions</h4>
                  <p style={{ fontSize: 12, color: "#8A877E", marginTop: 2 }}>Source: HDB Resale Flat Prices (data.gov.sg)</p>
                </div>
                <div className="tx-row" style={{ background: "#F8F7F4", fontWeight: 600, color: "#6B6960", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <span>Month</span>
                  <span>Block / Street</span>
                  <span>Storey</span>
                  <span className="tx-hide-mobile">Area</span>
                  <span style={{ textAlign: "right" }}>Price</span>
                </div>
                {transactions.map((tx, i) => (
                  <div key={i} className="tx-row">
                    <span style={{ color: "#8A877E" }}>{tx.month}</span>
                    <span style={{ fontWeight: 600 }}>{tx.block} {tx.street}</span>
                    <span style={{ color: "#6B6960" }}>{tx.storey}</span>
                    <span className="tx-hide-mobile" style={{ color: "#6B6960" }}>{tx.area} sqm</span>
                    <span style={{ textAlign: "right", fontWeight: 700, color: "#1B5E8A" }}>
                      {formatCurrency(tx.price)}
                      <br /><span style={{ fontSize: 11, fontWeight: 500, color: "#8A877E" }}>${tx.psf} psf</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Disclaimer */}
            <div style={{ padding: "14px 18px", background: "#FFF8E1", borderRadius: 10, border: "1px solid #F5E6B8", marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: "#8B7355", lineHeight: 1.6 }}>
                <strong>Disclaimer:</strong> Data sourced from HDB via data.gov.sg under the Singapore Open Data Licence. Prices shown are actual transacted prices and should be taken as indicative only, as resale prices depend on many factors including unit condition, facing, renovations, and buyer/seller negotiation. This does not constitute a formal valuation.
              </p>
            </div>

            {/* CTA */}
            <div className="fade-up" style={{ background: "#fff", borderRadius: 16, border: "2px solid #1B5E8A", padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 10, color: "#1A1A1A" }}>Want a Detailed Analysis?</h3>
              <p style={{ fontSize: 15, color: "#6B6960", lineHeight: 1.6, maxWidth: 440, margin: "0 auto 20px" }}>
                Our team will review your specific unit — block, floor, facing, condition — and compare against the latest transactions to give you a precise market valuation. Free, no obligations.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="#" style={{ display: "inline-block", padding: "14px 28px", background: "#1B5E8A", color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: "none" }}>Get Free Valuation →</a>
                <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", background: "#25D366", color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: "none" }}>💬 WhatsApp Us</a>
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div style={{ marginTop: 48 }}>
          <span style={{ color: "#1B5E8A", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>How It Works</span>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(24px, 4vw, 32px)", marginTop: 8, marginBottom: 24, color: "#1A1A1A", fontWeight: 700 }}>Real Data, Real Transactions</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { icon: "🏛️", title: "Official HDB Data", desc: "Every transaction shown is from HDB's official records, published on data.gov.sg and updated monthly." },
              { icon: "📍", title: "Street-Level Accuracy", desc: "We search by your exact street name, so you see what flats on your street have actually sold for — not town-wide averages." },
              { icon: "📊", title: "PSF Analysis", desc: "We calculate the price per square foot for each transaction so you can compare across different unit sizes on the same street." },
              { icon: "🏢", title: "Floor Adjustment", desc: "Higher floors generally command a premium. We apply a floor-level adjustment based on market patterns." },
              { icon: "📅", title: "Remaining Lease", desc: "The lease commencement date and remaining lease are shown so you can factor in lease decay impact." },
              { icon: "🎯", title: "Expert Valuation", desc: "For a precise valuation of your specific unit, our team analyses block, facing, condition, and the latest comparable sales." }
            ].map((item, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 22, border: "1px solid #E8E6E0" }}>
                <span style={{ fontSize: 28, display: "block", marginBottom: 10 }}>{item.icon}</span>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#1A1A1A" }}>{item.title}</h4>
                <p style={{ fontSize: 13, color: "#6B6960", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#0E3A5C", padding: "28px 20px", textAlign: "center", marginTop: 36 }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Avenue 88 · Huttons / Navis</div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 6 }}>Data: HDB via data.gov.sg · © 2026 Avenue 88</div>
      </div>
    </div>
  );
}
