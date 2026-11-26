/* ============================================================
   نظام المراسلات وأرشفة الخطابات — السكرتارية
   ============================================================ */
const STORE_KEY = 'sirr_secretariat_v2';
const APP_VER = '1.8.0';

/* ============================================================
   وضع التشغيل: خادم مشترك (API) أو ملف محلي (localStorage)
   ============================================================ */
let API_ON = false;            // true = archive partagée via le serveur
let API_NEEDS_LOGIN = false;   // le serveur exige un mot de passe
let API_STORAGE = 'local';     // 'postgres' | 'sqlite' | 'local'
let API_CLOUD = false;         // true = hébergé sur Render / Cloud
let DB_REV = 0;                // révision serveur (détection de changements)
let SYNC_TIMER = null;
let SYNC_PENDING = false;

async function apiFetch(method, path, body){
  const opt = { method, headers:{'Content-Type':'application/json'}, credentials:'same-origin', cache:'no-store' };
  if(body !== undefined) opt.body = JSON.stringify(body);
  const r = await fetch(path, opt);
  if(r.status === 401){
    const j = await r.json().catch(()=>({}));
    if(j.needsLogin) API_NEEDS_LOGIN = true;
    return { __status:401, ...j };
  }
  if(r.status === 429){
    const j = await r.json().catch(()=>({}));
    return { __status:429, ok:false, ...j };
  }
  if(!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
function serverModeLabel(){
  return API_ON ? (API_NEEDS_LOGIN ? 'مشترك • محمي بكلمة مرور' : 'مشترك على الشبكة') : 'محلي (هذا المتصفح)';
}

const DEFAULT_COMPANIES = [
  {
    id:'ais', active:true, layout:'ais',
    name:'شركة الصداقة المثالية لصناعة المشروبات والمواد الغذائية',
    short:'الصداقة المثالية', code:'AIS', nameEn:'Al-Sadaqa Al-Mithalia',
    address:'خلف مسجد أبو بكر الصديق، شارع اليبيبا، طرابلس – ليبيا',
    phone:'094 400 4002 – 091 000 1833', web:'www.ais.ly', email:'info@ais.ly',
    signTitle:'رئيس مجلس الإدارة', signName:'',
    refLabel:'الرقم', headerImg:'', footerImg:'', watermarkImg:'',
  },
  {
    id:'aisbm', active:true, layout:'aisbm',
    name:'شركة الصداقة المثالية لاستيراد مواد البناء والمواد الصحية',
    short:'الصداقة المثالية — مواد البناء', code:'AIS-BM', nameEn:'AIS Building Materials',
    address:'طرابلس – ليبيا', phone:'+218 91 315 0095',
    web:'www.assadaka.ly', email:'info@assadaka.ly',
    signTitle:'المدير العام', signName:'',
    refLabel:'الرقم الاشاري', headerImg:'', footerImg:'', watermarkImg:'', useWatermark:true,
  },
];

const DEFAULT_DB = {
  version:3,
  settings:{ city:'طرابلس', dateStyle:'long', showStamp:true, showWatermark:true, activeCompany:'ais', customTemplates:[], templateTextReplacements:[], templateContentOverrides:[] },
  companies: DEFAULT_COMPANIES,
  employees:[],
  letters:[],
  credits:[],
  groupDocs:[],
  trackers:[],
  counter:{},
};

/* ---------------- التخزين ---------------- */
let storageOK = true;
let DB = loadDB();
function loadDB(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw){
      const init = structuredClone(DEFAULT_DB);
      ensureStationeriesOn(init);
      if(typeof crEnsure === 'function') crEnsure(init);
      ensureGroupDefaultsOn(init);
      return init;
    }
    const db = JSON.parse(raw);
    db.settings = Object.assign({}, DEFAULT_DB.settings, db.settings||{});
    db.companies = (db.companies && db.companies.length) ? db.companies : structuredClone(DEFAULT_COMPANIES);
    /* ترحيل: استبدال الشركة الثانية المؤقتة بالبيانات الحقيقية */
    if((db.version||1) < 3){
      const placeholder = db.companies.find(c=>c.id==='co2');
      if(placeholder){
        const real = structuredClone(DEFAULT_COMPANIES[1]);
        Object.assign(placeholder, real, {
          headerImg: placeholder.headerImg||'', footerImg: placeholder.footerImg||'',
        });
        placeholder.id = 'aisbm';
        db.letters.forEach ? db.letters.forEach(l=>{ if(l.companyId==='co2'){ l.companyId='aisbm'; l.companyShort=real.short; } }) : null;
        db.employees.forEach ? db.employees.forEach(e=>{ if(e.companyId==='co2') e.companyId='aisbm'; }) : null;
        if(db.settings.activeCompany==='co2') db.settings.activeCompany='aisbm';
      }
      db.settings.showWatermark = true;
      db.version = 3;
    }
    db.companies.forEach(c=>{ if(c.layout===undefined) c.layout = c.id==='ais' ? 'ais':'aisbm'; });
    db.employees = db.employees||[]; db.letters = db.letters||[];
    db.credits = db.credits||[]; db.groupDocs = db.groupDocs||[]; db.trackers = db.trackers||[]; db.counter = db.counter||{};
    ensureStationeriesOn(db);
    if(typeof crEnsure === 'function') crEnsure(db);
    ensureGroupDefaultsOn(db);
    return db;
  }catch(e){
    console.warn('التخزين غير متاح (وضع المعاينة)', e);
    storageOK = false;
    const fb = structuredClone(DEFAULT_DB);
    ensureStationeriesOn(fb);
    if(typeof crEnsure === 'function') crEnsure(fb);
    ensureGroupDefaultsOn(fb);
    return fb;
  }
}

