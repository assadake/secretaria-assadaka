/* =========================================================================
   الاعتمادات المستندية لاستيراد البضائع بالسعر الرسمي لمصرف ليبيا المركزي
   ------------------------------------------------------------------------
   Purchase of imported goods against an Import Documentary Letter of Credit
   (الاعتمادات المستندية) financed at the official USD / EUR exchange rate
   approved by the Central Bank of Libya (مصرف ليبيا المركزي).

   المبادئ الأساسية:
   • الاعتماد يُفتح لشراء بضائع مستوردة بالدولار (USD) أو اليورو (EUR) بسعر
     الصرف الرسمي المعتمد من مصرف ليبيا المركزي (سعر قابل للتعديل بأربعة منازل).
   • التغطية النقدية 100% بالدينار الليبي من رصيد حساب المستورد — لا تُجيز
     الضوابط استخدام التسهيلات الائتمانية أو القروض.
   • قرار المصرف/المركزي هو موافقة كاملة أو رفض — لا مبلغ جزئي، ولا أقساط.
   • الوثائق: بنكية ومركزي، فواتير مبدئية وتجارية، قوائم تعبئة، بوالص شحن
     وتأمين، شهادات تفتيش ومنشأ وصحة ورقابة، وثائق جمركية وإفراج، وإقرار
     جمركي أصلي يُقدَّم للمصرف خلال 60 يوماً من وصول مستندات الشحن.
   -------------------------------------------------------------------------
   Maintainer: AIS Secretariat
   ========================================================================= */

/* =========================================================================
   مراحل الاعتماد المستندي (10 مراحل)
   ========================================================================= */
const LC_STAGES = ['prep','submit','cbl_decision','swift_open','ship_inspect','docs_arrival','port_arrival','customs','settlement','close'];

const LC_STAGE_INFO = {
  prep:         { label:'1- التحضير والوثائق الأولية', icon:'📝', desc:'تجهيز الفاتورة المبدئية وعقد التوريد والرموز والسجلات المطلوبة' },
  submit:       { label:'2- تقديم الطلب للمصرف',     icon:'📤', desc:'تسليم طلب فتح الاعتماد والمستندات المكونة للملف إلى المصرف' },
  cbl_decision: { label:'3- قرار المصرف والمركزي',     icon:'⚖️', desc:'الموافقة أو الرفض النهائي على قيمة الفاتورة المبدئية (موافقة كاملة أو رفض)' },
  swift_open:   { label:'4- إصدار سويفت MT700',         icon:'🏦', desc:'إصدار سويفت MT700 والتأكيد من المصرف المُراسل (Advising Bank)' },
  ship_inspect: { label:'5- الشحن والتفتيش',           icon:'🚢', desc:'التجهيز للشحن، التفتيش قبل الشحن، شهادات المنشأ والصحة' },
  docs_arrival: { label:'6- وصول مستندات الشحن',       icon:'📥', desc:'وصول مستندات الشحن الأصلية وفحص المطابقة لدى المصرف' },
  port_arrival: { label:'7- وصول البضاعة للميناء',     icon:'🏗️', desc:'وصول البضاعة إلى الميناء وبدء إجراءات الإفراج' },
  customs:      { label:'8- الإفراج الجمركي',          icon:'🛃', desc:'إتمام الإقرار الجمركي وفحص البضاعة ورفع الحجز' },
  settlement:   { label:'9- التسوية والسداد',           icon:'💰', desc:'تقديم الإقرار الجمركي الأصلي وتسديد قيمة الاعتماد للبائع' },
  close:        { label:'10- إقفال الاعتماد',           icon:'🏁', desc:'تسوية وإقفال ملف الاعتماد لدى المصرف والمركزي' },
};

/* مجموعات الوثائق (6 مجموعات) */
const LC_CATS = [
  { id:'bank',       name:'وثائق مصرفية والمركزي',                 icon:'🏦', color:'blue'   },
  { id:'invoices',   name:'الفواتير وعقود التوريد',                 icon:'🧾', color:'green'  },
  { id:'shipping',   name:'قوائم التعبئة والشحن والتأمين',          icon:'📦', color:'gold'   },
  { id:'inspection', name:'شهادات التفتيش والمنشأ والرقابة',       icon:'🔬', color:'purple' },
  { id:'customs',    name:'الوثائق الجمركية والإفراج',             icon:'🛃', color:'red'    },
  { id:'legal',      name:'المستندات القانونية والضريبية',         icon:'🏛️', color:'green'  },
];

/* القائمة القياسية للوثائق (18+ وثيقة منظمة في 6 مجموعات) */
const LC_CHECKLIST = [
  // bank
  { id:'req_open',    cat:'bank', label:'طلب فتح الاعتماد المستندي', hint:'نموذج طلب فتح اعتماد مستندي غير قابل للإلغاء' },
  { id:'cbl_key',     cat:'bank', label:'الرمز المصرفي CBL Key والرقم الإحصائي', hint:'رمز منظومة مصرف ليبيا المركزي' },
  { id:'cbl_pub',     cat:'bank', label:'إقرار النشر بالمنظومة المركزي', hint:'تسجيل الاعتماد بمنظومة المصرف المركزي' },
  { id:'cbl_cover',   cat:'bank', label:'حجز التغطية النقدية 100% بالدينار', hint:'تغطية نقدية كاملة من رصيد حساب المستورد' },
  { id:'cbl_dec',     cat:'bank', label:'قرار المنظومة: الموافقة / الرفض', hint:'قرار المصرف والمركزي (موافقة كاملة أو رفض)' },
  { id:'swift_msg',   cat:'bank', label:'رسالة سويفت MT700 / MT707', hint:'رسالة فتح الاعتماد المرسلة للبنك المُراسل' },
  { id:'docs_check',  cat:'bank', label:'إشعار ورود وفحص مستندات الشحن', hint:'إشعار استلام المستندات وفحص المطابقة' },
  { id:'docs_rec',    cat:'bank', label:'حافظة استلام مستندات الشحن الأصلية', hint:'إيصال/حافظة استلام المستندات الأصلية' },
  { id:'swift_pay',   cat:'bank', label:'سويفت السداد MT103 / MT202', hint:'رسالة تحويل/سداد قيمة الاعتماد للبائع' },
  { id:'close_letter',cat:'bank', label:'كتاب تسوية وإقفال الملف', hint:'إقفال ملف الاعتماد لدى المصرف والمركزي' },
  // invoices
  { id:'proforma',    cat:'invoices', label:'الفاتورة المبدئية Proforma Invoice', hint:'فاتورة مبدئية معتمدة من المصنّع/المصدّر' },
  { id:'inv_commercial', cat:'invoices', label:'الفاتورة التجارية الأصلية المصدقة', hint:'فاتورة تجارية أصلية مصدقة/موثقة' },
  { id:'contract',    cat:'invoices', label:'عقد التوريد / عقد البيع', hint:'عقد التوريد أو البيع المبرم مع المصدّر' },
  // shipping
  { id:'packing',     cat:'shipping', label:'قائمة التعبئة Packing List والأوزان', hint:'قائمة تعبئة وتفصيل أوزان وعدد القطع' },
  { id:'bl',          cat:'shipping', label:'بوليصة الشحن النظيفة B/L / CMR / AWB', hint:'بوليصة شحن نظيفة (تاريخها بعد MT700)' },
  { id:'insurance',   cat:'shipping', label:'وثيقة التأمين البحري المحلية', hint:'وثيقة تأمين بحري صالحة وفق الاعتماد' },
  // inspection
  { id:'inspection_cert', cat:'inspection', label:'شهادة التفتيش قبل الشحن', hint:'SGS / BV / Intertek / Cotecna (CBL Key، ISO 17020)' },
  { id:'origin',      cat:'inspection', label:'شهادة المنشأ الأصلية المصدقة', hint:'شهادة منشأ أصلية مصدقة' },
  { id:'health',      cat:'inspection', label:'الشهادة الصحية / شهادة الذبح الحلال', hint:'شهادة صحية أو شهادة ذبح حلال للسلع المعنية' },
  { id:'coa',         cat:'inspection', label:'شهادة التحليل والمطابقة CoA', hint:'شهادة تحليل ومطابقة للمواصفات القياسية' },
  { id:'fdcc',        cat:'inspection', label:'إفراج مركز الرقابة على الأغذية والأدوية', hint:'إفراج/موافقة FDCC (مركز الرقابة)' },
  // customs
  { id:'customs_decl',cat:'customs', label:'الإقرار الجمركي الأصلي المعتمد', hint:'أصل الإقرار الجمركي الدال على دخول البضاعة' },
  { id:'form18',      cat:'customs', label:'النموذج الجمركي (النموذج 18)', hint:'النموذج 18 المرفوع للمصرف في مهلة 60 يوماً' },
  { id:'customs_rel', cat:'customs', label:'إذن الإفراج الجمركي النهائي', hint:'إذن رفع أو إفراج جمركي نهائي' },
  { id:'duties',      cat:'customs', label:'إيصالات الرسوم والضرائب والموانئ', hint:'سندات/إيصالات سداد الرسوم الجمركية والموانئ' },
  // legal
  { id:'legal_reg',   cat:'legal', label:'السجل التجاري والرخصة والغرفة التجارية', hint:'السجل التجاري، الرخصة التجارية، شهادة الغرفة' },
  { id:'importers_reg',cat:'legal', label:'سجل المستوردين المعتمد', hint:'قيد/اعتماد الشركة بسجل المستوردين' },
  { id:'tax_clear',   cat:'legal', label:'شهادة السداد الضريبي والضمانية والتضامنية الأصلية', hint:'شهادات السداد الضريبي، الضمان، التضامن (أصلية)' },
];

