import { useState, useCallback } from "react";

const C={navy:"#1B3D72",navyLight:"#2B5299",accent:"#C9A84C",white:"#FFFFFF",bg:"#F7F8FA",text:"#1A202C",textMuted:"#4A5568",border:"#E2E8F0",green:"#2D7D4E",greyTile:"#4A5568",lightBox:"#F7F8FA",blue:"#2B88D8",blueDark:"#1E6AB5",blueLight:"#E8F2FC",grey200:"#E5E7EB",grey300:"#D1D5DB",grey500:"#6B7280",grey600:"#4B5563",grey900:"#111827"};

function fmt$(n){if(n===null||n===undefined||isNaN(n))return"$0";var abs=Math.abs(Math.round(n));var s="$"+abs.toLocaleString();return n<0?"("+s+")":s}
function fmtPct(n){if(n===null||isNaN(n))return"0%";return(n*100).toFixed(1)+"%"}
function parseNum(s){if(!s)return 0;var cleaned=String(s).replace(/[$,()%\s]/g,"").replace(/^\((.+)\)$/,"$1");var n=parseFloat(cleaned);if(String(s).indexOf("(")>=0&&n>0)n=-n;return isNaN(n)?0:n}

function extractSheetId(url){
  var m=url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m?m[1]:null;
}

function csvToRows(csv){
  var rows=[];var current="";var inQuotes=false;
  for(var i=0;i<csv.length;i++){
    var ch=csv[i];
    if(ch==='"'){inQuotes=!inQuotes;current+=ch}
    else if(ch==='\n'&&!inQuotes){rows.push(current);current=""}
    else{current+=ch}
  }
  if(current)rows.push(current);
  return rows.map(function(row){
    var cells=[];var cell="";var q=false;
    for(var j=0;j<row.length;j++){
      var c=row[j];
      if(c==='"'){q=!q}
      else if(c===','&&!q){cells.push(cell.trim());cell=""}
      else{cell+=c}
    }
    cells.push(cell.trim());
    return cells;
  });
}

function findCell(rows,searchText,colOffset){
  colOffset=colOffset||0;
  for(var r=0;r<rows.length;r++){
    for(var c=0;c<rows[r].length;c++){
      if(rows[r][c]&&rows[r][c].indexOf(searchText)>=0){
        return rows[r][c+1+colOffset]||"";
      }
    }
  }
  return "";
}

function findCellByRC(rows,searchText,returnCol){
  for(var r=0;r<rows.length;r++){
    for(var c=0;c<rows[r].length;c++){
      if(rows[r][c]&&rows[r][c].indexOf(searchText)>=0){
        return rows[r][returnCol]||"";
      }
    }
  }
  return "";
}

function findRow(rows,searchText){
  for(var r=0;r<rows.length;r++){
    for(var c=0;c<rows[r].length;c++){
      if(rows[r][c]&&rows[r][c].indexOf(searchText)>=0)return r;
    }
  }
  return -1;
}

