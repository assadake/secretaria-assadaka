/* ============================================================
   فضاء الشركات
   1) وثائق الشركات — وثائق كل شركة على حدة، تُطبع بحسب شعار الشركة وترويستها
   2) جداول المتابعة اليومية والتشغيلية بترويسات الشركات
   ============================================================ */

const EXPIRY_SOON_DAYS = 45;

const GROUP_SCOPES = [
  { id: 'all',   label: 'جميع الشركات', badge: 'blue' },
  { id: 'ais',   label: 'شركة الصداقة المثالية — الأغذية والمشروبات (AIS)', badge: 'green' },
  { id: 'aisbm', label: 'الصداقة المثالية — مواد البناء والمواد الصحية (AIS-BM)', badge: 'gold' },
];

const GROUP_DOC_CATS = [
  { id: 'legal',    name: 'سجلات وتراخيص رسمية', icon: '🏛️' },
  { id: 'contract', name: 'عقود واتفاقيات وتأمين مشترك', icon: '⚖️' },
  { id: 'circular', name: 'قرارات وتعميمات المجموعة', icon: '📢' },
  { id: 'tax_bank', name: 'ضرائب وضمان ومصارف', icon: '🏦' },
  { id: 'policy',   name: 'لوائح ونماذج موحّدة', icon: '📑' },
];

/* ---------- البيانات النموذجية لجداول المتابعة ---------- */
const DEFAULT_TRACKERS = [
  {
    id: 'trk_fleet',
    order: 1,
    icon: '🚗',
    name: 'أسطول السيارات والمركبات',
    title: 'بيان متابعة أسطول السيارات والمركبات',
    subtitle: 'شركة الصداقة المثالية لصناعة المشروبات والمواد الغذائية (AIS)',
    headerMode: 'ais',
    columns: [
      { k: 'holder',     label: 'المستلم',     type: 'text',   req: true },
      { k: 'vehicle',    label: 'نوع السيارة', type: 'text',   req: true },
      { k: 'plate',      label: 'رقم اللوحة',  type: 'text',   req: true, ltr: true },
      { k: 'insurance',  label: 'التأمين',     type: 'expiry', ltr: true },
      { k: 'inspection', label: 'فحص الفني',   type: 'expiry', ltr: true },
      { k: 'vignette',   label: 'البل',        type: 'expiry', ltr: true },
    ],
    rows: [
      { id: 'v1',  holder: 'الحاج علي صليل', vehicle: 'مرسيدس بيضاء',    plate: '5-733000',  insurance: '2027-01-22', inspection: '2027-09-17', vignette: '2026-12-31' },
      { id: 'v2',  holder: 'الحاج علي صليل', vehicle: 'تويوتا تكوما',     plate: '5-506777',  insurance: '2027-01-22', inspection: '2027-11-09', vignette: '2026-11-30' },
      { id: 'v3',  holder: 'الحاج علي صليل', vehicle: 'ستارليت رصاصية',   plate: '5-844001',  insurance: '2027-01-22', inspection: '2027-01-20', vignette: '2027-01-31' },
      { id: 'v4',  holder: 'الحاج علي صليل', vehicle: 'ستارليت زرقاء',    plate: '5-2877863', insurance: '2027-01-22', inspection: '2027-06-20', vignette: '2027-01-31' },
      { id: 'v5',  holder: 'الحاج علي صليل', vehicle: 'سوزوكي',          plate: '5-3258757', insurance: '2027-04-12', inspection: '2028-04-12', vignette: '2027-04-30' },
      { id: 'v6',  holder: 'عزو',            vehicle: 'أزيرا سوداء',     plate: '5-2421678', insurance: '2027-01-22', inspection: '2027-05-31', vignette: '2026-12-30' },
      { id: 'v7',  holder: 'علي التايب',     vehicle: 'كيا سول سحابية',  plate: '5-2647139', insurance: '2027-01-22', inspection: '2027-12-28', vignette: '2026-12-31' },
      { id: 'v8',  holder: 'زكرياء الكوت',   vehicle: 'كيا سول كريمة',   plate: '5-2632125', insurance: '2027-01-22', inspection: '2027-06-12', vignette: '2026-12-31' },
      { id: 'v9',  holder: 'الشركة',         vehicle: 'كيا سول بيضاء',   plate: '5-2639568', insurance: '2027-01-22', inspection: '2027-05-26', vignette: '2027-05-31' },
      { id: 'v10', holder: 'عمر بن سليمان',  vehicle: 'كيا سول رصاصية',  plate: '5-2642446', insurance: '2027-01-22', inspection: '2027-12-28', vignette: '2026-12-31' },
      { id: 'v11', holder: 'صلاح عمران',     vehicle: 'كيا سول رصاصية',  plate: '5-2846713', insurance: '2027-01-22', inspection: '2027-04-20', vignette: '2027-04-30' },
      { id: 'v12', holder: 'الشركة',         vehicle: 'إفيكو',           plate: '5-209315',  insurance: '2027-01-22', inspection: '2027-01-11', vignette: '2026-12-31' },
      { id: 'v13', holder: 'المصنع',         vehicle: 'هنداي بورتر',     plate: '25-53142',  insurance: '2027-01-22', inspection: '2026-12-28', vignette: '2026-12-30' },
      { id: 'v14', holder: 'الشركة',         vehicle: 'كيا سول بيضاء',   plate: '5-3346909', insurance: '2027-09-04', inspection: '2028-08-08', vignette: '2027-08-30' },
      { id: 'v15', holder: 'المصنع - مصري',  vehicle: 'هنداي - صالون',   plate: '5-3364429', insurance: '2027-10-19', inspection: '2028-09-28', vignette: '2027-10-30' },
    ],
  },
  {
    id: 'trk_licenses',
    order: 2,
    icon: '🏛️',
    name: 'التراخيص والسجلات الرسمية',
    title: 'جدول متابعة التراخيص والسجلات والوثائق الرسمية',
    subtitle: 'السجل التجاري • الغرفة التجارية • الرخص الصناعية والاستيراد • الضرائب والضمان',
    headerMode: 'ais',
    columns: [
      { k: 'docType',    label: 'نوع الوثيقة / الترخيص', type: 'text', req: true },
      { k: 'company',    label: 'الشركة / الفرع',        type: 'select', options: ['AIS — الأغذية والمشروبات', 'AIS-BM — مواد البناء', 'المجموعة المشتركة'] },
      { k: 'regNo',      label: 'رقم القيد / الرخصة',    type: 'text', ltr: true },
      { k: 'authority',  label: 'الجهة المصدرة',         type: 'text' },
      { k: 'issueDate',  label: 'تاريخ الإصدار',         type: 'date', ltr: true },
      { k: 'expiryDate', label: 'تاريخ الانتهاء',        type: 'expiry', ltr: true },
      { k: 'status',     label: 'الحالة',                type: 'select', options: ['ساري', 'قيد التجديد', 'يحتاج مراجعة', 'مكتمل'] },
    ],
    rows: [
      { id: 'l1', docType: 'مستخرج السجل التجاري',          company: 'AIS — الأغذية والمشروبات', regNo: 'TR-AIS-01', authority: 'مكتب السجل التجاري طرابلس', issueDate: '2026-01-15', expiryDate: '2027-01-15', status: 'ساري' },
      { id: 'l2', docType: 'اشتراك الغرفة التجارية',         company: 'AIS — الأغذية والمشروبات', regNo: 'CC-AIS-26', authority: 'غرفة التجارة والصناعة طرابلس', issueDate: '2026-01-20', expiryDate: '2026-12-31', status: 'قيد التجديد' },
      { id: 'l3', docType: 'الرخصة الصناعية وتشغيل المصنع',  company: 'AIS — الأغذية والمشروبات', regNo: 'IND-ABT-09', authority: 'وزارة الصناعة / الرقابة على الأغذية', issueDate: '2026-03-01', expiryDate: '2027-03-01', status: 'ساري' },
      { id: 'l4', docType: 'قيد سجل المستوردين والرخصة التجارية', company: 'AIS-BM — مواد البناء', regNo: 'IMP-BM-14', authority: 'وزارة الاقتصاد والتجارة', issueDate: '2026-02-10', expiryDate: '2027-02-10', status: 'ساري' },
      { id: 'l5', docType: 'شهادة السداد الضريبي',           company: 'المجموعة المشتركة',        regNo: 'TAX-2026', authority: 'مصلحة الضرائب طرابلس', issueDate: '2026-06-01', expiryDate: '2026-12-31', status: 'يحتاج مراجعة' },
      { id: 'l6', docType: 'شهادة سداد الضمان الاجتماعي',    company: 'المجموعة المشتركة',        regNo: 'SS-2026',  authority: 'صندوق الضمان الاجتماعي', issueDate: '2026-06-01', expiryDate: '2026-12-31', status: 'ساري' },
    ],
  },
  {
    id: 'trk_workers',
    order: 3,
    icon: '🛂',
    name: 'الإقامات والشهائد الصحية',
    title: 'جدول متابعة الجوازات والإقامات والشهائد الصحية للعمالة',
    subtitle: 'فنيّو وعمالة المصنع (المشروبات والأغذية) والعاملون بشركات المجموعة',
    headerMode: 'ais',
    columns: [
      { k: 'name',          label: 'الاسم الكامل',       type: 'text', req: true },
      { k: 'nationality',   label: 'الجنسية',            type: 'text' },
      { k: 'site',          label: 'موقع العمل',         type: 'select', options: ['المصنع — المشروبات والأغذية', 'الإدارة العامة — AIS', 'مواد البناء والمواد الصحية', 'المخازن والتوزيع'] },
      { k: 'passportNo',    label: 'رقم الجواز / البطاقة', type: 'text', ltr: true },
      { k: 'passportExp',   label: 'انتهاء الجواز',      type: 'expiry', ltr: true },
      { k: 'residencyExp',  label: 'انتهاء الإقامة',     type: 'expiry', ltr: true },
      { k: 'healthCertExp', label: 'الشهادة الصحية',     type: 'expiry', ltr: true },
    ],
    rows: [
      { id: 'w1', name: 'فني خطوط الإنتاج (نموذج)', nationality: 'مصري',  site: 'المصنع — المشروبات والأغذية', passportNo: 'A2948102', passportExp: '2028-05-14', residencyExp: '2027-02-15', healthCertExp: '2026-12-20' },
      { id: 'w2', name: 'مشرف الجودة والتعبئة (نموذج)', nationality: 'تونسي', site: 'المصنع — المشروبات والأغذية', passportNo: 'X883120', passportExp: '2027-11-30', residencyExp: '2027-04-10', healthCertExp: '2027-03-15' },
      { id: 'w3', name: 'أمين مخزن مواد البناء (نموذج)', nationality: 'سوداني', site: 'مواد البناء والمواد الصحية', passportNo: 'P1049281', passportExp: '2027-08-22', residencyExp: '2027-01-30', healthCertExp: '2027-06-01' },
    ],
  },
  {
    id: 'trk_shipments',
    order: 4,
    icon: '🚢',
    name: 'الشحنات والحاويات والجمارك',
    title: 'جدول متابعة الشحنات والحاويات والاعتمادات المستندية',
    subtitle: 'استيراد مواد البناء والمواد الصحية • المواد الأولية والتعبئة لمصنع المشروبات',
    headerMode: 'ais',
    columns: [
      { k: 'refNo',         label: 'رقم الملف / الاعتماد', type: 'text', req: true, ltr: true },
      { k: 'company',       label: 'الشركة',               type: 'select', options: ['AIS-BM — مواد البناء', 'AIS — مدخلات المصنع', 'المجموعة'] },
      { k: 'goods',         label: 'الصنف / المورّد',      type: 'text', req: true },
      { k: 'containers',    label: 'عدد الحاويات / البوليصة', type: 'text' },
      { k: 'port',          label: 'الميناء',              type: 'text' },
      { k: 'eta',           label: 'تاريخ الوصول',         type: 'date', ltr: true },
      { k: 'freeTimeEnd',   label: 'نهاية سماح الأرضيات',   type: 'expiry', ltr: true },
      { k: 'customsStatus', label: 'حالة التخليص',         type: 'select', options: ['في البحر', 'وصل الميناء', 'قيد التخليص الجمركي', 'مفرج عنه / بالمخازن'] },
    ],
    rows: [
      { id: 's1', refNo: 'LC-2026-104', company: 'AIS-BM — مواد البناء',  goods: 'أطقم صحية وخلاطات — شحنة إيطاليا', containers: '3 حاويات 40 قدم', port: 'ميناء طرابلس البحري', eta: '2026-11-22', freeTimeEnd: '2026-12-05', customsStatus: 'قيد التخليص الجمركي' },
      { id: 's2', refNo: 'PO-2026-219', company: 'AIS — مدخلات المصنع',   goods: 'عبوات وأغطية ومواد أولية للإنتاج', containers: '4 حاويات 40 قدم', port: 'ميناء طرابلس البحري', eta: '2026-12-02', freeTimeEnd: '2026-12-16', customsStatus: 'في البحر' },
      { id: 's3', refNo: 'LC-2026-089', company: 'AIS-BM — مواد البناء',  goods: 'سيراميك وبورسلين — شحنة إسبانيا', containers: '6 حاويات 20 قدم', port: 'ميناء مصراتة',        eta: '2026-10-28', freeTimeEnd: '2026-11-15', customsStatus: 'مفرج عنه / بالمخازن' },
    ],
  },
  {
    id: 'trk_contracts',
    order: 5,
    icon: '🏭',
    name: 'العقود والإيجارات والصيانة',
    title: 'جدول متابعة العقود والإيجارات والصيانة الدورية',
    subtitle: 'المصنع وخطوط الإنتاج • المعارض والمخازن • المولدات والرافعات والخدمات',
    headerMode: 'ais',
    columns: [
      { k: 'item',       label: 'البند / العقار / المعدّة', type: 'text', req: true },
      { k: 'location',   label: 'الشركة / الموقع',          type: 'text' },
      { k: 'party',      label: 'الطرف الثاني / المنفّذ',   type: 'text' },
      { k: 'contractNo', label: 'رقم العقد / المرجع',       type: 'text', ltr: true },
      { k: 'startDate',  label: 'تاريخ البداية / آخر صيانة', type: 'date', ltr: true },
      { k: 'dueDate',    label: 'موعد التجديد / الاستحقاق', type: 'expiry', ltr: true },
      { k: 'status',     label: 'الحالة',                   type: 'select', options: ['ساري', 'مستحق قريباً', 'قيد التجديد', 'مُنجز'] },
    ],
    rows: [
      { id: 'c1', item: 'صيانة ومعايرة خط التعبئة والتغليف', location: 'المصنع — AIS', party: 'الفريق الهندسي المعتمد', contractNo: 'MNT-01', startDate: '2026-09-01', dueDate: '2026-12-01', status: 'مستحق قريباً' },
      { id: 'c2', item: 'عقد إيجار مخزن ومعرض مواد البناء',  location: 'AIS-BM — طرابلس',        party: 'عقد إيجار سنوي',        contractNo: 'RNT-12', startDate: '2026-01-01', dueDate: '2026-12-31', status: 'ساري' },
      { id: 'c3', item: 'صيانة المولدات الكهربائية والرافعات الشوكية', location: 'المصنع والمخازن', party: 'ورشة الصيانة الدورية', contractNo: 'GEN-04', startDate: '2026-10-15', dueDate: '2027-01-15', status: 'ساري' },
    ],
  },
  {
    id: 'trk_daily',
    order: 6,
    icon: '📋',
    name: 'المراجعات والمتابعة اليومية',
    title: 'سجل المتابعة اليومية للمعاملات والمراجعات الخارجية',
    subtitle: 'المصارف • الجمارك • الضرائب • المرور والترخيص • المهام اليومية للسكرتارية',
    headerMode: 'ais',
    columns: [
      { k: 'taskDate', label: 'التاريخ',             type: 'date', ltr: true },
      { k: 'company',  label: 'الشركة',              type: 'select', options: ['المجموعة المشتركة', 'AIS — الأغذية والمشروبات', 'AIS-BM — مواد البناء'] },
      { k: 'entity',   label: 'الجهة المقصودة',       type: 'text', req: true },
      { k: 'subject',  label: 'المعاملة / المطلوب',   type: 'text', req: true },
      { k: 'delegate', label: 'المندوب المكلّف',      type: 'text' },
      { k: 'deadline', label: 'موعد الإنجاز',         type: 'expiry', ltr: true },
      { k: 'status',   label: 'الحالة',              type: 'select', options: ['قيد الإجراء', 'بانتظار الرد', 'عاجل', 'مُنجز'] },
    ],
    rows: [
      { id: 'd1', taskDate: '2026-11-14', company: 'المجموعة المشتركة',      entity: 'قسم المرور والترخيص طرابلس', subject: 'تجديد البل لسيارة تويوتا تكوما (5-506777) والسيارات المستحقة نهاية العام', delegate: 'مندوب الحركة', deadline: '2026-11-28', status: 'عاجل' },
      { id: 'd2', taskDate: '2026-11-14', company: 'AIS-BM — مواد البناء',   entity: 'مصرف الجمهورية — قسم الاعتمادات', subject: 'متابعة مستندات الشحن وإشعار وصول الحاويات', delegate: 'المندوب المصرفي', deadline: '2026-11-20', status: 'قيد الإجراء' },
      { id: 'd3', taskDate: '2026-11-14', company: 'AIS — الأغذية والمشروبات', entity: 'المركز الوطني للرقابة على الأغذية', subject: 'استلام نتائج التحاليل الدورية وتجديد الشهائد الصحية', delegate: 'مندوب المصنع', deadline: '2026-12-10', status: 'بانتظار الرد' },
    ],
  },
];