const CURRENCIES = ['USD','EUR'];
const INCOTERMS = ['CIF','CFR','FOB','CPT','CIP','EXW'];

const LC_DECISION_LABELS = { pending:'قيد الدراسة', approved:'مُوافق عليه', rejected:'مرفوض' };
const LC_DECISION_BADGE = { pending:'gold', approved:'green', rejected:'red' };
const LC_CHANGE_LABELS = {
  prep:'جارٍ', submit:'قيد التقديم', cbl_decision:'تحت النظر', swift_open:'في الإصدار',
  ship_inspect:'قيد الشحن والتفتيش', docs_arrival:'وصلت مستندات الشحن', port_arrival:'البضاعة بالميناء',
  customs:'قيد الإفراج', settlement:'في التسوية', close:'أُقفِل',
};

/* =========================================================================
   أدوات مساعدة
   ========================================================================= */
function crEnsure(db){
  if(!db) return;
  if(!Array.isArray(db.credits)) db.credits = [];
  db.credits.forEach(d=>{
    d.category = 'import_lc';
    if(!d.amountFX && d.amount) d.amountFX = d.amount;
    if(!d.amount && d.amountFX) d.amount = d.amountFX;
    if(!d.officialRate) d.officialRate = '';
    if(!d.currency) d.currency = 'USD';
    if(!d.incoterm) d.incoterm = 'CIF';
    if(!d.lcType) d.lcType = 'Documentary L/C (Import)';
    if(d.status === undefined) d.status = 'active';
    if(!d.stage) d.stage = (d.decision === 'approved') ? 'swift_open' : 'prep';
    if(!Array.isArray(d.docs)) d.docs = [];
    if(!Array.isArray(d.docsExtra)) d.docsExtra = [];
    if(!Array.isArray(d.files)) d.files = [];
    if(!Array.isArray(d.notes)) d.notes = [];
    if(!Array.isArray(d.timeline)) d.timeline = [];
    d.decision = ['pending','approved','rejected'].includes(d.decision) ? d.decision : 'pending';
    delete d.approvedAmount; // قرار المصرف: موافقة كاملة أو رفض — لا مبلغ جزئي
    delete d.installments;   // الاعتمادات المستندية لا تحتوي على أقساط
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

/* التغطية النقدية 100% بالدينار = القيمة × سعر الصرف الرسمي × (1 + العمولة%) */
function lcCoverage(d){
  const fx = Number(d.amountFX)||0, rate = Number(d.officialRate)||0;
  if(fx > 0 && rate > 0){
    const fee = (Number(d.bankFeePct)||0)/100;
    return Math.round(fx*rate*(1+fee)*100)/100;
  }
  return null;
}
function lcCustomsDeadline(d){
  if(!d.docsArrivalDate) return null;
  const base = new Date(d.docsArrivalDate);
  base.setDate(base.getDate()+60);
  return base.toISOString().slice(0,10);
}
function lcCustomsDays(d){
  const deadline = lcCustomsDeadline(d);
  if(!deadline) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(deadline+'T00:00:00') - today)/86400000);
}
function lcBlWarning(d){
  if(!d.blDate || !d.swiftDate) return null;
  return d.blDate < d.swiftDate;
}
function lcExpiryDays(d){
  if(!d.expiryDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(d.expiryDate+'T00:00:00') - today)/86400000);
}
function lcStageIdx(d){ return Math.max(0, LC_STAGES.indexOf(d.stage||'prep')); }

/* التنبيهات الذكية (مهلة الجمارك، انتهاء صلاحية الاعتماد، تناقض التاريخ، نقص الوثائق) */
function lcUrgency(d){
  const alerts = [];
  const cd = lcCustomsDays(d);
  if(cd !== null && cd <= 60 && !d.customsDeclNo && d.stage !== 'close')
    alerts.push({ text:`مهلة الإقرار الجمركي: ${cd} يوماً متبقياً (60 يوماً من وصول المستندات)`, tone: cd<=10?'red':'amber' });
  const exp = lcExpiryDays(d);
  if(exp !== null && exp <= 0 && d.stage !== 'close')
    alerts.push({ text:'انتهاء صلاحية الاعتماد المستندي (Expiry)', tone:'red' });
  else if(exp !== null && exp <= 30 && d.stage !== 'close')
    alerts.push({ text:`انتهاء صلاحية الاعتماد خلال ${exp} يوماً`, tone:'amber' });
  if(lcBlWarning(d))
    alerts.push({ text:'تاريخ بوليصة الشحن يسبق تأكيد MT700 — تحقق من تاريخ السويفت', tone:'red' });
  const missing = ['req_open','cbl_key','proforma'].filter(k=>!(d.docs||[]).includes(k));
  if(d.stage === 'prep' && missing.length)
    alerts.push({ text:`وثائق أساسية غير مكتملة: ${missing.length} وثيقة`, tone:'amber' });
  if(!alerts.length) alerts.push({ text:'لا يوجد تنبيه — الملف منتظم', tone:'green' });
  return alerts;
}

/* =========================================================================
   الحالة الصحية للاعتماد (متوافق مع واجهة الDashboard)
   ========================================================================= */