function parseProfile(rows){
  var clientRow=findRow(rows,"Specially prepared for");
  var clientName=clientRow>=0?rows[clientRow][3]||rows[clientRow][2]||"":"Client";
  
  // Borrowers
  var b1Row=findRow(rows,"Borrowers Details");
  var b1Name=b1Row>=0?rows[b1Row][3]||"":"";
  var b2Name=b1Row>=0?rows[b1Row][5]||"":"";
  
  var ageRow=findRow(rows,"Age");
  var b1Age=ageRow>=0?rows[ageRow][3]||"":"";
  var b2Age=ageRow>=0?rows[ageRow][5]||"":"";
  
  var empRow=findRow(rows,"Employment Type");
  var b1Emp=empRow>=0?rows[empRow][3]||"":"";
  var b2Emp=empRow>=0?rows[empRow][5]||"":"";
  
  var incRow=findRow(rows,"Total income");
  var b1Inc=incRow>=0?parseNum(rows[incRow][3]):"";
  var b2Inc=incRow>=0?parseNum(rows[incRow][5]):"";
  
  // Property type
  var propTypeRow=findRow(rows,"Property Type");
  var propType=propTypeRow>=0?rows[propTypeRow][4]||rows[propTypeRow][3]||"":"";
  
  // Sale proceeds
  var sellRow=findRow(rows,"Selling Price");
  var sellingPrice=sellRow>=0?parseNum(rows[sellRow][5]||rows[sellRow][4]):0;
  
  var loanRow=findRow(rows,"Less outstanding loan");
  var outstandingLoan=loanRow>=0?parseNum(rows[loanRow][5]||rows[loanRow][4]):0;
  
  var cpfUsageRow=findRow(rows,"Total CPF Usage");
  var cpfRefund=cpfUsageRow>=0?parseNum(rows[cpfUsageRow][5]||rows[cpfUsageRow][4]):0;
  
  var agentRow=findRow(rows,"Agent (incl GST)");
  var agentPct=agentRow>=0?rows[agentRow][4]||"2%":"2%";
  var agentFee=agentRow>=0?parseNum(rows[agentRow][5]):0;
  
  var netCashRow=findRow(rows,"Net Cash Proceeds");
  var netCash=netCashRow>=0?parseNum(rows[netCashRow][5]||rows[netCashRow][4]):0;
  
  var cpfOARow=findRow(rows,"Total Available OA");
  var cpfOA=cpfOARow>=0?parseNum(rows[cpfOARow][8]||rows[cpfOARow][7]):0;
  
  var totalFundsRow=findRow(rows,"Total Cash + CPF Available");
  var totalFunds=totalFundsRow>=0?parseNum(rows[totalFundsRow][8]||rows[totalFundsRow][7]):0;
  
  // Loan
  var maxLoanRow=findRow(rows,"Max Loan quantum");
  var maxLoan=maxLoanRow>=0?parseNum(rows[maxLoanRow][7]||rows[maxLoanRow][6]):0;
  
  var maxTenureRow=findRow(rows,"Max Loan tenure");
  var maxTenure=maxTenureRow>=0?parseNum(rows[maxTenureRow][3]):0;
  
  var stressRow=findRow(rows,"Stress Test Interest");
  var stressRate=stressRow>=0?rows[stressRow][4]||rows[stressRow][3]||"4%":"4%";
  
  // Agent details
  var prepRow=findRow(rows,"Prepared by");
  var agentName=prepRow>=0?rows[prepRow][4]||rows[prepRow][3]||"":"";
  var mobileRow=findRow(rows,"Mobile Number");
  var mobile=mobileRow>=0?rows[mobileRow][4]||rows[mobileRow][3]||"":"";
  var resRow=findRow(rows,"RES Number");
  var resNum=resRow>=0?rows[resRow][4]||rows[resRow][3]||"":"";
  var dateRow=findRow(rows,"Date Prepared");
  if(dateRow<0)dateRow=findRow(rows,"Date");
  var datePrepared=dateRow>=0?rows[dateRow][4]||rows[dateRow][3]||"":"";
  
  return{clientName:clientName,b1Name:b1Name,b2Name:b2Name,b1Age:b1Age,b2Age:b2Age,b1Emp:b1Emp,b2Emp:b2Emp,b1Inc:b1Inc,b2Inc:b2Inc,propType:propType,sellingPrice:sellingPrice,outstandingLoan:outstandingLoan,cpfRefund:cpfRefund,agentPct:agentPct,agentFee:agentFee,netCash:netCash,cpfOA:cpfOA,totalFunds:totalFunds,maxLoan:maxLoan,maxTenure:maxTenure,stressRate:stressRate,agentName:agentName,mobile:mobile,resNum:resNum,datePrepared:datePrepared};
}

