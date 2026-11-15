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
  {id:'cert',  name:'الشهادات', icon:'🎓', color:'blue'},
  {id:'hr',    name:'الموارد البشرية والإدارية', icon:'🗂️', color:'gold'},
  {id:'lc',    name:'خطابات الاعتمادات المستندية والمصارف', icon:'🏦', color:'blue'},
  {id:'ext',   name:'المراسلات الخارجية والنماذج الحرة', icon:'✉️', color:'green'},
  {id:'group', name:'وثائق وتعميمات المجموعة المشتركة (AIS)', icon:'🏢', color:'red'},
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

/* ---------- 10) تعميم / قرار مشترك للمجموعة (AIS) ---------- */
{
  id:'group_circular', cat:'group', icon:'📢', code:'GRP', name:'تعميم / قرار مشترك للمجموعة',
  desc:'قرار أو تعميم موحّد يسري على شركات المجموعة بشعار AIS',
  dualLogo:true,
  personKey:'scope',
  fields:[
    {k:'docKind', type:'select', label:'نوع الإصدار', options:['تعميم إداري مشترك','قرار مجلس إدارة المجموعة','تعليمات تنظيمية موحّدة','مذكرة تنسيقية بين الشركات']},
    {k:'scope', label:'الشركات والإدارات المعنية', req:true, ph:'مثال: كافة شركات وفروع المجموعة والمصنع'},
    {k:'subject', label:'الموضوع', req:true, span:2, ph:'مثال: تنظيم إجراءات استلام المركبات ومتابعة الوثائق الدورية'},
    {k:'body', type:'textarea', label:'نص القرار / التعميم (كل بند في سطر)', req:true, span:2, rows:7},
    {k:'effectiveDate', type:'date', label:'يُعمل به اعتباراً من'},
    {k:'date', type:'date', label:'تاريخ الإصدار'},
  ],
  noTo:true,
  head: (v) => `
    <div class="l-to">
      <div><b>نوع الوثيقة:</b> ${esc(v.docKind || 'تعميم إداري مشترك')}</div>
      <div><b>الجهات المعنية:</b> ${esc(v.scope || 'كافة شركات وإدارات المجموعة')}</div>
    </div>`,
  subject: (v) => v.subject || (v.docKind || 'تعميم إداري مشترك'),
  body: (v) => {
    const lines = String(v.body||'').split('\n').map(s=>s.trim()).filter(Boolean);
    const listHTML = lines.length > 1
      ? `<ol class="l-list">${lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ol>`
      : `<p class="indent">${esc(lines[0]||'.............................')}</p>`;
    return `
      <p>في إطار تنظيم العمل المشترك وتوحيد الإجراءات الإدارية بين شركات <b>مجموعة الصداقة المثالية</b>، تقرّر ما يلي:</p>
      ${listHTML}
      ${v.effectiveDate ? `<p>يُعمل بمضمون هذا الإصدار اعتباراً من تاريخ <b>${fdate(v.effectiveDate)}</b>، وعلى كافة الإدارات والأقسام المعنية بشركات المجموعة وضعه موضع التنفيذ.</p>` : `<p>يُعمَّم هذا الإصدار على كافة الإدارات والأقسام المعنية للعمل بموجبه اعتباراً من تاريخ صدوره.</p>`}`;
  },
  closing: () => 'والله وليّ التوفيق،،،',
},