function creditHealth(d){
  if(!d) return { level:'ok', label:'—', reasons:[] };
  if(d.decision === 'rejected') return { level:'danger', label:'مرفوض', reasons:['رُفض طلب الاعتماد — يمكن تعديله وإعادة التقديم'] };
  if(d.stage === 'close') return { level:'ok', label:'أُقفِل ومُرفَق', reasons:[] };
  const reasons = lcUrgency(d).filter(a=>a.tone !== 'green').map(a=>a.text);
  if(reasons.length) return { level:'danger', label: reasons[0], reasons };
  if(d.decision === 'approved') return { level:'ok', label:`مُوافق عليه — ${LC_STAGE_INFO[d.stage]?.label||d.stage}`, reasons:[] };
  return { level:'warn', label:'قيد الدراسة', reasons:['ليس به مخاطر ملحوظة'] };
}

/* =========================================================================
   الإحصائيات (متوافق مع واجهة الDashboard)
   ========================================================================= */
function creditStats(all){
  const all2 = all.filter(d=>d && d.category === 'import_lc');
  const active = all2.filter(d=>d.status !== 'closed' && d.status !== 'rejected');
  return {
    active: active.length,
    late: all2.filter(d=>creditHealth(d).level === 'danger' && d.stage !== 'close' && d.decision !== 'rejected').length,
    approved: all2.filter(d=>d.decision === 'approved').length,
    closed: all2.filter(d=>d.stage === 'close').length,
    pending: all2.filter(d=>d.decision === 'pending').length,
    rejected: all2.filter(d=>d.decision === 'rejected').length,
    total: all2.reduce((s,d)=>s+(Number(d.amountFX)||0),0),
    totalLYD: all2.reduce((s,d)=>s+(lcCoverage(d)||0),0),
    urgent: all2.filter(d=>{
      const cd = lcCustomsDays(d);
      return (cd !== null && cd <= 60 && !d.customsDeclNo) || (lcExpiryDays(d) !== null && lcExpiryDays(d) <= 30);
    }).length,
  };
}

/* =========================================================================
   النافذة الموجزة (Modal)
   ========================================================================= */
function closeModal(){ const bg = $('#modalBg'); if(bg){ bg.classList.remove('open'); bg.innerHTML=''; } }
function openModal(html){
  const bg = $('#modalBg');
  bg.innerHTML = html;
  bg.classList.add('open');
  $$('[data-close]', bg).forEach(b=>b.onclick = closeModal);
  bg.onclick = e=>{ if(e.target===bg) closeModal(); };
}

/* =========================================================================
   السجل الزمني والحفظ
   ========================================================================= */
function crLog(d, type, title, detail){
  d.timeline = d.timeline || [];
  d.timeline.unshift({ id:uid(), at:new Date().toISOString(), type, title, detail:detail||'' });
  if(d.timeline.length > 400) d.timeline.length = 400;
  d.updatedAt = Date.now();
}
async function crSave(d){
  d.updatedAt = Date.now();
  await persistDoc('credit', d);
}

/* =========================================================================
   صفحة قائمة الاعتمادات
   ========================================================================= */
let creditFilter = { q:'', chip:'all' };

function creditCard(d){
  const health = creditHealth(d);
  const cov = lcCoverage(d);
  const alerts = lcUrgency(d).filter(a=>a.tone !== 'green');
  const idx = lcStageIdx(d);
  return `
    <div class="card cr-card" data-open="${esc(d.id)}" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="min-width:0">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
            <span class="badge ${LC_DECISION_BADGE[d.decision]||'blue'}">${LC_DECISION_LABELS[d.decision]||d.decision}</span>
            ${alerts.length? `<span class="badge red">${alerts.length} تنبيه</span>`:''}
            <span class="badge blue">المرحلة ${idx+1}/10</span>
          </div>
          <div style="font-weight:800;font-size:1.02rem;color:#2f4860;margin-bottom:2px">${esc(d.supplierName||'المستفيد (المصدّر)')}</div>
          <div class="small muted">${esc(d.goodsDesc||d.title||'اعتماد مستندي')}</div>
        </div>
        <div style="text-align:right;white-space:nowrap">
          <div style="font-weight:800;font-size:1.05rem;color:#2f4860">${fnum(d.amountFX)} <span style="font-size:.78rem;color:#7c8aa5">${esc(d.currency||'USD')}</span></div>
          ${cov !== null? `<div class="small" style="color:#0a7a3c">التغطية ${fnum(cov)} د.ل</div>`:''}
        </div>
      </div>
      <div class="small muted" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px 14px">
        <span>🏢 ${esc(d.companyName||activeCompany().name)}</span>
        ${d.lcNumber? `<span>🔖 الاعتماد ${esc(d.lcNumber)}</span>`:''}
        ${d.incoterm? `<span>🚢 ${esc(d.incoterm)}</span>`:''}
        <span>📅 ${fdate(d.openDate||d.date)}</span>
      </div>
      <div class="small" style="margin-top:5px;color:${health.level==='danger'?'#c0392b':health.level==='warn'?'#b7791f':'#2e7d4f'}">${esc(health.label)}</div>
    </div>`;
}

function viewCredits(){
  const all = creditsSorted();
  const stats = creditStats(all);
  let list = all;
  if(creditFilter.q){
    const q = creditFilter.q.toLowerCase();
    list = list.filter(d=>[d.supplierName,d.goodsDesc,d.companyName,d.lcNumber,d.ref].some(x=>String(x||'').toLowerCase().includes(q)));
  }
  if(creditFilter.chip && creditFilter.chip !== 'all'){
    list = list.filter(d=>d.stage === creditFilter.chip);
  }
  return `
    <div class="page-head" style="margin-bottom:8px">
      <div>
        <h2 class="page-title" style="margin-bottom:2px">🏦 الاعتمادات المستندية لاستيراد البضائع</h2>
        <div class="page-sub">فتح اعتمادات مستندية لشراء البضائع المستوردة بسعر الصرف الرسمي المعتمد من مصرف ليبيا المركزي (USD / EUR) — قرار الموافقة أو الرفض كاملاً، وتغطية نقدية 100% بالدينار الليبي.</div>
      </div>
      <button class="btn btn-primary" data-new="1">＋ فتح اعتماد مستندي جديد</button>
    </div>

    <div class="stats" style="margin-bottom:12px">
      <div class="stat"><div class="ico">🏦</div><div><div class="v">${stats.active}</div><div class="l">اعتماد جارٍ</div></div></div>
      <div class="stat gold"><div class="ico">⏳</div><div><div class="v">${stats.pending}</div><div class="l">قيد الدراسة</div></div></div>
      <div class="stat green"><div class="ico">✔</div><div><div class="v">${stats.approved}</div><div class="l">مُوافق عليه</div></div></div>
      <div class="stat red"><div class="ico">✘</div><div><div class="v">${stats.rejected}</div><div class="l">مرفوض</div></div></div>
      <div class="stat"><div class="ico">💱</div><div><div class="v">${fnum(stats.total)}</div><div class="l">إجمالي القيمة بالعملة الأجنبية</div></div></div>
      <div class="stat"><div class="ico">🛅</div><div><div class="v">${fnum(stats.totalLYD)}</div><div class="l">إجمالي التغطية بالدينار</div></div></div>
      <div class="stat ${stats.urgent?'red':'green'}"><div class="ico">⚠️</div><div><div class="v">${stats.urgent}</div><div class="l">به تنبيه جمركي / انتهاء صلاحية</div></div></div>
    </div>

    <div class="card" style="margin-bottom:14px;background:#f7fafd">
      <div class="small" style="margin:2px 0">
        <b>تذكير:</b> الاعتمادات المستندية مخصصة لشراء البضائع المستوردة بالسعر الرسمي لـ <b>USD / EUR</b> المعتمد من مصرف ليبيا المركزي. التغطية النقدية 100% بالدينار، والقرار هو <b>موافقة كاملة أو رفض</b> — لا يتم الموافقة على مبلغ جزئي.
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <input id="crSearch" class="input" style="flex:1;min-width:220px" placeholder="بحث في المصدّر / البضاعة / رقم الاعتماد...">
      <select id="crFilterStage" class="input" style="width:auto">
        <option value="all">كل المراحل</option>
        ${LC_STAGES.map(s=>`<option value="${s}">${LC_STAGE_INFO[s].label}</option>`).join('')}
      </select>
    </div>

    ${list.length === 0? `<div class="empty"><span class="big">🏦</span>لا توجد اعتمادات مستندية. اضغط «فتح اعتماد مستندي جديد» لبدء ملف جديد.</div>`:
      `<div class="grid-3">${list.map(creditCard).join('')}</div>`}
  `;
}

