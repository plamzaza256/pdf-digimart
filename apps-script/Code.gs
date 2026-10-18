/**
 * =====================================================================
 * PDF DigiMart — Google Apps Script API
 * ---------------------------------------------------------------------
 * ใช้เป็นตัวกลางระหว่างเว็บไซต์ (React) กับ Google Sheets
 *
 * วิธีใช้:
 *   1. เปิด Google Sheets -> Extensions -> Apps Script
 *   2. ลบโค้ดเดิมออก -> วางโค้ดไฟล์นี้ทั้งไฟล์ -> Save
 *   3. กดฟังก์ชัน setupSheets() จากแถบด้านบน -> Run (ครั้งแรกต้องอนุญาต)
 *   4. Deploy -> New deployment -> Web app
 *        Execute as       : Me
 *        Who has access : Anyone
 *   5. คัดลอก URL ที่ได้ (ลงท้าย /exec) ไปใส่ในไฟล์ .env.local ของเว็บ
 *
 * ⚠️ สำคัญ: ห้ามแก้ค่าด้านล่างให้ผู้อื่นเข้าถึงชีตได้
 * =====================================================================
 */

// ============================ ตั้งค่า ============================
// อีเมลของเจ้าของร้าน (เจ้าของชีต) — เปลี่ยนเป็นอีเมลจริงของคุณ
const ADMIN_EMAIL = 'owner@example.com';
const ADMIN_NAME = 'เจ้าของร้าน';

const SHEET_PRODUCTS = 'Products';
const SHEET_ORDERS = 'Orders';
const SHEET_ORDER_ITEMS = 'OrderItems';
const SHEET_PAYMENTS = 'PaymentSubmissions';
const SHEET_CONFIG = 'Config';
const SHEET_USERS = 'user_id';

const CATEGORY_LIST = ['หนังสือ', 'เอกสาร', 'ข้อสอบ'];
const DOC_LANG_LIST = ['th', 'en', 'other'];
const DOC_TYPE_LIST = ['exam', 'worksheet', 'book', 'study_guide', 'other'];

/** สถานะคำสั่งซื้อที่ใช้ได้ */
const ORDER_STATUS = {
  NEW: 'pending_payment',   // รอโอนเงิน
  PAID: 'paid',             // ผู้ดูแลยืนยันแล้ว
  REJECTED: 'rejected',     // ตรวจไม่ผ่าน
  CANCELLED: 'cancelled'   // ยกเลิก
};

// ===================== สร้างชีตครั้งแรก (รัน 1 ครั้ง) =====================

/**
 * สร้างชีททั้งหมด + ใส่ข้อมูลสินค้าเริ่มต้น
 * รันฟังก์ชันนี้ 1 ครั้งเท่านั้น รันซ้ำได้ (ไม่ลบข้อมูลเดิม)
 */
function setupSheets() {
  _ensureSheet(SHEET_PRODUCTS, [
    'product_id', 'title', 'description', 'long_description', 'category',
    'document_language', 'description_language', 'document_type', 'tags',
    'price_satang', 'old_price_satang', 'pages', 'file_size',
    'rating', 'sales', 'cover_color', 'featured', 'status', 'created_at'
  ]);

  _ensureSheet(SHEET_ORDERS, [
    'order_id', 'created_at', 'customer_name', 'customer_email',
    'identity_provider', 'token_hash', 'status', 'total_satang',
    'payment_ref', 'verified_by', 'verified_at', 'admin_note'
  ]);

  _ensureSheet(SHEET_ORDER_ITEMS, [
    'item_id', 'order_id', 'product_id', 'title_snapshot', 'price_satang', 'qty'
  ]);

  _ensureSheet(SHEET_PAYMENTS, [
    'submission_id', 'order_id', 'submitted_at', 'amount_claimed_satang',
    'payer_name', 'payer_note', 'review_result', 'reviewed_by', 'reviewed_at'
  ]);

  _ensureSheet(SHEET_CONFIG, ['key', 'value']);
  _ensureSheet(SHEET_USERS, [
    'User_id', 'email', 'password', 'name', 'Creation date', 'last_login'
  ]);
  _seedConfig();
  _seedProducts();

  return 'ตั้งค่าเรียบร้อย! เปิดชีต Products ดูว่ามีสินค้าแล้ว';
}

function _ensureSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    // ทำให้ชื่อคอลัมน์หนา/มีสี เพื่อความสวยงาม
    sh.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#e2e8f0');
  }
  return sh;
}