/* ---------- 11) محضر تسليم واستلام مركبة (عهدة سيارة) ---------- */
{
  id:'handover_vehicle', cat:'group', icon:'🚗', code:'CAR', name:'محضر تسليم واستلام مركبة',
  desc:'تسليم عهدة سيارة لموظف أو فرع مع إثبات تواريخ التأمين والفحص والبل',
  dualLogo:true,
  personKey:'holder',
  fields:[
    {k:'holder', label:'اسم المستلم / الجهة المستلمة', req:true, ph:'مثال: الحاج علي صليل'},
    {k:'nationalId', label:'الرقم الوطني / الوظيفي (اختياري)'},
    {k:'vehicle', label:'نوع السيارة ولونها', req:true, ph:'مثال: تويوتا تكوما'},
    {k:'plate', label:'رقم اللوحة', req:true, ph:'مثال: 5-506777'},
    {k:'insurance', type:'date', label:'صلاحية التأمين'},
    {k:'inspection', type:'date', label:'صلاحية الفحص الفني'},
    {k:'vignette', type:'date', label:'صلاحية البل'},
    {k:'odometer', label:'قراءة العداد (كم)', ph:'مثال: 84,500 كم'},
    {k:'condition', type:'textarea', label:'حالة المركبة والملحقات المرفقة', span:2, rows:3, ph:'مثال: المركبة بحالة فنية جيدة مع الإطار الاحتياطي، طفاية الحريق، وكافة أوراقها الرسمية.'},
    {k:'date', type:'date', label:'تاريخ التسليم'},
  ],
  noTo:true,
  subject: (v) => `محضر تسليم واستلام مركبة (${v.plate || '...'})`,
  body: (v) => `
    <p>إنه في يوم الموافق <b>${fdate(v.date)}</b>، تم بمقر <b>مجموعة شركات الصداقة المثالية</b> تسليم المركبة المبينة أوصافها أدناه على سبيل العهدة لمتطلبات العمل:</p>
    <table style="width:100%;border-collapse:collapse;margin:4mm 0 5mm;font-size:11pt">
      <tbody>
        <tr>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;background:#f2f6fc;font-weight:700;width:22%">اسم المستلم</td>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;width:28%"><b>${esc(v.holder || '................')}</b></td>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;background:#f2f6fc;font-weight:700;width:22%">الرقم الوطني / الصفة</td>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;width:28%">${esc(v.nationalId || '—')}</td>
        </tr>
        <tr>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;background:#f2f6fc;font-weight:700">نوع السيارة</td>
          <td style="border:1px solid #8a9bb5;padding:5px 9px"><b>${esc(v.vehicle || '................')}</b></td>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;background:#f2f6fc;font-weight:700">رقم اللوحة</td>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;direction:ltr;text-align:right"><b>${esc(v.plate || '................')}</b></td>
        </tr>
        <tr>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;background:#f2f6fc;font-weight:700">انتهاء التأمين</td>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;direction:ltr;text-align:right">${esc(v.insurance || '—')}</td>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;background:#f2f6fc;font-weight:700">انتهاء الفحص الفني</td>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;direction:ltr;text-align:right">${esc(v.inspection || '—')}</td>
        </tr>
        <tr>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;background:#f2f6fc;font-weight:700">انتهاء البل</td>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;direction:ltr;text-align:right">${esc(v.vignette || '—')}</td>
          <td style="border:1px solid #8a9bb5;padding:5px 9px;background:#f2f6fc;font-weight:700">قراءة العداد</td>
          <td style="border:1px solid #8a9bb5;padding:5px 9px">${esc(v.odometer || '—')}</td>
        </tr>
      </tbody>
    </table>
    <p><b>حالة المركبة والملحقات:</b> ${esc(v.condition || 'المركبة بحالة جيدة وكاملة الأوراق الرسمية والملحقات الأساسية.')}</p>
    <p>ويقرّ المستلم باستلامه للمركبة المذكورة أعلاه والتزامه بالمحافظة عليها وإجراء الصيانة الدورية في مواعيدها، وإبلاغ الإدارة فور أي طارئ أو قبل انتهاء صلاحية وثائقها الرسمية.</p>`,
  customSign: (v, c) => `
    <div class="l-sign" style="justify-content:space-between;gap:10mm;margin-top:9mm">
      <div class="blk" style="min-width:48mm"><div class="t">المُسلِّم / مسؤول الحركة</div><div class="space" style="height:14mm"></div><div class="nm">التوقيع: ....................</div></div>
      <div class="blk" style="min-width:48mm"><div class="t">المُستلِم</div><div class="space" style="height:14mm"></div><div class="nm">${esc(v.holder || '....................')}</div></div>
      <div class="blk" style="min-width:48mm"><div class="t">${esc(c.company.signTitle || 'اعتماد الإدارة')}</div><div class="space" style="height:14mm"></div><div class="nm">${esc(c.company.signName || 'التوقيع والختم')}</div></div>
    </div>`,
},

