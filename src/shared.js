/* ── Storage keys ── */
export const SK = "bota_i3", RK = "bota_r3", SETK = "bota_s3", UPK = "bota_u3";

export const norm = p => (p||"").replace(/[^0-9]/g,"");
export const ld = (k,d) => { try { const r=localStorage.getItem(k); return r?JSON.parse(r):d; } catch{return d;} };
export const sv = (k,v) => localStorage.setItem(k,JSON.stringify(v));
export const countEmoji = s => (s.match(/[\u{1F300}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u00A9\u00AE]|❤|✨|🔥|⭐|💎|🎯|🚀|✅|🎁|💡|📱|💻|🎮|🎬|📺|🎵|🎧|🎨|🏆|👑|💫|🌟|⚡|🔑|🛡/gu)||[]).length;

export const fileToB64 = file => new Promise((res,rej) => {
  const r = new FileReader();
  r.onload = e => res(e.target.result);
  r.onerror = () => rej(new Error("read fail"));
  r.readAsDataURL(file);
});

export const addWatermark = async (dataUrl) => {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img,0,0);
      const fs = Math.max(14, Math.min(img.width/15, 32));
      ctx.font = `bold ${fs}px Heebo,sans-serif`;
      const txt = "BOTA";
      const m = ctx.measureText(txt);
      const pad = 10, x = img.width - m.width - pad - 6, y = img.height - pad;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(x-8, y-fs-4, m.width+16, fs+10);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(txt, x, y);
      res(c.toDataURL("image/jpeg", 0.88));
    };
    img.src = dataUrl;
  });
};

export const buildSysPrompt = s => {
  let p = `אתה עוזר של BOTA — אפליקציות שאין בחנות. ענה תמיד בעברית, בצורה ${s.aiPersonality||"ידידותית ותמציתית"} (עד 3-4 משפטים).`;
  p += `\n\nנושאים אסורים לחלוטין (סרב בנימוס): קודי גישה, API keys, פרטי משתמשים, עקיפת הרשאות, מידע טכני פנימי, מספרי טלפון.`;
  if (s.aiLocked) p += `\n\nענה רק על שאלות הקשורות ישירות ל-BOTA. על כל נושא אחר — "אני כאן רק לשאלות על BOTA 😊"`;
  if (s.aiRestrictions) p += `\n\nהגבלות נוספות: ${s.aiRestrictions}`;
  if (s.aiSuffix) p += `\n\nבסוף כל תשובה הוסף: "${s.aiSuffix}"`;
  return p;
};

/* ── מפתח Groq ציבורי ──
   מגיע מ-Secret ב-GitHub Actions (VITE_GROQ_KEY) בזמן הבנייה, לא כתוב בקוד המקור.
   הצ'אט צריך לעבוד לכל מבקר, לא רק במכשיר של המנהל.
   Groq בחינם אז אין סיכון כספי — הכי גרוע שיקרה זה שהמפתח ייחסם/יוגבל. */
export const PUBLIC_GROQ_KEY = import.meta.env.VITE_GROQ_KEY || "";

export const defSettings = { whatsappLink:"", siteLocked:false, aiProvider:"groq", aiKey:"", groqKey:PUBLIC_GROQ_KEY, aiPersonality:"ידידותית ותמציתית", aiRestrictions:"", aiSuffix:"", aiLocked:false, chatEnabled:true, ghOwner:"davidggjg", ghRepo:"bota-app", ghBranch:"main", ghToken:"" };

/* ── טוקן ציבורי מוגבל, לשליחת בקשות/העלאות בלבד ──
   מגיע מ-Secret ב-GitHub Actions (VITE_ISSUES_TOKEN) בזמן הבנייה.
   זה טוקן נפרד לגמרי מהטוקן הפרטי של המנהל (ghToken למעלה).
   חובה ליצור אותו כ-Fine-grained PAT עם הרשאת "Issues: Read & write" בלבד
   (בלי Contents!) על הריפו הזה בלבד. כי הוא נשלח לכל מבקר באתר, מותר לו
   רק לפתוח Issues — לא לגעת בקוד או בתוכן. */