/** ใส่ค่าตั้งค่อประจำร้าน (แก้ได้ภายหลังที่ชีต Config ได้เลย) */
function _seedConfig() {
  const sh = SpreadsheetApp.getActiveSheet();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = ss.getSheetByName(SHEET_CONFIG);
  if (cfg.getLastRow() > 1) return; // มีข้อมูลแล้วไม่ต้องเขียนซ้ำ

  cfg.getRange(2, 1, 1, 2).setValues([[
    'store_name', 'PDF ให้แม่มึงทำ'
  ]]);
  cfg.getRange(3, 1, 1, 2).setValues([[
    'promptpay_phone', ''
  ]]);
  cfg.getRange(4, 1, 1, 2).setValues([[
    'promptpay_name', ''
  ]]);
  cfg.getRange(5, 1, 1, 2).setValues([[
    'contact_line', ''
  ]]);
  cfg.getRange(6, 1, 1, 2).setValues([[
    'contact_email', ''
  ]]);
  cfg.getRange(7, 1, 1, 2).setValues([[
    'banking_open', 'no'
  ]]);
}

/** ใส่สินค้าตัวอย่าง 8 รายการ (จาก mock เดิม) — ราคาเก็บเป็น "สตางค์" */
function _seedProducts() {
  const cfg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUCTS);
  if (cfg.getLastRow() > 1) return; // มีสินค้าแล้ว ไม่ต้องเขียนซ้ำ

  const rows = [
    ['pdf-001', 'คู่มือสอบ ก.พ. ภาค ก ฉบับสรุปจบในเล่มเดียว', 'สรุปคณิต ไทย อังกฤษ + แนวข้อสอบพร้อมเฉลยละเอียด 500 ข้อ', 'สรุปเนื้อหาสอบ ก.พ. ภาค ก ครบทุกวิชา พร้อมแนวข้อสอบเสมือนจริง 5 ชุด เฉลยละเอียดทุกข้อ', 'ข้อสอบ', 'th', 'th', 'exam', 'ขายดี,แนะนำ', 19900, 29900, 342, 'PDF • 18 MB', 0, 0, '#1d4ed8', true, 'published', '2026-08-01'],
    ['pdf-002', 'หนังสือ E-Book: เริ่มขายของออนไลน์จากศูนย์', 'พิมพ์เขียว 30 วันแรก จากเปิดร้านถึงออเดอร์แรก', 'คู่มือทำร้านออนไลน์แบบงบ 0 บาท ตั้งแต่เลือกสินค้าถึงปิดการขายทางแชต', 'หนังสือ', 'th', 'th', 'book', 'แนะนำ,ebook', 14900, 24900, 210, 'PDF • 12 MB', 0, 0, '#0d9488', true, 'published', '2026-07-15'],
    ['pdf-003', 'ข้อสอบ TOEIC พร้อมเฉลย 5 ชุด + คำศัพท์ออกบ่อย 1,000 คำ', 'ฝึกจับเวลาเสมือนจริง อัปเดตแนวข้อสอบล่าสุด', 'แนวข้อสอบ TOEIC ครบ 2 พาร์ต พร้อมเฉลยละเอียดและคำศัพท์ออกสอบบ่อย 1,000 คำ', 'ข้อสอบ', 'th', 'th', 'exam', 'ขายดี,toeic,english', 12900, 19900, 486, 'PDF • 25 MB', 0, 0, '#7c3aed', true, 'published', '2026-06-20'],
    ['pdf-004', 'เอกสารสรุปภาษีบุคคลธรรมดา + Excel คำนวณภาษี', 'คู่มือยื่นภาษีด้วยตัวเอง เข้าใจใน 2 ชั่วโมง', 'สรุปวิธียื่นภาษี ภ.ง.ด. 90/91 ค่าลดหย่อนล่าสุด พร้อมตัวอย่างการกรอกทีละขั้น', 'เอกสาร', 'th', 'th', 'study_guide', 'ภาษี,tax', 9900, '', 96, 'PDF • 6 MB', 0, 0, '#b45309', false, 'published', '2026-09-02'],
    ['pdf-005', 'หนังสือ: Notion สำหรับนักเรียนและคนทำงาน', 'จัดระเบียบชีวิต เรียน และงานในที่เดียว', 'สอนใช้ Notion ตั้งแต่ศูนย์ถึงทำระบบ Second Brain พร้อมเทมเพลต 20 แบบ', 'หนังสือ', 'th', 'th', 'book', 'มาใหม่,notion', 17900, '', 188, 'PDF • 15 MB', 0, 0, '#be123c', true, 'published', '2026-09-20'],
    ['pdf-006', 'ข้อสอบเข้า ม.1 ห้องพิเศษ Gifted + สาธิต (คณิต-วิทย์-อังกฤษ)', 'รวม 10 โรงเรียนดัง เฉลยวิธีคิดละเอียด', 'รวมแนวข้อสอบเข้า ม.1 ห้องพิเศษ Gifted และโรงเรียนสาธิต พร้อมเฉลยวิธีคิดละเอียด', 'ข้อสอบ', 'th', 'th', 'exam', 'ขายดี,entrance', 15900, 22900, 398, 'PDF • 22 MB', 0, 0, '#15803d', true, 'published', '2026-05-11'],
    ['pdf-007', 'เอกสาร: สัญญาจ้างฟรีแลนซ์ + ใบเสนอราคา (แก้ไขได้)', 'เทมเพลตสัญญาภาษาไทย เข้าใจง่าย ป้องกันโดนเบี้ยว', 'ชุดเอกสารสำหรับฟรีแลนซ์: สัญญาจ้างทำของ ใบเสนอราคา ใบแจ้งหนี้ หนังสือทวงถาม', 'เอกสาร', 'th', 'th', 'other', 'มาใหม่,freelance', 7900, '', 54, 'PDF • 4 MB', 0, 0, '#0e7490', false, 'published', '2026-09-28'],
    ['pdf-008', 'หนังสือ: เขียนนิยายเล่มแรกให้จบใน 60 วัน', 'เวิร์กช็อปเขียนนิยายแบบมีแบบฝึกหัดทุกบท', 'คู่มือเขียนนิยายตั้งแต่สร้างพล็อตถึงเกลาต้นฉบับ พร้อมตารางติดตาม 60 วัน', 'หนังสือ', 'th', 'th', 'book', 'นิยาย,writing', 18900, '', 264, 'PDF • 14 MB', 0, 0, '#6d28d9', false, 'published', '2026-10-01'],
  ];
  cfg.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

