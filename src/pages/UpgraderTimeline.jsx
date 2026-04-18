import { useState, useMemo } from "react";
import { sendToSheet } from "../sheets";

const C={blue:"#2B88D8",blueHover:"#2477C0",blueDark:"#1E6AB5",blueLight:"#E8F2FC",bluePale:"#F0F7FF",white:"#FFFFFF",bg:"#F7F8FA",grey50:"#F9FAFB",grey100:"#F3F4F6",grey200:"#E5E7EB",grey300:"#D1D5DB",grey500:"#6B7280",grey600:"#4B5563",grey900:"#111827",orange:"#E67E22",orangeDark:"#C66A15",orangeLight:"#FFF5EB",orangeBorder:"#F5D5A8",red:"#DC2626",redLight:"#FEF2F2",green:"#16A34A",greenLight:"#F0FDF4"};

function addD(d,n){var r=new Date(d);r.setDate(r.getDate()+n);return r}
function addWD(d,n){var r=new Date(d);var a=0;while(a<n){r.setDate(r.getDate()+1);if(r.getDay()!==0&&r.getDay()!==6)a++}return r}
function nextWD(d){var r=new Date(d);r.setDate(r.getDate()+1);while(r.getDay()===0||r.getDay()===6)r.setDate(r.getDate()+1);return r}
function addW(d,w){return addD(d,w*7)}
function pad(n){return n<10?"0"+n:n}
function fmt(d){var days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return days[d.getDay()]+", "+pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear()}
function fmtS(d){return pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear()}
function daysBetween(a,b){return Math.round((b-a)/(1000*60*60*24))}