/* =========================================================================
   صفحة الاعتماد الواحد (دوسية كاملة — 5 أقسام)
   ========================================================================= */
let creditTab = 'docs';

function lcDocRowHtml(d, doc){
  const checked = d.docs.includes(doc.id);
  const files = (d.files||[]).filter(f=>f.docId === doc.id);
  const cat = LC_CATS.find(c=>c.id === doc.cat);
  return `
    <div class="cr-doc" data-doc-id="${esc(doc.id)}">
      <label class="cr-doc-check">
        <input type="checkbox" data-doc-toggle="${esc(doc.id)}" ${checked?'checked':''}>
        <div style="flex:1;min-width:0">
          <div class="cr-doc-label">${esc(doc.label)} ${cat?`<span class="badge" style="font-size:.68rem;padding:1px 7px">${cat.icon} ${esc(cat.name)}</span>`:''}</div>
          ${doc.hint? `<div class="cr-doc-hint">${esc(doc.hint)}</div>`:''}
        </div>
      </label>
      <div class="cr-doc-actions">
        <span class="badge ${checked?'green':'grey'}" style="font-size:.7rem">${checked?'مطابق':'ناقص'}</span>
        <button type="button" class="btn-sm" data-doc-scan="${esc(doc.id)}">📎 تصوير</button>
        <button type="button" class="btn-sm" data-doc-letter="${esc(doc.id)}">✉️ خطاب</button>
      </div>
      ${files.length? `<div class="cr-doc-files">${files.map(f=>`<span class="cr-doc-file" data-doc-file="${esc(f.name)}" data-doc-id="${esc(doc.id)}">📄 ${esc(f.name)}</span>`).join('')}</div>`:''}
    </div>`;
}

function lcDocsSectionHtml(d){
  const items = LC_CHECKLIST.concat((d.docsExtra||[]).map((x,i)=>({ ...x, id:x.id||('extra_'+i), label:x.label })));
  const total = items.length, done = d.docs.filter(id=>items.some(x=>x.id===id)).length;
  return `
    <div class="cr-doc-pills">
      <button class="cr-doc-pill active" data-doccat="all">📋 الكل (${total})</button>
      ${LC_CATS.map(c=>`<button class="cr-doc-pill" data-doccat="${c.id}">${c.icon} ${esc(c.name)}</button>`).join('')}
    </div>
    <div class="cr-doc-bar">
      <button class="btn btn-sm" data-seed="1">⚡ توليد/استكمال قائمة الوثائق القياسية</button>
      <button class="btn btn-sm" data-adddoc="1">＋ وثيقة إضافية</button>
      <span class="small muted">${done} من ${total} وثيقة مطابقة</span>
    </div>
    <div class="cr-docs" id="crDocList">
      ${items.map(x=>lcDocRowHtml(d,x)).join('')}
    </div>`;
}

function lcDecisionHtml(d){
  const cov = lcCoverage(d);
  return `
    <div class="cr-fx-box">
      <div class="cr-fx-row">
        <div><div class="cr-fx-label">عملة الاعتماد</div><div class="cr-fx-val">${esc(d.currency||'USD')}</div></div>
        <div><div class="cr-fx-label">قيمة الفاتورة بالعملة الأجنبية</div><div class="cr-fx-val">${fnum(d.amountFX)}</div></div>
        <div><div class="cr-fx-label">سعر الصرف الرسمي المعتمد (د.ل)</div><div class="cr-fx-val">${d.officialRate? esc(d.officialRate):'غير محدَّد'}</div></div>
        <div><div class="cr-fx-label">العمولة / الرسوم (%)</div><div class="cr-fx-val">${d.bankFeePct? esc(d.bankFeePct):'—'}</div></div>
        <div><div class="cr-fx-label">التغطية النقدية 100% بالدينار</div><div class="cr-fx-val cr-fx-lyd">${cov !== null? fnum(cov)+' د.ل':'غير محدَّد'}</div></div>
      </div>
      <div class="cr-fx-note">التغطية النقدية كاملة (100%) بالدينار الليبي وفق سعر الصرف الرسمي لمصرف ليبيا المركزي، وتُخصم من رصيد حساب المستورد — لا تُجيز الضوابط استخدام التسهيلات الائتمانية أو القروض.</div>
    </div>
    <div class="cr-decision-box ${d.decision}">
      <div>
        <div class="cr-decision-label">قرار المصرف / المركزي</div>
        <div class="cr-decision-value">${LC_DECISION_LABELS[d.decision]||d.decision}</div>
        ${d.decisionDate? `<div class="cr-decision-meta">تاريخ القرار: ${fdate(d.decisionDate)}</div>`:''}
        ${d.decisionBy? `<div class="cr-decision-meta">القرار من: ${esc(d.decisionBy)}</div>`:''}
        ${d.decisionReason? `<div class="cr-decision-meta">سبب القرار: ${esc(d.decisionReason)}</div>`:''}
      </div>
      <div class="cr-decision-actions">
        ${d.decision==='pending'? `
          <button class="btn btn-primary" data-dec="approved">✔ اعتماد — الموافقة الكاملة</button>
          <button class="btn btn-red" data-dec="rejected">✘ رفض الاعتماد</button>`:
          `<button class="btn" data-dec="pending">↩ إلغاء القرار (قيد الدراسة)</button>`}
      </div>
    </div>
    ${d.decision==='rejected'? `<div class="cr-reject-hint">يمكن تعديل المستندات وإعادة تقديم الطلب. اضغط «↩ إلغاء القرار» ثم وثّق سبب التعديل أو أرفق المستندات الجديدة.</div>`:''}
  `;
}

