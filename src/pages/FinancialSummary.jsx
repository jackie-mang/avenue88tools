import { useState, useCallback } from "react";

var C={navy:"#1B3D72",navyLight:"#2B5299",accent:"#C9A84C",white:"#FFFFFF",bg:"#F7F8FA",text:"#1A202C",textMuted:"#4A5568",border:"#E2E8F0",greyTile:"#4A5568",lightBox:"#F7F8FA",blue:"#2B88D8",blueDark:"#1E6AB5",blueLight:"#E8F2FC",grey200:"#E5E7EB",grey500:"#6B7280",grey600:"#4B5563",grey900:"#111827"};

function fmt$(n){if(n===null||n===undefined||isNaN(n))return"$0";var abs=Math.abs(Math.round(n));var s="$"+abs.toLocaleString();return n<0?"("+s+")":s}
function extractSheetId(url){var m=url.match(/\/d\/([a-zA-Z0-9_-]+)/);return m?m[1]:null}

// Parse Google Sheets JSON response (gviz/tq?tqx=out:json)
function parseGvizJson(text){
  // Response is: google.visualization.Query.setResponse({...})
  var match=text.match(/setResponse\(([\s\S]+)\);?$/);
  if(!match)throw new Error("Invalid response format");
  var json=JSON.parse(match[1]);
  if(!json.table||!json.table.rows)throw new Error("No data in response");
  var cols=json.table.cols||[];
  var rows=json.table.rows||[];
  // Build a 2D array: grid[row][col] = formatted value or raw value
  var grid=[];
  for(var r=0;r<rows.length;r++){
    var row=[];
    var cells=rows[r].c||[];
    for(var c=0;c<cells.length;c++){
      if(!cells[c]){row.push("");continue}
      // Use formatted value (f) if available, otherwise raw value (v)
      var v=cells[c].f!==undefined&&cells[c].f!==null?cells[c].f:cells[c].v;
      row.push(v!==null&&v!==undefined?String(v):"");
    }
    grid.push(row);
  }
  return grid;
}

// Get cell value: 1-based row/col matching spreadsheet (A=1,B=2...K=11,L=12...)
// But grid is 0-indexed, so subtract 1
function g(grid,sheetRow,sheetCol){
  var r=sheetRow-1;var c=sheetCol-1;
  if(!grid||r<0||r>=grid.length)return"";
  if(!grid[r]||c<0||c>=grid[r].length)return"";
  return grid[r][c]||"";
}
function gn(grid,sheetRow,sheetCol){
  var v=g(grid,sheetRow,sheetCol);
  if(!v)return 0;
  var cleaned=String(v).replace(/[$,%\s()]/g,"").replace(/^-$/,"0");
  var n=parseFloat(cleaned);
  // Handle parentheses as negative
  if(String(v).indexOf("(")>=0&&n>0)n=-n;
  return isNaN(n)?0:n;
}

function parseProfile(grid){
  // Using 1-based sheet row/col references
  // Col: A=1,B=2,C=3,D=4,E=5,F=6,G=7,H=8,I=9,J=10,K=11,L=12,M=13,N=14,O=15,P=16,Q=17,R=18,S=19,T=20,U=21
  return{
    clientName1:g(grid,7,4),        // D7
    clientName2:g(grid,7,6),        // F7
    propertyAddress:g(grid,8,11),   // K8
    sellingPrice:gn(grid,9,12),     // L9
    outstandingLoan:gn(grid,10,12), // L10
    b1YOB:g(grid,8,4),             // D8 Year of birth
    b2YOB:g(grid,8,6),             // F8
    b1Age:g(grid,9,4),             // D9
    b2Age:g(grid,9,6),             // F9
    b1Emp:g(grid,15,4),            // D15
    b2Emp:g(grid,15,6),            // F15
    b1Inc:gn(grid,19,4),           // D19
    b2Inc:gn(grid,19,6),           // F19
    cpfRefund:gn(grid,19,12),      // L19 Total CPF Usage
    agentPct:g(grid,21,11),        // K21
    agentFee:gn(grid,21,12),       // L21
    netCash:gn(grid,27,12),        // L27
    cpfOACombined:gn(grid,13,21),  // U13
    totalFunds:gn(grid,24,21),     // U24
    maxLoan:gn(grid,30,8),         // H30
    maxTenure:gn(grid,27,4),       // D27
    stressRate:g(grid,33,11),      // K33
    agentName:g(grid,36,11),       // K36
    mobile:g(grid,37,11),          // K37
    resNum:g(grid,38,11),          // K38
    datePrepared:g(grid,39,11),    // K39
    maxLTV:g(grid,26,4),           // D26
    propType:g(grid,6,6),          // F6 Property Type
  }
}