function FishboneTimeline(props){
  var milestones=props.milestones,searchScope=props.searchScope;
  if(!milestones||!milestones.length)return null;
  return(
    <div style={{position:"relative"}}>
      <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:2,background:C.grey200,transform:"translateX(-50%)",zIndex:0}}/>
      {milestones.map(function(m,i){
        var isHdb=m.track==="hdb";
        var color=isHdb?C.blue:C.orange;
        var bgColor=isHdb?C.blueLight:C.orangeLight;
        var darkColor=isHdb?C.blueDark:C.orangeDark;
        return(
          <div key={i} className="fishbone-row" style={{position:"relative",display:"grid",gridTemplateColumns:"1fr 40px 1fr",gap:0,alignItems:"center",marginBottom:12,zIndex:1}}>
            <div className="col-left" style={{textAlign:"right",paddingRight:12}}>
              {isHdb&&(<div style={{display:"inline-block",background:bgColor,border:"1.5px solid "+color+"33",borderRadius:10,padding:"10px 14px",textAlign:"right",maxWidth:"100%"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end",marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:700,color:m.highlight?color:C.grey900}}>{m.label}</span>
                  <span style={{fontSize:14}}>{m.icon}</span>
                </div>
                <div style={{fontSize:12,fontWeight:700,color:darkColor}}>{fmtS(m.date)}</div>
                <div style={{fontSize:11,color:C.grey500,marginTop:3,lineHeight:1.4}}>{m.note}</div>
              </div>)}
            </div>
            <div style={{display:"flex",justifyContent:"center",alignItems:"center",position:"relative"}}>
              <div style={{width:14,height:14,borderRadius:"50%",background:"#fff",border:"2.5px solid "+color,zIndex:2}}/>
            </div>
            <div className="col-right" style={{textAlign:"left",paddingLeft:12}}>
              {!isHdb&&(<div style={{display:"inline-block",background:bgColor,border:"1.5px solid "+color+"33",borderRadius:10,padding:"10px 14px",textAlign:"left",maxWidth:"100%"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-start",marginBottom:3}}>
                  <span style={{fontSize:14}}>{m.icon}</span>
                  <span style={{fontSize:13,fontWeight:700,color:m.highlight?color:C.grey900}}>{m.label}</span>
                </div>
                <div style={{fontSize:12,fontWeight:700,color:darkColor}}>{fmtS(m.date)}</div>
                <div style={{fontSize:11,color:C.grey500,marginTop:3,lineHeight:1.4}}>{m.note}</div>
              </div>)}
              <div className="fishbone-hdb-mobile" style={{display:"none"}}>
                {isHdb&&(<div style={{background:bgColor,border:"1.5px solid "+color+"33",borderRadius:10,padding:"10px 14px",textAlign:"left"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <span style={{fontSize:14}}>{m.icon}</span>
                    <span style={{fontSize:13,fontWeight:700,color:m.highlight?color:C.grey900}}>{m.label}</span>
                    <span style={{fontSize:10,fontWeight:600,padding:"2px 6px",borderRadius:10,background:"#fff",color:darkColor}}>HDB</span>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:darkColor}}>{fmtS(m.date)}</div>
                  <div style={{fontSize:11,color:C.grey500,marginTop:3,lineHeight:1.4}}>{m.note}</div>
                </div>)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )
}

export default function UpgraderTimeline(){
  // Step 1: Purchase type
  var [purchaseType,setPurchaseType]=useState(""); // "private_resale" or "new_ec"
  // Step 2: Strategy
  var [mode,setMode]=useState(""); // sell_first, buy_first (private) or "ec_bridging", "ec_no_bridging"
  var [startDate,setStartDate]=useState("");
  var [safetyMode,setSafetyMode]=useState("after_hdb_exercise");
  // HDB inputs
  var [hdbSubmission,setHdbSubmission]=useState(30);
  var [extension,setExtension]=useState(3);
  // Private Resale inputs
  var [pvtExercisePeriod,setPvtExercisePeriod]=useState(14);
  var [pvtExercisePeriodBF,setPvtExercisePeriodBF]=useState(90);
  var [pvtCompletion,setPvtCompletion]=useState(10);
  // EC inputs
  var [ecTopDate,setEcTopDate]=useState("");
  var [ecBookingDate,setEcBookingDate]=useState("");
  // HDB-to-HDB inputs
  var [buyHdbOtpDate,setBuyHdbOtpDate]=useState("");
  var [buyHdbSubmission,setBuyHdbSubmission]=useState(30);
  // Tracking
  var [tracked,setTracked]=useState(false);

  // Reset when purchase type changes
  function selectPurchaseType(t){setPurchaseType(t);setMode("");setStartDate("");setEcTopDate("");setEcBookingDate("");setBuyHdbOtpDate("");setTracked(false)}

  var timeline=useMemo(function(){
    // === PRIVATE RESALE MODE ===
    if(purchaseType==="private_resale"&&mode&&startDate){
      var hdbOTP,hdbExercise,pvtOTP,pvtExercise,hdbAcceptance;
      if(mode==="sell_first"){
        hdbOTP=new Date(startDate+"T00:00:00");
        hdbExercise=addD(hdbOTP,21);
        var resaleAppTmp=addD(hdbExercise,hdbSubmission);
        hdbAcceptance=addWD(resaleAppTmp,28);
        if(safetyMode==="after_hdb_acceptance"){pvtOTP=addD(hdbAcceptance,1)}else{pvtOTP=addD(hdbExercise,1)}
        pvtExercise=addD(pvtOTP,pvtExercisePeriod);
      } else {
        pvtOTP=new Date(startDate+"T00:00:00");
        pvtExercise=addD(pvtOTP,pvtExercisePeriodBF);
        if(safetyMode==="after_hdb_acceptance"){
          hdbAcceptance=addD(pvtExercise,-1);
          hdbExercise=addD(hdbAcceptance,-40-hdbSubmission);
          hdbOTP=addD(hdbExercise,-21);
        } else {
          hdbExercise=addD(pvtExercise,-1);
          hdbOTP=addD(hdbExercise,-21);
        }
      }
      var intentToSell=addD(hdbOTP,-7);
      var requestForValue=nextWD(hdbOTP);
      var valuationResult=addWD(hdbOTP,5);
      var resaleApp=addD(hdbExercise,hdbSubmission);
      hdbAcceptance=addWD(resaleApp,28);
      var hdbEndorsement=addW(hdbAcceptance,3);
      var hdbApproval=addW(hdbEndorsement,2);
      var hdbCompletionDate=addW(hdbAcceptance,8);
      var extensionEnd=extension>0?addD(hdbCompletionDate,extension*30):hdbCompletionDate;
      var pvtCompletionDate=addW(pvtExercise,pvtCompletion);
      var bsdDue=addD(pvtExercise,14);
      var bridgingLoanDays=daysBetween(pvtCompletionDate,hdbCompletionDate);
      var cpfRefundDate=addWD(hdbCompletionDate,14);
      var absdSafe=hdbExercise<pvtExercise;
      var hdbApprovalBeforePvtCompletion=hdbApproval<=pvtCompletionDate;
      var renoWindowDays=daysBetween(pvtCompletionDate,extensionEnd);
      var gapExerciseDays=daysBetween(hdbExercise,pvtExercise);
      var totalDays=daysBetween(intentToSell,extensionEnd);

      var milestones=[];
      milestones.push({date:intentToSell,label:"Intent to Sell",note:"Register on HDB Portal",track:"hdb",icon:"📋"});
      milestones.push({date:hdbOTP,label:mode==="buy_first"?"HDB OTP Granted (Latest by) ⭐":"HDB OTP Granted",note:"HFE approved before OTP",track:"hdb",icon:"📝",highlight:mode==="buy_first"});
      milestones.push({date:requestForValue,label:"Request for Value",note:"Next working day after OTP",track:"hdb",icon:"📤"});
      milestones.push({date:valuationResult,label:"Valuation Result",note:"Within 5 working days",track:"hdb",icon:"🏠"});
      if(mode==="buy_first"){milestones.push({date:pvtOTP,label:"Private OTP Granted",note:"Option fee: 1–5% · Exercise: "+pvtExercisePeriodBF+" days",track:"pvt",icon:"🔑"})}
      milestones.push({date:hdbExercise,label:"HDB Exercise OTP ⭐",note:"Must be BEFORE Private Exercise",track:"hdb",icon:"✏️",highlight:true});
      if(mode==="sell_first"){milestones.push({date:pvtOTP,label:"Private OTP Granted",note:"Option fee: 1% · Exercise: "+pvtExercisePeriod+" days",track:"pvt",icon:"🔑"})}
      milestones.push({date:pvtExercise,label:"Private Exercise OTP ⭐",note:"Must be AFTER HDB Exercise · Pay 5% less option fee",track:"pvt",icon:"✏️",highlight:true});
      milestones.push({date:resaleApp,label:"HDB Resale Application",note:hdbSubmission+"-day period",track:"hdb",icon:"📄"});
      milestones.push({date:bsdDue,label:"BSD Payable",note:"3–6% · Within 14 days of S&P",track:"pvt",icon:"💵"});
      milestones.push({date:hdbAcceptance,label:"HDB Acceptance",note:"Within 28 working days",track:"hdb",icon:"✅"});
      milestones.push({date:hdbEndorsement,label:"HDB Endorsement",note:"~3 weeks after acceptance",track:"hdb",icon:"✍️"});
      milestones.push({date:hdbApproval,label:"HDB Approval",note:"Bridging loan can disburse after this",track:"hdb",icon:"🏛️"});
      milestones.push({date:pvtCompletionDate,label:"Private Completion ⭐",note:"Get keys · Start renovation",track:"pvt",icon:"🔑",highlight:true});
      milestones.push({date:hdbCompletionDate,label:"HDB Completion",note:extension>0?"Extension of Stay begins":"Keys handover",track:"hdb",icon:"🏢"});
      if(extension>0){milestones.push({date:extensionEnd,label:"Extension Ends ("+extension+"m)",note:"Move out of HDB",track:"hdb",icon:"🏡"})}
      milestones.sort(function(a,b){return a.date-b.date});

      return{type:"private_resale",milestones:milestones,mode:mode,absdSafe:absdSafe,hdbApprovalBeforePvtCompletion:hdbApprovalBeforePvtCompletion,renoWindowDays:renoWindowDays,gapExerciseDays:gapExerciseDays,totalDays:totalDays,hdbExercise:hdbExercise,pvtExercise:pvtExercise,hdbApproval:hdbApproval,pvtCompletionDate:pvtCompletionDate,extensionEnd:extensionEnd,extensionMonths:extension,pvtCompletionS:pvtCompletionDate,hdbCompletionS:hdbCompletionDate,bridgingLoanDays:bridgingLoanDays,cpfRefundDate:cpfRefundDate,cpfRefundDays:daysBetween(pvtCompletionDate,cpfRefundDate)};
    }

    // === NEW EC MODE ===
    if(purchaseType==="new_ec"&&mode&&ecTopDate){
      var ecTOP=new Date(ecTopDate+"T00:00:00");
      var sixMonthDeadline=addD(ecTOP,180);
      var ecBooking=ecBookingDate?new Date(ecBookingDate+"T00:00:00"):null;
      var ecExercise=ecBooking?addD(ecBooking,21):null;
      var ecBSD=ecExercise?addD(ecExercise,14):null;
      var ec2ndPayment=ecBooking?addD(ecBooking,56):null; // 8 weeks

      // Calculate HDB timeline working backwards from deadline
      var latestHdbCompletion,hdbApprovalDeadline;
      if(mode==="ec_bridging"){
        // HDB Approval must be before EC TOP
        hdbApprovalDeadline=addD(ecTOP,-14); // 14 day buffer
      }
      // Hard deadline: HDB must complete before TOP + 6 months
      latestHdbCompletion=sixMonthDeadline;

      // Work backwards from the binding constraint
      var targetDate=mode==="ec_bridging"?hdbApprovalDeadline:latestHdbCompletion;

      // For bridging: approval must be by targetDate
      // approval = endorsement + 2w, endorsement = acceptance + 3w, acceptance = resaleApp + 28wd
      // completion = acceptance + 8w
      // So: acceptance = targetDate - 5w (for endorsement+approval) if bridging
      //     acceptance = targetDate - 8w if no bridging (completion = acceptance + 8w)

      var latestHdbAcceptance,latestResaleApp,latestHdbExercise,latestHdbOTP,latestIntentToSell;
      if(mode==="ec_bridging"){
        // HDB Approval = Acceptance + 3w + 2w = Acceptance + 5w
        latestHdbAcceptance=addD(targetDate,-35); // 5 weeks before approval deadline
      } else {
        // HDB Completion = Acceptance + 8w
        latestHdbAcceptance=addD(targetDate,-56); // 8 weeks before completion deadline
      }
      // Acceptance = ResaleApp + ~40 calendar days (28 working days)
      latestResaleApp=addD(latestHdbAcceptance,-40);
      latestHdbExercise=addD(latestResaleApp,-hdbSubmission);
      latestHdbOTP=addD(latestHdbExercise,-21);
      latestIntentToSell=addD(latestHdbOTP,-7);

      // Always use auto-calculated latest date
      var hdbOTP2=latestHdbOTP;
      var hdbExercise2=addD(hdbOTP2,21);
      var intentToSell2=addD(hdbOTP2,-7);
      var requestForValue2=nextWD(hdbOTP2);
      var valuationResult2=addWD(hdbOTP2,5);
      var resaleApp2=addD(hdbExercise2,hdbSubmission);
      var hdbAcceptance2=addWD(resaleApp2,28);
      var hdbEndorsement2=addW(hdbAcceptance2,3);
      var hdbApproval2=addW(hdbEndorsement2,2);
      var hdbCompletionDate2=addW(hdbAcceptance2,8);
      var extensionEnd2=extension>0?addD(hdbCompletionDate2,extension*30):hdbCompletionDate2;
      var cpfRefundDate2=addWD(hdbCompletionDate2,14);
      var bridgingLoanDays2=daysBetween(ecTOP,hdbCompletionDate2);
      var renoWindowDays2=daysBetween(ecTOP,extensionEnd2);
      var totalDays2=daysBetween(intentToSell2,extensionEnd2);

      // Checks
      var hdbApprovalOK=hdbApproval2<=ecTOP;
      var hdbCompletionBeforeDeadline=hdbCompletionDate2<=sixMonthDeadline;
      var daysToDeadline=daysBetween(hdbCompletionDate2,sixMonthDeadline);

      // Build milestones
      var ms=[];
      // EC milestones
      if(ecBooking){
        ms.push({date:ecBooking,label:"EC Booking",note:"Pay 5% booking fee · Cash/CPF on hand",track:"pvt",icon:"🏠"});
        ms.push({date:ecExercise,label:"EC Exercise OTP",note:"Sign S&P within 21 days",track:"pvt",icon:"✏️"});
        ms.push({date:ecBSD,label:"EC BSD Payable",note:"3–6% · No ABSD (indemnity signed)",track:"pvt",icon:"💵"});
        ms.push({date:ec2ndPayment,label:"EC 2nd Payment (15%)",note:"8 weeks after booking · Total 20% · Must have cash/CPF",track:"pvt",icon:"💰",highlight:true});
      }
      ms.push({date:ecTOP,label:"EC TOP ⭐",note:"Get keys · Mortgage starts · Start renovation",track:"pvt",icon:"🔑",highlight:true});
      if(mode==="ec_no_bridging"){ms.push({date:sixMonthDeadline,label:"6-Month Deadline ⭐",note:"Must sell HDB by this date",track:"pvt",icon:"⚠️",highlight:true})}

      // HDB milestones
      ms.push({date:intentToSell2,label:"Intent to Sell",note:"Register on HDB Portal",track:"hdb",icon:"📋"});
      ms.push({date:hdbOTP2,label:"HDB OTP Granted (Latest by) ⭐",note:"Auto-calculated · Latest date to start selling",track:"hdb",icon:"📝",highlight:true});
      ms.push({date:requestForValue2,label:"Request for Value",note:"Next working day after OTP",track:"hdb",icon:"📤"});
      ms.push({date:valuationResult2,label:"Valuation Result",note:"Within 5 working days",track:"hdb",icon:"🏠"});
      ms.push({date:hdbExercise2,label:"HDB Exercise OTP",note:"Buyer pays up to $4,000",track:"hdb",icon:"✏️"});
      ms.push({date:resaleApp2,label:"HDB Resale Application",note:hdbSubmission+"-day period",track:"hdb",icon:"📄"});
      ms.push({date:hdbAcceptance2,label:"HDB Acceptance",note:"Within 28 working days",track:"hdb",icon:"✅"});
      ms.push({date:hdbEndorsement2,label:"HDB Endorsement",note:"~3 weeks after acceptance",track:"hdb",icon:"✍️"});
      ms.push({date:hdbApproval2,label:"HDB Approval",note:mode==="ec_bridging"?"Must be before EC TOP for bridging loan":"~2 weeks after endorsement",track:"hdb",icon:"🏛️",highlight:mode==="ec_bridging"});
      ms.push({date:hdbCompletionDate2,label:"HDB Completion",note:extension>0?"Extension of Stay begins":"Keys handover · Sale proceeds released",track:"hdb",icon:"🏢"});
      if(extension>0){ms.push({date:extensionEnd2,label:"Extension Ends ("+extension+"m)",note:"Move out of HDB · Move into EC",track:"hdb",icon:"🏡"})}

      ms.sort(function(a,b){return a.date-b.date});

      return{type:"new_ec",milestones:ms,mode:mode,hdbApprovalOK:hdbApprovalOK,hdbCompletionBeforeDeadline:hdbCompletionBeforeDeadline,daysToDeadline:daysToDeadline,renoWindowDays:renoWindowDays2,totalDays:totalDays2,hdbApproval:hdbApproval2,hdbCompletionS:hdbCompletionDate2,ecTOP:ecTOP,sixMonthDeadline:sixMonthDeadline,extensionEnd:extensionEnd2,extensionMonths:extension,bridgingLoanDays:bridgingLoanDays2>0?bridgingLoanDays2:0,cpfRefundDate:cpfRefundDate2,cpfRefundDays:daysBetween(ecTOP,cpfRefundDate2),latestHdbOTP:latestHdbOTP,latestIntentToSell:latestIntentToSell};
    }

    // === HDB TO HDB MODE ===
    if(purchaseType==="resale_hdb"&&mode){
      // Helper to build one HDB track
      function buildHdbTrack(otpDate,subPeriod){
        var otp=new Date(otpDate+"T00:00:00");
        var its=addD(otp,-7);var rfv=nextWD(otp);var vr=addWD(otp,5);
        var ex=addD(otp,21);var ra=addD(ex,subPeriod);
        var acc=addWD(ra,28);var end2=addW(acc,3);var apr=addW(end2,2);var comp=addW(acc,8);
        return{its:its,otp:otp,rfv:rfv,vr:vr,ex:ex,ra:ra,acc:acc,end:end2,apr:apr,comp:comp}
      }

      var ms=[];
      if(mode==="hdb_contra"&&startDate&&buyHdbOtpDate){
        var sell=buildHdbTrack(startDate,hdbSubmission);
        var buy=buildHdbTrack(buyHdbOtpDate,buyHdbSubmission);
        // Contra: both applications within 7 days
        var laterExercise=sell.ex>buy.ex?sell.ex:buy.ex;
        var contraApp=addD(laterExercise,Math.min(hdbSubmission,buyHdbSubmission));
        // Both processed together — use the later application date
        var contraAcceptance=addWD(contraApp,28);
        var contraEndorse=addW(contraAcceptance,3);
        var contraApproval=addW(contraEndorse,2);
        var contraCompletion=addW(contraAcceptance,8);
        var extEnd=extension>0?addD(contraCompletion,extension*30):contraCompletion;
        var appGap=Math.abs(daysBetween(sell.ra,buy.ra));
        var renoW=daysBetween(contraCompletion,extEnd);

        ms.push({date:sell.its,label:"Intent to Sell",note:"Register on HDB Portal",track:"hdb",icon:"📋"});
        ms.push({date:sell.otp,label:"Sell HDB: OTP Granted",note:"Buyer pays up to $1,000",track:"hdb",icon:"📝"});
        ms.push({date:buy.otp,label:"Buy HDB: OTP Granted",note:"Pay option fee · HFE approved before OTP",track:"pvt",icon:"📝"});
        ms.push({date:sell.ex,label:"Sell HDB: Exercise OTP",note:"Buyer pays up to $4,000",track:"hdb",icon:"✏️"});
        ms.push({date:buy.ex,label:"Buy HDB: Exercise OTP",note:"Pay up to $4,000 · Both must use HDB loan",track:"pvt",icon:"✏️"});
        ms.push({date:contraApp,label:"Contra Resale Applications ⭐",note:"Both buy + sell submitted within 7 days · HDB loan for both",track:"hdb",icon:"📄",highlight:true});
        ms.push({date:contraAcceptance,label:"HDB Acceptance (Both)",note:"Within 28 working days · Processed concurrently",track:"hdb",icon:"✅"});
        ms.push({date:contraEndorse,label:"HDB Endorsement (Both)",note:"~3 weeks after acceptance",track:"hdb",icon:"✍️"});
        ms.push({date:contraApproval,label:"HDB Approval (Both)",note:"~2 weeks after endorsement",track:"hdb",icon:"🏛️"});
        ms.push({date:contraCompletion,label:"Completion (Same Day) ⭐",note:"Both transactions complete together · Keys exchange",track:"hdb",icon:"🔑",highlight:true});
        if(extension>0){ms.push({date:extEnd,label:"Extension Ends ("+extension+"m)",note:"Move out of old HDB · Extension only for selling flat",track:"hdb",icon:"🏡"})}

        ms.sort(function(a,b){return a.date-b.date});
        return{type:"resale_hdb",milestones:ms,mode:mode,totalDays:daysBetween(sell.its,extEnd),renoWindowDays:renoW,extensionEnd:extEnd,extensionMonths:extension,contraAppGap:appGap,contraCompletion:contraCompletion,hdbCompletionS:contraCompletion}
      }

      if(mode==="hdb_buy_first"&&buyHdbOtpDate){
        var buyT=buildHdbTrack(buyHdbOtpDate,buyHdbSubmission);
        // Sell HDB: auto-calculate — sell approval must be before buy completion for bridging loan
        // Work backwards: approval = completion - 3w, endorsement = approval - 2w... 
        // Actually: approval must be before buyT.comp
        var sellApprovalDeadline=addD(buyT.comp,-14);
        var sellAcceptanceTarget=addD(sellApprovalDeadline,-35);
        var sellResaleAppTarget=addD(sellAcceptanceTarget,-40);
        var sellExerciseTarget=addD(sellResaleAppTarget,-hdbSubmission);
        var sellOtpTarget=addD(sellExerciseTarget,-21);
        var sellOtp=startDate?new Date(startDate+"T00:00:00"):sellOtpTarget;
        var sellT=buildHdbTrack(startDate||sellOtpTarget.toISOString().split("T")[0],hdbSubmission);
        var extEnd2=extension>0?addD(sellT.comp,extension*30):sellT.comp;
        var bridgingDays=daysBetween(buyT.comp,sellT.comp);
        var cpfRef=addWD(sellT.comp,14);
        var sellApprovalOK=sellT.apr<=buyT.comp;
        var renoW2=daysBetween(buyT.comp,extEnd2);

        ms.push({date:buyT.otp,label:"Buy HDB: OTP Granted",note:"Pay option fee · HFE approved · Use bank loan (recommended)",track:"pvt",icon:"📝"});
        ms.push({date:buyT.rfv,label:"Buy: Request for Value",note:"Next working day",track:"pvt",icon:"📤"});
        ms.push({date:buyT.ex,label:"Buy HDB: Exercise OTP",note:"Pay up to $4,000",track:"pvt",icon:"✏️"});
        ms.push({date:buyT.ra,label:"Buy: Resale Application",note:buyHdbSubmission+"-day period · Longer is better (up to 80 days)",track:"pvt",icon:"📄"});
        ms.push({date:sellT.its,label:"Intent to Sell",note:startDate?"Your chosen date":"Latest recommended date",track:"hdb",icon:"📋"});
        ms.push({date:sellT.otp,label:"Sell HDB: OTP Granted ⭐",note:startDate?"Your chosen date":"Auto-calculated latest date",track:"hdb",icon:"📝",highlight:true});
        ms.push({date:sellT.ex,label:"Sell HDB: Exercise OTP",note:"Buyer pays up to $4,000",track:"hdb",icon:"✏️"});
        ms.push({date:sellT.ra,label:"Sell: Resale Application",note:hdbSubmission+"-day period",track:"hdb",icon:"📄"});
        ms.push({date:buyT.acc,label:"Buy: HDB Acceptance",note:"Within 28 working days",track:"pvt",icon:"✅"});
        ms.push({date:sellT.acc,label:"Sell: HDB Acceptance",note:"Within 28 working days",track:"hdb",icon:"✅"});
        ms.push({date:sellT.end,label:"Sell: Endorsement",note:"~3 weeks",track:"hdb",icon:"✍️"});
        ms.push({date:sellT.apr,label:"Sell: HDB Approval ⭐",note:"Must be before Buy completion for bridging loan",track:"hdb",icon:"🏛️",highlight:true});
        ms.push({date:buyT.comp,label:"Buy HDB: Completion ⭐",note:"Get keys to new HDB · Start renovation",track:"pvt",icon:"🔑",highlight:true});
        ms.push({date:sellT.comp,label:"Sell HDB: Completion",note:extension>0?"Extension begins":"Keys handover · Proceeds released",track:"hdb",icon:"🏢"});
        if(extension>0){ms.push({date:extEnd2,label:"Extension Ends ("+extension+"m)",note:"Move out of old HDB",track:"hdb",icon:"🏡"})}

        ms.sort(function(a,b){return a.date-b.date});
        return{type:"resale_hdb",milestones:ms,mode:mode,totalDays:daysBetween(buyT.otp,extEnd2),renoWindowDays:renoW2,extensionEnd:extEnd2,extensionMonths:extension,sellApprovalOK:sellApprovalOK,hdbCompletionS:sellT.comp,buyCompletionS:buyT.comp,bridgingLoanDays:bridgingDays>0?bridgingDays:0,cpfRefundDate:cpfRef,sellApproval:sellT.apr,latestSellOtp:sellOtpTarget,latestSellIts:addD(sellOtpTarget,-7)}
      }

      if(mode==="hdb_sell_first"&&startDate){
        var sellT2=buildHdbTrack(startDate,hdbSubmission);
        var extEnd3=extension>0?addD(sellT2.comp,extension*30):sellT2.comp;
        // Buy HDB: after sell completion or during extension
        var buyStart=buyHdbOtpDate?new Date(buyHdbOtpDate+"T00:00:00"):sellT2.comp;
        var buyT2=buildHdbTrack(buyHdbOtpDate||sellT2.comp.toISOString().split("T")[0],buyHdbSubmission);
        var renoW3=daysBetween(buyT2.comp,extEnd3);
        if(renoW3<0)renoW3=0;

        ms.push({date:sellT2.its,label:"Intent to Sell",note:"Register on HDB Portal",track:"hdb",icon:"📋"});
        ms.push({date:sellT2.otp,label:"Sell HDB: OTP Granted",note:"Buyer pays up to $1,000",track:"hdb",icon:"📝"});
        ms.push({date:sellT2.rfv,label:"Sell: Request for Value",note:"Next working day",track:"hdb",icon:"📤"});
        ms.push({date:sellT2.ex,label:"Sell HDB: Exercise OTP",note:"Buyer pays up to $4,000",track:"hdb",icon:"✏️"});
        ms.push({date:sellT2.ra,label:"Sell: Resale Application",note:hdbSubmission+"-day period",track:"hdb",icon:"📄"});
        ms.push({date:sellT2.acc,label:"Sell: HDB Acceptance",note:"Within 28 working days",track:"hdb",icon:"✅"});
        ms.push({date:sellT2.end,label:"Sell: Endorsement",note:"~3 weeks",track:"hdb",icon:"✍️"});
        ms.push({date:sellT2.apr,label:"Sell: HDB Approval",note:"~2 weeks after endorsement",track:"hdb",icon:"🏛️"});
        ms.push({date:sellT2.comp,label:"Sell HDB: Completion ⭐",note:extension>0?"Extension begins · Start looking for new HDB":"Keys handover · Start looking for new HDB",track:"hdb",icon:"🏢",highlight:true});
        if(extension>0){ms.push({date:extEnd3,label:"Extension Ends ("+extension+"m)",note:"Must move out of old HDB by this date",track:"hdb",icon:"🏡"})}
        ms.push({date:buyT2.otp,label:"Buy HDB: OTP Granted",note:"Use bank loan (recommended) · Faster disbursement",track:"pvt",icon:"📝"});
        ms.push({date:buyT2.ex,label:"Buy HDB: Exercise OTP",note:"Pay up to $4,000",track:"pvt",icon:"✏️"});
        ms.push({date:buyT2.ra,label:"Buy: Resale Application",note:buyHdbSubmission+"-day period",track:"pvt",icon:"📄"});
        ms.push({date:buyT2.acc,label:"Buy: HDB Acceptance",note:"Within 28 working days",track:"pvt",icon:"✅"});
        ms.push({date:buyT2.comp,label:"Buy HDB: Completion ⭐",note:"Get keys to new HDB",track:"pvt",icon:"🔑",highlight:true});

        ms.sort(function(a,b){return a.date-b.date});
        return{type:"resale_hdb",milestones:ms,mode:mode,totalDays:daysBetween(sellT2.its,buyT2.comp>extEnd3?buyT2.comp:extEnd3),renoWindowDays:renoW3,extensionEnd:extEnd3,extensionMonths:extension,hdbCompletionS:sellT2.comp,buyCompletionS:buyT2.comp}
      }
    }

    return null;
  },[purchaseType,mode,startDate,safetyMode,hdbSubmission,extension,pvtExercisePeriod,pvtExercisePeriodBF,pvtCompletion,ecTopDate,ecBookingDate,buyHdbOtpDate,buyHdbSubmission]);

  var t=timeline;
  if(t&&!tracked){setTracked(true);sendToSheet({type:"tool_usage",tool:"Upgrader Timeline",streetName:"",flatType:"",sizeSqm:"",floorLevel:"",resultShown:purchaseType+" "+mode,page:"Upgrader Timeline"})}

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.grey900}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet"/>
      <style>{"\
        *{margin:0;padding:0;box-sizing:border-box}\
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}\
        .fade-up{animation:fadeUp .6s ease-out both}\
        .fi{width:100%;padding:12px 14px;border:1.5px solid "+C.grey200+";border-radius:10px;font-size:14px;font-family:'DM Sans',sans-serif;background:#fff;outline:none;color:"+C.grey900+";transition:border-color .2s,box-shadow .2s}\
        .fi:focus{border-color:"+C.blue+";box-shadow:0 0 0 3px rgba(43,136,216,.12)}\
        select.fi{appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239CA3AF' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 14px center}\
        .nav-link{color:"+C.grey500+";text-decoration:none;font-size:14px;font-weight:500;padding:8px 14px;border-radius:6px;transition:color .2s,background .2s}\
        .nav-link:hover{color:"+C.blue+";background:"+C.grey100+"}\
        .nav-active{color:"+C.blue+";font-weight:600}\
        .mode-btn{padding:16px 20px;border-radius:12px;border:2px solid "+C.grey200+";background:#fff;cursor:pointer;transition:all .2s;text-align:left;font-family:'DM Sans',sans-serif;width:100%}\
        .mode-btn:hover{border-color:"+C.blue+";background:"+C.bluePale+"}\
        .mode-btn.active{border-color:"+C.blue+";background:"+C.blueLight+"}\
        .alert-box{padding:14px 18px;border-radius:10px;margin-bottom:12px;font-size:13px;line-height:1.6}\
        .section-card{background:#fff;border-radius:14px;border:1px solid "+C.grey200+";padding:22px;margin-bottom:16px}\
        .section-label{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px}\
        @media(max-width:640px){.fishbone-row{grid-template-columns:24px 1fr !important}.col-left{display:none}.col-right{padding-left:12px !important}.fishbone-hdb-mobile{display:block !important}}\
      "}</style>

      {/* Nav */}
      <div style={{background:C.white,padding:"0 20px",position:"sticky",top:0,zIndex:100,borderBottom:"1px solid "+C.grey200}}><div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:56}}><a href="/" style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,textDecoration:"none"}}>Avenue 88</a><div style={{display:"flex",gap:4}}><a href="/" className="nav-link">Home</a><a href="/timeline" className="nav-link">Timeline</a><a href="/valuation" className="nav-link">Valuation</a><a href="/upgrader" className="nav-link nav-active">Upgrader</a><a href="/" className="nav-link">Contact</a></div></div></div>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,"+C.blue+","+C.blueDark+")",padding:"48px 20px 40px"}}><div style={{maxWidth:720,margin:"0 auto"}}><span style={{color:"rgba(255,255,255,0.8)",fontSize:12,fontWeight:600,letterSpacing:2,textTransform:"uppercase"}}>Avenue 88 &middot; Advanced Tool</span><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(26px,5vw,40px)",color:"#fff",lineHeight:1.2,marginTop:8,fontWeight:700}}>HDB Upgrader Timeline</h1><p style={{color:"rgba(255,255,255,0.85)",fontSize:16,marginTop:12}}>Plan your HDB sale and next property purchase.</p></div></div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"36px 20px"}}>

        {/* Step 1: Purchase Type */}
        <div className="section-card" style={{padding:28}}>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:6}}>Step 1: What are you buying?</h3>
          <p style={{fontSize:13,color:C.grey500,marginBottom:20}}>Select your next property type to see the relevant timeline.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
            <button className={"mode-btn "+(purchaseType==="private_resale"?"active":"")} onClick={function(){selectPurchaseType("private_resale")}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:purchaseType==="private_resale"?C.blue:C.grey900}}>Private Resale</div>
              <div style={{fontSize:12,color:C.grey500,lineHeight:1.4}}>Buy an existing private condo on the resale market.</div>
            </button>
            <button className={"mode-btn "+(purchaseType==="new_ec"?"active":"")} onClick={function(){selectPurchaseType("new_ec")}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:purchaseType==="new_ec"?C.blue:C.grey900}}>New EC</div>
              <div style={{fontSize:12,color:C.grey500,lineHeight:1.4}}>Buy a new EC from developer. No ABSD. Deferred payment.</div>
            </button>
            <button className={"mode-btn "+(purchaseType==="resale_hdb"?"active":"")} onClick={function(){selectPurchaseType("resale_hdb")}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:purchaseType==="resale_hdb"?C.blue:C.grey900}}>Resale HDB</div>
              <div style={{fontSize:12,color:C.grey500,lineHeight:1.4}}>Buy another resale HDB. No ABSD. Contra available.</div>
            </button>
          </div>
        </div>

        {/* Step 2: Strategy — varies by purchase type */}
        {purchaseType==="private_resale"&&(
          <div className="fade-up section-card" style={{padding:28}}>
            <h3 style={{fontSize:17,fontWeight:700,marginBottom:6}}>Step 2: Choose Your Strategy</h3>
            <p style={{fontSize:13,color:C.grey500,marginBottom:20}}>Both strategies avoid ABSD by ensuring HDB is exercised before Private.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <button className={"mode-btn "+(mode==="sell_first"?"active":"")} onClick={function(){setMode("sell_first")}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:mode==="sell_first"?C.blue:C.grey900}}>Sell HDB First</div>
                <div style={{fontSize:12,color:C.grey500,lineHeight:1.4}}>Secure HDB buyer first, then find private. Lower risk.</div>
              </button>
              <button className={"mode-btn "+(mode==="buy_first"?"active":"")} onClick={function(){setMode("buy_first")}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:mode==="buy_first"?C.blue:C.grey900}}>Buy Private First</div>
                <div style={{fontSize:12,color:C.grey500,lineHeight:1.4}}>Secure private first with longer option period. Higher option fee.</div>
              </button>
            </div>
          </div>
        )}

        {purchaseType==="new_ec"&&(
          <div className="fade-up section-card" style={{padding:28}}>
            <h3 style={{fontSize:17,fontWeight:700,marginBottom:6}}>Step 2: Bridging Loan?</h3>
            <p style={{fontSize:13,color:C.grey500,marginBottom:20}}>Do you need a bridging loan to fund the EC purchase at TOP?</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <button className={"mode-btn "+(mode==="ec_bridging"?"active":"")} onClick={function(){setMode("ec_bridging")}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:mode==="ec_bridging"?C.blue:C.grey900}}>Yes, Bridging Loan</div>
                <div style={{fontSize:12,color:C.grey500,lineHeight:1.4}}>HDB Approval must be before EC TOP. Tighter timeline.</div>
              </button>
              <button className={"mode-btn "+(mode==="ec_no_bridging"?"active":"")} onClick={function(){setMode("ec_no_bridging")}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:mode==="ec_no_bridging"?C.blue:C.grey900}}>No Bridging Loan</div>
                <div style={{fontSize:12,color:C.grey500,lineHeight:1.4}}>More flexibility. Sell HDB within 6 months of TOP.</div>
              </button>
            </div>
          </div>
        )}

        {purchaseType==="resale_hdb"&&(
          <div className="fade-up section-card" style={{padding:28}}>
            <h3 style={{fontSize:17,fontWeight:700,marginBottom:6}}>Step 2: Choose Your Approach</h3>
            <p style={{fontSize:13,color:C.grey500,marginBottom:20}}>No ABSD for HDB-to-HDB. Choose how you want to sequence the transactions.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              <button className={"mode-btn "+(mode==="hdb_contra"?"active":"")} onClick={function(){setMode("hdb_contra")}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:mode==="hdb_contra"?C.blue:C.grey900}}>Contra</div>
                <div style={{fontSize:11,color:C.grey500,lineHeight:1.4}}>Buy + Sell processed together. Same completion day. Both must use HDB loan.</div>
              </button>
              <button className={"mode-btn "+(mode==="hdb_buy_first"?"active":"")} onClick={function(){setMode("hdb_buy_first")}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:mode==="hdb_buy_first"?C.blue:C.grey900}}>Buy HDB First</div>
                <div style={{fontSize:11,color:C.grey500,lineHeight:1.4}}>Secure new HDB first, then sell. Use bank loan for purchase. Bridging loan needed.</div>
              </button>
              <button className={"mode-btn "+(mode==="hdb_sell_first"?"active":"")} onClick={function(){setMode("hdb_sell_first")}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:mode==="hdb_sell_first"?C.blue:C.grey900}}>Sell HDB First</div>
                <div style={{fontSize:11,color:C.grey500,lineHeight:1.4}}>Sell current HDB first, then buy. Use bank loan for purchase (recommended).</div>
              </button>
            </div>
          </div>
        )}

        {/* Resale HDB Inputs */}
        {purchaseType==="resale_hdb"&&mode==="hdb_contra"&&(
          <div className="fade-up">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <div className="section-card" style={{borderLeft:"3px solid "+C.blue}}><div className="section-label" style={{color:C.blue}}>🏢 Sell Current HDB</div><div style={{display:"grid",gap:14}}><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Sell HDB OTP Date *</label><input className="fi" type="date" value={startDate} onChange={function(e){setStartDate(e.target.value)}}/></div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Resale Submission Period</label><select className="fi" value={hdbSubmission} onChange={function(e){setHdbSubmission(Number(e.target.value))}}>{[7,14,21,30,45,60,80].map(function(d){return <option key={d} value={d}>{d} days{d===80?" (max)":""}</option>})}</select></div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Extension of Stay</label><select className="fi" value={extension} onChange={function(e){setExtension(Number(e.target.value))}}><option value={0}>No extension</option><option value={1}>1 month</option><option value={2}>2 months</option><option value={3}>3 months (max)</option></select><div style={{fontSize:11,color:C.blue,marginTop:4}}>Extension only for your selling flat</div></div></div></div>
              <div className="section-card" style={{borderLeft:"3px solid "+C.orange}}><div className="section-label" style={{color:C.orange}}>🏠 Buy New HDB</div><div style={{display:"grid",gap:14}}><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Buy HDB OTP Date *</label><input className="fi" type="date" value={buyHdbOtpDate} onChange={function(e){setBuyHdbOtpDate(e.target.value)}}/></div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Resale Submission Period</label><select className="fi" value={buyHdbSubmission} onChange={function(e){setBuyHdbSubmission(Number(e.target.value))}}>{[7,14,21,30,45,60,80].map(function(d){return <option key={d} value={d}>{d} days{d===80?" (max)":""}</option>})}</select></div></div><div style={{marginTop:12,padding:"8px 12px",background:C.blueLight,borderRadius:6,fontSize:11,color:C.blueDark}}>Both buy + sell must use HDB loan for Contra. Applications must be within 7 days of each other.</div></div>
            </div>
          </div>
        )}

        {purchaseType==="resale_hdb"&&mode==="hdb_buy_first"&&(
          <div className="fade-up">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <div className="section-card" style={{borderLeft:"3px solid "+C.orange}}><div className="section-label" style={{color:C.orange}}>🏠 Buy New HDB (First)</div><div style={{display:"grid",gap:14}}><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Buy HDB OTP Date *</label><input className="fi" type="date" value={buyHdbOtpDate} onChange={function(e){setBuyHdbOtpDate(e.target.value)}}/></div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Buy: Submission Period</label><select className="fi" value={buyHdbSubmission} onChange={function(e){setBuyHdbSubmission(Number(e.target.value))}}>{[7,14,21,30,45,60,80].map(function(d){return <option key={d} value={d}>{d} days{d===80?" (max)":""}</option>})}</select><div style={{fontSize:11,color:C.green,marginTop:4,fontWeight:500}}>💡 Tip: Longer is better (up to 80 days) — gives time to sell current HDB</div></div></div><div style={{marginTop:12,padding:"8px 12px",background:C.orangeLight,borderRadius:6,fontSize:11,color:"#92600A"}}>⚠️ Use bank loan for purchase (not HDB loan) — enables bridging loan for faster disbursement.</div></div>
              <div className="section-card" style={{borderLeft:"3px solid "+C.blue}}><div className="section-label" style={{color:C.blue}}>🏢 Sell Current HDB</div><div style={{display:"grid",gap:14}}><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Sell HDB OTP Date</label><input className="fi" type="date" value={startDate} onChange={function(e){setStartDate(e.target.value)}}/><div style={{fontSize:11,color:C.grey500,marginTop:4}}>Optional · Leave blank to auto-calculate latest date</div></div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Sell: Submission Period</label><select className="fi" value={hdbSubmission} onChange={function(e){setHdbSubmission(Number(e.target.value))}}>{[7,14,21,30,45,60,80].map(function(d){return <option key={d} value={d}>{d} days{d===80?" (max)":""}</option>})}</select><div style={{fontSize:11,color:C.green,marginTop:4,fontWeight:500}}>💡 Tip: Shorter is better — speeds up HDB completion</div></div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Extension of Stay</label><select className="fi" value={extension} onChange={function(e){setExtension(Number(e.target.value))}}><option value={0}>No extension</option><option value={1}>1 month</option><option value={2}>2 months</option><option value={3}>3 months (max)</option></select></div></div></div>
            </div>
          </div>
        )}

        {purchaseType==="resale_hdb"&&mode==="hdb_sell_first"&&(
          <div className="fade-up">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <div className="section-card" style={{borderLeft:"3px solid "+C.blue}}><div className="section-label" style={{color:C.blue}}>🏢 Sell Current HDB (First)</div><div style={{display:"grid",gap:14}}><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Sell HDB OTP Date *</label><input className="fi" type="date" value={startDate} onChange={function(e){setStartDate(e.target.value)}}/></div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Sell: Submission Period</label><select className="fi" value={hdbSubmission} onChange={function(e){setHdbSubmission(Number(e.target.value))}}>{[7,14,21,30,45,60,80].map(function(d){return <option key={d} value={d}>{d} days{d===80?" (max)":""}</option>})}</select></div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Extension of Stay</label><select className="fi" value={extension} onChange={function(e){setExtension(Number(e.target.value))}}><option value={0}>No extension</option><option value={1}>1 month</option><option value={2}>2 months</option><option value={3}>3 months (max)</option></select><div style={{fontSize:11,color:C.blue,marginTop:4}}>Extension gives time to find and buy new HDB</div></div></div></div>
              <div className="section-card" style={{borderLeft:"3px solid "+C.orange}}><div className="section-label" style={{color:C.orange}}>🏠 Buy New HDB (After)</div><div style={{display:"grid",gap:14}}><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Buy HDB OTP Date</label><input className="fi" type="date" value={buyHdbOtpDate} onChange={function(e){setBuyHdbOtpDate(e.target.value)}}/><div style={{fontSize:11,color:C.grey500,marginTop:4}}>Optional · Leave blank to auto-calculate after sell completion</div></div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Buy: Submission Period</label><select className="fi" value={buyHdbSubmission} onChange={function(e){setBuyHdbSubmission(Number(e.target.value))}}>{[7,14,21,30,45,60,80].map(function(d){return <option key={d} value={d}>{d} days{d===80?" (max)":""}</option>})}</select></div></div><div style={{marginTop:12,padding:"8px 12px",background:C.orangeLight,borderRadius:6,fontSize:11,color:"#92600A"}}>⚠️ Use bank loan for purchase (recommended) — HDB loan may not disburse in time.</div></div>
            </div>
          </div>
        )}

        {/* Step 3: Inputs */}
        {purchaseType==="private_resale"&&mode&&(
          <div className="fade-up">
            <div className="section-card"><div className="section-label" style={{color:C.grey500}}>Starting Point</div>
              <div style={{display:"grid",gap:16}}>
                <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>{mode==="sell_first"?"HDB OTP Grant Date *":"Private OTP Grant Date *"}</label><input className="fi" type="date" value={startDate} onChange={function(e){setStartDate(e.target.value)}} style={{maxWidth:280}}/>{startDate&&<div style={{fontSize:12,color:C.blue,marginTop:6,fontWeight:600}}>Selected: {fmtS(new Date(startDate+"T00:00:00"))}</div>}</div>
                <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:8,display:"block"}}>Private Exercise Timing</label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <button type="button" onClick={function(){setSafetyMode("after_hdb_exercise")}} style={{padding:"12px 14px",borderRadius:10,border:"2px solid "+(safetyMode==="after_hdb_exercise"?C.blue:C.grey200),background:safetyMode==="after_hdb_exercise"?C.blueLight:"#fff",cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif"}}><div style={{fontSize:13,fontWeight:700,color:safetyMode==="after_hdb_exercise"?C.blue:C.grey900}}>After HDB Exercise</div><div style={{fontSize:11,color:C.grey500}}>Standard · Faster</div></button>
                    <button type="button" onClick={function(){setSafetyMode("after_hdb_acceptance")}} style={{padding:"12px 14px",borderRadius:10,border:"2px solid "+(safetyMode==="after_hdb_acceptance"?C.blue:C.grey200),background:safetyMode==="after_hdb_acceptance"?C.blueLight:"#fff",cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif"}}><div style={{fontSize:13,fontWeight:700,color:safetyMode==="after_hdb_acceptance"?C.blue:C.grey900}}>After HDB Acceptance</div><div style={{fontSize:11,color:C.grey500}}>Extra safe</div></button>
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
              <div className="section-card" style={{borderLeft:"3px solid "+C.blue}}><div className="section-label" style={{color:C.blue}}>🏢 HDB Sale Details</div><div style={{display:"grid",gap:14}}><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Resale Submission Period</label><select className="fi" value={hdbSubmission} onChange={function(e){setHdbSubmission(Number(e.target.value))}}>{[7,14,21,30,45,60,80].map(function(d){return <option key={d} value={d}>{d} days{d===80?" (max)":""}</option>})}</select><div style={{fontSize:11,color:mode==="buy_first"?C.green:"#92600A",marginTop:4,fontWeight:500}}>{mode==="buy_first"?"💡 Tip: Shorter is better":"💡 Tip: Longer gives more time to find private"}</div></div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Extension of Stay</label><select className="fi" value={extension} onChange={function(e){setExtension(Number(e.target.value))}}><option value={0}>No extension</option><option value={1}>1 month</option><option value={2}>2 months</option><option value={3}>3 months (max)</option></select></div></div></div>
              <div className="section-card" style={{borderLeft:"3px solid "+C.orange}}><div className="section-label" style={{color:C.orange}}>🏡 Private Purchase Details</div><div style={{display:"grid",gap:14}}><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Exercise Period</label>{mode==="sell_first"?<select className="fi" value={pvtExercisePeriod} onChange={function(e){setPvtExercisePeriod(Number(e.target.value))}}><option value={14}>14 days (standard)</option><option value={21}>21 days</option><option value={30}>30 days</option><option value={60}>60 days</option></select>:<select className="fi" value={pvtExercisePeriodBF} onChange={function(e){setPvtExercisePeriodBF(Number(e.target.value))}}><option value={60}>2 months</option><option value={90}>3 months</option><option value={120}>4 months</option><option value={150}>5 months</option><option value={180}>6 months</option></select>}{mode==="buy_first"&&<div style={{fontSize:11,color:C.green,marginTop:4,fontWeight:500}}>{"💡 Tip: Longer is better"}</div>}</div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Completion Period</label><select className="fi" value={pvtCompletion} onChange={function(e){setPvtCompletion(Number(e.target.value))}}>{[8,10,12,14,16].map(function(w){return <option key={w} value={w}>{w} weeks</option>})}</select></div></div>{mode==="buy_first"&&<div style={{marginTop:12,padding:"8px 12px",background:C.orangeLight,borderRadius:6,fontSize:11,color:"#92600A"}}>{"⚠️ Longer exercise period requires higher option fee (1–5%)."}</div>}</div>
            </div>
          </div>
        )}

        {purchaseType==="new_ec"&&mode&&(
          <div className="fade-up">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <div className="section-card" style={{borderLeft:"3px solid "+C.orange}}><div className="section-label" style={{color:C.orange}}>🏠 EC Details</div><div style={{display:"grid",gap:14}}><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>EC Booking Date</label><input className="fi" type="date" value={ecBookingDate} onChange={function(e){setEcBookingDate(e.target.value)}}/><div style={{fontSize:11,color:C.grey500,marginTop:4}}>Optional · Leave blank if not yet booked</div></div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Expected EC TOP Date *</label><input className="fi" type="date" value={ecTopDate} onChange={function(e){setEcTopDate(e.target.value)}}/><div style={{fontSize:11,color:C.grey500,marginTop:4}}>Provided by developer · Typically 3–5 years from launch</div></div></div></div>
              <div className="section-card" style={{borderLeft:"3px solid "+C.blue}}><div className="section-label" style={{color:C.blue}}>🏢 HDB Sale Details</div><div style={{display:"grid",gap:14}}><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Resale Submission Period</label><select className="fi" value={hdbSubmission} onChange={function(e){setHdbSubmission(Number(e.target.value))}}>{[7,14,21,30,45,60,80].map(function(d){return <option key={d} value={d}>{d} days{d===80?" (max)":""}</option>})}</select><div style={{fontSize:11,color:C.green,marginTop:4,fontWeight:500}}>{"💡 Tip: Shorter is better — speeds up HDB completion"}</div></div><div><label style={{fontSize:12,fontWeight:600,color:C.grey600,marginBottom:4,display:"block"}}>Extension of Stay</label><select className="fi" value={extension} onChange={function(e){setExtension(Number(e.target.value))}}><option value={0}>No extension</option><option value={1}>1 month</option><option value={2}>2 months</option><option value={3}>3 months (max)</option></select></div></div></div>
            </div>
            <div className="alert-box" style={{background:C.orangeLight,border:"1px solid "+C.orangeBorder,color:"#92600A",marginBottom:24}}>{"⚠️"} <strong>Important:</strong> EC booking fee (5%) + 2nd payment at 8 weeks (15%) + BSD must come from existing cash/CPF. HDB sale proceeds are not available at this stage.</div>
          </div>
        )}

        {/* Results */}
        {t&&(<div className="fade-up">
          {/* Summary Banner */}
          <div style={{background:"linear-gradient(135deg,"+C.blue+","+C.blueDark+")",borderRadius:14,padding:"22px 28px",marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
              <div><div style={{color:"rgba(255,255,255,0.7)",fontSize:12,fontWeight:600}}>Total Timeline</div><div style={{color:"#fff",fontSize:24,fontWeight:800,fontFamily:"'Playfair Display',serif"}}>{t.totalDays} days (~{(t.totalDays/30).toFixed(1)} months)</div></div>
              <div style={{textAlign:"right"}}><div style={{color:"rgba(255,255,255,0.7)",fontSize:12,fontWeight:600}}>Renovation Window</div><div style={{color:"#fff",fontSize:20,fontWeight:700}}>{t.renoWindowDays} days (~{(t.renoWindowDays/30).toFixed(1)} months)</div></div>
            </div>
            <div style={{marginTop:10,display:"flex",gap:16,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:"50%",background:C.blueLight}}/><span style={{color:"rgba(255,255,255,0.7)",fontSize:12}}>HDB Sale</span></div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:"50%",background:C.orange}}/><span style={{color:"rgba(255,255,255,0.7)",fontSize:12}}>{t.type==="new_ec"?"EC Purchase":t.type==="resale_hdb"?"HDB Purchase":"Private Purchase"}</span></div>
              <span style={{color:"rgba(255,255,255,0.5)",fontSize:12}}>&middot; {t.type==="new_ec"?(mode==="ec_bridging"?"With Bridging Loan":"No Bridging Loan"):t.type==="resale_hdb"?(mode==="hdb_contra"?"Contra":mode==="hdb_buy_first"?"Buy First":"Sell First"):(mode==="sell_first"?"Sell First":"Buy First")} &middot; {t.extensionMonths>0?t.extensionMonths+"m extension":"No extension"}</span>
            </div>
          </div>

          {/* Alerts — Private Resale */}
          {t.type==="private_resale"&&(<>
            {!t.absdSafe&&<div className="alert-box" style={{background:C.redLight,border:"1px solid #FECACA",color:C.red}}>{"\uD83D\uDEA8"} <strong>ABSD Risk!</strong> Private Exercise ({fmtS(t.pvtExercise)}) is on or before HDB Exercise ({fmtS(t.hdbExercise)}). Adjust timeline.</div>}
            {t.absdSafe&&<div className="alert-box" style={{background:C.greenLight,border:"1px solid #BBF7D0",color:C.green}}>{"✅"} <strong>No ABSD</strong> &mdash; HDB Exercise is {t.gapExerciseDays} day{t.gapExerciseDays>1?"s":""} before Private Exercise.</div>}
            {!t.hdbApprovalBeforePvtCompletion&&<div className="alert-box" style={{background:C.redLight,border:"1px solid #FECACA",color:C.red}}>{"\uD83D\uDEA8"} <strong>Bridging Loan Risk!</strong> HDB Approval ({fmtS(t.hdbApproval)}) is after Private Completion ({fmtS(t.pvtCompletionDate)}). Extend private completion or shorten HDB submission.</div>}
            {t.hdbApprovalBeforePvtCompletion&&<div className="alert-box" style={{background:C.blueLight,border:"1px solid "+C.blue+"33",color:C.blueDark}}>{"💰"} <strong>Bridging Loan OK</strong> &mdash; HDB Approval is before Private Completion. Apply with mortgage loan.</div>}
            {t.gapExerciseDays>0&&t.gapExerciseDays<7&&t.absdSafe&&<div className="alert-box" style={{background:C.orangeLight,border:"1px solid "+C.orangeBorder,color:"#92600A"}}>{"⚠️"} <strong>Tight Timeline:</strong> Only {t.gapExerciseDays} day{t.gapExerciseDays>1?"s":""} gap between exercise dates.</div>}
          </>)}

          {/* Alerts — New EC */}
          {t.type==="new_ec"&&(<>
            {t.hdbCompletionBeforeDeadline?<div className="alert-box" style={{background:C.greenLight,border:"1px solid #BBF7D0",color:C.green}}>{"✅"} <strong>On Track</strong> &mdash; HDB completion is {t.daysToDeadline} days before the 6-month deadline ({fmtS(t.sixMonthDeadline)}).</div>:<div className="alert-box" style={{background:C.redLight,border:"1px solid #FECACA",color:C.red}}>{"\uD83D\uDEA8"} <strong>Deadline Risk!</strong> HDB completion ({fmtS(t.hdbCompletionS)}) is after the 6-month deadline ({fmtS(t.sixMonthDeadline)}). Start selling HDB earlier!</div>}
            {mode==="ec_bridging"&&(t.hdbApprovalOK?<div className="alert-box" style={{background:C.blueLight,border:"1px solid "+C.blue+"33",color:C.blueDark}}>{"💰"} <strong>Bridging Loan OK</strong> &mdash; HDB Approval ({fmtS(t.hdbApproval)}) is before EC TOP ({fmtS(t.ecTOP)}). Bridging loan can disburse.</div>:<div className="alert-box" style={{background:C.redLight,border:"1px solid #FECACA",color:C.red}}>{"\uD83D\uDEA8"} <strong>Bridging Loan Risk!</strong> HDB Approval ({fmtS(t.hdbApproval)}) is after EC TOP ({fmtS(t.ecTOP)}). Start selling HDB earlier!</div>)}
            <div className="alert-box" style={{background:C.blueLight,border:"1px solid "+C.blue+"33",color:C.blueDark}}>{"💡"} <strong>Auto-calculated:</strong> Latest HDB OTP date is {fmtS(t.latestHdbOTP)}. Start Intent to Sell by {fmtS(t.latestIntentToSell)}.</div>
          </>)}

          {/* Alerts — Resale HDB */}
          {t.type==="resale_hdb"&&(<>
            {mode==="hdb_contra"&&t.contraAppGap>7&&<div className="alert-box" style={{background:C.redLight,border:"1px solid #FECACA",color:C.red}}>{"🚨"} <strong>Contra Risk!</strong> Resale applications are {t.contraAppGap} days apart. Must be within 7 days for Contra. Adjust your OTP dates.</div>}
            {mode==="hdb_contra"&&t.contraAppGap<=7&&<div className="alert-box" style={{background:C.greenLight,border:"1px solid #BBF7D0",color:C.green}}>{"✅"} <strong>Contra OK</strong> &mdash; Both transactions will be processed together. Completion on the same day.</div>}
            {mode==="hdb_buy_first"&&t.sellApprovalOK&&<div className="alert-box" style={{background:C.blueLight,border:"1px solid "+C.blue+"33",color:C.blueDark}}>{"💰"} <strong>Bridging Loan OK</strong> &mdash; Sell HDB Approval ({fmtS(t.sellApproval)}) is before Buy HDB Completion ({fmtS(t.buyCompletionS)}). Bridging loan can disburse.</div>}
            {mode==="hdb_buy_first"&&!t.sellApprovalOK&&<div className="alert-box" style={{background:C.redLight,border:"1px solid #FECACA",color:C.red}}>{"🚨"} <strong>Bridging Loan Risk!</strong> Sell HDB Approval ({fmtS(t.sellApproval)}) is after Buy HDB Completion ({fmtS(t.buyCompletionS)}). Start selling earlier or extend buy submission period.</div>}
            {mode==="hdb_buy_first"&&!startDate&&t.latestSellOtp&&<div className="alert-box" style={{background:C.blueLight,border:"1px solid "+C.blue+"33",color:C.blueDark}}>{"💡"} <strong>Auto-calculated:</strong> Latest Sell HDB OTP date is {fmtS(t.latestSellOtp)}. Start Intent to Sell by {fmtS(t.latestSellIts)}.</div>}
          </>)}

          {/* Fishbone Timeline */}
          <div style={{background:"#fff",borderRadius:16,border:"1px solid "+C.grey200,padding:"24px 20px",marginBottom:24}}>
            <h3 style={{fontSize:16,fontWeight:700,marginBottom:4}}>Combined Timeline</h3>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:14,borderBottom:"1px solid "+C.grey100}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:"50%",background:C.blue}}/><span style={{fontSize:12,fontWeight:600,color:C.blue}}>{"🏢"} Sell HDB</span></div>
              <div style={{fontSize:11,color:C.grey500,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Timeline</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600,color:C.orange}}>{t.type==="new_ec"?"Buy EC 🏠":t.type==="resale_hdb"?"Buy HDB 🏠":"Buy Private 🏡"}</span><div style={{width:10,height:10,borderRadius:"50%",background:C.orange}}/></div>
            </div>
            <FishboneTimeline milestones={t.milestones}/>

            {/* Renovation Window & Bridging Loan */}
            {t.renoWindowDays>0&&(<div style={{marginTop:20,paddingTop:20,borderTop:"1px dashed "+C.grey200,display:"grid",gap:12}}>
              <div style={{background:C.greenLight,border:"1px solid #BBF7D0",borderRadius:10,padding:"14px 18px",textAlign:"center"}}>
                <div style={{fontSize:14,fontWeight:700,color:C.green}}>{"🔨"} Renovation Window</div>
                <div style={{fontSize:12,color:C.green,marginBottom:4}}>{fmtS(t.type==="new_ec"?t.ecTOP:t.type==="resale_hdb"&&t.buyCompletionS?t.buyCompletionS:t.pvtCompletionS)} (get keys) &rarr; {fmtS(t.extensionEnd)} (move out of HDB)</div>
                <div style={{fontSize:15,fontWeight:700,color:C.green}}>{t.renoWindowDays} days (~{(t.renoWindowDays/30).toFixed(1)} months)</div>
              </div>
              {t.bridgingLoanDays>0&&(<div style={{background:C.blueLight,border:"1px solid "+C.blue+"33",borderRadius:10,padding:"14px 18px",textAlign:"center"}}>
                <div style={{fontSize:14,fontWeight:700,color:C.blueDark}}>{"💰"} Bridging Loan Period</div>
                <div style={{fontSize:12,color:C.blueDark,marginBottom:4}}>{fmtS(t.type==="new_ec"?t.ecTOP:t.type==="resale_hdb"&&t.buyCompletionS?t.buyCompletionS:t.pvtCompletionS)} &rarr; {fmtS(t.hdbCompletionS)} (HDB completion)</div>
                <div style={{fontSize:15,fontWeight:700,color:C.blueDark,marginBottom:8}}>~{t.bridgingLoanDays} days (~{(t.bridgingLoanDays/30).toFixed(1)} months)</div>
                <div style={{fontSize:12,color:C.grey500,paddingTop:8,borderTop:"1px solid "+C.blue+"22"}}>{"📌"} CPF refund: 7&ndash;14 working days after HDB Completion &rarr; est. by <strong>{fmtS(t.cpfRefundDate)}</strong></div>
              </div>)}
            </div>)}
          </div>

          {/* Key Notes */}
          <div style={{background:"#fff",borderRadius:14,border:"1px solid "+C.grey200,padding:24,marginBottom:24}}>
            <h4 style={{fontSize:15,fontWeight:700,marginBottom:12}}>Key Notes</h4>
            <div style={{display:"grid",gap:8}}>
              {(t.type==="private_resale"?[
                "HDB Exercise Date must be BEFORE Private Exercise Date to avoid 20% ABSD.",
                "Bridging Loan must be applied together with Mortgage Loan. HDB Approval must be in place before disbursement.",
                "Remember to repay the Bridging Loan upon receipt of funds after HDB Completion (cash + CPF refund). Delays may incur additional interest.",
                "Extension of Stay requires: exercised OTP on next property, declared during resale application.",
                "Renovation window: "+t.renoWindowDays+" days from Private Completion to HDB move-out.",
                mode==="buy_first"?"Longer private exercise period (2–6 months) requires higher option fee (1–5%).":"Private exercise period can be extended beyond 14 days if both parties agree.",
                "Cater time for renovation — most renovations take 2–4 months."
              ]:t.type==="new_ec"?[
                "No ABSD for Singapore Citizens buying new EC (indemnity form signed to sell HDB).",
                "Must sell HDB within 6 months of EC TOP date (not key collection, not CSC).",
                "EC booking fee: 5% at booking, 15% at booking + 8 weeks. Total 20% + BSD from cash/CPF on hand.",
                "HDB sale proceeds are NOT available at booking stage — plan your cash/CPF accordingly.",
                mode==="ec_bridging"?"Bridging Loan: HDB Approval must be before EC TOP for disbursement. Apply together with mortgage loan.":"No bridging loan — more flexibility on HDB sale timing, but must complete within 6 months of TOP.",
                "Remember to repay the Bridging Loan upon receipt of funds after HDB Completion.",
                "Extension of Stay available if EC TOP date is confirmed.",
                "Cater time for renovation — most renovations take 2–4 months."
              ]:[
                "No ABSD for HDB-to-HDB transactions.",
                mode==="hdb_contra"?"Contra: Both buy and sell must use HDB loan. Applications must be within 7 days of each other. Completion on the same day.":"",
                mode==="hdb_contra"?"Extension of Stay only applies to the selling flat. The flat being bought cannot have extension from its seller.":"",
                mode==="hdb_buy_first"?"Use bank loan (not HDB loan) for the purchase — enables bridging loan for faster disbursement.":"",
                mode==="hdb_buy_first"?"Bridging Loan: Sell HDB Approval must be in place before Buy HDB Completion for disbursement.":"",
                mode==="hdb_buy_first"?"Longer buy submission period (up to 80 days) recommended — gives time to sell current HDB before valuation expires.":"",
                mode==="hdb_sell_first"?"Use bank loan for purchase (recommended) — HDB loan may not disburse in time.":"",
                mode==="hdb_sell_first"?"Extension of Stay gives time to find and purchase new HDB.":"",
                "Remember to repay the Bridging Loan upon receipt of funds after HDB Completion (cash + CPF refund).",
                "CPF refund: 7–14 working days after HDB Completion.",
                "Cater time for renovation — most renovations take 2–4 months."
              ].filter(Boolean)).map(function(note,i){return(
                <div key={i} style={{fontSize:13,color:C.grey600,lineHeight:1.6,paddingLeft:16,position:"relative"}}>
                  <span style={{position:"absolute",left:0,color:C.blue}}>&bull;</span>{note}
                </div>
              )})}
            </div>
          </div>

          {/* CTA */}
          <div style={{background:"#fff",borderRadius:14,border:"1px solid "+C.grey200,padding:28,textAlign:"center"}}>
            <p style={{fontSize:15,color:C.grey500,marginBottom:14}}>Need help planning your upgrade?</p>
            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              <a href="/" style={{display:"inline-block",padding:"14px 28px",background:C.blue,color:"#fff",borderRadius:10,fontWeight:600,fontSize:15,textDecoration:"none"}}>Get a Free Consultation &rarr;</a>
              <a href="https://wa.me/+6580830688" target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"14px 28px",background:"#25D366",color:"#fff",borderRadius:10,fontWeight:600,fontSize:15,textDecoration:"none"}}>&nbsp;WhatsApp Us</a>
            </div>
          </div>
        </div>)}
      </div>

      {/* Footer */}
      <div style={{background:C.grey100,padding:"28px 20px",textAlign:"center",marginTop:36,borderTop:"1px solid "+C.grey200}}>
        <div style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,marginBottom:6}}>Avenue 88</div>
        <div style={{color:C.grey500,fontSize:12}}>Huttons / Navis &middot; &copy; 2026 Avenue 88</div>
        <div style={{maxWidth:720,margin:"16px auto 0",textAlign:"left",background:"#fff",border:"1px solid "+C.grey200,borderRadius:8,padding:"14px 16px"}}>
          <strong style={{color:C.grey600,fontSize:11,letterSpacing:.5,textTransform:"uppercase"}}>Disclaimer</strong>
          <p style={{color:C.grey500,fontSize:11,lineHeight:1.6,marginTop:6}}>The information and tools provided on this website are for general reference only and do not constitute legal, financial, or professional advice. Timelines, figures, and valuations are estimates based on available public data and typical HDB/URA processes, and actual outcomes may vary due to individual circumstances, public holidays, policy changes, or processing variations. Users should verify all details with HDB, CPF Board, IRAS, their bank, and a qualified legal or financial professional before making any decisions. Avenue 88, Huttons Asia Pte Ltd, and its representatives shall not be liable for any loss or damage arising from reliance on the information provided.</p>
        </div>
      </div>
    </div>
  );
}