// ============================ จุดเข้า API ============================

/** รับคำขอแบบ GET (อ่านข้อมูล) */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'products.list';
    const p = (e && e.parameter) || {};

    if (action === 'products.list') return _json(_listProducts());
    if (action === 'product.detail') return _json(_productDetail(p.id));
    if (action === 'config') return _json(_getConfig());

    if (action === 'order.list') {
      if (!_isAdmin()) return _json({ ok: false, error: 'ไม่มีสิทธิ์' });
      return _json(_listOrders());
    }

    return _json({ ok: false, error: 'ไม่รู้จักคำสั่ง: ' + action });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

/** รับคำขอแบบ POST (เขียนข้อมูล) */
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = body.action || '';

    if (action === 'order.create') {
      if (!_isOpen()) return _json({ ok: false, error: 'ร้านยังไม่เปิดรับคำสั่งซื้อ' });
      return _json(_createOrder(body));
    }

    if (action === 'payment.submit') return _json(_submitPayment(body));

    // --- ระบบสมาชิก: สมัคร / เข้าสู่ระบบ (ทุกคนเรียกได้) ---
    if (action === 'user.signup') return _json(_signup(body));
    if (action === 'user.login') return _json(_login(body));
    if (action === 'user.check') return _json(_checkUser(body.email));

    // --- ส่วนแอดมิน (ต้องเป็นเจ้าของชีตที่ล็อกอิน Google) ---
    if (!_isAdmin()) return _json({ ok: false, error: 'ไม่มีสิทธิ์เข้าถึง' });

    if (action === 'product.upsert') return _json(_upsertProduct(body.product || {}));
    if (action === 'order.verify') return _json(_verifyOrder(body.order_id, true));
    if (action === 'order.reject') return _json(_verifyOrder(body.order_id, false));

    return _json({ ok: false, error: 'ไม่รู้จักคำสั่ง: ' + action });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

// ============================ ระบบสมาชิก ============================

