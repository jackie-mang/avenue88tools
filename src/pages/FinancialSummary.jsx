import { useState, useCallback } from "react";
import * as XLSX from "xlsx";

var C={navy:"#1B3D72",navyLight:"#2B5299",accent:"#C9A84C",white:"#FFFFFF",bg:"#F7F8FA",text:"#1A202C",textMuted:"#4A5568",border:"#E2E8F0",greyTile:"#4A5568",lightBox:"#F7F8FA",blue:"#2B88D8",blueDark:"#1E6AB5",blueLight:"#E8F2FC",grey200:"#E5E7EB",grey500:"#6B7280",grey600:"#4B5563",grey900:"#111827"};

function fmt$(n){if(n===null||n===undefined||isNaN(n))return"$0";var abs=Math.abs(Math.round(n));var s="$"+abs.toLocaleString();return n<0?"("+s+")":s}

// Parse .xlsx file (ArrayBuffer) into a grid of {v,f,display} cells, 1:1 with sheet rows/cols.
// Sheet row N is at grid[N-1], sheet col A is at index 0.
// Returns an object keyed by sheet name.
function parseXlsx(arrayBuffer){
  var wb=XLSX.read(arrayBuffer,{type:"array",cellFormula:false,cellDates:false});
  var out={};
  for(var name of wb.SheetNames){
    var ws=wb.Sheets[name];
    if(!ws||!ws["!ref"]){out[name]=[];continue}
    var range=XLSX.utils.decode_range(ws["!ref"]);
    var grid=[];
    for(var r=0;r<=range.e.r;r++){
      var row=[];
      for(var c=0;c<=range.e.c;c++){
        var addr=XLSX.utils.encode_cell({r:r,c:c});
        var cell=ws[addr];
        if(!cell||cell.v===undefined||cell.v===null||cell.v===""){row.push(null);continue}
        // cell.v = raw value, cell.w = formatted display value, cell.t = type
        var v=cell.v;var f=cell.w!==undefined?String(cell.w):String(v);
        row.push({v:v,f:f,display:f});
      }
      grid.push(row);
    }
    // Apply merged ranges — populate the top-left cell value into all sub-cells
    // so that looking up any cell in a merged range returns the value.
    if(ws["!merges"]){
      for(var m of ws["!merges"]){
        var anchor=grid[m.s.r]&&grid[m.s.r][m.s.c];
        if(!anchor)continue;
        for(var rr=m.s.r;rr<=m.e.r;rr++){
          for(var cc=m.s.c;cc<=m.e.c;cc++){
            if(rr===m.s.r&&cc===m.s.c)continue;
            if(!grid[rr])continue;
            if(!grid[rr][cc])grid[rr][cc]=anchor;
          }
        }
      }
    }
    out[name]=grid;
  }
  return out;
}