export const PUBLIC_ISSUES_TOKEN = import.meta.env.VITE_ISSUES_TOKEN || "";
export const defDraft = { title:"", description:"", imageUrl:"", imageB64:"", gatedContent:"", fileUrl:"", fileName:"", fileSize:0, allowedPhones:[] };

/* ── GitHub shared database ── */
export const GH_DATA_PATH = "data/items.json";
export const b64EncodeUnicode = str => btoa(unescape(encodeURIComponent(str)));

// Reads the shared items file straight from GitHub (public, no token needed).
// Returns: array of items, [] if the file doesn't exist yet, or null if owner/repo aren't set / request failed.
export async function ghFetchItems(s) {
  if (!s?.ghOwner || !s?.ghRepo) return null;
  const branch = s.ghBranch || "main";
  const url = `https://raw.githubusercontent.com/${s.ghOwner}/${s.ghRepo}/${branch}/${GH_DATA_PATH}?t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 404) return [];
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Writes the shared items file back to the repo using the admin's token (kept only in this browser).
export async function ghSaveItems(s, items) {
  if (!s?.ghOwner || !s?.ghRepo || !s?.ghToken) throw new Error("חסרים פרטי GitHub בהגדרות");
  const branch = s.ghBranch || "main";
  const apiUrl = `https://api.github.com/repos/${s.ghOwner}/${s.ghRepo}/contents/${GH_DATA_PATH}`;
  const headers = { Authorization: `token ${s.ghToken}`, Accept: "application/vnd.github+json" };

  let sha;
  try {
    const getRes = await fetch(`${apiUrl}?ref=${branch}`, { headers });
    if (getRes.ok) sha = (await getRes.json()).sha;
  } catch { /* file may not exist yet — that's fine */ }

  const content = b64EncodeUnicode(JSON.stringify(items, null, 2));
  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `עדכון נתונים · ${new Date().toLocaleString("he-IL")}`,
      content, branch, ...(sha ? { sha } : {}),
    }),
  });
  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || `שגיאת GitHub (${putRes.status})`);
  }
  return true;
}

/* ── מסד ההגדרות המשותף ──
   רק שדות "בטוחים לחשיפה" נכתבים כאן (לא aiKey הפרטי ולא ghToken הפרטי) —
   כי הקובץ הזה ציבורי וכל מבקר יכול לקרוא אותו. */
export const GH_SETTINGS_PATH = "data/settings.json";
const PUBLIC_SETTINGS_FIELDS = ["whatsappLink","siteLocked","aiProvider","groqKey","aiPersonality","aiRestrictions","aiSuffix","aiLocked","chatEnabled","ghOwner","ghRepo","ghBranch"];

export async function ghFetchSettings(s) {
  if (!s?.ghOwner || !s?.ghRepo) return null;
  const branch = s.ghBranch || "main";
  const url = `https://raw.githubusercontent.com/${s.ghOwner}/${s.ghRepo}/${branch}/${GH_SETTINGS_PATH}?t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function ghSaveSettings(s) {
  if (!s?.ghOwner || !s?.ghRepo || !s?.ghToken) throw new Error("חסרים פרטי GitHub בהגדרות");
  const branch = s.ghBranch || "main";
  const apiUrl = `https://api.github.com/repos/${s.ghOwner}/${s.ghRepo}/contents/${GH_SETTINGS_PATH}`;
  const headers = { Authorization: `token ${s.ghToken}`, Accept: "application/vnd.github+json" };

  let sha;
  try {
    const getRes = await fetch(`${apiUrl}?ref=${branch}`, { headers });
    if (getRes.ok) sha = (await getRes.json()).sha;
  } catch { /* file may not exist yet */ }

  const publicOnly = Object.fromEntries(PUBLIC_SETTINGS_FIELDS.map(k => [k, s[k]]));
  const content = b64EncodeUnicode(JSON.stringify(publicOnly, null, 2));
  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `עדכון הגדרות · ${new Date().toLocaleString("he-IL")}`,
      content, branch, ...(sha ? { sha } : {}),
    }),
  });
  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || `שגיאת GitHub (${putRes.status})`);
  }
  return true;
}

