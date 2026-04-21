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

function parseProfile(grid){
  // ─── CONFIRMED CELL ADDRESSES (from Jackie's sheet layout) ───
  // Client names at D7 and F7 — confirmed
  var clientName1=getStr(cellAt(grid,"D7"));
  var clientName2=getStr(cellAt(grid,"F7"));
  // Fallback: search for "Specially prepared for" row if D7/F7 empty
  if(!clientName1){
    var spCell=findVal(grid,"Specially prepared for",1);
    if(spCell){
      var spText=getStr(spCell);
      // Might contain "Sean & Stephanie" — split on & or "and"
      var parts=spText.split(/\s*[&]\s*|\s+and\s+/i);
      clientName1=parts[0]||"";
      clientName2=parts[1]||"";
    }
  }

  // Property Address at K8 — confirmed
  var propertyAddress=getStr(cellAt(grid,"K8"));

  // Target Selling Price at L9, Outstanding Loan at L10, CPF Refund at L19 — confirmed
  var sellingPrice=getNum(cellAt(grid,"L9"));
  var outstandingLoan=Math.abs(getNum(cellAt(grid,"L10")));
  var cpfRefund=Math.abs(getNum(cellAt(grid,"L19")));

  // Agent name at L36, CEA number at L38 — confirmed
  var agentName=getStr(cellAt(grid,"L36"));
  var resNum=getStr(cellAt(grid,"L38"));

  // ─── BORROWER ROWS — restricted column band (left side of profile tab) ───
  // Borrower columns are typically D (3) and F (5) — limit search to col range 0..7
  var borrowerBand={minCol:0,maxCol:7};

  // Ages — search within borrower band only
  var ageVals=findValsInRange(grid,"Age",borrowerBand);
  var b1Age=ageVals[0]?getStr(ageVals[0]):"";
  var b2Age=ageVals[1]?getStr(ageVals[1]):"";

  // Employment type — restrict to borrower band (avoids hitting a later section)
  var empVals=findValsInRange(grid,"Employment Type",borrowerBand);
  var b1Emp=empVals[0]?getStr(empVals[0]):"";
  var b2Emp=empVals[1]?getStr(empVals[1]):"";

  // Total income — restrict to borrower band
  var incVals=findValsInRange(grid,"Total income",borrowerBand);
  var b1Inc=incVals[0]?getNum(incVals[0]):0;
  var b2Inc=incVals[1]?getNum(incVals[1]):0;

  // Property Type — restrict to top-of-sheet band (before row 12)
  var propTypeCell=findValInRange(grid,"Property Type",{minRow:0,maxRow:11,colsRight:1});
  var propType=propTypeCell?getStr(propTypeCell):"";

  // ─── FIGURES IN COLUMN L (index 11) — scoped search in right column ───
  // Net Cash Proceeds / Total Available OA / Total Cash+CPF / Max Loan / Max LTV / Tenure / Stress test
  var rightBand={minCol:0,maxCol:11};

  var netCashVals=findValsInRange(grid,"Net Cash Proceeds",rightBand);
  var netCash=netCashVals.length>0?getNum(netCashVals[netCashVals.length-1]):0;

  var oaVals=findValsInRange(grid,"Total Available OA",rightBand);
  var cpfOACombined=oaVals.length>0?getNum(oaVals[oaVals.length-1]):0;

  var totalVals=findValsInRange(grid,"Total Cash + CPF",rightBand);
  var totalFunds=totalVals.length>0?getNum(totalVals[totalVals.length-1]):0;

  var maxLoanVals=findValsInRange(grid,"Max Loan quantum",rightBand);
  var maxLoan=maxLoanVals.length>0?getNum(maxLoanVals[maxLoanVals.length-1]):0;

  var tenureVals=findValsInRange(grid,"Max Loan tenure",rightBand);
  var maxTenure=tenureVals.length>0?getNum(tenureVals[0]):22;

  var ltvVals=findValsInRange(grid,"Max Loan to value",rightBand);
  var maxLTV=ltvVals.length>0?getStr(ltvVals[0]):"75%";

  var stressCell=findValInRange(grid,"Stress Test Interest",rightBand);
  var stressRate=stressCell?getStr(stressCell):"4%";

  // Agent fee (percent + dollar amount) — search the Sale Proceeds section (rows 10-25)
  // Use specific labels to avoid matching the "Agent Name" cell at L36
  var agentFeeVals=findValsInRange(grid,"Agent (incl",{minRow:9,maxRow:25,maxCol:11});
  if(agentFeeVals.length===0)agentFeeVals=findValsInRange(grid,"Agent Fee",{minRow:9,maxRow:25,maxCol:11});
  if(agentFeeVals.length===0)agentFeeVals=findValsInRange(grid,"Agent",{minRow:9,maxRow:25,maxCol:11});
  var agentPct=agentFeeVals[0]?getStr(agentFeeVals[0]):"2%";
  var agentFee=agentFeeVals[1]?Math.abs(getNum(agentFeeVals[1])):(agentFeeVals[0]?Math.abs(getNum(agentFeeVals[0])):0);

  // Mobile number — search near the agent section (rows 36-42)
  var mobileCell=findValInRange(grid,"Mobile",{minRow:36,maxRow:42,maxCol:11});
  var mobile=mobileCell?getStr(mobileCell):"";

  // Date prepared — near the top or agent footer
  var dateCell=findVal(grid,"Date Prepared",1);
  if(!dateCell)dateCell=findVal(grid,"Date",1);

  return{
    clientName1:clientName1,clientName2:clientName2,propertyAddress:propertyAddress,
    sellingPrice:sellingPrice,outstandingLoan:outstandingLoan,
    b1Age:b1Age,b2Age:b2Age,b1Emp:b1Emp,b2Emp:b2Emp,b1Inc:b1Inc,b2Inc:b2Inc,
    cpfRefund:cpfRefund,agentPct:agentPct,agentFee:agentFee,netCash:netCash,
    cpfOACombined:cpfOACombined,totalFunds:totalFunds,maxLoan:maxLoan,maxTenure:maxTenure,
    stressRate:stressRate,agentName:agentName,mobile:mobile,resNum:resNum,
    datePrepared:dateCell?getStr(dateCell):"",maxLTV:maxLTV,propType:propType,
  }
}