function parseScenario(rows){
  var purchaseRow=findRow(rows,"Purchase price");
  var price=0;
  if(purchaseRow>=0){
    // Combined column is usually the last populated one
    for(var c=rows[purchaseRow].length-1;c>=0;c--){
      var v=parseNum(rows[purchaseRow][c]);
      if(v>10000){price=v;break}
    }
  }
  
  var loanRow=findRow(rows,"Loan To Value");
  var ltvPct="75%";var loanAmt=0;
  if(loanRow>=0){
    for(var c2=rows[loanRow].length-1;c2>=0;c2--){
      if(rows[loanRow][c2]&&rows[loanRow][c2].indexOf("%")>=0){ltvPct=rows[loanRow][c2];break}
    }
    for(var c3=rows[loanRow].length-1;c3>=0;c3--){
      var v2=parseNum(rows[loanRow][c3]);
      if(v2>10000){loanAmt=v2;break}
    }
  }
  
  var instRow=findRow(rows,"Monthly Instalment");
  if(instRow<0)instRow=findRow(rows,"Loan Monthly Instalment");
  var instalment=0;
  if(instRow>=0){
    for(var c4=rows[instRow].length-1;c4>=0;c4--){
      var v3=parseNum(rows[instRow][c4]);
      if(v3>100){instalment=v3;break}
    }
  }
  
  var intRow=findRow(rows,"Assume Interest");
  if(intRow<0)intRow=findRow(rows,"Interest Rate");
  var intRate="1.5%";
  if(intRow>=0){
    for(var c5=rows[intRow].length-1;c5>=0;c5--){
      if(rows[intRow][c5]&&(rows[intRow][c5].indexOf("%")>=0||parseFloat(rows[intRow][c5])>0)){intRate=rows[intRow][c5];break}
    }
  }
  
  var tenRow=findRow(rows,"Loan Tenure");
  var tenure=22;
  if(tenRow>=0){
    for(var c6=rows[tenRow].length-1;c6>=0;c6--){
      var v4=parseNum(rows[tenRow][c6]);
      if(v4>=5&&v4<=35){tenure=v4;break}
    }
  }
  
  // BSD - look for "Stamp Duty" row
  var bsdRow=findRow(rows,"Stamp Duty");
  if(bsdRow<0)bsdRow=findRow(rows,"Less Stamp Duty");
  var bsd=0;
  if(bsdRow>=0){
    for(var c7=rows[bsdRow].length-1;c7>=0;c7--){
      var v5=parseNum(rows[bsdRow][c7]);
      if(v5>1000){bsd=v5;break}
    }
  }
  
  // CPF contribution
  var cpfContribRow=findRow(rows,"CPF OA Distribut");
  var cpfContrib=0;
  if(cpfContribRow>=0){
    for(var c8=rows[cpfContribRow].length-1;c8>=0;c8--){
      var v6=parseNum(rows[cpfContribRow][c8]);
      if(v6>0){cpfContrib=v6;break}
    }
  }
  
  // Cash repayment
  var cashRepRow=findRow(rows,"Cash Repayment");
  var cashRepay=0;
  if(cashRepRow>=0){
    for(var c9=rows[cashRepRow].length-1;c9>=0;c9--){
      var v7=parseNum(rows[cashRepRow][c9]);
      if(v7>0){cashRepay=v7;break}
    }
  }
  if(!cashRepay&&instalment&&cpfContrib)cashRepay=instalment-cpfContrib;
  
  // Pledging
  var pledgeRow=findRow(rows,"Pledging of funds");
  var pledging=0;
  if(pledgeRow>=0){
    for(var c10=rows[pledgeRow].length-1;c10>=0;c10--){
      var v8=parseNum(rows[pledgeRow][c10]);
      if(v8>0){pledging=v8;break}
    }
  }
  
  var unpledgeRow=findRow(rows,"Unpledge");
  var unpledge=0;
  if(unpledgeRow>=0){
    for(var c11=rows[unpledgeRow].length-1;c11>=0;c11--){
      var v9=parseNum(rows[unpledgeRow][c11]);
      if(v9>0){unpledge=v9;break}
    }
  }
  
  // Remaining balances
  var cpfBalRow=findRow(rows,"CPF Balance");
  var cpfBal=0;
  if(cpfBalRow>=0){
    for(var c12=rows[cpfBalRow].length-1;c12>=0;c12--){
      var v10=parseNum(rows[cpfBalRow][c12]);
      if(v10>0){cpfBal=v10;break}
    }
  }
  
  var cashBalRow=findRow(rows,"Cash Balance");
  var cashBal=0;
  if(cashBalRow>=0){
    // Get the last (combined) value
    for(var c13=rows[cashBalRow].length-1;c13>=0;c13--){
      var v11=parseNum(rows[cashBalRow][c13]);
      if(Math.abs(v11)>0){cashBal=v11;break}
    }
  }
  
  var totalRemRow=findRow(rows,"Total");
  var totalRemaining=0;
  // Find the "Total" row that's near the reserves section
  for(var r2=0;r2<rows.length;r2++){
    if(rows[r2]){
      for(var c14=0;c14<rows[r2].length;c14++){
        if(rows[r2][c14]==="Total"&&r2>cashBalRow){
          for(var c15=rows[r2].length-1;c15>=0;c15--){
            var v12=parseNum(rows[r2][c15]);
            if(Math.abs(v12)>1000){totalRemaining=v12;break}
          }
          if(totalRemaining)break;
        }
      }
    }
    if(totalRemaining)break;
  }
  
  var monthsRow=findRow(rows,"Number of Months");
  var reserveMonths=0;
  if(monthsRow>=0){
    for(var c16=rows[monthsRow].length-1;c16>=0;c16--){
      var v13=parseNum(rows[monthsRow][c16]);
      if(Math.abs(v13)>0){reserveMonths=v13;break}
    }
  }
  
  var yearsRow=findRow(rows,"Number of Years");
  var reserveYears=0;
  if(yearsRow>=0){
    for(var c17=rows[yearsRow].length-1;c17>=0;c17--){
      var v14=parseNum(rows[yearsRow][c17]);
      if(Math.abs(v14)>0){reserveYears=v14;break}
    }
  }
  
  return{price:price,ltvPct:ltvPct,loanAmt:loanAmt,instalment:instalment,intRate:intRate,tenure:tenure,bsd:bsd,cpfContrib:cpfContrib,cashRepay:cashRepay,pledging:pledging,unpledge:unpledge,cpfBal:cpfBal,cashBal:cashBal,totalRemaining:totalRemaining,reserveMonths:reserveMonths,reserveYears:reserveYears};
}