/* ---------- وثائق المجموعة المشتركة الافتراضية ---------- */
const DEFAULT_GROUP_DOCS = [
  {
    id: 'gd_fleet_ins',
    title: 'ملف وثائق التأمين الموحّد لأسطول مركبات الشركة (15 مركبة)',
    category: 'contract',
    docNo: 'INS-GRP-2026',
    companyId: 'ais',
    authority: 'شركة التأمين المعتمدة — طرابلس',
    issueDate: '2026-01-22',
    expiryDate: '2027-01-22',
    notes: 'يشمل بوليصات التأمين الموحّدة لمركبات الإدارة والشركة والمصنع (تاريخ التجديد الرئيسي لمعظم المركبات: 2027-01-22). يُراجع جدول أسطول السيارات لمتابعة الفحص الفني والبل لكل مركبة.',
    externalUrl: '',
    fileName: '',
    fileType: '',
    fileData: '',
    createdAt: 1763100000000,
    updatedAt: 1763100000000,
  },
  {
    id: 'gd_corp_file',
    title: 'ملف التأسيس والسجلات التجارية والغرفة التجارية لمجموعة الصداقة المثالية',
    category: 'legal',
    docNo: 'CORP-AIS-GRP',
    companyId: 'all',
    authority: 'السجل التجاري وغرفة التجارة والصناعة — طرابلس',
    issueDate: '2026-01-15',
    expiryDate: '2026-12-31',
    notes: 'يضم النسخ المصدّقة المشتركة لعقود التأسيس، محاضر الجمعية العمومية، مستخرجات السجل التجاري، وشهادات الغرفة التجارية التي تُطلب في الملفات المصرفية والجمركية للشركات الشقيقة.',
    externalUrl: '',
    fileName: '',
    fileType: '',
    fileData: '',
    createdAt: 1763090000000,
    updatedAt: 1763090000000,
  },
  {
    id: 'gd_tax_ss',
    title: 'ملف السداد الضريبي والضمان الاجتماعي المشترك للشركات الشقيقة',
    category: 'tax_bank',
    docNo: 'TAX-SS-2026',
    companyId: 'all',
    authority: 'مصلحة الضرائب / صندوق الضمان الاجتماعي',
    issueDate: '2026-06-01',
    expiryDate: '2026-12-31',
    notes: 'الشهادات الدورية اللازمة لتجديد التراخيص، فتح الاعتمادات المستندية، ودخول العطاءات والتوريدات.',
    externalUrl: '',
    fileName: '',
    fileType: '',
    fileData: '',
    createdAt: 1763080000000,
    updatedAt: 1763080000000,
  },
  {
    id: 'gd_fleet_policy',
    title: 'لائحة تنظيم استخدام واستلام مركبات الشركة ومتابعة الفحص والبل',
    category: 'policy',
    docNo: 'POL-CAR-01',
    companyId: 'ais',
    authority: 'الإدارة العامة لشركة الصداقة المثالية',
    issueDate: '2026-10-01',
    expiryDate: '',
    notes: '1. لا تُسلَّم أي مركبة إلا بموجب «محضر تسليم واستلام مركبة» موقع ومؤرشف.\n2. تتولى السكرتارية ومسؤول الحركة مراجعة جدول السيارات شهرياً وتنبيه الإدارة قبل 30 يوماً من انتهاء التأمين أو الفحص الفني أو البل.\n3. تُحفظ صور الكتيبات ووثائق التأمين في أرشيف وثائق الشركة.',
    externalUrl: '',
    fileName: '',
    fileType: '',
    fileData: '',
    createdAt: 1763070000000,
    updatedAt: 1763070000000,
  },
];