/* ---------- 12) تفويض رسمي للمندوب / المعقّب ---------- */
{
  id:'group_auth', cat:'group', icon:'🪪', code:'TFW', name:'تفويض رسمي لمراجعة الجهات',
  desc:'تفويض موظف أو مندوب لمتابعة معاملات المجموعة لدى المصارف والجمارك والمصالح',
  dualLogo:true,
  personKey:'employeeName',
  fields:[
    ...EMP_FIELDS,
    {k:'destination', label:'الجهة المقصودة بالتفويض', req:true, span:2, ph:'مثال: مصلحة الجمارك / قسم المرور والترخيص / السجل التجاري'},
    {k:'taskScope', type:'textarea', label:'موضوع وحدود التفويض', req:true, span:2, rows:4, ph:'مثال: استلام وتجديد كتيبات المركبات وإتمام إجراءات الفحص الفني والتأمين'},
    {k:'validUntil', type:'date', label:'صالح لغاية تاريخ'},
    {k:'date', type:'date', label:'تاريخ الإصدار'},
  ],
  subject: () => 'تفويض رسمي',
  to: (v) => `<div class="l-to">السادة/ <b>${esc(v.destination || '.............................')}</b> — المحترمين</div>`,
  body: (v,c) => `
    <p>تفوّض إدارة <b>مجموعة شركات الصداقة المثالية</b> (${esc(c.company.name)}) السيد/السيدة: <b>${esc(v.employeeName || '.............................')}</b>${v.nationalId? `، الحامل/ة للرقم الوطني <b>${esc(v.nationalId)}</b>`:''}${v.position? `، بوظيفة <b>${esc(v.position)}</b>`:''}، بمراجعتكم والقيام نيابةً عن الشركة بما يلي:</p>
    <p class="indent"><b>${esc(v.taskScope || '..........................................................')}</b></p>
    ${v.validUntil? `<p>يسري العمل بهذا التفويض حتى تاريخ <b>${fdate(v.validUntil)}</b>.</p>`:''}
    <p>ونأمل من سيادتكم تقديم التسهيلات اللازمة لإنجاز المهمة المكلف بها، مع خالص الشكر والتقدير.</p>`,
},