// Lets anonymous visitors create a GitHub Issue (request access / offer to upload)
// using the narrow, Issues-only PUBLIC_ISSUES_TOKEN — never the admin's private ghToken.
// Best-effort: if it fails (no token set yet, rate limit, etc.) we just skip silently,
// since the submission is already saved locally as a fallback.
export async function ghSubmitIssue(s, title, bodyLines, labels = ["submission"]) {
  if (!s?.ghOwner || !s?.ghRepo || !PUBLIC_ISSUES_TOKEN) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${s.ghOwner}/${s.ghRepo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PUBLIC_ISSUES_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body: bodyLines.join("\n"), labels }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/* ── CSS (shared visual language for both sites) ── */
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#07090f;--bg2:#0d1017;--bg3:#111520;
  --p1:#7c3aed;--p2:#4f46e5;--p3:#2563eb;--cyan:#06b6d4;
  --green:#22c55e;--red:#ef4444;--orange:#f97316;
  --text:#f1f5f9;--dim:rgba(241,245,249,.45);--dim2:rgba(241,245,249,.18);
  --border:rgba(255,255,255,.07);--border2:rgba(255,255,255,.13);
  --glass:rgba(255,255,255,.038);--glass2:rgba(255,255,255,.065);
}
html,body{height:100%;}
.root{min-height:100vh;background:var(--bg);color:var(--text);font-family:'Heebo',sans-serif;direction:rtl;overflow-x:hidden;position:relative;}
.root::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(ellipse 70% 50% at 20% -5%,rgba(124,58,237,.22),transparent 55%),
             radial-gradient(ellipse 50% 40% at 85% 90%,rgba(6,182,212,.12),transparent 55%),
             radial-gradient(ellipse 40% 30% at 50% 50%,rgba(79,70,229,.06),transparent 60%);}
.root::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:1;opacity:.025;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
.z{position:relative;z-index:2;}
.panel{background:var(--glass);border:1px solid var(--border);border-radius:16px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);position:relative;overflow:hidden;}
.panel::before{content:'';position:absolute;inset:0;border-radius:16px;padding:1px;
  background:linear-gradient(135deg,rgba(124,58,237,.4) 0%,transparent 40%,transparent 60%,rgba(6,182,212,.2) 100%);
  -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;}
