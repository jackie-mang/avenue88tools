import { useState, useMemo } from "react";
import { sendToSheet } from "../sheets";

const C = { blue:"#2B88D8", blueHover:"#2477C0", blueDark:"#1E6AB5", blueLight:"#E8F2FC", bluePale:"#F0F7FF", white:"#FFFFFF", bg:"#F7F8FA", grey50:"#F9FAFB", grey100:"#F3F4F6", grey200:"#E5E7EB", grey300:"#D1D5DB", grey500:"#6B7280", grey600:"#4B5563", grey900:"#111827", orange:"#E67E22", orangeDark:"#C66A15", orangeLight:"#FFF5EB", orangeBorder:"#F5D5A8", red:"#DC2626", redLight:"#FEF2F2", green:"#16A34A", greenLight:"#F0FDF4" };

function addD(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r}
function addWD(d,n){const r=new Date(d);let a=0;while(a<n){r.setDate(r.getDate()+1);if(r.getDay()!==0&&r.getDay()!==6)a++}return r}
function nextWD(d){const r=new Date(d);r.setDate(r.getDate()+1);while(r.getDay()===0||r.getDay()===6)r.setDate(r.getDate()+1);return r}
function addW(d,w){return addD(d,w*7)}
function pad(n){return n<10?"0"+n:n}
function fmt(d){const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return`${days[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`}
function fmtS(d){return`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`}
function daysBetween(a,b){return Math.round((b-a)/(1000*60*60*24))}