/* نماذج خطابات يضيفها المستخدم + قواعد لتعديل العبارات الثابتة دون تعديل البرنامج */
function customFieldLines(fields){
  return (fields||[]).filter(f=>f.k!=='date').map(f=>`${f.label||''}${f.type==='employee'?' [موظف]':''}${f.req?' *':''}`).join('\n');
}
function parseCustomFieldLines(raw){
  return String(raw||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map((source,i)=>{
    const req = /\*\s*$/.test(source);
    let line=source.replace(/\*\s*$/,'').trim();
    const isEmployee=/\s*\[موظف\]\s*$/i.test(line);
    if(isEmployee) line=line.replace(/\s*\[موظف\]\s*$/i,'').trim();
    return {k:'f'+(i+1), label:line, type:isEmployee?'employee':'text', req};
  });
}
function customInterpolate(text, values, ctx, fields=[]){
  return String(text||'').replace(/\{\{\s*([\w-]+)\s*\}\}/g, (all,key)=>{
    if(key==='company') return ctx.company?.name || '';
    if(key==='companyShort') return ctx.company?.short || '';
    if(key==='date') return fdate(values.date || todayISO(), DB.settings.dateStyle);
    const employeeToken=key.match(/^(f\d+)_(name|position|department|nationalId|hireDate|phone)$/);
    const fieldKey=employeeToken ? employeeToken[1] : key;
    const field=fields.find(f=>f.k===fieldKey && f.type==='employee');
    if(field){
      const emp=DB.employees.find(e=>e.id===values[fieldKey]);
      if(!emp) return '................';
      const attribute=employeeToken ? employeeToken[2] : 'name';
      return emp[attribute] || '................';
    }
    const value=values[key];
    return value===undefined || value===null || value==='' ? '................' : String(value);
  });
}
function runtimeCustomTemplate(data){
  const fields = Array.isArray(data.fields) ? data.fields.map(f=>({...f})) : [];
  if(!fields.some(f=>f.k==='date')) fields.push({k:'date', type:'date', label:'تاريخ الخطاب'});
  return {
    id:data.id, cat:CATS.some(c=>c.id===data.cat)?data.cat:'ext', icon:data.icon||'✉️',
    code:data.code||'CUS', name:data.name||'نموذج مخصص', desc:data.desc||'نموذج خطاب مخصص',
    fields, personKey:data.personKey||'', isCustom:true, active:data.active!==false,
    subject:(v,ctx)=>customInterpolate(data.subjectText||data.name,v,ctx,fields),
    to:(v,ctx)=>data.toText ? `<div class="l-to">${esc(customInterpolate(data.toText,v,ctx,fields))}</div>` : '',
    body:(v,ctx)=>String(data.bodyText||'').split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${esc(customInterpolate(p,v,ctx,fields)).replace(/\n/g,'<br>')}</p>`).join(''),
    closing:(v,ctx)=>customInterpolate(data.closingText||'وتفضلوا بقبول فائق الاحترام والتقدير',v,ctx,fields),
  };
}
function refreshTemplateRegistry(){
  if(!DB || !DB.settings) return;
  if(!Array.isArray(DB.settings.customTemplates)) DB.settings.customTemplates=[];
  if(!Array.isArray(DB.settings.templateTextReplacements)) DB.settings.templateTextReplacements=[];
  if(!Array.isArray(DB.settings.templateContentOverrides)) DB.settings.templateContentOverrides=[];
  const builtinIds = new Set(TEMPLATES.map(t=>t.id));
  Object.keys(TPL_BY_ID).forEach(id=>{ if(!builtinIds.has(id)) delete TPL_BY_ID[id]; });
  DB.settings.customTemplates.forEach(item=>{
    if(item && item.id && !builtinIds.has(item.id)) TPL_BY_ID[item.id]=runtimeCustomTemplate(item);
  });
}
function allTemplates(includeInactive=true){
  const custom=(DB.settings.customTemplates||[]).filter(t=>includeInactive || t.active!==false).map(t=>TPL_BY_ID[t.id]||runtimeCustomTemplate(t));
  return [...TEMPLATES,...custom];
}
function applyFixedTextRules(value, templateId, isHTML=false){
  let out=String(value??'');
  for(const rule of (DB.settings.templateTextReplacements||[])){
    if(!rule.from || (rule.templateId!=='*' && rule.templateId!==templateId)) continue;
    const from=isHTML?esc(rule.from):rule.from;
    const to=isHTML?esc(rule.to||''):String(rule.to||'');
    out=out.split(from).join(to);
  }
  return out;
}
function templateContentOverride(templateId){
  return (DB.settings.templateContentOverrides||[]).find(x=>x.templateId===templateId) || null;
}
function editableTemplateBody(text, tpl, values, ctx){
  return String(text||'').split(/\n\s*\n/).filter(Boolean)
    .map(p=>`<p>${esc(customInterpolate(p,values,ctx,tpl.fields||[])).replace(/\n/g,'<br>')}</p>`).join('');
}

refreshTemplateRegistry();
let saveTimer=null;
let storageWarned = false;
function saveDB(now){
  if(API_ON) return;              // الوضع المشترك: تُحفظ كل وثيقة عبر الـ API
  clearTimeout(saveTimer);
  if(!storageOK){
    if(!storageWarned){ storageWarned = true; toast('وضع المعاينة: لن تُحفظ البيانات بعد إغلاق الصفحة','err'); }
    return;
  }
  const run = ()=>{ try{ localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }catch(e){ toast('تعذّر الحفظ: مساحة التخزين ممتلئة','err'); } };
  now ? run() : saveTimer=setTimeout(run,150);
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

/* حفظ/حذف وثيقة واحدة (خادم أو محلي) */
async function persistDoc(kind, obj){
  if(!API_ON){ saveDB(true); return obj; }
  try{
    const res = await apiFetch('POST','api/doc',{kind, data:obj});
    if(res && res.__status === 401){ onAuthLost(); return obj; }
    if(res && res.data){ if(!obj.id) obj.id = res.data.id; DB_REV = res.rev; SYNC_PENDING = false; }
    return obj;
  }catch(e){ toast('تعذّر الحفظ على الخادم — تحقّق من الشبكة','err'); throw e; }
}
async function persistDelete(kind, id){
  if(!API_ON){ saveDB(true); return; }
  try{
    const res = await apiFetch('POST','api/doc/delete',{kind, id});
    if(res && res.__status === 401){ onAuthLost(); return; }
    if(res && res.rev){ DB_REV = res.rev; SYNC_PENDING = false; }
  }catch(e){ toast('تعذّر الحذف على الخادم','err'); }
}
async function persistSettings(patch){
  Object.assign(DB.settings, patch);
  if('customTemplates' in patch || 'templateTextReplacements' in patch || 'templateContentOverrides' in patch) refreshTemplateRegistry();
  if(!API_ON){ saveDB(true); return; }
  try{
    const res = await apiFetch('POST','api/settings',{patch});
    if(res && res.__status === 401){ onAuthLost(); return; }
    if(res && res.settings) DB.settings = Object.assign(DB.settings, res.settings);
    if(res && res.rev){ DB_REV = res.rev; SYNC_PENDING = false; }
  }catch(e){ toast('تعذّر حفظ الإعدادات على الخادم','err'); }
}
function onAuthLost(){
  API_NEEDS_LOGIN = true;
  showLoginOverlay('انتهت الجلسة — يُرجى إعادة إدخال كلمة المرور');
}

/* ---------------- أدوات ---------------- */
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const todayISO = () => new Date().toISOString().slice(0,10);
function toast(msg, kind='ok'){
  const t = $('#toast'); t.textContent = msg; t.className = 'show ' + (kind==='err'?'err':'');
  clearTimeout(t._h); t._h = setTimeout(()=>{ t.className=''; }, 2800);
}
const companyById = id => DB.companies.find(c=>c.id===id) || DB.companies[0];
const activeCompany = () => companyById(DB.settings.activeCompany);
/* ============================================================
   نماذج الترويسة (Papeterie) — يمكن أن يكون للشركة أكثر من نموذج
   ============================================================ */
function defaultAssetsFor(layout){
  const isBM = layout === 'aisbm';
  return {
    header: isBM ? ASSETS.bmHeader : ASSETS.header,
    footer: isBM ? ASSETS.bmFooter : ASSETS.footer,
    watermark: isBM ? ASSETS.bmWatermark : '',
  };
}
function legacyStationery(co){
  return {
    id: 'std-' + co.id, name: 'الترويسة الأساسية', mode: 'sections',
    layout: co.layout || 'ais',
    headerImg: co.headerImg || '', footerImg: co.footerImg || '',
    watermarkImg: co.watermarkImg || '',
    useWatermark: co.useWatermark !== false,
    padTop: 45, padBottom: 45,
  };
}
/* يضمن وجود قائمة نماذج لكل شركة (ترحيل تلقائي للبيانات القديمة) */
function ensureStationeriesOn(db){
  let changed = false;
  (db.companies || []).forEach(co=>{
    if(!Array.isArray(co.stationeries) || !co.stationeries.length){
      co.stationeries = [legacyStationery(co)];
      co.activeStationeryId = co.stationeries[0].id;
      changed = true;
    }
    co.stationeries.forEach(st=>{
      if(!st.mode) st.mode = 'sections';
      if(!st.layout) st.layout = co.layout || 'ais';
      if(st.padTop === undefined) st.padTop = 45;
      if(st.padBottom === undefined) st.padBottom = 45;
      if(st.useWatermark === undefined) st.useWatermark = true;
    });
    if(!co.activeStationeryId || !co.stationeries.some(s2=>s2.id===co.activeStationeryId)){
      co.activeStationeryId = co.stationeries[0].id; changed = true;
    }
  });
  return changed;
}
function ensureStationeries(){ return ensureStationeriesOn(DB); }
function stationeriesOf(co){ ensureStationeries(); return co.stationeries; }
function activeStationery(co){
  const list = stationeriesOf(co);
  return list.find(x=>x.id === co.activeStationeryId) || list[0];
}
function stationeryAssets(co, std){
  std = std || activeStationery(co);
  const d = defaultAssetsFor(std.layout || co.layout);
  return {
    header: std.headerImg || d.header,
    footer: std.footerImg || d.footer,
    watermark: std.watermarkImg || d.watermark,
    custom: { header: !!std.headerImg, footer: !!std.footerImg, watermark: !!std.watermarkImg },
    fullpage: std.mode === 'fullpage' ? (std.headerImg || '') : '',
  };
}
function companyAssets(co){ return stationeryAssets(co); }
function employeesOf(coId){ return DB.employees.filter(e=>!e.companyId || e.companyId===coId); }

/* ترقيم تلقائي — الصيغة قابلة للتعديل من الإعدادات */
const REF_PATTERN_DEFAULT = '{c}/{t}/{y}/{n:04d}';
const REF_PRESETS = [
  { p:'{c}/{t}/{y}/{n:04d}', label:'AIS/SHA/2026/0001 (الافتراضي)' },
  { p:'{c}-{t}-{y}-{n:03d}', label:'AIS-SHA-2026-001' },
  { p:'{c}/{y}/{n:04d}',     label:'AIS/2026/0001' },
  { p:'{y}/{n:04d}',         label:'2026/0001' },
  { p:'{c}/{t}/{mm}-{y}/{n:03d}', label:'AIS/SHA/10-2026/001 (شهري)' },
  { p:'{n:04d}/{y}',         label:'0001/2026' },
];
function refPattern(){ return (DB.settings.refPattern || REF_PATTERN_DEFAULT).trim() || REF_PATTERN_DEFAULT; }
function formatRef(pattern, ctx){
  return String(pattern || REF_PATTERN_DEFAULT)
    .replace(/\{c\}/g, ctx.c ?? '')
    .replace(/\{t\}/g, ctx.t ?? '')
    .replace(/\{y\}/g, String(ctx.y ?? new Date().getFullYear()))
    .replace(/\{yy\}/g, String(ctx.y ?? new Date().getFullYear()).slice(-2))
    .replace(/\{mm\}/g, String(ctx.m ?? 1).padStart(2,'0'))
    .replace(/\{n(?::0?(\d+)d)?\}/g, (m, w)=>{ const n = String(ctx.n ?? 1); return w ? n.padStart(parseInt(w,10),'0') : n; });
}
function nextSerial(tplCode){
  const year = new Date().getFullYear();
  const key = `${DB.settings.activeCompany}|${tplCode}|${year}`;
  const n = (DB.counter[key]||0) + 1;
  return { key, n, year };
}
function refFor(tplCode, n){
  const now = new Date();
  return formatRef(refPattern(), { c:activeCompany().code, t:tplCode, y:now.getFullYear(), m:now.getMonth()+1, n });
}
function buildRef(tplCode){
  const {n} = nextSerial(tplCode);
  return refFor(tplCode, n);
}
function peekRef(tplCode){ return composerState.serverRef || buildRef(tplCode); }

/* consume un numéro côté serveur (atomique, multi-postes) */
async function commitRef(tplCode){
  const code = activeCompany().code;
  if(API_ON){
    try{
      const res = await apiFetch('POST','api/counter',{
        name:`${code}|${tplCode}|${new Date().getFullYear()}`,
        pattern: refPattern()
      });
      if(res && res.ref){ DB_REV = res.rev; SYNC_PENDING = false; return res.ref; }
    }catch(e){ /* repli local */ }
  }
  const {key,n} = nextSerial(tplCode); DB.counter[key]=n;
  return refFor(tplCode, n);
}

/* lit le prochain numéro (sans le consommer) pour l'aperçu */
async function refreshPreviewRef(){
  if(!API_ON) return;
  const tpl = TPL_BY_ID[composerState.tplId];
  if(!tpl || composerState.editingId) return;
  try{
    const res = await apiFetch('GET', `api/next-ref?company=${encodeURIComponent(activeCompany().code)}&tpl=${encodeURIComponent(tpl.code)}&pattern=${encodeURIComponent(refPattern())}`);
    if(res && res.ref && composerState.tplId === tpl.id && !composerState.editingId){
      composerState.serverRef = res.ref;
      updatePreview();
      const hint = $('#refHint'); if(hint) hint.innerHTML = `سيُسجَّل الرقم المرجعي تلقائياً: <b>${esc(res.ref)}</b>`;
    }
  }catch(e){}
}

/* ---------------- بناء ورقة الخطاب ---------------- */
function renderSheetHTML(tpl, v, opts={}){
  const co = opts.company || activeCompany();
  const st = DB.settings;
  const ref = opts.ref || '';
  const english = tpl.language==='en';
  const isoDate=toISO(v.date||todayISO());
  const dateStr = english ? toLatinDigits(isoDate.split('-').reverse().join('/')) : fdate(isoDate, st.dateStyle);
  const std = opts.stationery || activeStationery(co);
  const a = stationeryAssets(co, std);
  const lay = std.layout || co.layout || 'ais';
  const cityTxt = st.city ? `${st.city}، في ` : 'في ';
  const isBM = lay === 'aisbm';
  const refLabel = co.refLabel || 'الرقم';
  const fullpage = !!a.fullpage;

  const metaHTML = english
    ? `<div class="l-meta l-meta-en" dir="ltr" style="display:block;width:100%;text-align:right;direction:ltr"><div><b>Date:</b> ${esc(dateStr)}</div><div class="ref"><b>Ref:</b> ${esc(toLatinDigits(ref || '..............................'))}</div></div>`
    : isBM
      ? `<div class="l-meta l-meta-bm">
           <div class="row"><span class="k">التاريخ :</span><span class="v">${dateStr}</span></div>
           <div class="row"><span class="k">${esc(refLabel)} :</span><span class="v ref">${esc(ref || '..............................')}</span></div>
         </div>`
      : `<div class="l-meta">
           <div>${esc(cityTxt)}${dateStr}</div>
           ${ref? `<div class="ref">الرقم: ${esc(ref)}</div>`:''}
         </div>`;

  const contentOverride=templateContentOverride(tpl.id);
  const headSource=contentOverride?.headText
    ? `<div class="l-to">${esc(customInterpolate(contentOverride.headText,v,{company:co},tpl.fields||[])).replace(/\n/g,'<br>')}</div>`
    : (tpl.head ? tpl.head(v,{company:co}) : '');
  const headHTML = applyFixedTextRules(headSource, tpl.id, true);
  const toSource=(!tpl.noTo && contentOverride?.toText)
    ? `<div class="l-to">${esc(customInterpolate(contentOverride.toText,v,{company:co},tpl.fields||[])).replace(/\n/g,'<br>')}</div>`
    : ((!tpl.noTo && tpl.to) ? tpl.to(v,{company:co}) : '');
  const subjSource=contentOverride?.subjectText
    ? customInterpolate(contentOverride.subjectText,v,{company:co},tpl.fields||[])
    : (tpl.subject ? tpl.subject(v,{company:co}) : '');
  const bodySource=contentOverride?.bodyText
    ? editableTemplateBody(contentOverride.bodyText,tpl,v,{company:co})
    : (tpl.body ? tpl.body(v,{company:co}) : '');
  const closingSource=contentOverride?.closingText
    ? customInterpolate(contentOverride.closingText,v,{company:co},tpl.fields||[])
    : (tpl.closing ? tpl.closing(v,{company:co}) : 'وتفضلوا بقبول فائق الاحترام والتقدير');
  const toHTML=applyFixedTextRules(toSource,tpl.id,true);
  const subj=applyFixedTextRules(subjSource,tpl.id);
  const bodyHTML=applyFixedTextRules(bodySource,tpl.id,true);
  const closing=applyFixedTextRules(closingSource,tpl.id);
  const attach   = v.attach ? `<p class="mt8"><b>المرفقات:</b> ${esc(v.attach)}</p>` : '';

  const sign = tpl.customSign
    ? tpl.customSign(v, {company:co})
    : (tpl.id==='memo')
      ? `<div class="l-sign"><div class="blk"><div class="t">${esc(co.signTitle||'')}</div><div class="space"></div><div class="nm">${esc(co.signName||'الاسم / التوقيع')}</div></div></div>`
      : `<div class="l-sign"><div class="blk"><div class="t">${esc(co.signTitle||'الإدارة العامة')}</div><div class="space"></div><div class="nm">${esc(co.signName||'الاسم / التوقيع والختم')}</div></div>${st.showStamp?`<div class="stamp">الختم الرسمي</div>`:''}</div>`;

  const useDualGroup = !!(tpl.dualLogo || lay === 'group');
  const showWM = (std.useWatermark !== false) && st.showWatermark !== false && a.watermark && !fullpage;
  const wmHTML = showWM ? `<div class="watermark wm-img"><img src="${a.watermark}" alt=""></div>` : '';

  const inner = `
      <div class="sheet-inner">
        ${metaHTML}
        ${headHTML}
        ${toHTML}
        ${subj? `<div class="l-subject">${english?'Subject:':'الموضوع:'} ${esc(subj)}</div>`:''}
        <div class="l-body">${bodyHTML}</div>
        ${(tpl.id==='memo' || tpl.id==='handover_vehicle')? '' : `<p class="mt14">${esc(closing)}</p>`}
        ${attach}
        ${sign}
      </div>`;
  const printableInner=english?toLatinDigits(inner):inner;

  if(fullpage){
    const pt = Number(std.padTop ?? 45), pb = Number(std.padBottom ?? 45);
    return `
    <div class="sheet first-page sheet-fullpage" data-layout="${esc(lay)}">
      <img class="page-bg" src="${a.fullpage}" alt="">
      <div class="sheet-content" style="padding-top:${pt}mm;padding-bottom:${pb}mm">
        ${printableInner}
      </div>
    </div>`;
  }

  if(useDualGroup && !std.headerImg){
    return `
    <div class="sheet first-page" data-layout="group">
      ${renderSheetDualBannerHTML()}
      ${wmHTML}
      <div class="sheet-content">
        ${printableInner}
      </div>
      ${std.footerImg ? `<div class="lh-foot"><img src="${a.footer}" alt=""></div>` : renderSheetDualFooterHTML()}
    </div>`;
  }

  return `
  <div class="sheet first-page" data-layout="${esc(lay)}">
    <div class="lh-head"><img src="${a.header}" alt=""></div>
    ${wmHTML}
    <div class="sheet-content">
      ${printableInner}
    </div>
    <div class="lh-foot"><img src="${a.footer}" alt=""></div>
  </div>`;
}

/* ---------------- الطباعة / PDF ---------------- */
let lastPrintHTML = '';
function whenImagesReady(root){
  const imgs = [...root.querySelectorAll('img')];
  return Promise.all(imgs.map(img=>{
    if(img.complete && img.naturalWidth) return Promise.resolve();
    return new Promise(res=>{ img.onload = img.onerror = res; });
  }));
}
function printHTML(html){
  lastPrintHTML = html;
  const pa = $('#printArea');
  pa.innerHTML = html;
  pa.querySelectorAll('.sheet').forEach(adaptPadding);
  document.body.classList.add('printing');
  whenImagesReady(pa).then(()=>{
    pa.querySelectorAll('.sheet').forEach(adaptPadding);
    setTimeout(()=>window.print(), 80);
  });
}
window.addEventListener('afterprint', ()=>{
  document.body.classList.remove('printing');
  const pa = $('#printArea'); if(pa) pa.innerHTML='';
});

/* ---------------- التنقل ---------------- */
const ROUTES = {
  dash:{title:'لوحة التحكم', sub:'نظرة عامة على المراسلات والأرشيف ومتابعة المجموعة'},
  new:{title:'خطاب جديد', sub:'اختر النموذج، املأ البيانات، ثم أرشِف أو اطبع'},
  archive:{title:'الأرشيف', sub:'الخطابات الصادرة وملفات الموردين والوثائق الواردة'},
  credits:{title:'الاعتمادات البنكية', sub:'الاعتمادات المستندية لاستيراد البضائع بالسعر الرسمي لمصرف ليبيا المركزي — القرار موافقة أو رفض كاملاً، التغطية النقدية 100% بالدينار'},
  trackers:{title:'جداول المتابعة اليومية', sub:'متابعة السيارات، التراخيص، الإقامات، الشحنات والمراجعات اليومية بترويسات الشركات'},
  group:{title:'وثائق الشركات', sub:'أرشيف وثائق كل شركة على حدة: السجلات، العقود، التعميمات واللوائح — تُطبع بحسب شعار الشركة وترويستها'},
  employees:{title:'الموظفون', sub:'قائمة الموظفين لتعبئة الخطابات تلقائياً'},
  companies:{title:'الشركات', sub:'بيانات الشركات والترويسة والتوقيع'},
  settings:{title:'الإعدادات والنسخ الاحتياطي', sub:'التفضيلات، التصدير والاستيراد'},
};
let currentRoute = 'dash';
let creditOpenId = '';      // ملف الاعتماد المفتوح حالياً (إن وُجد)
let composerState = { tplId:null, values:{}, editingId:null, ref:null };

function freshComposer(tplId){
  composerState = { tplId: tplId || composerState.tplId || 'att_work', values:{date:todayISO()}, editingId:null, ref:null };
}
function go(route, params){
  const [name, arg] = String(route).split('/');
  currentRoute = name;
  if(name==='new'){
    if(arg && arg!==composerState.tplId) freshComposer(arg);
    else if(!composerState.tplId) freshComposer(arg||'att_work');
  }
  render(route, params);
  window.scrollTo({top:0,behavior:'instant'});
  if(API_ON && SYNC_PENDING && name !== 'new'){
    SYNC_PENDING = false; updateSyncBadge();
    reloadState(true);
  }
}

function renderCompanySwitch(){
  const sel = $('#coSwitch');
  if(!sel) return;
  sel.innerHTML = DB.companies.map(c=>`<option value="${c.id}" ${c.id===DB.settings.activeCompany?'selected':''}>${esc(c.short)} — ${esc(c.code)}</option>`).join('');
  sel.onchange = ()=>{
    DB.settings.activeCompany = sel.value; saveDB(true);
    freshComposer(composerState.tplId);
    render(currentRoute);
    toast('الشركة النشطة: ' + companyById(sel.value).short);
  };
}
function render(route){
  const name = String(route||currentRoute).split('/')[0];
  renderCompanySwitch();
  $$('.nav a').forEach(a=>a.classList.toggle('active', a.dataset.route===name));
  const meta = ROUTES[name] || ROUTES.dash;
  $('#pageTitle').textContent = meta.title;
  $('#pageSub').textContent = meta.sub;
  const box = $('#view');
  if(name==='dash') box.innerHTML = viewDash();
  else if(name==='new') box.innerHTML = viewComposer();
  else if(name==='archive') box.innerHTML = viewArchive();
  else if(name==='credits'){
    const cid = String(route||currentRoute).split('/')[1] || '';
    if(cid){ creditOpenId = cid; box.innerHTML = viewCredit(cid); }
    else { creditOpenId = ''; box.innerHTML = viewCredits(); }
  }
  else if(name==='trackers') box.innerHTML = viewTrackers();
  else if(name==='group') box.innerHTML = viewGroupDocs();
  else if(name==='employees') box.innerHTML = viewEmployees();
  else if(name==='companies') box.innerHTML = viewCompanies();
  else if(name==='settings') box.innerHTML = viewSettings();
  bindView(name);
}

/* ============================================================
   لوحة التحكم
   ============================================================ */
function viewDash(){
  const L = DB.letters;
  const y = new Date().getFullYear(), m = new Date().getMonth();
  const thisMonth = L.filter(l=>{ const d=new Date(l.createdAt); return d.getFullYear()===y && d.getMonth()===m; }).length;
  const archived = L.filter(l=>l.status==='archived').length;
  const company = activeCompany();
  const recent = [...L].sort((a,b)=>b.createdAt-a.createdAt).slice(0,7);
  const byTpl = {};
  L.forEach(l=> byTpl[l.tplName] = (byTpl[l.tplName]||0)+1);
  const topTpls = Object.entries(byTpl).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxTop = topTpls.length? topTpls[0][1] : 1;

  return `
  <div class="stats">
    <div class="stat"><div class="ico">📚</div><div><div class="v">${L.length}</div><div class="l">إجمالي الخطابات في الأرشيف</div></div></div>
    <div class="stat green"><div class="ico">✅</div><div><div class="v">${archived}</div><div class="l">خطابات مُعتمدة ومؤرشفة</div></div></div>
    <div class="stat gold" style="cursor:pointer" data-go="trackers"><div class="ico">📊</div><div><div class="v">${(DB.trackers||[]).length}</div><div class="l">جداول المتابعة النشطة</div></div></div>
    <div class="stat red" style="cursor:pointer" data-go="group"><div class="ico">🗂️</div><div><div class="v">${(DB.groupDocs||[]).length}</div><div class="l">وثائق المجموعة المشتركة</div></div></div>
  </div>

  ${renderDashGroupAlertsHTML()}

  ${(()=>{ crEnsure(DB); const all = DB.credits||[]; if(!all.length) return '';
    const cs = creditStats(all);
    const attention = all.filter(d=>creditHealth(d).level==='danger' && d.stage!=='close' && d.decision!=='rejected').slice(0,4);
    return `<div class="card" style="margin-bottom:16px">
      <div class="card-h"><h3>🏦 الاعتمادات المستندية لاستيراد البضائع</h3>
        <span class="badge blue">${cs.active} اعتماد جارٍ</span>
        ${cs.late? `<span class="badge red">${cs.late} يحتاج تدخلاً</span>`:''}
        <div class="spacer"></div>
        <button class="btn btn-sm btn-primary" data-go="credits">فتح منطقة الاعتمادات ←</button>
      </div>
      ${attention.length? `<div class="small muted mb10">اعتمادات تحتاج متابعة (مهلة جمركي / انتهاء صلاحية):</div>
      ${attention.map(d=>`<div class="flex" style="justify-content:space-between;border-bottom:1px dashed var(--line);padding:7px 0;flex-wrap:wrap">
        <span><b>${esc(d.supplierName||'المستفيد')}</b> <span class="small muted">${esc(d.goodsDesc||'')} · ${esc(d.currency||'USD')} ${fnum(d.amountFX)}</span></span>
        <span class="badge red">${esc(creditHealth(d).label)}</span>
        <button class="btn btn-sm" data-go="credits/${esc(d.id)}">متابعة ←</button>
      </div>`).join('')}`
      : `<div class="small muted">لا توجد اعتمادات متأخرة — ${cs.approved} مُوافق عليه، ${cs.pending} قيد الدراسة حتى الآن.</div>`}
    </div>`;
  })()}

  <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:16px" class="dash-grid">
    <div class="card pad0">
      <div class="card-h" style="padding:16px 18px 0;margin-bottom:10px">
        <h3>أحدث الخطابات</h3><div class="spacer"></div>
        <button class="btn btn-sm" data-go="archive">عرض الأرشيف كاملاً ←</button>
      </div>
      ${recent.length ? `
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>الرقم</th><th>النموذج</th><th>المعني</th><th>التاريخ</th><th></th></tr></thead>
          <tbody>
          ${recent.map(l=>`<tr>
            <td class="ref">${esc(l.ref)}</td>
            <td>${esc(l.tplName)}<div class="sub">${esc(l.tplCatName||'')}</div></td>
            <td>${esc(l.person||'—')}</td>
            <td class="small muted">${fdate(toISO(l.createdAt),'short')}</td>
            <td><div class="row-actions"><button class="btn btn-sm" data-open="${l.id}">عرض</button></div></td>
          </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `<div class="empty"><span class="big">📄</span>لا توجد خطابات بعد — ابدأ بإنشاء خطاب جديد</div>`}
    </div>

    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-h"><h3>خطاب جديد</h3></div>
        <div class="small muted mb10">اختر النموذج المناسب وابدأ مباشرة:</div>
        <div style="display:flex;flex-direction:column;gap:7px">
          ${['att_work','att_salary','mission','leave','letter'].map(id=>{
            const t = TPL_BY_ID[id]; if(!t) return '';
            return `<button class="btn" style="justify-content:flex-start" data-new="${t.id}"><span>${t.icon}</span> ${t.name}</button>`;
          }).join('')}
        </div>
        <div class="hr"></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" data-go="new">كل النماذج (${allTemplates(false).length}) ←</button>
      </div>

      <div class="card">
        <div class="card-h"><h3>الشركة النشطة</h3></div>
        <div class="pill-co mb10">${esc(company.short)} — ${esc(company.code)}</div>
        <div class="small muted" style="line-height:1.8">
          ${esc(company.address||'—')}<br>
          ${esc(company.phone||'')}<br>
          ${esc(company.email||'')} ${company.web? '· '+esc(company.web):''}
        </div>
        <button class="btn btn-sm mt14" data-go="companies">تغيير / تعديل الشركات</button>
      </div>

      ${topTpls.length? `<div class="card">
        <div class="card-h"><h3>أكثر النماذج استخداماً</h3></div>
        ${topTpls.map(([n,c])=>`
          <div style="margin-bottom:9px">
            <div class="flex" style="justify-content:space-between;font-size:12.5px"><span>${esc(n)}</span><b>${c}</b></div>
            <div style="height:6px;background:#eef1f7;border-radius:6px;margin-top:3px"><div style="height:6px;border-radius:6px;background:linear-gradient(90deg,#12305f,#2b62b8);width:${Math.round(c/maxTop*100)}%"></div></div>
          </div>`).join('')}
      </div>`:''}
    </div>
  </div>`;
}

/* ============================================================
   إنشاء خطاب
   ============================================================ */
function openComposer(tplId, record){
  if(record){
    composerState = { tplId:record.tplId, values:{...record.values,_archiveSupplier:record.values?._archiveSupplier||record.supplierName||''}, editingId:record.id, ref:record.ref };
  }else{
    freshComposer(tplId);
  }
}
function supplierOrderItemsHTML(items){
  const rows=(Array.isArray(items)&&items.length?items:[{}]);
  return `<div class="field span2"><label>بنود طلب الشراء / عرض السعر <span class="req">*</span></label>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>Supplier Code</th><th>Description (EN)</th><th>Quantity</th><th>Unit price (اختياري)</th><th></th></tr></thead><tbody>${rows.map((x,i)=>`<tr class="po-item-row"><td>${i+1}</td><td><input data-po-field="code" value="${esc(x.code||'')}" placeholder="Supplier SKU / code" style="min-width:130px"></td><td><input data-po-field="description" value="${esc(x.description||'')}" placeholder="Item description in English" style="min-width:230px"></td><td><input data-po-field="quantity" type="number" min="0" step="any" value="${esc(x.quantity||'')}" style="width:90px"></td><td><input data-po-field="unitPrice" type="number" min="0" step="any" value="${esc(x.unitPrice||'')}" style="width:110px"></td><td><button type="button" class="btn btn-sm btn-red" data-po-remove="${i}" title="حذف البند">✕</button></td></tr>`).join('')}</tbody></table></div>
    <div class="field mt8"><label>إدراج جدول من Word أو Excel</label><textarea id="poTablePaste" rows="3" placeholder="انسخ خلايا الجدول من Word أو Excel ثم الصقها هنا (الكود، الوصف، الكمية، السعر اختيارياً)."></textarea><div class="flex mt8"><button type="button" class="btn btn-sm" data-po-import-table>إدراج الجدول الملصوق</button><label class="btn btn-sm" style="margin:0">استيراد CSV<input id="poTableFile" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" style="display:none"></label><button type="button" class="btn btn-sm" data-po-add>+ إضافة بند يدوياً</button></div></div>
    <div class="small muted mt8">يمكنك لصق خلايا محددة من Word أو Excel مباشرة؛ أو استيراد جدول CSV. أدخل رمز الصنف والوصف والكمية؛ السعر اختياري.</div></div>`;
}
function parseSupplierTableText(text){
  const lines=String(text||'').split(/\r?\n/).filter(line=>line.trim()); if(!lines.length) return [];
  const first=lines[0], delimiter=first.includes('\t')?'\t':(first.includes(';')?';':',');
  const parseLine=line=>{const cells=[];let value='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(ch===delimiter&&!quoted){cells.push(value.trim());value='';}else value+=ch;}cells.push(value.trim());return cells;};
  let matrix=lines.map(parseLine),header=matrix[0].map(x=>x.toLowerCase());
  const hasHeader=header.some(x=>/(code|sku|description|quantity|\bqty\b|price|رمز|كود|وصف|الكمية|السعر)/i.test(x));
  let map={code:0,description:1,quantity:2,unitPrice:3};
  if(hasHeader){
    const find=pattern=>header.findIndex(x=>pattern.test(x));
    map={code:find(/code|sku|رمز|كود/),description:find(/description|item|product|وصف|الصنف/),quantity:find(/quantity|\bqty\b|الكمية|عدد/),unitPrice:find(/unit.?price|price|السعر/)};
    matrix=matrix.slice(1);
  }
  return matrix.map(c=>({code:c[map.code]||'',description:c[map.description]||'',quantity:toLatinDigits(c[map.quantity]||''),unitPrice:map.unitPrice>=0?toLatinDigits(c[map.unitPrice]||''):''})).filter(x=>x.code||x.description||x.quantity||x.unitPrice);
}
function importSupplierTable(text){
  const items=parseSupplierTableText(text);
  if(!items.length){toast('لم يتم العثور على صفوف في الجدول','err');return;}
  const values=currentValues(); values.items=items; composerState.values=values; render('new'); toast(`تم إدراج ${items.length} بنداً`);
}
function viewComposer(){
  const tpl = TPL_BY_ID[composerState.tplId] || allTemplates(false)[0];
  if(!composerState.tplId) composerState.tplId = tpl.id;
  const v = composerState.values;
  const ref = composerState.editingId ? composerState.ref : peekRef(tpl.code);

  return `
  <div class="workbench">
    <div class="panel panel-sticky no-print">
      <div class="panel-h"><h3>النموذج</h3><div class="spacer"></div>
        <span class="badge blue">${esc(activeCompany().short)}</span>
      </div>

      <div class="tpl-grid" style="grid-template-columns:1fr 1fr;max-height:210px;overflow:auto;padding:2px">
        ${CATS.map(cat=>{
          const ts = allTemplates(false).filter(t=>t.cat===cat.id);
          return ts.map(t=>`
            <div class="tpl ${t.id===tpl.id?'active':''}" data-tpl="${esc(t.id)}" title="${esc(t.desc)}">
              <div class="ti">${esc(t.icon)}</div>
              <div><div class="tn" style="font-size:12.6px">${esc(t.name)}</div></div>
            </div>`).join('');
        }).join('')}
      </div>

      <div class="hr"></div>
      <div class="flex" style="justify-content:space-between;margin-bottom:10px">
        <div><b>${esc(tpl.icon)} ${esc(tpl.name)}</b><div class="small muted">${esc(tpl.desc)}</div></div>
        <div class="badge ${CATS.find(c=>c.id===tpl.cat).color}">${esc(CATS.find(c=>c.id===tpl.cat).name)}</div>
      </div>

      <form id="letterForm" class="grid2" onsubmit="return false">
        ${tpl.fields.map(f=>fieldHTML(f, v[f.k] ?? '')).join('')}
        ${tpl.id==='supplier_order'?supplierOrderItemsHTML(v.items):''}
        <div class="field span2"><label>المورد المرتبط بالخطاب (اختياري — لتصنيفه في أرشيف الموردين)</label><input name="_archiveSupplier" list="supplierNameOptions" value="${esc(v._archiveSupplier||v.supplierName||'')}" placeholder="اختر أو اكتب اسم المورد"><datalist id="supplierNameOptions">${supplierNames().map(n=>`<option value="${esc(n)}">`).join('')}</datalist></div>
      </form>

      <div class="actions">
        <button class="btn btn-primary" data-act="archive">💾 أرشفة الخطاب</button>
        <button class="btn btn-gold" data-act="pdf">🖨️ طباعة / PDF</button>
        ${tpl.id==='supplier_order'?'<button class="btn btn-gold" data-act="archive-download">💾 حفظ وأرشفة + تحميل PDF</button><button class="btn btn-sm" data-act="blank-model">⬇ تحميل نموذج فارغ PDF</button>':''}
      </div>
      <div class="actions" style="border-top:none;margin-top:8px;padding-top:0">
        <button class="btn btn-sm" data-act="draft">حفظ كمسودة</button>
        <button class="btn btn-sm" data-act="reset">خطاب جديد (تفريغ)</button>
        ${composerState.editingId? `<button class="btn btn-sm btn-red" data-act="cancel-edit">إلغاء التعديل</button>`:''}
      </div>
      <div class="small muted mt8" style="text-align:center" id="refHint">
        ${composerState.editingId? `تعديل الخطاب رقم <b>${esc(ref)}</b>` : `سيُسجَّل الرقم المرجعي تلقائياً: <b>${esc(ref)}</b>`}
      </div>
    </div>

    <div class="preview-wrap">
      <div class="preview-bar no-print">
        <span class="dot"></span> معاينة مباشرة — مقاس A4
        <div class="spacer"></div>
        <button class="btn btn-sm" data-act="pdf">تحميل PDF</button>
      </div>
      <div class="preview-stage" id="preview"><div class="sheet-holder">${renderSheetHTML(tpl, v, {ref})}</div></div>
    </div>
  </div>`;
}

function fieldHTML(f, val){
  const req = f.req? '<span class="req"> *</span>' : '';
  const span = f.span===2? 'span2' : '';
  if(f.type==='employee'){
    const list = employeesOf(DB.settings.activeCompany);
    return `<div class="field span2">
      <label>${esc(f.label)}${req}</label>
      <select name="${esc(f.k)}" data-emp-select="${esc(f.k)}">
        <option value="">${list.length?'— إدخال يدوي —':'— لا يوجد موظفون مسجلون لهذه الشركة —'}</option>
        ${list.map(e=>`<option value="${esc(e.id)}" ${val===e.id?'selected':''}>${esc(e.name)}${e.position? ' — '+esc(e.position):''}</option>`).join('')}
      </select>
    </div>`;
  }
  if(f.type==='textarea'){
    return `<div class="field span2"><label>${esc(f.label)}${req}</label>
      <textarea name="${f.k}" rows="${f.rows||4}" placeholder="${esc(f.ph||'')}">${esc(val)}</textarea></div>`;
  }
  if(f.type==='select'){
    return `<div class="field"><label>${esc(f.label)}${req}</label>
      <select name="${f.k}">${(f.options||[]).map(o=>{const value=typeof o==='object'?o.value:o,label=typeof o==='object'?o.label:o;return `<option value="${esc(value)}" ${String(value)===String(val)?'selected':''}>${esc(label)}</option>`}).join('')}</select></div>`;
  }
  const type = f.type||'text';
  return `<div class="field ${span}"><label>${esc(f.label)}${req}</label>
    <input type="${type}" name="${f.k}" value="${esc(val)}" placeholder="${esc(f.ph||'')}" ${type==='number'?'step="any"':''}></div>`;
}

/* ============================================================
   الأرشيف
   ============================================================ */
let archiveFilter = { q:'', tpl:'', company:'', from:'', to:'' };
let archiveSection='letters';
let supplierArchiveMode='received';
let supplierArchiveFilter='';
function supplierNames(){
  const names=[];
  (DB.groupDocs||[]).filter(d=>d.supplierDelivery).forEach(d=>names.push(d.supplierName));
  (DB.letters||[]).forEach(l=>names.push(l.supplierName||l.values?._archiveSupplier||l.values?.supplierName));
  return [...new Set(names.map(x=>String(x||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}
function archiveSectionTabs(){return `<div class="flex mb14 no-print"><button class="btn ${archiveSection==='letters'?'btn-primary':''}" data-archive-section="letters">📨 الخطابات الصادرة</button><button class="btn ${archiveSection==='suppliers'?'btn-primary':''}" data-archive-section="suppliers">📦 ملفات الموردين</button></div>`;}
function viewArchive(){
  if(archiveSection==='suppliers') return viewSupplierArchive();
  const all = [...DB.letters].sort((a,b)=>b.createdAt-a.createdAt);
  const rows = all.filter(l=>{
    const q = archiveFilter.q.trim();
    if(q && !(`${l.ref} ${l.tplName} ${l.person} ${l.subject||''} ${l.supplierName||l.values?._archiveSupplier||''}`.includes(q))) return false;
    if(archiveFilter.tpl && l.tplId!==archiveFilter.tpl) return false;
    if(archiveFilter.company && l.companyId!==archiveFilter.company) return false;
    const d = toISO(l.createdAt);
    if(archiveFilter.from && d < archiveFilter.from) return false;
    if(archiveFilter.to && d > archiveFilter.to) return false;
    return true;
  });
  return `
  ${archiveSectionTabs()}
  <div class="card pad0">
    <div style="padding:16px 18px 0">
      <div class="toolbar no-print">
        <div class="search"><span class="mg">🔍</span>
          <input id="fq" placeholder="بحث بالرقم المرجعي، الاسم، الموضوع..." value="${esc(archiveFilter.q)}">
        </div>
        <select id="ftpl">
          <option value="">كل النماذج</option>
          ${allTemplates().map(t=>`<option value="${esc(t.id)}" ${archiveFilter.tpl===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}
        </select>
        <select id="fco">
          <option value="">كل الشركات</option>
          ${DB.companies.map(c=>`<option value="${c.id}" ${archiveFilter.company===c.id?'selected':''}>${esc(c.short)}</option>`).join('')}
        </select>
        <input type="date" id="ffrom" value="${archiveFilter.from}" title="من تاريخ">
        <input type="date" id="fto" value="${archiveFilter.to}" title="إلى تاريخ">
        <button class="btn btn-sm" data-act="csv">⬇ تصدير السجل CSV</button>
        <button class="btn btn-sm" data-act="clear-filter">مسح الفلاتر</button>
      </div>
      <div class="small muted" style="margin-bottom:8px">${rows.length} خطاب من أصل ${all.length}</div>
    </div>
    ${rows.length ? `
    <div class="table-wrap">
      <table class="tbl">
        <thead><tr>
          <th>الرقم المرجعي</th><th>النموذج</th><th>المعني / الموضوع</th><th>الشركة</th><th>تاريخ الإنشاء</th><th>الحالة</th><th style="text-align:left">إجراءات</th>
        </tr></thead>
        <tbody>
        ${rows.map(l=>`<tr>
          <td class="ref">${esc(l.ref)}</td>
          <td>${esc(l.tplName)}<div class="sub">${esc(l.tplCatName||'')}</div></td>
          <td><b>${esc(l.person||'—')}</b>${l.subject? `<div class="sub">${esc(l.subject)}</div>`:''}</td>
          <td class="small">${esc(l.companyShort||'')}</td>
          <td class="small muted">${fdate(toISO(l.createdAt),'short')}</td>
          <td><span class="badge ${l.status==='archived'?'green':'gold'}">${l.status==='archived'?'مؤرشف':'مسودة'}</span></td>
          <td><div class="row-actions">
            <button class="btn btn-sm btn-icon" data-open="${l.id}" title="عرض">👁</button>
            <button class="btn btn-sm btn-icon" data-edit="${l.id}" title="تعديل">✏️</button>
            <button class="btn btn-sm btn-icon" data-print="${l.id}" title="طباعة">🖨</button>
            <button class="btn btn-sm btn-icon" data-del="${l.id}" title="حذف">🗑</button>
          </div></td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>` : `<div class="empty"><span class="big">🗂️</span>${all.length? 'لا نتائج مطابقة للبحث' : 'الأرشيف فارغ — أنشئ خطاباً جديداً وسيُحفظ هنا تلقائياً'}</div>`}
  </div>`;
}
function viewSupplierArchive(){
  const names=supplierNames();
  const selected=supplierArchiveFilter;
  const received=(DB.groupDocs||[]).filter(d=>d.supplierDelivery&&(!selected||d.supplierName===selected)).sort((a,b)=>(b.deliveryDate||'').localeCompare(a.deliveryDate||''));
  const issued=(DB.letters||[]).filter(l=>{
    const name=String(l.supplierName||l.values?._archiveSupplier||l.values?.supplierName||'').trim();
    return name&&(!selected||name===selected);
  }).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  return `${archiveSectionTabs()}
    <div class="flex mb14 no-print">
      <button class="btn ${supplierArchiveMode==='received'?'btn-primary':''}" data-supplier-mode="received">📥 الوثائق الواردة (حسب التسليم)</button>
      <button class="btn ${supplierArchiveMode==='issued'?'btn-primary':''}" data-supplier-mode="issued">📤 الوثائق الصادرة من الخطابات</button>
    </div>
    <div class="card">
      <div class="card-h"><h3>📦 الموردون</h3><div class="spacer"></div>
        ${supplierArchiveMode==='received'?'<button class="btn btn-primary btn-sm" data-supplier-delivery-new>+ تسجيل تسليم ووثائقه</button>':''}
      </div>
      <div class="toolbar no-print">
        <label class="small">المورد</label>
        <select id="supplierArchiveFilter"><option value="">كل الموردين</option>${names.map(n=>`<option value="${esc(n)}" ${n===selected?'selected':''}>${esc(n)}</option>`).join('')}</select>
        <span class="small muted">${supplierArchiveMode==='received'?`${received.length} تسليم`:`${issued.length} خطاب مرتبط`}</span>
      </div>
      ${supplierArchiveMode==='received' ? (received.length?received.map(d=>`
        <div class="card" style="margin-top:12px;border-inline-start:4px solid var(--blue,#315f9f)">
          <div class="card-h"><div><b>المورد: ${esc(d.supplierName)}</b><div class="small muted">التسليم: ${esc(d.deliveryRef||'بلا رقم')} · ${d.deliveryDate?fdate(d.deliveryDate,'short'):'دون تاريخ'} · ${esc(companyById(d.companyId).short)}</div></div><div class="spacer"></div><button class="btn btn-sm btn-red" data-supplier-delivery-delete="${esc(d.id)}">حذف التسليم</button></div>
          ${d.notes?`<div class="small mb10">${esc(d.notes)}</div>`:''}
          ${(d.documents||[]).length?`<div class="table-wrap"><table class="tbl"><thead><tr><th>الوثيقة</th><th>اسم الملف</th><th>الحجم</th><th>إجراء</th></tr></thead><tbody>${d.documents.map(f=>`<tr><td>${esc(f.title||f.fileName)}</td><td>${esc(f.fileName)}</td><td>${f.size?`${(f.size/1024).toFixed(0)} ك.ب`:'—'}</td><td><button class="btn btn-sm" data-supplier-file="${esc(d.id)}" data-supplier-file-id="${esc(f.id)}">فتح / تنزيل</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="small muted">لا توجد مرفقات لهذا التسليم.</div>'}
        </div>`).join(''):'<div class="empty"><span class="big">📦</span>لا توجد وثائق واردة بعد. أضف تسليماً وارفق مستنداته؛ سيُحفظ كل تسليم كملف مستقل للمورد.</div>') : (issued.length?`
        <div class="table-wrap"><table class="tbl"><thead><tr><th>المورد</th><th>رقم الخطاب</th><th>النموذج</th><th>الموضوع</th><th>الشركة</th><th>تاريخ الإنشاء</th><th>إجراءات</th></tr></thead><tbody>
        ${issued.map(l=>`<tr><td>${esc(l.supplierName||l.values?._archiveSupplier||l.values?.supplierName)}</td><td class="ref">${esc(l.ref)}</td><td>${esc(l.tplName||'')}</td><td>${esc(l.subject||'—')}</td><td>${esc(l.companyShort||'')}</td><td>${fdate(toISO(l.createdAt),'short')}</td><td><div class="row-actions"><button class="btn btn-sm btn-icon" data-open="${esc(l.id)}" title="عرض">👁</button><button class="btn btn-sm btn-icon" data-edit="${esc(l.id)}" title="تعديل">✏️</button><button class="btn btn-sm btn-icon" data-print="${esc(l.id)}" title="طباعة">🖨</button></div></td></tr>`).join('')}
        </tbody></table></div>`:'<div class="empty"><span class="big">📤</span>لا توجد خطابات مرتبطة بمورد حتى الآن. عند إنشاء خطاب، اختر المورد في خانة «المورد المرتبط بالخطاب» ليظهر هنا تلقائياً.</div>')}
    </div>`;
}

/* ============================================================
   الموظفون
   ============================================================ */
function viewEmployees(){
  const list = DB.employees;
  return `
  <div class="card pad0">
    <div style="padding:16px 18px 0">
      <div class="toolbar">
        <div class="search"><span class="mg">🔍</span><input id="empq" placeholder="بحث بالاسم أو الوظيفة..."></div>
        <button class="btn btn-primary" data-act="emp-new">+ إضافة موظف</button>
        <button class="btn btn-sm" data-act="emp-import">استيراد من Excel/CSV</button>
      </div>
      <div class="alert info">تُستخدم هذه القائمة لتعبئة نماذج الشهادات وأوامر المهمة تلقائياً بمجرد اختيار الموظف.</div>
    </div>
    <div id="empTable">${employeesTable(list)}</div>
  </div>`;
}
function employeesTable(list){
  if(!list.length) return `<div class="empty"><span class="big">👥</span>لا يوجد موظفون بعد — أضف الموظفين لتسريع إعداد الخطابات</div>`;
  return `<div class="table-wrap"><table class="tbl">
    <thead><tr><th>الاسم</th><th>الوظيفة</th><th>القسم / الإدارة</th><th>الرقم الوطني</th><th>تاريخ الالتحاق</th><th>الشركة</th><th style="text-align:left">إجراءات</th></tr></thead>
    <tbody>${list.map(e=>`<tr>
      <td><b>${esc(e.name)}</b></td>
      <td class="small">${esc(e.position||'—')}</td>
      <td class="small">${esc(e.department||'—')}</td>
      <td class="small muted">${esc(e.nationalId||'—')}</td>
      <td class="small muted">${e.hireDate? fdate(e.hireDate,'short'):'—'}</td>
      <td class="small">${esc(companyById(e.companyId).short)}</td>
      <td><div class="row-actions">
        <button class="btn btn-sm btn-icon" data-emp-edit="${e.id}" title="تعديل">✏️</button>
        <button class="btn btn-sm btn-icon" data-emp-del="${e.id}" title="حذف">🗑</button>
      </div></td></tr>`).join('')}</tbody></table></div>`;
}

/* ============================================================
   الشركات
   ============================================================ */
function stationeryCard(co, std){
  const isActive = std.id === co.activeStationeryId;
  const a = stationeryAssets(co, std);
  const modeLabel = std.mode === 'fullpage'
    ? '<span class="badge blue">نموذج كامل</span>'
    : '<span class="badge grey">ترويسة + تذييل</span>';
  const thumb = std.mode === 'fullpage'
    ? `<img src="${a.fullpage}" alt="">`
    : `<div class="std-mini">
         <div class="mh"><img src="${a.header}" alt=""></div>
         <div class="mb"></div>
         <div class="mf"><img src="${a.footer}" alt=""></div>
       </div>`;
  return `<div class="std-card ${isActive?'active':''}">
    <div class="std-thumb">${thumb}</div>
    <div class="std-body">
      <div class="std-name">${esc(std.name || 'بدون اسم')}</div>
      <div class="std-meta">${modeLabel}
        ${std.headerImg? '<span class="badge gold">مخصص</span>':'<span class="badge green">افتراضي</span>'}
      </div>
      <div class="std-actions">
        ${isActive? '<span class="badge green">✓ النموذج النشط</span>'
                  : `<button class="btn btn-sm" data-std-active="${co.id}|${std.id}">تعيين كنشط</button>`}
        <button class="btn btn-sm" data-std-edit="${co.id}|${std.id}" title="تعديل الترويسة والتذييل">✏️ تعديل</button>
        <button class="btn btn-sm" data-std-copy="${co.id}|${std.id}" title="إنشاء نسخة (نموذج ثانٍ)">⧉ نسخة</button>
        ${co.stationeries.length>1? `<button class="btn btn-sm btn-icon" data-std-del="${co.id}|${std.id}" title="حذف النموذج">🗑</button>`:''}
      </div>
    </div>
  </div>`;
}

function viewCompanies(){
  ensureStationeries();
  return `
  <div class="alert info">
    لكل شركة <b>عدة نماذج ترويسة</b> (مثلاً: ترويسة عادية وأخرى لخطابات محددة). النموذج النشط هو المستخدم في الخطابات الجديدة.
    يمكن تعديل الترويسة والتذييل والعلامة المائية، أو رفع <b>نموذج كامل</b> (صورة صفحة A4 كاملة)، أو حذف أي صورة والرجوع إلى الافتراضي.
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px">
  ${DB.companies.map(c=>{
    const list = stationeriesOf(c);
    return `
    <div class="card">
      <div class="card-h">
        <h3>${esc(c.short)}</h3>
        <div class="spacer"></div>
        ${DB.settings.activeCompany===c.id? `<span class="badge green">نشطة</span>` : `<button class="btn btn-sm" data-co-active="${c.id}">تعيين كنشطة</button>`}
      </div>

      <div class="std-grid">${list.map(st=>stationeryCard(c, st)).join('')}
        <button class="std-add" data-std-new="${c.id}">
          <div style="font-size:22px">＋</div>
          <div class="small">إضافة نموذج ترويسة</div>
          <div class="small muted" style="font-size:10.5px">ترويسة/تذييل أو صورة صفحة كاملة</div>
        </button>
      </div>

      <dl class="kv mt14">
        <dt>الاسم الكامل</dt><dd>${esc(c.name)}</dd>
        <dt>الرمز</dt><dd>${esc(c.code)}</dd>
        <dt>العنوان</dt><dd>${esc(c.address||'—')}</dd>
        <dt>الهاتف</dt><dd>${esc(c.phone||'—')}</dd>
        <dt>البريد</dt><dd>${esc(c.email||'—')}</dd>
        <dt>التوقيع</dt><dd>${esc(c.signTitle||'—')}${c.signName? ' / '+esc(c.signName):''}</dd>
        <dt>تسمية الرقم</dt><dd>${esc(c.refLabel||'الرقم')}</dd>
      </dl>
      <div class="flex mt14">
        <button class="btn btn-sm" data-co-edit="${c.id}">✏️ تعديل بيانات الشركة</button>
        ${!['ais'].includes(c.id)? `<button class="btn btn-sm btn-red" data-co-del="${c.id}">حذف الشركة</button>`:''}
      </div>
    </div>`;
  }).join('')}
    <div class="card" style="display:grid;place-items:center;text-align:center;border:2px dashed #d3dcec;box-shadow:none">
      <div>
        <div style="font-size:30px;opacity:.5">🏢</div>
        <div class="small muted mt8">لإضافة شركة ثالثة</div>
        <button class="btn btn-primary mt14" data-co-new>+ إضافة شركة</button>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   الإعدادات
   ============================================================ */
function viewSettings(){
  const st = DB.settings;
  const size = new Blob([localStorage.getItem(STORE_KEY)||'']).size;
  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" class="dash-grid">
    <div class="card">
      <div class="card-h"><h3>تفضيلات الخطابات</h3></div>
      <div class="grid2">
        <div class="field"><label>المدينة (تظهر قبل التاريخ)</label><input id="set-city" value="${esc(st.city)}"></div>
        <div class="field"><label>صيغة التاريخ</label>
          <select id="set-date">
            <option value="long" ${st.dateStyle==='long'?'selected':''}>مطوّلة (20 أكتوبر 2026م)</option>
            <option value="short" ${st.dateStyle==='short'?'selected':''}>رقمية (20/10/2026)</option>
          </select></div>
      </div>
      <label class="flex mt14" style="gap:8px;font-size:13.5px"><input type="checkbox" id="set-stamp" ${st.showStamp?'checked':''}> إظهار مكان الختم في الخطابات</label>
      <label class="flex mt8" style="gap:8px;font-size:13.5px"><input type="checkbox" id="set-wm" ${st.showWatermark?'checked':''}> إظهار العلامة المائية الخاصة بكل شركة (إن وُجدت)</label>
      <div class="hr"></div>
      <div class="alert warn">التاريخ والرقم المرجعي يُسجَّلان تلقائياً عند الأرشفة، مع ترقيم متسلسل سنوي لكل نوع خطاب.</div>
    </div>

    <div class="card">
      <div class="card-h"><h3>🔢 تركيب الرقم المرجعي</h3></div>
      <div class="small muted mb10">تحكّم في شكل الرقم الذي يُمنح آلياً لكل خطاب. المتغيّرات المتاحة:</div>
      <div class="tokens">
        <code data-token="{c}">{c}</code> رمز الشركة
        <code data-token="{t}">{t}</code> رمز النموذج
        <code data-token="{y}">{y}</code> السنة
        <code data-token="{yy}">{yy}</code> السنة (رقمان)
        <code data-token="{mm}">{mm}</code> الشهر
        <code data-token="{n:04d}">{n:04d}</code> التسلسل (4 أرقام)
        <code data-token="{n:03d}">{n:03d}</code> (3 أرقام)
        <code data-token="{n}">{n}</code> بلا تنسيق
      </div>
      <div class="field mt14"><label>صيغة الرقم</label>
        <input id="refPattern" value="${esc(refPattern())}" dir="ltr" style="font-family:Consolas,monospace;letter-spacing:.3px">
      </div>
      <div class="field mt8"><label>صيغ جاهزة</label>
        <select id="refPreset">
          <option value="">— اختر صيغة —</option>
          ${REF_PRESETS.map(x=>`<option value="${esc(x.p)}">${esc(x.label)}</option>`).join('')}
        </select>
      </div>
      <div class="ref-demo">
        معاينة: <b id="refDemo">${esc(refFor('SHA', 17))}</b>
      </div>
      <div class="flex mt14">
        <button class="btn btn-sm btn-primary" data-act="ref-save">💾 حفظ الصيغة</button>
        <button class="btn btn-sm" data-act="ref-default">↺ الافتراضي</button>
      </div>
      <div class="small muted mt8">التسلسل مستقل لكل شركة/نموذج/سنة، ويُصفَّر مطلع كل سنة.</div>
    </div>

    <div class="card" style="grid-column:1/-1">
      <div class="card-h"><h3>📝 إدارة نماذج الخطابات والنصوص الثابتة</h3><div class="spacer"></div>
        <button class="btn btn-primary btn-sm" data-template-new>+ إضافة نموذج خطاب</button>
      </div>
      <div class="small muted mb10">أنشئ نموذجاً جديداً وحرّر نصوصه وحقوله. يمكنك إيقاف النموذج دون حذف الخطابات المحفوظة به.</div>
      ${DB.settings.customTemplates.length ? `<div class="table-wrap"><table><thead><tr><th>النموذج</th><th>الفئة</th><th>الرمز</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>
        ${DB.settings.customTemplates.map(t=>`<tr><td>${esc(t.icon||'✉️')} ${esc(t.name)}</td><td>${esc((CATS.find(c=>c.id===t.cat)||{}).name||'')}</td><td dir="ltr">${esc(t.code)}</td><td>${t.active===false?'متوقف':'نشط'}</td><td class="flex"><button class="btn btn-sm" data-template-edit="${esc(t.id)}">تعديل</button><button class="btn btn-sm" data-template-toggle="${esc(t.id)}">${t.active===false?'تفعيل':'إيقاف'}</button></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="alert info">لم تتم إضافة نماذج مخصصة بعد.</div>`}
      <div class="hr"></div>
      <div class="flex mb10"><b>تحرير محتوى النماذج الأساسية</b></div>
      <div class="small muted mb10">يمكنك استبدال الموضوع أو سطر الجهة أو نص الخطاب أو الختام مع إبقاء حقول الإدخال والترويسة كما هي. اترك أي خانة فارغة لاستخدام النص الأصلي.</div>
      <div class="table-wrap"><table><thead><tr><th>النموذج</th><th>حالة المحتوى</th><th>إجراء</th></tr></thead><tbody>
        ${TEMPLATES.map(t=>{const o=templateContentOverride(t.id);const customized=o&&['headText','subjectText','toText','bodyText','closingText'].some(k=>o[k]);return `<tr><td>${esc(t.icon)} ${esc(t.name)}</td><td>${customized?'تم تخصيص المحتوى':'النص الأصلي'}</td><td><button class="btn btn-sm" data-template-content-edit="${esc(t.id)}">${customized?'تعديل المحتوى':'تحرير المحتوى'}</button></td></tr>`}).join('')}
      </tbody></table></div>
      <div class="hr"></div>
      <div class="flex mb10"><b>تعديل العبارات الثابتة في النماذج</b><div class="spacer"></div><button class="btn btn-sm" data-template-rule-new>+ إضافة استبدال نص</button></div>
      <div class="small muted mb10">اختر عبارة كما تظهر في الخطاب، ثم أدخل النص البديل. يمكن تطبيقها على نموذج واحد أو جميع النماذج.</div>
      ${(DB.settings.templateTextReplacements||[]).length ? `<div class="table-wrap"><table><thead><tr><th>النموذج</th><th>العبارة الحالية</th><th>البديلة</th><th>إجراءات</th></tr></thead><tbody>
        ${(DB.settings.templateTextReplacements||[]).map(r=>`<tr><td>${r.templateId==='*'?'كل النماذج':esc((TPL_BY_ID[r.templateId]||{}).name||'نموذج محفوظ')}</td><td>${esc(r.from)}</td><td>${esc(r.to||'— حذف العبارة —')}</td><td class="flex"><button class="btn btn-sm" data-rule-edit="${esc(r.id)}">تعديل</button><button class="btn btn-sm btn-red" data-rule-delete="${esc(r.id)}">حذف</button></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="small muted">لا توجد تعديلات نصية بعد.</div>`}
    </div>

    <div class="card">
      <div class="card-h"><h3>النسخ الاحتياطي</h3>
        <div class="spacer"></div>
        <span class="badge grey">الإصدار ${APP_VER}</span>
      </div>
      <div class="small muted mb10">${
        API_ON
          ? (API_STORAGE === 'postgres'
              ? 'الأرشيف محفوظ في قاعدة بيانات <b>PostgreSQL</b> مشتركة ومحمية. يُنصح بتصدير نسخة احتياطية JSON بصفة دورية.'
              : 'الأرشيف محفوظ على الخادم المشترك. صدّر نسخة احتياطية بصفة دورية.')
          : `كل البيانات محفوظة داخل هذا المتصفح على جهازك (${(size/1024).toFixed(0)} كيلوبايت). صدّر نسخة احتياطية بصفة دورية.`
      }</div>
      <div class="flex flex-wrap">
        <button class="btn btn-primary" data-act="backup">⬇ تصدير نسخة احتياطية (JSON)</button>
        <button class="btn" data-act="restore">⬆ استيراد نسخة احتياطية</button>
        <input type="file" id="restoreFile" accept=".json" style="display:none">
      </div>
      <div class="hr"></div>
      <div class="card-h"><h3>إدارة البيانات</h3></div>
      <div class="flex flex-wrap">
        <button class="btn btn-sm" data-act="seed">إضافة بيانات تجريبية</button>
        <button class="btn btn-sm btn-red" data-act="wipe">حذف كل البيانات</button>
      </div>
      <div class="small muted mt8">حذف كل البيانات يشمل الأرشيف والموظفين وإعدادات الشركات — ولا يمكن التراجع عنه.</div>
    </div>

    ${(API_ON && !API_CLOUD) ? `
    <div class="card" style="grid-column:1/-1">
      <div class="card-h"><h3>🔄 تحديث التطبيق</h3><div class="spacer"></div>
        <span class="badge blue">الإصدار الحالي ${APP_VER}</span></div>
      <div class="alert info">
        اسحب ملف التحديث <b>secretariat_maj.zip</b> هنا (أو اختره) ثم اضغط «تثبيت».
        يُحدَّث البرنامج تلقائياً مع <b>الاحتفاظ الكامل</b> بالأرشيف والإعدادات وكلمة المرور.
      </div>
      <div class="upd-zone" id="updZone">
        <div style="font-size:26px">📦</div>
        <div><b>أفلِت ملف التحديث هنا</b> أو <label class="btn btn-sm" style="margin:0">اختيار ملف
          <input type="file" id="updFile" accept=".zip,.html" style="display:none"></label></div>
        <div class="small muted" id="updName">لم يتم اختيار ملف</div>
      </div>
      <div class="flex mt14">
        <button class="btn btn-primary" id="updGo" disabled>⬆ تثبيت التحديث</button>
        <button class="btn btn-sm" id="updReload" style="display:none">↻ إعادة تحميل الصفحة</button>
        <button class="btn btn-sm" id="updRestart" style="display:none">⟳ إعادة تشغيل الخادم</button>
      </div>
      <div id="updLog" class="small mt14"></div>
      <div class="small muted mt8">تُحفظ نسخة من ملفات البرنامج القديمة في <code>backups/app/</code> على الخادم.</div>
    </div>` : ''}
  </div>`;
}

/* محرر النماذج المخصصة واستبدال النصوص الثابتة */
function templateEditorModal(templateId){
  const old=(DB.settings.customTemplates||[]).find(t=>t.id===templateId);
  const t=old||{id:'',name:'',cat:'ext',code:`CUS${String((DB.settings.customTemplates||[]).length+1).padStart(2,'0')}`,icon:'✉️',desc:'',fields:[],personKey:'',toText:'',subjectText:'',bodyText:'',closingText:'وتفضلوا بقبول فائق الاحترام والتقدير'};
  const bg=$('#modalBg');
  bg.innerHTML=`<div class="modal" style="max-width:900px">
    <div class="modal-h"><h3>${old?'تعديل نموذج الخطاب':'إضافة نموذج خطاب جديد'}</h3><div class="spacer"></div><button class="btn btn-sm" data-close>✕</button></div>
    <div class="modal-b" style="max-height:72vh;overflow:auto">
      <form id="tplEditForm" class="grid2">
        <div class="field span2"><label>اسم النموذج *</label><input name="name" required value="${esc(t.name)}" placeholder="مثال: طلب إفادة مصرفية"></div>
        <div class="field"><label>الفئة</label><select name="cat">${CATS.map(c=>`<option value="${esc(c.id)}" ${t.cat===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label>رمز الرقم المرجعي (2–8 أحرف/أرقام) *</label><input name="code" dir="ltr" maxlength="8" value="${esc(t.code)}" placeholder="مثال: TLB"></div>
        <div class="field"><label>أيقونة (اختياري)</label><input name="icon" value="${esc(t.icon||'✉️')}" maxlength="8"></div>
        <div class="field"><label>وصف مختصر</label><input name="desc" value="${esc(t.desc||'')}"></div>
        <div class="field span2"><label>حقول الإدخال — حقل واحد في كل سطر، أضف * في نهاية الحقل ليكون إلزامياً</label>
          <textarea id="tplFieldLines" name="fieldLines" rows="4" placeholder="اسم الموظف *&#10;رقم الخطاب&#10;الجهة الموجه إليها">${esc(customFieldLines(t.fields))}</textarea>
          <div class="small muted">سيُضاف تاريخ الخطاب تلقائياً. لجعل الحقل قائمة اختيار من الموظفين المسجلين، أضف <code>[موظف]</code> بعد اسمه، مثل «اسم الموظف [موظف] *». رموز الحقول تظهر أدناه:</div><div id="tplTokens" class="tokens"></div>
        </div>
        <div class="field span2"><label>حقل «المعني» في الأرشيف</label><select id="tplPersonKey" name="personKey"></select></div>
        <div class="field span2"><label>سطر الجهة المستلمة (اختياري)</label><textarea name="toText" rows="2" placeholder="السادة/ {{f1}} — المحترمين">${esc(t.toText||'')}</textarea></div>
        <div class="field span2"><label>الموضوع</label><input name="subjectText" value="${esc(t.subjectText||'')}"></div>
        <div class="field span2"><label>نص الخطاب *</label><textarea name="bodyText" rows="9" required placeholder="تحية طيبة وبعد،،،&#10;&#10;نفيدكم بأن {{f1}} ...">${esc(t.bodyText||'')}</textarea></div>
        <div class="field span2"><label>عبارة الختام</label><input name="closingText" value="${esc(t.closingText||'وتفضلوا بقبول فائق الاحترام والتقدير')}"></div>
        <div class="small muted span2">الرموز: {{f1}}، {{f2}}… لحقول الإدخال · {{company}} لاسم الشركة · {{date}} لتاريخ الخطاب. اترك سطرًا فارغًا بين الفقرات.</div>
      </form>
    </div>
    <div class="modal-f"><button class="btn btn-primary" data-tpl-save>حفظ النموذج</button><button class="btn" data-close>إلغاء</button></div>
  </div>`;
  bg.classList.add('open');
  $$('[data-close]',bg).forEach(b=>b.onclick=()=>bg.classList.remove('open'));
  const fieldLines=$('#tplFieldLines',bg), tokens=$('#tplTokens',bg), personSel=$('#tplPersonKey',bg);
  const refreshTokens=()=>{
    const fields=parseCustomFieldLines(fieldLines.value), selected=personSel.value||t.personKey||'';
    tokens.innerHTML=fields.length?fields.map(f=>`<code>{{${f.k}}}</code> ${esc(f.label)}${f.type==='employee'?' (اسم الموظف)':''}${f.req?' *':''}${f.type==='employee'?`　<code>{{${f.k}_position}}</code> الوظيفة　<code>{{${f.k}_department}}</code> القسم`:''}`).join('　'):'<span class="muted">أضف حقلاً لإظهار رمزه</span>';
    personSel.innerHTML=`<option value="">— لا تحدد —</option>${fields.map(f=>`<option value="${f.k}" ${selected===f.k?'selected':''}>${esc(f.label)}</option>`).join('')}`;
  };
  fieldLines.oninput=refreshTokens; refreshTokens();
  $('[data-tpl-save]',bg).onclick=async()=>{
    const form=$('#tplEditForm',bg), data=Object.fromEntries(new FormData(form).entries());
    const name=data.name.trim(), code=data.code.trim().toUpperCase(), fields=parseCustomFieldLines(data.fieldLines);
    if(!name){toast('اسم النموذج مطلوب','err');return;}
    if(!/^[A-Z0-9-]{2,8}$/.test(code)){toast('الرمز يجب أن يكون من 2 إلى 8 أحرف إنجليزية أو أرقام','err');return;}
    if(!fields.length){toast('أضف حقلاً واحداً على الأقل','err');return;}
    if(!data.bodyText.trim()){toast('نص الخطاب مطلوب','err');return;}
    const duplicate=allTemplates().find(x=>x.code===code && x.id!==t.id);
    if(duplicate){toast('هذا الرمز مستخدم في نموذج آخر','err');return;}
    fields.push({k:'date',type:'date',label:'تاريخ الخطاب'});
    const item={...t,id:t.id||'custom_'+uid(),name,cat:data.cat,code,icon:data.icon.trim()||'✉️',desc:data.desc.trim(),fields,personKey:data.personKey||'',toText:data.toText.trim(),subjectText:data.subjectText.trim()||name,bodyText:data.bodyText.trim(),closingText:data.closingText.trim()};
    const list=[...(DB.settings.customTemplates||[])];
    const idx=list.findIndex(x=>x.id===item.id); if(idx>=0) list[idx]=item; else list.push(item);
    await persistSettings({customTemplates:list});
    bg.classList.remove('open'); render('settings'); toast('تم حفظ نموذج الخطاب');
  };
}
function templateContentEditorModal(templateId){
  const tpl=TPL_BY_ID[templateId]; if(!tpl || tpl.isCustom) return;
  const old=templateContentOverride(templateId)||{templateId,headText:'',subjectText:'',toText:'',bodyText:'',closingText:''};
  const fields=tpl.fields||[];
  const tokens=[...new Map([
    ...fields.map(f=>[f.k,f.label||f.k]),
    ['company','اسم الشركة'],['companyShort','اسم الشركة المختصر'],['date','تاريخ الخطاب'],
    ['employeeName','اسم الموظف'],['position','الوظيفة'],['department','القسم'],['nationalId','الرقم الوطني'],['hireDate','تاريخ الالتحاق']
  ]).entries()];
  const bg=$('#modalBg');
  bg.innerHTML=`<div class="modal" style="max-width:860px">
    <div class="modal-h"><h3>تحرير محتوى: ${esc(tpl.name)}</h3><div class="spacer"></div><button class="btn btn-sm" data-close>✕</button></div>
    <div class="modal-b" style="max-height:72vh;overflow:auto">
      <div class="alert info">كل خانة فارغة تحتفظ بالنص الأصلي. لإعادة أي جزء إلى الأصل، امسح نصه واحفظ. الرموز المتاحة تُدرج القيم المسجلة في النموذج.</div>
      <div class="tokens">${tokens.map(([k,label])=>`<code>{{${esc(k)}}}</code> ${esc(label)}`).join('　')}</div>
      <form id="builtinContentForm" class="grid2 mt14">
        ${tpl.head?`<div class="field span2"><label>النص التمهيدي / الجهة (كل سطر يظهر كسطر مستقل)</label><textarea name="headText" rows="3">${esc(old.headText||'')}</textarea></div>`:''}
        <div class="field span2"><label>الموضوع</label><textarea name="subjectText" rows="2">${esc(old.subjectText||'')}</textarea></div>
        ${!tpl.noTo?`<div class="field span2"><label>سطر الجهة المستلمة</label><textarea name="toText" rows="2">${esc(old.toText||'')}</textarea></div>`:''}
        <div class="field span2"><label>نص الخطاب — اترك سطراً فارغاً بين الفقرات</label><textarea name="bodyText" rows="10" placeholder="اكتب النص البديل هنا. مثال: نفيدكم بأن {{employeeName}} يعمل بوظيفة {{position}} لدى {{company}}.">${esc(old.bodyText||'')}</textarea></div>
        <div class="field span2"><label>عبارة الختام</label><textarea name="closingText" rows="2">${esc(old.closingText||'')}</textarea></div>
      </form>
    </div>
    <div class="modal-f"><button class="btn btn-primary" data-template-content-save>حفظ المحتوى</button><button class="btn" data-close>إلغاء</button></div>
  </div>`;
  bg.classList.add('open'); $$('[data-close]',bg).forEach(b=>b.onclick=()=>bg.classList.remove('open'));
  $('[data-template-content-save]',bg).onclick=async()=>{
    const data=Object.fromEntries(new FormData($('#builtinContentForm',bg)).entries());
    const item={templateId,headText:(data.headText||'').trim(),subjectText:(data.subjectText||'').trim(),toText:(data.toText||'').trim(),bodyText:(data.bodyText||'').trim(),closingText:(data.closingText||'').trim()};
    let list=(DB.settings.templateContentOverrides||[]).filter(x=>x.templateId!==templateId);
    if(item.headText||item.subjectText||item.toText||item.bodyText||item.closingText) list.push(item);
    await persistSettings({templateContentOverrides:list});
    bg.classList.remove('open'); render('settings'); toast('تم حفظ محتوى النموذج');
  };
}
function textRuleEditorModal(ruleId){
  const old=(DB.settings.templateTextReplacements||[]).find(r=>r.id===ruleId);
  const r=old||{templateId:'*',from:'',to:''}, bg=$('#modalBg');
  bg.innerHTML=`<div class="modal" style="max-width:680px">
    <div class="modal-h"><h3>${old?'تعديل عبارة ثابتة':'إضافة تعديل لعبارة ثابتة'}</h3><div class="spacer"></div><button class="btn btn-sm" data-close>✕</button></div>
    <div class="modal-b"><form id="textRuleForm" class="grid2">
      <div class="field span2"><label>تطبيق التغيير على</label><select name="templateId"><option value="*" ${r.templateId==='*'?'selected':''}>كل النماذج</option>${allTemplates().map(t=>`<option value="${esc(t.id)}" ${r.templateId===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div>
      <div class="field span2"><label>العبارة الحالية كما تظهر في الخطاب *</label><textarea name="from" rows="3" required>${esc(r.from)}</textarea></div>
      <div class="field span2"><label>النص البديل (اتركه فارغاً لحذف العبارة)</label><textarea name="to" rows="3">${esc(r.to||'')}</textarea></div>
      <div class="small muted span2">اكتب العبارة المطابقة تماماً. يسري التعديل على المعاينة والطباعة والخطابات المحفوظة عند عرضها.</div>
    </form></div>
    <div class="modal-f"><button class="btn btn-primary" data-rule-save>حفظ التعديل</button><button class="btn" data-close>إلغاء</button></div>
  </div>`;
  bg.classList.add('open'); $$('[data-close]',bg).forEach(b=>b.onclick=()=>bg.classList.remove('open'));
  $('[data-rule-save]',bg).onclick=async()=>{
    const data=Object.fromEntries(new FormData($('#textRuleForm',bg)).entries());
    if(!data.from.trim()){toast('أدخل العبارة الحالية','err');return;}
    const list=[...(DB.settings.templateTextReplacements||[])], item={id:r.id||'rule_'+uid(),templateId:data.templateId,from:data.from,to:data.to};
    const idx=list.findIndex(x=>x.id===item.id); if(idx>=0) list[idx]=item; else list.push(item);
    await persistSettings({templateTextReplacements:list});
    bg.classList.remove('open'); render('settings'); toast('تم حفظ تعديل النص');
  };
}
async function toggleCustomTemplate(id){
  const list=(DB.settings.customTemplates||[]).map(t=>t.id===id?{...t,active:t.active===false}:t);
  await persistSettings({customTemplates:list}); render('settings'); toast('تم تحديث حالة النموذج');
}

/* ============================================================
   ربط الأحداث
   ============================================================ */
function bindView(name){
  if(name==='dash'){
    $$('[data-open]').forEach(b=>b.onclick=()=>openRecordModal(b.dataset.open));
    $$('[data-alert-jump]').forEach(el=>el.onclick=()=>{
      const [kind, tid] = el.dataset.alertJump.split(':');
      if(kind==='tracker'){ trackerUI.activeId = tid; trackerUI.expFilter = 'alerts'; go('trackers'); }
      else { go('group'); }
    });
  }
  if(name==='new') bindComposer();
  if(name==='archive') bindArchive();
  if(name==='credits'){
    if(creditOpenId) bindCreditDetail(creditOpenId); else bindCredits();
  }
  if(name==='trackers') bindTrackers();
  if(name==='group') bindGroupDocs();
  if(name==='employees') bindEmployees();
  if(name==='companies') bindCompanies();
  if(name==='settings') bindSettings();
}

/* --- إنشاء خطاب --- */
function currentValues(){
  const tpl = TPL_BY_ID[composerState.tplId];
  const v = {...composerState.values};
  const form = $('#letterForm');
  if(form){
    $$('input,select,textarea', form).forEach(el=>{
      if(el.name) v[el.name] = el.value;
      if(el.hasAttribute('data-emp-select')) v._empId = el.value;
    });
    if(tpl?.id==='supplier_order') v.items=$$('.po-item-row',form).map(row=>Object.fromEntries($$('[data-po-field]',row).map(el=>[el.dataset.poField,el.value])));
  }
  return v;
}
function updatePreview(){
  const tpl = TPL_BY_ID[composerState.tplId];
  const v = currentValues();
  composerState.values = v;
  const ref = composerState.editingId ? composerState.ref : peekRef(tpl.code);
  const box = $('#preview');
  if(box){ box.innerHTML = `<div class="sheet-holder">${renderSheetHTML(tpl, v, {ref})}</div>`; fitSheet(); }
}

/* حساب هوامش المحتوى من ارتفاع الترويسة والتذييل الفعليين */
function adaptPadding(sheet){
  if(!sheet) return;
  const head = sheet.querySelector('.lh-head img') || sheet.querySelector('.lh-head');
  const foot = sheet.querySelector('.lh-foot img') || sheet.querySelector('.lh-foot');
  const h = head ? head.getBoundingClientRect().height / (sheet._scale||1) : 0;
  const f = foot ? foot.getBoundingClientRect().height / (sheet._scale||1) : 0;
  if(!h && !f) return;
  sheet.style.setProperty('--hpad', Math.round(h) + 'px');
  sheet.style.setProperty('--bpad', Math.round(f) + 'px');
  sheet.dataset.ready = '1';
}

/* ملاءمة حجم الورقة لمساحة المعاينة */
function fitSheet(){
  const stage = $('#preview');
  if(!stage) return;
  const sheet = stage.querySelector('.sheet');
  if(!sheet) return;
  const avail = stage.clientWidth;
  const w = sheet.offsetWidth || 794;
  const sc = Math.max(.32, Math.min(1, avail / w));
  sheet._scale = sc;
  sheet.style.transform = `scale(${sc})`;
  stage.style.height = Math.round(sheet.offsetHeight * sc) + 'px';
  adaptPadding(sheet);
}
window.addEventListener('resize', ()=>{ if(currentRoute==='new') fitSheet(); });
function bindComposer(){
  const form = $('#letterForm');
  if(form){
    form.addEventListener('input', updatePreview);
    form.addEventListener('change', e=>{
      if(e.target.hasAttribute('data-emp-select')){
        const emp = DB.employees.find(x=>x.id===e.target.value);
        if(emp){
          const set = (k,val)=>{ const el = form.querySelector(`[name="${k}"]`); if(el) el.value = val||''; };
          set('employeeName', emp.name); set('position', emp.position);
          set('department', emp.department); set('hireDate', emp.hireDate);
          set('nationalId', emp.nationalId);
          const selectedField=e.target.dataset.empSelect;
          if(selectedField && selectedField!=='employee') composerState.values[selectedField]=emp.id;
        }
      }
      updatePreview();
    });
  }
  requestAnimationFrame(fitSheet);
  if(API_ON && !composerState.editingId) refreshPreviewRef();
  $$('[data-tpl]').forEach(el=>el.onclick = ()=>{
    const v = currentValues();
    composerState = { tplId: el.dataset.tpl, values:{...v, date: v.date||todayISO()}, editingId:null, ref:null };
    render('new');
  });
  $$('[data-po-add]').forEach(btn=>btn.onclick=()=>{
    const v=currentValues(); v.items=[...(v.items||[]),{code:'',description:'',quantity:'',unitPrice:''}]; composerState.values=v; render('new');
  });
  $$('[data-po-remove]').forEach(btn=>btn.onclick=()=>{
    const v=currentValues(); if((v.items||[]).length<=1){v.items=[{code:'',description:'',quantity:'',unitPrice:''}];}
    else v.items.splice(Number(btn.dataset.poRemove),1);
    composerState.values=v; render('new');
  });
  const poImport=$('[data-po-import-table]'); if(poImport) poImport.onclick=()=>importSupplierTable($('#poTablePaste')?.value||'');
  const poFile=$('#poTableFile'); if(poFile) poFile.onchange=()=>{
    const file=poFile.files?.[0]; if(!file) return;
    if(file.size>2*1024*1024){toast('حجم ملف CSV يتجاوز 2 ميغابايت','err');poFile.value='';return;}
    const reader=new FileReader();reader.onload=()=>importSupplierTable(String(reader.result||''));reader.onerror=()=>toast('تعذرت قراءة ملف CSV','err');reader.readAsText(file);
  };

  $$('[data-act]').forEach(btn=>{
    const act = btn.dataset.act;
    if(act==='archive'){ btn.onclick = ()=>saveLetter('archived'); btn.disabled = false; }
    if(act==='archive-download') btn.onclick=()=>saveLetter('archived',{downloadAfterSave:true});
    if(act==='blank-model') btn.onclick=printBlankSupplierOrder;
    if(act==='draft') btn.onclick = ()=>saveLetter('draft');
    if(act==='pdf') btn.onclick = doPrintCurrent;
    if(act==='reset') btn.onclick = ()=>{
      if(!confirm('تفريغ الحقول والبدء بخطاب جديد؟')) return;
      freshComposer(); render('new'); toast('تم تفريغ الحقول');
    };
    if(act==='cancel-edit') btn.onclick = ()=>{ freshComposer(); render('new'); };
  });
}
function printBlankSupplierOrder(){
  const tpl=TPL_BY_ID.supplier_order;
  const values={date:todayISO(),docType:'preorder',supplierName:'',currency:'USD',items:Array.from({length:5},()=>({code:'',description:'',quantity:'',unitPrice:''}))};
  printHTML(renderSheetHTML(tpl,values,{ref:peekRef(tpl.code)}));
}
function doPrintCurrent(){
  const tpl = TPL_BY_ID[composerState.tplId];
  const v = currentValues();
  const ref = composerState.editingId ? composerState.ref : peekRef(tpl.code);
  printHTML(renderSheetHTML(tpl, v, {ref}));
}
async function saveLetter(status, options={}){
  const tpl = TPL_BY_ID[composerState.tplId];
  const v = currentValues();
  const required = tpl.fields.filter(f=>f.req && !String(v[f.k]||'').trim());
  if(required.length){
    toast('يجب تعبئة الحقول الإلزامية: ' + required.map(f=>f.label).join('، '), 'err');
    return;
  }
  if(tpl.id==='supplier_order'){
    const items=(v.items||[]).filter(x=>String(x.code||'').trim()||String(x.description||'').trim()||String(x.quantity||'').trim());
    if(!items.length){toast('أضف بنداً واحداً على الأقل لطلب المورد','err');return;}
    if(items.some(x=>!String(x.description||'').trim()||!(Number(toLatinDigits(String(x.quantity||'')))>0))){toast('أدخل وصفاً وكمية أكبر من صفر لكل بند','err');return;}
    v.items=items;
  }
  const co = activeCompany();
  const cat = CATS.find(c=>c.id===tpl.cat);
  const personField=tpl.fields.find(f=>f.k===tpl.personKey && f.type==='employee');
  const selectedPerson=personField ? DB.employees.find(e=>e.id===v[tpl.personKey]) : null;
  const person=personField ? (selectedPerson?.name||'') : (tpl.personKey ? (v[tpl.personKey]||'') : '');
  const subject = tpl.subject? tpl.subject(v,{company:co}) : '';

  if(composerState.editingId){
    const rec = DB.letters.find(l=>l.id===composerState.editingId);
    if(rec){
      Object.assign(rec, { values:{...v}, status, person, subject, supplierName:String(v._archiveSupplier||v.supplierName||'').trim(), updatedAt:Date.now() });
      await persistDoc('letter', rec);
      if(options.downloadAfterSave) printRecord(rec);
      freshComposer(tpl.id);
      toast('تم تحديث الخطاب ' + rec.ref);
      go('archive');
      return;
    }
  }
  const ref = await commitRef(tpl.code);
  const rec = {
    id:uid(), ref, tplId:tpl.id, tplCode:tpl.code, tplName:tpl.name, tplCat:tpl.cat, tplCatName:cat.name,
    companyId:co.id, companyShort:co.short, values:{...v}, person, subject,
    supplierName:String(v._archiveSupplier||v.supplierName||'').trim(),
    status, createdAt:Date.now(),
  };
  DB.letters.unshift(rec);
  await persistDoc('letter', rec);
  if(options.downloadAfterSave) printRecord(rec);
  freshComposer(tpl.id);
  toast(status==='archived' ? `تم الأرشفة برقم ${ref}` : `حُفظت المسودة برقم ${ref}`);
  go('archive');
}

/* --- تسجيل وثائق الموردين حسب التسليم --- */
function supplierDeliveryModal(){
  const bg=$('#modalBg');
  bg.innerHTML=`<div class="modal" style="max-width:760px">
    <div class="modal-h"><h3>📥 تسجيل تسليم ووثائقه الواردة</h3><div class="spacer"></div><button class="btn btn-sm" data-close>✕</button></div>
    <div class="modal-b"><form id="supplierDeliveryForm" class="grid2">
      <div class="field span2"><label>اسم المورد <span class="req">*</span></label><input name="supplierName" list="supplierDeliveryNames" required placeholder="اسم الشركة / المورد"><datalist id="supplierDeliveryNames">${supplierNames().map(n=>`<option value="${esc(n)}">`).join('')}</datalist></div>
      <div class="field"><label>رقم / مرجع التسليم</label><input name="deliveryRef" placeholder="رقم الشحنة أو إذن التسليم"></div>
      <div class="field"><label>تاريخ التسليم</label><input type="date" name="deliveryDate" value="${todayISO()}"></div>
      <div class="field"><label>الشركة المستلمة</label><select name="companyId">${DB.companies.map(c=>`<option value="${esc(c.id)}" ${c.id===DB.settings.activeCompany?'selected':''}>${esc(c.short)}</option>`).join('')}</select></div>
      <div class="field span2"><label>ملاحظات</label><textarea name="notes" rows="2" placeholder="وصف الشحنة أو ملاحظات الاستلام"></textarea></div>
      <div class="field span2"><label>الوثائق المرفقة <span class="req">*</span></label><input id="supplierFiles" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"><div class="small muted mt8">اختر ملفات هذا التسليم معاً ليتم تجميعها في ملف المورد. الحد الأقصى 5 ميغابايت لكل ملف و10 ميغابايت للتسليم.</div><div class="small mt8" id="supplierFilesLabel">لم يتم اختيار ملفات</div></div>
    </form></div>
    <div class="modal-f"><button class="btn btn-primary" data-supplier-delivery-save>حفظ التسليم</button><button class="btn" data-close>إلغاء</button></div>
  </div>`;
  bg.classList.add('open'); $$('[data-close]',bg).forEach(b=>b.onclick=()=>bg.classList.remove('open'));
  const fileInput=$('#supplierFiles',bg), label=$('#supplierFilesLabel',bg);
  if(fileInput) fileInput.onchange=()=>{const files=[...fileInput.files];label.textContent=files.length?files.map(f=>`${f.name} (${(f.size/1024).toFixed(0)} ك.ب)`).join(' · '):'لم يتم اختيار ملفات';};
  $('[data-supplier-delivery-save]',bg).onclick=async()=>{
    const button=$('[data-supplier-delivery-save]',bg);
    const form=$('#supplierDeliveryForm',bg), data=Object.fromEntries(new FormData(form).entries());
    const files=[...(fileInput?.files||[])];
    if(!String(data.supplierName||'').trim()){toast('اسم المورد مطلوب','err');return;}
    if(!files.length){toast('أرفق وثيقة واحدة على الأقل لهذا التسليم','err');return;}
    if(files.some(f=>f.size>5*1024*1024)||files.reduce((n,f)=>n+f.size,0)>10*1024*1024){toast('الحد الأقصى 5 ميغابايت للملف و10 ميغابايت لمجموع التسليم','err');return;}
    button.disabled=true;
    try{
      const documents=await Promise.all(files.map(async f=>({id:'supfile_'+uid(),title:f.name,fileName:f.name,fileType:f.type||'application/octet-stream',size:f.size,fileData:await fileToDataURL(f)})));
      const record={id:'supdel_'+uid(),supplierDelivery:true,supplierName:String(data.supplierName).trim(),deliveryRef:String(data.deliveryRef||'').trim(),deliveryDate:data.deliveryDate||'',companyId:data.companyId||DB.settings.activeCompany,notes:String(data.notes||'').trim(),documents,createdAt:Date.now(),updatedAt:Date.now()};
      DB.groupDocs.unshift(record);
      try{await persistDoc('group_doc',record);}catch(err){DB.groupDocs=DB.groupDocs.filter(d=>d.id!==record.id);throw err;}
      bg.classList.remove('open');supplierArchiveFilter=record.supplierName;render('archive');toast('تم حفظ التسليم ووثائقه في ملف المورد');
    }catch(err){button.disabled=false;toast('تعذّر حفظ التسليم أو مرفقاته. تحقق من الاتصال وحاول مجدداً.','err');console.error('supplier delivery save failed',err);}
  };
}

/* --- الأرشيف --- */
function bindArchive(){
  $$('[data-archive-section]').forEach(b=>b.onclick=()=>{archiveSection=b.dataset.archiveSection;render('archive');});
  if(archiveSection==='suppliers'){
    $$('[data-supplier-mode]').forEach(b=>b.onclick=()=>{supplierArchiveMode=b.dataset.supplierMode;render('archive');});
    const sf=$('#supplierArchiveFilter'); if(sf) sf.onchange=()=>{supplierArchiveFilter=sf.value;render('archive');};
    const add=$('[data-supplier-delivery-new]'); if(add) add.onclick=()=>supplierDeliveryModal();
    $$('[data-supplier-delivery-delete]').forEach(b=>b.onclick=async()=>{
      const rec=(DB.groupDocs||[]).find(d=>d.id===b.dataset.supplierDeliveryDelete); if(!rec) return;
      if(!confirm(`حذف تسليم المورد «${rec.supplierName}» ووثائقه؟`)) return;
      DB.groupDocs=DB.groupDocs.filter(d=>d.id!==rec.id);
      await persistDelete('group_doc',rec.id); render('archive'); toast('تم حذف التسليم ووثائقه');
    });
    $$('[data-supplier-file]').forEach(b=>b.onclick=()=>{
      const delivery=(DB.groupDocs||[]).find(d=>d.id===b.dataset.supplierFile);
      const file=(delivery?.documents||[]).find(f=>f.id===b.dataset.supplierFileId);
      if(!file?.fileData) return toast('الملف غير متاح','err');
      const a=document.createElement('a'); a.href=file.fileData; a.download=file.fileName||'document'; a.target='_blank';
      document.body.appendChild(a); a.click(); a.remove();
    });
  }
  const apply = ()=>{ render('archive'); };
  const q = $('#fq');
  if(q) q.oninput = ()=>{ archiveFilter.q = q.value; const pos=q.selectionStart; apply(); const nq=$('#fq'); if(nq){ nq.focus(); nq.setSelectionRange(pos,pos);} };
  const bind = (id,key)=>{ const el=$(id); if(el) el.onchange = ()=>{ archiveFilter[key]=el.value; apply(); }; };
  bind('#ftpl','tpl'); bind('#fco','company'); bind('#ffrom','from'); bind('#fto','to');
  const cf = $('[data-act="clear-filter"]'); if(cf) cf.onclick = ()=>{ archiveFilter={q:'',tpl:'',company:'',from:'',to:''}; apply(); };
  const csv = $('[data-act="csv"]'); if(csv) csv.onclick = exportCSV;

  $$('[data-open]').forEach(b=>b.onclick = ()=>openRecordModal(b.dataset.open));
  $$('[data-edit]').forEach(b=>b.onclick = ()=>{ const r = DB.letters.find(l=>l.id===b.dataset.edit); openComposer(r.tplId, r); go('new'); });
  $$('[data-print]').forEach(b=>b.onclick = ()=>{ const r = DB.letters.find(l=>l.id===b.dataset.print); printRecord(r); });
  $$('[data-del]').forEach(b=>b.onclick = async ()=>{
    const r = DB.letters.find(l=>l.id===b.dataset.del);
    if(confirm(`حذف الخطاب ${r.ref} نهائياً؟`)){
      DB.letters = DB.letters.filter(l=>l.id!==r.id);
      await persistDelete('letter', r.id);
      toast('تم الحذف'); render('archive');
    }
  });
}
function printRecord(r){
  const tpl = TPL_BY_ID[r.tplId];
  const co = companyById(r.companyId);
  printHTML(renderSheetHTML(tpl, r.values, {ref:r.ref, company:co}));
}
function openRecordModal(id){
  const r = DB.letters.find(l=>l.id===id); if(!r) return;
  const tpl = TPL_BY_ID[r.tplId];
  const co = companyById(r.companyId);
  const bg = $('#modalBg');
  bg.innerHTML = `<div class="modal" style="max-width:900px">
    <div class="modal-h"><h3>${esc(r.tplName)} — ${esc(r.ref)}</h3><div class="spacer"></div>
      <button class="btn btn-sm" data-close>✕</button></div>
    <div class="modal-b" style="background:#5b6b86;padding:14px">
      <div style="zoom:.66">${renderSheetHTML(tpl, r.values, {ref:r.ref, company:co})}</div>
    </div>
    <div class="modal-f">
      <button class="btn btn-gold" data-mprint>🖨 طباعة / PDF</button>
      <button class="btn" data-medit>✏️ تعديل</button>
      <div class="spacer"></div>
      <span class="badge ${r.status==='archived'?'green':'gold'}">${r.status==='archived'?'مؤرشف':'مسودة'}</span>
    </div>
  </div>`;
  bg.classList.add('open');
  bg.querySelector('[data-close]').onclick = ()=>bg.classList.remove('open');
  bg.dataset.close = '';
  bg.querySelector('[data-mprint]').onclick = ()=>printRecord(r);
  bg.querySelector('[data-medit]').onclick = ()=>{ bg.classList.remove('open'); openComposer(r.tplId, r); go('new'); };
}
function exportCSV(){
  const head = ['الرقم المرجعي','النموذج','الفئة','المعني','الموضوع','الشركة','التاريخ','الحالة'];
  const rows = [...DB.letters].sort((a,b)=>b.createdAt-a.createdAt).map(l=>[
    l.ref, l.tplName, l.tplCatName||'', l.person||'', l.subject||'', l.companyShort||'',
    toISO(l.createdAt), l.status==='archived'?'مؤرشف':'مسودة'
  ]);
  const csv = '\uFEFF' + [head, ...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  download(new Blob([csv],{type:'text/csv;charset=utf-8'}), 'سجل_الخطابات.csv');
}

/* --- الموظفون --- */
function bindEmployees(){
  const q = $('#empq');
  if(q) q.oninput = ()=>{
    const t = q.value.trim();
    const list = DB.employees.filter(e=>!t || (`${e.name} ${e.position} ${e.department} ${e.nationalId}`).includes(t));
    $('#empTable').innerHTML = employeesTable(list);
    bindEmployeeRows();
  };
  bindEmployeeRows();
  const nb = $('[data-act="emp-new"]'); if(nb) nb.onclick = ()=>employeeModal();
  const im = $('[data-act="emp-import"]'); if(im) im.onclick = ()=>toast('الاستيراد: أضف الموظفين يدوياً أو استورد نسخة JSON من الإعدادات','err');
}
function bindEmployeeRows(){
  $$('[data-emp-edit]').forEach(b=>b.onclick = ()=>employeeModal(DB.employees.find(e=>e.id===b.dataset.empEdit)));
  $$('[data-emp-del]').forEach(b=>b.onclick = async ()=>{
    if(confirm('حذف هذا الموظف من القائمة؟')){
      DB.employees = DB.employees.filter(e=>e.id!==b.dataset.empDel);
      await persistDelete('employee', b.dataset.empDel);
      render('employees'); toast('تم الحذف');
    }
  });
}
function employeeModal(emp){
  const e = emp || {id:'', name:'', position:'', department:'', nationalId:'', hireDate:'', companyId:DB.settings.activeCompany, phone:''};
  const bg = $('#modalBg');
  bg.innerHTML = `<div class="modal">
    <div class="modal-h"><h3>${emp?'تعديل بيانات موظف':'إضافة موظف'}</h3><div class="spacer"></div><button class="btn btn-sm" data-close>✕</button></div>
    <div class="modal-b">
      <form id="empForm" class="grid2">
        <div class="field span2"><label>الاسم الكامل <span class="req">*</span></label><input name="name" value="${esc(e.name)}" required></div>
        <div class="field"><label>الوظيفة</label><input name="position" value="${esc(e.position)}"></div>
        <div class="field"><label>القسم / الإدارة</label><input name="department" value="${esc(e.department)}"></div>
        <div class="field"><label>الرقم الوطني</label><input name="nationalId" value="${esc(e.nationalId)}"></div>
        <div class="field"><label>تاريخ الالتحاق</label><input type="date" name="hireDate" value="${esc(e.hireDate)}"></div>
        <div class="field"><label>الهاتف</label><input name="phone" value="${esc(e.phone||'')}"></div>
        <div class="field"><label>الشركة</label>
          <select name="companyId">${DB.companies.map(c=>`<option value="${c.id}" ${c.id===(e.companyId||DB.settings.activeCompany)?'selected':''}>${esc(c.short)}</option>`).join('')}</select></div>
      </form>
    </div>
    <div class="modal-f"><button class="btn btn-primary" data-save>حفظ</button><button class="btn" data-close>إلغاء</button></div>
  </div>`;
  bg.classList.add('open');
  $$('[data-close]',bg).forEach(b=>b.onclick=()=>bg.classList.remove('open'));
  $('[data-save]',bg).onclick = async ()=>{
    const saveButton=$('[data-save]',bg);
    const f = $('#empForm'); const data = Object.fromEntries(new FormData(f).entries());
    if(!data.name.trim()){ toast('الاسم مطلوب','err'); f.querySelector('[name=name]').focus(); return; }
    saveButton.disabled=true;
    try{
      if(emp){
        const previous={...emp};
        Object.assign(emp,data);
        try{ await persistDoc('employee',emp); }
        catch(err){ Object.assign(emp,previous); throw err; }
        toast('تم التحديث');
      } else {
        const ne={id:uid(),...data};
        DB.employees.push(ne);
        try{ await persistDoc('employee',ne); }
        catch(err){ DB.employees=DB.employees.filter(e=>e.id!==ne.id); throw err; }
        toast('تمت الإضافة');
      }
      bg.classList.remove('open'); render('employees');
    }catch(err){
      saveButton.disabled=false;
      toast('تعذّر حفظ بيانات الموظف. تحقق من الاتصال ثم أعد المحاولة.','err');
      console.error('employee save failed',err);
    }
  };
}

/* --- الشركات --- */
/* ============================================================
   محرّر نموذج الترويسة (ترويسة / تذييل / علامة مائية / نموذج كامل)
   ============================================================ */
let stdDraft = null;      // نسخة عمل أثناء التعديل

function readImageFile(file, opts={}){
  const maxW = opts.maxW || 2000;
  const forcePng = !!opts.png;
  return new Promise((resolve, reject)=>{
    if(!file) return reject(new Error('no file'));
    if(!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type || '')){
      return reject(new Error('الصيغة غير مدعومة — استخدم PNG أو JPG'));
    }
    const fr = new FileReader();
    fr.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const cx = cv.getContext('2d');
        if(!forcePng){ cx.fillStyle = '#fff'; cx.fillRect(0,0,w,h); }
        cx.drawImage(img, 0, 0, w, h);
        try{
          resolve(forcePng ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.9));
        }catch(e){ resolve(fr.result); }
      };
      img.onerror = ()=> reject(new Error('ملف صورة غير صالح'));
      img.src = fr.result;
    };
    fr.onerror = ()=> reject(new Error('تعذّر قراءة الملف'));
    fr.readAsDataURL(file);
  });
}

function stdSlotHTML(key, label, hint, value, dflt){
  const src = value || dflt;
  const custom = !!value;
  return `<div class="slot">
    <div class="slot-h">
      <b>${label}</b>
      ${custom? '<span class="badge gold">مخصص</span>' : '<span class="badge green">افتراضي</span>'}
    </div>
    <div class="slot-prev">${src? `<img src="${src}" alt="">` : '<div class="slot-empty">لا توجد صورة</div>'}</div>
    <div class="slot-actions">
      <label class="btn btn-sm" style="margin:0">
        ${custom? 'استبدال' : 'رفع صورة'}
        <input type="file" accept="image/png,image/jpeg,image/webp" data-upload="${key}" style="display:none">
      </label>
      ${custom? `<button class="btn btn-sm btn-red" data-clear="${key}">🗑 حذف</button>`:''}
      ${custom? `<button class="btn btn-sm" data-reset="${key}">↺ افتراضي</button>`:''}
    </div>
    <div class="small muted" style="font-size:10.5px">${hint}</div>
  </div>`;
}

function stationeryModal(co, stdId){
  const list = stationeriesOf(co);
  const existing = stdId ? list.find(x=>x.id===stdId) : null;
  const base = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: 'std-' + uid(), name: 'نموذج ترويسة جديد', mode: 'sections',
    layout: co.layout || 'ais', headerImg:'', footerImg:'', watermarkImg:'',
    useWatermark: true, padTop: 45, padBottom: 45,
  };
  stdDraft = base;
  renderStationeryModal(co, !!existing);
}

function renderStationeryModal(co, isEdit){
  const d = stdDraft;
  const dl = defaultAssetsFor(d.layout);
  const bg = $('#modalBg');
  const fullpage = d.mode === 'fullpage';
  bg.innerHTML = `<div class="modal" style="max-width:820px">
    <div class="modal-h"><h3>${isEdit?'تعديل نموذج الترويسة':'نموذج ترويسة جديد'} — ${esc(co.short)}</h3>
      <div class="spacer"></div><button class="btn btn-sm" data-close>✕</button></div>
    <div class="modal-b">
      <div class="grid2">
        <div class="field"><label>اسم النموذج</label>
          <input id="stdName" value="${esc(d.name)}" placeholder="مثال: ترويسة الخطابات الرسمية"></div>
        <div class="field"><label>طريقة التركيب</label>
          <select id="stdMode">
            <option value="sections" ${!fullpage?'selected':''}>ترويسة أعلى + تذييل أسفل (الوضع العادي)</option>
            <option value="fullpage" ${fullpage?'selected':''}>نموذج كامل — صورة صفحة A4 كاملة</option>
          </select></div>
        <div class="field"><label>التصميم الأساسي (للصور الافتراضية)</label>
          <select id="stdLayout">
            <option value="ais" ${d.layout==='ais' || (!d.layout)?'selected':''}>الصداقة المثالية (أغذية — AIS)</option>
            <option value="aisbm" ${d.layout==='aisbm'?'selected':''}>الصداقة المثالية (مواد بناء)</option>
            <option value="group" ${d.layout==='group'?'selected':''}>ترويسة المجموعة المشتركة (AIS)</option>
          </select></div>
        <div class="field"><label>&nbsp;</label>
          <label class="flex" style="gap:8px;font-size:13px;padding-top:9px">
            <input type="checkbox" id="stdWM" ${d.useWatermark!==false?'checked':''}> إظهار العلامة المائية
          </label></div>
      </div>

      <div class="hr"></div>

      ${fullpage? `
        <div class="alert info" style="margin-bottom:10px">
          ارفع <b>صورة الصفحة كاملة</b> (A4) بترويسة وتذييل مدمجين — سيُكتب نص الخطاب فوقها.
          إن كان لديك ملف PDF، حوّل صفحته الأولى إلى صورة PNG/JPG أولاً.
        </div>
        ${stdSlotHTML('headerImg', 'صورة النموذج الكامل (صفحة A4)', 'مقاس مفضل: 1240×1754 بكسل أو أعلى (بنسبة 1:1.414)', d.headerImg, '')}
        <div class="grid2 mt14">
          <div class="field"><label>الهامش الأعلى للنص (مم)</label><input type="number" id="stdPadTop" value="${d.padTop??45}" min="0" max="150"></div>
          <div class="field"><label>الهامش الأسفل للنص (مم)</label><input type="number" id="stdPadBottom" value="${d.padBottom??45}" min="0" max="150"></div>
        </div>
      ` : `
        <div class="slots">
          ${stdSlotHTML('headerImg', 'الترويسة (أعلى الصفحة)', 'عرض كامل للصفحة — PNG أو JPG', d.headerImg, dl.header)}
          ${stdSlotHTML('footerImg', 'التذييل (أسفل الصفحة)', 'عرض كامل للصفحة — PNG أو JPG', d.footerImg, dl.footer)}
          ${stdSlotHTML('watermarkImg', 'العلامة المائية', 'شعار شفاف PNG (اختياري)', d.watermarkImg, dl.watermark)}
        </div>
      `}
      <div class="small muted mt14">الصور المرفوعة تُخزَّن داخل الأرشيف المشترك. «حذف» يعيد الصورة الافتراضية للتصميم المحدد.</div>
    </div>
    <div class="modal-f">
      <button class="btn btn-primary" data-std-save>💾 حفظ النموذج</button>
      <button class="btn" data-close>إلغاء</button>
      <div class="spacer"></div>
      <button class="btn btn-sm" data-std-preview>👁 معاينة على خطاب</button>
    </div>
  </div>`;
  bg.classList.add('open');
  const reopen = ()=>renderStationeryModal(co, isEdit);

  $$('[data-close]',bg).forEach(b=>b.onclick=()=>{ bg.classList.remove('open'); stdDraft=null; });
  $('#stdMode',bg).onchange = e=>{ stdDraft.mode = e.target.value; reopen(); };
  $('#stdLayout',bg).onchange = e=>{ stdDraft.layout = e.target.value; reopen(); };
  $('#stdWM',bg).onchange = e=>{ stdDraft.useWatermark = e.target.checked; };
  $('#stdName',bg).oninput = e=>{ stdDraft.name = e.target.value; };
  const pt = $('#stdPadTop'), pb = $('#stdPadBottom');
  if(pt) pt.oninput = e=>{ stdDraft.padTop = Number(e.target.value); };
  if(pb) pb.oninput = e=>{ stdDraft.padBottom = Number(e.target.value); };

  $$('[data-upload]',bg).forEach(inp=>{
    inp.onchange = async ()=>{
      const file = inp.files[0]; if(!file) return;
      try{
        const isWM = inp.dataset.upload === 'watermarkImg';
        stdDraft[inp.dataset.upload] = await readImageFile(file, { maxW: isWM ? 1400 : 2200, png: isWM });
        reopen(); toast('تم تحميل الصورة');
      }catch(err){ toast(err.message || 'تعذّر تحميل الصورة','err'); }
    };
  });
  $$('[data-clear]',bg).forEach(b=>b.onclick = ()=>{
    stdDraft[b.dataset.clear] = ''; reopen(); toast('حُذفت الصورة — سيُستخدم الافتراضي');
  });
  $$('[data-reset]',bg).forEach(b=>b.onclick = ()=>{
    stdDraft[b.dataset.reset] = ''; reopen(); toast('تمت استعادة الافتراضي');
  });

  $('[data-std-preview]',bg).onclick = ()=>{
    const co2 = co;
    const tpl = TPL_BY_ID[composerState.tplId] || allTemplates(false)[0];
    const v = Object.keys(composerState.values||{}).length ? composerState.values : { date: todayISO(), employeeName:'اسم الموظف', position:'الوظيفة', destination:'الجهة المعنية' };
    printHTML(renderSheetHTML(tpl, v, { ref: peekRef(tpl.code), company: co2, stationery: stdDraft }));
  };

  $('[data-std-save]',bg).onclick = async ()=>{
    const idx = co.stationeries.findIndex(x=>x.id === stdDraft.id);
    const payload = JSON.parse(JSON.stringify(stdDraft));
    payload.name = (payload.name||'').trim() || 'نموذج ترويسة';
    if(idx >= 0) co.stationeries[idx] = payload;
    else co.stationeries.push(payload);
    if(!co.activeStationeryId || co.stationeries.length === 1) co.activeStationeryId = payload.id;
    await persistDoc('company', co);
    bg.classList.remove('open'); stdDraft = null;
    toast('تم حفظ نموذج الترويسة');
    render('companies');
  };
}

function bindCompanies(){
  const parsePair = v => (v||'').split('|');
  $$('[data-std-active]').forEach(b=>b.onclick = async ()=>{
    const [coId, stdId] = parsePair(b.dataset.stdActive);
    const co = companyById(coId);
    co.activeStationeryId = stdId;
    await persistDoc('company', co);
    toast('تم تعيين النموذج النشط'); render('companies');
  });
  $$('[data-std-edit]').forEach(b=>b.onclick = ()=>{
    const [coId, stdId] = parsePair(b.dataset.stdEdit);
    stationeryModal(companyById(coId), stdId);
  });
  $$('[data-std-new]').forEach(b=>b.onclick = ()=>stationeryModal(companyById(b.dataset.stdNew), null));
  $$('[data-std-copy]').forEach(b=>b.onclick = async ()=>{
    const [coId, stdId] = parsePair(b.dataset.stdCopy);
    const co = companyById(coId);
    const src = co.stationeries.find(x=>x.id===stdId);
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'std-' + uid();
    copy.name = (src.name || 'نموذج') + ' — نسخة';
    co.stationeries.push(copy);
    await persistDoc('company', co);
    toast('تم إنشاء نموذج ثانٍ — عدّله كما تريد'); render('companies');
  });
  $$('[data-std-del]').forEach(b=>b.onclick = async ()=>{
    const [coId, stdId] = parsePair(b.dataset.stdDel);
    const co = companyById(coId);
    if(co.stationeries.length <= 1){ toast('يجب الإبقاء على نموذج واحد على الأقل','err'); return; }
    const std = co.stationeries.find(x=>x.id===stdId);
    if(!confirm(`حذف النموذج «${std.name}»؟`)) return;
    co.stationeries = co.stationeries.filter(x=>x.id!==stdId);
    if(co.activeStationeryId === stdId) co.activeStationeryId = co.stationeries[0].id;
    await persistDoc('company', co);
    toast('تم حذف النموذج'); render('companies');
  });

  $$('[data-co-active]').forEach(b=>b.onclick = async ()=>{
    await persistSettings({activeCompany: b.dataset.coActive});
    toast('تم تعيين الشركة النشطة'); render('companies');
  });
  $$('[data-co-edit]').forEach(b=>b.onclick = ()=>companyModal(DB.companies.find(c=>c.id===b.dataset.coEdit)));
  $$('[data-co-del]').forEach(b=>b.onclick = async ()=>{
    if(confirm('حذف هذه الشركة؟')){
      DB.companies = DB.companies.filter(c=>c.id!==b.dataset.coDel);
      await persistDelete('company', b.dataset.coDel);
      render('companies');
    }
  });
  const nb = $('[data-co-new]'); if(nb) nb.onclick = ()=>companyModal();
}
function companyImageUploadHTML(key,label,hint,value){
  return `<div class="slot">
    <div class="slot-h"><b>${esc(label)}</b></div>
    <div class="slot-prev" data-company-img-preview="${key}">${value?`<img src="${esc(value)}" alt="">`:'<div class="slot-empty">لا توجد صورة</div>'}</div>
    <div class="slot-actions"><label class="btn btn-sm" style="margin:0">استيراد صورة<input type="file" accept="image/png,image/jpeg,image/webp" data-company-image="${key}" style="display:none"></label>
      <button type="button" class="btn btn-sm btn-red" data-company-img-clear="${key}" ${value?'':'disabled'}>مسح</button></div>
    <div class="small muted" style="font-size:10.5px">${esc(hint)}</div>
  </div>`;
}
function companyModal(co){
  const isNew = !co;
  const c = co || {id:'', name:'', short:'', code:'', nameEn:'', address:'', phone:'', web:'', email:'', signTitle:'المدير العام', signName:'', headerImg:'', footerImg:'', watermarkImg:'', useWatermark:true, refLabel:'الرقم', layout:'ais'};
  const companyImages={headerImg:c.headerImg||'',footerImg:c.footerImg||'',watermarkImg:c.watermarkImg||''};
  const bg = $('#modalBg');
  bg.innerHTML = `<div class="modal">
    <div class="modal-h"><h3>${isNew?'إضافة شركة':'تعديل بيانات الشركة'}</h3><div class="spacer"></div><button class="btn btn-sm" data-close>✕</button></div>
    <div class="modal-b">
      <form id="coForm" class="grid2">
        <div class="field span2"><label>الاسم الكامل <span class="req">*</span></label><input name="name" value="${esc(c.name)}" required></div>
        <div class="field"><label>الاسم المختصر</label><input name="short" value="${esc(c.short)}"></div>
        <div class="field"><label>رمز الشركة (للترقيم)</label><input name="code" value="${esc(c.code)}" placeholder="AIS"></div>
        <div class="field span2"><label>العنوان</label><input name="address" value="${esc(c.address)}"></div>
        <div class="field"><label>الهاتف</label><input name="phone" value="${esc(c.phone)}"></div>
        <div class="field"><label>البريد الإلكتروني</label><input name="email" value="${esc(c.email)}"></div>
        <div class="field"><label>الموقع الإلكتروني</label><input name="web" value="${esc(c.web)}"></div>
        <div class="field"><label>صفة الموقّع</label><input name="signTitle" value="${esc(c.signTitle)}"></div>
        <div class="field span2"><label>اسم الموقّع (اختياري)</label><input name="signName" value="${esc(c.signName)}"></div>
        ${isNew? `<div class="field span2"><div class="alert info" style="margin:0">يمكنك استيراد صور الترويسة والتذييل الآن؛ ستظهر تلقائياً في نموذج الشركة الأول، ويمكن تغييرها أو إضافة نماذج أخرى لاحقاً.</div><div class="slots mt8" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">${companyImageUploadHTML('headerImg','الترويسة','صورة أعلى الصفحة — PNG أو JPG',companyImages.headerImg)}${companyImageUploadHTML('footerImg','التذييل','صورة أسفل الصفحة — PNG أو JPG',companyImages.footerImg)}${companyImageUploadHTML('watermarkImg','العلامة المائية','يفضّل PNG شفاف',companyImages.watermarkImg)}</div></div>`:''}
        <div class="field span2">
          <div class="alert info" style="margin:0">
            <div><b>الترويسة والتذييل</b> تُدار من «نماذج الترويسة» في صفحة الشركات (يمكن أن يكون للشركة عدة نماذج،
            ويمكن حذف أي صورة والرجوع إلى الافتراضي).</div>
            <button class="btn btn-sm mt8" type="button" id="coStdBtn">🖼 إدارة نماذج الترويسة</button>
          </div>
        </div>
        <div class="field"><label>تسمية الرقم المرجعي</label>
          <input name="refLabel" value="${esc(c.refLabel||'الرقم')}" placeholder="الرقم / الرقم الاشاري">
        </div>
        <div class="field"><label>نموذج الترويسة</label>
          <select name="layout">
            <option value="ais" ${c.layout!=='aisbm'?'selected':''}>الصداقة المثالية (أغذية)</option>
            <option value="aisbm" ${c.layout==='aisbm'?'selected':''}>الصداقة المثالية (مواد بناء)</option>
          </select>
        </div>
        <label class="flex span2" style="gap:8px;font-size:13.5px">
          <input type="checkbox" name="useWatermark" ${c.useWatermark!==false?'checked':''}> إظهار العلامة المائية في الخطابات
        </label>
      </form>
    </div>
    <div class="modal-f"><button class="btn btn-primary" data-save>حفظ</button><button class="btn" data-close>إلغاء</button></div>
  </div>`;
  bg.classList.add('open');
  $$('[data-close]',bg).forEach(b=>b.onclick=()=>bg.classList.remove('open'));
  if(isNew){
    const refreshCompanyImage=key=>{
      const preview=bg.querySelector(`[data-company-img-preview="${key}"]`);
      const clear=bg.querySelector(`[data-company-img-clear="${key}"]`);
      if(preview) preview.innerHTML=companyImages[key]?`<img src="${esc(companyImages[key])}" alt="">`:'<div class="slot-empty">لا توجد صورة</div>';
      if(clear) clear.disabled=!companyImages[key];
    };
    $$('[data-company-image]',bg).forEach(inp=>inp.onchange=async()=>{
      const file=inp.files[0]; if(!file) return;
      try{
        const key=inp.dataset.companyImage, isWM=key==='watermarkImg';
        companyImages[key]=await readImageFile(file,{maxW:isWM?1400:2200,png:isWM});
        refreshCompanyImage(key); toast('تم تحميل الصورة');
      }catch(err){toast(err.message||'تعذّر تحميل الصورة','err');}
    });
    $$('[data-company-img-clear]',bg).forEach(btn=>btn.onclick=()=>{
      companyImages[btn.dataset.companyImgClear]=''; refreshCompanyImage(btn.dataset.companyImgClear);
    });
  }
  const stdBtn=$('#coStdBtn',bg);
  if(stdBtn) stdBtn.onclick=()=>{ bg.classList.remove('open'); render('companies'); };
  $('[data-save]',bg).onclick = async ()=>{
    const data = Object.fromEntries(new FormData($('#coForm')).entries());
    data.useWatermark = $('#coForm [name=useWatermark]').checked;
    if(!data.name.trim()){ toast('الاسم مطلوب','err'); return; }
    if(isNew){
      const nco = {id:uid(), ...c, ...data, ...companyImages};
      DB.companies.push(nco); await persistDoc('company', nco); toast('تمت إضافة الشركة');
    } else { Object.assign(co, data); await persistDoc('company', co); toast('تم التحديث'); }
    bg.classList.remove('open'); render('companies');
  };
}

/* --- الإعدادات --- */
function bindSettings(){
  /* --- صيغة الرقم المرجعي --- */
  const patEl = $('#refPattern'), demo = $('#refDemo'), preset = $('#refPreset');
  const refreshDemo = ()=>{
    const p = (patEl.value || REF_PATTERN_DEFAULT).trim() || REF_PATTERN_DEFAULT;
    demo.textContent = formatRef(p, { c: activeCompany().code, t:'SHA', y:new Date().getFullYear(), m:new Date().getMonth()+1, n:17 });
  };
  if(patEl){ patEl.oninput = refreshDemo; refreshDemo(); }
  if(preset) preset.onchange = ()=>{ if(preset.value){ patEl.value = preset.value; refreshDemo(); } };
  $$('[data-token]').forEach(el=>el.onclick = ()=>{
    const t = el.dataset.token, i = patEl.selectionStart ?? patEl.value.length;
    patEl.value = patEl.value.slice(0,i) + t + patEl.value.slice(i);
    patEl.focus(); patEl.setSelectionRange(i+t.length, i+t.length); refreshDemo();
  });
  const refSave = $('[data-act="ref-save"]');
  if(refSave) refSave.onclick = async ()=>{
    const p = (patEl.value||'').trim();
    if(!p || !/\{n/.test(p)){ toast('الصيغة يجب أن تحتوي على {n} أو {n:04d}','err'); return; }
    await persistSettings({refPattern:p});
    composerState.serverRef = null;
    toast('تم حفظ صيغة الرقم: ' + p);
  };
  const refDefault = $('[data-act="ref-default"]');
  if(refDefault) refDefault.onclick = async ()=>{
    patEl.value = REF_PATTERN_DEFAULT; refreshDemo();
    await persistSettings({refPattern: REF_PATTERN_DEFAULT});
    composerState.serverRef = null;
    toast('تمت استعادة الصيغة الافتراضية');
  };

  const c = $('#set-city'); if(c) c.onchange = async ()=>{ await persistSettings({city:c.value}); toast('تم الحفظ'); };
  const d = $('#set-date'); if(d) d.onchange = async ()=>{ await persistSettings({dateStyle:d.value}); toast('تم الحفظ'); };
  const s = $('#set-stamp'); if(s) s.onchange = async ()=>{ await persistSettings({showStamp:s.checked}); };
  const w = $('#set-wm'); if(w) w.onchange = async ()=>{ await persistSettings({showWatermark:w.checked}); };

  const bk = $('[data-act="backup"]'); if(bk) bk.onclick = ()=>{
    if(API_ON){ window.location.href = 'api/export.json'; toast('جارٍ تنزيل النسخة الاحتياطية'); return; }
    download(new Blob([JSON.stringify(DB,null,2)],{type:'application/json'}), `نسخة_احتياطية_${todayISO()}.json`);
    toast('تم تصدير النسخة الاحتياطية');
  };
  const rs = $('[data-act="restore"]'); const rf = $('#restoreFile');
  if(rs) rs.onclick = ()=>rf.click();
  if(rf) rf.onchange = ()=>{
    const f = rf.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = async ()=>{ try{
      const db = JSON.parse(r.result);
      if(!db.companies || !db.letters) throw 0;
      if(API_ON){
        if(!confirm('سيتم استبدال كامل الأرشيف المشترك بمحتوى الملف. متابعة؟')) return;
        const res = await apiFetch('PUT','api/state',{
          settings: db.settings, companies: db.companies, employees: db.employees,
          letters: db.letters, credits: db.credits||[], groupDocs: db.groupDocs||[], trackers: db.trackers||[], counter: db.counter
        });
        if(res && res.rev) DB_REV = res.rev;
        await reloadState();
        toast('تم استيراد الأرشيف المشترك'); render('settings'); return;
      }
      DB = db; DB.settings=Object.assign({},DEFAULT_DB.settings,DB.settings||{}); refreshTemplateRegistry(); crEnsure(DB); ensureGroupDefaultsOn(DB); saveDB(true); toast('تم الاستيراد بنجاح'); render('settings');
    }catch(e){ toast('ملف غير صالح','err'); } };
    r.readAsText(f);
  };
  const tplNew=$('[data-template-new]'); if(tplNew) tplNew.onclick=()=>templateEditorModal('');
  $$('[data-template-edit]').forEach(b=>b.onclick=()=>templateEditorModal(b.dataset.templateEdit));
  $$('[data-template-toggle]').forEach(b=>b.onclick=()=>toggleCustomTemplate(b.dataset.templateToggle));
  $$('[data-template-content-edit]').forEach(b=>b.onclick=()=>templateContentEditorModal(b.dataset.templateContentEdit));
  const ruleNew=$('[data-template-rule-new]'); if(ruleNew) ruleNew.onclick=()=>textRuleEditorModal('');
  $$('[data-rule-edit]').forEach(b=>b.onclick=()=>textRuleEditorModal(b.dataset.ruleEdit));
  $$('[data-rule-delete]').forEach(b=>b.onclick=async()=>{
    if(!confirm('حذف تعديل العبارة؟')) return;
    await persistSettings({templateTextReplacements:(DB.settings.templateTextReplacements||[]).filter(x=>x.id!==b.dataset.ruleDelete)});
    render('settings'); toast('تم حذف تعديل النص');
  });

  bindUpdater();

  const sd = $('[data-act="seed"]'); if(sd) sd.onclick = ()=>seedDemo();
  const wp = $('[data-act="wipe"]'); if(wp) wp.onclick = async ()=>{
    if(!confirm('سيتم حذف كل البيانات نهائياً. متابعة؟')) return;
    if(API_ON){
      if(!confirm('تحذير: هذا يحذف أرشيف جميع المستخدمين على الخادم. متابعة؟')) return;
      await apiFetch('POST','api/wipe',{});
      await reloadState();
    } else {
      DB = structuredClone(DEFAULT_DB); refreshTemplateRegistry(); saveDB(true);
    }
    toast('تم حذف كل البيانات'); go('dash');
  };
}

/* ============================================================
   تحديث التطبيق من داخل الواجهة (بدون نسخ ملفات يدوياً)
   ============================================================ */
function bindUpdater(){
  const zone = $('#updZone'); if(!zone) return;
  const input = $('#updFile'), goBtn = $('#updGo'), nameEl = $('#updName'),
        log = $('#updLog'), reloadBtn = $('#updReload'), restartBtn = $('#updRestart');
  let picked = null;

  const pick = f=>{
    if(!f) return;
    picked = f;
    nameEl.textContent = `${f.name} — ${(f.size/1024/1024).toFixed(1)} ميغابايت`;
    goBtn.disabled = false;
    log.innerHTML = '';
    reloadBtn.style.display = 'none'; restartBtn.style.display = 'none';
  };
  input.onchange = ()=>pick(input.files[0]);
  ['dragenter','dragover'].forEach(ev=>zone.addEventListener(ev, e=>{ e.preventDefault(); zone.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev=>zone.addEventListener(ev, e=>{ e.preventDefault(); zone.classList.remove('over'); }));
  zone.addEventListener('drop', e=>{ const f = e.dataTransfer.files[0]; if(f) pick(f); });

  goBtn.onclick = async ()=>{
    if(!picked) return;
    goBtn.disabled = true;
    log.innerHTML = '<span class="muted">جارٍ التثبيت…</span>';
    try{
      const res = await fetch('api/update', {
        method:'POST', credentials:'same-origin',
        headers:{ 'Content-Type':'application/octet-stream', 'X-Filename': encodeURIComponent(picked.name) },
        body: picked
      });
      const j = await res.json();
      if(!res.ok || j.error){ throw new Error(j.error || ('HTTP ' + res.status)); }
      const list = (j.updated||[]).map(f=>`<span class="badge green">${esc(f)}</span>`).join(' ');
      log.innerHTML = `<div class="alert success" style="margin:0">
        تم تثبيت التحديث. الملفات المحدَّثة: ${list || '—'}
        ${(j.skipped&&j.skipped.length)? `<div class="small muted">تم تجاهل: ${esc(j.skipped.join(', '))}</div>`:''}
      </div>`;
      reloadBtn.style.display = 'inline-flex';
      reloadBtn.onclick = ()=>location.reload();
      if(j.restartNeeded){
        restartBtn.style.display = 'inline-flex';
        restartBtn.onclick = async ()=>{
          restartBtn.disabled = true;
          restartBtn.textContent = '⟳ جارٍ إعادة التشغيل…';
          try{ await fetch('api/restart', {method:'POST', credentials:'same-origin'}); }catch(e){}
          setTimeout(()=>location.reload(), 3500);
        };
        log.innerHTML += `<div class="alert warn" style="margin-top:8px">
          تم تحديث ملف الخادم أيضاً — اضغط <b>«إعادة تشغيل الخادم»</b> لتفعيله (يستغرق 3 ثوانٍ، ثم تُعاد الصفحة تلقائياً).</div>`;
      }else{
        setTimeout(()=>{ if(confirm('تم التثبيت — إعادة تحميل الصفحة الآن؟')) location.reload(); }, 700);
      }
    }catch(e){
      log.innerHTML = `<div class="alert warn" style="margin:0">تعذّر التثبيت: ${esc(e.message||e)}</div>`;
      goBtn.disabled = false;
    }
  };
}

/* ---------------- أدوات ملفات ---------------- */
function download(blob, name){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const fileToDataURL = f => new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f); });

/* ---------------- بيانات تجريبية ---------------- */
async function seedDemo(){
  const emps = [
    {name:'محمد علي الصادق', position:'محاسب', department:'الإدارة المالية', nationalId:'119800123456', hireDate:'2019-03-01', phone:'091 234 5678'},
    {name:'فاطمة عبدالله الزوي', position:'مسؤولة مشتريات', department:'إدارة المشتريات', nationalId:'219900654321', hireDate:'2021-09-15', phone:'094 765 4321'},
    {name:'أحمد سليم القذافي', position:'مشرف إنتاج', department:'إدارة الإنتاج', nationalId:'119700777888', hireDate:'2017-06-20', phone:'092 111 2233'},
  ].map(e=>({id:uid(), companyId:'ais', ...e}));
  DB.employees.push(...emps);
  for(const e of emps){ await persistDoc('employee', e); }
  toast('تمت إضافة 3 موظفين تجريبيين'); render('employees');
}

/* ---------------- تشغيل ---------------- */
/* ---------------- الوضع المشترك: تحميل الحالة ---------------- */
async function reloadState(keepRoute){
  const st = await apiFetch('GET','api/state');
  if(!st || st.__status) return false;
  DB = {
    version:3, settings: st.settings || {}, companies: st.companies || [],
    employees: st.employees || [], letters: st.letters || [], credits: st.credits || [],
    groupDocs: st.groupDocs || [], trackers: st.trackers || [], counter: st.counter || {},
  };
  refreshTemplateRegistry();
  DB_REV = st.rev || 0;
  ensureStationeries();
  crEnsure(DB);
  await syncInitialGroupSeedIfNeeded();
  updateSyncBadge();
  if(keepRoute) render(currentRoute);
  return true;
}
function updateSyncBadge(){
  const el = $('#syncBadge');
  const lo = $('#logoutBtn');
  if(lo){
    lo.style.display = (API_ON && API_NEEDS_LOGIN) ? 'inline-flex' : 'none';
    lo.onclick = doLogout;
  }
  if(!el) return;
  if(API_ON){
    const note = $('#modeNote');
    const dbLabel = API_STORAGE === 'postgres' ? 'قاعدة بيانات سحابية PostgreSQL' : 'الخادم المركزي';
    if(note) note.innerHTML = `وضع مشترك — الأرشيف على ${dbLabel}<br><span style="opacity:.75">كل الأجهزة ترى نفس الخطابات</span>`;
    el.className = 'badge ' + (SYNC_PENDING ? 'gold' : 'green');
    el.innerHTML = SYNC_PENDING ? '⟳ تحديثات جديدة — اضغط للتحديث' : '● أرشيف مشترك — متصل';
    el.style.cursor = 'pointer';
    el.onclick = async ()=>{ SYNC_PENDING = false; await reloadState(true); toast('تم تحديث الأرشيف'); };
  }else{
    const note = $('#modeNote');
    if(note) note.innerHTML = 'نسخة محلية — البيانات محفوظة على هذا الجهاز<br><span style="opacity:.75">الصداقة المثالية للأغذية · AIS</span>';
    el.className = 'badge grey';
    el.textContent = 'محلي (هذا المتصفح)';
    el.onclick = null;
  }
}
async function doLogout(){
  try{ await apiFetch('POST','api/logout',{}); }catch(e){}
  if(SYNC_TIMER){ clearInterval(SYNC_TIMER); SYNC_TIMER = null; }
  showLoginOverlay('تم تسجيل الخروج — أدخل كلمة المرور للمتابعة');
}
function startSyncPolling(){
  if(!API_ON || SYNC_TIMER) return;
  SYNC_TIMER = setInterval(async ()=>{
    try{
      const r = await apiFetch('GET','api/rev');
      if(r && r.__status === 401){ onAuthLost(); return; }   // جلسة منتهية
      if(!r || r.__status) return;
      if(r.rev !== DB_REV){
        if(currentRoute === 'new'){
          SYNC_PENDING = true; updateSyncBadge();   // لا نمسّ النموذج الجاري تعبئته
        }else{
          await reloadState(true);
        }
      }
    }catch(e){ /* réseau coupé : on réessaiera */ }
  }, 7000);
}

/* ---------------- شاشة كلمة المرور ---------------- */
function showLoginOverlay(message){
  let bg = $('#loginBg');
  if(!bg){
    bg = document.createElement('div');
    bg.id = 'loginBg';
    bg.className = 'modal-bg open';
    document.body.appendChild(bg);
  }
  bg.innerHTML = `<div class="modal" style="max-width:420px">
    <div class="modal-h"><h3>🔒 دخول الأرشيف المشترك</h3></div>
    <div class="modal-b">
      ${message? `<div class="alert warn">${esc(message)}</div>`:''}
      <div class="field"><label>كلمة المرور</label>
        <input type="password" id="loginPw" autocomplete="current-password" placeholder="••••••••">
      </div>
      <div class="small muted mt8">أدخل كلمة المرور المخصّصة للوصول إلى الأرشيف المشترك.</div>
    </div>
    <div class="modal-f"><button class="btn btn-primary" id="loginGo">دخول</button></div>
  </div>`;
  bg.classList.add('open');
  const go = async ()=>{
    const pw = $('#loginPw').value;
    try{
      const res = await apiFetch('POST','api/login',{password:pw});
      if(res && res.ok){
        bg.classList.remove('open');
        API_NEEDS_LOGIN = true;
        await reloadState();
        startSyncPolling();
        updateSyncBadge();
        render(currentRoute);
        toast('تم الدخول إلى الأرشيف المشترك');
      }else{
        toast((res && res.error) || 'كلمة المرور غير صحيحة','err');
      }
    }catch(e){
      toast('تعذّر الاتصال بالخادم — حاول مجدداً','err');
    }
  };
  $('#loginGo').onclick = go;
  $('#loginPw').onkeydown = e=>{ if(e.key==='Enter') go(); };
  setTimeout(()=>{ const i=$('#loginPw'); if(i) i.focus(); }, 80);
}

/* ============================================================
   تحديث تلقائي: مقارنة نسخة التطبيق بالنسخة المنشورة (version.json)
   يعمل عندما يكون التطبيق مستضافاً (GitHub Pages / خادم) — يُتجاهل في وضع الملف
   ============================================================ */
async function checkForUpdate(){
  if(location.protocol === 'file:' || location.protocol === 'about:') return;
  try{
    const r = await fetch('version.json?t=' + Date.now(), { cache:'no-store' });
    if(!r.ok) return;
    const j = await r.json();
    if(!j || !j.version || j.version === APP_VER) return;
    const el = $('#updBadge');
    if(!el) return;
    el.style.display = 'inline-flex';
    el.innerHTML = '⟳ تحديث متوفر ' + esc(j.version);
    el.title = 'الإصدار الحالي ' + APP_VER;
    el.onclick = ()=>{ location.href = location.pathname + '?v=' + encodeURIComponent(j.version); };
  }catch(e){ /* hors ligne : rien */ }
}

async function boot(){
  document.addEventListener('click', e=>{
    const g = e.target.closest('[data-go]');
    if(g){ if(g.dataset.go==='new') freshComposer(); go(g.dataset.go); return; }
    const n = e.target.closest('[data-new]'); if(n){ openComposer(n.dataset.new); go('new'); return; }
    const bg = e.target.closest('.modal-bg');
    if(bg && e.target===bg && bg.id !== 'loginBg' && bg.dataset.close!==undefined) bg.classList.remove('open');
  });
  // شعار الترويسة في القائمة الجانبية
  const em = $('#brandLogo'); if(em && ASSETS.emblem) em.src = ASSETS.emblem;

  // 1) كشف وجود خادم (أرشيف مشترك)
  try{
    const h = await apiFetch('GET','api/health');
    if(h && h.ok && h.app === 'secretariat'){
      API_ON = true;
      API_NEEDS_LOGIN = !!h.needsLogin;
      API_STORAGE = h.storage || 'sqlite';
      API_CLOUD = !!h.cloud;
      if(API_NEEDS_LOGIN && !h.authed){
        updateSyncBadge();
        render('dash');
        showLoginOverlay('هذا الأرشيف مشترك ومحمي — أدخل كلمة المرور للمتابعة');
        return;
      }
      await reloadState();
      startSyncPolling();
    }
  }catch(e){ API_ON = false; }

  updateSyncBadge();
  go('dash');
  checkForUpdate();
  setInterval(checkForUpdate, 10 * 60 * 1000);
}
document.addEventListener('DOMContentLoaded', boot);
