import { useState, useEffect, useMemo, useRef } from "react";
import {
  Lock, Send, X, ArrowRight, Zap, Bot, Sparkles,
  Upload, Image as ImageIcon, FileText, Handshake, ChevronRight,
  Users, Grid, Download, Unlock
} from "lucide-react";
import { SK, RK, UPK, SETK, norm, ld, sv, countEmoji, fileToB64, addWatermark, defSettings, ghFetchItems, ghFetchSettings, ghSubmitIssue, buildSysPrompt, CSS } from "./shared.js";
import { WAIcon, Fl } from "./ui.jsx";

export default function PublicApp() {
  const [phone,setPhone]=useState("");
  const [session,setSession]=useState(null);
  const [items,setItems]=useState([]);
  const [requests,setRequests]=useState([]);
  const [settings,setSettings]=useState(defSettings);
  const [view,setView]=useState("login");
  const [activeId,setActiveId]=useState(null);
  const [toast,setToast]=useState("");
  const [chatOpen,setChatOpen]=useState(false);
  const [partnerOpen,setPartnerOpen]=useState(false);
  const [phoneErr,setPhoneErr]=useState("");

  useEffect(()=>{
    setItems(ld(SK,[]));
    setRequests(ld(RK,[]));
    const local={...defSettings,...ld(SETK,{})};
    setSettings(local);
    (async()=>{
      const remote=await ghFetchSettings(local);
      if(remote) setSettings(p=>({...p,...remote}));
    })();
  },[]);

  useEffect(()=>{
    if(!settings.ghOwner||!settings.ghRepo) return;
    let cancelled=false;
    (async()=>{
      const remote=await ghFetchItems(settings);
      if(!cancelled&&remote){ setItems(remote); sv(SK,remote); }
    })();
    return()=>{cancelled=true;};
  },[settings.ghOwner,settings.ghRepo,settings.ghBranch]);

  useEffect(()=>{ if(!toast)return; const t=setTimeout(()=>setToast(""),2800); return()=>clearTimeout(t); },[toast]);

  const activeItem=useMemo(()=>items.find(i=>i.id===activeId)||null,[items,activeId]);

  function login(e){
    e?.preventDefault();
    const n=norm(phone);
    if(n.length<9){setPhoneErr("מספר לא תקין");return;}
    setSession({phone:n});
    if(settings.siteLocked){setView("locked");}
    else{setView("list");}
    setPhoneErr("");
  }
  function logout(){setSession(null);setPhone("");setView("login");}

  function hasAccess(item){
    if(!item)return false;
    return(item.allowedPhones||[]).includes(session.phone);
  }

  function requestAccess(item){
    if(requests.find(r=>r.itemId===item.id&&r.phone===session.phone&&r.status==="pending")){
      setToast("הבקשה כבר ממתינה");return;
    }
    const r={id:Math.random().toString(36).slice(2,9),itemId:item.id,itemTitle:item.title,phone:session.phone,status:"pending",createdAt:Date.now()};
    const u=[...requests,r];setRequests(u);sv(RK,u);setToast("הבקשה נשלחה!");
    ghSubmitIssue(settings,`בקשת גישה: ${item.title}`,[
      `פריט: ${item.title} (${item.id})`,
      `טלפון: ${session.phone}`,
    ],["access-request"]);
  }

  function submitUpload(data){
    const uploads=ld(UPK,[]);
    const u={...data,id:Math.random().toString(36).slice(2,9),phone:session.phone,status:"pending",createdAt:Date.now()};
    const arr=[...uploads,u];sv(UPK,arr);
    setToast("הבקשה נשלחה למנהל 🙌");
    ghSubmitIssue(settings,`הצעת אפליקציה: ${data.title||"ללא כותרת"}`,[
      `כותרת: ${data.title||"—"}`,
      `תיאור: ${data.description||"—"}`,
      `טלפון: ${session.phone}`,
      data.fileName?`קובץ מצורף: ${data.fileName}`:"",
      data.fileLink?`קישור: ${data.fileLink}`:"",
    ].filter(Boolean),["upload-submission"]);
  }

  return (
    <div className="root">
      <style>{CSS}</style>
      <div className="bubble b1" style={{width:260,height:260,top:"8%",right:"5%"}}/>
      <div className="bubble b2" style={{width:160,height:160,top:"55%",right:"2%",opacity:.7}}/>
      <div className="bubble b3" style={{width:100,height:100,top:"30%",left:"4%",opacity:.5}}/>
      <div className="bubble b1" style={{width:80,height:80,bottom:"12%",left:"18%",opacity:.4,animationDuration:"17s"}}/>

      {toast&&(
        <div className="z fi" style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:9999}}>
          <div className="panel panel-hi" style={{padding:"10px 20px",fontSize:".85rem",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
            <Sparkles size={14} style={{color:"var(--cyan)"}}/>{toast}
          </div>
        </div>
      )}

      {session&&(
        <header className="z" style={{borderBottom:"1px solid var(--border)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100,background:"rgba(7,9,15,.85)"}}>
          <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px",height:62,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,var(--p1),var(--cyan))",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px -4px rgba(124,58,237,.6)"}}>
                <Zap size={17} color="#fff"/>
              </div>
              <span className="grad" style={{fontWeight:800,fontSize:"1.15rem"}}>BOTA</span>
              <span className="hide-sm" style={{fontSize:".7rem",color:"var(--dim2)"}}>אפליקציות שאין בחנות</span>
            </div>
            <nav style={{display:"flex",alignItems:"center",gap:6}}>
              {settings.whatsappLink&&(
                <a href={settings.whatsappLink} target="_blank" rel="noopener noreferrer" className="bgreen"
                  style={{padding:"7px 12px",fontSize:".8rem",display:"flex",alignItems:"center",gap:5,textDecoration:"none"}}>
                  <WAIcon/>קבוצה
                </a>
              )}
              <button onClick={logout} className="bg" style={{padding:"7px 12px",fontSize:".8rem"}}>יציאה</button>
            </nav>
          </div>
        </header>
      )}

      <main className="z" style={{maxWidth:1100,margin:"0 auto",padding:"32px 20px 120px"}}>
        {view==="login"&&<LoginScreen phone={phone} setPhone={setPhone} onSubmit={login} error={phoneErr}/>}
        {view==="list"&&session&&<ItemList items={items} onView={id=>{setActiveId(id);setView("item");}}/>}
        {view==="item"&&activeItem&&<ItemView item={activeItem} access={hasAccess(activeItem)} session={session} onBack={()=>setView("list")} onRequest={()=>requestAccess(activeItem)} requests={requests}/>}
        {view==="locked"&&session&&<LockedScreen onLogout={logout}/>}
      </main>

      {session&&(
        <>
          <button onClick={()=>setPartnerOpen(true)} className="bgreen pulse"
            style={{position:"fixed",bottom:90,left:24,width:52,height:52,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:0,border:"none"}}>
            <Handshake size={21}/>
          </button>
          {settings.chatEnabled&&(
            <button onClick={()=>setChatOpen(v=>!v)} className="bp"
              style={{position:"fixed",bottom:24,left:24,width:52,height:52,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:0,animation:"pulse-ring 3s ease infinite"}}>
              {chatOpen?<X size={20}/>:<Bot size={22}/>}
            </button>
          )}
        </>
      )}

      {partnerOpen&&session&&<PartnershipModal onClose={()=>setPartnerOpen(false)} onSubmit={submitUpload}/>}
      {chatOpen&&session&&<AIChatWidget settings={settings} onClose={()=>setChatOpen(false)}/>}
    </div>
  );
}

/* ── Login ── */
function LoginScreen({phone,setPhone,onSubmit,error}){
  return(
    <div style={{minHeight:"70vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div className="fu" style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:70,height:70,borderRadius:20,background:"linear-gradient(135deg,var(--p1),var(--cyan))",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",boxShadow:"0 8px 32px -8px rgba(124,58,237,.7)",animation:"pulse-ring 2.5s ease infinite"}}>
            <Zap size={28} color="#fff"/>
          </div>
          <h1 className="grad" style={{fontSize:"2rem",fontWeight:900,marginBottom:6}}>BOTA</h1>
          <p style={{color:"var(--dim)",fontSize:".9rem"}}>אפליקציות שאין בחנות · גישה פרטית</p>
        </div>
        <div className="panel fu d1" style={{padding:28}}>
          <form onSubmit={onSubmit} style={{display:"flex",flexDirection:"column",gap:14}}>
            <Fl label="מספר טלפון">
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="05XXXXXXXX" inputMode="numeric" className="inp" style={{textAlign:"center",fontSize:"1.1rem",letterSpacing:".1em"}} autoFocus/>
            </Fl>
            {error&&<p style={{color:"var(--red)",fontSize:".8rem",textAlign:"center"}}>{error}</p>}
            <button type="submit" className="bp" style={{padding:"12px",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              כניסה <ArrowRight size={16}/>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Item List ── */
function ItemList({items,onView}){
  if(!items.length) return(
    <div style={{textAlign:"center",padding:"80px 0"}} className="fu">
      <div style={{width:56,height:56,borderRadius:16,background:"var(--glass2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",border:"1px solid var(--border)"}}>
        <Grid size={22} style={{color:"var(--dim)"}}/>
      </div>
      <p style={{color:"var(--dim)"}}>אין אפליקציות עדיין</p>
    </div>
  );
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}} className="fu">
        <div>
          <h2 style={{fontSize:"1.4rem",fontWeight:800}}>האפליקציות</h2>
          <p style={{color:"var(--dim)",fontSize:".8rem",marginTop:2}}>{items.length} פריטים</p>
        </div>
      </div>
      <div className="g2" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
        {items.map((item,i)=>(
          <div key={item.id} className="panel item-card fu" style={{animationDelay:`${i*.07}s`,overflow:"hidden",cursor:"pointer"}} onClick={()=>onView(item.id)}>
            <div style={{aspectRatio:"16/9",background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
              {(item.imageB64||item.imageUrl)
                ?<img src={item.imageB64||item.imageUrl} alt={item.title} style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform .5s"}} onMouseOver={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}/>
                :<ImageIcon size={28} style={{color:"var(--dim2)"}}/>}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(7,9,15,.7),transparent)"}}/>
              {item.fromPartner&&<div style={{position:"absolute",top:8,right:8}}><span className="chip" style={{background:"rgba(34,197,94,.15)",borderColor:"rgba(34,197,94,.3)",color:"var(--green)",fontSize:".65rem"}}>שותף</span></div>}
            </div>
            <div style={{padding:"16px 18px"}}>
              <h3 style={{fontWeight:700,marginBottom:4,fontSize:"1rem"}}>{item.title}</h3>
              {item.description&&<p style={{color:"var(--dim)",fontSize:".82rem",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.description}</p>}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12,paddingTop:10,borderTop:"1px solid var(--border)"}}>
                <span className="chip"><Users size={11}/>{(item.allowedPhones||[]).length} מורשים</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Item View ── */
function ItemView({item,access,session,onBack,onRequest,requests}){
  const myReq=requests.find(r=>r.itemId===item.id&&r.phone===session.phone);
  return(
    <div style={{maxWidth:700,margin:"0 auto"}} className="fi">
      <button onClick={onBack} className="bg" style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",fontSize:".82rem",marginBottom:20,border:"none"}}>
        <ArrowRight size={14}/>חזרה
      </button>
      <div className="panel" style={{overflow:"hidden"}}>
        {(item.imageB64||item.imageUrl)&&(
          <div style={{aspectRatio:"16/9",overflow:"hidden"}}>
            <img src={item.imageB64||item.imageUrl} alt={item.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>
        )}
        <div style={{padding:28}}>
          <p style={{fontSize:".7rem",letterSpacing:".18em",color:"var(--cyan)",marginBottom:6}}>BOTA · ברוכים הבאים</p>
          <h1 className="grad" style={{fontSize:"1.9rem",fontWeight:900,marginBottom:10}}>{item.title}</h1>
          {item.description&&<p style={{color:"var(--dim)",lineHeight:1.7,marginBottom:18,whiteSpace:"pre-wrap"}}>{item.description}</p>}
          <div className="dg" style={{margin:"20px 0"}}/>
          {access?(
            <div className="panel" style={{padding:20,background:"rgba(6,182,212,.06)",borderColor:"rgba(6,182,212,.25)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,var(--cyan),var(--p3))",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Unlock size={15} color="#fff"/>
                </div>
                <span style={{fontWeight:700,color:"var(--cyan)"}}>גישה מאושרת</span>
              </div>
              {(item.fileUrl||item.gatedContent)&&(
                <a href={item.fileUrl||item.gatedContent} download={item.fileName||undefined} target="_blank" rel="noopener noreferrer"
                  className="bp" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 20px",textDecoration:"none",marginBottom:12}}>
                  <Download size={15}/>{item.fileName?"הורד קובץ":"קישור להורדה"}
                </a>
              )}
            </div>
          ):(
            <div style={{textAlign:"center",padding:"28px 20px"}}>
              <div style={{width:52,height:52,borderRadius:16,background:"var(--glass2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",border:"1px solid var(--border)"}}>
                <Lock size={20} style={{color:"var(--dim)"}}/>
              </div>
              {!myReq&&<><p style={{color:"var(--dim)",marginBottom:14,fontSize:".9rem"}}>תוכן זה דורש אישור גישה</p>
                <button onClick={onRequest} className="bp" style={{padding:"11px 24px",display:"inline-flex",alignItems:"center",gap:8}}><Send size={14}/>בקש גישה</button></>}
              {myReq?.status==="pending"&&<p style={{color:"var(--dim)"}}>⏳ הבקשה ממתינה לאישור</p>}
              {myReq?.status==="rejected"&&<p style={{color:"var(--red)"}}>הבקשה נדחתה</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Locked Screen ── */
function LockedScreen({onLogout}){
  return(
    <div style={{minHeight:"70vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="fu" style={{textAlign:"center",maxWidth:340}}>
        <div style={{width:76,height:76,borderRadius:22,background:"linear-gradient(135deg,#b91c1c,var(--red))",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 22px",animation:"lock-pulse 2.5s ease infinite"}}>
          <Lock size={30} color="#fff"/>
        </div>
        <h2 style={{fontSize:"1.6rem",fontWeight:900,marginBottom:10}}>האתר נעול</h2>
        <p style={{color:"var(--dim)",lineHeight:1.7,marginBottom:26}}>הגישה מוגבלת כרגע.<br/>לקבלת גישה פנה למנהל.</p>
        <button onClick={onLogout} className="bg" style={{padding:"10px 24px"}}>חזור לכניסה</button>
      </div>
    </div>
  );
}

/* ── Partnership Modal ── */
function PartnershipModal({onClose,onSubmit}){
  const [step,setStep]=useState("intro");
  const [form,setForm]=useState({title:"",description:"",fileLink:"",imageB64:"",fileName:"",fileSize:0,fileUrl:""});
  const [errors,setErrors]=useState({});
  const imgRef=useRef();
  const fileRef=useRef();

  async function pickImg(e){
    const f=e.target.files[0]; if(!f)return;
    if(f.size>5*1024*1024){alert("מקס 5MB");return;}
    const b64=await fileToB64(f);
    const wm=await addWatermark(b64);
    setForm(p=>({...p,imageB64:wm}));
  }
  async function pickFile(e){
    const f=e.target.files[0]; if(!f)return;
    if(f.size>8*1024*1024){alert("קובץ גדול מדי להעלאה ישירה (מקס 8MB). השתמש בקישור הורדה במקום.");return;}
    const b64=await fileToB64(f);
    setForm(p=>({...p,fileUrl:b64,fileName:f.name,fileSize:f.size}));
  }

  function validate(){
    const e={};
    if(!form.title.trim()) e.title="חובה";
    if(countEmoji(form.description)<3) e.description="נדרשים לפחות 3 סמיילים 😊 (כרגע "+countEmoji(form.description)+")";
    if(!form.imageB64) e.image="נדרשת תמונה";
    if(!form.fileUrl&&!form.fileLink.trim()) e.file="נדרש קובץ או קישור הורדה";
    setErrors(e);
    return !Object.keys(e).length;
  }

  function submit(){
    if(!validate())return;
    onSubmit({...form});
    setStep("done");
  }

  return(
    <div className="modal-bg" onClick={onClose}>
      <div className="panel modal" onClick={e=>e.stopPropagation()} style={{padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,var(--green),#16a34a)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Handshake size={17} color="#fff"/>
            </div>
            <h2 style={{fontWeight:800,fontSize:"1.1rem"}}>פינת השותפות</h2>
          </div>
          <button onClick={onClose} className="bg" style={{padding:"6px 10px",border:"none"}}><X size={15}/></button>
        </div>

        {step==="intro"&&(
          <div>
            <div style={{background:"rgba(34,197,94,.07)",border:"1px solid rgba(34,197,94,.2)",borderRadius:12,padding:20,marginBottom:20}}>
              <p style={{fontWeight:700,marginBottom:10,color:"var(--green)"}}>🤝 הצטרף לצוות BOTA!</p>
              <p style={{color:"var(--dim)",lineHeight:1.8,fontSize:".9rem"}}>
                BOTA גדלה הודות לקהילה שלה. אם יש לך אפליקציה מגניבה שאחרים לא מכירים — שתף אותה!
              </p>
              <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:8}}>
                {["📝 תכין תיאור מסודר עם לפחות 3 סמיילים","🖼️ תעלה תמונה נקייה (יתווסף לוגו BOTA אוטומטי)","📦 תצרף קובץ או קישור הורדה","✅ המנהל בודק ומאשר — ואז העלייה חיה!"].map((t,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,fontSize:".85rem",color:"var(--dim)"}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:"var(--green)",flexShrink:0}}/>
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={()=>setStep("form")} className="bgreen" style={{width:"100%",padding:"12px",fontSize:".95rem"}}>
              אני רוצה לתרום אפליקציה! <ChevronRight size={16} style={{display:"inline",verticalAlign:"middle"}}/>
            </button>
          </div>
        )}

        {step==="form"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Fl label="שם האפליקציה *">
              <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} className="inp" placeholder="שם האפליקציה"/>
              {errors.title&&<p style={{color:"var(--red)",fontSize:".75rem",marginTop:4}}>{errors.title}</p>}
            </Fl>
            <Fl label="תיאור עם סמיילים * (מינימום 3 😊)">
              <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="inp" placeholder={"🎯 מה האפליקציה עושה?\n✨ למה היא מיוחדת?\n📱 איפה להוריד ולמה שווה לנסות?"} style={{minHeight:100}}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                {errors.description?<p style={{color:"var(--red)",fontSize:".75rem"}}>{errors.description}</p>:<span/>}
                <span style={{color:countEmoji(form.description)>=3?"var(--green)":"var(--dim2)",fontSize:".72rem"}}>{countEmoji(form.description)} סמיילים</span>
              </div>
            </Fl>
            <Fl label="תמונה לאפליקציה *">
              <input ref={imgRef} type="file" accept="image/*" onChange={pickImg} style={{display:"none"}}/>
              {form.imageB64
                ?<div style={{position:"relative",borderRadius:10,overflow:"hidden",aspectRatio:"16/9"}}>
                   <img src={form.imageB64} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
                   <button onClick={()=>setForm(p=>({...p,imageB64:""}))} style={{position:"absolute",top:6,left:6,background:"rgba(0,0,0,.6)",border:"none",borderRadius:"50%",width:26,height:26,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={13}/></button>
                 </div>
                :<div className="upload-zone" onClick={()=>imgRef.current?.click()}>
                   <ImageIcon size={20} style={{color:"var(--dim)",margin:"0 auto 6px"}}/><p style={{color:"var(--dim)",fontSize:".82rem"}}>בחר תמונה מהגלריה</p>
                 </div>}
              {errors.image&&<p style={{color:"var(--red)",fontSize:".75rem",marginTop:4}}>{errors.image}</p>}
            </Fl>
            <Fl label="קובץ האפליקציה">
              <input ref={fileRef} type="file" onChange={pickFile} style={{display:"none"}}/>
              {form.fileName
                ?<div className="panel" style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(34,197,94,.06)",borderColor:"rgba(34,197,94,.25)"}}>
                   <div style={{display:"flex",alignItems:"center",gap:8}}><FileText size={15} style={{color:"var(--green)"}}/><span style={{fontSize:".82rem"}}>{form.fileName}</span></div>
                   <button onClick={()=>setForm(p=>({...p,fileUrl:"",fileName:"",fileSize:0}))} className="bg" style={{padding:"3px 6px",border:"none"}}><X size={11}/></button>
                 </div>
                :<div className="upload-zone" onClick={()=>fileRef.current?.click()} style={{padding:14}}>
                   <Upload size={18} style={{color:"var(--dim)",margin:"0 auto 5px"}}/><p style={{color:"var(--dim)",fontSize:".78rem"}}>לחץ לבחירת קובץ</p>
                 </div>}
            </Fl>
            <Fl label="או קישור הורדה">
              <input value={form.fileLink} onChange={e=>setForm(p=>({...p,fileLink:e.target.value}))} className="inp" placeholder="https://..."/>
              {errors.file&&<p style={{color:"var(--red)",fontSize:".75rem",marginTop:4}}>{errors.file}</p>}
            </Fl>
            <div style={{display:"flex",gap:8,paddingTop:4}}>
              <button onClick={submit} className="bgreen" style={{flex:1,padding:"11px"}}>שלח לבדיקה 🚀</button>
              <button onClick={()=>setStep("intro")} className="bg" style={{padding:"11px 16px"}}>חזור</button>
            </div>
          </div>
        )}

        {step==="done"&&(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:"3rem",marginBottom:16}}>🎉</div>
            <h3 style={{fontWeight:800,fontSize:"1.2rem",marginBottom:8}}>תודה!</h3>
            <p style={{color:"var(--dim)",lineHeight:1.7,marginBottom:20}}>הבקשה שלך התקבלה.<br/>המנהל יבדוק ויאשר בקרוב.</p>
            <button onClick={onClose} className="bp" style={{padding:"10px 24px"}}>סגור</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── AI Chat Widget ── */
function AIChatWidget({settings,onClose}){
  const [msgs,setMsgs]=useState([{role:"assistant",content:`היי! אני BOTA AI 🤖\nאיך אפשר לעזור?`}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef();
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs,loading]);

  async function send(){
    const txt=input.trim(); if(!txt||loading)return;
    const newMsgs=[...msgs,{role:"user",content:txt}];
    setMsgs(newMsgs);setInput("");setLoading(true);
    const isGroq=settings.aiProvider==="groq";
    const key=isGroq?settings.groqKey:settings.aiKey;
    if(!key){
      setMsgs(p=>[...p,{role:"assistant",content:"הצ'אט לא מוגדר עדיין — למנהל צריך להוסיף מפתח API בהגדרות."}]);
      setLoading(false);return;
    }
    try{
      let reply;
      if(isGroq){
        const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{
          method:"POST",
          headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
          body:JSON.stringify({model:"llama-3.3-70b-versatile",max_tokens:1000,
            messages:[{role:"system",content:buildSysPrompt(settings)},...newMsgs.slice(1).map(m=>({role:m.role,content:m.content}))]})
        });
        const data=await res.json();
        if(!res.ok) throw new Error(data?.error?.message||"שגיאת שרת");
        reply=data.choices?.[0]?.message?.content||"לא הצלחתי לענות.";
      } else {
        const res=await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "x-api-key":key,
            "anthropic-version":"2023-06-01",
            "anthropic-dangerous-direct-browser-access":"true",
          },
          body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1000,system:buildSysPrompt(settings),
            messages:newMsgs.slice(1).map(m=>({role:m.role,content:m.content}))})
        });
        const data=await res.json();
        if(!res.ok) throw new Error(data?.error?.message||"שגיאת שרת");
        reply=data.content?.[0]?.text||"לא הצלחתי לענות.";
      }
      setMsgs(p=>[...p,{role:"assistant",content:reply}]);
    }catch{
      setMsgs(p=>[...p,{role:"assistant",content:"שגיאת חיבור. נסה שנית."}]);
    }finally{setLoading(false);}
  }

  return(
    <div className="fu" style={{position:"fixed",bottom:88,left:24,width:"min(340px,calc(100vw - 48px))",zIndex:199}}>
      <div className="panel" style={{display:"flex",flexDirection:"column",height:420,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:30,height:30,borderRadius:10,background:"linear-gradient(135deg,var(--p1),var(--cyan))",display:"flex",alignItems:"center",justifyContent:"center"}}><Bot size={15} color="#fff"/></div>
            <div><p style={{fontWeight:700,fontSize:".87rem"}}>BOTA AI</p><p style={{fontSize:".67rem",color:"var(--green)"}}>● מחובר</p></div>
          </div>
          <button onClick={onClose} className="bg" style={{padding:"5px 8px",border:"none"}}><X size={14}/></button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
          {msgs.map((m,i)=>(
            <div key={i} className={m.role==="user"?"cbu":"cba"} style={{whiteSpace:"pre-wrap"}}>{m.content}</div>
          ))}
          {loading&&<div className="cba" style={{display:"flex",gap:5,alignItems:"center",padding:"12px 16px"}}><div className="td"/><div className="td"/><div className="td"/></div>}
          <div ref={endRef}/>
        </div>
        <div style={{padding:"10px 12px",borderTop:"1px solid var(--border)",display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="שאל משהו..." className="inp" style={{flex:1,padding:"8px 12px",fontSize:".82rem"}} disabled={loading}/>
          <button onClick={send} className="bp" style={{padding:"8px 12px"}} disabled={loading}><Send size={14}/></button>
        </div>
      </div>
    </div>
  );
}