function lcShipHtml(d){
  const deadline = lcCustomsDeadline(d);
  const days = lcCustomsDays(d);
  const bw = lcBlWarning(d);
  const cell = (l,v)=> v? `<div><label>${l}</label><div>${v}</div></div>`:'';
  return `
    <div class="cr-section-grid">
      ${cell('الشركة المصدِّرة (المستفيد)', esc(d.supplierName))}
      ${cell('بلد المنشأ / التصدير', esc(d.supplierCountry))}
      ${cell('المستفيد / البنك المراسل', esc(d.beneficiaryBank)+(d.beneficiarySwift?` — ${esc(d.beneficiarySwift)}`:''))}
      ${cell('فئة البضاعة', esc(d.goodsCategory))}
      ${cell('رمز النظام المنسق HS', esc(d.hsCode))}
      ${cell('وصف البضاعة والكمية', esc(d.goodsDesc))}
      ${cell('رقم الفاتورة المبدئية', esc(d.proformaNo)+(d.proformaDate?` (${fdate(d.proformaDate,'short')})`:''))}
      ${cell('شروط التسليم Incoterm', esc(d.incoterm))}
      ${cell('ميناء / منفذ الوصول', esc(d.portDischarge))}
      ${cell('رقم الاعتماد L/C No.', esc(d.lcNumber))}
      ${cell('مرجع المركزي CBL', esc(d.cblRef))}
      ${cell('الرمز المصرفي CBL Key', esc(d.cblKey))}
      ${cell('تاريخ MT700 / التأكيد', fdate(d.swiftDate))}
      ${cell('آخر موعد للشحن', fdate(d.latestShipDate))}
      ${cell('انتهاء صلاحية الاعتماد', fdate(d.expiryDate))}
      ${cell('تاريخ وصول مستندات الشحن', fdate(d.docsArrivalDate))}
      ${cell('تاريخ بوليصة الشحن B/L', fdate(d.blDate))}
      ${cell('رقم الإقرار الجمركي', esc(d.customsDeclNo))}
      ${cell('تاريخ الإقرار الجمركي', fdate(d.customsDeclDate))}
    </div>
    ${deadline? `<div class="cr-countdown ${days!==null&&days<=10?'red':''}">
      ⏳ مهلة تقديم الإقرار الجمركي الأصلي للمصرف: <b>${fdate(deadline)}</b>
      ${days!==null? ` — بقي <b>${days}</b> يوماً من أصل 60 يوماً (من تاريخ استلام مستندات الشحن)`:''}
    </div>`:`<div class="cr-countdown muted">لم يُسجَّل تاريخ وصول مستندات الشحن — المهلة تبدأ من تاريخ وصول المستندات (60 يوماً).</div>`}
    ${bw? `<div class="cr-alert red">تنبيه: تاريخ بوليصة الشحن يسبق تأكيد MT700 — يجب أن يكون تاريخ بوليصة الشحن بعد تاريخ إصدار/تأكيد الاعتماد.</div>`:''}
  `;
}

function lcFlowHtml(d){
  const idx = lcStageIdx(d);
  return `
    <div class="cr-flow">
      ${LC_STAGES.map((s,i)=>{
        const state = i<idx?'done':i===idx?'active':'todo';
        const ev = (d.timeline||[]).find(t=>t.title && t.title.includes(LC_STAGE_INFO[s].label));
        return `
        <div class="cr-flow-stage ${state}">
          <div class="cr-flow-dot">${state==='done'?'✔':state==='active'?(i+1):'·'}</div>
          <div style="flex:1">
            <div class="cr-flow-title">${LC_STAGE_INFO[s].label}</div>
            <div class="cr-flow-desc">${LC_STAGE_INFO[s].desc}</div>
            ${ev? `<div class="cr-flow-time">${fdate(ev.at)}</div>`:''}
          </div>
          ${state!=='done'? `<button class="btn-sm" data-stage="${s}">تحديد</button>`:''}
        </div>`;
      }).join('')}
    </div>
    <div class="cr-timeline">
      <div class="card-head">سجل التغييرات على الاعتماد</div>
      ${(d.timeline||[]).length===0? `<div class="empty small">لا توجد حركات مسجلة بعد.</div>`:
        d.timeline.slice().map(t=>`
        <div class="cr-tl">
          <div class="cr-tl-dot"></div>
          <div>
            <div class="cr-tl-title">${esc(t.title||'')}</div>
            <div class="cr-tl-meta">${fdate(t.at)} — ${esc(t.detail||'')}</div>
          </div>
        </div>`).join('')}
    </div>`;
}

function lcNotesHtml(d){
  return `
    <div class="cr-notes">
      <textarea id="crNote" class="input" rows="6" placeholder="ملاحظات إدارة الاعتماد... (مثال: متابعة سويفت MT700، التناقضات في مستندات الشحن، ملاحظات التخليص الجمركي)">${esc(d.notes||'')}</textarea>
      <button class="btn" data-savenote="1">حفظ الملاحظات</button>
    </div>`;
}

function creditDetail(id){
  const d = creditById(id);
  if(!d) return `<div class="card"><div class="empty"><span class="big">🏦</span>الملف غير موجود — قد يكون حُذف.<br><br><button class="btn" data-go="credits">رجوع إلى قائمة الاعتمادات</button></div></div>`;
  const alerts = lcUrgency(d).filter(a=>a.tone !== 'green');
  const cov = lcCoverage(d);
  return `
    <div class="page-head" style="margin-bottom:8px">
      <div style="min-width:0">
        <h2 class="page-title" style="margin-bottom:2px">🏦 الاعتماد المستندي — ${esc(d.supplierName||d.companyName||'اعتماد مستندي')}</h2>
        <div class="page-sub">${esc(d.goodsDesc||d.title||'')} ${d.lcNumber?`— رقم الاعتماد ${esc(d.lcNumber)}`:''} — ${esc(d.currency||'USD')} ${fnum(d.amountFX)}${cov!==null? ` | التغطية ${fnum(cov)} د.ل`:''}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm" data-export="1">تصدير CSV</button>
        <button class="btn btn-sm" data-print="dossier">🖨️ بطاقة الملف</button>
        <button class="btn btn-sm" data-print="checklist">🖨️ قائمة الوثائق</button>
        <button class="btn btn-sm btn-red" data-delete="1">حذف</button>
      </div>
    </div>
    ${alerts.length? `<div class="cr-alerts">${alerts.map(a=>`<div class="cr-alert ${a.tone}">${esc(a.text)}</div>`).join('')}</div>`:''}
    <div class="cr-tabs">
      <button class="cr-tab ${creditTab==='docs'?'active':''}" data-tab="docs">📋 الوثائق (${d.docs.length})</button>
      <button class="cr-tab ${creditTab==='decision'?'active':''}" data-tab="decision">⚖️ القرار والتغطية</button>
      <button class="cr-tab ${creditTab==='ship'?'active':''}" data-tab="ship">🚢 الشحن والجمارك</button>
      <button class="cr-tab ${creditTab==='flow'?'active':''}" data-tab="flow">🚶 التسلسل الزمني</button>
      <button class="cr-tab ${creditTab==='notes'?'active':''}" data-tab="notes">📝 الملاحظات</button>
    </div>
    <div class="cr-tab-panels">
      ${creditTab==='docs'? lcDocsSectionHtml(d):''}
      ${creditTab==='decision'? lcDecisionHtml(d):''}
      ${creditTab==='ship'? lcShipHtml(d):''}
      ${creditTab==='flow'? lcFlowHtml(d):''}
      ${creditTab==='notes'? lcNotesHtml(d):''}
    </div>
  `;
}
function viewCredit(id){ return creditDetail(id); }

/* =========================================================================
   نموذج إنشاء / تعديل الاعتماد
   ========================================================================= */
