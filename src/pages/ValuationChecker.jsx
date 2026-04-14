import { useState, useCallback } from "react";
import { sendToSheet } from "../sheets";

const C = { blue:"#2B88D8", blueHover:"#2477C0", blueDark:"#1E6AB5", blueLight:"#E8F2FC", bluePale:"#F0F7FF", white:"#FFFFFF", bg:"#F7F8FA", grey50:"#F9FAFB", grey100:"#F3F4F6", grey200:"#E5E7EB", grey300:"#D1D5DB", grey500:"#6B7280", grey600:"#4B5563", grey900:"#111827" };
const API_URL="https://data.gov.sg/api/action/datastore_search";
const DATASET_ID="d_8b84c4ee58e3cfc0ece0d773c8ca6abc";
const FLAT_TYPES=["2 ROOM","3 ROOM","4 ROOM","5 ROOM","EXECUTIVE"];
const FLOOR_LEVELS=[{label:"Low (1–6)",adj:0},{label:"Mid (7–12)",adj:.02},{label:"High (13–18)",adj:.04},{label:"Very High (19+)",adj:.06}];

function fmt$(n){return"$"+Math.round(n).toLocaleString()}
function calcPsf(price,sqm){return Math.round(price/(sqm*10.764))}

export default function ValuationChecker(){
  const [fullAddress,setFullAddress]=useState("");
  const [flatType,setFlatType]=useState("");
  const [sizeSqm,setSizeSqm]=useState("");
  const [floor,setFloor]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [result,setResult]=useState(null);
  const [transactions,setTransactions]=useState([]);

  // Lead capture
  const [showModal,setShowModal]=useState(false);
  const [leadName,setLeadName]=useState("");
  const [leadPhone,setLeadPhone]=useState("");
  const [leadSubmitted,setLeadSubmitted]=useState(false);

  function extractStreet(addr){
    return addr.toUpperCase().trim().replace(/^\d+[A-Za-z]?\s+/,"").trim();
  }

  // Step 1: User clicks search → show lead capture modal
  const handleSearchClick=()=>{
    if(!fullAddress||!flatType)return;
    setShowModal(true);
  };

  // Step 2: User submits name/phone → fetch data
  const handleLeadSubmit=()=>{
    if(!leadName||!leadPhone)return;
    sendToSheet({type:"lead",name:leadName,phone:leadPhone,email:"",town:"",propertyType:flatType,helpWith:`Valuation: ${fullAddress.toUpperCase()}`,sourcePage:"Valuation Checker"});
    setLeadSubmitted(true);
    setShowModal(false);
    fetchData();
  };

  // Step 3: Fetch from API
  const fetchData=useCallback(async()=>{
    const streetOnly=extractStreet(fullAddress);
    if(!streetOnly){setError("Please enter a valid address.");return}
    setLoading(true);setError("");setResult(null);setTransactions([]);
    try{
      const q=JSON.stringify({street_name:streetOnly,flat_type:flatType});
      const url=`${API_URL}?resource_id=${DATASET_ID}&q=${encodeURIComponent(q)}&sort=month desc&limit=100`;
      const resp=await fetch(url);const data=await resp.json();
      if(!data.success||!data.result?.records?.length){setError("No transactions found. Check your address spelling (e.g. '591A ANG MO KIO ST 51').");setLoading(false);return}
      const records=data.result.records.filter(r=>r.flat_type===flatType);
      if(!records.length){setError(`No ${flatType} transactions found on "${streetOnly}".`);setLoading(false);return}
      processResults(records);
    }catch(err){setError("Unable to connect to HDB data. Please try again shortly.");console.error(err)}
    setLoading(false);
  },[fullAddress,flatType,sizeSqm,floor]);

  function processResults(records){
    records.sort((a,b)=>b.month.localeCompare(a.month));
    const now=new Date(),cutoff=`${now.getFullYear()-1}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const recent=records.filter(r=>r.month>=cutoff);
    const d=recent.length>=3?recent:records.slice(0,20);
    const prices=d.map(r=>parseFloat(r.resale_price));
    const psfVals=d.map(r=>calcPsf(parseFloat(r.resale_price),parseFloat(r.floor_area_sqm)));
    const avgPSF=Math.round(psfVals.reduce((a,b)=>a+b,0)/psfVals.length);
    const minPSF=Math.min(...psfVals),maxPSF=Math.max(...psfVals);
    const medianPrice=[...prices].sort((a,b)=>a-b)[Math.floor(prices.length/2)];
    const avgPrice=Math.round(prices.reduce((a,b)=>a+b,0)/prices.length);
    const userSize=parseFloat(sizeSqm);
    let eLow,eHigh,eMid;
    if(userSize>0){const sqft=userSize*10.764;eMid=Math.round(avgPSF*sqft/1000)*1000;eLow=Math.round(minPSF*sqft/1000)*1000;eHigh=Math.round(maxPSF*sqft/1000)*1000}
    else{eMid=Math.round(medianPrice/1000)*1000;eLow=Math.round(Math.min(...prices)/1000)*1000;eHigh=Math.round(Math.max(...prices)/1000)*1000}
    const fl=FLOOR_LEVELS.find(f=>f.label===floor);const flAdj=fl?fl.adj:0;const flNote=fl?(fl.adj>0?`${fl.label} (+${fl.adj*100}%)`:fl.label):"";
    eLow=Math.round(eLow*(1+flAdj)/1000)*1000;eMid=Math.round(eMid*(1+flAdj)/1000)*1000;eHigh=Math.round(eHigh*(1+flAdj)/1000)*1000;
    const s=d[0];
    setResult({eLow,eHigh,eMid,avgPSF,minPSF,maxPSF,avgPrice,medianPrice:Math.round(medianPrice),total:d.length,dateRange:`${d[d.length-1].month} to ${d[0].month}`,town:s.town,lease:s.lease_commence_date,remaining:s.remaining_lease,flNote,flAdj,street:s.street_name});
    sendToSheet({type:"tool_usage",tool:"Valuation Checker",streetName:fullAddress.toUpperCase(),flatType,sizeSqm:sizeSqm||"",floorLevel:floor||"",resultShown:`$${eLow.toLocaleString()}-$${eHigh.toLocaleString()} AvgPSF:$${avgPSF} ${d.length}txns`,page:"Valuation Checker"});
    setTransactions(records.slice(0,15).map(r=>({month:r.month,block:r.block,street:r.street_name,storey:r.storey_range,area:r.floor_area_sqm,price:parseFloat(r.resale_price),psf:calcPsf(parseFloat(r.resale_price),parseFloat(r.floor_area_sqm)),remaining:r.remaining_lease})));
  }

  const canSearch=fullAddress.trim().length>3&&flatType;

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.grey900}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.9) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .fade-up{animation:fadeUp .6s ease-out both}
        .scale-in{animation:scaleIn .5s ease-out both}
        .fi{width:100%;padding:13px 16px;border:1.5px solid ${C.grey200};border-radius:10px;font-size:15px;font-family:'DM Sans',sans-serif;background:#fff;outline:none;color:${C.grey900};transition:border-color .2s,box-shadow .2s}
        .fi:focus{border-color:${C.blue};box-shadow:0 0 0 3px rgba(43,136,216,.12)}
        .fi::placeholder{color:${C.grey300}}
        select.fi{appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239CA3AF' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center}
        .spinner{width:20px;height:20px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px}
        .tx-row{display:grid;grid-template-columns:70px 1fr 80px 80px 80px;gap:8px;padding:10px 16px;font-size:13px;align-items:center;border-bottom:1px solid ${C.grey100}}
        .tx-row:hover{background:${C.bluePale}}
        @media(max-width:600px){.tx-row{grid-template-columns:60px 1fr 65px 65px}.tx-hide{display:none}}
        .nav-link{color:${C.grey500};text-decoration:none;font-size:14px;font-weight:500;padding:8px 14px;border-radius:6px;transition:color .2s,background .2s}
        .nav-link:hover{color:${C.blue};background:${C.grey100}}
        .nav-active{color:${C.blue};font-weight:600}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px}
        .modal-box{background:#fff;border-radius:20px;padding:0;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:modalIn .3s ease-out;overflow:hidden}
      `}</style>

      {/* Lead Capture Modal */}
      {showModal&&(
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div style={{background:`linear-gradient(135deg,${C.blue},${C.blueDark})`,padding:"28px 28px 24px"}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#fff",marginBottom:6}}>Almost There!</h3>
              <p style={{color:"rgba(255,255,255,0.85)",fontSize:14,lineHeight:1.5}}>Enter your details to view the valuation results for <strong>{fullAddress.toUpperCase()}</strong></p>
            </div>
            <div style={{padding:"24px 28px 28px"}}>
              <div style={{display:"grid",gap:14}}>
                <div>
                  <label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Name *</label>
                  <input className="fi" placeholder="Your full name" value={leadName} onChange={e=>setLeadName(e.target.value)} autoFocus/>
                </div>
                <div>
                  <label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Phone Number *</label>
                  <input className="fi" placeholder="9XXX XXXX" value={leadPhone} onChange={e=>setLeadPhone(e.target.value)} type="tel"/>
                </div>
                <button onClick={handleLeadSubmit} disabled={!leadName||!leadPhone} style={{width:"100%",padding:14,background:(!leadName||!leadPhone)?C.grey300:C.blue,color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:(!leadName||!leadPhone)?"not-allowed":"pointer",transition:"background .2s",marginTop:4}}>
                  Show My Valuation →
                </button>
                <p style={{fontSize:12,color:C.grey300,textAlign:"center"}}>We respect your privacy. No spam, ever.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={{background:C.white,padding:"0 20px",position:"sticky",top:0,zIndex:100,borderBottom:`1px solid ${C.grey200}`}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:56}}>
          <a href="/" style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,textDecoration:"none"}}>Avenue 88</a>
          <div style={{display:"flex",gap:4}}>
            <a href="/" className="nav-link">Home</a>
            <a href="/timeline" className="nav-link">Timeline</a>
            <a href="/valuation" className="nav-link nav-active">Valuation</a>
            <a href="/" className="nav-link">Contact</a>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.blue},${C.blueDark})`,padding:"48px 20px 40px"}}>
        <div style={{maxWidth:720,margin:"0 auto"}}>
          <span style={{color:"rgba(255,255,255,0.8)",fontSize:12,fontWeight:600,letterSpacing:2,textTransform:"uppercase"}}>Avenue 88 · Tool</span>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,5vw,42px)",color:"#fff",lineHeight:1.2,marginTop:8,fontWeight:700}}>HDB Valuation Checker</h1>
          <p style={{color:"rgba(255,255,255,0.85)",fontSize:16,marginTop:12}}>Real transaction data from HDB. Updated monthly.</p>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"36px 20px"}}>
        {/* Form */}
        <div style={{background:"#fff",borderRadius:16,border:`1px solid ${C.grey200}`,padding:28,boxShadow:"0 2px 12px rgba(0,0,0,0.03)",marginBottom:32}}>
          <h3 style={{fontSize:18,fontWeight:700,marginBottom:6}}>🏠 Check Your Flat's Value</h3>
          <p style={{fontSize:13,color:C.grey500,marginBottom:20}}>Enter your full address to find real transacted prices from HDB's official records.</p>
          <div style={{display:"grid",gap:16}}>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Full Address *</label>
              <input className="fi" placeholder="e.g. 591A ANG MO KIO ST 51" value={fullAddress} onChange={e=>setFullAddress(e.target.value)} style={{fontSize:16,padding:"16px 18px",textTransform:"uppercase"}}/>
              <div style={{fontSize:11,color:C.grey300,marginTop:4}}>Enter your block number and street name</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div>
                <label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Flat Type *</label>
                <select className="fi" value={flatType} onChange={e=>setFlatType(e.target.value)}><option value="">Select type</option>{FLAT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
              </div>
              <div>
                <label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Size (sqm)</label>
                <input className="fi" type="number" placeholder="e.g. 93" value={sizeSqm} onChange={e=>setSizeSqm(e.target.value)}/>
                {sizeSqm&&parseFloat(sizeSqm)>0&&<div style={{fontSize:11,color:C.grey500,marginTop:4}}>≈ {Math.round(parseFloat(sizeSqm)*10.764)} sqft</div>}
              </div>
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Floor Level</label>
              <select className="fi" value={floor} onChange={e=>setFloor(e.target.value)}><option value="">Select floor (optional)</option>{FLOOR_LEVELS.map(f=><option key={f.label} value={f.label}>{f.label}</option>)}</select>
            </div>
            <button onClick={leadSubmitted?fetchData:handleSearchClick} disabled={!canSearch||loading} style={{width:"100%",padding:16,background:(!canSearch||loading)?C.grey300:C.blue,color:"#fff",border:"none",borderRadius:10,fontSize:16,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:(!canSearch||loading)?"not-allowed":"pointer",transition:"background .2s"}}>
              {loading?<><span className="spinner"/>Searching HDB records...</>:"Search Transactions →"}
            </button>
          </div>
        </div>

        {error&&<div className="fade-up" style={{padding:"16px 20px",background:"#FEF2F2",borderRadius:10,border:"1px solid #FECACA",marginBottom:24}}><p style={{fontSize:14,color:"#DC2626"}}>{error}</p></div>}

        {result&&(
          <div className="scale-in">
            <div style={{background:`linear-gradient(135deg,${C.blue},${C.blueDark})`,borderRadius:16,padding:32,marginBottom:24,textAlign:"center"}}>
              <div style={{color:"rgba(255,255,255,0.8)",fontSize:13,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Estimated Valuation Range</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(30px,6vw,46px)",color:"#fff",fontWeight:800,marginBottom:6}}>{fmt$(result.eLow)} — {fmt$(result.eHigh)}</div>
              <div style={{color:"rgba(255,255,255,0.7)",fontSize:14,marginBottom:4}}>Median: {fmt$(result.medianPrice)} · Avg PSF: ${result.avgPSF}</div>
              <div style={{color:"rgba(255,255,255,0.5)",fontSize:13,marginTop:4}}>{fullAddress.toUpperCase()} · {result.town} · {flatType} · {result.total} transactions</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:24}}>
              {[{label:"Avg PSF",value:`$${result.avgPSF}`,sub:`Range: $${result.minPSF}–$${result.maxPSF}`},{label:"Avg Price",value:fmt$(result.avgPrice),sub:`${result.total} transactions`},{label:"Data Period",value:result.dateRange,sub:"Most recent data"},{label:"Lease Start",value:result.lease,sub:`Remaining: ${result.remaining}`}].map((s,i)=>(
                <div key={i} style={{background:"#fff",borderRadius:12,padding:18,border:`1px solid ${C.grey200}`,textAlign:"center"}}>
                  <div style={{fontSize:12,color:C.grey500,fontWeight:600,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{s.label}</div>
                  <div style={{fontSize:18,fontWeight:700}}>{s.value}</div>
                  <div style={{fontSize:11,color:C.grey300,marginTop:2}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {result.flNote&&result.flAdj>0&&<div style={{padding:"12px 16px",background:C.blueLight,borderRadius:10,marginBottom:20,fontSize:13,color:C.blueDark}}>📊 Floor adjustment: {result.flNote}</div>}

            {transactions.length>0&&(
              <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.grey200}`,overflow:"hidden",marginBottom:24}}>
                <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.grey200}`,background:C.grey50}}>
                  <h4 style={{fontSize:15,fontWeight:700}}>Recent Transactions</h4>
                  <p style={{fontSize:12,color:C.grey500,marginTop:2}}>Source: HDB via data.gov.sg</p>
                </div>
                <div className="tx-row" style={{background:C.grey50,fontWeight:600,color:C.grey500,fontSize:11,textTransform:"uppercase",letterSpacing:.5}}>
                  <span>Month</span><span>Block / Street</span><span>Storey</span><span className="tx-hide">Area</span><span style={{textAlign:"right"}}>Price</span>
                </div>
                {transactions.map((tx,i)=>(
                  <div key={i} className="tx-row">
                    <span style={{color:C.grey500}}>{tx.month}</span>
                    <span style={{fontWeight:600}}>{tx.block} {tx.street}</span>
                    <span style={{color:C.grey500}}>{tx.storey}</span>
                    <span className="tx-hide" style={{color:C.grey500}}>{tx.area} sqm</span>
                    <span style={{textAlign:"right",fontWeight:700,color:C.blue}}>{fmt$(tx.price)}<br/><span style={{fontSize:11,fontWeight:500,color:C.grey500}}>${tx.psf} psf</span></span>
                  </div>
                ))}
              </div>
            )}

            <div style={{padding:"14px 18px",background:C.blueLight,borderRadius:10,border:`1px solid ${C.blue}22`,marginBottom:24}}>
              <p style={{fontSize:13,color:C.blueDark,lineHeight:1.6}}><strong>Disclaimer:</strong> Data from HDB via data.gov.sg. Prices are actual transacted prices and indicative only. This does not constitute a formal valuation.</p>
            </div>

            <div className="fade-up" style={{background:"#fff",borderRadius:16,border:`2px solid ${C.blue}`,padding:32,textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:12}}>🎯</div>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,marginBottom:10}}>Want a Detailed Analysis?</h3>
              <p style={{fontSize:15,color:C.grey500,lineHeight:1.6,maxWidth:440,margin:"0 auto 20px"}}>Our team will review your specific unit — block, floor, facing, condition — and give you a precise market valuation. Free, no obligations.</p>
              <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
                <a href="/" style={{display:"inline-block",padding:"14px 28px",background:C.blue,color:"#fff",borderRadius:10,fontWeight:600,fontSize:15,textDecoration:"none"}}>Get Free Valuation →</a>
                <a href="https://wa.me/+6580830688" target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"14px 28px",background:"#25D366",color:"#fff",borderRadius:10,fontWeight:600,fontSize:15,textDecoration:"none"}}>💬 WhatsApp Us</a>
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div style={{marginTop:48}}>
          <span style={{color:C.blue,fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>How It Works</span>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(24px,4vw,32px)",marginTop:8,marginBottom:24,fontWeight:700}}>Real Data, Real Transactions</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
            {[
              {icon:"🏛️",title:"Official HDB Data",desc:"Every transaction from HDB's official records on data.gov.sg, updated monthly."},
              {icon:"📍",title:"Street-Level Accuracy",desc:"Search by your exact street — not town-wide averages."},
              {icon:"📊",title:"PSF Analysis",desc:"Price per sqft calculated for each transaction for fair comparison."},
              {icon:"🏢",title:"Floor Adjustment",desc:"Higher floors command a premium. Market-based adjustments applied."},
              {icon:"📅",title:"Remaining Lease",desc:"Lease commencement and remaining lease shown for decay impact."},
              {icon:"🎯",title:"Expert Valuation",desc:"For precise valuation, our team analyses your specific unit in detail."}
            ].map((item,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:12,padding:22,border:`1px solid ${C.grey200}`}}>
                <span style={{fontSize:28,display:"block",marginBottom:10}}>{item.icon}</span>
                <h4 style={{fontSize:15,fontWeight:700,marginBottom:8}}>{item.title}</h4>
                <p style={{fontSize:13,color:C.grey500,lineHeight:1.6}}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{background:C.grey100,padding:"28px 20px",textAlign:"center",marginTop:36,borderTop:`1px solid ${C.grey200}`}}>
        <div style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,marginBottom:6}}>Avenue 88</div>
        <div style={{color:C.grey500,fontSize:12}}>Huttons / Navis · Data: HDB via data.gov.sg · © 2026 Avenue 88</div>
      </div>
    </div>
  );
}