// Parse CSV text into a 2D grid of {v,f,display} cells.
// gviz CSV output quotes values containing commas, so "$1,450,000" is one field, not three.
// Unquoted numbers like 2000000 stay as numbers.
function parseCsv(text){
  if(!text||typeof text!=="string")return [];
  var rows=[];
  var row=[];
  var field="";
  var inQuotes=false;
  var i=0,n=text.length;
  while(i<n){
    var ch=text[i];
    if(inQuotes){
      if(ch==='"'){
        if(i+1<n&&text[i+1]==='"'){field+='"';i+=2;continue}
        inQuotes=false;i++;continue;
      }
      field+=ch;i++;continue;
    }
    if(ch==='"'){inQuotes=true;i++;continue}
    if(ch===","){row.push(field);field="";i++;continue}
    if(ch==='\r'){i++;continue}
    if(ch==='\n'){row.push(field);rows.push(row);row=[];field="";i++;continue}
    field+=ch;i++;
  }
  // flush last field/row
  if(field.length>0||row.length>0){row.push(field);rows.push(row)}
  // Convert to cell objects
  var grid=[];
  for(var r=0;r<rows.length;r++){
    var out=[];
    for(var c=0;c<rows[r].length;c++){
      var raw=rows[r][c];
      if(raw===undefined||raw===null||raw===""){out.push(null);continue}
      // Detect if it's a pure number (no comma, no $, no %) — keep as number
      var asNum=parseFloat(raw);
      var isPureNum=!isNaN(asNum)&&/^-?\d+(\.\d+)?$/.test(raw.trim());
      out.push({
        v:isPureNum?asNum:raw,
        f:raw,
        display:raw
      });
    }
    grid.push(out);
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

function getNum(cell){
  if(!cell)return 0;
  var v=cell.v;
  if(typeof v==="number")return v;
  var raw=String(cell.f||cell.v||"").trim();
  if(!raw)return 0;
  // Handle accounting-style negatives "(350,954)" → -350954
  var neg=/^\(.*\)$/.test(raw);
  var s=raw.replace(/[$,%\s()]/g,"");
  var n=parseFloat(s);
  if(isNaN(n))return 0;
  return neg?-n:n;
}
function getStr(cell){if(!cell)return"";return cell.f||String(cell.v||"")}
// Format a cell as a percentage string. Handles both raw decimals (0.75) and pre-formatted ("75%")
function getPct(cell){
  if(!cell)return"";
  var f=cell.f;
  if(f&&String(f).indexOf("%")>=0)return String(f);
  var v=cell.v;
  if(typeof v==="number"){
    // If v is between 0 and 1, treat as decimal fraction; otherwise as percentage integer
    if(v>0&&v<=1)return (v*100).toFixed(v*100%1===0?0:2).replace(/\.00$/,"")+"%";
    return v+"%";
  }
  return String(f||v||"");
}

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

// Robust cell lookup: tries direct ref first, then falls back to finding the label
// on the same sheet row and walking right N non-empty cells.
// gviz sometimes drops string cells in columns auto-typed as numeric, so this
// two-step lookup is necessary.
function smartCell(grid,ref,rowOffset,labelOnRow,skipRight){
  // Try direct ref
  var direct=cellAtOffset(grid,ref,rowOffset);
  if(direct&&(direct.v!==null&&direct.v!==undefined&&direct.v!=="")){
    return direct;
  }
  // Fallback: find the label on the same sheet row and walk right
  if(!labelOnRow)return direct;
  var rc=cellRef(ref);if(!rc)return direct;
  var targetRow=rc.row-rowOffset;
  if(targetRow<0||targetRow>=grid.length||!grid[targetRow])return direct;
  skipRight=skipRight||1;
  // Locate the label in that row
  for(var c=0;c<grid[targetRow].length;c++){
    var cell=grid[targetRow][c];if(!cell)continue;
    var txt=String(cell.display||cell.f||cell.v||"");
    if(txt&&txt.toLowerCase().indexOf(labelOnRow.toLowerCase())>=0){
      // Walk right, skipping empty cells
      var consumed=0;
      for(var cc=c+1;cc<grid[targetRow].length;cc++){
        var nc=grid[targetRow][cc];
        if(nc&&(nc.v!==undefined&&nc.v!==null&&nc.v!=="")){
          consumed++;
          if(consumed>=skipRight)return nc;
        }
      }
      // Not found — walk right up to 30 cells and return any cell with a formatted string
      for(var cc=c+1;cc<Math.min(grid[targetRow].length,c+30);cc++){
        var nc=grid[targetRow][cc];
        if(nc){
          consumed++;
          if(consumed>=skipRight)return nc;
        }
      }
    }
  }
  return direct;
}

function parseProfile(grid){
  // Excel upload: grid is 1:1 with sheet rows. No offset needed.
  function $(ref){return cellAtOffset(grid,ref,0)}

  return{
    clientName1:getStr($("D7")),
    clientName2:getStr($("F7")),
    propType:getStr($("D6"))||"Private Property",
    propertyAddress:getStr($("K8")),
    sellingPrice:getNum($("L9")),
    outstandingLoan:Math.abs(getNum($("L10"))),
    cpfRefund:Math.abs(getNum($("L19"))),
    agentPct:getPct($("K21"))||"2%",
    agentFee:Math.abs(getNum($("L21"))),
    netCash:getNum($("L27")),
    b1Age:getStr($("D9")),b2Age:getStr($("F9")),
    b1Emp:getStr($("D15")),b2Emp:getStr($("F15")),
    b1Inc:getNum($("D19")),b2Inc:getNum($("F19")),
    cpfOACombined:getNum($("T13")),
    totalFunds:getNum($("T22")),
    maxLTV:getPct($("H26"))||"75%",
    maxTenure:getNum($("H27"))||22,
    maxLoan:getNum($("H30")),
    stressRate:getPct($("K34"))||"4%",
    agentName:getStr($("K36")),
    mobile:getStr($("K37")),
    resNum:getStr($("K38")),
    datePrepared:getStr($("K39"))
  }
}

function parseScenario(grid){
  // Excel upload: grid is 1:1 with sheet rows. No offset needed.
  function $(ref){return cellAtOffset(grid,ref,0)}

  var cpfBal=getNum($("R31"));
  var cashBal=getNum($("R32"));
  var totalRemaining=getNum($("R33"));
  if(!totalRemaining)totalRemaining=cpfBal+cashBal;

  return{
    price:getNum($("K18")),
    ltvPct:getPct($("J23"))||"75%",
    loanAmt:getNum($("K23")),
    tenure:getNum($("K28")),
    intRate:getPct($("K29"))||"1.5%",
    instalment:getNum($("K30")),
    pledging:getNum($("K33")),
    unpledge:getNum($("K34")),
    bsd:Math.abs(getNum($("R23"))),
    cpfBal:cpfBal,cashBal:cashBal,totalRemaining:totalRemaining,
    cpfContrib:getNum($("R37")),
    cashRepay:getNum($("R38")),
    reserveMonths:getNum($("R41")),
    reserveYears:getNum($("R42"))
  }
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
  var [file,setFile]=useState(null);var [scenario,setScenario]=useState("private");var [loading,setLoading]=useState(false);var [error,setError]=useState("");var [profile,setProfile]=useState(null);var [scenarioData,setScenarioData]=useState(null);var [debugInfo,setDebugInfo]=useState(null);
  var tabMap={private:"2A. Buy Private",hdb:"2B. HDB",ec:"2C. Buy EC"};
  var labelMap={private:"Private Property",hdb:"HDB",ec:"Executive Condominium"};

  var processFile=useCallback(function(){
    if(!file){setError("Please upload an Excel file.");return}
    setLoading(true);setError("");setProfile(null);setScenarioData(null);setDebugInfo(null);
    var reader=new FileReader();
    reader.onload=function(e){
      try{
        var workbook=parseXlsx(e.target.result);
        var profileName="1. Profile Affordability";
        var scenarioName=tabMap[scenario];
        var pGrid=workbook[profileName];
        var sGrid=workbook[scenarioName];
        if(!pGrid){throw new Error("Tab '"+profileName+"' not found in file.")}
        if(!sGrid){throw new Error("Tab '"+scenarioName+"' not found in file.")}
        var p=parseProfile(pGrid);
        var s=parseScenario(sGrid);
        var pSrc={clientName1:"D7",clientName2:"F7",propertyAddress:"K8",sellingPrice:"L9",outstandingLoan:"L10",cpfRefund:"L19",agentPct:"K21",agentFee:"L21",netCash:"L27",b1Age:"D9",b2Age:"F9",b1Emp:"D15",b2Emp:"F15",b1Inc:"D19",b2Inc:"F19",cpfOACombined:"T13",totalFunds:"T22",maxLoan:"H30",maxLTV:"H26",maxTenure:"H27",stressRate:"K34",agentName:"K36",mobile:"K37",resNum:"K38",datePrepared:"K39",propType:"D6"};
        var sSrc={price:"K18",ltvPct:"J23",loanAmt:"K23",tenure:"K28",intRate:"K29",instalment:"K30",pledging:"K33",unpledge:"K34",bsd:"R23",cpfBal:"R31",cashBal:"R32",totalRemaining:"R33",cpfContrib:"R37",cashRepay:"R38",reserveMonths:"R41",reserveYears:"R42"};
        setDebugInfo({p:p,s:s,pSrc:pSrc,sSrc:sSrc,pRows:pGrid.length,sRows:sGrid.length});
        setProfile(p);setScenarioData(s);setLoading(false);
      }catch(err){setError("Could not parse file: "+err.message);setLoading(false)}
    };
    reader.onerror=function(){setError("Error reading file.");setLoading(false)};
    reader.readAsArrayBuffer(file);
  },[file,scenario]);

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
          <p style={{fontSize:13,color:C.grey500,marginBottom:20}}>Upload your ASM Calculator Excel file (.xlsx) and select the scenario.</p>
          <div style={{display:"grid",gap:16}}>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Calculator File (.xlsx) *</label>
              <div style={{border:"1.5px dashed "+C.grey200,borderRadius:10,padding:20,textAlign:"center",background:"#FAFBFC",cursor:"pointer",position:"relative"}} onClick={function(){document.getElementById("xlsxInput").click()}}>
                <input id="xlsxInput" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{display:"none"}} onChange={function(e){var f=e.target.files&&e.target.files[0];if(f){setFile(f);setError("")}}}/>
                {file?<div><div style={{fontSize:14,fontWeight:600,color:C.navy}}>{"📎 "+file.name}</div><div style={{fontSize:11,color:C.grey500,marginTop:4}}>{(file.size/1024).toFixed(0)} KB · Click to change</div></div>:<div><div style={{fontSize:14,color:C.grey600,fontWeight:500}}>Click to upload .xlsx file</div><div style={{fontSize:11,color:C.grey500,marginTop:4}}>In Google Sheets: File → Download → Microsoft Excel (.xlsx)</div></div>}
              </div>
            </div>
            <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Scenario *</label><select className="fi" value={scenario} onChange={function(e){setScenario(e.target.value)}}><option value="private">Buy Private Property</option><option value="hdb">Buy HDB</option><option value="ec">Buy Executive Condominium</option></select></div>
            <button onClick={processFile} disabled={!file||loading} style={{width:"100%",padding:16,background:(!file||loading)?"#D1D5DB":C.navy,color:"#fff",border:"none",borderRadius:10,fontSize:16,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:(!file||loading)?"not-allowed":"pointer"}}>{loading?<><span className="spinner"/>Processing...</>:"Generate Summary \u2192"}</button>
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
