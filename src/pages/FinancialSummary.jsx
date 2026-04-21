import { useState, useCallback } from "react";

var C={navy:"#1B3D72",navyLight:"#2B5299",accent:"#C9A84C",white:"#FFFFFF",bg:"#F7F8FA",text:"#1A202C",textMuted:"#4A5568",border:"#E2E8F0",greyTile:"#4A5568",lightBox:"#F7F8FA",blue:"#2B88D8",blueDark:"#1E6AB5",blueLight:"#E8F2FC",grey200:"#E5E7EB",grey500:"#6B7280",grey600:"#4B5563",grey900:"#111827"};

function fmt$(n){if(n===null||n===undefined||isNaN(n))return"$0";var abs=Math.abs(Math.round(n));var s="$"+abs.toLocaleString();return n<0?"("+s+")":s}
function extractSheetId(url){var m=url.match(/\/d\/([a-zA-Z0-9_-]+)/);return m?m[1]:null}

function parseGvizJson(text){
  var match=text.match(/setResponse\(([\s\S]+)\);?$/);
  if(!match)throw new Error("Invalid response");
  var json=JSON.parse(match[1]);
  if(!json.table||!json.table.rows)throw new Error("No data");
  var rows=json.table.rows||[];
  var grid=[];
  for(var r=0;r<rows.length;r++){
    var row=[];var cells=rows[r].c||[];
    for(var c=0;c<cells.length;c++){
      if(!cells[c]){row.push("");continue}
      // Prefer formatted value for display, raw value for numbers
      var fv=cells[c].f;
      var rv=cells[c].v;
      row.push({f:fv!==undefined&&fv!==null?String(fv):"",v:rv!==null&&rv!==undefined?rv:"",display:fv!==undefined&&fv!==null?String(fv):rv!==null&&rv!==undefined?String(rv):""});
    }
    grid.push(row);
  }
  return grid;
}

// Convert Excel-style cell ref like "L9" or "AA12" → {row, col} (0-indexed)
function cellRef(ref){
  var m=ref.match(/^([A-Z]+)(\d+)$/);if(!m)return null;
  var letters=m[1];var row=parseInt(m[2],10)-1;
  var col=0;for(var i=0;i<letters.length;i++){col=col*26+(letters.charCodeAt(i)-64)}
  return{row:row,col:col-1};
}

// Get cell at Excel-style reference (e.g. "L9")
function cellAt(grid,ref){
  var rc=cellRef(ref);if(!rc)return null;
  if(rc.row<0||rc.row>=grid.length)return null;
  if(!grid[rc.row]||rc.col<0||rc.col>=grid[rc.row].length)return null;
  return grid[rc.row][rc.col]||null;
}

// Scoped label search — restrict to a row/col range
// opts: {minCol, maxCol, colsRight, minRow, maxRow, allowRow} defaults: cols 0..∞, right 1
function findValInRange(grid,label,opts){
  opts=opts||{};
  var minCol=opts.minCol===undefined?0:opts.minCol;
  var maxCol=opts.maxCol===undefined?999:opts.maxCol;
  var minRow=opts.minRow===undefined?0:opts.minRow;
  var maxRow=opts.maxRow===undefined?9999:opts.maxRow;
  var colsRight=opts.colsRight||1;
  for(var r=minRow;r<=maxRow&&r<grid.length;r++){
    if(!grid[r])continue;
    for(var c=minCol;c<=maxCol&&c<grid[r].length;c++){
      var cell=grid[r][c];if(!cell)continue;
      var txt=cell.display||cell.f||String(cell.v||"");
      if(txt&&txt.toLowerCase().indexOf(label.toLowerCase())>=0){
        // Walk right, skipping empty cells, until we've consumed colsRight non-empty cells
        var consumed=0;
        for(var cc=c+1;cc<grid[r].length&&cc<=maxCol+colsRight+5;cc++){
          var nc=grid[r][cc];
          if(nc&&(nc.v!==undefined&&nc.v!=="")){
            consumed++;
            if(consumed>=colsRight)return nc;
          }
        }
        // Fallback: return cell at c+colsRight if it exists
        var t=c+colsRight;
        if(t<grid[r].length)return grid[r][t];
      }
    }
  }
  return null;
}