function parseScenarioPrivate(grid){
  return{
    price:gn(grid,18,11),           // K18 Combined purchase price
    ltvPct:g(grid,23,9),            // I23 LTV %
    loanAmt:gn(grid,23,11),         // K23 loan amount
    tenure:gn(grid,28,11),          // K28
    intRate:g(grid,29,11),           // K29
    instalment:gn(grid,30,11),      // K30
    pledging:gn(grid,33,11),        // K33
    unpledge:gn(grid,34,11),        // K34
    bsd:gn(grid,23,18),             // R23
    cpfBal:gn(grid,16,18),          // R16
    cashBal:gn(grid,28,18),         // R28
    totalRemaining:gn(grid,33,18),  // R33
    instCombined:gn(grid,36,18),    // R36
    cpfContrib:gn(grid,37,18),      // R37
    cashRepay:gn(grid,38,18),       // R38
    reserveMonths:gn(grid,41,18),   // R41
    reserveYears:gn(grid,42,18),    // R42
  }
}

function parseScenarioHDB(grid){
  return{
    price:gn(grid,18,11),ltvPct:g(grid,23,9),loanAmt:gn(grid,23,11),tenure:gn(grid,28,11),intRate:g(grid,29,11),instalment:gn(grid,30,11),pledging:gn(grid,33,11),unpledge:gn(grid,34,11),bsd:gn(grid,23,18),cpfBal:gn(grid,16,18),cashBal:gn(grid,28,18),totalRemaining:gn(grid,33,18),instCombined:gn(grid,36,18),cpfContrib:gn(grid,37,18),cashRepay:gn(grid,38,18),reserveMonths:gn(grid,41,18),reserveYears:gn(grid,42,18),
  }
}

function parseScenarioEC(grid){
  return{
    price:gn(grid,18,11),ltvPct:g(grid,23,9),loanAmt:gn(grid,23,11),tenure:gn(grid,28,11),intRate:g(grid,29,11),instalment:gn(grid,30,11),pledging:gn(grid,33,11),unpledge:gn(grid,34,11),bsd:gn(grid,23,18),cpfBal:gn(grid,16,18),cashBal:gn(grid,28,18),totalRemaining:gn(grid,33,18),instCombined:gn(grid,36,18),cpfContrib:gn(grid,37,18),cashRepay:gn(grid,38,18),reserveMonths:gn(grid,41,18),reserveYears:gn(grid,42,18),
  }
}