.panel-hi{background:var(--glass2);border-color:var(--border2);}
.grad{background:linear-gradient(90deg,#a78bfa,#818cf8,var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent;}
.bp{background:linear-gradient(135deg,var(--p1),var(--p3));color:#fff;font-weight:700;border-radius:10px;border:none;cursor:pointer;transition:transform .18s,box-shadow .18s,filter .18s;box-shadow:0 6px 20px -6px rgba(124,58,237,.6);font-family:'Heebo',sans-serif;}
.bp:hover{filter:brightness(1.12);transform:translateY(-1px);box-shadow:0 10px 28px -6px rgba(124,58,237,.7);}
.bp:active{transform:translateY(0);}
.bg{background:var(--glass);border:1px solid var(--border);color:var(--dim);border-radius:10px;cursor:pointer;transition:background .18s,border-color .18s,color .18s;font-family:'Heebo',sans-serif;}
.bg:hover{background:var(--glass2);border-color:var(--border2);color:var(--text);}
.bgreen{background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;font-weight:700;border-radius:10px;border:none;cursor:pointer;transition:transform .18s,filter .18s;box-shadow:0 6px 20px -6px rgba(34,197,94,.5);font-family:'Heebo',sans-serif;}
.bgreen:hover{filter:brightness(1.1);transform:translateY(-1px);}
.bred{background:linear-gradient(135deg,#b91c1c,var(--red));color:#fff;font-weight:700;border-radius:10px;border:none;cursor:pointer;font-family:'Heebo',sans-serif;}
.inp{width:100%;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;padding:.65rem 1rem;color:var(--text);outline:none;transition:border-color .2s,box-shadow .2s;font-family:'Heebo',sans-serif;font-size:.9rem;}
.inp:focus{border-color:rgba(124,58,237,.6);box-shadow:0 0 0 3px rgba(124,58,237,.14);}
.inp::placeholder{color:var(--dim2);}
textarea.inp{resize:vertical;min-height:80px;}
.chip{display:inline-flex;align-items:center;gap:.35rem;background:var(--glass2);border:1px solid var(--border);border-radius:999px;padding:.25rem .65rem;font-size:.72rem;color:var(--dim);}
.dg{height:1px;background:linear-gradient(90deg,transparent,rgba(124,58,237,.4) 50%,transparent);}
.badge{position:absolute;top:-6px;right:-6px;background:var(--red);color:#fff;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
.upload-zone{border:2px dashed var(--border);border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;}
.upload-zone:hover{border-color:rgba(124,58,237,.5);background:rgba(124,58,237,.05);}

/* BUBBLES */
.bubble{position:fixed;border-radius:50%;pointer-events:none;z-index:0;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.09),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.1);box-shadow:inset 0 1px 0 rgba(255,255,255,.15),0 8px 40px rgba(124,58,237,.08);}
.bubble::after{content:'';position:absolute;top:12%;left:15%;width:30%;height:20%;border-radius:50%;background:rgba(255,255,255,.12);filter:blur(4px);}
@keyframes fb1{0%{transform:translate(0,0) scale(1);}25%{transform:translate(18px,-28px) scale(1.03);}50%{transform:translate(-10px,-50px) scale(.97);}75%{transform:translate(-24px,-22px) scale(1.02);}100%{transform:translate(0,0) scale(1);}}
@keyframes fb2{0%{transform:translate(0,0) scale(1);}33%{transform:translate(-22px,30px) scale(1.04);}66%{transform:translate(14px,50px) scale(.96);}100%{transform:translate(0,0) scale(1);}}
@keyframes fb3{0%{transform:translate(0,0);}40%{transform:translate(30px,-20px);}80%{transform:translate(-15px,35px);}100%{transform:translate(0,0);}}
.b1{animation:fb1 14s ease-in-out infinite;}
.b2{animation:fb2 19s ease-in-out infinite;}
.b3{animation:fb3 24s ease-in-out infinite;}

/* ANIMS */
@keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes pulse-ring{0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,.5);}50%{box-shadow:0 0 0 10px rgba(124,58,237,0);}}
@keyframes lock-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5);}50%{box-shadow:0 0 0 20px rgba(239,68,68,0);}}
@keyframes bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}
.fu{animation:fadeUp .5s ease both;}
.fi{animation:fadeIn .35s ease both;}
.d1{animation-delay:.07s;}.d2{animation-delay:.14s;}.d3{animation-delay:.22s;}
.pulse{animation:pulse-ring 2.5s ease infinite;}

/* CHAT */
.cbu{background:linear-gradient(135deg,var(--p1),var(--p3));color:#fff;border-radius:18px 18px 4px 18px;padding:.65rem 1rem;max-width:80%;align-self:flex-end;font-size:.87rem;line-height:1.5;}
.cba{background:var(--glass2);border:1px solid var(--border);color:var(--text);border-radius:18px 18px 18px 4px;padding:.65rem 1rem;max-width:85%;align-self:flex-start;font-size:.87rem;line-height:1.5;}
.td{width:7px;height:7px;border-radius:50%;background:var(--dim);animation:bounce .9s ease infinite;}
.td:nth-child(2){animation-delay:.2s;}.td:nth-child(3){animation-delay:.4s;}

/* TOGGLE */
.tog{width:50px;height:26px;border-radius:13px;cursor:pointer;position:relative;transition:background .3s;border:1px solid var(--border);flex-shrink:0;}
.tog-k{position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:all .3s;box-shadow:0 1px 4px rgba(0,0,0,.3);}

/* MODAL */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);}
.modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;position:relative;z-index:501;}

::-webkit-scrollbar{width:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(124,58,237,.3);border-radius:10px;}
.item-card{transition:transform .25s,box-shadow .25s;}
.item-card:hover{transform:translateY(-3px);box-shadow:0 20px 50px -15px rgba(124,58,237,.35);}
@media(max-width:640px){.hide-sm{display:none!important;}.g2{grid-template-columns:1fr!important;}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;}}
`;