function lcFormModal(d){
  const isNew = !d;
  d = d || { category:'import_lc', status:'active', decision:'pending', stage:'prep', docs:[], docsExtra:[], files:[], notes:'', timeline:[] };
  const f = (k,label,val,type='text',ph='')=>{
    if(type==='select') return `<div class="field"><label>${label}</label><select name="${k}">${(val.opts||[]).map(o=>`<option value="${o.id}" ${o.v===o.id?'selected':''}>${o.t}</option>`).join('')}</select></div>`;
    if(type==='date')  return `<div class="field"><label>${label}</label><input type="date" name="${k}" value="${esc(val.v||'')}"></div>`;
    if(type==='number')return `<div class="field"><label>${label}</label><input type="number" step="0.0001" name="${k}" value="${esc(val.v||'')}" placeholder="${esc(ph)}"></div>`;
    return `<div class="field"><label>${label}</label><input name="${k}" value="${esc(val.v||'')}" placeholder="${esc(ph)}"></div>`;
  };
  const sel = (k,label,cur,opts,labels)=>`<div class="field"><label>${label}</label><select name="${k}">${opts.map(o=>`<option value="${o}" ${o===cur?'selected':''}>${(labels&&labels[o])||o}</option>`).join('')}</select></div>`;

  openModal(`
    <div class="modal" style="max-width:860px">
      <div class="modal-h"><h3>${isNew?'🏦 فتح اعتماد مستندي جديد':'✏️ تعديل الاعتماد المستندي'}</h3><button class="btn btn-sm" data-close>✕</button></div>
      <div class="modal-b">
        <form data-lcform>
          <div class="card-head" style="margin:0 0 10px">بيانات المستورد وفاتورة التجهيز</div>
          <div class="form-grid">
            ${f('companyName','اسم الشركة المستوردة',{v:d.companyName},'','مثال: مؤسسة الأبطال للتجارة العامة')}
            ${f('accountNo','رقم الحساب الجاري (حساب المستورد)',{v:d.accountNo},'','رقم الحساب أو IBAN لخصم التغطية')}
            ${f('cblKey','الرمز المصرفي CBL Key',{v:d.cblKey},'','رمز منظومة مصرف ليبيا المركزي')}
            ${f('statCode','الرقم الإحصائي',{v:d.statCode},'','الرقم الإحصائي للمستورد')}
            ${f('supplierName','الشركة المصدِّرة (المستفيد بالخارج)',{v:d.supplierName},'','الاسم الكامل للشركة المصدّرة')}
            ${f('supplierCountry','بلد المنشأ / التصدير',{v:d.supplierCountry},'','مثال: تركيا / إيطاليا')}
            ${f('beneficiaryBank','المستفيد / البنك المراسل',{v:d.beneficiaryBank},'','اسم البنك المُراسل')}
            ${f('beneficiarySwift','SWIFT للمستفيد',{v:d.beneficiarySwift},'','رمز SWIFT للبنك المراسل')}
            ${f('goodsCategory','فئة البضاعة',{v:d.goodsCategory},'','مثال: مواد غذائية / آلات')}
            ${f('hsCode','رمز النظام المنسق HS Code',{v:d.hsCode},'','مثال: 1509.10')}
            ${f('goodsDesc','وصف البضاعة والكمية',{v:d.goodsDesc},'','وصف مفصل وعدد الحاويات أو الأوزان')}
            ${sel('incoterm','شروط التسليم Incoterm',d.incoterm||'CIF',INCOTERMS)}
            ${f('portDischarge','ميناء / منفذ الوصول في ليبيا',{v:d.portDischarge},'','مثال: ميناء طرابلس البحري')}
            ${f('proformaNo','رقم الفاتورة المبدئية Proforma',{v:d.proformaNo},'','رقم الفاتورة المبدئية')}
            ${f('proformaDate','تاريخ الفاتورة المبدئية',{v:d.proformaDate},'date')}
          </div>

          <div class="card-head" style="margin:14px 0 10px">السعر الرسمي والتغطية النقدية (100% بالدينار الليبي)</div>
          <div class="form-grid">
            ${sel('currency','عملة الاعتماد',d.currency||'USD',CURRENCIES)}
            ${f('amountFX','قيمة الفاتورة بالعملة الأجنبية (كاملة)',{v:d.amountFX},'number','لا يتم تجزئتها')}
            ${f('officialRate','سعر الصرف الرسمي المعتمد (د.ل)',{v:d.officialRate},'number','مثال: 6.3600 (4 منازل)')}
            ${f('bankFeePct','العمولة / الرسوم المصرفية (%)',{v:d.bankFeePct},'number','اختياري')}
            ${f('lcType','نوع الاعتماد المستندي',{v:d.lcType},'','غير قابل للإلغاء — شراء مستوردات')}
            ${f('lcNumber','رقم الاعتماد L/C No. (MT700)',{v:d.lcNumber},'','رقم الاعتماد أو سويفت')}
            ${f('cblRef','مرجع / رقم النشر بالمركزي',{v:d.cblRef},'','مرجع المركزي')}
            ${f('swiftDate','تاريخ MT700 / التأكيد',{v:d.swiftDate},'date')}
            ${f('latestShipDate','آخر موعد للشحن',{v:d.latestShipDate},'date')}
            ${f('expiryDate','انتهاء صلاحية الاعتماد Expiry',{v:d.expiryDate},'date')}
            ${f('blDate','تاريخ بوليصة الشحن B/L',{v:d.blDate},'date','بعد MT700')}
            ${f('docsArrivalDate','تاريخ وصول مستندات الشحن',{v:d.docsArrivalDate},'date','تبدأ منه مهلة 60 يوماً')}
            ${f('customsDeclNo','رقم الإقرار الجمركي',{v:d.customsDeclNo},'','أصل الإقرار الجمركي')}
            ${f('customsDeclDate','تاريخ الإقرار الجمركي',{v:d.customsDeclDate},'date')}
          </div>

          <div class="card-head" style="margin:14px 0 10px">القرار (موافقة كاملة أو رفض — لا مبلغ جزئي)</div>
          <div class="form-grid">
            ${sel('decision','القرار',d.decision||'pending',['pending','approved','rejected'],LC_DECISION_LABELS)}
            ${f('decisionDate','تاريخ القرار',{v:d.decisionDate},'date')}
            ${f('decisionBy','القرار من',{v:d.decisionBy},'','جهة أو شخص إصدار القرار')}
            ${f('decisionReason','سبب القرار أو مرجع الموافقة',{v:d.decisionReason},'','مرجع الموافقة أو سبب الرفض')}
            ${sel('stage','المرحلة الحالية',d.stage||'prep',LC_STAGES,LC_STAGE_INFO)}
            ${f('openDate','تاريخ فتح/تقديم الاعتماد',{v:d.openDate||d.date},'date')}
          </div>

          <div class="modal-f" style="margin-top:14px">
            <button type="button" class="btn btn-primary" data-lcsave="1">💾 ${isNew?'إنشاء الملف':'حفظ التعديلات'}</button>
            <button type="button" class="btn" data-close>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  `);
}

/* =========================================================================
   ربط الأحداث
   ========================================================================= */
function bindCredits(){
  const box = $('#view');
  if(!box) return;

  const newBtn = box.querySelector('[data-new]');
  if(newBtn) newBtn.onclick = ()=> lcFormModal(null);

  const search = box.querySelector('#crSearch');
  if(search) search.oninput = ()=>{ creditFilter.q = search.value.trim(); render('credits'); };

  const stageFilter = box.querySelector('#crFilterStage');
  if(stageFilter) stageFilter.onchange = ()=>{ creditFilter.chip = stageFilter.value; render('credits'); };

  box.querySelectorAll('.cr-card').forEach(card=>{
    card.onclick = ()=> go('credits/'+card.dataset.open);
  });
}