/* ---------- حالة الواجهة ---------- */
let trackerUI = {
  activeId: 'trk_fleet',
  q: '',
  expFilter: 'all',     // 'all' | 'alerts' | 'expired'
  showBadges: true,
  printColors: false,
};

let groupDocUI = {
  cat: 'all',
  scope: 'all',
  q: '',
};

/* ---------- تهيئة البيانات الافتراضية ومزامنتها ---------- */
function ensureGroupDefaultsOn(db) {
  db.groupDocs = Array.isArray(db.groupDocs) ? db.groupDocs : [];
  db.trackers = Array.isArray(db.trackers) ? db.trackers : [];
  /* ترحيل: وثائق المجموعة -> وثائق الشركات (companyId) */
  db.groupDocs.forEach(d=>{
    if (d.companyId === undefined) {
      const sc = Array.isArray(d.scopes) ? d.scopes : [];
      d.companyId = sc.includes('all') ? 'all'
        : (sc.includes('aisbm') ? 'aisbm' : 'ais');
    }
    d.companyId = ['all','ais','aisbm'].includes(d.companyId) ? d.companyId : 'all';
  });
  let seededNow = false;
  if (!db.settings.groupSeededV1 && db.trackers.length === 0 && db.groupDocs.length === 0) {
    db.trackers = JSON.parse(JSON.stringify(DEFAULT_TRACKERS));
    db.groupDocs = JSON.parse(JSON.stringify(DEFAULT_GROUP_DOCS));
    db.settings.groupSeededV1 = true;
    seededNow = true;
  }
  db.trackers.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  return seededNow;
}

async function syncInitialGroupSeedIfNeeded() {
  const seeded = ensureGroupDefaultsOn(DB);
  if (!seeded) return;
  if (!API_ON) {
    saveDB(true);
    return;
  }
  try {
    for (const t of DB.trackers) await persistDoc('tracker', t);
    for (const g of DB.groupDocs) await persistDoc('group_doc', g);
    await persistSettings({ groupSeededV1: true });
  } catch (e) {
    console.warn('Seed sync warning:', e);
  }
}

/* ---------- حساب حالة الصلاحية للتواريخ ---------- */
function daysUntilISO(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso).trim())) return null;
  const [y, m, d] = String(iso).trim().split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

function expiryStatus(iso) {
  const days = daysUntilISO(iso);
  if (days === null) return { state: 'none', days: null, label: '' };
  if (days < 0) return { state: 'expired', days, label: `منتهي (${Math.abs(days)} ي)` };
  if (days === 0) return { state: 'expired', days: 0, label: 'ينتهي اليوم!' };
  if (days <= EXPIRY_SOON_DAYS) return { state: 'soon', days, label: `خلال ${days} يوم` };
  return { state: 'ok', days, label: 'ساري' };
}

function rowWorstExpiry(tracker, row) {
  let worst = 'ok';
  let hasAny = false;
  for (const col of (tracker.columns || [])) {
    if (col.type !== 'expiry') continue;
    const st = expiryStatus(row[col.k]);
    if (st.state === 'none') continue;
    hasAny = true;
    if (st.state === 'expired') return 'expired';
    if (st.state === 'soon') worst = 'soon';
  }
  return hasAny ? worst : 'none';
}

function trackerStats(tracker) {
  let total = (tracker.rows || []).length;
  let expired = 0, soon = 0, ok = 0;
  for (const r of (tracker.rows || [])) {
    const w = rowWorstExpiry(tracker, r);
    if (w === 'expired') expired++;
    else if (w === 'soon') soon++;
    else ok++;
  }
  return { total, expired, soon, alerts: expired + soon, ok };
}

function collectGroupAlerts() {
  const items = [];
  for (const trk of (DB.trackers || [])) {
    const labelCol = (trk.columns || [])[0];
    const subCol = (trk.columns || [])[1] || (trk.columns || [])[2];
    for (const row of (trk.rows || [])) {
      for (const col of (trk.columns || [])) {
        if (col.type !== 'expiry') continue;
        const st = expiryStatus(row[col.k]);
        if (st.state === 'expired' || st.state === 'soon') {
          const who = row[labelCol?.k] || '—';
          const what = subCol ? row[subCol.k] : '';
          items.push({
            kind: 'tracker',
            targetId: trk.id,
            state: st.state,
            days: st.days,
            icon: trk.icon || '📊',
            title: `${what ? what + ' — ' : ''}${who}`,
            detail: `${trk.name} • ${col.label}: ${row[col.k]} (${st.label})`,
          });
        }
      }
    }
  }
  for (const gd of (DB.groupDocs || [])) {
    const st = expiryStatus(gd.expiryDate);
    if (st.state === 'expired' || st.state === 'soon') {
      items.push({
        kind: 'group_doc',
        targetId: gd.id,
        state: st.state,
        days: st.days,
        icon: '🗂️',
        title: gd.title,
        detail: `وثائق الشركات • الانتهاء: ${gd.expiryDate} (${st.label})`,
      });
    }
  }
  items.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
  return items;
}

/* ---------- الترويسة الموحّدة بترويسة الشركة ---------- */
function renderDualHeaderHTML(opts = {}) {
  const title = opts.title || 'بيان متابعة — مجموعة شركات الصداقة المثالية';
  const subtitle = opts.subtitle || 'شركة الصداقة المثالية (AIS)';
  const metaLine = opts.metaLine || '';
  const mode = opts.mode || 'ais';
  const img = mode === 'aisbm' ? ASSETS.bmHeader : ASSETS.header;

  return `
      <div class="dual-header" style="padding:10px 16px 14px">
        <img src="${img}" alt="" style="width:100%;max-height:95px;object-fit:contain;display:block;margin-bottom:8px">
        <div class="dual-center">
          <h2>${esc(title)}</h2>
          ${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ''}
          ${metaLine ? `<div class="meta-line">${esc(metaLine)}</div>` : ''}
        </div>
      </div>`;
}

/* ترويسة خاصة بورقة الخطاب A4 للمجموعة (للتعميمات والمحاضر والتفويضات المشتركة) */
function renderSheetDualBannerHTML() {
  return `
    <div class="lh-head lh-group-dual">
      <div class="dual-header-row" style="grid-template-columns:150px 1fr">
        <div class="dual-logo-box">
          <img src="${ASSETS.logoAis || ASSETS.emblem}" alt="AIS" style="max-height:62px;max-width:140px">
          <div class="cap" style="font-size:9pt">شركة الصداقة المثالية</div>
        </div>
        <div class="dual-center">
          <div style="font-size:14.5pt;font-weight:800;color:#12305f">مجموعة شركات الصداقة المثالية</div>
          <div style="font-size:9.8pt;font-weight:700;color:#334155">لصناعة المشروبات والمواد الغذائية واستيراد مواد البناء والمواد الصحية</div>
          <div style="font-size:8.6pt;color:#64748b;direction:ltr">AIS • ASSADAKA GROUP</div>
        </div>
      </div>
    </div>`;
}

function renderSheetDualFooterHTML() {
  return `
    <div class="lh-foot lh-group-foot">
      <div>📍 طرابلس — ليبيا  |  ☎ 094 400 4002 – 091 000 1833</div>
      <div style="direction:ltr;font-weight:700">www.ais.ly  •  www.assadaka.ly</div>
    </div>`;
}

/* ---------- ترويسة الشركة (الشعار + الترويسة) للطباعة الرسمية ---------- */
function renderCompanyHeaderHTML(company, opts = {}) {
  company = company || activeCompany();
  const title = opts.title || company.short;
  const subtitle = opts.subtitle || company.name;
  const metaLine = opts.metaLine || '';
  const lay = company.layout || 'ais';
  const isBM = lay === 'aisbm';
  /* الصورة (الشعار) داخل الترويسة: صورة الترويسة الرسمية للشركة */
  const headerImg = isBM ? ASSETS.bmHeader : ASSETS.header;
  return `
    <div class="dual-header" style="padding:10px 16px 14px">
      <img src="${headerImg}" alt="" style="width:100%;max-height:108px;object-fit:contain;display:block;margin-bottom:8px">
      <div class="dual-center">
        <h2>${esc(title)}</h2>
        ${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ''}
        ${metaLine ? `<div class="meta-line">${esc(metaLine)}</div>` : ''}
      </div>
    </div>`;
}

/* ============================================================
   1) شاشة جداول المتابعة اليومية والتشغيلية (route: trackers)
   ============================================================ */
function activeTracker() {
  ensureGroupDefaultsOn(DB);
  let t = DB.trackers.find(x => x.id === trackerUI.activeId);
  if (!t) {
    t = DB.trackers[0];
    if (t) trackerUI.activeId = t.id;
  }
  return t;
}