/* ---------- 13) طلب فتح اعتماد مستندي لاستيراد بضائع بالسعر الرسمي ---------- */
{
  id:'lc_open_req', cat:'lc', icon:'🏦', code:'LCO', name:'طلب فتح اعتماد مستندي لاستيراد بضائع',
  desc:'خطاب رسمي للمصرف لفتح اعتماد مستندي غير قابل للإلغاء بالسعر الرسمي المعتمد من مصرف ليبيا المركزي (USD / EUR)',
  personKey:'bankName',
  fields:[
    {k:'bankName', label:'المصرف والفرع', req:true, span:2, ph:'مثال: مصرف الجمهورية — فرع طرابلس الرئيسي'},
    {k:'accountNo', label:'رقم الحساب الجاري للشركة', req:true, ph:'رقم الحساب أو IBAN'},
    {k:'cblKey', label:'الرمز المصرفي (CBL Key)', ph:'رمز منظومة مصرف ليبيا المركزي'},
    {k:'supplierName', label:'الشركة المصدِّرة (المستفيد بالخارج)', req:true, ph:'الاسم الكامل للشركة المصدّرة'},
    {k:'supplierCountry', label:'بلد المنشأ / التصدير', ph:'مثال: تركيا / إيطاليا / البرازيل'},
    {k:'goodsDesc', label:'وصف البضاعة المستوردة والكمية', req:true, span:2, ph:'مثال: مواد غذائية (زيت طعام مكرر — 20 حاوية / 400 طن)'},
    {k:'proformaNo', label:'رقم الفاتورة المبدئية (Proforma)', req:true},
    {k:'proformaDate', type:'date', label:'تاريخ الفاتورة المبدئية'},
    {k:'currency', type:'select', label:'عملة الاعتماد', options:['USD','EUR']},
    {k:'amountFX', type:'number', label:'قيمة الفاتورة بالعملة الأجنبية', req:true},
    {k:'officialRate', label:'سعر الصرف الرسمي المعتمد (د.ل)', ph:'مثال: 6.3600'},
    {k:'incoterm', type:'select', label:'شروط التسليم (Incoterm)', options:['CIF','CFR','FOB','CPT','CIP']},
    {k:'portDischarge', label:'ميناء / منفذ الوصول في ليبيا', ph:'مثال: ميناء طرابلس البحري'},
    {k:'attach', label:'المرفقات', ph:'فاتورة مبدئية، وثيقة تأمين، شهادة ضريبية وضمانية وتضامنية، رمز CBL'},
    {k:'date', type:'date', label:'تاريخ الخطاب'},
  ],
  subject: (v) => `طلب فتح اعتماد مستندي غير قابل للإلغاء بموجب الفاتورة المبدئية رقم (${v.proformaNo || '...'})`,
  to: (v) => `<div class="l-to">السادة/ <b>${esc(v.bankName || '.............................')}</b> — المحترمين<div class="small">عناية السيد/ مدير الفرع — قسم الاعتمادات المستندية</div></div>`,
  body: (v,c) => {
    const curName = v.currency === 'EUR' ? 'يورو (EUR)' : 'دولار أمريكي (USD)';
    const lyd = (Number(v.amountFX)>0 && Number(v.officialRate)>0) ? fnum(Math.round(Number(v.amountFX)*Number(v.officialRate)*100)/100) : '';
    return `
    <p>تحية طيبة وبعد،،،</p>
    <p class="indent">يرجى من سيادتكم التكرم باتخاذ الإجراءات اللازمة نحو فتح اعتماد مستندي تجاري غير قابل للإلغاء لصالح شركتنا <b>(${esc(c.company.name)})</b>${v.cblKey? `، الرمز المصرفي بمنظومة مصرف ليبيا المركزي <b>(${esc(v.cblKey)})</b>`:''}، وذلك لشراء واستيراد البضاعة المبينة تفاصيلها أدناه بالسعر الرسمي المعتمد من مصرف ليبيا المركزي:</p>
    <table style="width:100%;border-collapse:collapse;margin:3.5mm 0 4.5mm;font-size:10.5pt">
      <tbody>
        <tr>
          <td style="border:1px solid #8a9bb5;padding:4.5px 8px;background:#f2f6fc;font-weight:700;width:25%">المستفيد (الشركة المصدِّرة)</td>
          <td style="border:1px solid #8a9bb5;padding:4.5px 8px;width:30%"><b>${esc(v.supplierName || '................')}</b></td>
          <td style="border:1px solid #8a9bb5;padding:4.5px 8px;background:#f2f6fc;font-weight:700;width:20%">بلد المنشأ</td>
          <td style="border:1px solid #8a9bb5;padding:4.5px 8px;width:25%">${esc(v.supplierCountry || '—')}</td>
        </tr>
        <tr>
          <td style="border:1px solid #8a9bb5;padding:4.5px 8px;background:#f2f6fc;font-weight:700">البضاعة والكمية</td>
          <td colspan="3" style="border:1px solid #8a9bb5;padding:4.5px 8px"><b>${esc(v.goodsDesc || '................')}</b></td>
        </tr>
        <tr>
          <td style="border:1px solid #8a9bb5;padding:4.5px 8px;background:#f2f6fc;font-weight:700">الفاتورة المبدئية</td>
          <td style="border:1px solid #8a9bb5;padding:4.5px 8px">رقم <b>${esc(v.proformaNo || '...')}</b> بتاريخ ${fdate(v.proformaDate,'short')}</td>
          <td style="border:1px solid #8a9bb5;padding:4.5px 8px;background:#f2f6fc;font-weight:700">شروط وميناء الوصول</td>
          <td style="border:1px solid #8a9bb5;padding:4.5px 8px">${esc(v.incoterm || 'CIF')} — ${esc(v.portDischarge || 'ميناء طرابلس البحري')}</td>
        </tr>
        <tr>
          <td style="border:1px solid #8a9bb5;padding:4.5px 8px;background:#f2f6fc;font-weight:700">القيمة الإجمالية</td>
          <td colspan="3" style="border:1px solid #8a9bb5;padding:4.5px 8px"><b>${fnum(v.amountFX)} ${curName}</b>${v.officialRate? ` — بالسعر الرسمي (${esc(v.officialRate)} د.ل)${lyd? ` أي ما يعادل تقريباً <b>${lyd} د.ل</b>`:''}`:''}</td>
        </tr>
      </tbody>
    </table>
    <p class="indent">ونفوّض مصرفكم الموقر بخصم كامل قيمة التغطية النقدية للاعتماد المستندي (100%) بالدينار الليبي وفق سعر الصرف الرسمي المعتمد من مصرف ليبيا المركزي بالإضافة إلى العمولات والمصاريف المصرفية المقررة خصماً من حسابنا الجاري رقم <b>(${esc(v.accountNo || '................')})</b> طرفكم، كما نلتزم بتقديم الإقرار الجمركي الأصلي الدال على دخول البضاعة عبر المنافذ الرسمية خلال المهلة القانونية المحددة بضوابط مصرف ليبيا المركزي، ونوافق على نشر بيانات الاعتماد بمنظومة المصرف المركزي.</p>`;
  },
},