export default function UpgraderTimeline(){
  const [mode,setMode]=useState("");
  const [startDate,setStartDate]=useState("");
  const [safetyMode,setSafetyMode]=useState("after_hdb_exercise"); // "after_hdb_exercise" or "after_hdb_acceptance"
  // HDB inputs
  const [hdbSubmission,setHdbSubmission]=useState(30);
  const [extension,setExtension]=useState(3);
  // Private inputs
  const [pvtExercisePeriod,setPvtExercisePeriod]=useState(14);
  const [pvtExercisePeriodBF,setPvtExercisePeriodBF]=useState(90);
  const [pvtCompletion,setPvtCompletion]=useState(10);

  const timeline=useMemo(()=>{
    if(!mode||!startDate)return null;
    let hdbOTP,hdbExercise,pvtOTP,pvtExercise,hdbAcceptance;
    if(mode==="sell_first"){
      hdbOTP=new Date(startDate+"T00:00:00");
      hdbExercise=addD(hdbOTP,21);
      // Calculate HDB acceptance (need for safety mode)
      const resaleAppTmp=addD(hdbExercise,hdbSubmission);
      hdbAcceptance=addWD(resaleAppTmp,28);
      if(safetyMode==="after_hdb_acceptance"){
        pvtOTP=addD(hdbAcceptance,1);
      } else {
        pvtOTP=addD(hdbExercise,1);
      }
      pvtExercise=addD(pvtOTP,pvtExercisePeriod);
    } else {
      pvtOTP=new Date(startDate+"T00:00:00");
      pvtExercise=addD(pvtOTP,pvtExercisePeriodBF);
      if(safetyMode==="after_hdb_acceptance"){
        // Work backwards: HDB Acceptance must be before Private Exercise
        // Acceptance = Exercise + submission + 28WD
        // So: Exercise = Acceptance - 28WD - submission
        // Acceptance should be 1 day before Private Exercise
        hdbAcceptance=addD(pvtExercise,-1);
        // Work backwards to find HDB Exercise
        // Approximate: 28 working days ≈ 40 calendar days
        const hdbExerciseBack=addD(hdbAcceptance,-40-hdbSubmission);
        hdbExercise=hdbExerciseBack;
        hdbOTP=addD(hdbExercise,-21);
      } else {
        hdbExercise=addD(pvtExercise,-1);
        hdbOTP=addD(hdbExercise,-21);
        const resaleAppTmp=addD(hdbExercise,hdbSubmission);
        hdbAcceptance=addWD(resaleAppTmp,28);
      }
    }
    const intentToSell=addD(hdbOTP,-7);
    const requestForValue=nextWD(hdbOTP);
    const valuationResult=addWD(hdbOTP,5);
    const resaleApp=addD(hdbExercise,hdbSubmission);
    // Recalculate acceptance after any adjustments
    hdbAcceptance=addWD(resaleApp,28);
    const hdbEndorsement=addW(hdbAcceptance,3);
    const hdbApproval=addW(hdbEndorsement,2);
    const hdbCompletionDate=addW(hdbAcceptance,8);
    const extensionEnd=extension>0?addD(hdbCompletionDate,extension*30):hdbCompletionDate;
    const pvtCompletionDate=addW(pvtExercise,pvtCompletion);
    const bsdDue=addD(pvtExercise,14);

    const absdSafe=hdbExercise<pvtExercise;
    const hdbApprovalBeforePvtCompletion=hdbApproval<=pvtCompletionDate;
    const renoWindowDays=daysBetween(pvtCompletionDate,extensionEnd);
    const gapExerciseDays=daysBetween(hdbExercise,pvtExercise);
    const totalDays=daysBetween(intentToSell,extensionEnd);

    // Build unified milestone list
    const milestones=[
      {date:intentToSell,label:"Intent to Sell",note:"Register on HDB Portal · 7-day cooling off",track:"hdb",icon:"📋"},
      {date:hdbOTP,label:mode==="buy_first"?"HDB OTP Granted (Latest by) ⭐":"HDB OTP Granted",note:mode==="buy_first"?"Must grant OTP in time for HDB Exercise before Private Exercise · HFE approved before OTP":"Buyer pays option fee (up to $1,000) · HFE approved before OTP",track:"hdb",icon:"📝",highlight:mode==="buy_first"},
      {date:requestForValue,label:"Request for Value",note:"Submit by next working day after OTP",track:"hdb",icon:"📤"},
      {date:valuationResult,label:"Valuation Result",note:"Within 5 working days",track:"hdb",icon:"🏠"},
    ];

    if(mode==="buy_first"){
      milestones.push({date:pvtOTP,label:"Private OTP Granted",note:`Option fee: 1–5% · Exercise period: ${pvtExercisePeriodBF} days`,track:"pvt",icon:"🔑",highlight:false});
    }

    milestones.push({date:hdbExercise,label:"HDB Exercise OTP ⭐",note:"Must be BEFORE Private Exercise · Buyer pays up to $4,000",track:"hdb",icon:"✏️",highlight:true});

    if(mode==="sell_first"){
      milestones.push({date:pvtOTP,label:"Private OTP Granted",note:`Option fee: 1% · Exercise period: ${pvtExercisePeriod} days`,track:"pvt",icon:"🔑"});
    }

    milestones.push({date:pvtExercise,label:"Private Exercise OTP ⭐",note:"Must be AFTER HDB Exercise · Pay 5% less option fee",track:"pvt",icon:"✏️",highlight:true});
    milestones.push({date:resaleApp,label:"HDB Resale Application",note:`${hdbSubmission}-day agreed period · $80 per party`,track:"hdb",icon:"📄"});
    milestones.push({date:bsdDue,label:"BSD Payable",note:"3% to 6% · Within 14 days of S&P · Legal fees",track:"pvt",icon:"💵"});
    milestones.push({date:hdbAcceptance,label:"HDB Acceptance",note:"Within 28 working days · 8-week clock starts",track:"hdb",icon:"✅"});
    milestones.push({date:hdbEndorsement,label:"HDB Endorsement",note:"~3 weeks after acceptance",track:"hdb",icon:"✍️"});
    milestones.push({date:hdbApproval,label:"HDB Approval",note:"~2 weeks after endorsement · Bridging loan can disburse after this",track:"hdb",icon:"🏛️"});
    milestones.push({date:pvtCompletionDate,label:"Private Completion ⭐",note:"Get keys to private property · Start renovation",track:"pvt",icon:"🔑",highlight:true});
    milestones.push({date:hdbCompletionDate,label:"HDB Completion",note:extension>0?"Physical appt at HDB · Extension of Stay begins":"Physical appt at HDB · Keys handover",track:"hdb",icon:"🏢"});

    if(extension>0){
      milestones.push({date:extensionEnd,label:`Extension Ends (${extension}m)`,note:"Move out of HDB · Move into renovated private",track:"hdb",icon:"🏡"});
    }

    // Sort by date
    milestones.sort((a,b)=>a.date-b.date);

    const bridgingLoanDays=daysBetween(pvtCompletionDate,hdbCompletionDate);
    const cpfRefundDate=addWD(hdbCompletionDate,14);
    const cpfRefundDays=daysBetween(pvtCompletionDate,cpfRefundDate);

    return {
      milestones,mode,absdSafe,hdbApprovalBeforePvtCompletion,renoWindowDays,gapExerciseDays,totalDays,
      hdbExercise,pvtExercise,hdbApproval,pvtCompletionDate,extensionEnd,extensionMonths:extension,
      pvtCompletionS:pvtCompletionDate,hdbCompletionS:hdbCompletionDate,
      bridgingLoanDays,cpfRefundDate,cpfRefundDays
    };
  },[mode,startDate,safetyMode,hdbSubmission,extension,pvtExercisePeriod,pvtExercisePeriodBF,pvtCompletion]);

  const t=timeline;
  const [tracked,setTracked]=useState(false);
  if(t&&!tracked){setTracked(true);sendToSheet({type:"tool_usage",tool:"Upgrader Timeline",streetName:"",flatType:"",sizeSqm:"",floorLevel:"",resultShown:`${mode} Safety:${safetyMode} HDBSub:${hdbSubmission}d Ext:${extension}m PvtComp:${pvtCompletion}w`,page:"Upgrader Timeline"})}

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.grey900}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .6s ease-out both}
        .fi{width:100%;padding:12px 14px;border:1.5px solid ${C.grey200};border-radius:10px;font-size:14px;font-family:'DM Sans',sans-serif;background:#fff;outline:none;color:${C.grey900};transition:border-color .2s,box-shadow .2s}
        .fi:focus{border-color:${C.blue};box-shadow:0 0 0 3px rgba(43,136,216,.12)}
        select.fi{appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239CA3AF' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}
        .nav-link{color:${C.grey500};text-decoration:none;font-size:14px;font-weight:500;padding:8px 14px;border-radius:6px;transition:color .2s,background .2s}
        .nav-link:hover{color:${C.blue};background:${C.grey100}}
        .nav-active{color:${C.blue};font-weight:600}
        .mode-btn{padding:16px 24px;border-radius:12px;border:2px solid ${C.grey200};background:#fff;cursor:pointer;transition:all .2s;text-align:left;font-family:'DM Sans',sans-serif;width:100%}
        .mode-btn:hover{border-color:${C.blue};background:${C.bluePale}}
        .mode-btn.active{border-color:${C.blue};background:${C.blueLight}}
        .alert-box{padding:14px 18px;border-radius:10px;margin-bottom:12px;font-size:13px;line-height:1.6}
        @media (max-width: 640px) {
          .fishbone-row { grid-template-columns: 24px 1fr !important; }
          .fishbone-row .col-left { display: none; }
          .fishbone-row .col-right { padding-left: 12px !important; }
          .fishbone-row .col-right > div { display: block !important; text-align: left !important; }
          .fishbone-hdb-mobile { display: block !important; }
          .fishbone-center-line { left: 12px !important; transform: none !important; }
        }
        .section-card{background:#fff;border-radius:14px;border:1px solid ${C.grey200};padding:22px;margin-bottom:16px}
        .section-label{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px}
      `}</style>

      {/* Nav */}
      <div style={{background:C.white,padding:"0 20px",position:"sticky",top:0,zIndex:100,borderBottom:`1px solid ${C.grey200}`}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:56}}>
          <a href="/" style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,textDecoration:"none"}}>Avenue 88</a>
          <div style={{display:"flex",gap:4}}>
            <a href="/" className="nav-link">Home</a>
            <a href="/timeline" className="nav-link">Timeline</a>
            <a href="/valuation" className="nav-link">Valuation</a>
            <a href="/upgrader" className="nav-link nav-active">Upgrader</a>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.blue},${C.blueDark})`,padding:"48px 20px 40px"}}>
        <div style={{maxWidth:720,margin:"0 auto"}}>
          <span style={{color:"rgba(255,255,255,0.8)",fontSize:12,fontWeight:600,letterSpacing:2,textTransform:"uppercase"}}>Avenue 88 · Advanced Tool</span>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(26px,5vw,40px)",color:"#fff",lineHeight:1.2,marginTop:8,fontWeight:700}}>HDB Upgrader Timeline</h1>
          <p style={{color:"rgba(255,255,255,0.85)",fontSize:16,marginTop:12}}>Plan your HDB sale and private purchase — timed to avoid ABSD.</p>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"36px 20px"}}>

        {/* Step 1: Mode */}
        <div style={{background:"#fff",borderRadius:16,border:`1px solid ${C.grey200}`,padding:28,boxShadow:"0 2px 12px rgba(0,0,0,0.03)",marginBottom:20}}>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:6}}>Step 1: Choose Your Strategy</h3>
          <p style={{fontSize:13,color:C.grey500,marginBottom:20}}>Both strategies avoid ABSD by ensuring HDB is exercised before Private.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <button className={`mode-btn ${mode==="sell_first"?"active":""}`} onClick={()=>setMode("sell_first")}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:mode==="sell_first"?C.blue:C.grey900}}>Sell HDB First</div>
              <div style={{fontSize:12,color:C.grey500,lineHeight:1.4}}>Secure HDB buyer first, then find private. Lower risk, tighter timeline.</div>
            </button>
            <button className={`mode-btn ${mode==="buy_first"?"active":""}`} onClick={()=>setMode("buy_first")}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:mode==="buy_first"?C.blue:C.grey900}}>Buy Private First</div>
              <div style={{fontSize:12,color:C.grey500,lineHeight:1.4}}>Secure private first with longer option period. More flexibility, higher option fee.</div>
            </button>
          </div>
        </div>

        {/* Step 2: Inputs — Separated */}
        {mode&&(
          <div className="fade-up">
            {/* Starting Point */}
            <div className="section-card">
              <div className="section-label" style={{color:C.grey500}}>Starting Point</div>
              <div style={{display:"grid",gap:16}}>
                <div>
                  <label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>
                    {mode==="sell_first"?"HDB OTP Grant Date *":"Private OTP Grant Date *"}
                  </label>
                  <input className="fi" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{maxWidth:280}}/>
                  {startDate&&<div style={{fontSize:12,color:C.blue,marginTop:6,fontWeight:600}}>Selected: {fmtS(new Date(startDate+"T00:00:00"))} (DD/MM/YYYY)</div>}
                </div>
                <div>
                  <label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:8,display:"block"}}>Private Purchase Exercise Timing</label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <button type="button" onClick={()=>setSafetyMode("after_hdb_exercise")} style={{padding:"12px 14px",borderRadius:10,border:`2px solid ${safetyMode==="after_hdb_exercise"?C.blue:C.grey200}`,background:safetyMode==="after_hdb_exercise"?C.blueLight:"#fff",cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif",transition:"all .2s"}}>
                      <div style={{fontSize:13,fontWeight:700,color:safetyMode==="after_hdb_exercise"?C.blue:C.grey900,marginBottom:2}}>After HDB Exercise</div>
                      <div style={{fontSize:11,color:C.grey500,lineHeight:1.4}}>Standard · Faster timeline</div>
                    </button>
                    <button type="button" onClick={()=>setSafetyMode("after_hdb_acceptance")} style={{padding:"12px 14px",borderRadius:10,border:`2px solid ${safetyMode==="after_hdb_acceptance"?C.blue:C.grey200}`,background:safetyMode==="after_hdb_acceptance"?C.blueLight:"#fff",cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif",transition:"all .2s"}}>
                      <div style={{fontSize:13,fontWeight:700,color:safetyMode==="after_hdb_acceptance"?C.blue:C.grey900,marginBottom:2}}>After HDB Acceptance</div>
                      <div style={{fontSize:11,color:C.grey500,lineHeight:1.4}}>Extra safe · Wait for HDB confirmation</div>
                    </button>
                  </div>
                  <div style={{fontSize:11,color:C.grey500,marginTop:8,lineHeight:1.5}}>
                    {safetyMode==="after_hdb_acceptance"?"💡 Waiting for HDB Acceptance ensures the sale is officially accepted before committing to the private purchase. Safer but adds ~30 days to the timeline.":"💡 Exercise private right after HDB exercise — quickest timeline. Some risk if HDB rejects the application (rare)."}
                  </div>
                </div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
              {/* HDB Details */}
              <div className="section-card" style={{borderLeft:`3px solid ${C.blue}`}}>
                <div className="section-label" style={{color:C.blue}}>🏢 HDB Sale Details</div>
                <div style={{display:"grid",gap:14}}>
                  <div>
                    <label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Resale Submission Period</label>
                    <select className="fi" value={hdbSubmission} onChange={e=>setHdbSubmission(Number(e.target.value))}>
                      {[7,14,21,30,45,60,80].map(d=><option key={d} value={d}>{d} days{d===80?" (max)":""}</option>)}
                    </select>
                    <div style={{fontSize:11,color:mode==="buy_first"?C.green:"#92600A",marginTop:4,fontWeight:500}}>
                      {mode==="buy_first"?"💡 Tip: Shorter is better — speeds up HDB completion":"💡 Tip: Longer gives more time to find your private property"}
                    </div>
                  </div>
                  <div>
                    <label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Extension of Stay</label>
                    <select className="fi" value={extension} onChange={e=>setExtension(Number(e.target.value))}>
                      <option value={0}>No extension</option>
                      <option value={1}>1 month</option>
                      <option value={2}>2 months</option>
                      <option value={3}>3 months (max)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Private Details */}
              <div className="section-card" style={{borderLeft:`3px solid ${C.orange}`}}>
                <div className="section-label" style={{color:C.orange}}>🏡 Private Purchase Details</div>
                <div style={{display:"grid",gap:14}}>
                  <div>
                    <label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Exercise Period</label>
                    {mode==="sell_first"?(
                      <select className="fi" value={pvtExercisePeriod} onChange={e=>setPvtExercisePeriod(Number(e.target.value))}>
                        <option value={14}>14 days (standard)</option>
                        <option value={21}>21 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                      </select>
                    ):(
                      <select className="fi" value={pvtExercisePeriodBF} onChange={e=>setPvtExercisePeriodBF(Number(e.target.value))}>
                        <option value={60}>2 months</option>
                        <option value={90}>3 months</option>
                        <option value={120}>4 months</option>
                        <option value={150}>5 months</option>
                        <option value={180}>6 months</option>
                      </select>
                    )}
                    {mode==="buy_first"&&(
                      <div style={{fontSize:11,color:C.green,marginTop:4,fontWeight:500}}>
                        💡 Tip: Longer is better — gives more time to sell HDB before exercising
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Completion Period</label>
                    <select className="fi" value={pvtCompletion} onChange={e=>setPvtCompletion(Number(e.target.value))}>
                      {[8,10,12,14,16].map(w=><option key={w} value={w}>{w} weeks</option>)}
                    </select>
                  </div>
                </div>
                {mode==="buy_first"&&(
                  <div style={{marginTop:12,padding:"8px 12px",background:C.orangeLight,borderRadius:6,fontSize:11,color:"#92600A",lineHeight:1.4}}>
                    ⚠️ Longer exercise period requires higher option fee (1–5%).
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {t&&(
          <div className="fade-up">
            {/* Summary */}
            <div style={{background:`linear-gradient(135deg,${C.blue},${C.blueDark})`,borderRadius:14,padding:"22px 28px",marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
                <div>
                  <div style={{color:"rgba(255,255,255,0.7)",fontSize:12,fontWeight:600}}>Total Timeline</div>
                  <div style={{color:"#fff",fontSize:24,fontWeight:800,fontFamily:"'Playfair Display',serif"}}>{t.totalDays} days (~{(t.totalDays/30).toFixed(1)} months)</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:"rgba(255,255,255,0.7)",fontSize:12,fontWeight:600}}>Renovation Window</div>
                  <div style={{color:"#fff",fontSize:20,fontWeight:700}}>{t.renoWindowDays} days (~{(t.renoWindowDays/30).toFixed(1)} months)</div>
                </div>
              </div>
              <div style={{marginTop:10,display:"flex",gap:16,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:"50%",background:C.blueLight}}/><span style={{color:"rgba(255,255,255,0.7)",fontSize:12}}>HDB Sale</span></div>
                <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:"50%",background:C.orange}}/><span style={{color:"rgba(255,255,255,0.7)",fontSize:12}}>Private Purchase</span></div>
                <span style={{color:"rgba(255,255,255,0.5)",fontSize:12}}>· {mode==="sell_first"?"Sell First":"Buy First"} · {t.extensionMonths>0?`${t.extensionMonths}m extension`:"No extension"}</span>
              </div>
            </div>

            {/* Alerts */}
            {!t.absdSafe&&<div className="alert-box" style={{background:C.redLight,border:"1px solid #FECACA",color:C.red}}>🚨 <strong>ABSD Risk!</strong> Private Exercise ({fmtS(t.pvtExercise)}) is on or before HDB Exercise ({fmtS(t.hdbExercise)}). 20% ABSD will apply. Adjust your timeline.</div>}
            {t.absdSafe&&<div className="alert-box" style={{background:C.greenLight,border:"1px solid #BBF7D0",color:C.green}}>✅ <strong>No ABSD</strong> — HDB Exercise ({fmtS(t.hdbExercise)}) is {t.gapExerciseDays} day{t.gapExerciseDays>1?"s":""} before Private Exercise ({fmtS(t.pvtExercise)}).</div>}
            {!t.hdbApprovalBeforePvtCompletion&&<div className="alert-box" style={{background:C.redLight,border:"1px solid #FECACA",color:C.red}}>🚨 <strong>Bridging Loan Risk!</strong> HDB Approval ({fmtS(t.hdbApproval)}) is after Private Completion ({fmtS(t.pvtCompletionDate)}). Bridging loan cannot disburse in time. Extend private completion or shorten HDB submission period.</div>}
            {t.hdbApprovalBeforePvtCompletion&&<div className="alert-box" style={{background:C.blueLight,border:`1px solid ${C.blue}33`,color:C.blueDark}}>💰 <strong>Bridging Loan OK</strong> — HDB Approval ({fmtS(t.hdbApproval)}) is before Private Completion ({fmtS(t.pvtCompletionDate)}). Apply bridging loan together with mortgage loan.</div>}
            {t.gapExerciseDays>0&&t.gapExerciseDays<7&&t.absdSafe&&<div className="alert-box" style={{background:C.orangeLight,border:`1px solid ${C.orangeBorder}`,color:"#92600A"}}>⚠️ <strong>Tight Timeline:</strong> Only {t.gapExerciseDays} day{t.gapExerciseDays>1?"s":""} gap between exercise dates. Consider more buffer.</div>}

            {/* Unified Fishbone Timeline - HDB Left | Center Line | Private Right */}
            <div style={{background:"#fff",borderRadius:16,border:`1px solid ${C.grey200}`,padding:"24px 20px",marginBottom:24}}>
              <h3 style={{fontSize:16,fontWeight:700,marginBottom:4}}>Combined Timeline</h3>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${C.grey100}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:"50%",background:C.blue}}/><span style={{fontSize:12,fontWeight:600,color:C.blue}}>🏢 Sell HDB</span></div>
                <div style={{fontSize:11,color:C.grey500,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Timeline</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600,color:C.orange}}>Buy Private 🏡</span><div style={{width:10,height:10,borderRadius:"50%",background:C.orange}}/></div>
              </div>

              <div style={{position:"relative"}}>
                {/* Center vertical line */}
                <div className="fishbone-center-line" style={{position:"absolute",left:"50%",top:0,bottom:0,width:2,background:C.grey200,transform:"translateX(-50%)",zIndex:0}}/>

                {t.milestones.map((m,i)=>{
                  const isHdb=m.track==="hdb";
                  const color=isHdb?C.blue:C.orange;
                  const bgColor=isHdb?C.blueLight:C.orangeLight;
                  const darkColor=isHdb?C.blueDark:C.orangeDark;
                  return(
                    <div key={i} className="fishbone-row" style={{position:"relative",display:"grid",gridTemplateColumns:"1fr 40px 1fr",gap:0,alignItems:"center",marginBottom:12,zIndex:1}}>
                      {/* Left column (HDB on desktop) */}
                      <div className="col-left" style={{textAlign:"right",paddingRight:12}}>
                        {isHdb&&(
                          <div style={{display:"inline-block",background:bgColor,border:`1.5px solid ${color}33`,borderRadius:10,padding:"10px 14px",textAlign:"right",maxWidth:"100%"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end",marginBottom:3}}>
                              <span style={{fontSize:13,fontWeight:700,color:m.highlight?color:C.grey900}}>{m.label}</span>
                              <span style={{fontSize:14}}>{m.icon}</span>
                            </div>
                            <div style={{fontSize:12,fontWeight:700,color:darkColor}}>{fmtS(m.date)}</div>
                            <div style={{fontSize:11,color:C.grey500,marginTop:3,lineHeight:1.4}}>{m.note}</div>
                          </div>
                        )}
                      </div>

                      {/* Center dot */}
                      <div style={{display:"flex",justifyContent:"center",alignItems:"center",position:"relative"}}>
                        <div style={{width:14,height:14,borderRadius:"50%",background:"#fff",border:`2.5px solid ${color}`,zIndex:2}}/>
                      </div>

                      {/* Right column (Private on desktop, both tracks on mobile) */}
                      <div className="col-right" style={{textAlign:"left",paddingLeft:12}}>
                        <div style={{display:!isHdb?"inline-block":"none"}}>
                          <div style={{background:bgColor,border:`1.5px solid ${color}33`,borderRadius:10,padding:"10px 14px",textAlign:"left"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-start",marginBottom:3}}>
                              <span style={{fontSize:14}}>{m.icon}</span>
                              <span style={{fontSize:13,fontWeight:700,color:m.highlight?color:C.grey900}}>{m.label}</span>
                            </div>
                            <div style={{fontSize:12,fontWeight:700,color:darkColor}}>{fmtS(m.date)}</div>
                            <div style={{fontSize:11,color:C.grey500,marginTop:3,lineHeight:1.4}}>{m.note}</div>
                          </div>
                        </div>
                        {/* Mobile-only: HDB also shown on right */}
                        <div className="fishbone-hdb-mobile" style={{display:"none"}}>
                          {isHdb&&(
                            <div style={{background:bgColor,border:`1.5px solid ${color}33`,borderRadius:10,padding:"10px 14px",textAlign:"left"}}>
                              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                                <span style={{fontSize:14}}>{m.icon}</span>
                                <span style={{fontSize:13,fontWeight:700,color:m.highlight?color:C.grey900}}>{m.label}</span>
                                <span style={{fontSize:10,fontWeight:600,padding:"2px 6px",borderRadius:10,background:"#fff",color:darkColor}}>HDB</span>
                              </div>
                              <div style={{fontSize:12,fontWeight:700,color:darkColor}}>{fmtS(m.date)}</div>
                              <div style={{fontSize:11,color:C.grey500,marginTop:3,lineHeight:1.4}}>{m.note}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Renovation Window & Bridging Loan - full width at the end */}
                {t.renoWindowDays>0&&(
                  <div style={{position:"relative",marginTop:20,paddingTop:20,borderTop:`1px dashed ${C.grey200}`,display:"grid",gap:12,zIndex:1,background:"#fff"}}>
                    {/* Renovation Window */}
                    <div style={{background:C.greenLight,border:"1px solid #BBF7D0",borderRadius:10,padding:"14px 18px",textAlign:"center"}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.green,marginBottom:4}}>🔨 Renovation Window</div>
                      <div style={{fontSize:12,color:C.green,marginBottom:4}}>
                        {fmtS(t.pvtCompletionS)} (get private keys) → {fmtS(t.extensionEnd)} (move out of HDB)
                      </div>
                      <div style={{fontSize:15,fontWeight:700,color:C.green}}>
                        {t.renoWindowDays} days (~{(t.renoWindowDays/30).toFixed(1)} months)
                      </div>
                    </div>

                    {/* Bridging Loan Period */}
                    {t.bridgingLoanDays>0&&(
                      <div style={{background:C.blueLight,border:`1px solid ${C.blue}33`,borderRadius:10,padding:"14px 18px",textAlign:"center"}}>
                        <div style={{fontSize:14,fontWeight:700,color:C.blueDark,marginBottom:4}}>💰 Bridging Loan Period</div>
                        <div style={{fontSize:12,color:C.blueDark,marginBottom:4}}>
                          {fmtS(t.pvtCompletionS)} (private completion) → {fmtS(t.hdbCompletionS)} (HDB completion)
                        </div>
                        <div style={{fontSize:15,fontWeight:700,color:C.blueDark,marginBottom:8}}>
                          ~{t.bridgingLoanDays} days (~{(t.bridgingLoanDays/30).toFixed(1)} months)
                        </div>
                        <div style={{fontSize:12,color:C.grey500,paddingTop:8,borderTop:`1px solid ${C.blue}22`}}>
                          📌 CPF refund: 7–14 working days after HDB Completion → est. by <strong>{fmtS(t.cpfRefundDate)}</strong>
                        </div>
                        <div style={{fontSize:11,color:C.grey500,marginTop:2}}>
                          Full sale proceeds (cash + CPF) expected ~{t.cpfRefundDays} days after private completion
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Key Notes */}
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.grey200}`,padding:24,marginBottom:24}}>
              <h4 style={{fontSize:15,fontWeight:700,marginBottom:12}}>Key Notes</h4>
              <div style={{display:"grid",gap:8}}>
                {[
                  "HDB Exercise Date must be BEFORE Private Exercise Date to avoid 20% ABSD.",
                  "Bridging Loan must be applied together with Mortgage Loan. HDB Approval must be in place before bridging loan disbursement.",
                  "Remember to repay the Bridging Loan upon receipt of funds after HDB Completion (cash + CPF refund). Delays may incur additional interest.",
                  "Extension of Stay requires: exercised OTP on next property, declared during resale application. Buyer's MOP starts after extension ends.",
                  `Renovation window: ${t.renoWindowDays} days from Private Completion to HDB move-out.`,
                  mode==="buy_first"?"Longer private exercise period (2–6 months) requires higher option fee (1–5%). Negotiate with seller.":"Private exercise period can be extended beyond 14 days if both parties agree.",
                  "Cater time for renovation — most renovations take 2–4 months."
                ].map((note,i)=>(
                  <div key={i} style={{fontSize:13,color:C.grey600,lineHeight:1.6,paddingLeft:16,position:"relative"}}>
                    <span style={{position:"absolute",left:0,color:C.blue}}>•</span>{note}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.grey200}`,padding:28,textAlign:"center"}}>
              <p style={{fontSize:15,color:C.grey500,marginBottom:14}}>Need help planning your upgrade?</p>
              <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
                <a href="/" style={{display:"inline-block",padding:"14px 28px",background:C.blue,color:"#fff",borderRadius:10,fontWeight:600,fontSize:15,textDecoration:"none"}}>Get a Free Consultation →</a>
                <a href="https://wa.me/+6580830688" target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"14px 28px",background:"#25D366",color:"#fff",borderRadius:10,fontWeight:600,fontSize:15,textDecoration:"none"}}>💬 WhatsApp Us</a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{background:C.grey100,padding:"28px 20px",textAlign:"center",marginTop:36,borderTop:`1px solid ${C.grey200}`}}>
        <div style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,marginBottom:6}}>Avenue 88</div>
        <div style={{color:C.grey500,fontSize:12}}>Huttons / Navis · © 2026 Avenue 88</div>
        <div style={{maxWidth:720,margin:"16px auto 0",textAlign:"left",background:"#fff",border:`1px solid ${C.grey200}`,borderRadius:8,padding:"14px 16px"}}>
          <strong style={{color:C.grey600,fontSize:11,letterSpacing:.5,textTransform:"uppercase"}}>Disclaimer</strong>
          <p style={{color:C.grey500,fontSize:11,lineHeight:1.6,marginTop:6}}>The information and tools provided on this website are for general reference only and do not constitute legal, financial, or professional advice. Timelines, figures, and valuations are estimates based on available public data and typical HDB/URA processes, and actual outcomes may vary due to individual circumstances, public holidays, policy changes, or processing variations. Users should verify all details with HDB, CPF Board, IRAS, their bank, and a qualified legal or financial professional before making any decisions. Avenue 88, Huttons Asia Pte Ltd, and its representatives shall not be liable for any loss or damage arising from reliance on the information provided.</p>
        </div>
      </div>
    </div>
  );
}