function parseScenario(grid){
  // Scenario tab has LEFT side (cols B-L, idx 1-11) for purchase/loan/instalment
  // and RIGHT side (cols N-R, idx 13-17) for "Remaining Balance" section
  var LEFT={minCol:0,maxCol:11};
  var RIGHT={minCol:12,maxCol:20};

  // ─── LEFT BAND: Purchase / Loan / Instalment / Pledging ───
  var priceVals=findValsInRange(grid,"Purchase price",LEFT);
  var price=priceVals.length>0?getNum(priceVals[priceVals.length-1]):0;

  // "Loan To Value" row has: label | LTV% | loan $  — grab them from LEFT band
  var ltvRow=findValsInRange(grid,"Loan To Value",LEFT);
  var ltvPct="75%",loanAmt=0;
  if(ltvRow.length>0){
    // find the percentage cell and the dollar cell
    for(var i=0;i<ltvRow.length;i++){
      var v=ltvRow[i];
      var fstr=String(v.f||"");
      if(fstr.indexOf("%")>=0&&ltvPct==="75%"){ltvPct=getStr(v)}
      else{var n=getNum(v);if(n>10000)loanAmt=n}
    }
    if(loanAmt===0&&ltvRow.length>=2)loanAmt=getNum(ltvRow[ltvRow.length-1]);
  }

  var tenVals=findValsInRange(grid,"Loan Tenure",LEFT);
  var tenure=tenVals.length>0?getNum(tenVals[tenVals.length-1]):22;

  var intVals=findValsInRange(grid,"Assume Interest",LEFT);
  var intRate=intVals.length>0?getStr(intVals[intVals.length-1]):"1.5%";

  // Monthly Instalment in LEFT band (there's also one in RIGHT — we take LEFT here for the headline number)
  var instVals=findValsInRange(grid,"Monthly Instalment",LEFT);
  var instalment=instVals.length>0?getNum(instVals[instVals.length-1]):0;

  var pledgeVals=findValsInRange(grid,"Pledging of funds",LEFT);
  var pledging=pledgeVals.length>0?getNum(pledgeVals[pledgeVals.length-1]):0;

  var unpledgeVals=findValsInRange(grid,"Unpledge",LEFT);
  var unpledge=unpledgeVals.length>0?getNum(unpledgeVals[unpledgeVals.length-1]):0;

  // ─── RIGHT BAND: Remaining Balance section ───
  var bsdVals=findValsInRange(grid,"Less Stamp Duty",RIGHT);
  if(bsdVals.length===0)bsdVals=findValsInRange(grid,"Buyer Stamp Duty",RIGHT);
  if(bsdVals.length===0)bsdVals=findValsInRange(grid,"BSD",RIGHT);
  var bsd=bsdVals.length>0?Math.abs(getNum(bsdVals[bsdVals.length-1])):0;

  var cpfBalVals=findValsInRange(grid,"CPF Balance",RIGHT);
  var cpfBal=cpfBalVals.length>0?getNum(cpfBalVals[cpfBalVals.length-1]):0;

  var cashBalVals=findValsInRange(grid,"Cash Balance",RIGHT);
  var cashBal=cashBalVals.length>0?getNum(cashBalVals[cashBalVals.length-1]):0;

  var cpfContribVals=findValsInRange(grid,"CPF OA Distribut",RIGHT);
  if(cpfContribVals.length===0)cpfContribVals=findValsInRange(grid,"CPF OA Contrib",RIGHT);
  var cpfContrib=cpfContribVals.length>0?getNum(cpfContribVals[cpfContribVals.length-1]):0;

  var cashRepVals=findValsInRange(grid,"Cash Repayment",RIGHT);
  var cashRepay=cashRepVals.length>0?getNum(cashRepVals[cashRepVals.length-1]):0;

  var monthsVals=findValsInRange(grid,"Number of Months",RIGHT);
  var reserveMonths=monthsVals.length>0?getNum(monthsVals[monthsVals.length-1]):0;

  var yearsVals=findValsInRange(grid,"Number of Years",RIGHT);
  var reserveYears=yearsVals.length>0?getNum(yearsVals[yearsVals.length-1]):0;

  var totalRemaining=cpfBal+cashBal;

  return{price:price,ltvPct:ltvPct,loanAmt:loanAmt,tenure:tenure,intRate:intRate,instalment:instalment,pledging:pledging,unpledge:unpledge,bsd:bsd,cpfBal:cpfBal,cashBal:cashBal,totalRemaining:totalRemaining,cpfContrib:cpfContrib,cashRepay:cashRepay,reserveMonths:reserveMonths,reserveYears:reserveYears}
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
      // Field sources for debug (what cell/label each was pulled from)
      var pSrc={clientName1:"D7",clientName2:"F7",propertyAddress:"K8",sellingPrice:"L9",outstandingLoan:"L10",cpfRefund:"L19",agentName:"L36",resNum:"L38",b1Age:"label:Age [c0-7]",b2Age:"label:Age [c0-7]",b1Emp:"label:Employment Type [c0-7]",b2Emp:"label:Employment Type [c0-7]",b1Inc:"label:Total income [c0-7]",b2Inc:"label:Total income [c0-7]",propType:"label:Property Type [r0-11]",netCash:"label:Net Cash Proceeds",cpfOACombined:"label:Total Available OA",totalFunds:"label:Total Cash + CPF",maxLoan:"label:Max Loan quantum",maxTenure:"label:Max Loan tenure",maxLTV:"label:Max Loan to value",stressRate:"label:Stress Test Interest",agentPct:"label:Agent",agentFee:"label:Agent",mobile:"label:Mobile [r36-42]",datePrepared:"label:Date"};
      var sSrc={price:"label:Purchase price [LEFT]",loanAmt:"label:Loan To Value [LEFT]",ltvPct:"label:Loan To Value [LEFT]",tenure:"label:Loan Tenure [LEFT]",intRate:"label:Assume Interest [LEFT]",instalment:"label:Monthly Instalment [LEFT]",pledging:"label:Pledging of funds [LEFT]",unpledge:"label:Unpledge [LEFT]",bsd:"label:Less Stamp Duty [RIGHT]",cpfBal:"label:CPF Balance [RIGHT]",cashBal:"label:Cash Balance [RIGHT]",cpfContrib:"label:CPF OA Distribut [RIGHT]",cashRepay:"label:Cash Repayment [RIGHT]",reserveMonths:"label:Number of Months [RIGHT]",reserveYears:"label:Number of Years [RIGHT]",totalRemaining:"cpfBal+cashBal"};
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
