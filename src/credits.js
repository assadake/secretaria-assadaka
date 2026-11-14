/* ============================================================
   الاعتمادات البنكية — ملفات الاعتماد ومتابعتها حتى الإغلاق
   ============================================================
   كل ملف اعتماد = دوسية كاملة تحتوي:
     • بيانات الطلب والبنك والعميل والمبالغ والضمانات
     • الخطابات الصادرة (بالترقيم التسلسلي) والمستندات الواردة (بمهلة الرد)
     • سير الإجراءات (9 مراحل) مع تواريخها والمسؤول عنها
     • جدول الأقساط ومتابعة السداد
     • الملاحظات والسجل الزمني الكامل (Audit trail)
     • الطباعة والتصدير ثم الأرشفة عند الإغلاق
   ============================================================ */

const CREDIT_STEPS = [
  { k:'open',     name:'فتح الملف',         icon:'📂', desc:'تسجيل الطلب وبيانات العميل والبنك' },
  { k:'docs',     name:'تجميع المستندات',   icon:'📑', desc:'البطاقة، السجل التجاري، القوائم المالية، الضمانات' },
  { k:'submit',   name:'التقديم للبنك',     icon:'📤', desc:'إحالة الملف مع خطاب وإشعار استلام' },
  { k:'bankrev',  name:'دراسة البنك',       icon:'🔎', desc:'التحليل الائتماني والتقييم' },
  { k:'commit',   name:'قرار اللجنة',       icon:'⚖️', desc:'الموافقة أو الرفض وشروط المنح' },
  { k:'contract', name:'العقد والتأمين',    icon:'🖋️', desc:'توقيع العقد وتوثيق الضمانات' },
  { k:'disburse', name:'صرف الاعتماد',      icon:'💸', desc:'إيداع المبلغ في حساب الشركة' },
  { k:'follow',   name:'المتابعة والأقساط', icon:'📆', desc:'سداد الأقساط ومتابعة الالتزام' },
  { k:'close',    name:'إغلاق وأرشفة',      icon:'🗃️', desc:'إبراء الذمة ونقل الملف إلى الأرشيف' },
];

const CREDIT_FACILITIES = [
  'تسهيل جاري', 'اعتماد مستندي (LC)', 'قرض متوسط الأجل', 'قرض طويل الأجل',
  'مرابحة', 'إجارة منتهية بالتمليك', 'ضمان بنكي', 'تمويل رأس المال العامل',
  'تمويل مشروع', 'إعادة تمويل', 'أخرى',
];

const CREDIT_BANKS = [
  'مصرف الجمهورية', 'المصرف التجاري الوطني', 'مصرف الوحدة', 'مصرف الصحاري',
  'مصرف شمال أفريقيا', 'مصرف النوران', 'مصرف الأمان', 'مصرف المتوسط',
  'مصرف اليقين', 'البنك الإسلامي الليبي', 'مصرف الواحة', 'مصرف التجاري الليبي',
  'المصرف الليبي الخارجي', 'مصرف الإدخار والاستثمار العقاري',
];

const CREDIT_DOC_TYPES_OUT = [
  'خطاب طلب تمويل', 'خطاب إحالة ملف', 'خطاب استكمال مستندات', 'خطاب متابعة / تذكير',
  'خطاب طلب تعديل شروط', 'خطاب إفادة سداد', 'خطاب إغلاق الملف', 'خطاب آخر',
];
const CREDIT_DOC_TYPES_IN = [
  'إشعار استلام ملف', 'طلب مستندات ناقصة', 'موافقة مبدئية', 'قرار لجنة الائتمان',
  'عقد تمويل', 'وثيقة تأمين', 'جدول أقساط', 'كشف حساب', 'إفادة رصيد',
  'إشعار صرف', 'إشعار سداد', 'رفض الطلب', 'مستند آخر',
];

const CREDIT_DOC_STATUS = {
  draft:     { label:'مسودة',        badge:'grey'  },
  sent:      { label:'مُرسل',        badge:'blue'  },
  delivered: { label:'تم التسليم',   badge:'green' },
  pending:   { label:'بانتظار الرد', badge:'gold'  },
  received:  { label:'مستلم',        badge:'green' },
  processed: { label:'تمت المعالجة', badge:'blue'  },
  cancelled: { label:'ملغى',         badge:'red'   },
};

const CREDIT_STATUS = {
  active:   { label:'جارٍ',    badge:'blue'  },
  hold:     { label:'معلّق',   badge:'gold'  },
  approved: { label:'معتمد',   badge:'green' },
  closed:   { label:'مغلق',    badge:'grey'  },
  rejected: { label:'مرفوض',   badge:'red'   },
};

/* ---------------- أدوات مساعدة ---------------- */
function crEnsure(db){
  if(!db) return;
  if(!Array.isArray(db.credits)) db.credits = [];
  db.credits.forEach(d=>{
    d.steps = d.steps || {};
    d.docs = Array.isArray(d.docs) ? d.docs : [];
    d.events = Array.isArray(d.events) ? d.events : [];
    d.notes = Array.isArray(d.notes) ? d.notes : [];
    d.payments = Array.isArray(d.payments) ? d.payments : [];
    if(d.status === undefined) d.status = 'active';
  });
}
const creditById = id => (DB.credits||[]).find(d=>d.id===id);
const creditsSorted = () => (DB.credits||[]).slice().sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0));
const crToday = () => todayISO();
const crDays = (a,b) => Math.round((new Date(toISO(b)) - new Date(toISO(a))) / 86400000);
function crdt(iso){
  if(!iso) return '—';
  const d = new Date(iso); if(isNaN(d)) return '—';
  const p = n => String(n).padStart(2,'0');
  const t = `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`;
  return (iso.length > 10) ? `${t} — ${p(d.getHours())}:${p(d.getMinutes())}` : t;
}
function crmoney(n, cur){
  if(n === '' || n === null || n === undefined || isNaN(Number(n))) return '—';
  return `${fnum(Number(n))} ${cur||'د.ل'}`;
}

/* ---------------- شعار مصغّر للبنك ---------------- */
function creditBankMark(bank){
  const words = String(bank||'').replace(/[—–-]/g,' ').split(/\s+/)
    .filter(w=>w && !/^(مصرف|المصرف|البنك|بنك)$/.test(w));
  const letter = (words[0]||String(bank||'').trim()||'🏦').charAt(0);
  const palette = ['#12305f','#1b4180','#0a7a3c','#8a6300','#7c4dff','#b01722','#0d6e7a','#8a4b0f'];
  let h = 0; for(const ch of String(bank||'')) h = (h*31 + ch.charCodeAt(0)) % 997;
  const color = palette[h % palette.length];
  return `<span style="display:block;color:${color}">${esc(letter)}</span>`;
}

/* ---------------- الحسابات ---------------- */
function creditDoneSteps(d){
  return CREDIT_STEPS.filter(s=>d.steps && d.steps[s.k] && d.steps[s.k].done).length;
}
function creditCurrentStep(d){
  const s = CREDIT_STEPS.find(x=>!(d.steps && d.steps[x.k] && d.steps[x.k].done));
  return s || CREDIT_STEPS[CREDIT_STEPS.length-1];
}
function creditProgress(d){
  const done = creditDoneSteps(d);
  const total = CREDIT_STEPS.length;
  const pct = (d.status==='closed'||d.status==='rejected') ? 100 : Math.round(done/total*100);
  return { done, total, pct, current: creditCurrentStep(d) };
}
function creditLateDocs(d){
  return (d.docs||[]).filter(x=>x.dir==='in' && x.status==='pending' && x.dueDate && x.dueDate < crToday());
}
function creditUpcomingDocs(d){
  const t = crToday();
  return (d.docs||[]).filter(x=>x.dir==='in' && x.status==='pending' && x.dueDate && x.dueDate >= t && crDays(t, x.dueDate) <= 7);
}
function creditDocLate(doc){
  return doc.dir==='in' && ['pending'].includes(doc.status) && doc.dueDate && doc.dueDate < crToday();
}
function creditDocLateDays(doc){
  if(!creditDocLate(doc)) return 0;
  return crDays(doc.dueDate, crToday());
}
function creditNextInstallment(d){
  const list = (d.payments||[]).filter(p=>!p.paid).sort((a,b)=>String(a.due).localeCompare(String(b.due)));
  return list[0] || null;
}
function creditOverduePayments(d){
  const t = crToday();
  return (d.payments||[]).filter(p=>!p.paid && p.due && p.due < t);
}
function creditPaidTotal(d){
  return (d.payments||[]).filter(p=>p.paid).reduce((s,p)=>s+(Number(p.amount)||0),0);
}
function creditScheduleTotal(d){
  return (d.payments||[]).reduce((s,p)=>s+(Number(p.amount)||0),0);
}
function creditHealth(d){
  if(d.status==='closed') return { level:'ok', label:'مغلق ومؤرشف', reasons:[] };
  if(d.status==='rejected') return { level:'danger', label:'مرفوض', reasons:['رُفض طلب الاعتماد'] };
  const reasons = [];
  const late = creditLateDocs(d);
  const over = creditOverduePayments(d);
  if(late.length) reasons.push(`${late.length} مستند وارد تجاوز مهلة الرد`);
  if(over.length) reasons.push(`${over.length} قسط متأخر السداد`);
  if(d.targetDate && d.targetDate < crToday() && d.status==='active' && creditCurrentStep(d).k!=='close')
    reasons.push('تجاوز التاريخ المستهدف للملف');
  if(reasons.length) return { level:'danger', label: reasons[0], reasons };
  if(d.status==='hold') return { level:'warn', label:'ملف معلّق', reasons:['الملف معلّق مؤقتاً'] };
  const up = creditUpcomingDocs(d);
  if(up.length) return { level:'warn', label:`${up.length} مهلة تقترب`, reasons:up.map(x=>`${x.type||x.title} — ${fdate(x.dueDate,'short')}`) };
  const nxt = creditNextInstallment(d);
  if(nxt && crDays(crToday(), nxt.due) <= 7) return { level:'warn', label:`قسط مستحق ${fdate(nxt.due,'short')}`, reasons:['قسط اقترب موعد استحقاقه'] };
  return { level:'ok', label:'منتظم', reasons:[] };
}

/* ---------------- ترقيم المستندات والمرجع ---------------- */
function creditDocSerial(d, dir){
  return (d.docs||[]).filter(x=>x.dir===dir).length + 1;
}
function creditDocNo(d, dir, n){
  return `${dir==='out'?'ص':'و'}-${String(n).padStart(2,'0')}`;
}
async function creditCommitRef(){
  return await commitRef('CRD');
}