// Simple wrapper — backward compat
function findVal(grid,label,colsRight){
  return findValInRange(grid,label,{colsRight:colsRight||1});
}

// Collect non-empty values to the right of a label (first match only)
function findValsInRange(grid,label,opts){
  opts=opts||{};
  var minCol=opts.minCol===undefined?0:opts.minCol;
  var maxCol=opts.maxCol===undefined?999:opts.maxCol;
  var minRow=opts.minRow===undefined?0:opts.minRow;
  var maxRow=opts.maxRow===undefined?9999:opts.maxRow;
  for(var r=minRow;r<=maxRow&&r<grid.length;r++){
    if(!grid[r])continue;
    for(var c=minCol;c<=maxCol&&c<grid[r].length;c++){
      var cell=grid[r][c];if(!cell)continue;
      var txt=cell.display||"";
      if(txt&&txt.toLowerCase().indexOf(label.toLowerCase())>=0){
        var vals=[];
        for(var cc=c+1;cc<grid[r].length;cc++){
          if(grid[r][cc]&&grid[r][cc].v!==undefined&&grid[r][cc].v!==""){
            vals.push(grid[r][cc]);
          }
        }
        return vals;
      }
    }
  }
  return [];
}

function findVals(grid,label){return findValsInRange(grid,label,{})}

function getNum(cell){if(!cell)return 0;var v=cell.v;if(typeof v==="number")return v;var s=String(cell.f||cell.v||"").replace(/[$,%\s()]/g,"");var n=parseFloat(s);return isNaN(n)?0:n}
function getStr(cell){if(!cell)return"";return cell.f||String(cell.v||"")}

// Auto-detect row offset by finding a known landmark label.
// gviz JSON may skip leading empty rows, so sheet row N != grid index N-1.
// We find "Borrowers Details" (known to be at sheet row 7) and compute the shift.
function detectRowOffset(grid,landmark,expectedSheetRow){
  for(var r=0;r<grid.length;r++){
    if(!grid[r])continue;
    for(var c=0;c<grid[r].length;c++){
      var cell=grid[r][c];if(!cell)continue;
      var txt=String(cell.display||cell.f||cell.v||"");
      if(txt.indexOf(landmark)>=0){
        // Grid row r corresponds to sheet row expectedSheetRow
        // So offset = (expectedSheetRow - 1) - r  (subtract from sheet row to get grid idx)
        return (expectedSheetRow-1)-r;
      }
    }
  }
  return 0;
}

// Cell lookup with offset applied — pass "L9" and the offset, get the right grid cell
function cellAtOffset(grid,ref,rowOffset){
  var rc=cellRef(ref);if(!rc)return null;
  var actualRow=rc.row-rowOffset;
  if(actualRow<0||actualRow>=grid.length)return null;
  if(!grid[actualRow]||rc.col<0||rc.col>=grid[actualRow].length)return null;
  return grid[actualRow][rc.col]||null;
}