function bindCreditDetail(id){
  const box = $('#view');
  if(!box) return;
  const d = creditById(id);
  if(!d) return;

  // أزرار الأعلى
  box.querySelectorAll('[data-tab]').forEach(b=> b.onclick = ()=>{ creditTab = b.dataset.tab; render('credits/'+id); });
  box.querySelectorAll('[data-delete]').forEach(b=> b.onclick = async ()=>{
    if(!confirm('هل أنت متأكد من حذف هذا الاعتماد المستندي؟')) return;
    DB.credits = (DB.credits||[]).filter(x=>x.id!==id);
    await persistDelete('credit', id);
    saveDB(true); toast('تم حذف الاعتماد المستندي'); go('credits');
  });
  box.querySelectorAll('[data-export]').forEach(b=> b.onclick = ()=> lcExportCsv(d));
  box.querySelectorAll('[data-print]').forEach(b=> b.onclick = ()=>{
    if(b.dataset.print==='dossier') lcPrintDossier(d); else lcPrintChecklist(d);
  });

  // قرار المصرف: موافقة كاملة أو رفض
  box.querySelectorAll('[data-dec]').forEach(b=> b.onclick = async ()=>{
    const dec = b.dataset.dec;
    d.decision = dec;
    d.decisionDate = todayISO();
    d.decisionBy = currentUserName();
    if(dec === 'rejected' && !d.decisionReason){
      d.decisionReason = prompt('سبب الرفض (يسهل إعادة التقديم/التعديل):','') || '';
    }
    crLog(d, 'decision', dec==='approved'?'اعتماد — موافقة كاملة':dec==='rejected'?'اعتماد — رفض':'إلغاء القرار',
      dec==='approved'?'تمت الموافقة الكاملة على قيمة الفاتورة':dec==='rejected'?(d.decisionReason||'تم رفض الاعتماد'):'أُلغي القرار');
    await crSave(d); toast(dec==='approved'?'تم تسجيل قرار الموافقة الكاملة':dec==='rejected'?'تم تسجيل قرار الرفض':'تم إلغاء القرار');
    render('credits/'+id);
  });

  // الوثائق: مطابقة، تصوير، خطاب، توليد، إضافة
  box.querySelectorAll('[data-doc-toggle]').forEach(cb=> cb.onchange = async ()=>{
    const did = cb.dataset.docToggle;
    const i = d.docs.indexOf(did);
    if(cb.checked && i===-1) d.docs.push(did);
    if(!cb.checked && i!==-1) d.docs.splice(i,1);
    crLog(d,'doc', cb.checked?'مطابقة وثيقة':'إلغاء مطابقة وثيقة', did);
    await crSave(d); render('credits/'+id);
  });

  box.querySelectorAll('[data-doccat]').forEach(pill=> pill.onclick = ()=>{
    box.querySelectorAll('[data-doccat]').forEach(p=>p.classList.remove('active'));
    pill.classList.add('active');
    const cat = pill.dataset.doccat;
    const list = box.querySelector('#crDocList');
    list.innerHTML = LC_CHECKLIST.concat((d.docsExtra||[]).map((x,i)=>({...x,id:x.id||('extra_'+i),label:x.label})))
      .filter(x=> cat==='all' || x.cat===cat).map(x=>lcDocRowHtml(d,x)).join('');
    bindDocRows(box, d, id);
  });

  box.querySelector('[data-seed]') && (box.querySelector('[data-seed]').onclick = async ()=>{
    const missing = LC_CHECKLIST.map(x=>x.id).filter(k=>!d.docs.includes(k));
    d.docs = Array.from(new Set([...d.docs, ...missing]));
    crLog(d,'seed','توليد قائمة الوثائق القياسية',`تمت تعبئة ${missing.length} وثيقة`);
    await crSave(d); toast('تم توليد وتعبئة قائمة الوثائق القياسية'); render('credits/'+id);
  });

  const addDoc = box.querySelector('[data-adddoc]');
  if(addDoc) addDoc.onclick = async ()=>{
    const label = prompt('اسم الوثيقة الإضافية:'); if(!label) return;
    const cat = prompt('المجموعة (bank، invoices، shipping، inspection، customs، legal):','bank') || 'bank';
    const did = 'extra_'+Math.random().toString(36).slice(2,8);
    (d.docsExtra||(d.docsExtra=[])).push({ id:did, label, cat });
    crLog(d,'doc','إضافة وثيقة إضافية',label);
    await crSave(d); render('credits/'+id);
  };

  bindDocRows(box, d, id);

  // المراحل
  box.querySelectorAll('[data-stage]').forEach(b=> b.onclick = async ()=>{
    const to = b.dataset.stage;
    crLog(d,'stage','التقدم إلى مرحلة جديدة',`${LC_STAGE_INFO[to].label} — من ${LC_STAGE_INFO[d.stage]?.label||d.stage}`);
    d.stage = to;
    await crSave(d); toast('تم تحديث مرحلة الاعتماد'); render('credits/'+id);
  });

  // الملاحظات
  const note = box.querySelector('#crNote');
  const saveNote = box.querySelector('[data-savenote]');
  if(saveNote && note) saveNote.onclick = async ()=>{ d.notes = note.value; await crSave(d); toast('تم حفظ الملاحظات'); };
}

