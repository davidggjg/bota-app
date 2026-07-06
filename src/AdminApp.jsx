import { useState, useEffect, useMemo, useRef } from "react";
import {
  Lock, Unlock, Plus, Pencil, Trash2, Settings, Users, Grid, LogOut,
  Sparkles, Bell, Upload, Image as ImageIcon, FileText, Eye, EyeOff,
  Key, ToggleLeft, X, Check, Bot
} from "lucide-react";
import {
  SK, RK, SETK, UPK, ld, sv, fileToB64, addWatermark, defSettings, defDraft,
  ghFetchItems, ghSaveItems, CSS
} from "./shared.js";
import { WAIcon, Tog, FRow, Fl, Sec } from "./ui.jsx";

/* ── סיסמת כניסה — נבדקת מול hash (SHA-256), הסיסמה עצמה לא מופיעה בקוד ── */
const ADMIN_HASH = "5afd73452d38542bf87d29de3097138973f9d2cc0f1f25894d42f704e6eab25a";
const ADMIN_SESSION_KEY = "bota_admin_ok";

async function sha256Hex(text){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

export default function AdminApp(){
  const [unlocked,setUnlocked]=useState(()=>sessionStorage.getItem(ADMIN_SESSION_KEY)==="1");
  return unlocked ? <AdminDashboard onLock={()=>{sessionStorage.removeItem(ADMIN_SESSION_KEY);setUnlocked(false);}}/>
                  : <PasswordGate onUnlock={()=>{sessionStorage.setItem(ADMIN_SESSION_KEY,"1");setUnlocked(true);}}/>;
}

/* ── שער סיסמה ── */
function PasswordGate({onUnlock}){
  const [pw,setPw]=useState("");
  const [err,setErr]=useState("");
  const [checking,setChecking]=useState(false);

  async function submit(e){
    e.preventDefault();
    if(!pw){return;}
    setChecking(true);
    const hash=await sha256Hex(pw);
    setChecking(false);
    if(hash===ADMIN_HASH){ onUnlock(); }
    else { setErr("קוד שגוי"); setPw(""); }
  }

  return(
    <div className="root">
      <style>{CSS}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} className="z">
        <div style={{width:"100%",maxWidth:360}}>
          <div className="fu" style={{textAlign:"center",marginBottom:30}}>
            <div style={{width:64,height:64,borderRadius:18,background:"linear-gradient(135deg,#b91c1c,var(--red))",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
              <Lock size={26} color="#fff"/>
            </div>
            <h1 style={{fontSize:"1.4rem",fontWeight:900}}>פאנל ניהול BOTA</h1>
            <p style={{color:"var(--dim)",fontSize:".85rem",marginTop:4}}>הזן קוד גישה כדי להמשיך</p>
          </div>
          <form onSubmit={submit} className="panel fu d1" style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} className="inp" placeholder="קוד גישה" style={{textAlign:"center",fontSize:"1rem",letterSpacing:".08em"}} autoFocus/>
            {err&&<p style={{color:"var(--red)",fontSize:".8rem",textAlign:"center"}}>{err}</p>}
            <button type="submit" className="bp" style={{padding:"12px"}} disabled={checking}>{checking?"בודק...":"כניסה"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── לוח הניהול המלא ── */
function AdminDashboard({onLock}){
  const [items,setItems]=useState([]);
  const [requests,setRequests]=useState([]);
  const [uploads,setUploads]=useState([]);
  const [settings,setSettings]=useState(defSettings);
  const [view,setView]=useState("list");
  const [activeId,setActiveId]=useState(null);
  const [draft,setDraft]=useState({...defDraft});
  const [toast,setToast]=useState("");
  const [loadingRemote,setLoadingRemote]=useState(false);

  useEffect(()=>{
    setItems(ld(SK,[]));
    setRequests(ld(RK,[]));
    setUploads(ld(UPK,[]));
    setSettings({...defSettings,...ld(SETK,{})});
  },[]);

  useEffect(()=>{
    if(!settings.ghOwner||!settings.ghRepo) return;
    let cancelled=false;
    setLoadingRemote(true);
    (async()=>{
      const remote=await ghFetchItems(settings);
      if(!cancelled){ if(remote){ setItems(remote); sv(SK,remote); } setLoadingRemote(false); }
    })();
    return()=>{cancelled=true;};
  },[settings.ghOwner,settings.ghRepo,settings.ghBranch]);

  useEffect(()=>{ if(!toast)return; const t=setTimeout(()=>setToast(""),2800); return()=>clearTimeout(t); },[toast]);

  const activeItem=useMemo(()=>items.find(i=>i.id===activeId)||null,[items,activeId]);
  const pendingReq=requests.filter(r=>r.status==="pending").length;
  const pendingUp=uploads.filter(u=>u.status==="pending").length;

  async function syncItems(updated){
    setItems(updated); sv(SK,updated);
    if(settings.ghOwner&&settings.ghRepo&&settings.ghToken){
      try{ await ghSaveItems(settings,updated); }
      catch(err){ setToast("⚠️ שגיאת סנכרון: "+err.message); }
    }
  }

  function openEditor(item){
    setDraft(item?{...defDraft,...item}:{...defDraft,allowedPhones:[]});
    setActiveId(item?.id||null);
    setView("editor");
  }

  function publish(){
    if(!draft.title.trim()){setToast("צריך כותרת");return;}
    let u;
    if(activeId){
      u=items.map(i=>i.id===activeId?{...draft,id:activeId}:i);
      setToast("עודכן ✓");
    } else {
      const id=Math.random().toString(36).slice(2,9);
      u=[...items,{...draft,id}];
      setToast("פורסם 🚀");
    }
    syncItems(u);setView("list");
  }

  function delItem(id){
    const u=items.filter(i=>i.id!==id);
    syncItems(u);setToast("נמחק");
  }

  function approveReq(req){
    const ui=items.map(i=>i.id===req.itemId?{...i,allowedPhones:Array.from(new Set([...(i.allowedPhones||[]),req.phone]))}:i);
    syncItems(ui);
    const ur=requests.map(r=>r.id===req.id?{...r,status:"approved"}:r);
    setRequests(ur);sv(RK,ur);setToast("גישה אושרה ✓");
  }
  function rejectReq(req){
    const ur=requests.map(r=>r.id===req.id?{...r,status:"rejected"}:r);
    setRequests(ur);sv(RK,ur);setToast("נדחה");
  }
  function revokeAccess(item,p){
    const u=items.map(i=>i.id===item.id?{...i,allowedPhones:(i.allowedPhones||[]).filter(x=>x!==p)}:i);
    syncItems(u);setToast("גישה בוטלה");
  }

  function approveUpload(up){
    const newItem={id:Math.random().toString(36).slice(2,9),title:up.title,description:up.description,imageB64:up.imageB64,imageUrl:"",gatedContent:up.fileUrl||up.fileLink||"",fileName:up.fileName,fileSize:up.fileSize,allowedPhones:[],fromPartner:true,partnerPhone:up.phone};
    const ui=[...items,newItem];syncItems(ui);
    const uu=uploads.map(u=>u.id===up.id?{...u,status:"approved"}:u);
    setUploads(uu);sv(UPK,uu);setToast("אפליקציה עלתה לאתר 🎉");
  }
  function rejectUpload(up){
    const uu=uploads.map(u=>u.id===up.id?{...u,status:"rejected"}:u);
    setUploads(uu);sv(UPK,uu);setToast("בקשה נדחתה");
  }

  function saveSettings(s){
    setSettings(s);sv(SETK,s);setToast("הגדרות נשמרו ✓");
  }

  const navItems=[
    {key:"list",label:"אפליקציות",icon:<Grid size={14}/>},
    {key:"admin-req",label:"גישות",icon:<Bell size={14}/>,badge:pendingReq},
    {key:"admin-up",label:"בקשות עלייה",icon:<Upload size={14}/>,badge:pendingUp},
    {key:"admin-settings",label:"הגדרות",icon:<Settings size={14}/>},
  ];

  return (
    <div className="root">
      <style>{CSS}</style>
      <div className="bubble b1" style={{width:260,height:260,top:"8%",right:"5%"}}/>
      <div className="bubble b3" style={{width:100,height:100,top:"30%",left:"4%",opacity:.5}}/>

      {toast&&(
        <div className="z fi" style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:9999}}>
          <div className="panel panel-hi" style={{padding:"10px 20px",fontSize:".85rem",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
            <Sparkles size={14} style={{color:"var(--cyan)"}}/>{toast}
          </div>
        </div>
      )}

      <header className="z" style={{borderBottom:"1px solid var(--border)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100,background:"rgba(7,9,15,.85)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px",height:62,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#b91c1c,var(--red))",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Key size={17} color="#fff"/>
            </div>
            <span className="grad" style={{fontWeight:800,fontSize:"1.15rem"}}>BOTA · ניהול</span>
            {loadingRemote&&<span className="chip" style={{fontSize:".65rem"}}>מסנכרן...</span>}
          </div>
          <nav style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            {navItems.map(n=>(
              <button key={n.key} onClick={()=>setView(n.key)}
                className={view===n.key?"bp":"bg"}
                style={{padding:"7px 13px",fontSize:".8rem",display:"flex",alignItems:"center",gap:6,position:"relative"}}>
                {n.icon}{n.label}
                {n.badge>0&&<span className="badge">{n.badge}</span>}
              </button>
            ))}
            <button onClick={()=>openEditor(null)} className="bp" style={{padding:"7px 12px",fontSize:".8rem",display:"flex",alignItems:"center",gap:5}}><Plus size={14}/>חדש</button>
            <button onClick={onLock} className="bg" style={{padding:"7px 10px"}}><LogOut size={14}/></button>
          </nav>
        </div>
      </header>

      <main className="z" style={{maxWidth:1100,margin:"0 auto",padding:"32px 20px 80px"}}>
        {view==="list"&&<ItemList items={items} onEdit={openEditor} onDelete={delItem}/>}
        {view==="editor"&&<Editor draft={draft} setDraft={setDraft} onPublish={publish} onCancel={()=>setView("list")} isEdit={!!activeId}/>}
        {view==="admin-req"&&<AdminRequests requests={requests} onApprove={approveReq} onReject={rejectReq} items={items} onRevoke={revokeAccess}/>}
        {view==="admin-up"&&<AdminUploads uploads={uploads} onApprove={approveUpload} onReject={rejectUpload}/>}
        {view==="admin-settings"&&<AdminSettings settings={settings} onSave={saveSettings}/>}
      </main>
    </div>
  );
}

/* ── Item List (ניהול) ── */
function ItemList({items,onEdit,onDelete}){
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
          <div key={item.id} className="panel item-card fu" style={{animationDelay:`${i*.07}s`,overflow:"hidden"}}>
            <div style={{aspectRatio:"16/9",background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
              {(item.imageB64||item.imageUrl)
                ?<img src={item.imageB64||item.imageUrl} alt={item.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                :<ImageIcon size={28} style={{color:"var(--dim2)"}}/>}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(7,9,15,.7),transparent)"}}/>
              {item.fromPartner&&<div style={{position:"absolute",top:8,right:8}}><span className="chip" style={{background:"rgba(34,197,94,.15)",borderColor:"rgba(34,197,94,.3)",color:"var(--green)",fontSize:".65rem"}}>שותף</span></div>}
            </div>
            <div style={{padding:"16px 18px"}}>
              <h3 style={{fontWeight:700,marginBottom:4,fontSize:"1rem"}}>{item.title}</h3>
              {item.description&&<p style={{color:"var(--dim)",fontSize:".82rem",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.description}</p>}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12,paddingTop:10,borderTop:"1px solid var(--border)"}}>
                <span className="chip"><Users size={11}/>{(item.allowedPhones||[]).length} מורשים</span>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>onEdit(item)} className="bg" style={{padding:"5px 8px",border:"none"}}><Pencil size={13}/></button>
                  <button onClick={()=>onDelete(item.id)} className="bg" style={{padding:"5px 8px",border:"none",color:"var(--red)"}}><Trash2 size={13}/></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Editor ── */
function Editor({draft,setDraft,onPublish,onCancel,isEdit}){
  const [ph,setPh]=useState("");
  const imgRef=useRef();
  const fileRef=useRef();

  async function pickImage(e){
    const f=e.target.files[0]; if(!f)return;
    if(f.size>5*1024*1024){alert("תמונה גדולה מדי (מקס 5MB)");return;}
    const b64=await fileToB64(f);
    const watermarked=await addWatermark(b64);
    setDraft(d=>({...d,imageB64:watermarked,imageUrl:""}));
  }

  async function pickFile(e){
    const f=e.target.files[0]; if(!f)return;
    const url=URL.createObjectURL(f);
    setDraft(d=>({...d,fileUrl:url,fileName:f.name,fileSize:f.size}));
  }

  function addPhone(){
    const n=(ph||"").replace(/[^0-9]/g,""); if(n.length<9)return;
    if(!(draft.allowedPhones||[]).includes(n)) setDraft(d=>({...d,allowedPhones:[...(d.allowedPhones||[]),n]}));
    setPh("");
  }

  return(
    <div style={{maxWidth:680,margin:"0 auto"}} className="fu">
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
        <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--p1),var(--p3))",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Pencil size={16} color="#fff"/>
        </div>
        <h2 style={{fontWeight:800,fontSize:"1.25rem"}}>{isEdit?"עריכת פריט":"פריט חדש"}</h2>
      </div>
      <div className="panel" style={{padding:28,display:"flex",flexDirection:"column",gap:18}}>
        <Fl label="כותרת"><input value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} className="inp" placeholder="שם האפליקציה"/></Fl>
        <Fl label="תיאור — מוצג לכולם"><textarea value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))} className="inp" placeholder="תאר בקצרה..."/></Fl>

        <Fl label="תמונה (מהגלריה)">
          <input ref={imgRef} type="file" accept="image/*" onChange={pickImage} style={{display:"none"}}/>
          {(draft.imageB64||draft.imageUrl)
            ?<div style={{position:"relative",borderRadius:12,overflow:"hidden",aspectRatio:"16/9"}}>
               <img src={draft.imageB64||draft.imageUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
               <button onClick={()=>setDraft(d=>({...d,imageB64:"",imageUrl:""}))} style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,.6)",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={14}/></button>
             </div>
            :<div className="upload-zone" onClick={()=>imgRef.current?.click()}>
               <ImageIcon size={22} style={{color:"var(--dim)",margin:"0 auto 8px"}}/>
               <p style={{color:"var(--dim)",fontSize:".85rem"}}>לחץ לבחירת תמונה מהגלריה</p>
               <p style={{color:"var(--dim2)",fontSize:".73rem",marginTop:4}}>PNG / JPG · מקס 5MB · יתווסף לוגו BOTA אוטומטי</p>
             </div>}
          <div style={{marginTop:8}}>
            <input value={draft.imageUrl} onChange={e=>setDraft(d=>({...d,imageUrl:e.target.value,imageB64:""}))} className="inp" placeholder="עדיף: קישור תמונה https://... (קליל יותר מהעלאה)"/>
          </div>
        </Fl>

        <Fl label="קובץ האפליקציה">
          <input ref={fileRef} type="file" onChange={pickFile} style={{display:"none"}}/>
          {draft.fileName
            ?<div className="panel" style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(34,197,94,.06)",borderColor:"rgba(34,197,94,.25)"}}>
               <div style={{display:"flex",alignItems:"center",gap:10}}>
                 <FileText size={18} style={{color:"var(--green)"}}/>
                 <div><p style={{fontSize:".85rem",fontWeight:600}}>{draft.fileName}</p><p style={{color:"var(--dim2)",fontSize:".72rem"}}>{(draft.fileSize/1024/1024).toFixed(1)} MB</p></div>
               </div>
               <button onClick={()=>setDraft(d=>({...d,fileUrl:"",fileName:"",fileSize:0}))} className="bg" style={{padding:"5px 8px",border:"none"}}><X size={13}/></button>
             </div>
            :<div className="upload-zone" onClick={()=>fileRef.current?.click()}>
               <Upload size={22} style={{color:"var(--dim)",margin:"0 auto 8px"}}/>
               <p style={{color:"var(--dim)",fontSize:".85rem"}}>לחץ לבחירת קובץ (APK, ZIP, עד 1GB)</p>
               <p style={{color:"var(--dim2)",fontSize:".73rem",marginTop:4}}>הקובץ ישמר בזיכרון הדפדפן לאורך הסשן בלבד</p>
             </div>}
          <div style={{marginTop:8}}>
            <input value={draft.gatedContent} onChange={e=>setDraft(d=>({...d,gatedContent:e.target.value}))} className="inp" placeholder="עדיף: קישור הורדה חיצוני https://..."/>
          </div>
        </Fl>

        <Fl label="מורשים מראש">
          <div style={{display:"flex",gap:8}}>
            <input value={ph} onChange={e=>setPh(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addPhone())} className="inp" style={{flex:1}} placeholder="05XXXXXXXX" inputMode="numeric"/>
            <button onClick={addPhone} className="bp" style={{padding:"0 16px"}}>הוסף</button>
          </div>
          {(draft.allowedPhones||[]).length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
              {draft.allowedPhones.map(p=>(
                <span key={p} className="chip" style={{color:"var(--text)"}}>
                  {p}<button onClick={()=>setDraft(d=>({...d,allowedPhones:d.allowedPhones.filter(x=>x!==p)}))} style={{background:"none",border:"none",cursor:"pointer",color:"var(--dim)",padding:0,display:"flex"}}><X size={10}/></button>
                </span>
              ))}
            </div>
          )}
        </Fl>

        <div style={{display:"flex",gap:10,paddingTop:4}}>
          <button onClick={onPublish} className="bp" style={{flex:1,padding:"12px"}}>{isEdit?"שמור":"פרסם 🚀"}</button>
          <button onClick={onCancel} className="bg" style={{padding:"12px 20px"}}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

/* ── Admin Requests ── */
function AdminRequests({requests,onApprove,onReject,items,onRevoke}){
  const pending=requests.filter(r=>r.status==="pending");
  const withAccess=items.filter(i=>(i.allowedPhones||[]).length>0);
  return(
    <div style={{maxWidth:700,margin:"0 auto",display:"flex",flexDirection:"column",gap:24}} className="fu">
      <h2 style={{fontWeight:800,fontSize:"1.25rem"}}>בקשות גישה</h2>
      <Sec title={`ממתינות (${pending.length})`}>
        {!pending.length&&<p style={{color:"var(--dim2)",fontSize:".85rem"}}>אין בקשות ממתינות</p>}
        {pending.map(r=>(
          <div key={r.id} className="panel panel-hi" style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div><p style={{fontWeight:600}}>{r.itemTitle}</p><p style={{color:"var(--dim)",fontSize:".82rem"}}>{r.phone}</p></div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>onApprove(r)} className="bp" style={{padding:"7px 10px"}}><Check size={15}/></button>
              <button onClick={()=>onReject(r)} className="bg" style={{padding:"7px 10px",color:"var(--red)",borderColor:"rgba(239,68,68,.3)"}}><X size={15}/></button>
            </div>
          </div>
        ))}
      </Sec>
      <Sec title="גישות פעילות">
        {!withAccess.length&&<p style={{color:"var(--dim2)",fontSize:".85rem"}}>אין גישות פעילות</p>}
        {withAccess.map(item=>(
          <div key={item.id} className="panel" style={{padding:"14px 18px"}}>
            <p style={{fontWeight:600,marginBottom:10}}>{item.title}</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {item.allowedPhones.map(p=>(
                <span key={p} className="chip" style={{color:"var(--text)"}}>
                  {p}<button onClick={()=>onRevoke(item,p)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--dim)",padding:0,display:"flex"}}><X size={10}/></button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </Sec>
    </div>
  );
}

/* ── Admin Uploads ── */
function AdminUploads({uploads,onApprove,onReject}){
  const pending=uploads.filter(u=>u.status==="pending");
  const done=uploads.filter(u=>u.status!=="pending");
  const [preview,setPreview]=useState(null);
  return(
    <div style={{maxWidth:800,margin:"0 auto",display:"flex",flexDirection:"column",gap:24}} className="fu">
      <h2 style={{fontWeight:800,fontSize:"1.25rem"}}>בקשות עלייה מהקהילה</h2>
      {!!preview&&(
        <div className="modal-bg" onClick={()=>setPreview(null)}>
          <div onClick={e=>e.stopPropagation()} className="panel modal" style={{padding:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{fontWeight:700}}>{preview.title}</h3>
              <button onClick={()=>setPreview(null)} className="bg" style={{padding:"6px 10px",border:"none"}}><X size={15}/></button>
            </div>
            {preview.imageB64&&<img src={preview.imageB64} style={{width:"100%",borderRadius:12,marginBottom:16,maxHeight:260,objectFit:"cover"}} alt=""/>}
            <p style={{color:"var(--dim)",lineHeight:1.7,whiteSpace:"pre-wrap",marginBottom:12}}>{preview.description}</p>
            {(preview.fileUrl||preview.fileLink)&&<p style={{color:"var(--cyan)",fontSize:".82rem"}}>📎 {preview.fileName||preview.fileLink}</p>}
            <p style={{color:"var(--dim2)",fontSize:".75rem",marginTop:10}}>מגיש: {preview.phone}</p>
          </div>
        </div>
      )}
      <Sec title={`ממתינות לאישור (${pending.length})`}>
        {!pending.length&&<p style={{color:"var(--dim2)",fontSize:".85rem"}}>אין בקשות ממתינות</p>}
        {pending.map(u=>(
          <div key={u.id} className="panel panel-hi" style={{padding:"14px 18px",display:"flex",gap:14,alignItems:"flex-start"}}>
            {u.imageB64&&<img src={u.imageB64} style={{width:70,height:70,borderRadius:10,objectFit:"cover",flexShrink:0}} alt=""/>}
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontWeight:700}}>{u.title}</p>
              <p style={{color:"var(--dim)",fontSize:".8rem",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginTop:3}}>{u.description}</p>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                <span className="chip" style={{fontSize:".65rem"}}>{u.phone}</span>
                {u.fileName&&<span className="chip" style={{fontSize:".65rem"}}><FileText size={10}/>{u.fileName}</span>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
              <button onClick={()=>setPreview(u)} className="bg" style={{padding:"6px 10px",fontSize:".75rem",display:"flex",alignItems:"center",gap:5}}><Eye size={12}/>תצוגה</button>
              <button onClick={()=>onApprove(u)} className="bp" style={{padding:"6px 10px",fontSize:".75rem",display:"flex",alignItems:"center",gap:5}}><Check size={12}/>אשר</button>
              <button onClick={()=>onReject(u)} className="bg" style={{padding:"6px 10px",fontSize:".75rem",color:"var(--red)",borderColor:"rgba(239,68,68,.3)",display:"flex",alignItems:"center",gap:5}}><X size={12}/>דחה</button>
            </div>
          </div>
        ))}
      </Sec>
      {!!done.length&&(
        <Sec title="היסטוריה">
          {done.map(u=>(
            <div key={u.id} style={{display:"flex",justifyContent:"space-between",fontSize:".82rem",color:"var(--dim2)",padding:"4px 2px"}}>
              <span>{u.title} — {u.phone}</span>
              <span style={{color:u.status==="approved"?"var(--cyan)":"var(--red)"}}>{u.status==="approved"?"אושר":"נדחה"}</span>
            </div>
          ))}
        </Sec>
      )}
    </div>
  );
}

/* ── Admin Settings ── */
function AdminSettings({settings,onSave}){
  const [s,setS]=useState({...settings});
  useEffect(()=>setS({...settings}),[settings]);
  const [showKey,setShowKey]=useState(false);
  const [showGhToken,setShowGhToken]=useState(false);
  const [testMsg,setTestMsg]=useState("");
  const [testing,setTesting]=useState(false);

  async function testConnection(){
    setTesting(true);setTestMsg("");
    try{
      const remote=await ghFetchItems(s);
      if(remote===null) setTestMsg("❌ לא הצלחתי לקרוא — בדוק Owner/Repo/Branch (הריפו חייב להיות ציבורי)");
      else setTestMsg(`✅ קריאה תקינה — נמצאו ${remote.length} פריטים בקובץ`);
    }catch(err){ setTestMsg("❌ שגיאה: "+err.message); }
    setTesting(false);
  }

  return(
    <div style={{maxWidth:620,margin:"0 auto"}} className="fu">
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
        <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--p1),var(--p3))",display:"flex",alignItems:"center",justifyContent:"center"}}><Settings size={17} color="#fff"/></div>
        <h2 style={{fontWeight:800,fontSize:"1.25rem"}}>הגדרות מערכת</h2>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>

        <div className="panel" style={{padding:"8px 20px"}}>
          <FRow icon={<Lock size={15} style={{color:s.siteLocked?"var(--red)":"var(--dim)"}}/>} label="נעילת האתר הציבורי" sub={s.siteLocked?"⛔ אף אחד לא יכול להיכנס לאתר הציבורי":"האתר פתוח לכל מספר"}>
            <Tog on={s.siteLocked} onToggle={()=>setS(p=>({...p,siteLocked:!p.siteLocked}))} colorOn="linear-gradient(135deg,#b91c1c,var(--red))"/>
          </FRow>
        </div>

        <div className="panel" style={{padding:"16px 20px"}}>
          <p style={{fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:8}}><WAIcon/>קישור WhatsApp</p>
          <input value={s.whatsappLink} onChange={e=>setS(p=>({...p,whatsappLink:e.target.value}))} className="inp" placeholder="https://chat.whatsapp.com/..."/>
        </div>

        <div className="panel" style={{padding:"8px 20px"}}>
          <FRow icon={<Bot size={15} style={{color:"var(--cyan)"}}/>} label="צ'אט AI" sub="הצג/הסתר את כפתור הצ'אט באתר הציבורי">
            <Tog on={s.chatEnabled} onToggle={()=>setS(p=>({...p,chatEnabled:!p.chatEnabled}))}/>
          </FRow>
          <FRow icon={<Lock size={15} style={{color:s.aiLocked?"var(--orange)":"var(--dim)"}}/>} label="נעל נושאים" sub="צ'אט יענה רק על שאלות BOTA">
            <Tog on={s.aiLocked} onToggle={()=>setS(p=>({...p,aiLocked:!p.aiLocked}))} colorOn="linear-gradient(135deg,#c2410c,var(--orange))"/>
          </FRow>
        </div>

        <div className="panel" style={{padding:"20px"}}>
          <p style={{fontWeight:700,marginBottom:16,display:"flex",alignItems:"center",gap:8}}><Sparkles size={15} style={{color:"var(--cyan)"}}/>הגדרות AI</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Fl label="מפתח API (אופציונלי)">
              <div style={{display:"flex",gap:8}}>
                <input type={showKey?"text":"password"} value={s.aiKey} onChange={e=>setS(p=>({...p,aiKey:e.target.value}))} className="inp" placeholder="sk-ant-..."/>
                <button onClick={()=>setShowKey(v=>!v)} className="bg" style={{padding:"0 12px",flexShrink:0}}>{showKey?<EyeOff size={15}/>:<Eye size={15}/>}</button>
              </div>
              <p style={{color:"var(--dim2)",fontSize:".72rem",marginTop:5}}>ריק = שימוש במפתח של המערכת</p>
            </Fl>
            <Fl label="אישיות הצ'אט">
              <input value={s.aiPersonality} onChange={e=>setS(p=>({...p,aiPersonality:e.target.value}))} className="inp" placeholder="ידידותית ותמציתית"/>
            </Fl>
            <Fl label="הגבלות נוספות">
              <textarea value={s.aiRestrictions} onChange={e=>setS(p=>({...p,aiRestrictions:e.target.value}))} className="inp" style={{minHeight:60}} placeholder="למשל: אל תדון במחירים / אל תציע מוצרים..."/>
            </Fl>
            <Fl label="סיומת קבועה לכל תשובה">
              <input value={s.aiSuffix} onChange={e=>setS(p=>({...p,aiSuffix:e.target.value}))} className="inp" placeholder="למשל: — צוות BOTA 🚀"/>
            </Fl>
          </div>
        </div>

        <div className="panel" style={{padding:"20px"}}>
          <p style={{fontWeight:700,marginBottom:6,display:"flex",alignItems:"center",gap:8}}><Key size={15} style={{color:"var(--cyan)"}}/>מסד נתונים משותף (GitHub)</p>
          <p style={{color:"var(--dim2)",fontSize:".75rem",marginBottom:16,lineHeight:1.6}}>
            כשזה מוגדר, כל אפליקציה שתפרסם נשמרת בקובץ בתוך הריפו שלך — כך שכל מי שנכנס לאתר הציבורי, מכל מכשיר, רואה את אותו תוכן. הטוקן נשמר רק בדפדפן הזה.
          </p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Fl label="בעל הריפו (Owner)">
              <input value={s.ghOwner} onChange={e=>setS(p=>({...p,ghOwner:e.target.value.trim()}))} className="inp" placeholder="davidggjg"/>
            </Fl>
            <Fl label="שם הריפו">
              <input value={s.ghRepo} onChange={e=>setS(p=>({...p,ghRepo:e.target.value.trim()}))} className="inp" placeholder="bota-app"/>
            </Fl>
            <Fl label="ענף (Branch)">
              <input value={s.ghBranch} onChange={e=>setS(p=>({...p,ghBranch:e.target.value.trim()}))} className="inp" placeholder="main"/>
            </Fl>
            <Fl label="GitHub Token (Fine-grained, הרשאת Contents: Read & write, מוגבל לריפו הזה בלבד)">
              <div style={{display:"flex",gap:8}}>
                <input type={showGhToken?"text":"password"} value={s.ghToken} onChange={e=>setS(p=>({...p,ghToken:e.target.value.trim()}))} className="inp" placeholder="github_pat_..."/>
                <button onClick={()=>setShowGhToken(v=>!v)} className="bg" style={{padding:"0 12px",flexShrink:0}}>{showGhToken?<EyeOff size={15}/>:<Eye size={15}/>}</button>
              </div>
              <p style={{color:"var(--dim2)",fontSize:".72rem",marginTop:5}}>⚠️ אל תשתף את הטוקן עם אף אחד, ואל תכניס אותו לקוד המקור.</p>
            </Fl>
            <button onClick={testConnection} className="bg" style={{padding:"10px",fontSize:".85rem"}} disabled={testing}>{testing?"בודק...":"בדוק חיבור"}</button>
            {testMsg&&<p style={{fontSize:".8rem",color:testMsg.startsWith("✅")?"var(--green)":"var(--red)"}}>{testMsg}</p>}
          </div>
        </div>

        <button onClick={()=>onSave(s)} className="bp" style={{padding:"13px",fontSize:".95rem"}}>שמור הגדרות</button>
      </div>
    </div>
  );
}