function parseProfile(grid){
  // ─── Detect row offset using "Borrowers Details" landmark (expected at sheet row 7) ───
  var off=detectRowOffset(grid,"Borrowers Details",7);

  // Shorthand: get cell at a sheet ref
  function $(ref){return cellAtOffset(grid,ref,off)}

  // ─── Client info ───
  var clientName1=getStr($("D7"));
  var clientName2=getStr($("F7"));

  // ─── Property section (Sale of Property, cols J-L) ───
  // Property Address is at K7 (or merged K7:L7)
  var propertyAddress=getStr($("K7"))||getStr($("L7"));
  var sellingPrice=getNum($("L8"));
  var outstandingLoan=Math.abs(getNum($("L9")));
  var cpfRefund=Math.abs(getNum($("L19"))); // "Total CPF Usage"
  var agentPct=getStr($("K21"))||"2%";
  var agentFee=Math.abs(getNum($("L21")));
  var netCash=getNum($("L27"));

  // ─── Borrower details (cols D & F) ───
  var b1Age=getStr($("D9"));
  var b2Age=getStr($("F9"));
  var b1Emp=getStr($("D15"));
  var b2Emp=getStr($("F15"));
  var b1Inc=getNum($("D19"));
  var b2Inc=getNum($("F19"));

  // ─── Available Funds (right side, cols O-P) ───
  // Combined column is at P. OA Balance P11, CPF Refund P12, Total Available OA P13
  var cpfOACombined=getNum($("P13")); // Total Available OA Combined
  var totalFunds=getNum($("P22"));    // Total Cash + CPF Available Combined

  // ─── Max Loan section (row 30, Combined at H30) ───
  var maxLoan=getNum($("H30"));
  var maxLTV=getStr($("H26"))||"75%";
  var maxTenure=getNum($("H27"))||22;

  // ─── Stress Test / Agent footer ───
  var stressRate=getStr($("K34"))||"4%";
  var agentName=getStr($("D36"));
  var mobile=getStr($("D37"));
  var resNum=getStr($("D38"));
  var datePrepared=getStr($("D39"));

  // ─── Property Type label (at C6 header area, value at F6) ───
  var propType=getStr($("F6"))||getStr($("C6"))||"Private Property";

  return{
    clientName1:clientName1,clientName2:clientName2,propertyAddress:propertyAddress,
    sellingPrice:sellingPrice,outstandingLoan:outstandingLoan,
    b1Age:b1Age,b2Age:b2Age,b1Emp:b1Emp,b2Emp:b2Emp,b1Inc:b1Inc,b2Inc:b2Inc,
    cpfRefund:cpfRefund,agentPct:agentPct,agentFee:agentFee,netCash:netCash,
    cpfOACombined:cpfOACombined,totalFunds:totalFunds,maxLoan:maxLoan,maxTenure:maxTenure,
    stressRate:stressRate,agentName:agentName,mobile:mobile,resNum:resNum,
    datePrepared:datePrepared,maxLTV:maxLTV,propType:propType,
    _rowOffset:off
  }
}

function parseScenario(grid){
  // Detect row offset — landmark "Purchase Structure" is at sheet row 16
  var off=detectRowOffset(grid,"Purchase Structure",16);
  // Fallback: try "Loan Affordaibility" at row 7
  if(off===0){
    var off2=detectRowOffset(grid,"Loan Affordaibility",7);
    if(off2!==0)off=off2;
  }
  function $(ref){return cellAtOffset(grid,ref,off)}

  // ─── Purchase Structure (Combined column = K) ───
  var price=getNum($("K18"));           // Purchase price Combined
  var ltvPct=getStr($("J23"))||"75%";   // LTV % Combined
  var loanAmt=getNum($("K23"));         // LTV $ Combined

  // ─── Loan details ───
  var tenure=getNum($("K28"));          // Loan Tenure (Years) Combined
  var intRate=getStr($("K29"))||"1.5%"; // Assume Interest Combined
  var instalment=getNum($("K30"));      // Monthly Instalment Combined

  // ─── Pledging / Unpledge (Combined column K) ───
  var pledging=getNum($("K33"));        // Pledging of funds (48 mths)
  var unpledge=getNum($("K34"));        // Unpledge / Show funds

  // ─── Remaining balance section (RIGHT side, Combined column = R) ───
  var bsd=Math.abs(getNum($("R23")));   // Less Stamp Duty Combined
  // CPF Balance & Cash Balance in "Remaining balance" sub-section
  var cpfBal=getNum($("R31"));          // CPF Balance Combined (Remaining)
  var cashBal=getNum($("R32"));         // Cash Balance Combined (Remaining)
  var totalRemaining=getNum($("R33")); // Total Combined
  // If total cell is empty, compute it
  if(!totalRemaining)totalRemaining=cpfBal+cashBal;

  // ─── Monthly Instalment breakdown (bottom right section) ───
  var cpfContrib=getNum($("R37"));      // CPF OA Distributon Combined
  var cashRepay=getNum($("R38"));       // Cash Repayment Per mth Combined

  // ─── Reserves ───
  var reserveMonths=getNum($("R41"));   // Number of Months Combined
  var reserveYears=getNum($("R42"));    // Number of Years Combined

  return{price:price,ltvPct:ltvPct,loanAmt:loanAmt,tenure:tenure,intRate:intRate,instalment:instalment,pledging:pledging,unpledge:unpledge,bsd:bsd,cpfBal:cpfBal,cashBal:cashBal,totalRemaining:totalRemaining,cpfContrib:cpfContrib,cashRepay:cashRepay,reserveMonths:reserveMonths,reserveYears:reserveYears,_rowOffset:off}
}

