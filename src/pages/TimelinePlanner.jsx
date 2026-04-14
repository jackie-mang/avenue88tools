import { useState, useMemo } from "react";
import { sendToSheet } from "../sheets";

const C = { blue:"#2B88D8", blueHover:"#2477C0", blueDark:"#1E6AB5", blueLight:"#E8F2FC", bluePale:"#F0F7FF", white:"#FFFFFF", bg:"#F7F8FA", grey50:"#F9FAFB", grey100:"#F3F4F6", grey200:"#E5E7EB", grey300:"#D1D5DB", grey500:"#6B7280", grey600:"#4B5563", grey900:"#111827" };

function addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r}
function addWorkingDays(d,n){const r=new Date(d);let a=0;while(a<n){r.setDate(r.getDate()+1);if(r.getDay()!==0&&r.getDay()!==6)a++}return r}
function getNextWorkingDay(d){const r=new Date(d);r.setDate(r.getDate()+1);while(r.getDay()===0||r.getDay()===6)r.setDate(r.getDate()+1);return r}
function addWeeks(d,w){return addDays(d,w*7)}
function fmt(d){const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];const m=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return`${days[d.getDay()]}, ${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`}
function fmtShort(d){const m=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return`${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`}

const GUIDE=[
  {step:1,title:"Register Intent to Sell",points:["Register on HDB Resale Portal via Singpass. Valid 12 months, no fee.","Mandatory 7-day cooling-off period before OTP can be granted."]},
  {step:2,title:"Marketing & Viewings",points:["List on PropertyGuru, 99.co, co-broke network.","Sign Estate Agency Agreement (CEA-prescribed)."]},
  {step:3,title:"Grant OTP",points:["Seller grants OTP at agreed price. Buyer pays Option Fee (up to $1,000).","OTP valid 21 calendar days. Expiry at 4pm on 21st day.","Seller cannot offer flat to other buyers during this period."]},
  {step:4,title:"Buyer Submits Request for Value",points:["Must submit by next working day after OTP with scanned page 1 of OTP.","Result typically within 5 working days. Valid for 3 months.","Buyer must wait for outcome before exercising OTP.","If valuation < price, difference (COV) must be paid in cash."]},
  {step:5,title:"Buyer Exercises OTP",points:["Buyer pays Option Exercise Fee (up to $4,000). Total deposit: up to $5,000.","Must exercise before 4pm on 21st day. Both parties committed once exercised."]},
  {step:6,title:"Submit Resale Application",points:["Both parties submit on HDB Resale Portal. $80 admin fee per party.","Submission period agreed on page 4 of OTP. Second party within 7 days of first."]},
  {step:7,title:"HDB Acceptance (within 28 working days)",points:["HDB verifies eligibility, EIP/SPR quota, documents.","Acceptance ≠ Approval. 8-week completion clock starts from acceptance."]},
  {step:8,title:"Endorse Documents (~3 weeks after acceptance)",points:["HDB posts documents on My Flat Dashboard. Both parties endorse.","Buyer makes initial payment (stamp duty, down payment)."]},
  {step:9,title:"HDB Approval (~2 weeks after endorsement)",points:["Approval letter states completion appointment date.","Both parties may defer via MyRequest@HDB."]},
  {step:10,title:"Pre-Completion",points:["Settle Town Council S&CC, utilities. Prepare keys for handover."]},
  {step:11,title:"Completion (HDB Hub)",points:["Keys handed over. Seller receives proceeds after deductions.","CPF refunds processed within 15 working days."]}
];

