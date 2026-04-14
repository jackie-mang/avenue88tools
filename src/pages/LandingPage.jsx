import { useState } from "react";
import { Link } from "react-router-dom";
import { sendToSheet } from "../sheets";

const C = {
  blue: "#2B88D8",
  blueHover: "#2477C0",
  blueDark: "#1E6AB5",
  blueLight: "#E8F2FC",
  bluePale: "#F0F7FF",
  white: "#FFFFFF",
  bg: "#F7F8FA",
  grey50: "#F9FAFB",
  grey100: "#F3F4F6",
  grey200: "#E5E7EB",
  grey300: "#D1D5DB",
  grey500: "#6B7280",
  grey600: "#4B5563",
  grey700: "#374151",
  grey900: "#111827",
};

const TOWNS = ["Ang Mo Kio","Bedok","Bishan","Bukit Batok","Bukit Merah","Bukit Panjang","Choa Chu Kang","Clementi","Geylang","Hougang","Jurong East","Jurong West","Kallang/Whampoa","Marine Parade","Pasir Ris","Punggol","Queenstown","Sembawang","Sengkang","Serangoon","Tampines","Toa Payoh","Woodlands","Yishun"];
const PROPERTY_TYPES = ["3-Room HDB","4-Room HDB","5-Room HDB","Executive HDB","EC (after MOP)","Private Condo"];
const HELP_OPTIONS = ["Selling my HDB","Buying a resale HDB","Upgrading to condo/EC","Just exploring options"];

