import { useState, useCallback } from "react";

var C={navy:"#1B3D72",navyLight:"#2B5299",accent:"#C9A84C",white:"#FFFFFF",bg:"#F7F8FA",text:"#1A202C",textMuted:"#4A5568",border:"#E2E8F0",green:"#2D7D4E",greyTile:"#4A5568",lightBox:"#F7F8FA",blue:"#2B88D8",blueDark:"#1E6AB5",blueLight:"#E8F2FC",grey200:"#E5E7EB",grey500:"#6B7280",grey600:"#4B5563",grey900:"#111827"};

function fmt$(n){if(n===null||n===undefined||isNaN(n))return"$0";var abs=Math.abs(Math.round(n));var s="$"+abs.toLocaleString();return n<0?"("+s+")":s}
function parseNum(s){if(!s)return 0;var t=String(s).replace(/[$,\s"]/g,"");var neg=t.indexOf("(")>=0;t=t.replace(/[()]/g,"");var n=parseFloat(t);if(isNaN(n))return 0;return neg?-n:n}

function extractSheetId(url){var m=url.match(/\/d\/([a-zA-Z0-9_-]+)/);return m?m[1]:null}

function csvToRows(csv){
  var rows=[];var cur="";var q=false;
  for(var i=0;i<csv.length;i++){
    var ch=csv[i];
    if(ch==='"')q=!q;
    else if(ch==='\n'&&!q){rows.push(cur);cur=""}
    else if(ch==='\r'){}
    else cur+=ch;
  }
  if(cur)rows.push(cur);
  return rows.map(function(row){
    var cells=[];var cell="";var inQ=false;
    for(var j=0;j<row.length;j++){
      var c=row[j];
      if(c==='"')inQ=!inQ;
      else if(c===','&&!inQ){cells.push(cell.trim());cell=""}
      else cell+=c;
    }
    cells.push(cell.trim());
    return cells;
  });
}

// Get cell value by 0-indexed row and column
function g(rows,r,c){
  if(!rows||r<0||r>=rows.length)return"";
  if(!rows[r]||c<0||c>=rows[r].length)return"";
  return rows[r][c]||"";
}
function gn(rows,r,c){return parseNum(g(rows,r,c))}

function parseProfile(rows){
  // Column reference: A=0,B=1,C=2,D=3,E=4,F=5,G=6,H=7,I=8,J=9,K=10,L=11,M=12,N=13,O=14,P=15,Q=16,R=17,S=18,T=19,U=20
  return{
    clientName1:g(rows,6,3),      // D7
    clientName2:g(rows,6,5),      // F7
    propertyAddress:g(rows,7,10), // K8
    sellingPrice:gn(rows,8,11),   // L9
    outstandingLoan:gn(rows,9,11),// L10
    b1Age:g(rows,8,3),            // D9
    b2Age:g(rows,8,5),            // F9
    b1Emp:g(rows,14,3),           // D15
    b2Emp:g(rows,14,5),           // F15
    b1Inc:gn(rows,18,3),          // D19
    b2Inc:gn(rows,18,5),          // F19
    cpfRefund:gn(rows,18,11),     // L19 - Total CPF Usage
    agentPct:g(rows,20,10),       // K21
    agentFee:gn(rows,20,11),      // L21
    grossCashProceeds:gn(rows,19,11), // L20
    netCash:gn(rows,26,11),       // L27
    cpfOASean:gn(rows,12,15),     // P13
    cpfOASteph:gn(rows,12,18),    // S13
    cpfOACombined:gn(rows,12,20), // U13
    cashSean:gn(rows,17,15),      // P18
    cashSteph:gn(rows,17,18),     // S18
    cashCombined:gn(rows,17,20),  // U18
    totalFundsSean:gn(rows,23,15),// P24
    totalFundsSteph:gn(rows,23,18),// S24
    totalFunds:gn(rows,23,20),    // U24
    maxLoan:gn(rows,29,7),        // H30
    maxTenure:gn(rows,26,3),      // D27
    stressRate:g(rows,32,10),     // K33
    agentName:g(rows,35,10),      // K36
    mobile:g(rows,36,10),         // K37
    resNum:g(rows,37,10),         // K38
    datePrepared:g(rows,38,10),   // K39
    maxLTV:g(rows,25,3),          // D26
    propType:g(rows,5,5),         // F6 (Property Type value)
    // Sale split
    seanSplit:gn(rows,28,11),     // L29
    stephSplit:gn(rows,29,11),    // L30
  }
}

function parsePrivate(rows){
  return{
    price:gn(rows,17,10),          // K18 (Combined purchase price)
    ltvPct:g(rows,22,8),           // I23 (LTV %)
    loanAmt:gn(rows,22,10),        // K23 (loan amount)
    tenure:gn(rows,27,10),         // K28 (loan tenure)
    intRate:g(rows,28,10),          // K29 (interest rate)
    instalment:gn(rows,29,10),     // K30 (monthly instalment)
    pledging:gn(rows,32,10),       // K33
    unpledge:gn(rows,33,10),       // K34
    bsd:gn(rows,23,17),            // R24
    cpfBal:gn(rows,14,17),         // R15
    cashBal:gn(rows,28,17),        // R29
    totalRemaining:gn(rows,32,17), // R33
    instCombined:gn(rows,35,17),   // R36
    cpfContrib:gn(rows,36,17),     // R37
    cashRepay:gn(rows,37,17),      // R38
    reserveMonths:gn(rows,41,17),  // R42
    reserveYears:gn(rows,42,17),   // R43
  }
}

function parseHDB(rows){
  // HDB tab has different layout - need to check
  return{
    price:gn(rows,17,18),          // approximate
    ltvPct:"75%",
    loanAmt:gn(rows,22,10),
    tenure:gn(rows,27,10),
    intRate:g(rows,28,10),
    instalment:gn(rows,29,10),
    pledging:gn(rows,32,10),
    unpledge:gn(rows,33,10),
    bsd:gn(rows,23,17),
    cpfBal:gn(rows,14,17),
    cashBal:gn(rows,28,17),
    totalRemaining:gn(rows,32,17),
    instCombined:gn(rows,35,17),
    cpfContrib:gn(rows,36,17),
    cashRepay:gn(rows,37,17),
    reserveMonths:gn(rows,41,17),
    reserveYears:gn(rows,42,17),
  }
}

function parseEC(rows){
  return{
    price:gn(rows,17,10),
    ltvPct:"75%",
    loanAmt:gn(rows,22,10),
    tenure:gn(rows,27,10),
    intRate:g(rows,28,10),
    instalment:gn(rows,29,10),
    pledging:gn(rows,32,10),
    unpledge:gn(rows,33,10),
    bsd:gn(rows,23,17),
    cpfBal:gn(rows,14,17),
    cashBal:gn(rows,28,17),
    totalRemaining:gn(rows,32,17),
    instCombined:gn(rows,35,17),
    cpfContrib:gn(rows,36,17),
    cashRepay:gn(rows,37,17),
    reserveMonths:gn(rows,41,17),
    reserveYears:gn(rows,42,17),
  }
}

function ReportView(props){
  var p=props.profile;var s=props.scenario;var label=props.scenarioLabel||"Private Property";
  if(!p||!s)return null;
  var clientName=p.clientName2?p.clientName1+" & "+p.clientName2:p.clientName1;
  return(
    <div style={{background:"#e8eaf0",padding:"30px 20px",display:"flex",justifyContent:"center"}}>
      <div style={{background:C.white,width:"100%",maxWidth:794,boxShadow:"0 4px 40px rgba(0,0,0,0.15)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:C.navy,padding:"28px 40px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#fff",letterSpacing:1}}>AVENUE 88</div><div style={{fontSize:11,color:"rgba(255,255,255,0.6)",letterSpacing:2,textTransform:"uppercase",marginTop:2}}>Property Advisory</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:13,color:"rgba(255,255,255,0.5)",letterSpacing:2,textTransform:"uppercase"}}>Financial Summary</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#fff",marginTop:2}}>{clientName}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:4}}>Prepared: {p.datePrepared}</div></div>
        </div>
        <div style={{height:3,background:"linear-gradient(90deg,"+C.accent+" 0%,#e8c96d 50%,"+C.accent+" 100%)"}}/>
        
        <div style={{padding:"32px 40px 28px"}}>
          {/* Current Property */}
          <div style={{marginBottom:26}}>
            <div style={{background:C.navy,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>Your Current Property</div>
            <div style={{background:C.lightBox,border:"1px solid "+C.border,borderLeft:"4px solid "+C.navy,borderRadius:4,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.navy,fontWeight:700}}>{p.propertyAddress||"Property"}</div><div style={{fontSize:12.5,color:C.textMuted,marginTop:3}}>{p.propType} · Outstanding Loan: {fmt$(p.outstandingLoan)}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.textMuted}}>Target Selling Price</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.navy,fontWeight:700,marginTop:2}}>{fmt$(p.sellingPrice)}</div></div>
            </div>
          </div>
          
          {/* Two Column */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            {/* Sale Proceeds */}
            <div style={{marginBottom:26}}>
              <div style={{background:C.navy,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>Sale Proceeds</div>
              {[{l:"Selling Price",v:fmt$(p.sellingPrice)},{l:"Less Outstanding Loan",v:fmt$(-p.outstandingLoan),neg:true},{l:"Less CPF Refund (incl. interest)",v:fmt$(-p.cpfRefund),neg:true},{l:"Less Agent Fees ("+p.agentPct+" + GST)",v:fmt$(-p.agentFee),neg:true}].map(function(r,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid "+C.border,fontSize:12.5}}><span style={{color:C.textMuted}}>{r.l}</span><span style={{fontWeight:500,color:r.neg?"#C53030":C.text}}>{r.v}</span></div>})}
              <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderTop:"1px solid "+C.border,marginTop:2,fontSize:12.5}}><span style={{color:C.text,fontWeight:600}}>Net Cash Proceeds</span><span style={{color:C.navy,fontWeight:700}}>{fmt$(p.netCash)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",fontSize:12.5}}><span style={{color:C.textMuted}}>CPF OA Available (after refund)</span><span style={{fontWeight:500}}>{fmt$(p.cpfOACombined)}</span></div>
              <div style={{background:C.navy,borderRadius:4,padding:"14px 18px",marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:11,color:"rgba(255,255,255,0.65)",letterSpacing:1,textTransform:"uppercase"}}>Total Funds Available</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>Cash + CPF Combined</div></div><div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:C.accent,fontWeight:700}}>{fmt$(p.totalFunds)}</div></div>
            </div>
            
            {/* Buying Power */}
            <div style={{marginBottom:26}}>
              <div style={{background:C.greyTile,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>Your Buying Power</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{background:C.lightBox,border:"1px solid "+C.border,borderRadius:4,padding:"12px 16px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.textMuted}}>Max Bank Loan (TDSR)</div><div style={{fontSize:18,fontWeight:700,color:C.navy,marginTop:4}}>{fmt$(p.maxLoan)}</div><div style={{fontSize:10.5,color:C.textMuted,marginTop:2}}>Stress test @ {p.stressRate} | {p.maxTenure}yr</div></div>
                <div style={{background:C.lightBox,border:"1px solid "+C.border,borderRadius:4,padding:"12px 16px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.textMuted}}>Max LTV</div><div style={{fontSize:18,fontWeight:700,color:C.navy,marginTop:4}}>{p.maxLTV||"75%"}</div><div style={{fontSize:10.5,color:C.textMuted,marginTop:2}}>{label}</div></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:p.clientName2?"1fr 1fr":"1fr",gap:8,marginTop:10}}>
                <div style={{background:"#F0F4FA",border:"1px solid #D0DEF0",borderRadius:4,padding:"10px 14px"}}><strong style={{fontSize:12}}>{p.clientName1}</strong><span style={{fontSize:11,color:C.textMuted}}> · Age {p.b1Age} · {p.b1Emp}</span><br/><span style={{fontSize:11,color:C.textMuted}}>Income: {fmt$(p.b1Inc)}/mth</span></div>
                {p.clientName2&&<div style={{background:"#F0F4FA",border:"1px solid #D0DEF0",borderRadius:4,padding:"10px 14px"}}><strong style={{fontSize:12}}>{p.clientName2}</strong><span style={{fontSize:11,color:C.textMuted}}> · Age {p.b2Age} · {p.b2Emp}</span><br/><span style={{fontSize:11,color:C.textMuted}}>Income: {fmt$(p.b2Inc)}/mth</span></div>}
              </div>
            </div>
          </div>
          
          {/* Scenario */}
          <div>
            <div style={{background:C.greyTile,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>{"Scenario \u2014 If You Buy a "+fmt$(s.price)+" "+label}</div>
            <div style={{background:C.lightBox,border:"1px solid "+C.border,borderRadius:4,padding:18}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {[{l:"Purchase Price",v:fmt$(s.price)},{l:"Bank Loan ("+s.ltvPct+" LTV)",v:fmt$(s.loanAmt)},{l:"Buyer Stamp Duty (BSD)",v:fmt$(s.bsd),neg:true},{l:"Monthly Instalment @ "+s.intRate,v:fmt$(s.instalment)+" / mth"},{l:"Less CPF OA Contribution",v:"\u2014 "+fmt$(s.cpfContrib)+" / mth",green:true},{l:"Net Cash Instalment / mth",v:fmt$(s.cashRepay)+" / mth",hl:true}].map(function(item,i){return <div key={i} style={{background:item.hl?"#EBF0F9":"white",border:"1px solid "+(item.hl?"#B8CAE8":"#D0DEF0"),borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:item.hl?C.navy:C.textMuted}}>{item.l}</div><div style={{fontSize:14,fontWeight:700,color:item.neg?"#C53030":item.green?"#276749":item.hl?C.navy:C.text,marginTop:4}}>{item.v}</div></div>})}
              </div>
              
              {s.pledging>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
                <div style={{background:"#FFF3E0",border:"1.5px solid #F6A623",borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"#B45309"}}>{"⚠ Pledging Required (48 mths)"}</div><div style={{fontSize:18,fontWeight:700,color:"#B45309",marginTop:4}}>{fmt$(s.pledging)}</div></div>
                <div style={{background:"#F0FBF4",border:"1.5px solid #68D391",borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"#276749"}}>Show / Unpledge Funds</div><div style={{fontSize:18,fontWeight:700,color:"#276749",marginTop:4}}>{fmt$(s.unpledge)}</div></div>
              </div>}
              
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginTop:10}}>
                <div style={{background:"white",border:"1px solid #D0DEF0",borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:C.textMuted}}>CPF Balance After</div><div style={{fontSize:14,fontWeight:700,color:C.navy,marginTop:4}}>{fmt$(s.cpfBal)}</div></div>
                <div style={{background:"white",border:"1px solid #D0DEF0",borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:C.textMuted}}>Cash Balance After</div><div style={{fontSize:14,fontWeight:700,color:s.cashBal<0?"#C53030":C.navy,marginTop:4}}>{fmt$(s.cashBal)}</div></div>
                <div style={{background:C.navy,borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"rgba(255,255,255,0.6)"}}>{"Total Remaining \u2713"}</div><div style={{fontSize:15,fontWeight:700,color:"#6EE7A0",marginTop:4}}>{fmt$(s.totalRemaining)}</div></div>
                <div style={{background:C.navy,borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"rgba(255,255,255,0.6)"}}>Reserves</div><div style={{fontSize:15,fontWeight:700,color:"#6EE7A0",marginTop:4}}>{Math.round(Math.abs(s.reserveMonths))} mths</div><div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:1}}>{"\u2248 "+Math.abs(s.reserveYears).toFixed(1)+" years"}</div></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div style={{background:C.lightBox,borderTop:"1px solid "+C.border,padding:"14px 40px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:12,color:C.textMuted}}><strong style={{color:C.navy}}>{p.agentName}</strong> · RES No. {p.resNum} · {p.mobile} · Avenue 88</div>
          <div style={{fontSize:9.5,color:"#A0AEC0",maxWidth:340,textAlign:"right",lineHeight:1.5}}>This summary is for general guidance only and does not constitute financial or investment advice. All figures are estimates. Actual loan approvals subject to bank assessment.</div>
        </div>
      </div>
    </div>
  );
}

export default function FinancialSummary(){
  var [sheetUrl,setSheetUrl]=useState("");
  var [scenario,setScenario]=useState("private");
  var [loading,setLoading]=useState(false);
  var [error,setError]=useState("");
  var [profile,setProfile]=useState(null);
  var [scenarioData,setScenarioData]=useState(null);
  var [debugRows,setDebugRows]=useState(null);

  var tabMap={private:"2A. Buy Private",hdb:"2B. HDB",ec:"2C. Buy EC"};
  var labelMap={private:"Private Property",hdb:"HDB",ec:"Executive Condominium"};

  var fetchData=useCallback(function(){
    var sheetId=extractSheetId(sheetUrl);
    if(!sheetId){setError("Invalid Google Sheet URL. Please paste the full URL.");return}
    setLoading(true);setError("");setProfile(null);setScenarioData(null);setDebugRows(null);
    
    var profileTab=encodeURIComponent("1. Profile Affordability");
    var scenarioTab=encodeURIComponent(tabMap[scenario]);
    var baseUrl="https://docs.google.com/spreadsheets/d/"+sheetId+"/gviz/tq?tqx=out:csv&sheet=";
    
    Promise.all([
      fetch(baseUrl+profileTab).then(function(r){if(!r.ok)throw new Error("Cannot access sheet. Make sure it's shared as 'Anyone with the link can view'.");return r.text()}),
      fetch(baseUrl+scenarioTab).then(function(r){if(!r.ok)throw new Error("Cannot find tab '"+tabMap[scenario]+"'. Check your sheet has this tab.");return r.text()})
    ]).then(function(results){
      var profileRows=csvToRows(results[0]);
      var scenarioRows=csvToRows(results[1]);
      setDebugRows({profile:profileRows,scenario:scenarioRows});
      var p=parseProfile(profileRows);
      var s;
      if(scenario==="private")s=parsePrivate(scenarioRows);
      else if(scenario==="hdb")s=parseHDB(scenarioRows);
      else s=parseEC(scenarioRows);
      setProfile(p);setScenarioData(s);
      setLoading(false);
    }).catch(function(err){
      setError(err.message||"Failed to fetch data.");
      setLoading(false);
    });
  },[sheetUrl,scenario]);

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.grey900}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet"/>
      <style>{"\
        *{margin:0;padding:0;box-sizing:border-box}\
        .fi{width:100%;padding:13px 16px;border:1.5px solid "+C.grey200+";border-radius:10px;font-size:15px;font-family:'DM Sans',sans-serif;background:#fff;outline:none;color:"+C.grey900+";transition:border-color .2s,box-shadow .2s}\
        .fi:focus{border-color:"+C.blue+";box-shadow:0 0 0 3px rgba(43,136,216,.12)}\
        select.fi{appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239CA3AF' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 16px center}\
        .nav-link{color:"+C.grey500+";text-decoration:none;font-size:14px;font-weight:500;padding:8px 14px;border-radius:6px;transition:color .2s,background .2s}\
        .nav-link:hover{color:"+C.blue+";background:#F3F4F6}\
        .nav-active{color:"+C.blue+";font-weight:600}\
        @keyframes spin{to{transform:rotate(360deg)}}\
        .spinner{width:20px;height:20px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px}\
        @media print{.no-print{display:none!important}body{background:#fff!important}}\
      "}</style>

      <div className="no-print" style={{background:C.white,padding:"0 20px",position:"sticky",top:0,zIndex:100,borderBottom:"1px solid "+C.grey200}}><div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:56}}><a href="/" style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,textDecoration:"none"}}>Avenue 88</a><div style={{display:"flex",gap:4}}><a href="/" className="nav-link">Home</a><a href="/timeline" className="nav-link">Timeline</a><a href="/valuation" className="nav-link">Valuation</a><a href="/upgrader" className="nav-link">Upgrader</a><a href="/summary" className="nav-link nav-active">Summary</a></div></div></div>

      <div className="no-print" style={{background:"linear-gradient(135deg,"+C.navy+","+C.navyLight+")",padding:"48px 20px 40px"}}><div style={{maxWidth:720,margin:"0 auto"}}><span style={{color:"rgba(255,255,255,0.8)",fontSize:12,fontWeight:600,letterSpacing:2,textTransform:"uppercase"}}>Avenue 88 · Tool</span><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,5vw,42px)",color:"#fff",lineHeight:1.2,marginTop:8,fontWeight:700}}>Financial Summary</h1><p style={{color:"rgba(255,255,255,0.85)",fontSize:16,marginTop:12}}>Generate a professional client summary from your calculator sheet.</p></div></div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"36px 20px"}}>
        <div className="no-print" style={{background:"#fff",borderRadius:16,border:"1px solid "+C.grey200,padding:28,boxShadow:"0 2px 12px rgba(0,0,0,0.03)",marginBottom:32}}>
          <h3 style={{fontSize:18,fontWeight:700,marginBottom:6}}>{"📊 Generate Client Summary"}</h3>
          <p style={{fontSize:13,color:C.grey500,marginBottom:20}}>Paste your Google Sheet URL and select the scenario to display.</p>
          <div style={{display:"grid",gap:16}}>
            <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Google Sheet URL *</label><input className="fi" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl} onChange={function(e){setSheetUrl(e.target.value)}}/><div style={{fontSize:11,color:C.grey500,marginTop:4}}>Sheet must be shared as "Anyone with the link can view"</div></div>
            <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Scenario *</label><select className="fi" value={scenario} onChange={function(e){setScenario(e.target.value)}}><option value="private">Buy Private Property</option><option value="hdb">Buy HDB</option><option value="ec">Buy Executive Condominium</option></select></div>
            <button onClick={fetchData} disabled={!sheetUrl||loading} style={{width:"100%",padding:16,background:(!sheetUrl||loading)?"#D1D5DB":C.navy,color:"#fff",border:"none",borderRadius:10,fontSize:16,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:(!sheetUrl||loading)?"not-allowed":"pointer"}}>{loading?<><span className="spinner"/>Loading data...</>:"Generate Summary \u2192"}</button>
          </div>
        </div>
        {error&&<div style={{padding:"16px 20px",background:"#FEF2F2",borderRadius:10,border:"1px solid #FECACA",marginBottom:24}}><p style={{fontSize:14,color:"#DC2626"}}>{error}</p></div>}
      </div>

      {profile&&scenarioData&&<div>
        {/* Debug Panel */}
        {debugRows&&<div style={{maxWidth:794,margin:"0 auto",padding:"0 20px 20px"}}>
          <div style={{background:"#FFFBE6",borderRadius:12,border:"3px solid #F6A623",padding:20}}>
            <h4 style={{fontSize:16,fontWeight:700,marginBottom:12,color:"#B45309"}}>🔍 DEBUG: Raw Cell Values (Profile Tab)</h4>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12,fontFamily:"monospace"}}>
              {[
                {label:"D7 Client1",ref:"R6,C3",val:g(debugRows.profile,6,3)},
                {label:"F7 Client2",ref:"R6,C5",val:g(debugRows.profile,6,5)},
                {label:"K8 PropAddr",ref:"R7,C10",val:g(debugRows.profile,7,10)},
                {label:"L9 SellPrice",ref:"R8,C11",val:g(debugRows.profile,8,11)},
                {label:"L10 Loan",ref:"R9,C11",val:g(debugRows.profile,9,11)},
                {label:"D9 Age1",ref:"R8,C3",val:g(debugRows.profile,8,3)},
                {label:"F9 Age2",ref:"R8,C5",val:g(debugRows.profile,8,5)},
                {label:"D15 Emp1",ref:"R14,C3",val:g(debugRows.profile,14,3)},
                {label:"F15 Emp2",ref:"R14,C5",val:g(debugRows.profile,14,5)},
                {label:"D19 Inc1",ref:"R18,C3",val:g(debugRows.profile,18,3)},
                {label:"F19 Inc2",ref:"R18,C5",val:g(debugRows.profile,18,5)},
                {label:"L19 CPFRef",ref:"R18,C11",val:g(debugRows.profile,18,11)},
                {label:"K21 AgentPct",ref:"R20,C10",val:g(debugRows.profile,20,10)},
                {label:"L21 AgentFee",ref:"R20,C11",val:g(debugRows.profile,20,11)},
                {label:"L27 NetCash",ref:"R26,C11",val:g(debugRows.profile,26,11)},
                {label:"U13 CPFOA",ref:"R12,C20",val:g(debugRows.profile,12,20)},
                {label:"U24 TotalFunds",ref:"R23,C20",val:g(debugRows.profile,23,20)},
                {label:"H30 MaxLoan",ref:"R29,C7",val:g(debugRows.profile,29,7)},
                {label:"D27 Tenure",ref:"R26,C3",val:g(debugRows.profile,26,3)},
                {label:"K33 Stress",ref:"R32,C10",val:g(debugRows.profile,32,10)},
                {label:"K36 AgentNm",ref:"R35,C10",val:g(debugRows.profile,35,10)},
                {label:"K37 Mobile",ref:"R36,C10",val:g(debugRows.profile,36,10)},
                {label:"K38 RES",ref:"R37,C10",val:g(debugRows.profile,37,10)},
                {label:"K39 Date",ref:"R38,C10",val:g(debugRows.profile,38,10)},
              ].map(function(d,i){return <div key={i} style={{padding:"4px 8px",background:d.val?"#F0FBF4":"#FEF2F2",borderRadius:4,border:"1px solid "+(d.val?"#BBF7D0":"#FECACA")}}><strong>{d.label}</strong>: <span style={{color:d.val?"#276749":"#C53030",fontWeight:700}}>{d.val||"EMPTY"}</span></div>})}
            </div>
            <h4 style={{fontSize:16,fontWeight:700,marginTop:20,marginBottom:12,color:"#B45309"}}>🔍 DEBUG: Raw Cell Values (Scenario Tab)</h4>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12,fontFamily:"monospace"}}>
              {[
                {label:"K18 Price",ref:"R17,C10",val:g(debugRows.scenario,17,10)},
                {label:"I23 LTV%",ref:"R22,C8",val:g(debugRows.scenario,22,8)},
                {label:"K23 LoanAmt",ref:"R22,C10",val:g(debugRows.scenario,22,10)},
                {label:"K28 Tenure",ref:"R27,C10",val:g(debugRows.scenario,27,10)},
                {label:"K29 IntRate",ref:"R28,C10",val:g(debugRows.scenario,28,10)},
                {label:"K30 Instal",ref:"R29,C10",val:g(debugRows.scenario,29,10)},
                {label:"K33 Pledge",ref:"R32,C10",val:g(debugRows.scenario,32,10)},
                {label:"K34 Unpledge",ref:"R33,C10",val:g(debugRows.scenario,33,10)},
                {label:"R23 BSD",ref:"R22,C17",val:g(debugRows.scenario,22,17)},
                {label:"R16 CPFBal",ref:"R15,C17",val:g(debugRows.scenario,15,17)},
                {label:"R28 CashBal",ref:"R27,C17",val:g(debugRows.scenario,27,17)},
                {label:"R33 TotalRem",ref:"R32,C17",val:g(debugRows.scenario,32,17)},
                {label:"R36 Inst",ref:"R35,C17",val:g(debugRows.scenario,35,17)},
                {label:"R37 CPFContr",ref:"R36,C17",val:g(debugRows.scenario,36,17)},
                {label:"R38 CashRep",ref:"R37,C17",val:g(debugRows.scenario,37,17)},
                {label:"R41 Months",ref:"R40,C17",val:g(debugRows.scenario,40,17)},
                {label:"R42 Years",ref:"R41,C17",val:g(debugRows.scenario,41,17)},
              ].map(function(d,i){return <div key={i} style={{padding:"4px 8px",background:d.val?"#F0FBF4":"#FEF2F2",borderRadius:4,border:"1px solid "+(d.val?"#BBF7D0":"#FECACA")}}><strong>{d.label}</strong>: <span style={{color:d.val?"#276749":"#C53030",fontWeight:700}}>{d.val||"EMPTY"}</span></div>})}
            </div>
            <div style={{marginTop:16,padding:12,background:"#fff",borderRadius:8,fontSize:11,color:C.textMuted,maxHeight:300,overflow:"auto"}}>
              <strong>Raw rows dump (first 10 rows of Profile tab):</strong>
              {debugRows.profile.slice(0,10).map(function(row,ri){return <div key={ri} style={{marginTop:6,wordBreak:"break-all",borderBottom:"1px solid #eee",paddingBottom:4}}><strong style={{color:C.navy}}>Row {ri}:</strong> {row.map(function(c,ci){return c?"<strong>["+ci+"]</strong>"+c:""}).filter(Boolean).join(" | ")}</div>})}
              <strong style={{marginTop:12,display:"block"}}>Raw rows dump (first 10 rows of Scenario tab):</strong>
              {debugRows.scenario.slice(0,10).map(function(row,ri){return <div key={ri} style={{marginTop:6,wordBreak:"break-all",borderBottom:"1px solid #eee",paddingBottom:4}}><strong style={{color:C.navy}}>Row {ri}:</strong> {row.map(function(c,ci){return c?"<strong>["+ci+"]</strong>"+c:""}).filter(Boolean).join(" | ")}</div>})}
            </div>
          </div>
        </div>}
        <div className="no-print" style={{maxWidth:720,margin:"0 auto",padding:"0 20px 16px",display:"flex",gap:12}}>
          <button onClick={function(){window.print()}} style={{padding:"10px 20px",background:C.navy,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{"🖨 Print / Save PDF"}</button>
        </div>
        <ReportView profile={profile} scenario={scenarioData} scenarioLabel={labelMap[scenario]}/>
      </div>}

      <div className="no-print" style={{background:"#F3F4F6",padding:"28px 20px",textAlign:"center",marginTop:36,borderTop:"1px solid "+C.grey200}}><div style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,marginBottom:6}}>Avenue 88</div><div style={{color:C.grey500,fontSize:12}}>Huttons / Navis · © 2026 Avenue 88</div></div>
    </div>
  );
}