function ReportView(props){
  var p=props.profile;var s=props.scenario;var label=props.scenarioLabel||"Private Property";
  if(!p||!s)return null;
  var clientName=p.clientName2?p.clientName1+" & "+p.clientName2:p.clientName1;
  return(
    <div style={{background:"#e8eaf0",padding:"30px 20px",display:"flex",justifyContent:"center"}}>
      <div style={{background:C.white,width:"100%",maxWidth:794,boxShadow:"0 4px 40px rgba(0,0,0,0.15)",overflow:"hidden"}}>
        <div style={{background:C.navy,padding:"28px 40px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#fff",letterSpacing:1}}>AVENUE 88</div><div style={{fontSize:11,color:"rgba(255,255,255,0.6)",letterSpacing:2,textTransform:"uppercase",marginTop:2}}>Property Advisory</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:13,color:"rgba(255,255,255,0.5)",letterSpacing:2,textTransform:"uppercase"}}>Financial Summary</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#fff",marginTop:2}}>{clientName}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:4}}>Prepared: {p.datePrepared}</div></div>
        </div>
        <div style={{height:3,background:"linear-gradient(90deg,"+C.accent+" 0%,#e8c96d 50%,"+C.accent+" 100%)"}}/>
        <div style={{padding:"32px 40px 28px"}}>
          <div style={{marginBottom:26}}>
            <div style={{background:C.navy,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>Your Current Property</div>
            <div style={{background:C.lightBox,border:"1px solid "+C.border,borderLeft:"4px solid "+C.navy,borderRadius:4,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.navy,fontWeight:700}}>{p.propertyAddress||"Property"}</div><div style={{fontSize:12.5,color:C.textMuted,marginTop:3}}>{p.propType} · Outstanding Loan: {fmt$(p.outstandingLoan)}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.textMuted}}>Target Selling Price</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.navy,fontWeight:700,marginTop:2}}>{fmt$(p.sellingPrice)}</div></div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div style={{marginBottom:26}}>
              <div style={{background:C.navy,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>Sale Proceeds</div>
              {[{l:"Selling Price",v:fmt$(p.sellingPrice)},{l:"Less Outstanding Loan",v:fmt$(-p.outstandingLoan),neg:true},{l:"Less CPF Refund (incl. interest)",v:fmt$(-p.cpfRefund),neg:true},{l:"Less Agent Fees ("+p.agentPct+" + GST)",v:fmt$(-p.agentFee),neg:true}].map(function(r,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid "+C.border,fontSize:12.5}}><span style={{color:C.textMuted}}>{r.l}</span><span style={{fontWeight:500,color:r.neg?"#C53030":C.text}}>{r.v}</span></div>})}
              <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderTop:"1px solid "+C.border,marginTop:2,fontSize:12.5}}><span style={{color:C.text,fontWeight:600}}>Net Cash Proceeds</span><span style={{color:C.navy,fontWeight:700}}>{fmt$(p.netCash)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",fontSize:12.5}}><span style={{color:C.textMuted}}>CPF OA Available (after refund)</span><span style={{fontWeight:500}}>{fmt$(p.cpfOACombined)}</span></div>
              <div style={{background:C.navy,borderRadius:4,padding:"14px 18px",marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:11,color:"rgba(255,255,255,0.65)",letterSpacing:1,textTransform:"uppercase"}}>Total Funds Available</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>Cash + CPF Combined</div></div><div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:C.accent,fontWeight:700}}>{fmt$(p.totalFunds)}</div></div>
            </div>
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
  var [debugInfo,setDebugInfo]=useState(null);

  var tabMap={private:"2A. Buy Private",hdb:"2B. HDB",ec:"2C. Buy EC"};
  var labelMap={private:"Private Property",hdb:"HDB",ec:"Executive Condominium"};

  var fetchData=useCallback(function(){
    var sheetId=extractSheetId(sheetUrl);
    if(!sheetId){setError("Invalid Google Sheet URL.");return}
    setLoading(true);setError("");setProfile(null);setScenarioData(null);setDebugInfo(null);

    var profileTab=encodeURIComponent("1. Profile Affordability");
    var scenarioTab=encodeURIComponent(tabMap[scenario]);
    // Use JSON format instead of CSV to get properly formatted values
    var baseUrl="https://docs.google.com/spreadsheets/d/"+sheetId+"/gviz/tq?tqx=out:json&sheet=";

    Promise.all([
      fetch(baseUrl+profileTab).then(function(r){if(!r.ok)throw new Error("Cannot access sheet. Share as 'Anyone with the link can view'.");return r.text()}),
      fetch(baseUrl+scenarioTab).then(function(r){if(!r.ok)throw new Error("Tab '"+tabMap[scenario]+"' not found.");return r.text()})
    ]).then(function(results){
      var profileGrid=parseGvizJson(results[0]);
      var scenarioGrid=parseGvizJson(results[1]);

      // Debug: show key cells
      var dbg={
        profile:{
          "D7 Client1":g(profileGrid,7,4),"F7 Client2":g(profileGrid,7,6),
          "K8 Address":g(profileGrid,8,11),"L9 SellPrice":g(profileGrid,9,12),
          "L10 Loan":g(profileGrid,10,12),"L19 CPFRef":g(profileGrid,19,12),
          "K21 AgentPct":g(profileGrid,21,11),"L21 AgentFee":g(profileGrid,21,12),
          "L27 NetCash":g(profileGrid,27,12),"U13 CPFOA":g(profileGrid,13,21),
          "U24 TotalFunds":g(profileGrid,24,21),"H30 MaxLoan":g(profileGrid,30,8),
          "K36 Agent":g(profileGrid,36,11),"K37 Mobile":g(profileGrid,37,11),
          "K38 RES":g(profileGrid,38,11),"K39 Date":g(profileGrid,39,11),
        },
        scenario:{
          "K18 Price":g(scenarioGrid,18,11),"I23 LTV":g(scenarioGrid,23,9),
          "K23 Loan":g(scenarioGrid,23,11),"K30 Instal":g(scenarioGrid,30,11),
          "K33 Pledge":g(scenarioGrid,33,11),"K34 Unpledge":g(scenarioGrid,34,11),
          "R23 BSD":g(scenarioGrid,23,18),"R16 CPFBal":g(scenarioGrid,16,18),
          "R28 CashBal":g(scenarioGrid,28,18),"R33 TotalRem":g(scenarioGrid,33,18),
          "R37 CPFContr":g(scenarioGrid,37,18),"R38 CashRep":g(scenarioGrid,38,18),
          "R41 Months":g(scenarioGrid,41,18),"R42 Years":g(scenarioGrid,42,18),
        },
        profileRows:profileGrid.length,scenarioRows:scenarioGrid.length
      };
      setDebugInfo(dbg);

      var p=parseProfile(profileGrid);
      var s;
      if(scenario==="private")s=parseScenarioPrivate(scenarioGrid);
      else if(scenario==="hdb")s=parseScenarioHDB(scenarioGrid);
      else s=parseScenarioEC(scenarioGrid);
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
        .fi{width:100%;padding:13px 16px;border:1.5px solid "+C.grey200+";border-radius:10px;font-size:15px;font-family:'DM Sans',sans-serif;background:#fff;outline:none;color:"+C.grey900+"}\
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
        {debugInfo&&<div className="no-print" style={{maxWidth:794,margin:"0 auto",padding:"0 20px 20px"}}>
          <div style={{background:"#FFFBE6",borderRadius:12,border:"3px solid #F6A623",padding:20}}>
            <h4 style={{fontSize:16,fontWeight:700,marginBottom:12,color:"#B45309"}}>{"🔍 DEBUG: Cell Values (JSON format)"}</h4>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12,fontFamily:"monospace"}}>
              {Object.keys(debugInfo.profile).map(function(k,i){var v=debugInfo.profile[k];return <div key={i} style={{padding:"4px 8px",background:v?"#F0FBF4":"#FEF2F2",borderRadius:4,border:"1px solid "+(v?"#BBF7D0":"#FECACA")}}><strong>{k}</strong>: <span style={{color:v?"#276749":"#C53030",fontWeight:700}}>{v||"EMPTY"}</span></div>})}
            </div>
            <h4 style={{fontSize:14,fontWeight:700,marginTop:16,marginBottom:8,color:"#B45309"}}>Scenario Tab</h4>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12,fontFamily:"monospace"}}>
              {Object.keys(debugInfo.scenario).map(function(k,i){var v=debugInfo.scenario[k];return <div key={i} style={{padding:"4px 8px",background:v?"#F0FBF4":"#FEF2F2",borderRadius:4,border:"1px solid "+(v?"#BBF7D0":"#FECACA")}}><strong>{k}</strong>: <span style={{color:v?"#276749":"#C53030",fontWeight:700}}>{v||"EMPTY"}</span></div>})}
            </div>
            <div style={{fontSize:11,color:C.textMuted,marginTop:8}}>Profile: {debugInfo.profileRows} rows · Scenario: {debugInfo.scenarioRows} rows</div>
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