/* ---------- 14) خطاب استلام مستندات شحن أصلية والتعهد الجمركي ---------- */
{
  id:'lc_docs_receipt', cat:'lc', icon:'📑', code:'LCD', name:'استلام مستندات شحن أصلية والتعهد الجمركي',
  desc:'خطاب للمصرف لتسليم مستندات الشحن الأصلية المتداولة على الاعتماد مع التعهد بتقديم الإقرار الجمركي خلال 60 يوماً',
  personKey:'bankName',
  fields:[
    {k:'bankName', label:'المصرف والفرع', req:true, span:2},
    {k:'lcNumber', label:'رقم الاعتماد المستندي (L/C No.)', req:true},
    {k:'blNumber', label:'رقم بوليصة الشحن (B/L)', ph:'اختياري'},
    {k:'goodsDesc', label:'وصف البضاعة والشحنة', span:2},
    {k:'portDischarge', label:'ميناء الوصول الجمركي', ph:'مثال: ميناء طرابلس البحري'},
    {k:'delegateName', label:'اسم المفوَّض باستلام المستندات', ph:'اسم الموظف أو المندوب ورقم إثبات الهوية'},
    {k:'date', type:'date', label:'تاريخ الخطاب'},
  ],
  subject: (v) => `استلام مستندات الشحن الأصلية للاعتماد المستندي رقم (${v.lcNumber || '...'})`,
  to: (v) => `<div class="l-to">السادة/ <b>${esc(v.bankName || '.............................')}</b> — المحترمين<div class="small">قسم الاعتمادات المستندية</div></div>`,
  body: (v,c) => `
    <p>تحية طيبة وبعد،،،</p>
    <p class="indent">بالإشارة إلى الاعتماد المستندي رقم <b>(${esc(v.lcNumber || '................')})</b> المفتوح طرفكم لصالح شركتنا <b>(${esc(c.company.name)})</b> والخاص بتوريد <b>${esc(v.goodsDesc || 'البضاعة الموردة')}</b>${v.blNumber? ` بموجب بوليصة الشحن رقم <b>(${esc(v.blNumber)})</b>`:''} الواردة إلى <b>${esc(v.portDischarge || 'الميناء الليبي')}</b>.</p>
    <p class="indent">نأمل من سيادتكم التكرم بتسليم حافظة مستندات الشحن الأصلية الواردة على الاعتماد المذكور (بوليصة الشحن، الفاتورة التجارية المصدقة، قائمة التعبئة، شهادة المنشأ، شهادة التفتيش والشهادات الصحية/الرقابية)${v.delegateName? ` إلى مفوضنا السيد/ <b>${esc(v.delegateName)}</b>`:''} وذلك لاستكمال إجراءات الإفراج الصحي والتخليص الجمركي.</p>
    <p class="indent">ونتعهد بتقديم أصل الإقرار الجمركي المعتمد والنموذج رقم (18) الدال على دخول البضاعة عبر المنافذ الرسمية إلى مصرفكم الموقر خلال المهلة القانونية المقررة من مصرف ليبيا المركزي (ستين يوماً من تاريخ استلام المستندات).</p>`,
},