function filteredTrackerRows(trk) {
  if (!trk) return [];
  const q = trackerUI.q.trim().toLowerCase();
  return (trk.rows || []).filter(r => {
    if (trackerUI.expFilter === 'expired' && rowWorstExpiry(trk, r) !== 'expired') return false;
    if (trackerUI.expFilter === 'alerts') {
      const w = rowWorstExpiry(trk, r);
      if (w !== 'expired' && w !== 'soon') return false;
    }
    if (!q) return true;
    return (trk.columns || []).some(c => String(r[c.k] || '').toLowerCase().includes(q));
  });
}

function renderTrackerCellHTML(col, val, showBadges, highlightCells) {
  const txt = String(val ?? '').trim();
  const classes = [];
  if (col.ltr) classes.push('col-ltr');

  if (col.type === 'expiry' && txt) {
    const st = expiryStatus(txt);
    if (highlightCells) {
      if (st.state === 'expired') classes.push('cell-expired');
      else if (st.state === 'soon') classes.push('cell-soon');
    }
    const badge = (showBadges && (st.state === 'expired' || st.state === 'soon'))
      ? `<span class="exp-chip ${st.state === 'expired' ? 'red' : 'amber'}">${esc(st.label)}</span>`
      : '';
    return `<td class="${classes.join(' ')}">${esc(txt)}${badge}</td>`;
  }

  return `<td class="${classes.join(' ')}">${txt ? esc(txt) : '—'}</td>`;
}