function ReportView(props){
  var p=props.profile;var s=props.scenario;var scenarioLabel=props.scenarioLabel||"Private Property";
  if(!p||!s)return null;
  return(
    <div style={{background:"#e8eaf0",padding:"30px 20px",display:"flex",justifyContent:"center"}}>
      <div style={{background:C.white,width:"100%",maxWidth:794,boxShadow:"0 4px 40px rgba(0,0,0,0.15)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:C.navy,padding:"28px 40px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#fff",letterSpacing:1}}>AVENUE 88</div><div style={{fontSize:11,color:"rgba(255,255,255,0.6)",letterSpacing:2,textTransform:"uppercase",marginTop:2}}>Property Advisory</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:13,color:"rgba(255,255,255,0.5)",letterSpacing:2,textTransform:"uppercase"}}>Financial Summary</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#fff",marginTop:2}}>{p.clientName}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:4}}>Prepared: {p.datePrepared||"April 2026"}</div></div>
        </div>
        <div style={{height:3,background:"linear-gradient(90deg,"+C.accent+" 0%,#e8c96d 50%,"+C.accent+" 100%)"}}/>
        
        <div style={{padding:"32px 40px 28px"}}>
          {/* Current Property */}
          <div style={{marginBottom:26}}>
            <div style={{background:C.navy,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>Your Current Property</div>
            <div style={{background:C.lightBox,border:"1px solid "+C.border,borderLeft:"4px solid "+C.navy,borderRadius:4,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.navy,fontWeight:700}}>{p.propType||"Property"}</div><div style={{fontSize:12.5,color:C.textMuted,marginTop:3}}>Outstanding Loan: {fmt$(p.outstandingLoan)}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.textMuted}}>Estimated Valuation</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.navy,fontWeight:700,marginTop:2}}>{fmt$(p.sellingPrice)}</div></div>
            </div>
          </div>
          
          {/* Two Column: Proceeds + Buying Power */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            {/* Sale Proceeds */}
            <div style={{marginBottom:26}}>
              <div style={{background:C.navy,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>Sale Proceeds</div>
              {[{l:"Selling Price",v:fmt$(p.sellingPrice)},{l:"Less Outstanding Loan",v:fmt$(-p.outstandingLoan),neg:true},{l:"Less CPF Refund (incl. interest)",v:fmt$(-p.cpfRefund),neg:true},{l:"Less Agent Fees ("+p.agentPct+" + GST)",v:fmt$(-p.agentFee),neg:true}].map(function(r,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid "+C.border,fontSize:12.5}}><span style={{color:C.textMuted}}>{r.l}</span><span style={{fontWeight:500,color:r.neg?"#C53030":C.text}}>{r.v}</span></div>})}
              <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderTop:"1px solid "+C.border,marginTop:2,fontSize:12.5}}><span style={{color:C.text,fontWeight:600}}>Net Cash Proceeds</span><span style={{color:C.navy,fontWeight:700}}>{fmt$(p.netCash)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",fontSize:12.5}}><span style={{color:C.textMuted}}>CPF OA Available (after refund)</span><span style={{fontWeight:500}}>{fmt$(p.cpfOA)}</span></div>
              <div style={{background:C.navy,borderRadius:4,padding:"14px 18px",marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:11,color:"rgba(255,255,255,0.65)",letterSpacing:1,textTransform:"uppercase"}}>Total Funds Available</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>Cash + CPF Combined</div></div><div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:C.accent,fontWeight:700}}>{fmt$(p.totalFunds)}</div></div>
            </div>
            
            {/* Buying Power */}
            <div style={{marginBottom:26}}>
              <div style={{background:C.greyTile,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>Your Buying Power</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{background:C.lightBox,border:"1px solid "+C.border,borderRadius:4,padding:"12px 16px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.textMuted}}>Max Bank Loan (TDSR)</div><div style={{fontSize:18,fontWeight:700,color:C.navy,marginTop:4}}>{fmt$(p.maxLoan)}</div><div style={{fontSize:10.5,color:C.textMuted,marginTop:2}}>Stress test @ {p.stressRate} | {p.maxTenure}yr</div></div>
                <div style={{background:C.lightBox,border:"1px solid "+C.border,borderRadius:4,padding:"12px 16px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.textMuted}}>Max LTV</div><div style={{fontSize:18,fontWeight:700,color:C.navy,marginTop:4}}>75%</div><div style={{fontSize:10.5,color:C.textMuted,marginTop:2}}>{scenarioLabel}</div></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
                <div style={{background:"#F0F4FA",border:"1px solid #D0DEF0",borderRadius:4,padding:"10px 14px"}}><strong style={{fontSize:12}}>{p.b1Name}</strong><span style={{fontSize:11,color:C.textMuted}}> · Age {p.b1Age} · {p.b1Emp}</span><br/><span style={{fontSize:11,color:C.textMuted}}>Income: {fmt$(p.b1Inc)}/mth</span></div>
                {p.b2Name&&<div style={{background:"#F0F4FA",border:"1px solid #D0DEF0",borderRadius:4,padding:"10px 14px"}}><strong style={{fontSize:12}}>{p.b2Name}</strong><span style={{fontSize:11,color:C.textMuted}}> · Age {p.b2Age} · {p.b2Emp}</span><br/><span style={{fontSize:11,color:C.textMuted}}>Income: {fmt$(p.b2Inc)}/mth</span></div>}
              </div>
            </div>
          </div>
          
          {/* Scenario */}
          <div>
            <div style={{background:C.greyTile,color:"white",padding:"9px 16px",fontSize:11,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",borderRadius:3,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,background:C.accent,borderRadius:"50%"}}/>Scenario — If You Buy a {fmt$(s.price)} {scenarioLabel}</div>
            <div style={{background:C.lightBox,border:"1px solid "+C.border,borderRadius:4,padding:18}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {[{l:"Purchase Price",v:fmt$(s.price)},{l:"Bank Loan ("+s.ltvPct+" LTV)",v:fmt$(s.loanAmt)},{l:"Buyer Stamp Duty (BSD)",v:fmt$(s.bsd),neg:true},{l:"Monthly Instalment @ "+s.intRate,v:fmt$(s.instalment)+" / mth"},{l:"Less CPF OA Contribution",v:"— "+fmt$(s.cpfContrib)+" / mth",green:true},{l:"Net Cash Instalment / mth",v:fmt$(s.cashRepay)+" / mth",highlight:true}].map(function(item,i){return <div key={i} style={{background:item.highlight?"#EBF0F9":"white",border:"1px solid "+(item.highlight?"#B8CAE8":"#D0DEF0"),borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:item.highlight?C.navy:C.textMuted}}>{item.l}</div><div style={{fontSize:14,fontWeight:700,color:item.neg?"#C53030":item.green?"#276749":item.highlight?C.navy:C.text,marginTop:4}}>{item.v}</div></div>})}
              </div>
              
              {s.pledging>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
                <div style={{background:"#FFF3E0",border:"1.5px solid #F6A623",borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"#B45309"}}>⚠ Pledging of Funds Required (48 mths)</div><div style={{fontSize:18,fontWeight:700,color:"#B45309",marginTop:4}}>{fmt$(s.pledging)}</div></div>
                <div style={{background:"#F0FBF4",border:"1.5px solid #68D391",borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"#276749"}}>Show / Unpledge Funds</div><div style={{fontSize:18,fontWeight:700,color:"#276749",marginTop:4}}>{fmt$(s.unpledge)}</div></div>
              </div>}
              
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginTop:10}}>
                <div style={{background:"white",border:"1px solid #D0DEF0",borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:C.textMuted}}>CPF Balance After</div><div style={{fontSize:14,fontWeight:700,color:C.navy,marginTop:4}}>{fmt$(s.cpfBal)}</div></div>
                <div style={{background:"white",border:"1px solid #D0DEF0",borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:C.textMuted}}>Cash Balance After</div><div style={{fontSize:14,fontWeight:700,color:s.cashBal<0?"#C53030":C.navy,marginTop:4}}>{fmt$(s.cashBal)}</div></div>
                <div style={{background:C.navy,borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"rgba(255,255,255,0.6)"}}>Total Remaining ✓</div><div style={{fontSize:15,fontWeight:700,color:"#6EE7A0",marginTop:4}}>{fmt$(s.totalRemaining)}</div></div>
                <div style={{background:C.navy,borderRadius:4,padding:"10px 12px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"rgba(255,255,255,0.6)"}}>Reserves</div><div style={{fontSize:15,fontWeight:700,color:"#6EE7A0",marginTop:4}}>{Math.round(s.reserveMonths)} mths</div><div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:1}}>≈ {s.reserveYears.toFixed(1)} years</div></div>
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

  var tabMap={private:"2A. Buy Private",hdb:"2B. HDB",ec:"2C. Buy EC"};
  var labelMap={private:"Private Property",hdb:"HDB",ec:"Executive Condominium"};

  var fetchData=useCallback(function(){
    var sheetId=extractSheetId(sheetUrl);
    if(!sheetId){setError("Invalid Google Sheet URL. Please paste the full URL from your browser.");return}
    setLoading(true);setError("");setProfile(null);setScenarioData(null);
    
    var profileTab=encodeURIComponent("1. Profile Affordability");
    var scenarioTab=encodeURIComponent(tabMap[scenario]);
    var baseUrl="https://docs.google.com/spreadsheets/d/"+sheetId+"/gviz/tq?tqx=out:csv&sheet=";
    
    Promise.all([
      fetch(baseUrl+profileTab).then(function(r){if(!r.ok)throw new Error("Cannot access sheet. Make sure it's shared as 'Anyone with the link can view'.");return r.text()}),
      fetch(baseUrl+scenarioTab).then(function(r){if(!r.ok)throw new Error("Cannot find tab '"+tabMap[scenario]+"'. Check your sheet has this tab.");return r.text()})
    ]).then(function(results){
      var profileRows=csvToRows(results[0]);
      var scenarioRows=csvToRows(results[1]);
      var p=parseProfile(profileRows);
      var s=parseScenario(scenarioRows);
      setProfile(p);setScenarioData(s);
      setLoading(false);
    }).catch(function(err){
      setError(err.message||"Failed to fetch data. Check the URL and sharing settings.");
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

      {/* Nav */}
      <div className="no-print" style={{background:C.white,padding:"0 20px",position:"sticky",top:0,zIndex:100,borderBottom:"1px solid "+C.grey200}}><div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:56}}><a href="/" style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,textDecoration:"none"}}>Avenue 88</a><div style={{display:"flex",gap:4}}><a href="/" className="nav-link">Home</a><a href="/timeline" className="nav-link">Timeline</a><a href="/valuation" className="nav-link">Valuation</a><a href="/upgrader" className="nav-link">Upgrader</a><a href="/summary" className="nav-link nav-active">Summary</a></div></div></div>

      {/* Header */}
      <div className="no-print" style={{background:"linear-gradient(135deg,"+C.navy+","+C.navyLight+")",padding:"48px 20px 40px"}}><div style={{maxWidth:720,margin:"0 auto"}}><span style={{color:"rgba(255,255,255,0.8)",fontSize:12,fontWeight:600,letterSpacing:2,textTransform:"uppercase"}}>Avenue 88 · Tool</span><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,5vw,42px)",color:"#fff",lineHeight:1.2,marginTop:8,fontWeight:700}}>Financial Summary Generator</h1><p style={{color:"rgba(255,255,255,0.85)",fontSize:16,marginTop:12}}>Generate a professional client summary from your Google Sheet calculator.</p></div></div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"36px 20px"}}>
        {/* Input Form */}
        <div className="no-print" style={{background:"#fff",borderRadius:16,border:"1px solid "+C.grey200,padding:28,boxShadow:"0 2px 12px rgba(0,0,0,0.03)",marginBottom:32}}>
          <h3 style={{fontSize:18,fontWeight:700,marginBottom:6}}>📊 Generate Client Summary</h3>
          <p style={{fontSize:13,color:C.grey500,marginBottom:20}}>Paste your Google Sheet URL and select the scenario to display.</p>
          <div style={{display:"grid",gap:16}}>
            <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Google Sheet URL *</label><input className="fi" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl} onChange={function(e){setSheetUrl(e.target.value)}}/><div style={{fontSize:11,color:C.grey500,marginTop:4}}>Sheet must be shared as "Anyone with the link can view"</div></div>
            <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Scenario *</label><select className="fi" value={scenario} onChange={function(e){setScenario(e.target.value)}}><option value="private">Buy Private Property</option><option value="hdb">Buy HDB</option><option value="ec">Buy Executive Condominium</option></select></div>
            <button onClick={fetchData} disabled={!sheetUrl||loading} style={{width:"100%",padding:16,background:(!sheetUrl||loading)?"#D1D5DB":C.navy,color:"#fff",border:"none",borderRadius:10,fontSize:16,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:(!sheetUrl||loading)?"not-allowed":"pointer",transition:"background .2s"}}>{loading?<><span className="spinner"/>Loading data...</>:"Generate Summary →"}</button>
          </div>
        </div>

        {error&&<div style={{padding:"16px 20px",background:"#FEF2F2",borderRadius:10,border:"1px solid #FECACA",marginBottom:24}}><p style={{fontSize:14,color:"#DC2626"}}>{error}</p></div>}
      </div>

      {/* Report */}
      {profile&&scenarioData&&<div>
        <div className="no-print" style={{maxWidth:720,margin:"0 auto",padding:"0 20px 16px",display:"flex",gap:12}}>
          <button onClick={function(){window.print()}} style={{padding:"10px 20px",background:C.navy,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>🖨 Print / Save PDF</button>
        </div>
        <ReportView profile={profile} scenario={scenarioData} scenarioLabel={labelMap[scenario]}/>
      </div>}

      {/* Footer */}
      <div className="no-print" style={{background:"#F3F4F6",padding:"28px 20px",textAlign:"center",marginTop:36,borderTop:"1px solid "+C.grey200}}><div style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,marginBottom:6}}>Avenue 88</div><div style={{color:C.grey500,fontSize:12}}>Huttons / Navis · © 2026 Avenue 88</div></div>
    </div>
  );
}