/* ---------- 15) خطاب إحالة الإقرار الجمركي الأصلي وإقفال ملف الاعتماد ---------- */
{
  id:'lc_customs_close', cat:'lc', icon:'🛃', code:'LCC', name:'إحالة الإقرار الجمركي الأصلي وإقفال الاعتماد',
  desc:'خطاب إيداع أصل الإقرار الجمركي والنموذج (18) لدى المصرف وطلب تسوية وإقفال ملف الاعتماد المستندي',
  personKey:'bankName',
  fields:[
    {k:'bankName', label:'المصرف والفرع', req:true, span:2},
    {k:'lcNumber', label:'رقم الاعتماد المستندي (L/C No.)', req:true},
    {k:'customsDeclNo', label:'رقم الإقرار الجمركي الأصلي', req:true},
    {k:'customsDeclDate', type:'date', label:'تاريخ الإقرار الجمركي'},
    {k:'portDischarge', label:'المركز / المديرية الجمركية', ph:'مثال: جمرك ميناء طرابلس البحري'},
    {k:'goodsDesc', label:'بيان البضاعة المفرج عنها', span:2},
    {k:'attach', label:'المرفقات المودعة', ph:'أصل الإقرار الجمركي، النموذج (18)، إذن الإفراج النهائي، إفراج مركز الرقابة'},
    {k:'date', type:'date', label:'تاريخ الخطاب'},
  ],
  subject: (v) => `إحالة الإقرار الجمركي الأصلي وإقفال الاعتماد المستندي رقم (${v.lcNumber || '...'})`,
  to: (v) => `<div class="l-to">السادة/ <b>${esc(v.bankName || '.............................')}</b> — المحترمين<div class="small">قسم الاعتمادات المستندية والرقابة</div></div>`,
  body: (v,c) => `
    <p>تحية طيبة وبعد،،،</p>
    <p class="indent">إلحاقاً بالاعتماد المستندي رقم <b>(${esc(v.lcNumber || '................')})</b> المفتوح طرفكم لصالح شركتنا <b>(${esc(c.company.name)})</b> لتوريد <b>${esc(v.goodsDesc || 'البضاعة المستوردة')}</b>، وعملاً بالضوابط الصادرة عن مصرف ليبيا المركزي بشأن إثبات دخول السلع الموردة عبر المنافذ الرسمية.</p>
    <p class="indent">نُحيل إلى سيادتكم رفقة هذا الخطاب <b>أصل الإقرار الجمركي المعتمد رقم (${esc(v.customsDeclNo || '............')})</b> الصادر بتاريخ <b>${fdate(v.customsDeclDate,'short')}</b> عن <b>${esc(v.portDischarge || 'مديرية الجمارك المختصة')}</b> مرفقاً بالنموذج الجمركي رقم (18) ومستندات الإفراج النهائي.</p>
    <p class="indent">وعليه نأمل من سيادتكم التكرم باستلام المستندات الأصلية المرفقة والتأشير بتسوية وإقفال ملف الاعتماد المستندي المذكور لدى مصرفكم ومنظومة مصرف ليبيا المركزي وإبراء ذمة شركتنا.</p>`,
},
];

const TPL_BY_ID = Object.fromEntries(TEMPLATES.map(t=>[t.id,t]));
