/* ============================================================
   النماذج (قوالب الخطابات) + أدوات مساعدة
   ============================================================ */

/* ---------- أدوات عامة ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function toISO(d){ if(!d) return ''; if(typeof d==='string') return d.slice(0,10); const x=new Date(d); return isNaN(x)?'':x.toISOString().slice(0,10); }
function fdate(iso, style){
  iso = toISO(iso); if(!iso) return '................';
  const [y,m,d] = iso.split('-').map(Number);
  if(style==='short') return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
  return `${d} ${AR_MONTHS[m-1]} ${y}م`;
}
function fnum(n){ const x = Number(n); return isNaN(x)? '' : x.toLocaleString('en-US'); }

/* ---------- تفقيط (تحويل الأرقام إلى حروف عربية) ---------- */
function tafqit(num){
  num = Math.floor(Math.abs(Number(num)||0));
  if(num === 0) return 'صفر';
  const ones=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة'];
  const teens=['عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
  const tens=['','عشرة','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
  const hundreds=['','مائة','مائتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];
  function under1000(n){
    let out=[];
    const h=Math.floor(n/100), r=n%100;
    if(h) out.push(hundreds[h]);
    if(r){
      if(r<10) out.push(ones[r]);
      else if(r<20) out.push(teens[r-10]);
      else { const t=Math.floor(r/10), o=r%10; out.push(o? ones[o]+' و'+tens[t] : tens[t]); }
    }
    return out.join(' و');
  }
  function scale(n, singular, dual, plural, many){
    if(n===0) return '';
    if(n===1) return singular;
    if(n===2) return dual;
    if(n>=3 && n<=10) return under1000(n)+' '+plural;
    return under1000(n)+' '+many;
  }
  const parts=[];
  const millions=Math.floor(num/1000000);
  const thousands=Math.floor((num%1000000)/1000);
  const rest=num%1000;
  if(millions) parts.push(millions===1?'مليون':millions===2?'مليونان':millions<=10?under1000(millions)+' ملايين':under1000(millions)+' مليوناً');
  if(thousands) parts.push(thousands===1?'ألف':thousands===2?'ألفان':thousands<=10?under1000(thousands)+' آلاف':under1000(thousands)+' ألفاً');
  if(rest) parts.push(under1000(rest));
  return parts.join(' و');
}

/* ---------- فرق بين تاريخين ---------- */
function diffYM(fromISO, toISOstr){
  const a = new Date(toISO(fromISO)), b = new Date(toISO(toISOstr)||new Date());
  if(isNaN(a)||isNaN(b)||b<a) return {y:0,m:0,text:''};
  let y = b.getFullYear()-a.getFullYear();
  let m = b.getMonth()-a.getMonth();
  if(b.getDate() < a.getDate()) m--;
  if(m<0){ y--; m+=12; }
  const parts=[];
  if(y) parts.push(y===1?'سنة واحدة':y===2?'سنتان':y<=10?`${y} سنوات`:`${y} سنة`);
  if(m) parts.push(m===1?'شهر واحد':m===2?'شهران':m<=10?`${m} أشهر`:`${m} شهراً`);
  return {y,m,text: parts.length? parts.join(' و') : 'أقل من شهر'};
}

/* ============================================================
   الفئات
   ============================================================ */
const CATS = [
  {id:'cert', name:'الشهادات', icon:'🎓', color:'blue'},
  {id:'hr',   name:'الموارد البشرية والإدارية', icon:'🗂️', color:'gold'},
  {id:'ext',  name:'المراسلات الخارجية والنماذج الحرة', icon:'✉️', color:'green'},
];

/* حقول الموظف المشتركة */
const EMP_FIELDS = [
  {k:'employee', type:'employee', label:'اختيار الموظف من القائمة'},
  {k:'employeeName', label:'الاسم الكامل', req:true, span:2, ph:'الاسم كما في البطاقة الوطنية'},
  {k:'nationalId', label:'الرقم الوطني'},
  {k:'position', label:'الوظيفة'},
  {k:'department', label:'القسم / الإدارة'},
  {k:'hireDate', type:'date', label:'تاريخ الالتحاق'},
];

/* ============================================================
   النماذج
   ============================================================ */
const TEMPLATES = [

/* ---------- 1) شهادة عمل ---------- */
{
  id:'att_work', cat:'cert', icon:'📄', code:'SHA', name:'شهادة عمل',
  desc:'إثبات أن الموظف يعمل حالياً لدى الشركة',
  personKey:'employeeName',
  fields:[
    ...EMP_FIELDS,
    {k:'destination', label:'تُقدَّم إلى (الجهة المستفيدة)', span:2, ph:'مثال: مصرف الجمهورية – فرع طرابلس'},
    {k:'date', type:'date', label:'تاريخ الشهادة'},
  ],
  subject: () => 'شهادة عمل',
  to: (v,c) => `<div class="l-to">السادة/ <b>${esc(v.destination || '.............................')}</b> — المحترمين</div>`,
  body: (v,c) => `
    <p>تشهد إدارة <b>${esc(c.company.name)}</b> بأن السيد/السيدة: <b>${esc(v.employeeName || '.............................')}</b>${v.nationalId? `، الحامل/ة للرقم الوطني <b>${esc(v.nationalId)}</b>`:''}، يعمل/تعمل لدى الشركة بوظيفة <b>${esc(v.position || '...........')}</b>${v.department? ` بإدارة <b>${esc(v.department)}</b>`:''}، وذلك اعتباراً من تاريخ <b>${fdate(v.hireDate)}</b>، وما زال/تزال على رأس عمله/عملها حتى تاريخ إصدار هذه الشهادة.</p>
    <p>وقد أُعطيت هذه الشهادة بناءً على طلب المعني/المعنية، لتقديمها إلى <b>${esc(v.destination || 'الجهة المذكورة أعلاه')}</b>، ولا يترتب على الشركة بموجبها أي التزام تجاه الغير.</p>`,
},

/* ---------- 2) شهادة راتب ---------- */
{
  id:'att_salary', cat:'cert', icon:'💰', code:'SHR', name:'شهادة راتب',
  desc:'بيان الراتب الشهري للموظف (بنوك، جهات رسمية)',
  personKey:'employeeName',
  fields:[
    ...EMP_FIELDS,
    {k:'salary', type:'number', label:'الراتب الشهري الإجمالي (د.ل)'},
    {k:'salarySince', type:'date', label:'يتقاضاه اعتباراً من'},
    {k:'destination', label:'تُقدَّم إلى (الجهة المستفيدة)', span:2, ph:'مثال: مصرف الوحدة – إدارة الائتمان'},
    {k:'date', type:'date', label:'تاريخ الشهادة'},
  ],
  subject: () => 'شهادة راتب',
  to: (v) => `<div class="l-to">السادة/ <b>${esc(v.destination || '.............................')}</b> — المحترمين</div>`,
  body: (v,c) => `
    <p>تشهد إدارة <b>${esc(c.company.name)}</b> بأن السيد/السيدة: <b>${esc(v.employeeName || '.............................')}</b>${v.nationalId? `، الحامل/ة للرقم الوطني <b>${esc(v.nationalId)}</b>`:''}، يعمل/تعمل لدى الشركة بوظيفة <b>${esc(v.position || '...........')}</b>${v.department? ` بإدارة <b>${esc(v.department)}</b>`:''}، ويتقاضى/تتقاضى راتباً شهرياً إجمالياً قدره <b>${fnum(v.salary)} ديناراً ليبياً</b>${v.salary? ` (فقط ${tafqit(v.salary)} ديناراً ليبياً لا غير)`:''}${v.salarySince? `، وذلك اعتباراً من تاريخ <b>${fdate(v.salarySince)}</b>`:''}.</p>
    <p>وقد أُعطيت هذه الشهادة بناءً على طلب المعني/المعنية، لتقديمها إلى <b>${esc(v.destination || 'الجهة المذكورة أعلاه')}</b>، ولا يترتب على الشركة بموجبها أي التزام تجاه الغير.</p>`,
},

/* ---------- 3) شهادة أقدمية ---------- */
{
  id:'att_seniority', cat:'cert', icon:'⏳', code:'SHD', name:'شهادة أقدمية',
  desc:'بيان مدة الخدمة في الشركة (تُحسب تلقائياً)',
  personKey:'employeeName',
  fields:[
    ...EMP_FIELDS,
    {k:'until', type:'date', label:'حتى تاريخ'},
    {k:'destination', label:'تُقدَّم إلى (الجهة المستفيدة)', span:2},
    {k:'date', type:'date', label:'تاريخ الشهادة'},
  ],
  subject: () => 'شهادة أقدمية',
  to: (v) => `<div class="l-to">السادة/ <b>${esc(v.destination || '.............................')}</b> — المحترمين</div>`,
  body: (v,c) => {
    const d = diffYM(v.hireDate, v.until || v.date || toISO(new Date()));
    return `
    <p>تشهد إدارة <b>${esc(c.company.name)}</b> بأن السيد/السيدة: <b>${esc(v.employeeName || '.............................')}</b>${v.nationalId? `، الحامل/ة للرقم الوطني <b>${esc(v.nationalId)}</b>`:''}، يعمل/تعمل لدى الشركة بوظيفة <b>${esc(v.position || '...........')}</b>${v.department? ` بإدارة <b>${esc(v.department)}</b>`:''}، وذلك اعتباراً من تاريخ <b>${fdate(v.hireDate)}</b> حتى تاريخ <b>${fdate(v.until || v.date)}</b>.</p>
    <p>وعليه فإن مدة خدمته/خدمتها في الشركة بلغت <b>${d.text}</b>${v.hireDate? ` (${d.y? d.y+' سنة':'0 سنة'}${d.m? ' و '+d.m+' شهر':''})`:''}.</p>
    <p>وقد أُعطيت هذه الشهادة بناءً على طلب المعني/المعنية، دون أن يترتب على الشركة أي التزام تجاه الغير.</p>`;
  },
},

/* ---------- 4) شهادة نهاية الخدمة ---------- */
{
  id:'cert_end', cat:'cert', icon:'🏁', code:'SHN', name:'شهادة نهاية الخدمة',
  desc:'إثبات انتهاء علاقة العمل وتحديد مدتها',
  personKey:'employeeName',
  fields:[
    ...EMP_FIELDS,
    {k:'endDate', type:'date', label:'تاريخ انتهاء الخدمة'},
    {k:'reason', type:'select', label:'سبب انتهاء العلاقة', options:['الاستقالة','انتهاء مدة العقد','إنهاء العلاقة بالتراضي','الإحالة على التقاعد']},
    {k:'destination', label:'تُقدَّم إلى (الجهة المستفيدة)', span:2},
    {k:'date', type:'date', label:'تاريخ الشهادة'},
  ],
  subject: () => 'شهادة نهاية الخدمة',
  to: (v) => `<div class="l-to">السادة/ <b>${esc(v.destination || '.............................')}</b> — المحترمين</div>`,
  body: (v,c) => {
    const d = diffYM(v.hireDate, v.endDate || v.date);
    return `
    <p>تشهد إدارة <b>${esc(c.company.name)}</b> بأن السيد/السيدة: <b>${esc(v.employeeName || '.............................')}</b>${v.nationalId? `، الحامل/ة للرقم الوطني <b>${esc(v.nationalId)}</b>`:''}، كان/كانت يعمل/تعمل لدى الشركة بوظيفة <b>${esc(v.position || '...........')}</b>${v.department? ` بإدارة <b>${esc(v.department)}</b>`:''}، وذلك خلال الفترة من <b>${fdate(v.hireDate)}</b> إلى <b>${fdate(v.endDate)}</b>.</p>
    <p>وقد انتهت علاقة العمل بتاريخ <b>${fdate(v.endDate)}</b> بسبب <b>${esc(v.reason || '...........')}</b>، بعد مدة خدمة إجمالية بلغت <b>${d.text}</b>، وقد أوفت الشركة بجميع مستحقاته/مستحقاتها المترتبة عن علاقة العمل.</p>
    <p>وقد أُعطيت هذه الشهادة بناءً على طلب المعني/المعنية، لتقديمها إلى <b>${esc(v.destination || 'الجهة المذكورة أعلاه')}</b>.</p>`;
  },
},

/* ---------- 5) أمر مهمة ---------- */
{
  id:'mission', cat:'hr', icon:'🚗', code:'MIS', name:'أمر مهمة (تكليف بمهمة)',
  desc:'تكليف موظف بمهمة عمل داخل أو خارج المدينة',
  personKey:'employeeName',
  fields:[
    ...EMP_FIELDS,
    {k:'city', label:'جهة المهمة (المدينة / المكان)', req:true, ph:'مثال: بنغازي'},
    {k:'purpose', type:'textarea', label:'الغرض من المهمة', span:2, ph:'تُكتب كل نقطة في سطر مستقل'},
    {k:'from', type:'date', label:'من تاريخ'},
    {k:'to', type:'date', label:'إلى تاريخ'},
    {k:'transport', type:'select', label:'وسيلة الانتقال', options:['سيارة الشركة','وسيلة النقل العامة','الطائرة','حسب الاتفاق']},
    {k:'advance', type:'number', label:'تسبيق مالي (د.ل)'},
    {k:'date', type:'date', label:'تاريخ الإصدار'},
  ],
  subject: (v) => `أمر مهمة${v.city? ' إلى '+v.city : ''}`,
  body: (v,c) => {
    const lines = String(v.purpose||'').split('\n').map(s=>s.trim()).filter(Boolean);
    const purposeHTML = lines.length>1
      ? `<ul class="l-list">${lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`
      : `<b>${esc(lines[0]||'.............................')}</b>`;
    return `
    <p>بموجب الصلاحيات المخوّلة لنا، تقرر تكليف السيد/السيدة: <b>${esc(v.employeeName || '.............................')}</b>، ${esc(v.position||'')}${v.department? ` — ${esc(v.department)}`:''}، بمهمة عمل إلى <b>${esc(v.city || '...........')}</b> خلال الفترة من <b>${fdate(v.from)}</b> إلى <b>${fdate(v.to)}</b>.</p>
    <p>وذلك لغرض:</p>
    ${purposeHTML}
    ${v.advance? `<p>وقد رُصد لهذا التكليف تسبيق مالي قدره <b>${fnum(v.advance)} ديناراً ليبياً</b>${tafqit(v.advance)? ` (فقط ${tafqit(v.advance)} ديناراً ليبياً لا غير)`:''}، على أن يُسوّى المبلغ وفق الإجراءات المالية المعتمدة.</p>`:''}
    <p>وعليه، يُطلب من جميع الجهات المعنية تسهيل مهمته/مهمتها وتقديم المساعدة اللازمة، على أن يقدّم/تقدّم تقريراً عن نتائج المهمة فور العودة.</p>`;
  },
},

/* ---------- 6) قرار إجازة ---------- */
{
  id:'leave', cat:'hr', icon:'🌴', code:'LEA', name:'قرار منح إجازة',
  desc:'إجازة سنوية، عارضة، مرضية أو بدل رصيد',
  personKey:'employeeName',
  fields:[
    ...EMP_FIELDS,
    {k:'leaveType', type:'select', label:'نوع الإجازة', options:['سنوية','عارضة','مرضية','بدل رصيد إجازة']},
    {k:'days', type:'number', label:'عدد الأيام'},
    {k:'from', type:'date', label:'تبدأ من'},
    {k:'to', type:'date', label:'تنتهي في'},
    {k:'resumeDate', type:'date', label:'مباشرة العمل في'},
    {k:'note', label:'ملاحظات (اختياري)', span:2},
    {k:'date', type:'date', label:'تاريخ القرار'},
  ],
  subject: (v) => `قرار منح إجازة ${v.leaveType? '— '+v.leaveType : ''}`,
  body: (v,c) => `
    <p>بموجب الصلاحيات المخوّلة لنا، تقرر منح السيد/السيدة: <b>${esc(v.employeeName || '.............................')}</b>، ${esc(v.position||'')}${v.department? ` — ${esc(v.department)}`:''}، إجازة <b>${esc(v.leaveType||'سنوية')}</b> لمدة <b>${esc(v.days||'...')} يوماً</b>، تبدأ من تاريخ <b>${fdate(v.from)}</b> وتنتهي في تاريخ <b>${fdate(v.to)}</b>.</p>
    <p>وعلى المعني/المعنية مباشرة عمله/عملها اعتباراً من تاريخ <b>${fdate(v.resumeDate)}</b>.</p>
    ${v.note? `<p>${esc(v.note)}</p>`:''}
    <p>وعليه، يُعمل بهذا القرار من تاريخ صدوره، ويُبلَّغ لمن يلزم لاتخاذ ما يلزم.</p>`,
},

/* ---------- 7) مذكرة داخلية / تعميم ---------- */
{
  id:'memo', cat:'hr', icon:'📌', code:'MEM', name:'مذكرة داخلية / تعميم',
  desc:'مراسلة داخلية موجهة إلى الإدارات والأقسام',
  personKey:'to',
  fields:[
    {k:'to', label:'إلى', req:true, span:2, ph:'مثال: جميع الإدارات والأقسام'},
    {k:'from', label:'من', span:2, ph:'مثال: الإدارة العامة — مكتب السكرتارية'},
    {k:'subject', label:'الموضوع', req:true, span:2},
    {k:'body', type:'textarea', label:'نص المذكرة', span:2, rows:7},
    {k:'attach', label:'المرفقات (اختياري)', span:2},
    {k:'date', type:'date', label:'التاريخ'},
  ],
  noTo:true,
  head: (v) => `
    <div class="l-to">
      <div><b>إلى:</b> ${esc(v.to || '.............................')}</div>
      <div><b>من:</b> ${esc(v.from || 'الإدارة العامة — مكتب السكرتارية')}</div>
    </div>`,
  subject: (v) => v.subject || 'مذكرة داخلية',
  body: (v) => {
    const lines = String(v.body||'').split('\n').map(s=>s.trim()).filter(Boolean);
    return lines.map(l=>`<p class="indent">${esc(l)}</p>`).join('') || '<p class="indent">.............................</p>';
  },
},

/* ---------- 8) خطاب رسمي خارجي ---------- */
{
  id:'letter', cat:'ext', icon:'✉️', code:'COR', name:'خطاب مراسلة رسمي',
  desc:'مراسلة جهة خارجية (بنك، مصلحة، شركة، فرد)',
  personKey:'recipientEntity',
  fields:[
    {k:'recipientEntity', label:'الجهة / الشخص المرسل إليه', req:true, span:2, ph:'مثال: مصرف الجمهورية — فرع طرابلس'},
    {k:'recipientAttn', label:'عناية السيد/السيدة', span:2, ph:'مثال: مدير الفرع'},
    {k:'recipientAddress', label:'العنوان', span:2},
    {k:'subject', label:'الموضوع', req:true, span:2},
    {k:'body', type:'textarea', label:'نص الخطاب', span:2, rows:8},
    {k:'closing', type:'select', label:'عبارة الختام', options:['وتفضلوا بقبول فائق الاحترام والتقدير','مع خالص التحيات والتقدير','وتفضلوا بقبول وافر الاحترام']},
    {k:'attach', label:'المرفقات (اختياري)'},
    {k:'date', type:'date', label:'تاريخ الخطاب'},
  ],
  subject: (v) => v.subject || '................',
  to: (v) => `<div class="l-to">السادة/ <b>${esc(v.recipientEntity || '.............................')}</b> — المحترمين${v.recipientAttn? `<div class="small">عناية السيد/ ${esc(v.recipientAttn)}</div>`:''}${v.recipientAddress? `<div class="small">${esc(v.recipientAddress)}</div>`:''}</div>`,
  body: (v) => {
    const lines = String(v.body||'').split('\n').map(s=>s.trim()).filter(Boolean);
    return `<p>تحية طيبة وبعد،،،</p>` + (lines.map(l=>`<p class="indent">${esc(l)}</p>`).join('') || '<p class="indent">.............................</p>');
  },
  closing: (v) => v.closing || 'وتفضلوا بقبول فائق الاحترام والتقدير',
},

/* ---------- 9) خطاب حر ---------- */
{
  id:'free', cat:'ext', icon:'📝', code:'FRE', name:'خطاب حر (نص مفتوح)',
  desc:'نموذج مرن بنص حر مع ترويسة الشركة',
  personKey:'recipientEntity',
  fields:[
    {k:'recipientEntity', label:'الجهة / الشخص (اختياري)', span:2},
    {k:'subject', label:'الموضوع', span:2},
    {k:'body', type:'textarea', label:'نص الخطاب', span:2, rows:12},
    {k:'date', type:'date', label:'التاريخ'},
  ],
  subject: (v) => v.subject || '',
  to: (v) => v.recipientEntity? `<div class="l-to">السادة/ <b>${esc(v.recipientEntity)}</b> — المحترمين</div>`:'',
  body: (v) => {
    const lines = String(v.body||'').split('\n');
    return lines.map(l=> l.trim()? `<p class="indent">${esc(l)}</p>` : '<p>&nbsp;</p>').join('');
  },
},
];

const TPL_BY_ID = Object.fromEntries(TEMPLATES.map(t=>[t.id,t]));