/**
 * ตรวจสอบรหัสผ่าน
 * ⚠️ ตอนนี้เก็บรหัสผ่านตามที่ผู้ใช้ตัดสินใจ (ยังไม่เข้ารหัส)
 *    ถ้าจะเปลี่ยนภายหลัง แก้แค่ฟังก์ชันนี้จุดเดียวทั้งระบบ
 */
function _hashPassword(password) {
  return String(password);
}

/** สร้างเลข User_id รูปแบบ UID_0001 ถึง UID_9999 */
function _nextUserId() {
  const users = _readSheet(SHEET_USERS);
  let max = 0;
  for (let i = 0; i < users.length; i++) {
    const n = Number(String(users[i].User_id || '').replace(/\D/g, ''));
    if (n > max) max = n;
  }
  const next = max + 1;
  if (next > 9999) return ''; // เต็มแล้ว
  return 'UID_' + ('0000' + next).slice(-4);
}

/** สมัครสมาชิกใหม่ -> บันทึกลงชีต user_id */
function _signup(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();

  if (!name) return { ok: false, error: 'กรุณากรอกชื่อ' };
  if (email.indexOf('@') === -1 || email.length < 5) {
    return { ok: false, error: 'อีเมลไม่ถูกต้อง' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // 🛡 กันสมัครซ้ำ: เช็คอีเมลต้องไม่มีอยู่แล้ว
    const exists = _readSheet(SHEET_USERS).some(function (u) {
      return String(u.email || '').toLowerCase() === email;
    });
    if (exists) return { ok: false, error: 'อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ' };

    const userId = _nextUserId();
    if (!userId) return { ok: false, error: 'เต็มจำนวนสมาชิกแล้ว' };

    // วันที่ลงบัญชี (ไม่มีเวลา)
    const today = Utilities.formatDate(
      new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');

    _appendRow(SHEET_USERS, [
      userId, email, _hashPassword(password), name, today, ''
    ]);

    return {
      ok: true,
      message: 'สมัครสมาชิกสำเร็จ',
      user: { user_id: userId, email: email, name: name }
    };
  } finally {
    lock.releaseLock();
  }
}

/** เข้าสู่ระบบ: ต้องตรงทั้งอีเมลและรหัสผ่านในแถวเดียวกัน */
function _login(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) return { ok: false, error: 'กรอกอีเมลและรหัสผ่าน' };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const users = _readSheet(SHEET_USERS);
    const found = users.filter(function (u) {
      return String(u.email || '').toLowerCase() === email;
    })[0];

    if (!found) {
      return { ok: false, error: 'ไม่พบบัญชีนี้ กรุณาสมัครสมาชิก' };
    }
    if (String(found.password || '') !== _hashPassword(password)) {
      return { ok: false, error: 'รหัสผ่านไม่ถูกต้อง' };
    }

    // บันทึกเวลาเข้าใช้ล่าสุด (วันที่เท่านั้น)
    const today = Utilities.formatDate(
      new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
    const headers = _header(SHEET_USERS);
    const data = sh.getDataRange().getValues();
    const cId = headers.indexOf('User_id');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][cId]) === String(found.User_id)) {
        sh.getRange(i + 1, headers.indexOf('last_login') + 1).setValue(today);
        break;
      }
    }

    // 🔒 ไม่ส่งรหัสผ่านกลับไปที่เบราว์เซอร์
    return {
      ok: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user: {
        user_id: found.User_id,
        email: found.email,
        name: found.name,
        created_at: _fmtDate(found['Creation date'])
      }
    };
  } finally {
    lock.releaseLock();
  }
}

/** เช็คว่าอีเมลนี้มีบัญชีไหม (ใช้ตอน Google Sign-In เพื่อดึงข้อมูลเดิม) */
function _checkUser(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  const found = _readSheet(SHEET_USERS).filter(function (u) {
    return String(u.email || '').toLowerCase() === email;
  })[0];
  if (!found) return { ok: true, exists: false, user: null };
  return {
    ok: true, exists: true,
    user: {
      user_id: found.User_id,
      email: found.email,
      name: found.name,
      created_at: _fmtDate(found['Creation date'])
    }
  };
}

// ============================ ตรวจสิทธิ์ (สำคัญมาก) ============================

/**
 * เช็คว่าผู้เรียกเป็นเจ้าของร้านไหม
 * - ต้องล็อกอิน Google แล้วถึงจะได้อีเมล
 * - ถ้าเป็นคนทั่วไป -> getEmail() จะคืนค่าว่าง -> ไม่ผ่าน
 */