/* ---------------- السجل الزمني ---------------- */
function crLog(d, type, title, detail){
  d.events = d.events || [];
  d.events.unshift({ id:uid(), at:new Date().toISOString(), type, title, detail:detail||'' });
  if(d.events.length > 400) d.events.length = 400;
  d.updatedAt = Date.now();
}
async function crSave(d){
  d.updatedAt = Date.now();
  await persistDoc('credit', d);
}

/* ============================================================
   صفحة قائمة ملفات الاعتماد
   ============================================================ */
let creditFilter = { q:'', chip:'active', company:'' };

function creditStats(all){
  const active = all.filter(d=>['active','hold','approved'].includes(d.status));
  return {
    active: active.length,
    late: all.filter(d=>creditHealth(d).level==='danger' && d.status!=='closed' && d.status!=='rejected').length,
    atBank: active.filter(d=>['submit','bankrev','commit'].includes(creditCurrentStep(d).k)).length,
    approved: active.filter(d=>Number(d.approvedAmount)>0 || d.status==='approved').length,
    closed: all.filter(d=>d.status==='closed').length,
    total: all.reduce((s,d)=>s+(Number(d.approvedAmount)||0),0),
  };
}

function creditCard(d){
  const pr = creditProgress(d);
  const health = creditHealth(d);
  const late = creditLateDocs(d).length;
  const over = creditOverduePayments(d).length;
  const st = CREDIT_STATUS[d.status] || CREDIT_STATUS.active;
  const lastDoc = (d.docs||[])[0];
  return `<div class="cr-card st-${health.level}">
    <div class="cr-card-h">
      <div class="cr-bank" title="${esc(d.bank||'')}">${creditBankMark(d.bank)}</div>
      <div class="cr-card-t">
        <div class="ref">${esc(d.ref||'—')}</div>
        <h4>${esc(d.customerName||'بدون اسم عميل')}</h4>
        <div class="cust">🏦 ${esc(d.bank||'—')}${d.bankBranch? ` — ${esc(d.bankBranch)}`:''}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">
        <span class="badge ${st.badge}">${st.label}</span>
        ${late? `<span class="badge red" title="مستندات تجاوزت مهلة الرد">⏰ ${late}</span>`:''}
        ${over? `<span class="badge red" title="أقساط متأخرة">💳 ${over}</span>`:''}
      </div>
    </div>
    <div class="cr-card-b">
      <div class="cr-amounts">
        <div class="cr-amt"><span class="k">المبلغ المطلوب</span><span class="v">${crmoney(d.requestedAmount, d.currency)}</span></div>
        <div class="cr-amt ${Number(d.approvedAmount)>0?'':'miss'}"><span class="k">المبلغ المعتمد</span><span class="v">${Number(d.approvedAmount)>0? crmoney(d.approvedAmount, d.currency) : 'بانتظار الموافقة'}</span></div>
        <div class="cr-amt"><span class="k">النوع</span><span class="v" style="font-size:11.6px">${esc(d.facilityType||'—')}</span></div>
      </div>
      <div class="cr-prog">
        <div class="bar"><i class="${pr.pct===100?'done':''}" style="width:${pr.pct}%"></i></div>
        <div class="lbl">
          <span>المرحلة: <b>${pr.current.icon} ${esc(pr.current.name)}</b></span>
          <span>${pr.pct}% · ${pr.done}/${pr.total}</span>
        </div>
      </div>
      <div class="small muted" style="display:flex;gap:12px;flex-wrap:wrap">
        <span>📅 فُتح: ${fdate(toISO(d.openedAt||d.createdAt),'short')}</span>
        <span>📄 ${(d.docs||[]).length} مستند</span>
        ${d.targetDate? `<span>🎯 ${fdate(d.targetDate,'short')}</span>`:''}
        ${lastDoc? `<span>آخر حركة: ${lastDoc.date? fdate(toISO(lastDoc.date),'short'):'—'}</span>`:''}
      </div>
    </div>
    <div class="cr-card-f">
      <button class="btn btn-primary" data-cr-open="${d.id}">📂 فتح الملف</button>
      <button class="btn" data-cr-adddoc="${d.id}">+ مستند</button>
      <button class="btn btn-icon" data-cr-print="${d.id}" title="طباعة الملف">🖨</button>
      <div class="spacer"></div>
      ${health.level!=='ok'? `<span class="badge ${health.level==='danger'?'red':'gold'}" title="${esc(health.reasons.join(' | '))}">${health.level==='danger'?'⚠ يتطلب تدخلاً':'⏳ متابعة'}</span>`:''}
    </div>
  </div>`;
}

function creditAlertsStrip(all){
  const items = [];
  all.forEach(d=>{
    if(['closed','rejected'].includes(d.status)) return;
    creditLateDocs(d).forEach(x=>items.push({
      kind:'doc', level:'danger', d,
      txt:`${x.no||''} ${x.type||'مستند وارد'} — متأخر ${creditDocLateDays(x)} يوم عن مهلة الرد`,
      date:x.dueDate,
    }));
    creditUpcomingDocs(d).forEach(x=>items.push({
      kind:'doc', level:'warn', d,
      txt:`${x.no||''} ${x.type||'مستند وارد'} — المهلة تنتهي ${fdate(x.dueDate,'short')}`,
      date:x.dueDate,
    }));
    creditOverduePayments(d).forEach(p=>items.push({
      kind:'pay', level:'danger', d,
      txt:`قسط رقم ${p.n} — متأخر ${crDays(p.due, crToday())} يوم (${crmoney(p.amount,d.currency)})`,
      date:p.due,
    }));
  });
  if(!items.length) return '';
  items.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const shown = items.slice(0,6);
  return `<div class="card no-print" style="margin-bottom:16px;border-inline-start:4px solid ${items.some(i=>i.level==='danger')?'var(--red)':'var(--gold)'}">
    <div class="card-h"><h3>🔔 تنبيهات المتابعة عبر كل الملفات</h3><span class="badge red">${items.filter(i=>i.level==='danger').length} متأخر</span>
      <span class="badge gold">${items.filter(i=>i.level==='warn').length} يقترب</span><div class="spacer"></div>
      <span class="small muted">إجمالي ${items.length} تنبيه</span></div>
    ${shown.map(i=>`<div class="flex" style="justify-content:space-between;gap:10px;border-bottom:1px dashed var(--line);padding:7px 0;flex-wrap:wrap">
      <span style="flex:1;min-width:240px">
        <span class="badge ${i.level==='danger'?'red':'gold'}" style="margin-inline-end:6px">${i.kind==='pay'?'💳':'📥'}</span>
        <b>${esc(i.d.customerName||'')}</b> <span class="small muted">${esc(i.d.ref||'')} · ${esc(i.d.bank||'')}</span>
        <div class="small" style="margin-top:2px">${esc(i.txt)}</div>
      </span>
      <button class="btn btn-sm" data-cr-open="${i.d.id}">فتح الملف</button>
    </div>`).join('')}
    ${items.length>shown.length? `<div class="small muted mt8">+ ${items.length-shown.length} تنبيه آخر — راجع تصنيف «⚠ متأخرة».</div>`:''}
  </div>`;
}

function creditArchiveList(list){
  if(!list.length) return `<div class="empty"><span class="big">🗃️</span>لا توجد ملفات مغلقة بعد — عند إغلاق أي ملف سيُحفظ هنا تلقائياً</div>`;
  return `<div class="cr-arch-list">${list.map(d=>{
    const paid = creditPaidTotal(d), total = creditScheduleTotal(d);
    return `<div class="cr-arch-item">
      <div class="cr-bank" style="width:38px;height:38px;font-size:16px">${creditBankMark(d.bank)}</div>
      <div class="ai-t">
        <b>${esc(d.customerName||'—')}</b>
        <div class="small muted">${esc(d.ref||'')} · ${esc(d.bank||'')} · ${esc(d.facilityType||'')}</div>
      </div>
      <div class="ai-meta">
        <span>المعتمد<br><b>${crmoney(d.approvedAmount, d.currency)}</b></span>
        <span>المسدَّد<br><b>${total? crmoney(paid, d.currency):'—'}</b></span>
        <span>المستندات<br><b>${(d.docs||[]).length}</b></span>
        <span>الإغلاق<br><b>${d.closedAt? fdate(toISO(d.closedAt),'short'):'—'}</b></span>
      </div>
      <span class="badge ${(CREDIT_STATUS[d.status]||CREDIT_STATUS.closed).badge}">${(CREDIT_STATUS[d.status]||CREDIT_STATUS.closed).label}</span>
      <button class="btn btn-sm" data-cr-open="${d.id}">فتح</button>
      <button class="btn btn-sm btn-icon" data-cr-print="${d.id}" title="طباعة">🖨</button>
    </div>`;
  }).join('')}</div>`;
}