export default function TimelinePlanner() {
  const [otpDate,setOtpDate]=useState("");
  const [submissionDays,setSubmissionDays]=useState(30);
  const [extensionMonths,setExtensionMonths]=useState(0);
  const [expandedStep,setExpandedStep]=useState(null);
  const [tracked,setTracked]=useState(false);

  const milestones=useMemo(()=>{
    if(!otpDate)return null;
    const otp=new Date(otpDate+"T00:00:00");
    const r=[
      {label:"Intent to Sell (register by)",date:addDays(otp,-7),note:"At least 7 days before OTP",icon:"📋"},
      {label:"OTP Granted",date:otp,note:"Buyer pays Option Fee (up to $1,000)",icon:"📝"},
      {label:"Request for Value (submit by)",date:getNextWorkingDay(otp),note:"Next working day after OTP",icon:"📤"},
      {label:"Valuation Result (est.)",date:addWorkingDays(otp,5),note:"Within 5 working days",icon:"🏠"},
      {label:"Exercise OTP (deadline)",date:addDays(otp,21),note:"By 4pm · Buyer pays up to $4,000",icon:"⏰"},
      {label:"Submit Resale Application (by)",date:addDays(addDays(otp,21),submissionDays),note:`${submissionDays}-day agreed period`,icon:"📄"},
      {label:"HDB Acceptance (est.)",date:addWorkingDays(addDays(addDays(otp,21),submissionDays),28),note:"Within 28 working days · 8-week clock starts",icon:"✅"},
      {label:"Endorse Documents (est.)",date:addWeeks(addWorkingDays(addDays(addDays(otp,21),submissionDays),28),3),note:"~3 weeks after acceptance",icon:"✍️"},
      {label:"HDB Approval (est.)",date:addWeeks(addWorkingDays(addDays(addDays(otp,21),submissionDays),28),5),note:"~2 weeks after endorsement",icon:"🏛️"},
      {label:"Completion / Keys (est.)",date:addWeeks(addWorkingDays(addDays(addDays(otp,21),submissionDays),28),8),note:extensionMonths>0?"8 weeks from acceptance · Extension begins":"8 weeks from acceptance · Earliest possible",icon:"🔑"}
    ];
    if(extensionMonths>0){
      r.push({label:`Extension Ends (${extensionMonths} month${extensionMonths>1?"s":""})`,date:addDays(addWeeks(addWorkingDays(addDays(addDays(otp,21),submissionDays),28),8),extensionMonths*30),note:"Seller must vacate · Buyer's MOP starts after this",icon:"🏡"});
    }
    return r;
  },[otpDate,submissionDays,extensionMonths]);

  if(milestones&&!tracked){setTracked(true);sendToSheet({type:"tool_usage",tool:"Timeline Planner",streetName:"",flatType:"",sizeSqm:"",floorLevel:"",resultShown:`OTP:${otpDate} Sub:${submissionDays}d Ext:${extensionMonths}m`,page:"Timeline Planner"})}

  const totalDays=milestones?Math.round((milestones[milestones.length-1].date-milestones[0].date)/(1000*60*60*24)):0;
  const totalMonths=milestones?(totalDays/30).toFixed(1):0;

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.grey900}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .6s ease-out both}
        .fi{width:100%;padding:13px 16px;border:1.5px solid ${C.grey200};border-radius:10px;font-size:15px;font-family:'DM Sans',sans-serif;background:#fff;outline:none;color:${C.grey900};transition:border-color .2s,box-shadow .2s}
        .fi:focus{border-color:${C.blue};box-shadow:0 0 0 3px rgba(43,136,216,.12)}
        select.fi{appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239CA3AF' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center}
        .ms-row{transition:background .2s}.ms-row:hover{background:${C.bluePale}}
        .guide-card{transition:all .2s;cursor:pointer;border:1px solid ${C.grey200}}.guide-card:hover{border-color:${C.blue}}
        .nav-link{color:${C.grey500};text-decoration:none;font-size:14px;font-weight:500;padding:8px 14px;border-radius:6px;transition:color .2s,background .2s}
        .nav-link:hover{color:${C.blue};background:${C.grey100}}
        .nav-active{color:${C.blue};font-weight:600}
      `}</style>

      {/* Nav */}
      <div style={{background:C.white,padding:"0 20px",position:"sticky",top:0,zIndex:100,borderBottom:`1px solid ${C.grey200}`}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:56}}>
          <a href="/" style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,textDecoration:"none"}}>Avenue 88</a>
          <div style={{display:"flex",gap:4}}>
            <a href="/" className="nav-link">Home</a>
            <a href="/timeline" className="nav-link nav-active">Timeline</a>
            <a href="/valuation" className="nav-link">Valuation</a>
            <a href="/" className="nav-link">Contact</a>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.blue},${C.blueDark})`,padding:"48px 20px 40px"}}>
        <div style={{maxWidth:720,margin:"0 auto"}}>
          <span style={{color:"rgba(255,255,255,0.8)",fontSize:12,fontWeight:600,letterSpacing:2,textTransform:"uppercase"}}>Avenue 88 · Tool</span>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,5vw,42px)",color:"#fff",lineHeight:1.2,marginTop:8,fontWeight:700}}>HDB Resale Timeline Planner</h1>
          <p style={{color:"rgba(255,255,255,0.85)",fontSize:16,marginTop:12}}>Enter your OTP date and we'll calculate every milestone for you.</p>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"36px 20px"}}>
        {/* Calculator */}
        <div style={{background:"#fff",borderRadius:16,border:`1px solid ${C.grey200}`,padding:28,boxShadow:"0 2px 12px rgba(0,0,0,0.03)",marginBottom:32}}>
          <h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>📅 Enter Your Details</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>OTP Grant Date *</label>
              <input className="fi" type="date" value={otpDate} onChange={e=>setOtpDate(e.target.value)}/>
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Submission Period</label>
              <select className="fi" value={submissionDays} onChange={e=>setSubmissionDays(Number(e.target.value))}>
                {[7,14,21,30,45,60,90].map(d=><option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Extension of Stay</label>
              <select className="fi" value={extensionMonths} onChange={e=>setExtensionMonths(Number(e.target.value))}>
                <option value={0}>No extension</option>
                <option value={1}>1 month</option>
                <option value={2}>2 months</option>
                <option value={3}>3 months (max)</option>
              </select>
            </div>
          </div>
          {extensionMonths>0&&(
            <div style={{marginTop:12,padding:"10px 14px",background:C.blueLight,borderRadius:8,border:`1px solid ${C.blue}33`}}>
              <p style={{fontSize:12,color:C.blueDark,lineHeight:1.5}}>⚠️ Extension requires: seller must have exercised OTP on next property or confirmed BTO key collection date. Must be declared during resale application. Buyer's MOP starts only after extension ends.</p>
            </div>
          )}
        </div>

        {/* Results */}
        {milestones&&(
          <div className="fade-up">
            <div style={{background:`linear-gradient(135deg,${C.blue},${C.blueDark})`,borderRadius:14,padding:"22px 28px",marginBottom:24,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
              <div>
                <div style={{color:"rgba(255,255,255,0.7)",fontSize:13,fontWeight:600}}>Estimated Total Duration</div>
                <div style={{color:"#fff",fontSize:28,fontWeight:800,fontFamily:"'Playfair Display',serif"}}>{totalDays} days (~{totalMonths} months)</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:"rgba(255,255,255,0.7)",fontSize:13,fontWeight:600}}>{extensionMonths>0?"OTP to Extension End":"OTP to Completion"}</div>
                <div style={{color:"#fff",fontSize:16,fontWeight:600}}>{fmtShort(milestones[1].date)} → {fmtShort(milestones[milestones.length-1].date)}</div>
              </div>
            </div>

            <div style={{background:"#fff",borderRadius:16,border:`1px solid ${C.grey200}`,overflow:"hidden"}}>
              <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.grey200}`,background:C.grey50}}>
                <h3 style={{fontSize:16,fontWeight:700}}>Your Milestone Dates</h3>
              </div>
              {milestones.map((m,i)=>(
                <div key={i} className="ms-row" style={{display:"grid",gridTemplateColumns:"44px 1fr auto",gap:14,padding:"16px 24px",borderBottom:i<milestones.length-1?`1px solid ${C.grey100}`:"none",alignItems:"center"}}>
                  <span style={{fontSize:24}}>{m.icon}</span>
                  <div>
                    <div style={{fontSize:15,fontWeight:600}}>{m.label}</div>
                    <div style={{fontSize:13,color:C.grey500,marginTop:2}}>{m.note}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:C.blue,background:C.blueLight,padding:"6px 14px",borderRadius:8,whiteSpace:"nowrap"}}>{fmt(m.date)}</div>
                </div>
              ))}
            </div>

            <div style={{marginTop:16,padding:"14px 18px",background:C.blueLight,borderRadius:10,border:`1px solid ${C.blue}22`}}>
              <p style={{fontSize:13,color:C.blueDark,lineHeight:1.6}}><strong>Note:</strong> Dates are estimated. Actual dates may vary due to public holidays, incomplete documentation, or HDB processing volume.</p>
            </div>

            <div style={{marginTop:24,background:"#fff",borderRadius:14,border:`1px solid ${C.grey200}`,padding:24,textAlign:"center"}}>
              <p style={{fontSize:15,color:C.grey500,marginBottom:14}}>Need help navigating your HDB sale?</p>
              <a href="/" style={{display:"inline-block",padding:"14px 32px",background:C.blue,color:"#fff",borderRadius:10,fontWeight:600,fontSize:15,textDecoration:"none"}}>Get a Free Consultation →</a>
            </div>
          </div>
        )}

        {/* Guide */}
        <div style={{marginTop:48}}>
          <span style={{color:C.blue,fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>Reference Guide</span>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(24px,4vw,32px)",marginTop:8,marginBottom:24,fontWeight:700}}>Complete HDB Resale Process</h2>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {GUIDE.map(s=>(
              <div key={s.step} className="guide-card" style={{background:"#fff",borderRadius:12,overflow:"hidden"}} onClick={()=>setExpandedStep(expandedStep===s.step?null:s.step)}>
                <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px"}}>
                  <div style={{width:32,height:32,borderRadius:8,background:expandedStep===s.step?C.blue:C.grey100,color:expandedStep===s.step?"#fff":C.grey500,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0,transition:"all .2s"}}>{s.step}</div>
                  <div style={{flex:1,fontSize:15,fontWeight:600}}>{s.title}</div>
                  <span style={{color:C.grey300,fontSize:18,transform:expandedStep===s.step?"rotate(180deg)":"rotate(0)",transition:"transform .2s"}}>▾</span>
                </div>
                {expandedStep===s.step&&(
                  <div style={{padding:"0 20px 18px 66px"}}>
                    {s.points.map((p,j)=>(
                      <div key={j} style={{fontSize:14,color:C.grey500,lineHeight:1.7,paddingLeft:14,position:"relative",marginBottom:4}}>
                        <span style={{position:"absolute",left:0,color:C.blue}}>•</span>{p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Key Amounts */}
        <div style={{marginTop:36,background:"#fff",borderRadius:14,border:`1px solid ${C.grey200}`,overflow:"hidden"}}>
          <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.grey200}`,background:C.grey50}}>
            <h3 style={{fontSize:16,fontWeight:700}}>Key Amounts Summary</h3>
          </div>
          {[["Option Fee","Up to $1,000"],["Option Exercise Fee","Up to $4,000"],["Resale Admin Fee","$80 per party"],["Agent Commission (seller)","Typically 2%"],["Legal / Conveyancing Fees","~$2,000 to $3,500"],["CPF Refund","Principal + accrued interest → CPF OA"]].map(([l,v],i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"13px 24px",borderBottom:i<5?`1px solid ${C.grey100}`:"none"}}>
              <span style={{fontSize:14,color:C.grey500}}>{l}</span>
              <span style={{fontSize:14,fontWeight:600}}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{background:C.grey100,padding:"28px 20px",textAlign:"center",marginTop:36,borderTop:`1px solid ${C.grey200}`}}>
        <div style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,marginBottom:6}}>Avenue 88</div>
        <div style={{color:C.grey500,fontSize:12}}>Huttons / Navis · © 2026 Avenue 88</div>
      </div>
    </div>
  );
}