function _isAdmin() {
  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) return false;
  const admins = _getConfig('admin_emails') || ADMIN_EMAIL;
  return admins.split(',').map(function (s) { return s.trim().toLowerCase(); })
    .indexOf(email) !== -1;
}

/** ร้านเปิดรับคำสั่งซื้อหรือยัง (ตั้งค่าในชีต Config ได้) */
function _isOpen() {
  return String(_getConfig('banking_open')) === 'yes';
}

// ============================ อ่านข้อมูล ============================

function _listProducts() {
  const rows = _readSheet(SHEET_PRODUCTS);
  if (rows.length === 0) return { ok: true, products: [] };

  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // ⛔ กรองที่ฝั่งเซิร์ฟเวอร์: คนทั่วไปเห็นเฉพาะสินค้าที่ published เท่านั้น
    if (String(r.status || '') !== 'published') continue;
    out.push({
      id: r.product_id,
      title: r.title,
      description: r.description,
      longDescription: r.long_description,
      category: r.category,
      documentLanguage: r.document_language,
      descriptionLanguage: r.description_language,
      documentType: r.document_type,
      tags: String(r.tags || '').split(',').map(function (s) { return s.trim(); })
        .filter(Boolean),
      // ส่งกลับเป็น "บาท" เพื่อให้หน้าเว็บใช้ได้เลย
      price: Math.round(Number(r.price_satang || 0) / 100),
      oldPrice: r.old_price_satang === '' || r.old_price_satang == null
        ? undefined
        : Math.round(Number(r.old_price_satang) / 100),
      pages: Number(r.pages || 0),
      fileSize: r.file_size,
      rating: Number(r.rating || 0),
      sales: Number(r.sales || 0),
      coverColor: r.cover_color || '#1d4ed8',
      featured: String(r.featured) === 'TRUE' || r.featured === true,
      createdAt: _fmtDate(r.created_at)
    });
  }
  return { ok: true, products: out };
}

function _productDetail(id) {
  const all = _listProducts();
  const found = all.products.filter(function (p) { return p.id === id; })[0];
  if (!found) return { ok: false, error: 'ไม่พบสินค้า' };
  return { ok: true, product: found };
}

function _listOrders() {
  const orders = _readSheet(SHEET_ORDERS);
  const items = _readSheet(SHEET_ORDER_ITEMS);
  const out = [];

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    const lines = items.filter(function (x) { return x.order_id === o.order_id; });
    out.push({
      orderId: o.order_id,
      createdAt: o.created_at,
      customerName: o.customer_name,
      customerEmail: o.customer_email,
      status: o.status,
      total: Math.round(Number(o.total_satang || 0) / 100),
      paymentRef: o.payment_ref,
      verifiedBy: o.verified_by,
      verifiedAt: o.verified_at,
      items: lines.map(function (l) {
        return {
          productId: l.product_id,
          title: l.title_snapshot,
          price: Math.round(Number(l.price_satang || 0) / 100),
          qty: Number(l.qty || 0)
        };
      })
    });
  }
  return { ok: true, orders: out };
}

function _getConfig(key) {
  const rows = _readSheet(SHEET_CONFIG);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].key) === String(key)) return rows[i].value;
  }
  return '';
}

function _getConfigAll() {
  const rows = _readSheet(SHEET_CONFIG);
  const out = {};
  for (let i = 0; i < rows.length; i++) out[rows[i].key] = rows[i].value;
  return out;
}

// ============================ เขียนข้อมูล ============================

/**
 * สร้างคำสั่งซื้อ
 * ⚠️ ราคาคิดจากชีตเท่านั้น ไม่เชื่อราคาที่ส่งมาจากเบราว์เซอร์
 */