function ReportView(props){
  var p=props.profile;var s=props.scenario;var label=props.scenarioLabel||"Private Property";
  if(!p||!s)return null;
  var clientName=p.clientName2?p.clientName1+" & "+p.clientName2:p.clientName1;
  return(
    <div style={{background:"#e8eaf0",padding:"30px 20px",display:"flex",justifyContent:"center"}}>
      <div style={{background:C.white,width:"100%",maxWidth:794,boxShadow:"0 4px 40px rgba(0,0,0,0.15)",overflow:"hidden"}}>
        <div style={{background:C.navy,padding:"28px 40px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#fff",letterSpacing:1}}>AVENUE 88</div><div style={{fontSize:11,color:"rgba(255,255,255,0.6)",letterSpacing:2,textTransform:"uppercase",marginTop:2}}>Property Advisory</div></div><div style={{textAlign:"right"}}><div style={{fontSize:13,color:"rgba(255,255,255,0.5)",letterSpacing:2,textTransform:"uppercase"}}>Financial Summary</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#fff",marginTop:2}}>{clientName}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:4}}>Prepared: {p.datePrepared}</div></div></div>
        <div style={{height:3,background:"linear-gradient(90deg,"+C.accent+" 0%,#e8c96d 50%,"+C.accent+" 100%)"}}/>
        <div style={{padding:"32px 40px 28px"}}>
          <div style={{marginBottom:26}}><div style={{background:C.navy,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>Your Current Property</div><div style={{background:C.lightBox,border:"1px solid "+C.border,borderLeft:"4px solid "+C.navy,borderRadius:4,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.navy,fontWeight:700}}>{p.propertyAddress||"Property"}</div><div style={{fontSize:12.5,color:C.textMuted,marginTop:3}}>{p.propType} · Outstanding Loan: {fmt$(p.outstandingLoan)}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.textMuted}}>Target Selling Price</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.navy,fontWeight:700,marginTop:2}}>{fmt$(p.sellingPrice)}</div></div></div></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div style={{marginBottom:26}}><div style={{background:C.navy,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>Sale Proceeds</div>
              {[{l:"Selling Price",v:fmt$(p.sellingPrice)},{l:"Less Outstanding Loan",v:fmt$(-p.outstandingLoan),neg:true},{l:"Less CPF Refund (incl. interest)",v:fmt$(-p.cpfRefund),neg:true},{l:"Less Agent Fees ("+p.agentPct+" + GST)",v:fmt$(-p.agentFee),neg:true}].map(function(r,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid "+C.border,fontSize:12.5}}><span style={{color:C.textMuted}}>{r.l}</span><span style={{fontWeight:500,color:r.neg?"#C53030":C.text}}>{r.v}</span></div>})}
              <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderTop:"1px solid "+C.border,marginTop:2,fontSize:12.5}}><span style={{color:C.text,fontWeight:600}}>Net Cash Proceeds</span><span style={{color:C.navy,fontWeight:700}}>{fmt$(p.netCash)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",fontSize:12.5}}><span style={{color:C.textMuted}}>CPF OA Available (after refund)</span><span style={{fontWeight:500}}>{fmt$(p.cpfOACombined)}</span></div>
              <div style={{background:C.navy,borderRadius:4,padding:"14px 18px",marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:11,color:"rgba(255,255,255,0.65)",letterSpacing:1,textTransform:"uppercase"}}>Total Funds Available</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>Cash + CPF Combined</div></div><div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:C.accent,fontWeight:700}}>{fmt$(p.totalFunds)}</div></div>
            </div>
            <div style={{marginBottom:26}}><div style={{background:C.greyTile,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>Your Buying Power</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div style={{background:C.lightBox,border:"1px solid "+C.border,borderRadius:4,padding:"12px 16px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.textMuted}}>Max Bank Loan (TDSR)</div><div style={{fontSize:18,fontWeight:700,color:C.navy,marginTop:4}}>{fmt$(p.maxLoan)}</div><div style={{fontSize:10.5,color:C.textMuted,marginTop:2}}>Stress test @ {p.stressRate} | {p.maxTenure}yr</div></div><div style={{background:C.lightBox,border:"1px solid "+C.border,borderRadius:4,padding:"12px 16px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.textMuted}}>Max LTV</div><div style={{fontSize:18,fontWeight:700,color:C.navy,marginTop:4}}>{p.maxLTV}</div><div style={{fontSize:10.5,color:C.textMuted,marginTop:2}}>{label}</div></div></div>
              <div style={{display:"grid",gridTemplateColumns:p.clientName2?"1fr 1fr":"1fr",gap:8,marginTop:10}}><div style={{background:"#F0F4FA",border:"1px solid #D0DEF0",borderRadius:4,padding:"10px 14px"}}><strong style={{fontSize:12}}>{p.clientName1}</strong><span style={{fontSize:11,color:C.textMuted}}> · Age {p.b1Age} · {p.b1Emp}</span><br/><span style={{fontSize:11,color:C.textMuted}}>Income: {fmt$(p.b1Inc)}/mth</span></div>{p.clientName2&&<div style={{background:"#F0F4FA",border:"1px solid #D0DEF0",borderRadius:4,padding:"10px 14px"}}><strong style={{fontSize:12}}>{p.clientName2}</strong><span style={{fontSize:11,color:C.textMuted}}> · Age {p.b2Age} · {p.b2Emp}</span><br/><span style={{fontSize:11,color:C.textMuted}}>Income: {fmt$(p.b2Inc)}/mth</span></div>}</div>
            </div>
          </div>
          <div><div style={{background:C.greyTile,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>{"Scenario \u2014 If You Buy a "+fmt$(s.price)+" "+label}</div>
            <div style={{background:C.lightBox,border:"1px solid "+C.border,borderRadius:4,padding:18}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>{[{l:"Purchase Price",v:fmt$(s.price)},{l:"Bank Loan ("+s.ltvPct+" LTV)",v:fmt$(s.loanAmt)},{l:"Buyer Stamp Duty (BSD)",v:fmt$(s.bsd),neg:true},{l:"Monthly Instalment @ "+s.intRate,v:fmt$(s.instalment)+" / mth"},{l:"Less CPF OA Contribution",v:"\u2014 "+fmt$(s.cpfContrib)+" / mth",green:true},{l:"Net Cash Instalment / mth",v:fmt$(s.cashRepay)+" / mth",hl:true}].map(function(item,i){return <div key={i} style={{background:item.hl?"#EBF0F9":"white",border:"1px solid "+(item.hl?"#B8CAE8":"#D0DEF0"),borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:item.hl?C.navy:C.textMuted}}>{item.l}</div><div style={{fontSize:14,fontWeight:700,color:item.neg?"#C53030":item.green?"#276749":item.hl?C.navy:C.text,marginTop:4}}>{item.v}</div></div>})}</div>
              {s.pledging>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}><div style={{background:"#FFF3E0",border:"1.5px solid #F6A623",borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"#B45309"}}>{"⚠ Pledging Required (48 mths)"}</div><div style={{fontSize:18,fontWeight:700,color:"#B45309",marginTop:4}}>{fmt$(s.pledging)}</div></div><div style={{background:"#F0FBF4",border:"1.5px solid #68D391",borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"#276749"}}>Show / Unpledge Funds</div><div style={{fontSize:18,fontWeight:700,color:"#276749",marginTop:4}}>{fmt$(s.unpledge)}</div></div></div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginTop:10}}><div style={{background:"white",border:"1px solid #D0DEF0",borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:C.textMuted}}>CPF Balance After</div><div style={{fontSize:14,fontWeight:700,color:C.navy,marginTop:4}}>{fmt$(s.cpfBal)}</div></div><div style={{background:"white",border:"1px solid #D0DEF0",borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:C.textMuted}}>Cash Balance After</div><div style={{fontSize:14,fontWeight:700,color:s.cashBal<0?"#C53030":C.navy,marginTop:4}}>{fmt$(s.cashBal)}</div></div><div style={{background:C.navy,borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"rgba(255,255,255,0.6)"}}>{"Total Remaining \u2713"}</div><div style={{fontSize:15,fontWeight:700,color:"#6EE7A0",marginTop:4}}>{fmt$(s.totalRemaining)}</div></div><div style={{background:C.navy,borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"rgba(255,255,255,0.6)"}}>Reserves</div><div style={{fontSize:15,fontWeight:700,color:"#6EE7A0",marginTop:4}}>{Math.round(Math.abs(s.reserveMonths))} mths</div><div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:1}}>{"\u2248 "+Math.abs(s.reserveYears).toFixed(1)+" years"}</div></div></div>
            </div>
          </div>
        </div>
        <div style={{background:C.lightBox,borderTop:"1px solid "+C.border,padding:"14px 40px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:12,color:C.textMuted}}><strong style={{color:C.navy}}>{p.agentName}</strong> · RES No. {p.resNum} · {p.mobile} · Avenue 88</div><div style={{fontSize:9.5,color:"#A0AEC0",maxWidth:340,textAlign:"right",lineHeight:1.5}}>This summary is for general guidance only and does not constitute financial or investment advice. All figures are estimates. Actual loan approvals subject to bank assessment.</div></div>
      </div>
    </div>
  );
}

export default function FinancialSummary(){
  var [sheetUrl,setSheetUrl]=useState("");var [scenario,setScenario]=useState("private");var [loading,setLoading]=useState(false);var [error,setError]=useState("");var [profile,setProfile]=useState(null);var [scenarioData,setScenarioData]=useState(null);var [debugInfo,setDebugInfo]=useState(null);
  var tabMap={private:"2A. Buy Private",hdb:"2B. HDB",ec:"2C. Buy EC"};
  var labelMap={private:"Private Property",hdb:"HDB",ec:"Executive Condominium"};

  var fetchData=useCallback(function(){
    var sheetId=extractSheetId(sheetUrl);if(!sheetId){setError("Invalid URL.");return}
    setLoading(true);setError("");setProfile(null);setScenarioData(null);setDebugInfo(null);
    var baseUrl="https://docs.google.com/spreadsheets/d/"+sheetId+"/gviz/tq?tqx=out:json&sheet=";
    Promise.all([
      fetch(baseUrl+encodeURIComponent("1. Profile Affordability")).then(function(r){if(!r.ok)throw new Error("Cannot access. Share as 'Anyone with link'.");return r.text()}),
      fetch(baseUrl+encodeURIComponent(tabMap[scenario])).then(function(r){if(!r.ok)throw new Error("Tab not found.");return r.text()})
    ]).then(function(results){
      var pGrid=parseGvizJson(results[0]);var sGrid=parseGvizJson(results[1]);
      var p=parseProfile(pGrid);var s=parseScenario(sGrid);
      // Field sources for debug — all direct cell refs now
      var pSrc={clientName1:"D7",clientName2:"F7",propertyAddress:"K7",sellingPrice:"L8",outstandingLoan:"L9",cpfRefund:"L19",agentPct:"K21",agentFee:"L21",netCash:"L27",b1Age:"D9",b2Age:"F9",b1Emp:"D15",b2Emp:"F15",b1Inc:"D19",b2Inc:"F19",cpfOACombined:"P13",totalFunds:"P22",maxLoan:"H30",maxLTV:"H26",maxTenure:"H27",stressRate:"K34",agentName:"D36",mobile:"D37",resNum:"D38",datePrepared:"D39",propType:"F6",_rowOffset:"(offset)"};
      var sSrc={price:"K18",ltvPct:"J23",loanAmt:"K23",tenure:"K28",intRate:"K29",instalment:"K30",pledging:"K33",unpledge:"K34",bsd:"R23",cpfBal:"R31",cashBal:"R32",totalRemaining:"R33",cpfContrib:"R37",cashRepay:"R38",reserveMonths:"R41",reserveYears:"R42",_rowOffset:"(offset)"};
      setDebugInfo({p:p,s:s,pSrc:pSrc,sSrc:sSrc,pRows:pGrid.length,sRows:sGrid.length});
      setProfile(p);setScenarioData(s);setLoading(false);
    }).catch(function(err){setError(err.message);setLoading(false)});
  },[sheetUrl,scenario]);

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.grey900}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet"/>
      <style>{"\
        *{margin:0;padding:0;box-sizing:border-box}\
        .fi{width:100%;padding:13px 16px;border:1.5px solid "+C.grey200+";border-radius:10px;font-size:15px;font-family:'DM Sans',sans-serif;background:#fff;outline:none;color:"+C.grey900+"}\
        .fi:focus{border-color:"+C.blue+";box-shadow:0 0 0 3px rgba(43,136,216,.12)}\
        select.fi{appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239CA3AF' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 16px center}\
        .nav-link{color:"+C.grey500+";text-decoration:none;font-size:14px;font-weight:500;padding:8px 14px;border-radius:6px}\
        .nav-link:hover{color:"+C.blue+";background:#F3F4F6}\
        .nav-active{color:"+C.blue+";font-weight:600}\
        @keyframes spin{to{transform:rotate(360deg)}}\
        .spinner{width:20px;height:20px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px}\
        @media print{.no-print{display:none!important}body{background:#fff!important}}\
      "}</style>
      <div className="no-print" style={{background:C.white,padding:"0 20px",position:"sticky",top:0,zIndex:100,borderBottom:"1px solid "+C.grey200}}><div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:56}}><a href="/" style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,textDecoration:"none"}}>Avenue 88</a><div style={{display:"flex",gap:4}}><a href="/" className="nav-link">Home</a><a href="/timeline" className="nav-link">Timeline</a><a href="/valuation" className="nav-link">Valuation</a><a href="/upgrader" className="nav-link">Upgrader</a><a href="/summary" className="nav-link nav-active">Summary</a></div></div></div>
      <div className="no-print" style={{background:"linear-gradient(135deg,"+C.navy+","+C.navyLight+")",padding:"48px 20px 40px"}}><div style={{maxWidth:720,margin:"0 auto"}}><span style={{color:"rgba(255,255,255,0.8)",fontSize:12,fontWeight:600,letterSpacing:2,textTransform:"uppercase"}}>Avenue 88 · Tool</span><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,5vw,42px)",color:"#fff",lineHeight:1.2,marginTop:8,fontWeight:700}}>Financial Summary</h1><p style={{color:"rgba(255,255,255,0.85)",fontSize:16,marginTop:12}}>Generate a professional client summary from your calculator sheet.</p></div></div>
      <div style={{maxWidth:720,margin:"0 auto",padding:"36px 20px"}}>
        <div className="no-print" style={{background:"#fff",borderRadius:16,border:"1px solid "+C.grey200,padding:28,marginBottom:32}}>
          <h3 style={{fontSize:18,fontWeight:700,marginBottom:6}}>{"📊 Generate Client Summary"}</h3>
          <p style={{fontSize:13,color:C.grey500,marginBottom:20}}>Paste your Google Sheet URL and select the scenario.</p>
          <div style={{display:"grid",gap:16}}>
            <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Google Sheet URL *</label><input className="fi" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl} onChange={function(e){setSheetUrl(e.target.value)}}/><div style={{fontSize:11,color:C.grey500,marginTop:4}}>Sheet must be shared as "Anyone with the link can view"</div></div>
            <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Scenario *</label><select className="fi" value={scenario} onChange={function(e){setScenario(e.target.value)}}><option value="private">Buy Private Property</option><option value="hdb">Buy HDB</option><option value="ec">Buy Executive Condominium</option></select></div>
            <button onClick={fetchData} disabled={!sheetUrl||loading} style={{width:"100%",padding:16,background:(!sheetUrl||loading)?"#D1D5DB":C.navy,color:"#fff",border:"none",borderRadius:10,fontSize:16,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:(!sheetUrl||loading)?"not-allowed":"pointer"}}>{loading?<><span className="spinner"/>Loading...</>:"Generate Summary \u2192"}</button>
          </div>
        </div>
        {error&&<div style={{padding:"16px 20px",background:"#FEF2F2",borderRadius:10,border:"1px solid #FECACA",marginBottom:24}}><p style={{fontSize:14,color:"#DC2626"}}>{error}</p></div>}
      </div>
      {profile&&scenarioData&&<div>
        {debugInfo&&<div className="no-print" style={{maxWidth:794,margin:"0 auto",padding:"0 20px 20px"}}><div style={{background:"#FFFBE6",borderRadius:12,border:"3px solid #F6A623",padding:16,fontSize:12,fontFamily:"monospace"}}>
          <strong style={{color:"#B45309"}}>{"🔍 DEBUG — Profile (source shown after each field)"}</strong>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginTop:8}}>
            {Object.keys(debugInfo.p).map(function(k,i){var v=debugInfo.p[k];var src=debugInfo.pSrc&&debugInfo.pSrc[k]?debugInfo.pSrc[k]:"";return <div key={i} style={{padding:"3px 6px",background:v?"#F0FBF4":"#FEF2F2",borderRadius:3}}><strong>{k}</strong>: <span style={{color:v?"#276749":"#C53030"}}>{v===0?"0":v||"EMPTY"}</span>{src&&<span style={{color:"#888",fontSize:10}}> [{src}]</span>}</div>})}
          </div>
          <strong style={{color:"#B45309",marginTop:8,display:"block"}}>Scenario tab (column-banded):</strong>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginTop:4}}>
            {Object.keys(debugInfo.s).map(function(k,i){var v=debugInfo.s[k];var src=debugInfo.sSrc&&debugInfo.sSrc[k]?debugInfo.sSrc[k]:"";return <div key={i} style={{padding:"3px 6px",background:v?"#F0FBF4":"#FEF2F2",borderRadius:3}}><strong>{k}</strong>: <span style={{color:v?"#276749":"#C53030"}}>{v===0?"0":v||"EMPTY"}</span>{src&&<span style={{color:"#888",fontSize:10}}> [{src}]</span>}</div>})}
          </div>
          <div style={{marginTop:8,color:"#888",fontSize:10}}>Profile rows: {debugInfo.pRows} · Scenario rows: {debugInfo.sRows}</div>
        </div></div>}
        <div className="no-print" style={{maxWidth:720,margin:"0 auto",padding:"0 20px 16px"}}><button onClick={function(){window.print()}} style={{padding:"10px 20px",background:C.navy,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{"🖨 Print / Save PDF"}</button></div>
        <ReportView profile={profile} scenario={scenarioData} scenarioLabel={labelMap[scenario]}/>
      </div>}
      <div className="no-print" style={{background:"#F3F4F6",padding:"28px 20px",textAlign:"center",marginTop:36,borderTop:"1px solid "+C.grey200}}><div style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,marginBottom:6}}>Avenue 88</div><div style={{color:C.grey500,fontSize:12}}>Huttons / Navis · © 2026 Avenue 88</div></div>
    </div>
  );
}