export default function LandingPage() {
  const [form, setForm] = useState({ name:"", phone:"", email:"", town:"", propertyType:"", helpWith:"" });
  const [submitted, setSubmitted] = useState(false);
  const [hoveredTool, setHoveredTool] = useState(null);

  const tools = [
    { icon:"📅", title:"HDB Resale Timeline Planner", desc:"Input your OTP date and get every milestone date calculated — from Intent to Sell through to Completion.", status:"Live", link:"/timeline" },
    { icon:"🏠", title:"HDB Valuation Checker", desc:"Check real HDB transaction data from data.gov.sg for your street — actual transacted prices, PSF, and trends.", status:"Live", link:"/valuation" },
    { icon:"💰", title:"Sales Proceeds Calculator", desc:"Find out how much cash you walk away with after loan repayment, CPF refund, commission, and legal fees.", status:"Coming Soon", link:null },
    { icon:"📊", title:"Affordability Calculator", desc:"Check your TDSR-based borrowing power, monthly repayments, and upgrade feasibility.", status:"Coming Soon", link:null }
  ];

  const handleSubmit = () => {
    if (!form.name || !form.phone) return;
    sendToSheet({ type:"lead", name:form.name, phone:form.phone, email:form.email, town:form.town, propertyType:form.propertyType, helpWith:form.helpWith, sourcePage:"Landing Page" });
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans', sans-serif", color:C.grey900 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .7s ease-out both}
        .fade-d1{animation:fadeUp .7s ease-out .1s both}
        .fade-d2{animation:fadeUp .7s ease-out .2s both}
        .fade-d3{animation:fadeUp .7s ease-out .3s both}
        .tool-card{transition:transform .25s,box-shadow .25s;text-decoration:none;color:inherit;display:block}
        .tool-card:hover{transform:translateY(-3px);box-shadow:0 8px 30px rgba(43,136,216,.15)}
        .fi{width:100%;padding:13px 16px;border:1.5px solid ${C.grey200};border-radius:10px;font-size:15px;font-family:'DM Sans',sans-serif;background:#fff;outline:none;color:${C.grey900};transition:border-color .2s,box-shadow .2s}
        .fi:focus{border-color:${C.blue};box-shadow:0 0 0 3px rgba(43,136,216,.12)}
        .fi::placeholder{color:${C.grey300}}
        select.fi{appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239CA3AF' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center}
        .btn-primary{padding:14px 28px;background:${C.blue};color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:background .2s,transform .1s;text-decoration:none;display:inline-block}
        .btn-primary:hover{background:${C.blueHover}}
        .btn-primary:active{transform:scale(.98)}
        .btn-outline{padding:14px 28px;background:transparent;color:${C.blue};border:1.5px solid ${C.blue};border-radius:10px;font-size:15px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;text-decoration:none;display:inline-block;transition:background .2s}
        .btn-outline:hover{background:${C.blueLight}}
        .nav-link{color:${C.grey500};text-decoration:none;font-size:14px;font-weight:500;padding:8px 14px;border-radius:6px;transition:color .2s,background .2s}
        .nav-link:hover{color:${C.blue};background:${C.grey100}}
        .nav-active{color:${C.blue};font-weight:600}
      `}</style>

      {/* Nav */}
      <div style={{background:C.white,padding:"0 20px",position:"sticky",top:0,zIndex:100,borderBottom:`1px solid ${C.grey200}`}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:56}}>
          <a href="/" style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,textDecoration:"none"}}>Avenue 88</a>
          <div style={{display:"flex",gap:4}}>
            <a href="/" className="nav-link nav-active">Home</a>
            <a href="/timeline" className="nav-link">Timeline</a>
            <a href="/valuation" className="nav-link">Valuation</a>
            <a href="#contact" className="nav-link">Contact</a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{background:`linear-gradient(135deg, ${C.blue} 0%, ${C.blueDark} 100%)`,padding:"0 20px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 70% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)"}}/> 
        <div style={{maxWidth:800,margin:"0 auto",padding:"64px 0 56px",position:"relative",zIndex:1}}>
          <div className="fade-up"><span style={{color:"rgba(255,255,255,0.8)",fontSize:13,fontWeight:600,letterSpacing:2,textTransform:"uppercase"}}>Avenue 88 · HDB Upgrader Toolkit</span></div>
          <h1 className="fade-d1" style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(32px,6vw,52px)",color:"#fff",lineHeight:1.15,marginTop:12,marginBottom:20,fontWeight:700}}>Plan Your HDB Sale<br/>With Confidence</h1>
          <p className="fade-d2" style={{fontSize:"clamp(16px,2.5vw,19px)",color:"rgba(255,255,255,0.85)",lineHeight:1.6,maxWidth:540,marginBottom:32}}>Free tools built by agents who do this every day. Check your timeline, estimate your valuation, and understand your proceeds — before you commit.</p>
          <div className="fade-d3" style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <a href="#tools" style={{display:"inline-block",padding:"14px 28px",background:"#fff",color:C.blue,borderRadius:10,fontWeight:600,fontSize:15,textDecoration:"none"}}>Explore Tools ↓</a>
            <a href="#contact" style={{display:"inline-block",padding:"14px 28px",background:"rgba(255,255,255,0.15)",color:"#fff",borderRadius:10,fontWeight:600,fontSize:15,textDecoration:"none",border:"1.5px solid rgba(255,255,255,0.3)"}}>Talk to Us</a>
          </div>
        </div>
      </div>

      {/* Tools */}
      <div id="tools" style={{maxWidth:800,margin:"0 auto",padding:"56px 20px"}}>
        <div style={{marginBottom:36}}>
          <span style={{color:C.blue,fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>Your Toolkit</span>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(26px,4vw,36px)",marginTop:8,fontWeight:700}}>Everything You Need to Plan Your Sale</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20}}>
          {tools.map((t,i)=>(
            <a key={i} href={t.link||undefined} className="tool-card" style={{pointerEvents:t.link?"auto":"default"}} onMouseEnter={()=>setHoveredTool(i)} onMouseLeave={()=>setHoveredTool(null)}>
              <div style={{background:"#fff",borderRadius:14,padding:28,border:`1px solid ${hoveredTool===i&&t.link?C.blue:C.grey200}`,position:"relative",overflow:"hidden",height:"100%",transition:"border-color .25s"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:C.blue,opacity:hoveredTool===i?1:0,transition:"opacity .25s"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <span style={{fontSize:32}}>{t.icon}</span>
                  <span style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",background:t.status==="Live"?C.blueLight:"#F3F4F6",color:t.status==="Live"?C.blue:"#9CA3AF"}}>{t.status}</span>
                </div>
                <h3 style={{fontSize:18,fontWeight:700,marginBottom:10}}>{t.title}</h3>
                <p style={{fontSize:14,color:C.grey500,lineHeight:1.6}}>{t.desc}</p>
                {t.status==="Live"&&t.link&&<div style={{marginTop:18}}><span style={{fontSize:14,fontWeight:600,color:C.blue}}>Try it now →</span></div>}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Why Avenue 88 */}
      <div style={{background:C.grey100,padding:"56px 20px"}}>
        <div style={{maxWidth:800,margin:"0 auto"}}>
          <span style={{color:C.blue,fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>Why Avenue 88</span>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(26px,4vw,36px)",marginTop:8,marginBottom:16,fontWeight:700}}>Your HDB Upgrader Specialists</h2>
          <p style={{fontSize:16,color:C.grey500,lineHeight:1.7,maxWidth:600,marginBottom:28}}>Avenue 88 is a dedicated division of real estate professionals specialising in helping HDB owners upgrade — whether to a resale flat, EC, or private condominium.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:20,marginBottom:28}}>
            {[
              {icon:"📊",label:"Data-Driven Analysis",sub:"PrimeKey Analysis & OCTA framework to evaluate every upgrading option objectively"},
              {icon:"🏠",label:"HDB Upgrading Experts",sub:"Deep expertise across HDB resale, ECs, and private condos — we know the full upgrading path"},
              {icon:"🤝",label:"End-to-End Guidance",sub:"From selling your HDB to securing your next home, we handle the entire transition"}
            ].map((item,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:14,padding:24,border:`1px solid ${C.grey200}`}}>
                <div style={{fontSize:32,marginBottom:10}}>{item.icon}</div>
                <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>{item.label}</div>
                <div style={{fontSize:13,color:C.grey500,lineHeight:1.5}}>{item.sub}</div>
              </div>
            ))}
          </div>
          <a href="https://www.avenue88property.com/hdb-upgrading" target="_blank" rel="noopener noreferrer" className="btn-primary">Learn More About Avenue 88 →</a>
        </div>
      </div>

      {/* Lead Form */}
      <div id="contact" style={{maxWidth:800,margin:"0 auto",padding:"56px 20px"}}>
        <div style={{background:"#fff",borderRadius:18,border:`1px solid ${C.grey200}`,overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.04)"}}>
          <div style={{background:`linear-gradient(135deg, ${C.blue}, ${C.blueDark})`,padding:"32px 32px 28px"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(24px,4vw,32px)",color:"#fff",fontWeight:700,marginBottom:8}}>Get Your Free Consultation</h2>
            <p style={{color:"rgba(255,255,255,0.85)",fontSize:15}}>Tell us about your property and we'll reach out with a personalised plan — no obligations.</p>
          </div>
          <div style={{padding:"28px 32px 36px"}}>
            {submitted?(
              <div style={{textAlign:"center",padding:"40px 20px"}}>
                <div style={{width:56,height:56,borderRadius:"50%",background:C.blueLight,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:28,color:C.blue}}>✓</div>
                <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,marginBottom:12,color:C.blue}}>Thank You, {form.name}!</h3>
                <p style={{fontSize:15,color:C.grey500,lineHeight:1.6,maxWidth:400,margin:"0 auto"}}>We've received your details. Our team will reach out within 24 hours via WhatsApp or phone.</p>
              </div>
            ):(
              <div style={{display:"grid",gap:16}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Name *</label><input className="fi" placeholder="Your full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
                  <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Phone *</label><input className="fi" placeholder="9XXX XXXX" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
                </div>
                <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Email</label><input className="fi" type="email" placeholder="your@email.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Current Town</label><select className="fi" value={form.town} onChange={e=>setForm({...form,town:e.target.value})}><option value="">Select town</option>{TOWNS.map(t=><option key={t}>{t}</option>)}</select></div>
                  <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>Property Type</label><select className="fi" value={form.propertyType} onChange={e=>setForm({...form,propertyType:e.target.value})}><option value="">Select type</option>{PROPERTY_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                </div>
                <div><label style={{fontSize:13,fontWeight:600,color:C.grey600,marginBottom:6,display:"block"}}>What do you need help with?</label><select className="fi" value={form.helpWith} onChange={e=>setForm({...form,helpWith:e.target.value})}><option value="">Select one</option>{HELP_OPTIONS.map(t=><option key={t}>{t}</option>)}</select></div>
                <button className="btn-primary" onClick={handleSubmit} style={{width:"100%",marginTop:4}}>Get My Free Consultation →</button>
                <p style={{fontSize:12,color:C.grey300,textAlign:"center",marginTop:4}}>We respect your privacy. No spam, ever.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{background:C.grey100,padding:"36px 20px",textAlign:"center",borderTop:`1px solid ${C.grey200}`}}>
        <div style={{color:C.grey900,fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,marginBottom:8}}>Avenue 88</div>
        <div style={{color:C.grey500,fontSize:13}}>Huttons / Navis · CEA Licence No. L3008899K</div>
        <div style={{color:C.grey300,fontSize:12,marginTop:6}}>© 2026 Avenue 88. All rights reserved.</div>
      </div>
    </div>
  );
}