function _createOrder(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return { ok: false, error: 'ตะกร้าว่างเปล่า' };

    const email = String(body.email || '').trim();
    const name = String(body.name || '').trim() || 'ลูกค้า';
    if (email.indexOf('@') === -1) return { ok: false, error: 'อีเมลไม่ถูกต้อง' };

    const products = _listProducts().products;
    const lines = [];
    let totalSatang = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const p = products.filter(function (x) { return x.id === it.productId; })[0];
      if (!p) return { ok: false, error: 'ไม่พบสินค้า: ' + it.productId };

      const qty = Math.max(1, Math.min(99, Number(it.qty || 1)));
      const priceSatang = Math.round(p.price * 100); // คิดราคาจากชีตเท่านั้น!
      totalSatang += priceSatang * qty;
      lines.push({
        productId: p.id,
        title: p.title,      // snapshot กันชื่อเปลี่ยนทีหลัง
        priceSatang: priceSatang,
        qty: qty
      });
    }

    const orderId = _newId('ORD');
    const token = Utilities.getUuid() + Utilities.getUuid(); // โทเคนยาวมาก
    const now = new Date();

    _appendRow(SHEET_ORDERS, [
      orderId, now, name, email, 'google', _hash(token),
      ORDER_STATUS.NEW, totalSatang, '', '', '', ''
    ]);

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      _appendRow(SHEET_ORDER_ITEMS, [
        Utilities.getUuid(), orderId, l.productId, l.title, l.priceSatang, l.qty
      ]);
    }

    return {
      ok: true,
      order_id: orderId,
      token: token,       // ส่งคืนให้ลูกค้าเก็บไว้ (เก็บแค่แฮชในชีต)
      total: Math.round(totalSatang / 100)
    };
  } finally {
    lock.releaseLock();
  }
}

/** ลูกค้าแจ้งว่าโอนเงินแล้ว */
function _submitPayment(body) {
  const orderId = String(body.order_id || '');
  const ref = String(body.payment_ref || '').trim();
  if (!orderId) return { ok: false, error: 'ไม่พบหมายเลขคำสั่งซื้อ' };
  if (!ref) return { ok: false, error: 'กรุณากรอกเลขอ้างอิงการโอน' };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ORDERS);
    const data = sh.getDataRange().getValues();
    const headers = _header(SHEET_ORDERS);
    const cId = headers.indexOf('order_id');
    const cRef = headers.indexOf('payment_ref');

    let rowIdx = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][cId]) === orderId) { rowIdx = i + 1; break; }
    }
    if (rowIdx === -1) return { ok: false, error: 'ไม่พบคำสั่งซื้อ' };

    sh.getRange(rowIdx, cRef + 1).setValue(ref);

    _appendRow(SHEET_PAYMENTS, [
      Utilities.getUuid(), orderId, new Date(),
      Math.round(Number(data[rowIdx - 1][headers.indexOf('total_satang')] || 0)),
      String(body.payer_name || ''), String(body.payer_note || ''),
      'pending', '', ''
    ]);

    return { ok: true, message: 'ส่งข้อมูลแล้ว รอผู้ดูแลตรวจสอบ' };
  } finally {
    lock.releaseLock();
  }
}

/** เพิ่ม/แก้สินค้า (เฉพาะแอดมิน) */
function _upsertProduct(p) {
  const id = String(p.id || '').trim();
  const title = String(p.title || '').trim();
  if (!id) return { ok: false, error: 'ไม่มีรหัสสินค้า' };
  if (!title) return { ok: false, error: 'ไม่มีชื่อสินค้า' };

  const priceSatang = Math.round(Number(p.price || 0) * 100);
  if (priceSatang < 0) return { ok: false, error: 'ราคาไม่ถูกต้อง' };

  const row = [
    id, title,
    String(p.description || ''), String(p.longDescription || ''),
    CATEGORY_LIST.indexOf(p.category) !== -1 ? p.category : 'เอกสาร',
    DOC_LANG_LIST.indexOf(p.documentLanguage) !== -1 ? p.documentLanguage : 'th',
    DOC_LANG_LIST.indexOf(p.descriptionLanguage) !== -1 ? p.descriptionLanguage : 'th',
    DOC_TYPE_LIST.indexOf(p.documentType) !== -1 ? p.documentType : 'other',
    Array.isArray(p.tags) ? p.tags.join(',') : String(p.tags || ''),
    priceSatang,
    p.oldPrice ? Math.round(Number(p.oldPrice) * 100) : '',
    Math.max(1, Number(p.pages || 1)),
    String(p.fileSize || 'PDF'),
    Number(p.rating || 0), Number(p.sales || 0),
    String(p.coverColor || '#1d4ed8'),
    p.featured === true || p.featured === 'true',
    ['published', 'draft', 'archived'].indexOf(p.status) !== -1 ? p.status : 'draft',
    new Date()
  ];

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUCTS);
    const headers = _header(SHEET_PRODUCTS);
    const data = sh.getDataRange().getValues();
    const cId = headers.indexOf('product_id');

    let found = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][cId]) === id) { found = i + 1; break; }
    }
    if (found > 0) {
      sh.getRange(found, 1, 1, row.length).setValues([row]);
      return { ok: true, message: 'บันทึกการแก้ไขแล้ว', id: id };
    }
    _appendRow(SHEET_PRODUCTS, row);
    return { ok: true, message: 'เพิ่มสินค้าแล้ว', id: id };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ยืนยัน / ปฏิเสธการจ่ายเงิน (เฉพาะแอดมิน)
 * ป้องกันการยืนยันซ้ำ: ถ้ายืนยันไปแล้ว จะไม่ทำอะไรอีก
 */