function bindDocRows(box, d, id){
  box.querySelectorAll('[data-doc-scan]').forEach(b=> b.onclick = ()=>{
    const did = b.dataset.docScan;
    const input = document.createElement('input');
    input.type='file'; input.accept='image/*,.pdf';
    input.onchange = async ()=>{
      const file = input.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = async ()=>{
        (d.files||(d.files=[])).push({ id:uid(), docId:did, name:file.name, dataUrl:reader.result, at:new Date().toISOString() });
        crLog(d,'doc','إرفاق صورة وثيقة',`${did} — ${file.name}`);
        await crSave(d); toast('تم إرفاق صورة الوثيقة'); render('credits/'+id);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  });

  box.querySelectorAll('[data-doc-letter]').forEach(b=> b.onclick = ()=>{
    const did = b.dataset.docLetter;
    const doc = LC_CHECKLIST.find(x=>x.id===did);
    if(!doc) return;
    const map = { req_open:'lc_open_req', docs_rec:'lc_docs_receipt', customs_decl:'lc_customs_close', form18:'lc_customs_close', close_letter:'lc_customs_close' };
    const tplId = map[did] || 'lc_open_req';
    const values = lcLetterValues(d, tplId);
    openComposer(tplId, { tplId, values, id:null, ref:null });
    go('new');
  });

  box.querySelectorAll('[data-doc-file]').forEach(el=> el.onclick = ()=>{
    const name = el.dataset.docFile;
    const file = (d.files||[]).find(f=>f.name===name);
    if(file && file.dataUrl) lcDownload(name, file.dataUrl);
  });
}

/* قيم الخطابات الجاهزة من الاعتماد */
function lcLetterValues(d, tplId){
  const company = activeCompany().name;
  const base = { bankName:d.beneficiaryBank||'المصرف', accountNo:d.accountNo||'', cblKey:d.cblKey||'', date:todayISO(),
    supplierName:d.supplierName||'', supplierCountry:d.supplierCountry||'', goodsDesc:d.goodsDesc||'',
    proformaNo:d.proformaNo||'', proformaDate:d.proformaDate||'', currency:d.currency||'USD', amountFX:d.amountFX||'',
    officialRate:d.officialRate||'', incoterm:d.incoterm||'CIF', portDischarge:d.portDischarge||'',
    lcNumber:d.lcNumber||'', blNumber:d.blDate||'', delegateName:'', customsDeclNo:d.customsDeclNo||'', customsDeclDate:d.customsDeclDate||'',
    companyName:company };
  return base;
}

function currentUserName(){
  const users = JSON.parse(localStorage.getItem('users')||'[]');
  const uid_ = JSON.parse(localStorage.getItem('currentUserId')||'null');
  const u = users.find(x=>x.id===uid_);
  return u? u.fullName : 'المستخدم';
}

/* =========================================================================
   التصدير والطباعة
   ========================================================================= */
function lcDownload(name, dataUrl){
  const a = document.createElement('a');
  a.href = dataUrl; a.download = name; a.click();
}

function lcExportCsv(d){
  const rows = [['الرقم','المستورد','المصدّر','البضاعة','العملة','القيمة بالعملة','سعر الصرف الرسمي','التغطية د.ل','رقم الاعتماد','القرار','المرحلة','الإقرار الجمركي']];
  rows.push([d.id,d.companyName||'',d.supplierName||'',d.goodsDesc||'',d.currency||'',d.amountFX||'',d.officialRate||'',lcCoverage(d)||'',d.lcNumber||'',LC_DECISION_LABELS[d.decision]||'',d.stage||'',d.customsDeclNo||'']);
  (d.docs||[]).forEach(id=>{ const doc=LC_CHECKLIST.find(x=>x.id===id); if(doc) rows.push([d.id,'وثيقة',doc.label,'','','','','','','','','']); });
  const csv = rows.map(r=>r.map(x=>`"${String(x==null?'':x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'lc-'+d.id+'.csv'; a.click();
  toast('تم تصدير ملف CSV');
}

function lcPrint(title, body){
  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>
      @page{size:A4;margin:14mm}
      body{font-family:'Segoe UI',Tahoma,Arial;direction:rtl;color:#222;font-size:11pt;line-height:1.6}
      h1{font-size:16pt;text-align:right;margin:0 0 4px}
      .meta{color:#555;font-size:9pt;margin-bottom:10px}
      table{width:100%;border-collapse:collapse;margin:8px 0}
      td,th{border:1px solid #999;padding:5px 8px;font-size:10pt}
      th{background:#f2f6fc;font-weight:700}
      .small{font-size:9pt;color:#555}
      .big{font-weight:700}
      .sig{margin-top:24mm;text-align:right}
      .stamp{border:2px solid #c0392b;color:#c0392b;padding:4px 10px;display:inline-block;font-weight:700;border-radius:4px}
      .foot{margin-top:8mm;font-size:8pt;color:#666;border-top:1px solid #ccc;padding-top:4px}
    </style></head><body>${body}<div class="foot">AIS Secretariat — الاعتمادات المستندية لاستيراد البضائع بالسعر الرسمي لمصرف ليبيا المركزي</div></body></html>`);
  w.document.close(); w.focus(); setTimeout(()=>{ w.print(); }, 250);
}

function lcPrintDossier(d){
  const cov = lcCoverage(d);
  const body = `
    <h1>ملخص اعتماد مستندي لشراء بضائع مستوردة</h1>
    <div class="meta">رقم الاعتماد: <b>${esc(d.lcNumber||d.id)}</b> — تاريخ التقديم: ${fdate(d.openDate||d.date)} — نوع الاعتماد: ${esc(d.lcType||'اعتماد مستندي')}</div>
    <table>
      <tr><th style="width:25%">المستورد (الشركة)</th><td>${esc(d.companyName||'')}</td><th style="width:20%">الحساب الجاري</th><td>${esc(d.accountNo||'')}</td></tr>
      <tr><th>المصدّر / المستفيد</th><td>${esc(d.supplierName||'')} — ${esc(d.supplierCountry||'')}</td><th>البنك المراسل</th><td>${esc(d.beneficiaryBank||'')} ${d.beneficiarySwift?('— '+esc(d.beneficiarySwift)):''}</td></tr>
      <tr><th>البضاعة والكمية</th><td colspan="3">${esc(d.goodsDesc||'')}</td></tr>
      <tr><th>فئة البضاعة / HS</th><td>${esc(d.goodsCategory||'—')} / ${esc(d.hsCode||'—')}</td><th>شروط التسليم / ميناء الوصول</th><td>${esc(d.incoterm||'')} — ${esc(d.portDischarge||'')}</td></tr>
      <tr><th>الفاتورة المبدئية</th><td>رقم ${esc(d.proformaNo||'—')} بتاريخ ${fdate(d.proformaDate,'short')}</td><th>العملة</th><td>${esc(d.currency||'USD')}</td></tr>
      <tr><th>القيمة بالعملة الأجنبية</th><td>${fnum(d.amountFX)}</td><th>سعر الصرف الرسمي (د.ل)</th><td>${esc(d.officialRate||'—')}</td></tr>
      <tr><th>التغطية النقدية 100% بالدينار</th><td class="big">${cov!==null?fnum(cov)+' د.ل':'—'}</td><th>العمولة (%)</th><td>${esc(d.bankFeePct||'—')}</td></tr>
      <tr><th>رقم الاعتماد L/C No.</th><td>${esc(d.lcNumber||'—')} — ${fdate(d.swiftDate,'short')}</td><th>مرجع المركزي</th><td>${esc(d.cblRef||'—')}</td></tr>
      <tr><th>انتهاء الصلاحية</th><td>${fdate(d.expiryDate,'short')}</td><th>آخر موعد للشحن</th><td>${fdate(d.latestShipDate,'short')}</td></tr>
      <tr><th>قرار المصرف/المركزي</th><td class="big">${LC_DECISION_LABELS[d.decision]||d.decision} — ${fdate(d.decisionDate,'short')}</td><th>سبب القرار</th><td>${esc(d.decisionReason||'—')}</td></tr>
    </table>
    <div class="meta" style="margin-top:8px">المرحلة الحالية: <b>${LC_STAGE_INFO[d.stage]?.label||d.stage}</b> — ${(d.timeline||[]).length} حركة مسجلة</div>
    <div class="sig"><div class="stamp">تم الإعداد بواسطة AIS Secretariat</div></div>
  `;
  lcPrint('بطاقة الاعتماد المستندي', body);
}

function lcPrintChecklist(d){
  const items = LC_CHECKLIST.concat((d.docsExtra||[]).map((x,i)=>({...x,id:x.id||('extra_'+i),label:x.label})));
  const rows = items.map(doc=>{
    const done = d.docs.includes(doc.id);
    return `<tr><td>${done?'✔':'✗'}</td><td>${esc(doc.label)}</td><td>${done?'مطابق':'ناقص'}</td><td class="small">${esc(doc.cat||'')}</td><td class="small">${esc(doc.hint||'')}</td></tr>`;
  }).join('');
  const body = `
    <h1>قائمة الوثائق القياسية للاعتماد المستندي</h1>
    <div class="meta">رقم الاعتماد: <b>${esc(d.lcNumber||d.id)}</b> — ${esc(d.supplierName||'')} — ${esc(d.currency||'USD')} ${fnum(d.amountFX)} — تم إقفال ${d.docs.length} من ${items.length} وثيقة</div>
    <table>
      <tr><th style="width:6%">الحالة</th><th style="width:34%">الوثيقة</th><th style="width:12%">المطابقة</th><th style="width:14%">المجموعة</th><th>ملاحظات</th></tr>
      ${rows}
    </table>
    <div class="sig"><div class="stamp">تم الإعداد بواسطة AIS Secretariat</div></div>
  `;
  lcPrint('قائمة وثائق الاعتماد المستندي', body);
}