function viewTrackers() {
  ensureGroupDefaultsOn(DB);
  const trk = activeTracker();
  if (!trk) return `<div class="empty">لا توجد جداول متابعة</div>`;

  const st = trackerStats(trk);
  const rows = filteredTrackerRows(trk);
  const isFleet = trk.id === 'trk_fleet';

  return `
  <!-- شريط اختيار الجدول -->
  <div class="trk-tabs no-print">
    ${DB.trackers.map(t => {
      const s = trackerStats(t);
      return `<button class="trk-tab ${t.id === trk.id ? 'active' : ''}" data-trk-sel="${esc(t.id)}">
        <span>${esc(t.icon || '📊')}</span>
        <span>${esc(t.name)}</span>
        <span class="cnt">${s.total}</span>
        ${s.alerts ? `<span class="alrt" title="تواريخ منتهية أو قريبة الانتهاء">⚠ ${s.alerts}</span>` : ''}
      </button>`;
    }).join('')}
    <button class="trk-tab" data-trk-new style="border-style:dashed;color:var(--navy)">➕ جدول متابعة جديد</button>
  </div>

  <!-- بطاقات الملخص السريع للجدول الحالي -->
  <div class="stats no-print" style="margin-bottom:14px">
    <div class="stat" style="cursor:pointer" data-exp-filter="all">
      <div class="ico">${esc(trk.icon || '📊')}</div>
      <div><div class="v">${st.total}</div><div class="l">إجمالي السجلات في هذا الجدول</div></div>
    </div>
    <div class="stat green" style="cursor:pointer" data-exp-filter="all">
      <div class="ico">✅</div>
      <div><div class="v">${st.ok}</div><div class="l">ساري ومكتمل الصلاحية</div></div>
    </div>
    <div class="stat gold" style="cursor:pointer" data-exp-filter="alerts">
      <div class="ico">⏳</div>
      <div><div class="v">${st.soon}</div><div class="l">قريب الانتهاء (خلال ${EXPIRY_SOON_DAYS} يوماً)</div></div>
    </div>
    <div class="stat red" style="cursor:pointer" data-exp-filter="expired">
      <div class="ico">🚨</div>
      <div><div class="v">${st.expired}</div><div class="l">منتهي الصلاحية (يحتاج تجديداً)</div></div>
    </div>
  </div>

  <!-- شريط الأدوات والفلترة والطباعة -->
  <div class="card no-print" style="margin-bottom:16px;padding:13px 16px">
    <div class="toolbar" style="margin-bottom:10px">
      <div class="search" style="min-width:210px">
        <span class="mg">🔍</span>
        <input id="trkSearch" placeholder="بحث سريع في الجدول (الاسم، اللوحة، النوع، التاريخ…)" value="${esc(trackerUI.q)}">
      </div>
      <div class="filter-pills">
        <button class="fpill ${trackerUI.expFilter === 'all' ? 'active' : ''}" data-exp-filter="all">الكل (${st.total})</button>
        <button class="fpill ${trackerUI.expFilter === 'alerts' ? 'active' : ''}" data-exp-filter="alerts">🟠 تنبيهات القرب والانتهاء (${st.alerts})</button>
        <button class="fpill ${trackerUI.expFilter === 'expired' ? 'active' : ''}" data-exp-filter="expired">🔴 منتهي فقط (${st.expired})</button>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" data-row-add>+ إضافة سطر جديد</button>
    </div>

    <div class="flex flex-wrap" style="gap:10px;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid var(--line)">
      <div class="flex flex-wrap" style="gap:12px;align-items:center;font-size:13px">
        <label class="flex" style="gap:6px;cursor:pointer">
          <input type="checkbox" id="trkShowBadges" ${trackerUI.showBadges ? 'checked' : ''}>
          إظهار تنبيهات الصلاحية على الشاشة
        </label>
        <label class="flex" style="gap:6px;cursor:pointer">
          <input type="checkbox" id="trkPrintColors" ${trackerUI.printColors ? 'checked' : ''}>
          تلوين التواريخ القريبة عند الطباعة
        </label>
        <div class="flex" style="gap:6px;align-items:center">
          <span class="muted small">الترويسة:</span>
          <select id="trkHeaderMode" style="border:1px solid #dbe2ee;border-radius:8px;padding:4px 8px;font-size:12.5px;font-weight:700">
            <option value="ais" ${(trk.headerMode || 'ais') === 'ais' ? 'selected' : ''}>ترويسة AIS — المشروبات والأغذية</option>
            <option value="aisbm" ${trk.headerMode === 'aisbm' ? 'selected' : ''}>ترويسة AIS-BM — مواد البناء</option>
          </select>
        </div>
      </div>

      <div class="flex flex-wrap" style="gap:7px">
        <button class="btn btn-sm" data-trk-print="portrait" title="طباعة رسمية A4 بالطول مع الترويسة">🖨 طباعة A4 عمودي</button>
        <button class="btn btn-sm" data-trk-print="landscape" title="طباعة رسمية A4 بالعرض (مثالية للجداول العريضة)">🖨 طباعة A4 أفقي</button>
        <button class="btn btn-sm btn-green" data-trk-xls title="تصدير ملف Excel منسّق بالألوان">⬇ تصدير Excel</button>
        <button class="btn btn-sm" data-trk-csv>⬇ CSV</button>
        <button class="btn btn-sm" data-trk-config title="تعديل عنوان الجدول وأعمدته">⚙ إعداد الجدول</button>
      </div>
    </div>
  </div>

  <!-- الورقة النموذجية الحية بترويسة الشركة -->
  <div class="exemplar-sheet">
    ${renderDualHeaderHTML({
      title: trk.title || trk.name,
      subtitle: trk.subtitle || '',
      mode: trk.headerMode || 'ais',
      metaLine: `تاريخ البيان: ${todayISO()}  •  عدد السجلات المعروضة: ${rows.length} من ${st.total}`,
    })}

    ${rows.length ? `
    <div class="ex-table-wrap">
      <table class="ex-tbl">
        <thead>
          <tr>
            <th style="width:46px">ر</th>
            ${(trk.columns || []).map(c => `<th>${esc(c.label)}</th>`).join('')}
            <th class="no-print" style="width:${isFleet ? '165px' : '125px'}">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, idx) => `
            <tr>
              <td class="col-seq">${idx + 1}</td>
              ${(trk.columns || []).map(c => renderTrackerCellHTML(c, r[c.k], trackerUI.showBadges, trackerUI.showBadges)).join('')}
              <td class="no-print" style="background:inherit">
                <div class="row-actions" style="justify-content:center">
                  ${isFleet ? `<button class="btn btn-sm" style="padding:3px 7px;font-size:11.5px" data-car-handover="${esc(r.id)}" title="إصدار محضر تسليم واستلام لهذه المركبة">📄 محضر</button>` : ''}
                  <button class="btn btn-sm" style="padding:3px 7px;font-size:11.5px" data-row-edit="${esc(r.id)}" title="تعديل">✎</button>
                  <button class="btn btn-sm" style="padding:3px 6px;font-size:11px" data-row-move="${esc(r.id)}:up" title="تحريك لأعلى">↑</button>
                  <button class="btn btn-sm" style="padding:3px 6px;font-size:11px" data-row-move="${esc(r.id)}:down" title="تحريك لأسفل">↓</button>
                  <button class="btn btn-sm btn-red" style="padding:3px 7px;font-size:11.5px" data-row-del="${esc(r.id)}" title="حذف">🗑</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>` : `
    <div class="empty">
      <span class="big">${esc(trk.icon || '📊')}</span>
      لا توجد سجلات مطابقة للبحث الحالي — أضف سطراً جديداً أو غيّر الفلتر
    </div>`}
  </div>`;
}

function bindTrackers() {
  const trk = activeTracker();
  if (!trk) return;

  $$('[data-trk-sel]').forEach(b => b.onclick = () => {
    trackerUI.activeId = b.dataset.trkSel;
    trackerUI.q = '';
    trackerUI.expFilter = 'all';
    render('trackers');
  });

  $$('[data-exp-filter]').forEach(b => b.onclick = () => {
    trackerUI.expFilter = b.dataset.expFilter;
    render('trackers');
  });

  const qEl = $('#trkSearch');
  if (qEl) {
    qEl.oninput = () => {
      trackerUI.q = qEl.value;
      const pos = qEl.selectionStart;
      render('trackers');
      const nq = $('#trkSearch');
      if (nq) { nq.focus(); nq.setSelectionRange(pos, pos); }
    };
  }

  const sb = $('#trkShowBadges');
  if (sb) sb.onchange = () => { trackerUI.showBadges = sb.checked; render('trackers'); };

  const pc = $('#trkPrintColors');
  if (pc) pc.onchange = () => { trackerUI.printColors = pc.checked; };

  const hm = $('#trkHeaderMode');
  if (hm) hm.onchange = async () => {
    trk.headerMode = hm.value;
    trk.updatedAt = Date.now();
    await persistDoc('tracker', trk);
    render('trackers');
    toast('تم تحديث ترويسة الجدول');
  };

  const addBtn = $('[data-row-add]');
  if (addBtn) addBtn.onclick = () => trackerRowModal(trk, null);

  $$('[data-row-edit]').forEach(b => b.onclick = () => {
    const row = (trk.rows || []).find(x => x.id === b.dataset.rowEdit);
    if (row) trackerRowModal(trk, row);
  });

  $$('[data-row-del]').forEach(b => b.onclick = async () => {
    if (!confirm('حذف هذا السطر من الجدول؟')) return;
    trk.rows = (trk.rows || []).filter(x => x.id !== b.dataset.rowDel);
    trk.updatedAt = Date.now();
    await persistDoc('tracker', trk);
    render('trackers');
    toast('تم حذف السطر');
  });

  $$('[data-row-move]').forEach(b => b.onclick = async () => {
    const [rid, dir] = b.dataset.rowMove.split(':');
    const arr = trk.rows || [];
    const idx = arr.findIndex(x => x.id === rid);
    if (idx < 0) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    const tmp = arr[idx];
    arr[idx] = arr[swapIdx];
    arr[swapIdx] = tmp;
    trk.updatedAt = Date.now();
    await persistDoc('tracker', trk);
    render('trackers');
  });

  $$('[data-car-handover]').forEach(b => b.onclick = () => {
    const r = (trk.rows || []).find(x => x.id === b.dataset.carHandover);
    if (!r) return;
    composerState = {
      tplId: 'handover_vehicle',
      values: {
        date: todayISO(),
        holder: r.holder || '',
        vehicle: r.vehicle || '',
        plate: r.plate || '',
        insurance: r.insurance || '',
        inspection: r.inspection || '',
        vignette: r.vignette || '',
        condition: 'المركبة بحالة فنية جيدة وكاملة الأوراق الرسمية والملحقات الأساسية.',
      },
      editingId: null,
      ref: null,
    };
    go('new');
    toast('تم تجهيز محضر تسليم واستلام المركبة — راجعه ثم اطبع أو أرشِف');
  });

  $$('[data-trk-print]').forEach(b => b.onclick = () => printTrackerSheet(trk, b.dataset.trkPrint));

  const xlsBtn = $('[data-trk-xls]');
  if (xlsBtn) xlsBtn.onclick = () => exportTrackerExcel(trk);

  const csvBtn = $('[data-trk-csv]');
  if (csvBtn) csvBtn.onclick = () => exportTrackerCSV(trk);

  const cfgBtn = $('[data-trk-config]');
  if (cfgBtn) cfgBtn.onclick = () => trackerConfigModal(trk, false);

  const newBtn = $('[data-trk-new]');
  if (newBtn) newBtn.onclick = () => trackerConfigModal(null, true);
}

/* ---------- نافذة إضافة / تعديل سطر في جدول المتابعة ---------- */
function trackerRowModal(trk, existingRow) {
  const r = existingRow || {};
  const bg = $('#modalBg');
  bg.innerHTML = `
    <div class="modal" style="max-width:640px">
      <div class="modal-h">
        <h3>${existingRow ? '✎ تعديل سجل' : '➕ إضافة سجل جديد'} — ${esc(trk.name)}</h3>
        <div class="spacer"></div>
        <button class="btn btn-sm" data-close>✕</button>
      </div>
      <div class="modal-b">
        <form id="trkRowForm" class="grid2">
          ${(trk.columns || []).map(c => {
            const val = r[c.k] || '';
            if (c.type === 'select') {
              const opts = c.options || [];
              return `<div class="field">
                <label>${esc(c.label)}${c.req ? ' <span class="req">*</span>' : ''}</label>
                <select name="${esc(c.k)}">
                  <option value="">— اختر —</option>
                  ${opts.map(o => `<option value="${esc(o)}" ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}
                </select>
              </div>`;
            }
            const inputType = (c.type === 'date' || c.type === 'expiry') ? 'date' : (c.type === 'number' ? 'number' : 'text');
            return `<div class="field">
              <label>${esc(c.label)}${c.type === 'expiry' ? ' <span class="muted small">(تنبيه تلقائي)</span>' : ''}${c.req ? ' <span class="req">*</span>' : ''}</label>
              <input type="${inputType}" name="${esc(c.k)}" value="${esc(val)}" ${c.ltr ? 'dir="ltr"' : ''}>
            </div>`;
          }).join('')}
          <div class="field span2">
            <label>ملاحظات إضافية (اختياري)</label>
            <input name="__notes" value="${esc(r.__notes || '')}" placeholder="أي تفاصيل داخلية عن هذا السجل…">
          </div>
        </form>
      </div>
      <div class="modal-f">
        <button class="btn btn-primary" data-save>💾 حفظ السجل</button>
        <button class="btn" data-close>إلغاء</button>
      </div>
    </div>`;
  bg.classList.add('open');
  $$('[data-close]', bg).forEach(b => b.onclick = () => bg.classList.remove('open'));
  $('[data-save]', bg).onclick = async () => {
    const fd = Object.fromEntries(new FormData($('#trkRowForm')).entries());
    const missing = (trk.columns || []).filter(c => c.req && !String(fd[c.k] || '').trim());
    if (missing.length) {
      toast('يرجى تعبئة الحقول المطلوبة: ' + missing.map(c => c.label).join('، '), 'err');
      return;
    }
    if (existingRow) {
      Object.assign(existingRow, fd);
    } else {
      trk.rows = trk.rows || [];
      trk.rows.push({ id: 'r-' + uid(), ...fd });
    }
    trk.updatedAt = Date.now();
    await persistDoc('tracker', trk);
    bg.classList.remove('open');
    render('trackers');
    toast(existingRow ? 'تم تحديث السجل' : 'تمت إضافة السجل بنجاح');
  };
}

/* ---------- نافذة إنشاء جدول متابعة جديد أو تعديل أعمدته ---------- */
function trackerConfigModal(trk, isNew) {
  const base = isNew ? {
    id: 'trk_' + uid(),
    order: (DB.trackers || []).length + 1,
    icon: '📊',
    name: '',
    title: '',
    subtitle: 'شركة الصداقة المثالية (AIS)',
    headerMode: 'ais',
    columns: [
      { k: 'col1', label: 'البيان / المستلم', type: 'text', req: true },
      { k: 'col2', label: 'التفاصيل / النوع', type: 'text' },
      { k: 'col3', label: 'الرقم المرجعي', type: 'text', ltr: true },
      { k: 'col4', label: 'تاريخ الانتهاء', type: 'expiry', ltr: true },
    ],
    rows: [],
  } : JSON.parse(JSON.stringify(trk));

  const bg = $('#modalBg');

  function paint() {
    bg.innerHTML = `
      <div class="modal" style="max-width:740px">
        <div class="modal-h">
          <h3>${isNew ? '➕ إنشاء جدول متابعة جديد' : '⚙ إعدادات الجدول — ' + esc(base.name)}</h3>
          <div class="spacer"></div>
          <button class="btn btn-sm" data-close>✕</button>
        </div>
        <div class="modal-b">
          <div class="grid2">
            <div class="field">
              <label>اسم الجدول المختصر (في التبويب) <span class="req">*</span></label>
              <input id="tcName" value="${esc(base.name)}" placeholder="مثال: متابعة المولدات والوقود">
            </div>
            <div class="field">
              <label>الأيقونة + الترويسة المعتمدة</label>
              <div class="flex" style="gap:6px">
                <input id="tcIcon" value="${esc(base.icon || '📊')}" style="width:62px;text-align:center">
                <select id="tcMode" style="flex:1">
                  <option value="ais" ${base.headerMode !== 'aisbm' ? 'selected' : ''}>ترويسة AIS — المشروبات والأغذية</option>
                  <option value="aisbm" ${base.headerMode === 'aisbm' ? 'selected' : ''}>ترويسة مواد البناء AIS-BM</option>
                </select>
              </div>
            </div>
            <div class="field span2">
              <label>العنوان الرسمي المطبوع أعلى الجدول</label>
              <input id="tcTitle" value="${esc(base.title)}" placeholder="مثال: بيان متابعة أسطول السيارات والمركبات">
            </div>
            <div class="field span2">
              <label>السطر الفرعي تحت العنوان</label>
              <input id="tcSub" value="${esc(base.subtitle || '')}">
            </div>
          </div>

          <div class="hr"></div>
          <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:8px">
            <b>أعمدة الجدول</b>
            <button class="btn btn-sm" type="button" id="tcAddCol">+ إضافة عمود</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:7px" id="tcCols">
            ${base.columns.map((c, i) => `
              <div class="flex" style="gap:7px;align-items:center;background:var(--soft);padding:7px 9px;border-radius:9px">
                <span class="small muted" style="width:22px">${i + 1}.</span>
                <input data-col-lbl="${i}" value="${esc(c.label)}" placeholder="عنوان العمود" style="flex:1.3;border:1px solid #dbe2ee;border-radius:7px;padding:6px 9px">
                <select data-col-type="${i}" style="flex:1;border:1px solid #dbe2ee;border-radius:7px;padding:6px 8px">
                  <option value="text" ${c.type === 'text' ? 'selected' : ''}>نص عادي</option>
                  <option value="expiry" ${c.type === 'expiry' ? 'selected' : ''}>تاريخ صلاحية / انتهاء (مع تنبيه)</option>
                  <option value="date" ${c.type === 'date' ? 'selected' : ''}>تاريخ عادي</option>
                  <option value="number" ${c.type === 'number' ? 'selected' : ''}>رقم</option>
                  <option value="select" ${c.type === 'select' ? 'selected' : ''}>قائمة خيارات</option>
                </select>
                <label class="small flex" style="gap:4px;white-space:nowrap">
                  <input type="checkbox" data-col-ltr="${i}" ${c.ltr ? 'checked' : ''}> LTR
                </label>
                <button class="btn btn-sm btn-red" type="button" data-col-del="${i}" ${base.columns.length <= 1 ? 'disabled' : ''}>✕</button>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-f">
          <button class="btn btn-primary" id="tcSave">💾 حفظ الجدول</button>
          ${!isNew ? `<button class="btn btn-red" id="tcDelete" type="button">🗑 حذف الجدول</button>` : ''}
          <div class="spacer"></div>
          <button class="btn" data-close>إلغاء</button>
        </div>
      </div>`;

    $$('[data-close]', bg).forEach(b => b.onclick = () => bg.classList.remove('open'));

    const syncDraft = () => {
      base.name = $('#tcName').value.trim();
      base.icon = $('#tcIcon').value.trim() || '📊';
      base.headerMode = $('#tcMode').value;
      base.title = $('#tcTitle').value.trim() || base.name;
      base.subtitle = $('#tcSub').value.trim();
      base.columns.forEach((c, i) => {
        const lbl = $(`[data-col-lbl="${i}"]`, bg);
        const tp = $(`[data-col-type="${i}"]`, bg);
        const ltr = $(`[data-col-ltr="${i}"]`, bg);
        if (lbl) c.label = lbl.value.trim() || `عمود ${i + 1}`;
        if (tp) {
          c.type = tp.value;
          if (c.type === 'select' && (!c.options || !c.options.length)) {
            c.options = ['ساري', 'قيد الإجراء', 'مكتمل'];
          }
        }
        if (ltr) c.ltr = ltr.checked || c.type === 'expiry' || c.type === 'date';
      });
    };

    $('#tcAddCol', bg).onclick = () => {
      syncDraft();
      base.columns.push({ k: 'c_' + uid(), label: 'عمود جديد', type: 'text', ltr: false });
      paint();
    };

    $$('[data-col-del]', bg).forEach(b => b.onclick = () => {
      syncDraft();
      const idx = Number(b.dataset.colDel);
      if (base.columns.length > 1) {
        base.columns.splice(idx, 1);
        paint();
      }
    });

    const delBtn = $('#tcDelete', bg);
    if (delBtn) delBtn.onclick = async () => {
      if (!confirm(`سيتم حذف جدول «${base.name}» بجميع سجلاته. هل أنت متأكد؟`)) return;
      DB.trackers = DB.trackers.filter(x => x.id !== base.id);
      await persistDelete('tracker', base.id);
      trackerUI.activeId = DB.trackers[0]?.id || '';
      bg.classList.remove('open');
      render('trackers');
      toast('تم حذف الجدول');
    };

    $('#tcSave', bg).onclick = async () => {
      syncDraft();
      if (!base.name) {
        toast('اسم الجدول مطلوب', 'err');
        return;
      }
      base.updatedAt = Date.now();
      if (isNew) {
        DB.trackers.push(base);
      } else {
        const idx = DB.trackers.findIndex(x => x.id === base.id);
        if (idx >= 0) DB.trackers[idx] = base;
      }
      trackerUI.activeId = base.id;
      await persistDoc('tracker', base);
      bg.classList.remove('open');
      render('trackers');
      toast(isNew ? 'تم إنشاء جدول المتابعة الجديد' : 'تم حفظ إعدادات الجدول');
    };
  }

  bg.classList.add('open');
  paint();
}

/* ---------- طباعة جدول المتابعة بترويسة الشركة (عمودي / أفقي) ---------- */
function setDynamicPrintOrientation(orientation) {
  let st = document.getElementById('dynPrintPage');
  if (!st) {
    st = document.createElement('style');
    st.id = 'dynPrintPage';
    document.head.appendChild(st);
  }
  if (orientation === 'landscape') {
    st.textContent = `@media print { @page { size: A4 landscape; margin: 7mm; } }`;
  } else if (orientation === 'portrait-margin') {
    st.textContent = `@media print { @page { size: A4 portrait; margin: 7mm; } }`;
  } else {
    st.textContent = '';
  }
}

window.addEventListener('afterprint', () => {
  const st = document.getElementById('dynPrintPage');
  if (st) st.textContent = '';
});

function printTrackerSheet(trk, orientation = 'portrait') {
  const rows = filteredTrackerRows(trk);
  setDynamicPrintOrientation(orientation === 'landscape' ? 'landscape' : 'portrait-margin');

  const html = `
    <div class="report-print">
      ${renderDualHeaderHTML({
        title: trk.title || trk.name,
        subtitle: trk.subtitle || '',
        mode: trk.headerMode || 'ais',
        metaLine: `تاريخ الإصدار: ${fdate(todayISO(), DB.settings.dateStyle)}  •  إجمالي السجلات: ${rows.length}`,
      })}
      <table class="ex-tbl">
        <thead>
          <tr>
            <th style="width:38px">ر</th>
            ${(trk.columns || []).map(c => `<th>${esc(c.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr>
              <td class="col-seq">${i + 1}</td>
              ${(trk.columns || []).map(c => renderTrackerCellHTML(c, r[c.k], trackerUI.printColors, trackerUI.printColors)).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="report-sign-row">
        <div class="sbox">إعداد السكرتارية والمتابعة<div class="sline">الاسم والتوقيع</div></div>
        <div class="sbox">مراجعة القسم المختص<div class="sline">الاسم والتوقيع</div></div>
        <div class="sbox">اعتماد الإدارة العامة<div class="sline">التوقيع والختم الرسمي</div></div>
      </div>
    </div>`;

  printHTML(html);
}

/* ---------- تصدير Excel (.xls منسّق بالألوان) و CSV ---------- */
function exportTrackerExcel(trk) {
  const rows = filteredTrackerRows(trk);
  const cols = trk.columns || [];
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" dir="rtl">
  <head><meta charset="utf-8"></head>
  <body dir="rtl" style="font-family:Cairo,Tahoma,Arial,sans-serif">
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;direction:rtl;text-align:center">
      <tr>
        <td colspan="${cols.length + 1}" style="background:#12305f;color:#ffffff;font-weight:bold;font-size:15pt;text-align:center;padding:10px">
          مجموعة شركات الصداقة المثالية — ${esc(trk.title || trk.name)}
        </td>
      </tr>
      <tr style="background:#4f81bd;color:#ffffff;font-weight:bold;font-size:12pt">
        <th>ر</th>
        ${cols.map(c => `<th>${esc(c.label)}</th>`).join('')}
      </tr>
      ${rows.map((r, i) => {
        const bg = i % 2 === 0 ? '#dce6f1' : '#ffffff';
        return `<tr style="background:${bg};font-weight:bold">
          <td>${i + 1}</td>
          ${cols.map(c => `<td style="mso-number-format:'\\@'">${esc(r[c.k] || '')}</td>`).join('')}
        </tr>`;
      }).join('')}
    </table>
  </body></html>`;
  download(new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `${trk.name}_${todayISO()}.xls`);
  toast('تم تصدير ملف Excel بنجاح');
}

function exportTrackerCSV(trk) {
  const rows = filteredTrackerRows(trk);
  const cols = trk.columns || [];
  const head = ['ر', ...cols.map(c => c.label)];
  const lines = [head.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')];
  rows.forEach((r, i) => {
    const vals = [i + 1, ...cols.map(c => r[c.k] || '')];
    lines.push(vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  });
  download(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${trk.name}_${todayISO()}.csv`);
  toast('تم تصدير ملف CSV بنجاح');
}

/* ============================================================
   2) شاشة الوثائق والملفات المشتركة للمجموعة (route: group)
   ============================================================ */
function catMeta(id) {
  return GROUP_DOC_CATS.find(c => c.id === id) || { id, name: 'عام', icon: '📄' };
}

function filteredGroupDocs() {
  ensureGroupDefaultsOn(DB);
  const q = groupDocUI.q.trim().toLowerCase();
  return (DB.groupDocs || []).filter(d => {
    if (d.supplierDelivery) return false;
    if (groupDocUI.cat !== 'all' && d.category !== groupDocUI.cat) return false;
    if (groupDocUI.scope !== 'all') {
      const cid = d.companyId || 'all';
      // وثائق الشركة الخاصة + الوثائق المشتركة
      if (cid !== 'all' && cid !== groupDocUI.scope) return false;
    }
    if (!q) return true;
    return [d.title, d.docNo, d.authority, d.notes].some(x => String(x || '').toLowerCase().includes(q));
  });
}

function companyLabel(id) {
  if (id === 'all') return { label: 'مشترك لجميع الشركات', badge: 'blue' };
  const c = (DB.companies || []).find(x => x.id === id);
  return c ? { label: c.short, badge: c.id === 'aisbm' ? 'gold' : 'green' } : { label: id, badge: 'grey' };
}

function viewGroupDocs() {
  ensureGroupDefaultsOn(DB);
  const all = (DB.groupDocs || []).filter(d => !d.supplierDelivery);
  const list = filteredGroupDocs();
  const expiringCount = all.filter(d => {
    const st = expiryStatus(d.expiryDate).state;
    return st === 'expired' || st === 'soon';
  }).length;
  const withFiles = all.filter(d => d.fileData || d.externalUrl).length;
  const groupLetters = (DB.letters || []).filter(l => {
    const t = TPL_BY_ID[l.tplId];
    return t && t.cat === 'group';
  });
  const activeCo = activeCompany();

  return `
  <!-- بانر هوية الشركة بشعارها وترويستها -->
  <div class="exemplar-sheet mb14">
    ${renderCompanyHeaderHTML(activeCo, {
      title: 'وثائق الشركات — أرشيف كل شركة',
      subtitle: 'حفظ وثائق كل شركة على حدة: السجلات، العقود، التعميمات واللوائح — تُطبع بحسب شعار الشركة وترويستها',
      metaLine: 'الشركة النشطة: ' + activeCo.short + ' — ' + activeCo.code,
    })}
    <div style="padding:13px 18px;background:#f8fafd;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:9px;align-items:center">
      <button class="btn btn-primary" data-gdoc-add>+ إضافة وثيقة / ملف للشركة</button>
      <button class="btn" data-new="group_circular">📢 إصدار تعميم / قرار مشترك</button>
      <button class="btn" data-new="handover_vehicle">🚗 محضر تسليم مركبة</button>
      <button class="btn" data-new="group_auth">🪪 تفويض رسمي باسم المجموعة</button>
      <div class="spacer"></div>
      <button class="btn btn-gold" data-go="trackers">📊 فتح جداول المتابعة اليومية ←</button>
    </div>
  </div>

  <!-- إحصائيات سريعة -->
  <div class="stats" style="margin-bottom:14px">
    <div class="stat"><div class="ico">🗂️</div><div><div class="v">${all.length}</div><div class="l">ملفات ووثائق الشركات</div></div></div>
    <div class="stat gold"><div class="ico">⏰</div><div><div class="v">${expiringCount}</div><div class="l">وثائق قريبة التجديد أو منتهية</div></div></div>
    <div class="stat green"><div class="ico">📎</div><div><div class="v">${withFiles}</div><div class="l">مرفقات مصوّرة / روابط محفوظة</div></div></div>
    <div class="stat red"><div class="ico">📢</div><div><div class="v">${groupLetters.length}</div><div class="l">تعميمات ومحاضر صادرة</div></div></div>
  </div>

  <!-- شريط البحث والتصنيف -->
  <div class="card" style="margin-bottom:16px;padding:13px 16px">
    <div class="toolbar" style="margin-bottom:10px">
      <div class="search">
        <span class="mg">🔍</span>
        <input id="gdocSearch" placeholder="بحث بعنوان الوثيقة، رقم القيد، الجهة المصدرة، الملاحظات…" value="${esc(groupDocUI.q)}">
      </div>
      <select id="gdocScope" style="border:1px solid #dbe2ee;border-radius:10px;padding:8px 11px;font-size:13.5px;background:#fff">
        <option value="all" ${groupDocUI.scope === 'all' ? 'selected' : ''}>كل الشركات</option>
        <option value="ais" ${groupDocUI.scope === 'ais' ? 'selected' : ''}>AIS — الأغذية والمشروبات</option>
        <option value="aisbm" ${groupDocUI.scope === 'aisbm' ? 'selected' : ''}>AIS-BM — مواد البناء</option>
      </select>
    </div>
    <div class="filter-pills">
      <button class="fpill ${groupDocUI.cat === 'all' ? 'active' : ''}" data-gdoc-cat="all">الكل (${all.length})</button>
      ${GROUP_DOC_CATS.map(c => {
        const cnt = all.filter(d => d.category === c.id).length;
        return `<button class="fpill ${groupDocUI.cat === c.id ? 'active' : ''}" data-gdoc-cat="${c.id}">${c.icon} ${esc(c.name)} (${cnt})</button>`;
      }).join('')}
    </div>
  </div>

  <!-- شبكة بطاقات وثائق الشركات -->
  ${list.length ? `
  <div class="gdoc-grid">
    ${list.map(d => {
      const cat = catMeta(d.category);
      const ex = expiryStatus(d.expiryDate);
      const cardCls = ex.state === 'expired' ? 'expired' : (ex.state === 'soon' ? 'soon' : '');
      const cl = companyLabel(d.companyId || 'all');
      return `
      <div class="gdoc-card ${cardCls}">
        <div class="gdoc-top">
          <div class="gdoc-ic">${cat.icon}</div>
          <div style="flex:1;min-width:0">
            <div class="gdoc-title">${esc(d.title)}</div>
            <div class="gdoc-sub">${esc(cat.name)}${d.docNo ? ` • رقم: <b>${esc(d.docNo)}</b>` : ''}</div>
          </div>
          ${ex.state !== 'none' ? `<span class="badge ${ex.state === 'expired' ? 'red' : (ex.state === 'soon' ? 'gold' : 'green')}">${esc(ex.label)}</span>` : ''}
        </div>

        <div class="gdoc-scopes">
          <span class="badge ${cl.badge}">🏢 ${esc(cl.label)}</span>
        </div>

        <div class="gdoc-meta">
          <div><span class="muted">الجهة المصدرة:</span> <b>${esc(d.authority || '—')}</b></div>
          <div><span class="muted">تاريخ الإصدار:</span> <b dir="ltr">${esc(d.issueDate || '—')}</b></div>
          <div><span class="muted">تاريخ الانتهاء:</span> <b dir="ltr">${esc(d.expiryDate || 'غير محدد')}</b></div>
          <div><span class="muted">المرفقات:</span> <b>${d.fileData ? '📎 ملف مرفق' : (d.externalUrl ? '🔗 رابط خارجي' : 'بطاقة بيانات')}</b></div>
        </div>

        ${d.notes ? `<div class="gdoc-notes">${esc(d.notes)}</div>` : ''}

        <div class="gdoc-foot">
          ${d.fileData ? `<button class="btn btn-sm btn-primary" data-gdoc-file="${esc(d.id)}">👁 عرض / تنزيل المرفق</button>` : ''}
          ${d.externalUrl ? `<a class="btn btn-sm" href="${esc(d.externalUrl)}" target="_blank" rel="noopener">🔗 فتح الرابط</a>` : ''}
          <button class="btn btn-sm" data-gdoc-print="${esc(d.id)}">🖨 طباعة بشعار الشركة وترويستها</button>
          <div class="spacer"></div>
          <button class="btn btn-sm" data-gdoc-edit="${esc(d.id)}">✎</button>
          <button class="btn btn-sm btn-red" data-gdoc-del="${esc(d.id)}">🗑</button>
        </div>
      </div>`;
    }).join('')}
  </div>` : `
  <div class="card empty">
    <span class="big">🗂️</span>
    لا توجد وثائق للشركة مطابقة للبحث — اضغط «+ إضافة وثيقة / ملف للشركة» لإضافة أول ملف
  </div>`}`;
}

function bindGroupDocs() {
  const addBtn = $('[data-gdoc-add]');
  if (addBtn) addBtn.onclick = () => groupDocModal(null);

  $$('[data-gdoc-cat]').forEach(b => b.onclick = () => {
    groupDocUI.cat = b.dataset.gdocCat;
    render('group');
  });

  const sc = $('#gdocScope');
  if (sc) sc.onchange = () => { groupDocUI.scope = sc.value; render('group'); };

  const qEl = $('#gdocSearch');
  if (qEl) {
    qEl.oninput = () => {
      groupDocUI.q = qEl.value;
      const pos = qEl.selectionStart;
      render('group');
      const nq = $('#gdocSearch');
      if (nq) { nq.focus(); nq.setSelectionRange(pos, pos); }
    };
  }

  $$('[data-gdoc-edit]').forEach(b => b.onclick = () => {
    const doc = (DB.groupDocs || []).find(x => x.id === b.dataset.gdocEdit);
    if (doc) groupDocModal(doc);
  });

  $$('[data-gdoc-del]').forEach(b => b.onclick = async () => {
    if (!confirm('حذف هذه الوثيقة المشتركة من أرشيف المجموعة؟')) return;
    DB.groupDocs = (DB.groupDocs || []).filter(x => x.id !== b.dataset.gdocDel);
    await persistDelete('group_doc', b.dataset.gdocDel);
    render('group');
    toast('تم حذف الوثيقة');
  });

  $$('[data-gdoc-file]').forEach(b => b.onclick = () => {
    const doc = (DB.groupDocs || []).find(x => x.id === b.dataset.gdocFile);
    if (doc) previewGroupAttachment(doc);
  });

  $$('[data-gdoc-print]').forEach(b => b.onclick = () => {
    const doc = (DB.groupDocs || []).find(x => x.id === b.dataset.gdocPrint);
    if (doc) printGroupDocSheet(doc);
  });
}

/* ---------- نافذة إضافة / تعديل وثيقة للشركة ---------- */
function groupDocModal(existing) {
  const d = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: '',
    title: '',
    category: 'legal',
    docNo: '',
    companyId: (DB.settings && DB.settings.activeCompany) || 'ais',
    authority: '',
    issueDate: todayISO(),
    expiryDate: '',
    notes: '',
    externalUrl: '',
    fileName: '',
    fileType: '',
    fileData: '',
  };

  const bg = $('#modalBg');
  bg.innerHTML = `
    <div class="modal" style="max-width:680px">
      <div class="modal-h">
        <h3>${existing ? '✎ تعديل وثيقة الشركة' : '➕ إضافة وثيقة / ملف للشركة'}</h3>
        <div class="spacer"></div>
        <button class="btn btn-sm" data-close>✕</button>
      </div>
      <div class="modal-b">
        <form id="gdocForm" class="grid2">
          <div class="field span2">
            <label>عنوان الوثيقة / الملف <span class="req">*</span></label>
            <input name="title" value="${esc(d.title)}" required placeholder="مثال: مستخرج السجل التجاري / بوليصة التأمين الموحدة / عقد إيجار المخازن">
          </div>
          <div class="field">
            <label>التصنيف</label>
            <select name="category">
              ${GROUP_DOC_CATS.map(c => `<option value="${c.id}" ${c.id === d.category ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>رقم الوثيقة / القيد / المرجع</label>
            <input name="docNo" value="${esc(d.docNo || '')}" dir="ltr" placeholder="CORP-2026-01">
          </div>
          <div class="field span2">
            <label>الشركة التابعة لهذه الوثيقة</label>
            <select name="companyId" style="width:100%">
              <option value="all" ${d.companyId === 'all' ? 'selected' : ''}>مشترك لجميع الشركات</option>
              ${(DB.companies || []).map(c => `<option value="${c.id}" ${d.companyId === c.id ? 'selected' : ''}>${esc(c.short)} — ${esc(c.code)}</option>`).join('')}
            </select>
            <div class="small muted" style="margin-top:4px">تُطبع هذه الوثيقة بحسب شعار الشركة وترويستها عند الطباعة.</div>
          </div>
          <div class="field span2">
            <label>الجهة المصدرة / الطرف المتعاقد</label>
            <input name="authority" value="${esc(d.authority || '')}" placeholder="مثال: مكتب السجل التجاري طرابلس / مصرف الجمهورية / مجلس الإدارة">
          </div>
          <div class="field">
            <label>تاريخ الإصدار / البداية</label>
            <input type="date" name="issueDate" value="${esc(d.issueDate || '')}">
          </div>
          <div class="field">
            <label>تاريخ الانتهاء / التجديد (للتنبيه الآلي)</label>
            <input type="date" name="expiryDate" value="${esc(d.expiryDate || '')}">
          </div>
          <div class="field span2">
            <label>ملخص البنود / ملاحظات المتابعة</label>
            <textarea name="notes" rows="4" placeholder="تفاصيل الوثيقة أو شروط التجديد أو أماكن حفظ الأصل الورقي…">${esc(d.notes || '')}</textarea>
          </div>
          <div class="field span2">
            <label>إرفاق نسخة مصوّرة (PDF أو صورة حتى 5 ميغابايت — اختياري)</label>
            <div class="flex flex-wrap" style="gap:8px;align-items:center">
              <label class="btn btn-sm" style="margin:0;cursor:pointer">
                📎 اختيار ملف (PDF / صورة)
                <input type="file" id="gdocFileIn" accept="application/pdf,image/png,image/jpeg,image/webp" style="display:none">
              </label>
              <span class="small muted" id="gdocFileLbl">${d.fileName ? `الملف الحالي: ${esc(d.fileName)}` : 'لم يُرفق ملف بعد'}</span>
              ${d.fileData ? `<button class="btn btn-sm btn-red" type="button" id="gdocFileClear">حذف المرفق</button>` : ''}
            </div>
          </div>
          <div class="field span2">
            <label>أو رابط خارجي (Google Drive / أرشيف سحابي — اختياري)</label>
            <input name="externalUrl" value="${esc(d.externalUrl || '')}" dir="ltr" placeholder="https://drive.google.com/...">
          </div>
        </form>
      </div>
      <div class="modal-f">
        <button class="btn btn-primary" data-save>💾 حفظ في أرشيف الشركة</button>
        <button class="btn" data-close>إلغاء</button>
      </div>
    </div>`;

  bg.classList.add('open');
  $$('[data-close]', bg).forEach(b => b.onclick = () => bg.classList.remove('open'));

  const fileIn = $('#gdocFileIn', bg);
  const fileLbl = $('#gdocFileLbl', bg);
  if (fileIn) {
    fileIn.onchange = async () => {
      const f = fileIn.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) {
        toast('حجم الملف يتجاوز 5 ميغابايت — استخدم رابط Google Drive للملفات الكبيرة', 'err');
        fileIn.value = '';
        return;
      }
      if (/^image\//i.test(f.type)) {
        d.fileData = await readImageFile(f, { maxW: 1800 });
        d.fileType = 'image/jpeg';
      } else {
        d.fileData = await fileToDataURL(f);
        d.fileType = f.type || 'application/pdf';
      }
      d.fileName = f.name;
      fileLbl.textContent = `تم إرفاق: ${f.name} (${(f.size / 1024).toFixed(0)} ك.ب)`;
    };
  }

  const clrBtn = $('#gdocFileClear', bg);
  if (clrBtn) {
    clrBtn.onclick = () => {
      d.fileData = '';
      d.fileName = '';
      d.fileType = '';
      fileLbl.textContent = 'تمت إزالة المرفق';
      clrBtn.style.display = 'none';
    };
  }

  $('[data-save]', bg).onclick = async () => {
    const fd = Object.fromEntries(new FormData($('#gdocForm')).entries());
    if (!String(fd.title || '').trim()) {
      toast('عنوان الوثيقة مطلوب', 'err');
      return;
    }
    const companyId = (fd.companyId || 'all').trim();
    const rec = {
      id: existing ? existing.id : ('gd_' + uid()),
      title: fd.title.trim(),
      category: fd.category,
      docNo: (fd.docNo || '').trim(),
      companyId: ['all','ais','aisbm'].includes(companyId) ? companyId : 'all',
      authority: (fd.authority || '').trim(),
      issueDate: fd.issueDate || '',
      expiryDate: fd.expiryDate || '',
      notes: (fd.notes || '').trim(),
      externalUrl: (fd.externalUrl || '').trim(),
      fileName: d.fileName || '',
      fileType: d.fileType || '',
      fileData: d.fileData || '',
      createdAt: existing ? (existing.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now(),
    };
    if (existing) {
      const idx = DB.groupDocs.findIndex(x => x.id === existing.id);
      if (idx >= 0) DB.groupDocs[idx] = rec;
    } else {
      DB.groupDocs.unshift(rec);
    }
    await persistDoc('group_doc', rec);
    bg.classList.remove('open');
    render('group');
    toast(existing ? 'تم تحديث وثيقة الشركة' : 'تم حفظ الوثيقة في أرشيف الشركة');
  };
}

function previewGroupAttachment(doc) {
  if (!doc.fileData) return;
  const bg = $('#modalBg');
  const isImg = /^data:image\//i.test(doc.fileData);
  bg.innerHTML = `
    <div class="modal" style="max-width:860px">
      <div class="modal-h">
        <h3>📎 ${esc(doc.title)}</h3>
        <div class="spacer"></div>
        <a class="btn btn-sm btn-primary" href="${doc.fileData}" download="${esc(doc.fileName || 'document')}">⬇ تنزيل الملف</a>
        <button class="btn btn-sm" data-close>✕</button>
      </div>
      <div class="modal-b" style="text-align:center;background:#f1f5f9">
        ${isImg
          ? `<img src="${doc.fileData}" alt="" style="max-width:100%;max-height:72vh;border-radius:8px;box-shadow:var(--shadow)">`
          : `<iframe src="${doc.fileData}" style="width:100%;height:72vh;border:0;border-radius:8px;background:#fff"></iframe>`}
      </div>
    </div>`;
  bg.classList.add('open');
  $$('[data-close]', bg).forEach(b => b.onclick = () => bg.classList.remove('open'));
}

function printGroupDocSheet(doc) {
  setDynamicPrintOrientation('portrait-margin');
  const cat = catMeta(doc.category);
  const co = (doc.companyId && doc.companyId !== 'all')
    ? (DB.companies || []).find(c => c.id === doc.companyId)
    : activeCompany();
  const isImg = doc.fileData && /^data:image\//i.test(doc.fileData);

  const html = `
    <div class="report-print">
      ${renderCompanyHeaderHTML(co, {
        title: doc.title,
        subtitle: `${cat.name}${doc.docNo ? '  —  رقم المرجع: ' + doc.docNo : ''}`,
        metaLine: `الشركة: ${co ? co.short + ' — ' + co.code : '—'}`,
      })}
      <table class="ex-tbl" style="margin-bottom:6mm">
        <tbody>
          <tr>
            <td style="width:22%;background:#4f81bd;color:#fff">الجهة المصدرة</td>
            <td style="width:28%;background:#fff">${esc(doc.authority || '—')}</td>
            <td style="width:22%;background:#4f81bd;color:#fff">رقم القيد / الوثيقة</td>
            <td style="width:28%;background:#fff" class="col-ltr">${esc(doc.docNo || '—')}</td>
          </tr>
          <tr>
            <td style="background:#4f81bd;color:#fff">تاريخ الإصدار</td>
            <td style="background:#dce6f1" class="col-ltr">${esc(doc.issueDate || '—')}</td>
            <td style="background:#4f81bd;color:#fff">تاريخ الانتهاء / التجديد</td>
            <td style="background:#dce6f1" class="col-ltr">${esc(doc.expiryDate || 'غير محدد')}</td>
          </tr>
        </tbody>
      </table>
      ${doc.notes ? `
        <div style="border:1px solid #94a3b8;border-radius:8px;padding:12px 16px;line-height:1.9;font-size:11.5pt;margin-bottom:6mm">
          <b>البيان / الملخص والبنود:</b><br>
          <div style="white-space:pre-line;margin-top:4px">${esc(doc.notes)}</div>
        </div>` : ''}
      ${isImg ? `<div style="text-align:center;margin-top:4mm"><img src="${doc.fileData}" style="max-width:100%;max-height:145mm;object-fit:contain;border:1px solid #cbd5e1"></div>` : ''}
      <div class="report-sign-row">
        <div class="sbox">أرشيف الشركة والسكرتارية<div class="sline">الاسم والتوقيع</div></div>
        <div class="sbox">المراجعة القانونية / الإدارية<div class="sline">الاسم والتوقيع</div></div>
        <div class="sbox">اعتماد إدارة الشركة<div class="sline">التوقيع والختم</div></div>
      </div>
    </div>`;
  printHTML(html);
}

/* ---------- شريط التنبيهات الذكية في لوحة التحكم ---------- */
function renderDashGroupAlertsHTML() {
  ensureGroupDefaultsOn(DB);
  const alerts = collectGroupAlerts();
  if (!alerts.length) return '';
  const hasExpired = alerts.some(a => a.state === 'expired');
  const top = alerts.slice(0, 6);
  return `
    <div class="alert-strip ${hasExpired ? 'danger' : ''}">
      <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <b>🔔 تنبيهات الصلاحية والمتابعة اليومية لمجموعة الشركات (${alerts.length})</b>
          <span class="small muted" style="margin-inline-start:8px">السيارات (التأمين • الفحص الفني • البل)، التراخيص، الإقامات ووثائق الشركات</span>
        </div>
        <div class="flex" style="gap:6px">
          <button class="btn btn-sm btn-primary" data-go="trackers">📊 جداول المتابعة</button>
          <button class="btn btn-sm" data-go="group">🗂️ وثائق الشركات</button>
        </div>
      </div>
      <div class="alert-items">
        ${top.map(a => `
          <div class="alert-item" data-alert-jump="${esc(a.kind)}:${esc(a.targetId)}">
            <span style="font-size:18px">${esc(a.icon)}</span>
            <div style="min-width:0;flex:1">
              <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.title)}</div>
              <div class="small muted" style="font-size:11.3px">${esc(a.detail)}</div>
            </div>
            <span class="badge ${a.state === 'expired' ? 'red' : 'gold'}">${a.state === 'expired' ? 'منتهي' : `${a.days} يوم`}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
}