function _verifyOrder(orderId, approve) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ORDERS);
    const headers = _header(SHEET_ORDERS);
    const data = sh.getDataRange().getValues();
    const cId = headers.indexOf('order_id');
    const cStatus = headers.indexOf('status');

    let rowIdx = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][cId]) === String(orderId)) { rowIdx = i + 1; break; }
    }
    if (rowIdx === -1) return { ok: false, error: 'ไม่พบคำสั่งซื้อ' };

    const current = String(data[rowIdx - 1][cStatus]);
    // 🛡 กันยืนยันซ้ำ/กันทับสถานะเดิม
    if (current !== ORDER_STATUS.NEW) {
      return { ok: false, error: 'คำสั่งซื้อนี้ถูกดำเนินการแล้ว (' + current + ')' };
    }

    const email = Session.getActiveUser().getEmail() || '';
    const target = approve ? ORDER_STATUS.PAID : ORDER_STATUS.REJECTED;
    sh.getRange(rowIdx, cStatus + 1).setValue(target);
    sh.getRange(rowIdx, headers.indexOf('verified_by') + 1).setValue(email);
    sh.getRange(rowIdx, headers.indexOf('verified_at') + 1).setValue(new Date());

    if (approve) _increaseSales(String(orderId));

    return { ok: true, status: target, message: approve ? 'ยืนยันแล้ว' : 'ปฏิเสธแล้ว' };
  } finally {
    lock.releaseLock();
  }
}

/** เพิ่มยอดขายของสินค้าในออเดอร์ที่ยืนยันแล้ว (นับจากของจริง ไม่ใช่ตัวเลขปั้น) */
function _increaseSales(orderId) {
  const items = _readSheet(SHEET_ORDER_ITEMS)
    .filter(function (x) { return String(x.order_id) === String(orderId); });
  if (items.length === 0) return;

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUCTS);
  const ph = _header(SHEET_PRODUCTS);
  const pdata = sh.getDataRange().getValues();
  const cId = ph.indexOf('product_id');
  const cSales = ph.indexOf('sales');

  for (let i = 0; i < items.length; i++) {
    for (let j = 1; j < pdata.length; j++) {
      if (String(pdata[j][cId]) === String(items[i].product_id)) {
        const add = Number(items[i].qty || 0);
        sh.getRange(j + 1, cSales + 1).setValue(Number(pdata[j][cSales] || 0) + add);
      }
    }
  }
}

// ============================ ตัวช่วยเล็ก ๆ ============================

function _newId(prefix) {
  const d = new Date();
  const pad = function (n) { return String(n).padStart(2, '0'); };
  const stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  return prefix + '-' + stamp + '-' +
    Utilities.getUuid().split('-')[0].toUpperCase();
}

/** แฮชโทเคน (เก็บแค่แฮช ไม่เก็บโทเคนจริงไว้ในชีต) */
function _hash(text) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
  return raw.map(function (b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function _header(sheetName) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

function _readSheet(sheetName) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) return [];
  const vals = sh.getDataRange().getValues();
  if (vals.length <= 1) return [];
  const headers = vals[0];
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    if (!vals[i][0]) continue; // แถวว่าง
    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = vals[i][c];
    out.push(obj);
  }
  return out;
}

function _appendRow(sheetName, values) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sh.appendRow(values);
}

function _fmtDate(v) {
  if (v instanceof Date) {
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(v.getDate());
  }
  return String(v || '');
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** ใช้ตอนทดสอบเท่านั้น: ดูว่าตอนนี้ใครเป็นแอดมิน */
function whoAmI() {
  const email = Session.getActiveUser().getEmail();
  Logger.log('อีเมล: ' + email);
  Logger.log('เป็นแอดมิน: ' + _isAdmin());
  return { email: email, isAdmin: _isAdmin() };
}