function viewCredits(){
  crEnsure(DB);
  const all = creditsSorted();
  const s = creditStats(all);
  const q = creditFilter.q.trim().toLowerCase();
  let list = all.filter(d=>{
    if(creditFilter.company && d.companyId!==creditFilter.company) return false;
    if(q){
      const hay = `${d.ref||''} ${d.customerName||''} ${d.bank||''} ${d.facilityType||''} ${d.purpose||''} ${d.manager||''} ${d.customerId||''}`.toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  const chip = creditFilter.chip;
  if(chip==='active') list = list.filter(d=>['active','hold','approved'].includes(d.status));
  else if(chip==='late') list = list.filter(d=>creditHealth(d).level==='danger' && !['closed','rejected'].includes(d.status));
  else if(chip==='bank') list = list.filter(d=>['active','hold','approved'].includes(d.status) && ['submit','bankrev','commit','contract'].includes(creditCurrentStep(d).k));
  else if(chip==='approved') list = list.filter(d=>Number(d.approvedAmount)>0 && !['closed','rejected'].includes(d.status));
  else if(chip==='closed') list = list.filter(d=>d.status==='closed');
  else if(chip==='rejected') list = list.filter(d=>d.status==='rejected');

  const chips = [
    ['active',  '📂 تحت الإجراء', all.filter(d=>['active','hold','approved'].includes(d.status)).length],
    ['late',    '⚠ متأخرة',       all.filter(d=>creditHealth(d).level==='danger' && !['closed','rejected'].includes(d.status)).length],
    ['bank',    '🏦 لدى البنك',   all.filter(d=>['active','hold','approved'].includes(d.status) && ['submit','bankrev','commit','contract'].includes(creditCurrentStep(d).k)).length],
    ['approved','✅ معتمدة',      all.filter(d=>Number(d.approvedAmount)>0 && !['closed','rejected'].includes(d.status)).length],
    ['closed',  '🗃️ الأرشيف',     all.filter(d=>d.status==='closed').length],
    ['all',     '📋 الكل',        all.length],
  ];

  return `
  <div class="cr-hero no-print">
    <h2>🏦 منطقة الاعتمادات البنكية</h2>
    <p>أرشيف ومتابعة كاملة لملفات الاعتمادات: من فتح الملف وتجميع المستندات، إلى الخطابات الصادرة والمستندات الواردة
       بمهل الرد، ثم دراسة البنك والقرار والعقد والصرف ومتابعة الأقساط — حتى الإغلاق والأرشفة النهائية.</p>
    <div class="cr-hero-actions">
      <button class="btn btn-gold" data-cr-new>+ ملف اعتماد جديد</button>
      <button class="btn" data-cchip="closed">🗃️ أرشيف الملفات المغلقة</button>
      <button class="btn" data-cr-csv>⬇ تصدير كشف الاعتمادات</button>
      <button class="btn" data-cr-printreg>🖨 طباعة الكشف</button>
    </div>
    <div class="cr-mini-stats">
      <div class="cr-mini-stat"><b>${s.active}</b><span>ملفات جارية</span></div>
      <div class="cr-mini-stat"><b>${s.atBank}</b><span>لدى البنك</span></div>
      <div class="cr-mini-stat"><b>${s.approved}</b><span>ملفات معتمدة</span></div>
      <div class="cr-mini-stat"><b style="color:#ffd166">${s.late}</b><span>تحتاج تدخلاً</span></div>
      <div class="cr-mini-stat"><b>${s.total? fnum(Math.round(s.total)) : 0}</b><span>إجمالي المبالغ المعتمدة (د.ل)</span></div>
      <div class="cr-mini-stat"><b>${s.closed}</b><span>ملفات مغلقة ومؤرشفة</span></div>
    </div>
  </div>

  <div class="cr-toolbar-card no-print" id="cr-list">
    <div class="toolbar" style="margin-bottom:10px">
      <div class="search"><span class="mg">🔍</span>
        <input id="crq" placeholder="بحث برقم الملف، العميل، البنك، الغرض..." value="${esc(creditFilter.q)}">
      </div>
      <select id="crco">
        <option value="">كل الشركات</option>
        ${DB.companies.map(c=>`<option value="${c.id}" ${creditFilter.company===c.id?'selected':''}>${esc(c.short)}</option>`).join('')}
      </select>
      <button class="btn btn-sm" data-cr-csv>⬇ تصدير CSV</button>
    </div>
    <div class="cr-chips">
      ${chips.map(([k,label,n])=>`<button class="cr-chip ${chip===k?'on':''}" data-cchip="${k}">${label} <span class="n">${n}</span></button>`).join('')}
    </div>
    <div class="small muted">${list.length} ملف من أصل ${all.length}</div>
  </div>

  ${creditAlertsStrip(all)}

  ${chip==='closed'
    ? creditArchiveList(list)
    : (list.length
        ? `<div class="cr-grid">${list.map(creditCard).join('')}</div>`
        : `<div class="card"><div class="empty"><span class="big">🏦</span>
             ${all.length? 'لا توجد ملفات مطابقة لهذا التصنيف' : 'لا توجد ملفات اعتماد بعد — اضغط «ملف اعتماد جديد» لبدء أول دوسية'}
           </div></div>`)}
  `;
}

/* ============================================================
   تفاصيل ملف الاعتماد
   ============================================================ */
let creditTab = 'docs';

function creditHeadPanel(d){
  const st = CREDIT_STATUS[d.status] || CREDIT_STATUS.active;
  const pr = creditProgress(d);
  const health = creditHealth(d);
  const active = !['closed','rejected'].includes(d.status);
  return `<div class="cr-head">
    <div class="cr-head-top">
      <button class="btn btn-sm" data-go="credits" title="رجوع إلى القائمة">→ رجوع</button>
      <div style="flex:1;min-width:220px">
        <div class="flex" style="gap:8px;flex-wrap:wrap;margin-bottom:2px">
          <span class="badge ${st.badge}">${st.label}</span>
          <span class="badge grey">${esc(d.ref||'—')}</span>
          ${health.level!=='ok'? `<span class="badge ${health.level==='danger'?'red':'gold'}">${health.level==='danger'?'⚠':'⏳'} ${esc(health.label)}</span>`:''}
          ${d.status==='hold'? '<span class="badge gold">معلّق</span>':''}
        </div>
        <h2>${esc(d.customerName||'ملف اعتماد')}</h2>
        <div class="sub">${esc(d.bank||'')}${d.bankBranch? ` — ${esc(d.bankBranch)}`:''} · ${esc(d.facilityType||'')}</div>
      </div>
      <div class="flex flex-wrap no-print" style="gap:6px;justify-content:flex-end">
        <button class="btn btn-sm" data-cr-edit="${d.id}">✏️ تعديل البيانات</button>
        <button class="btn btn-sm btn-primary" data-cr-adddoc="${d.id}">+ مستند</button>
        <button class="btn btn-sm" data-cr-print="${d.id}">🖨 طباعة الملف</button>
        ${active
          ? `<button class="btn btn-sm btn-green" data-cr-close="${d.id}">✅ إغلاق وأرشفة</button>`
          : `<button class="btn btn-sm" data-cr-reopen="${d.id}">↺ إعادة فتح</button>`}
        <button class="btn btn-sm btn-icon btn-red" data-cr-del="${d.id}" title="حذف الملف">🗑</button>
      </div>
    </div>

    <div class="cr-prog" style="margin-top:14px">
      <div class="bar"><i class="${pr.pct===100?'done':''}" style="width:${pr.pct}%"></i></div>
      <div class="lbl"><span>المرحلة الحالية: <b>${pr.current.icon} ${esc(pr.current.name)}</b></span><span>${pr.pct}% مكتمل (${pr.done}/${pr.total} مراحل)</span></div>
    </div>

    <div class="cr-facts">
      <div class="cr-fact"><div class="k">💰 المبلغ المطلوب</div><div class="v">${crmoney(d.requestedAmount, d.currency)}</div></div>
      <div class="cr-fact"><div class="k">✅ المبلغ المعتمد</div><div class="v big">${Number(d.approvedAmount)>0? crmoney(d.approvedAmount, d.currency) : '—'}</div></div>
      <div class="cr-fact"><div class="k">📆 مدة السداد</div><div class="v">${d.tenorMonths? esc(String(d.tenorMonths))+' شهراً' : '—'}${d.graceMonths? ` <span class="small muted">(سماح ${d.graceMonths})</span>`:''}</div></div>
      <div class="cr-fact"><div class="k">📈 نسبة الفائدة / المرابحة</div><div class="v">${d.rate!=='' && d.rate!==undefined? esc(String(d.rate))+'%' : '—'}</div></div>
      <div class="cr-fact"><div class="k">🗓 تاريخ فتح الملف</div><div class="v">${d.openedAt? fdate(d.openedAt) : '—'}</div></div>
      <div class="cr-fact"><div class="k">🎯 التاريخ المستهدف</div><div class="v">${d.targetDate? fdate(d.targetDate) : '—'}</div></div>
      <div class="cr-fact"><div class="k">👤 مسؤول الملف</div><div class="v">${esc(d.manager||'—')}</div></div>
      <div class="cr-fact"><div class="k">🏢 الشركة</div><div class="v" style="font-size:12.6px">${esc(companyById(d.companyId).short)}</div></div>
      ${d.guarantees? `<div class="cr-fact" style="grid-column:span 2"><div class="k">🛡 الضمانات</div><div class="v" style="font-size:12.6px">${esc(d.guarantees)}</div></div>`:''}
      ${d.purpose? `<div class="cr-fact" style="grid-column:span 2"><div class="k">🎯 الغرض من التمويل</div><div class="v" style="font-size:12.6px">${esc(d.purpose)}</div></div>`:''}
      ${d.disburseDate? `<div class="cr-fact"><div class="k">💸 تاريخ الصرف</div><div class="v">${fdate(d.disburseDate)}</div></div>`:''}
      ${(d.payments||[]).length? `<div class="cr-fact"><div class="k">💳 القسط القادم</div><div class="v">${(()=>{const n=creditNextInstallment(d); return n? `${fdate(n.due,'short')} — ${crmoney(n.amount, d.currency)}`:'انتهى الجدول';})()}</div></div>`:''}
      ${d.closedAt? `<div class="cr-fact"><div class="k">🗃️ تاريخ الإغلاق</div><div class="v">${fdate(toISO(d.closedAt),'short')}</div></div>`:''}
    </div>

    ${health.reasons.length? `<div class="alert ${health.level==='danger'?'warn':'info'}" style="margin:12px 0 0">
      <div><b>${health.level==='danger'?'⚠ يتطلب تدخلاً':'⏳ للمتابعة'}:</b> ${health.reasons.map(esc).join(' — ')}</div>
    </div>`:''}

    <div class="cr-tabs no-print">
      ${[
        ['docs','📄 المستندات', (d.docs||[]).length],
        ['flow','🧭 سير الملف', `${creditDoneSteps(d)}/${CREDIT_STEPS.length}`],
        ['pay','💳 الأقساط', (d.payments||[]).filter(p=>!p.paid).length],
        ['notes','📝 الملاحظات', (d.notes||[]).length],
        ['log','🕘 السجل', (d.events||[]).length],
      ].map(([k,label,n])=>`<button class="cr-tab ${creditTab===k?'on':''}" data-ctab="${k}">${label} <span class="n">${n}</span></button>`).join('')}
    </div>
  </div>`;
}

/* ---------- تبويب المستندات ---------- */
function creditDocRow(d, doc){
  const st = CREDIT_DOC_STATUS[doc.status] || CREDIT_DOC_STATUS.draft;
  const next = creditDocNextKey(doc);
  const nextLabel = doc.dir==='out'
    ? (doc.status==='draft'? '⇢ إرسال' : doc.status==='sent'? '✓ استلام' : '')
    : (doc.status==='pending'? '✓ مستلم' : doc.status==='received'? '✓ معالجة' : '');
  const late = creditDocLate(doc);
  const lateDays = creditDocLateDays(doc);
  return `<tr class="cr-doc-row" style="${late?'background:#fff7f7':''}">
    <td class="n">${esc(doc.no||'—')}</td>
    <td class="ttl">${esc(doc.type||'مستند')}${doc.title && doc.title!==doc.type? `<small>${esc(doc.title)}</small>`:''}</td>
    <td class="small muted" style="white-space:nowrap">${doc.date? fdate(toISO(doc.date),'short'):'—'}</td>
    <td class="small">${esc(doc.refNo||'—')}${doc.letterRef? `<div class="sub">🔗 ${esc(doc.letterRef)}</div>`:''}</td>
    <td><span class="badge ${st.badge}">${st.label}</span>
      ${late? `<div class="sub" style="color:#b01722;font-weight:700">⏰ متأخر ${lateDays} يوم</div>`:''}</td>
    <td class="small muted" style="white-space:nowrap">${doc.dueDate? fdate(doc.dueDate,'short'):'—'}</td>
    <td>${doc.file? `<button class="btn btn-sm btn-icon" data-cr-file="${d.id}|${doc.id}" title="${esc(doc.file.name||'مرفق')}">📎</button>`:'—'}</td>
    <td class="no-print"><div class="row-actions">
      ${next? `<button class="btn btn-sm" data-cr-docnext="${d.id}|${doc.id}" title="${esc(nextLabel)}">${nextLabel}</button>`:''}
      <button class="btn btn-sm btn-icon" data-cr-docedit="${d.id}|${doc.id}" title="تعديل">✏️</button>
      <button class="btn btn-sm btn-icon" data-cr-docdel="${d.id}|${doc.id}" title="حذف">🗑</button>
    </div></td>
  </tr>`;
}

function creditDocsTable(d, dir){
  const docs = (d.docs||[]).filter(x=>x.dir===dir).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const title = dir==='out' ? '📤 الخطابات الصادرة' : '📥 المستندات الواردة';
  return `<div class="card pad0" style="margin-bottom:14px">
    <div class="card-h" style="padding:14px 16px 0;margin-bottom:10px">
      <h3>${title}</h3><span class="badge grey">${docs.length}</span>
      <div class="spacer"></div>
      <button class="btn btn-sm btn-primary no-print" data-cr-adddoc="${d.id}|${dir}">+ ${dir==='out'?'خطاب صادر':'مستند وارد'}</button>
    </div>
    ${docs.length? `<div class="table-wrap"><table class="tbl">
      <thead><tr><th>الرقم</th><th>النوع / العنوان</th><th>التاريخ</th><th>المرجع</th><th>الحالة</th><th>المهلة</th><th>مرفق</th><th class="no-print"></th></tr></thead>
      <tbody>${docs.map(x=>creditDocRow(d,x)).join('')}</tbody>
    </table></div>`
    : `<div class="empty" style="padding:22px"><span class="big" style="font-size:26px">${dir==='out'?'📤':'📥'}</span>
        ${dir==='out'?'لم تُسجَّل خطابات صادرة لهذا الملف بعد':'لم تُسجَّل مستندات واردة من البنك بعد'}</div>`}
  </div>`;
}

function creditDocsPanel(d){
  const out = (d.docs||[]).filter(x=>x.dir==='out').length;
  const inc = (d.docs||[]).filter(x=>x.dir==='in').length;
  const late = creditLateDocs(d).length;
  return `
    ${late? `<div class="alert warn"><div>⏰ يوجد <b>${late}</b> مستند وارد تجاوز مهلة الرد — راجع الجدول أدناه وسجّل الرد أو المتابعة.</div></div>`:''}
    <div class="flex flex-wrap no-print" style="margin-bottom:12px">
      <span class="badge blue">📤 ${out} صادر</span>
      <span class="badge green">📥 ${inc} وارد</span>
      <div class="spacer"></div>
      <button class="btn btn-sm" data-cr-printdocs="${d.id}">🖨 طباعة كشف المستندات</button>
    </div>
    ${creditDocsTable(d,'out')}
    ${creditDocsTable(d,'in')}
    <div class="alert info no-print">💡 الترقيم تلقائي: الخطابات الصادرة <b>ص-01، ص-02…</b> والواردة <b>و-01، و-02…</b>.
      المستند الوارد يمكن ربطه <b>بمهلة رد</b> فيظهر تحذير تلقائي عند تجاوزها. ويمكن ربط الخطاب الصادر بخطاب من الأرشيف.</div>
  `;
}

/* ---------- تبويب سير الملف ---------- */
function creditFlowOverview(d){
  const current = creditCurrentStep(d);
  return `<div class="cr-flow">${CREDIT_STEPS.map((s,i)=>{
    const st = (d.steps||{})[s.k] || {};
    const done = !!st.done;
    const isCur = current.k===s.k && !done;
    const late = !done && isCur && d.targetDate && d.targetDate < crToday();
    return `<div class="cr-step ${done?'done':''} ${isCur?'current':''} ${late?'late':''}" data-cr-step="${s.k}" title="اضغط للانتقال إلى محرر هذه المرحلة">
      <div class="si">${done? '✅' : s.icon}</div>
      <div class="sn">${i+1}. ${esc(s.name)}</div>
      <div class="sd">${done? (st.date? fdate(st.date,'short'):'منجزة') : (isCur? 'المرحلة الحالية' : s.desc)}</div>
      ${st.by? `<div class="sd" style="opacity:.8">👤 ${esc(st.by)}</div>`:''}
    </div>`;
  }).join('')}</div>`;
}

function creditFlowEditor(d){
  return `<div class="cr-editor">${CREDIT_STEPS.map((s,i)=>{
    const st = (d.steps||{})[s.k] || {};
    const done = !!st.done;
    const isCur = creditCurrentStep(d).k===s.k && !done;
    return `<div class="cr-edit-step ${done?'done':''} ${isCur?'current':''}" data-step-card="${s.k}">
      <div class="es-h"><span class="n">${done?'✓':i+1}</span> ${s.icon} ${esc(s.name)}</div>
      <label class="es-chk"><input type="checkbox" data-kstep="${s.k}" ${done?'checked':''}> تمت المرحلة</label>
      <input type="date" data-kstepdate="${s.k}" value="${esc(st.date||'')}" title="تاريخ الإنجاز">
      <input type="text" data-kstepby="${s.k}" value="${esc(st.by||'')}" placeholder="المسؤول / الجهة">
      <input type="text" data-kstepnote="${s.k}" value="${esc(st.note||'')}" placeholder="ملاحظة (اختياري)">
      <div class="es-note">${esc(s.desc)}</div>
    </div>`;
  }).join('')}</div>`;
}

function creditFlowPanel(d){
  const pr = creditProgress(d);
  const durations = [];
  for(let i=1;i<CREDIT_STEPS.length;i++){
    const a = (d.steps||{})[CREDIT_STEPS[i-1].k]||{}, b = (d.steps||{})[CREDIT_STEPS[i].k]||{};
    if(a.date && b.date) durations.push({ from:CREDIT_STEPS[i-1].name, to:CREDIT_STEPS[i].name, days: crDays(a.date,b.date) });
  }
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-h"><h3>🧭 مسار الملف (9 مراحل)</h3><div class="spacer"></div>
        <span class="badge blue">${pr.done}/${pr.total} منجزة</span>
        ${pr.pct===100? '<span class="badge green">مكتمل</span>':''}</div>
      ${creditFlowOverview(d)}
      <div class="small muted mt8">اضغط على أي مرحلة للانتقال إلى محرّرها في الأسفل.</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-h"><h3>✅ تحديث مراحل الملف</h3><div class="spacer"></div>
        <span class="small muted">يُحفظ تلقائياً عند التغيير</span></div>
      ${creditFlowEditor(d)}
      <div class="small muted mt8">عند إنجاز مرحلة تُسجَّل في السجل الزمني تلقائياً، وعند إنجاز «الإغلاق» ينتقل الملف إلى الأرشيف.</div>
    </div>
    ${durations.length? `<div class="card">
      <div class="card-h"><h3>⏱ المدد بين المراحل</h3></div>
      <table class="tbl"><thead><tr><th>الانتقال</th><th>عدد الأيام</th></tr></thead>
      <tbody>${durations.map(x=>`<tr><td>${esc(x.from)} ← ${esc(x.to)}</td><td><b style="color:${x.days>15?'#b01722':'#0a7a3c'}">${x.days} يوم</b></td></tr>`).join('')}</tbody></table>
    </div>`:''}
  `;
}

/* ---------- تبويب الأقساط ---------- */
function creditPayPanel(d){
  const paid = creditPaidTotal(d), total = creditScheduleTotal(d);
  const paidCount = (d.payments||[]).filter(p=>p.paid).length;
  const over = creditOverduePayments(d);
  const cur = d.currency || 'د.ل';
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-h"><h3>💳 إعداد جدول الأقساط</h3><div class="spacer"></div>
        ${Number(d.approvedAmount)>0? `<span class="badge green">المبلغ المعتمد: ${crmoney(d.approvedAmount, cur)}</span>`:''}</div>
      <div class="grid3">
        <div class="field"><label>عدد الأشهر</label><input type="number" id="crTenor" value="${esc(d.tenorMonths||'')}" placeholder="مثال: 36"></div>
        <div class="field"><label>أشهر السماح (قبل أول قسط)</label><input type="number" id="crGrace" value="${esc(d.graceMonths||'')}" placeholder="0"></div>
        <div class="field"><label>تاريخ أول قسط</label><input type="date" id="crFirst" value="${esc(d.firstInstallmentDate|| (d.disburseDate? toISO(d.disburseDate): crToday()))}"></div>
        <div class="field"><label>القسط الشهري (اتركه فارغاً للحساب الآلي)</label><input type="number" step="any" id="crInst" value="${esc(d.installmentAmount||'')}" placeholder="آلي"></div>
        <div class="field"><label>تاريخ الصرف</label><input type="date" id="crDisb" value="${esc(d.disburseDate? toISO(d.disburseDate):'')}"></div>
        <div class="field" style="justify-content:flex-end">
          <button class="btn btn-primary no-print" data-cr-genpay="${d.id}">⚙ توليد / تحديث الجدول</button>
        </div>
      </div>
      <div class="alert info no-print" style="margin:12px 0 0">💡 عند إنجاز مرحلة <b>«صرف الاعتماد»</b> أدخل تاريخ الصرف والمبلغ المعتمد ثم ولّد الجدول — سيُحسب القسط آلياً ويُتابَع السداد شهراً بشهر.</div>
    </div>

    ${(d.payments||[]).length? `
    <div class="card pad0">
      <div class="card-h" style="padding:14px 16px 0;margin-bottom:10px">
        <h3>جدول السداد</h3>
        <div class="spacer"></div>
        <span class="badge green">مسدَّد: ${crmoney(paid, cur)}</span>
        <span class="badge gold">متبقٍ: ${crmoney(Math.max(0,total-paid), cur)}</span>
        ${over.length? `<span class="badge red">${over.length} متأخر</span>`:''}
        <button class="btn btn-sm no-print" data-cr-csvpay="${d.id}">⬇ CSV</button>
        <button class="btn btn-sm no-print" data-cr-printpay="${d.id}">🖨 طباعة</button>
      </div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>#</th><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>الحالة</th><th>تاريخ السداد</th><th class="no-print">إجراء</th></tr></thead>
        <tbody>${(d.payments||[]).map((p,i)=>{
          const late = !p.paid && p.due && p.due < crToday();
          const soon = !p.paid && p.due && !late && crDays(crToday(), p.due) <= 7;
          return `<tr style="${late?'background:#fff7f7':''}">
            <td class="ref">${i+1}</td>
            <td class="small" style="white-space:nowrap">${fdate(p.due,'short')}</td>
            <td style="font-weight:700">${crmoney(p.amount, cur)}</td>
            <td>${p.paid? '<span class="badge green">✓ مسدَّد</span>' : late? `<span class="badge red">متأخر ${crDays(p.due, crToday())} يوم</span>` : soon? '<span class="badge gold">مستحق قريباً</span>' : '<span class="badge grey">غير مسدَّد</span>'}</td>
            <td class="small muted">${p.paidDate? fdate(toISO(p.paidDate),'short'):'—'}</td>
            <td class="no-print"><button class="btn btn-sm" data-cr-paid="${d.id}|${p.id}">${p.paid? '↺ إلغاء السداد':'✓ تسجيل السداد'}</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      <div style="padding:10px 16px 14px" class="small muted">عدد الأقساط: ${(d.payments||[]).length} · المسدَّد: ${paidCount} · المتبقي: ${(d.payments||[]).length-paidCount}${total? ` · نسبة السداد: ${Math.round(paid/total*100)}%`:''}</div>
    </div>` : `<div class="card"><div class="empty"><span class="big">💳</span>لا يوجد جدول أقساط بعد — أدخل المدة وتاريخ أول قسط ثم اضغط «توليد الجدول»</div></div>`}
  `;
}

/* ---------- تبويب الملاحظات ---------- */
function creditNotesPanel(d){
  const list = [...(d.notes||[])].sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  return `
  <div class="card">
    <div class="card-h"><h3>📝 ملاحظات الملف</h3><div class="spacer"></div><span class="badge grey">${list.length}</span></div>
    <div class="cr-notes-add no-print">
      <textarea id="crNoteText" placeholder="اكتب ملاحظة متابعة (اتصال بالبنك، زيارة، مستند مطلوب…) ثم اضغط إضافة"></textarea>
      <button class="btn btn-primary" data-cr-addnote="${d.id}">+ إضافة</button>
    </div>
    ${list.length? list.map(n=>`<div class="cr-note">
      <div class="nh"><b>${esc(n.by||'السكرتارية')}</b> · ${crdt(n.at)}
        <span class="na"><button data-cr-delnote="${d.id}|${n.id}" title="حذف">🗑</button></span></div>
      <div class="nt">${esc(n.text)}</div>
    </div>`).join('') : `<div class="empty" style="padding:24px"><span class="big" style="font-size:26px">📝</span>لا توجد ملاحظات</div>`}
  </div>`;
}

/* ---------- تبويب السجل ---------- */
const CR_LOG_ICON = {
  open:'📂', doc:'📄', 'doc-status':'🔄', step:'✅', note:'📝', pay:'💳', status:'🏷', close:'🗃️', edit:'✏️', paygen:'⚙️'
};
function creditLogPanel(d){
  const list = d.events||[];
  return `<div class="card">
    <div class="card-h"><h3>🕘 السجل الزمني للملف</h3><div class="spacer"></div>
      <button class="btn btn-sm no-print" data-cr-printlog="${d.id}">🖨 طباعة السجل</button></div>
    ${list.length? `<div class="cr-timeline">${list.map(e=>{
      const kind = e.type==='doc'? (e.dir==='out'?'t-out':'t-in') : e.type==='step'? 't-mil' : e.type==='note'?'t-cust' : e.type==='status'||e.type==='close'? 't-mil':'t-warn';
      return `<div class="cr-tl ${kind}">
        <span class="dot"></span>
        <div class="cr-tl-h"><b>${CR_LOG_ICON[e.type]||'•'} ${esc(e.title)}</b><span class="when">${crdt(e.at)}</span></div>
        ${e.detail? `<div class="cr-tl-b">${esc(e.detail)}</div>`:''}
      </div>`;
    }).join('')}</div>` : `<div class="empty"><span class="big">🕘</span>لا توجد حركات مسجلة</div>`}
  </div>`;
}

function creditDetail(id){
  const d = creditById(id);
  if(!d) return `<div class="card"><div class="empty"><span class="big">🏦</span>الملف غير موجود — قد يكون حُذف.<br><br><button class="btn" data-go="credits">رجوع إلى قائمة الاعتمادات</button></div></div>`;
  const panel = creditTab==='flow'? creditFlowPanel(d)
    : creditTab==='pay'? creditPayPanel(d)
    : creditTab==='notes'? creditNotesPanel(d)
    : creditTab==='log'? creditLogPanel(d)
    : creditDocsPanel(d);
  return `${creditHeadPanel(d)}<div class="cr-panel">${panel}</div>`;
}
function viewCredit(id){ crEnsure(DB); return creditDetail(id); }

/* ============================================================
   نوافذ الإدخال
   ============================================================ */
function closeModal(){ const bg = $('#modalBg'); if(bg){ bg.classList.remove('open'); bg.innerHTML=''; } }
function openModal(html){
  const bg = $('#modalBg');
  bg.innerHTML = html; bg.classList.add('open');
  $$('[data-close]', bg).forEach(b=>b.onclick = closeModal);
  bg.onclick = e=>{ if(e.target===bg) closeModal(); };
}

function creditDossierModal(d){
  const isNew = !d;
  const m = d || {
    id:uid(), companyId:DB.settings.activeCompany, currency:'د.ل', status:'active',
    openedAt:crToday(), requestedAmount:'', approvedAmount:'', tenorMonths:'', graceMonths:'',
    rate:'', customerName:'', customerId:'', customerPhone:'', manager:'', bank:'', bankBranch:'',
    facilityType:CREDIT_FACILITIES[0], purpose:'', guarantees:'', targetDate:'',
    docs:[], steps:{}, notes:[], events:[], payments:[], createdAt:Date.now(), updatedAt:Date.now(),
  };
  openModal(`<div class="modal" style="max-width:820px">
    <div class="modal-h"><h3>${isNew? '🏦 ملف اعتماد جديد':'✏️ تعديل بيانات ملف الاعتماد'}</h3>
      <div class="spacer"></div><span class="badge grey">${esc(m.ref||'سيُرقَّم تلقائياً')}</span>
      <button class="btn btn-sm" data-close>✕</button></div>
    <div class="modal-b">
      <form id="crForm" class="grid2" onsubmit="return false">
        <div class="field span2"><label>اسم العميل / الجهة المستفيدة <span class="req">*</span></label>
          <input name="customerName" value="${esc(m.customerName||'')}" placeholder="اسم الشركة أو الشخص طالب الاعتماد" required></div>
        <div class="field"><label>رقم السجل التجاري / الرقم الوطني</label><input name="customerId" value="${esc(m.customerId||'')}"></div>
        <div class="field"><label>هاتف التواصل</label><input name="customerPhone" value="${esc(m.customerPhone||'')}"></div>
        <div class="field"><label>البنك <span class="req">*</span></label>
          <input name="bank" list="crBanks" value="${esc(m.bank||'')}" placeholder="اسم البنك" required>
          <datalist id="crBanks">${CREDIT_BANKS.map(b=>`<option value="${esc(b)}">`).join('')}</datalist></div>
        <div class="field"><label>الفرع / الإدارة</label><input name="bankBranch" value="${esc(m.bankBranch||'')}" placeholder="مثال: فرع طرابلس — إدارة الائتمان"></div>
        <div class="field"><label>نوع التسهيل</label>
          <select name="facilityType">${CREDIT_FACILITIES.map(f=>`<option ${f===m.facilityType?'selected':''}>${esc(f)}</option>`).join('')}</select></div>
        <div class="field"><label>العملة</label>
          <select name="currency">${['د.ل','USD','EUR'].map(c=>`<option ${c===m.currency?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label>المبلغ المطلوب <span class="req">*</span></label><input type="number" step="any" name="requestedAmount" value="${esc(m.requestedAmount??'')}" required></div>
        <div class="field"><label>المبلغ المعتمد</label><input type="number" step="any" name="approvedAmount" value="${esc(m.approvedAmount??'')}" placeholder="يُملأ بعد الموافقة"></div>
        <div class="field"><label>مدة السداد (أشهر)</label><input type="number" name="tenorMonths" value="${esc(m.tenorMonths??'')}"></div>
        <div class="field"><label>أشهر السماح</label><input type="number" name="graceMonths" value="${esc(m.graceMonths??'')}"></div>
        <div class="field"><label>الفائدة / هامش المرابحة (%)</label><input type="number" step="any" name="rate" value="${esc(m.rate??'')}"></div>
        <div class="field"><label>مسؤول الملف</label>
          <input name="manager" list="crManagers" value="${esc(m.manager||'')}" placeholder="الموظف المتولّي الملف">
          <datalist id="crManagers">${DB.employees.map(e=>`<option value="${esc(e.name)}">`).join('')}</datalist></div>
        <div class="field"><label>الشركة</label>
          <select name="companyId">${DB.companies.map(c=>`<option value="${c.id}" ${c.id===m.companyId?'selected':''}>${esc(c.short)}</option>`).join('')}</select></div>
        <div class="field"><label>تاريخ فتح الملف</label><input type="date" name="openedAt" value="${esc(toISO(m.openedAt||crToday()))}"></div>
        <div class="field"><label>التاريخ المستهدف للإنجاز</label><input type="date" name="targetDate" value="${esc(toISO(m.targetDate||''))}"></div>
        <div class="field"><label>الحالة</label>
          <select name="status">${Object.entries(CREDIT_STATUS).map(([k,v])=>`<option value="${k}" ${k===m.status?'selected':''}>${v.label}</option>`).join('')}</select></div>
        <div class="field span2"><label>الغرض من التمويل</label>
          <input name="purpose" value="${esc(m.purpose||'')}" placeholder="مثال: تمويل رأس المال العامل — شراء مواد أولية"></div>
        <div class="field span2"><label>الضمانات المقدَّمة</label>
          <textarea name="guarantees" rows="2" placeholder="مثال: رهن عقاري — كفالة شخصية — شيكات ضمان">${esc(m.guarantees||'')}</textarea></div>
      </form>
    </div>
    <div class="modal-f"><button class="btn btn-primary" data-crsave>💾 ${isNew? 'إنشاء الملف':'حفظ التعديلات'}</button>
      <button class="btn" data-close>إلغاء</button></div>
  </div>`);
  const bg = $('#modalBg');
  $('[data-crsave]', bg).onclick = async ()=>{
    const data = Object.fromEntries(new FormData($('#crForm', bg)).entries());
    if(!String(data.customerName||'').trim()){ toast('اسم العميل مطلوب','err'); return; }
    if(!String(data.bank||'').trim()){ toast('اسم البنك مطلوب','err'); return; }
    if(!String(data.requestedAmount||'').trim()){ toast('المبلغ المطلوب مطلوب','err'); return; }
    const btn = $('[data-crsave]', bg); btn.disabled = true;
    if(isNew){
      const rec = { ...m, ...data,
        id:uid(), createdAt:Date.now(), updatedAt:Date.now(),
        ref: await creditCommitRef(), status:'active',
        steps:{ open:{ done:true, date:data.openedAt||crToday(), by:data.manager||'', note:'فتح الملف' } },
        docs:[], notes:[], events:[], payments:[],
      };
      crLog(rec, 'open', 'فتح ملف الاعتماد', `${rec.bank} — ${rec.facilityType} — ${crmoney(rec.requestedAmount, rec.currency)}`);
      DB.credits.unshift(rec);
      await crSave(rec);
      closeModal(); creditTab='docs'; toast('تم إنشاء الملف ' + rec.ref);
      go('credits/'+rec.id);
    }else{
      const oldStatus = d.status;
      Object.assign(d, data);
      d.steps = d.steps || {};
      if(d.status==='closed' && !d.closedAt) d.closedAt = new Date().toISOString();
      if(oldStatus!==d.status){
        crLog(d, 'status', 'تغيير حالة الملف', `${(CREDIT_STATUS[oldStatus]||{}).label||oldStatus} ← ${(CREDIT_STATUS[d.status]||{}).label||d.status}`);
      }else{
        crLog(d, 'edit', 'تعديل بيانات الملف', '');
      }
      await crSave(d);
      closeModal(); toast('تم حفظ التعديلات'); render('credits/'+d.id);
    }
  };
}

function creditDocModal(d, doc, dir, letterLink){
  const isNew = !doc;
  const original = doc;
  const m = doc ? { ...doc } : {
    id:uid(), dir, no:creditDocNo(d, dir, creditDocSerial(d, dir)),
    type:(dir==='out'? CREDIT_DOC_TYPES_OUT[0] : CREDIT_DOC_TYPES_IN[0]),
    title:'', date:crToday(), dueDate:'', status: dir==='out'? 'draft':'pending',
    refNo:'', letterId:'', letterRef:'', notes:'', file:null,
  };
  const types = dir==='out'? CREDIT_DOC_TYPES_OUT : CREDIT_DOC_TYPES_IN;
  const letters = (DB.letters||[]).filter(l=>l.companyId===d.companyId);
  openModal(`<div class="modal" style="max-width:760px">
    <div class="modal-h"><h3>${dir==='out'? '📤 خطاب صادر':'📥 مستند وارد'} — ${esc(m.no||'')}</h3>
      <div class="spacer"></div><button class="btn btn-sm" data-close>✕</button></div>
    <div class="modal-b">
      <form id="crDocForm" class="grid2" onsubmit="return false">
        <div class="field span2"><label>النوع</label>
          <select name="type">${types.map(t=>`<option ${t===m.type?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
        <div class="field span2"><label>العنوان / الموضوع</label>
          <input name="title" value="${esc(m.title||'')}" placeholder="وصف مختصر للمستند"></div>
        <div class="field"><label>تاريخ المستند</label><input type="date" name="date" value="${esc(toISO(m.date||crToday()))}"></div>
        <div class="field"><label>${dir==='out'?'المرجع / رقم الخطاب':'الرقم المرجعي للبنك'}</label>
          <input name="refNo" value="${esc(m.refNo||'')}"></div>
        ${dir==='in'? `<div class="field"><label>مهلة الرد / الاستحقاق</label><input type="date" name="dueDate" value="${esc(toISO(m.dueDate||''))}"></div>
          <div class="field"><label>الحالة</label>
            <select name="status">${['pending','received','processed','cancelled'].map(k=>`<option value="${k}" ${k===m.status?'selected':''}>${CREDIT_DOC_STATUS[k].label}</option>`).join('')}</select></div>`
        : `<div class="field"><label>الحالة</label>
            <select name="status">${['draft','sent','delivered','cancelled'].map(k=>`<option value="${k}" ${k===m.status?'selected':''}>${CREDIT_DOC_STATUS[k].label}</option>`).join('')}</select></div>
          <div class="field"><label>ربط بخطاب من الأرشيف (اختياري)</label>
            <select name="letterId">
              <option value="">— بدون ربط —</option>
              ${letters.map(l=>`<option value="${l.id}" ${l.id===m.letterId?'selected':''}>${esc(l.ref)} — ${esc(l.tplName)}${l.person? ' — '+esc(l.person):''}</option>`).join('')}
            </select></div>`}
        <div class="field span2"><label>ملاحظات</label>
          <textarea name="notes" rows="2">${esc(m.notes||'')}</textarea></div>
        <div class="field span2"><label>مرفق (صورة أو PDF — اختياري)</label>
          <input type="file" name="file" id="crDocFile" accept="image/*,.pdf">
          <div class="small muted">${m.file? `المرفق الحالي: <b>${esc(m.file.name||'ملف')}</b> — رفع ملف جديد يستبدله.`:'الحد الأقصى 2.5 ميغابايت (لأن الملف يُحفظ داخل الدوسية).'}</div>
        </div>
      </form>
    </div>
    <div class="modal-f"><button class="btn btn-primary" data-crdocsave>💾 حفظ المستند</button>
      <button class="btn" data-close>إلغاء</button></div>
  </div>`);
  const bg = $('#modalBg');
  const fileEl = $('#crDocFile', bg);
  $('[data-crdocsave]', bg).onclick = async ()=>{
    const f = $('#crDocForm', bg);
    const data = Object.fromEntries(new FormData(f).entries());
    const btn = $('[data-crdocsave]', bg); btn.disabled = true;
    let file = m.file || null;
    const picked = fileEl.files && fileEl.files[0];
    if(picked){
      if(picked.size > 2.5*1024*1024){ toast('حجم المرفق يتجاوز 2.5 ميغابايت','err'); btn.disabled=false; return; }
      file = { name:picked.name, type:picked.type, size:picked.size, data: await fileToDataURL(picked) };
    }
    const oldStatus = m.status;
    Object.assign(m, data, { file });
    if(data.letterId){
      const l = DB.letters.find(x=>x.id===data.letterId);
      if(l){ m.letterRef = l.ref; if(!m.title) m.title = l.tplName; }
    }else if(isNew){ m.letterRef=''; }
    if(isNew){
      m.no = creditDocNo(d, dir, creditDocSerial(d, dir));
      d.docs = d.docs || []; d.docs.unshift(m);
      crLog(d, 'doc', `${dir==='out'?'إضافة خطاب صادر':'إضافة مستند وارد'}: ${m.no}`, `${m.type}${m.title? ' — '+m.title:''}${m.dueDate? ` — مهلة: ${fdate(m.dueDate,'short')}`:''}`);
    }else{
      Object.assign(original, m);
      if(oldStatus!==m.status) crLog(d, 'doc-status', `تحديث حالة ${m.no}`, `${(CREDIT_DOC_STATUS[oldStatus]||{}).label||oldStatus} ← ${(CREDIT_DOC_STATUS[m.status]||{}).label||m.status}`);
      else crLog(d, 'doc', `تعديل ${m.no}`, m.title||m.type);
    }
    await crSave(d);
    closeModal(); toast('تم حفظ المستند'); render('credits/'+d.id);
  };
}

/* ============================================================
   الأحداث والربط
   ============================================================ */
function bindCredits(){
  crEnsure(DB);
  const q = $('#crq');
  if(q) q.oninput = ()=>{
    creditFilter.q = q.value;
    const pos = q.selectionStart;
    render('credits');
    const nq = $('#crq'); if(nq){ nq.focus(); nq.setSelectionRange(pos,pos); }
  };
  const co = $('#crco'); if(co) co.onchange = ()=>{ creditFilter.company = co.value; render('credits'); };
  $$('[data-cchip]').forEach(b=>b.onclick = ()=>{ creditFilter.chip = b.dataset.cchip; render('credits'); window.scrollTo({top:0,behavior:'instant'}); });
  const nb = $('[data-cr-new]'); if(nb) nb.onclick = ()=>creditDossierModal(null);
  $$('[data-cr-csv]').forEach(b=>b.onclick = ()=>creditExportCSV());
  $$('[data-cr-printreg]').forEach(b=>b.onclick = ()=>printCreditRegister());
  bindCreditCommon();
}

function bindCreditCommon(){
  $$('[data-cr-open]').forEach(b=>b.onclick = ()=>go('credits/'+b.dataset.crOpen));
  $$('[data-cr-adddoc]').forEach(b=>b.onclick = ()=>{
    const [id, dir] = b.dataset.crAdddoc.split('|');
    const d = creditById(id); if(d) creditDocModal(d, null, dir||'out');
  });
  $$('[data-cr-print]').forEach(b=>b.onclick = ()=>{ const d = creditById(b.dataset.crPrint); if(d) printCreditDossier(d); });
  $$('[data-cr-edit]').forEach(b=>b.onclick = ()=>{ const d = creditById(b.dataset.crEdit); if(d) creditDossierModal(d); });
  $$('[data-cr-docedit]').forEach(b=>b.onclick = ()=>{
    const [id,docid] = b.dataset.crDocedit.split('|');
    const d = creditById(id); const doc = d && (d.docs||[]).find(x=>x.id===docid);
    if(d && doc) creditDocModal(d, doc, doc.dir);
  });
  $$('[data-cr-docdel]').forEach(b=>b.onclick = async ()=>{
    const [id,docid] = b.dataset.crDocdel.split('|');
    const d = creditById(id); if(!d) return;
    const doc = (d.docs||[]).find(x=>x.id===docid); if(!doc) return;
    if(!confirm(`حذف المستند ${doc.no} (${doc.type})؟`)) return;
    d.docs = d.docs.filter(x=>x.id!==docid);
    crLog(d, 'doc', `حذف مستند: ${doc.no}`, doc.type);
    await crSave(d); toast('تم حذف المستند'); render('credits/'+d.id);
  });
  $$('[data-cr-docnext]').forEach(b=>b.onclick = async ()=>{
    const [id,docid] = b.dataset.crDocnext.split('|');
    const d = creditById(id); const doc = d && (d.docs||[]).find(x=>x.id===docid);
    if(!doc) return;
    const next = creditDocNextKey(doc); if(!next) return;
    const old = doc.status; doc.status = next;
    if(next==='delivered' || next==='received') doc.receivedAt = new Date().toISOString();
    crLog(d, 'doc-status', `تحديث حالة ${doc.no}`, `${CREDIT_DOC_STATUS[old].label} ← ${CREDIT_DOC_STATUS[next].label}`);
    await crSave(d); toast(`تم تحديث الحالة: ${CREDIT_DOC_STATUS[next].label}`); render('credits/'+d.id);
  });
  $$('[data-cr-file]').forEach(b=>b.onclick = ()=>{
    const [id,docid] = b.dataset.crFile.split('|');
    const d = creditById(id); const doc = d && (d.docs||[]).find(x=>x.id===docid);
    if(doc && doc.file && doc.file.data){
      try{
        const [meta, b64] = doc.file.data.split(',');
        const mime = (meta.match(/data:([^;]+)/)||[])[1] || doc.file.type || 'application/octet-stream';
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([arr], {type:mime}));
        const a = document.createElement('a');
        a.href = url; a.target='_blank'; a.rel='noopener';
        a.download = doc.file.name || ('مستند_'+(doc.no||''));
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(url), 30000);
      }catch(e){ toast('تعذّر فتح المرفق','err'); }
    }else{ toast('لا يوجد مرفق لهذا المستند'); }
  });
}

function bindCreditDetail(id){
  const d = creditById(id);
  if(!d) return;
  bindCreditCommon();

  /* تبويبات */
  $$('[data-ctab]').forEach(b=>b.onclick = ()=>{ creditTab = b.dataset.ctab; render('credits/'+id); });

  /* دخول سريع لمحرر المرحلة */
  $$('[data-cr-step]').forEach(el=>el.onclick = ()=>{
    creditTab = 'flow'; render('credits/'+id);
    setTimeout(()=>{
      const card = document.querySelector(`[data-step-card="${el.dataset.crStep}"]`);
      if(card) card.scrollIntoView({behavior:'smooth', block:'center'});
    }, 60);
  });

  /* الحالة السريعة */
  $$('[data-cr-paid]').forEach(b=>b.onclick = async ()=>{
    const [did,pid] = b.dataset.crPaid.split('|');
    const dd = creditById(did); if(!dd) return;
    const p = (dd.payments||[]).find(x=>x.id===pid); if(!p) return;
    p.paid = !p.paid; p.paidDate = p.paid? crToday() : '';
    crLog(dd, 'pay', p.paid? `تسجيل سداد القسط ${p.n}`: `إلغاء سداد القسط ${p.n}`, `${crmoney(p.amount, dd.currency)} — استحقاق ${fdate(p.due,'short')}`);
    await crSave(dd); toast(p.paid? 'تم تسجيل السداد':'أُلغي السداد'); render('credits/'+did);
  });

  /* خطوات الملف */
  $$('[data-kstep]').forEach(chk=>chk.onchange = async ()=>{
    const k = chk.dataset.kstep;
    const st = d.steps[k] || (d.steps[k] = {});
    st.done = chk.checked;
    if(st.done){
      if(!st.date) st.date = crToday();
      st.by = st.by || d.manager || '';
      crLog(d, 'step', `إنجاز مرحلة: ${CREDIT_STEPS.find(s=>s.k===k).name}`, st.note||'');
      if(k==='close'){
        d.status = 'closed'; d.closedAt = new Date().toISOString();
        crLog(d, 'close', 'إغلاق الملف وأرشفته', 'انتقل الملف إلى أرشيف الاعتمادات');
      }
      if(k==='commit' && Number(d.approvedAmount)>0 && d.status==='active') d.status = 'approved';
      if(k==='disburse' && st.date) d.disburseDate = st.date;
    }else{
      st.date = ''; 
      if(k==='close'){ d.status = 'active'; d.closedAt = ''; }
      crLog(d, 'step', `إلغاء إنجاز مرحلة: ${CREDIT_STEPS.find(s=>s.k===k).name}`, '');
    }
    await crSave(d); toast(st.done? 'تم تحديث المرحلة':'أُلغيت المرحلة'); render('credits/'+id);
  });
  $$('[data-kstepdate]').forEach(el=>el.onchange = async ()=>{
    const k = el.dataset.kstepdate;
    const st = d.steps[k] || (d.steps[k] = {});
    st.date = el.value;
    if(el.value && !st.done){ st.done = true; crLog(d, 'step', `إنجاز مرحلة: ${CREDIT_STEPS.find(s=>s.k===k).name}`, ''); }
    await crSave(d); toast('تم حفظ التاريخ'); render('credits/'+id);
  });
  $$('[data-kstepby]').forEach(el=>el.onchange = async ()=>{
    const k = el.dataset.kstepby;
    const st = d.steps[k] || (d.steps[k] = {});
    st.by = el.value; await crSave(d); toast('تم الحفظ');
  });
  $$('[data-kstepnote]').forEach(el=>el.onchange = async ()=>{
    const k = el.dataset.kstepnote;
    const st = d.steps[k] || (d.steps[k] = {});
    st.note = el.value; await crSave(d); toast('تم الحفظ');
  });

  /* جدول الأقساط */
  const gen = $('[data-cr-genpay]');
  if(gen) gen.onclick = async ()=>{
    const tenor = Number($('#crTenor').value)||0;
    const grace = Number($('#crGrace').value)||0;
    const first = $('#crFirst').value;
    const manual = Number($('#crInst').value)||0;
    const disb = $('#crDisb').value;
    if(!tenor || tenor<=0){ toast('أدخل عدد الأشهر','err'); return; }
    if(Number(d.approvedAmount)<=0){ toast('أدخل المبلغ المعتمد أولاً في بيانات الملف','err'); return; }
    if(!first){ toast('أدخل تاريخ أول قسط','err'); return; }
    if((d.payments||[]).some(p=>p.paid)){
      if(!confirm('يوجد أقساط مسدَّدة. إعادة التوليد ستحذف سجل السداد الحالي. متابعة؟')) return;
    }
    const count = Math.max(1, tenor - Math.max(0,grace));
    const amount = manual>0? manual : Math.round(Number(d.approvedAmount)/count*100)/100;
    const list = [];
    const base = new Date(first+'T00:00:00');
    for(let i=0;i<count;i++){
      const dt = new Date(base.getFullYear(), base.getMonth()+i, base.getDate());
      list.push({ id:uid(), n:i+1, due:dt.toISOString().slice(0,10), amount, paid:false, paidDate:'' });
    }
    d.tenorMonths = tenor; d.graceMonths = grace; d.firstInstallmentDate = first;
    d.installmentAmount = manual>0? manual : ''; d.disburseDate = disb || d.disburseDate || '';
    d.payments = list;
    crLog(d, 'paygen', 'توليد جدول الأقساط', `${count} قسط × ${crmoney(amount, d.currency)} — أول استحقاق ${fdate(first,'short')}`);
    await crSave(d); toast('تم توليد جدول الأقساط'); render('credits/'+id);
  };
  const csvPay = $('[data-cr-csvpay]'); if(csvPay) csvPay.onclick = ()=>{
    const rows = (d.payments||[]).map((p,i)=>[i+1, p.due, p.amount, p.paid?'مسدَّد':'غير مسدَّد', p.paidDate||'']);
    creditDownloadCSV([['#','تاريخ الاستحقاق','المبلغ','الحالة','تاريخ السداد'], ...rows], `اقساط_${(d.ref||'ملف').replace(/[\/\\]/g,'-')}.csv`);
  };
  const prPay = $('[data-cr-printpay]'); if(prPay) prPay.onclick = ()=>printCreditDossier(d, 'payments');
  const prDocs = $('[data-cr-printdocs]'); if(prDocs) prDocs.onclick = ()=>printCreditDossier(d, 'docs');
  const prLog = $('[data-cr-printlog]'); if(prLog) prLog.onclick = ()=>printCreditDossier(d, 'log');

  /* الملاحظات */
  const addNote = $('[data-cr-addnote]');
  if(addNote) addNote.onclick = async ()=>{
    const text = ($('#crNoteText').value||'').trim();
    if(!text){ toast('اكتب الملاحظة أولاً','err'); return; }
    d.notes = d.notes || [];
    d.notes.push({ id:uid(), at:new Date().toISOString(), by:'السكرتارية', text });
    crLog(d, 'note', 'إضافة ملاحظة', text.length>90? text.slice(0,90)+'…' : text);
    await crSave(d); toast('تمت إضافة الملاحظة'); render('credits/'+id);
  };
  $$('[data-cr-delnote]').forEach(b=>b.onclick = async ()=>{
    const [did,nid] = b.dataset.crDelnote.split('|');
    const dd = creditById(did); if(!dd) return;
    dd.notes = (dd.notes||[]).filter(n=>n.id!==nid);
    await crSave(dd); toast('تم حذف الملاحظة'); render('credits/'+did);
  });

  /* إغلاق / إعادة فتح / حذف الملف */
  const closeB = $('[data-cr-close]');
  if(closeB) closeB.onclick = async ()=>{
    if(!confirm('إغلاق الملف وأرشفته؟ سيُسجَّل تاريخ الإغلاق ويمكن إعادة فتحه لاحقاً.')) return;
    d.status = 'closed'; d.closedAt = new Date().toISOString();
    d.steps.close = { done:true, date:crToday(), by:d.manager||'', note:'إغلاق الملف' };
    crLog(d, 'close', 'إغلاق الملف وأرشفته', 'انتقل الملف إلى أرشيف الاعتمادات');
    await crSave(d); toast('تم إغلاق الملف وأرشفته'); render('credits/'+id);
  };
  const reopenB = $('[data-cr-reopen]');
  if(reopenB) reopenB.onclick = async ()=>{
    if(!confirm('إعادة فتح الملف؟')) return;
    d.status = 'active'; d.closedAt = '';
    if(d.steps && d.steps.close){ d.steps.close.done = false; d.steps.close.date=''; }
    crLog(d, 'status', 'إعادة فتح الملف', '');
    await crSave(d); toast('تمت إعادة فتح الملف'); render('credits/'+id);
  };
  const delB = $('[data-cr-del]');
  if(delB) delB.onclick = async ()=>{
    if(!confirm(`حذف ملف الاعتماد ${d.ref} نهائياً بكل مستنداته؟`)) return;
    DB.credits = (DB.credits||[]).filter(x=>x.id!==d.id);
    await persistDelete('credit', d.id);
    toast('تم حذف الملف'); go('credits');
  };
}

/* ---------- طباعة / تصدير ---------- */
function creditDocNextKey(doc){
  if(doc.dir==='out') return doc.status==='draft'? 'sent' : doc.status==='sent'? 'delivered' : null;
  return doc.status==='pending'? 'received' : doc.status==='received'? 'processed' : null;
}

function creditDownloadCSV(rows, name){
  const csv = '\uFEFF' + rows.map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
  download(new Blob([csv],{type:'text/csv;charset=utf-8'}), name);
}
function creditExportCSV(){
  const all = creditsSorted();
  const rows = [['رقم الملف','العميل','البنك','الفرع','النوع','العملة','المطلوب','المعتمد','المدة (شهر)','الفائدة %','مسؤول الملف','الشركة','تاريخ الفتح','المرحلة','النسبة','الحالة','عدد المستندات','تاريخ الإغلاق']];
  all.forEach(d=>{
    const pr = creditProgress(d);
    rows.push([
      d.ref, d.customerName, d.bank, d.bankBranch||'', d.facilityType||'', d.currency||'د.ل',
      d.requestedAmount||'', d.approvedAmount||'', d.tenorMonths||'', d.rate||'', d.manager||'',
      companyById(d.companyId).short, toISO(d.openedAt||d.createdAt), pr.current.name, pr.pct+'%',
      (CREDIT_STATUS[d.status]||{}).label||d.status, (d.docs||[]).length, d.closedAt? toISO(d.closedAt):''
    ]);
  });
  creditDownloadCSV(rows, `كشف_الاعتمادات_${todayISO()}.csv`);
  toast('تم تصدير كشف الاعتمادات');
}

function printCreditDossier(d, part){
  const cur = d.currency || 'د.ل';
  const pr = creditProgress(d);
  const st = CREDIT_STATUS[d.status] || CREDIT_STATUS.active;
  const co = companyById(d.companyId);
  const docs = [...(d.docs||[])].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const showDocs = !part || part==='docs';
  const showPay = !part || part==='payments';
  const showLog = !part || part==='log';
  const info = [
    ['البنك', `${d.bank||'—'}${d.bankBranch? ' — '+d.bankBranch:''}`],
    ['نوع التسهيل', d.facilityType||'—'],
    ['العميل / المستفيد', d.customerName||'—'],
    ['رقم السجل / الهاتف', [d.customerId, d.customerPhone].filter(Boolean).join(' — ')||'—'],
    ['المبلغ المطلوب', crmoney(d.requestedAmount, cur)],
    ['المبلغ المعتمد', Number(d.approvedAmount)>0? crmoney(d.approvedAmount, cur):'—'],
    ['مدة السداد', d.tenorMonths? `${d.tenorMonths} شهراً${d.graceMonths? ` (سماح ${d.graceMonths})`:''}`:'—'],
    ['الفائدة / المرابحة', d.rate!=='' && d.rate!=null? `${d.rate}%`:'—'],
    ['مسؤول الملف', d.manager||'—'],
    ['تاريخ الفتح', d.openedAt? fdate(d.openedAt):'—'],
    ['التاريخ المستهدف', d.targetDate? fdate(d.targetDate):'—'],
    ['المرحلة الحالية', `${pr.current.name} (${pr.pct}%)`],
    ['الحالة', st.label],
  ];
  const html = `
  <div class="sheet first-page cr-sheet">
    <div class="lh-head"><img src="${stationeryAssets(co, activeStationery(co)).header}" alt=""></div>
    <div class="sheet-content">
      <div class="crp-title">
        <div>
          <div class="t1">ملف اعتماد بنكي</div>
          <div class="t2">${esc(d.ref||'')}</div>
        </div>
        <div class="crp-stamp">${esc(st.label)}</div>
      </div>
      <table class="crp-table crp-info">
        ${info.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
      </table>
      ${d.purpose? `<div class="crp-block"><b>الغرض من التمويل:</b> ${esc(d.purpose)}</div>`:''}
      ${d.guarantees? `<div class="crp-block"><b>الضمانات:</b> ${esc(d.guarantees)}</div>`:''}

      <h3 class="crp-h">سير الإجراءات</h3>
      <table class="crp-table">
        <thead><tr><th style="width:34px">#</th><th>المرحلة</th><th style="width:90px">التاريخ</th><th style="width:120px">المسؤول</th><th>ملاحظة</th></tr></thead>
        <tbody>${CREDIT_STEPS.map((s,i)=>{
          const x = (d.steps||{})[s.k]||{};
          return `<tr class="${x.done?'ok':''}"><td>${i+1}</td><td>${esc(s.name)}</td><td>${x.done? (x.date? fdate(x.date,'short'):'✓'):'—'}</td><td>${esc(x.by||'—')}</td><td>${esc(x.note||'')}</td></tr>`;
        }).join('')}</tbody>
      </table>

      ${showDocs? `
      <h3 class="crp-h">الخطابات الصادرة والمستندات الواردة (${docs.length})</h3>
      ${docs.length? `<table class="crp-table">
        <thead><tr><th style="width:52px">الرقم</th><th>النوع / العنوان</th><th style="width:120px">المرجع</th><th style="width:70px">التاريخ</th><th style="width:64px">الاتجاه</th><th style="width:80px">الحالة</th></tr></thead>
        <tbody>${docs.map(x=>`<tr>
          <td>${esc(x.no||'—')}</td>
          <td>${esc(x.type||'')}${x.title && x.title!==x.type? ` — ${esc(x.title)}`:''}</td>
          <td>${esc(x.refNo||x.letterRef||'—')}</td>
          <td>${x.date? fdate(toISO(x.date),'short'):'—'}</td>
          <td>${x.dir==='out'? 'صادر':'وارد'}</td>
          <td>${esc((CREDIT_DOC_STATUS[x.status]||{}).label||'')}</td>
        </tr>`).join('')}</tbody>
      </table>`: `<div class="small muted">لا توجد مستندات مسجلة.</div>`}`:''}

      ${showPay && (d.payments||[]).length? `
      <h3 class="crp-h">جدول الأقساط (${(d.payments||[]).length})</h3>
      <table class="crp-table">
        <thead><tr><th style="width:34px">#</th><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>الحالة</th><th>تاريخ السداد</th></tr></thead>
        <tbody>${(d.payments||[]).map((p,i)=>`<tr class="${p.paid?'ok':''}"><td>${i+1}</td><td>${fdate(p.due,'short')}</td><td>${crmoney(p.amount,cur)}</td><td>${p.paid? 'مسدَّد':(p.due<crToday()? 'متأخر':'غير مسدَّد')}</td><td>${p.paidDate? fdate(toISO(p.paidDate),'short'):'—'}</td></tr>`).join('')}</tbody>
      </table>
      <div class="small" style="margin-top:3mm">إجمالي الأقساط: <b>${crmoney(creditScheduleTotal(d),cur)}</b> — المسدَّد: <b>${crmoney(creditPaidTotal(d),cur)}</b> — المتبقي: <b>${crmoney(Math.max(0,creditScheduleTotal(d)-creditPaidTotal(d)),cur)}</b></div>`:''}

      ${showLog && (d.events||[]).length? `
      <h3 class="crp-h">سجل المتابعة</h3>
      <table class="crp-table">
        <thead><tr><th style="width:110px">التاريخ</th><th>الحركة</th><th>التفاصيل</th></tr></thead>
        <tbody>${(d.events||[]).slice(0,40).map(e=>`<tr><td>${crdt(e.at)}</td><td>${esc(e.title)}</td><td>${esc(e.detail||'')}</td></tr>`).join('')}</tbody>
      </table>`:''}

      ${(d.notes||[]).length? `
      <h3 class="crp-h">الملاحظات</h3>
      <ul class="crp-notes">${(d.notes||[]).map(n=>`<li>${esc(n.text)} <span class="muted">— ${crdt(n.at)}</span></li>`).join('')}</ul>`:''}

      <div class="crp-sign">
        <div><div>مسؤول الملف</div><div class="nm">${esc(d.manager||'')}</div></div>
        <div><div>${esc(co.signTitle||'الإدارة العامة')}</div><div class="nm">${esc(co.signName||'')}</div></div>
        <div><div>الختم</div><div class="sp"></div></div>
      </div>
      <div class="crp-foot">${esc(co.name)} — ${esc(co.address||'')}${co.phone? ' — هاتف: '+esc(co.phone):''}</div>
    </div>
    <div class="lh-foot"><img src="${stationeryAssets(co, activeStationery(co)).footer}" alt=""></div>
  </div>`;
  printHTML(html);
}

function printCreditRegister(){
  const all = creditsSorted();
  const rows = all.map(d=>{
    const pr = creditProgress(d);
    return `<tr>
      <td>${esc(d.ref||'')}</td><td>${esc(d.customerName||'')}</td><td>${esc(d.bank||'')}</td>
      <td>${esc(d.facilityType||'')}</td><td>${crmoney(d.approvedAmount||d.requestedAmount, d.currency)}</td>
      <td>${esc(pr.current.name)}</td><td>${esc((CREDIT_STATUS[d.status]||{}).label||'')}</td>
      <td>${d.openedAt? fdate(d.openedAt,'short'):''}</td>
    </tr>`;
  }).join('');
  printHTML(`<div class="sheet first-page cr-sheet">
    <div class="lh-head"><img src="${stationeryAssets(activeCompany(), activeStationery(activeCompany())).header}" alt=""></div>
    <div class="sheet-content">
      <div class="crp-title"><div><div class="t1">كشف ملفات الاعتمادات البنكية</div><div class="t2">${all.length} ملف — ${fdate(todayISO())}</div></div></div>
      <table class="crp-table"><thead><tr><th>رقم الملف</th><th>العميل</th><th>البنك</th><th>النوع</th><th>المبلغ</th><th>المرحلة</th><th>الحالة</th><th>الفتح</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center">لا توجد ملفات</td></tr>'}</tbody></table>
    </div>
    <div class="lh-foot"><img src="${stationeryAssets(activeCompany(), activeStationery(activeCompany())).footer}" alt=""></div>
  </div>`);
}
