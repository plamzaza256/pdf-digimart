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
// อีเมลของเจ้าของร้าน (เจ้าของชีต) — แยกได้หลายคนด้วยเครื่องจุลภาค
// ⚠️ ระวังสะกดชื่อ: มีสองบัญชีที่หน้าตาเหมือนกัน ต่างกันตรง "m"
//    16052551mk@gmail.com = บัญชีเก่าในชีต (ไม่ได้ล็อกอินผ่าน Google)
//    16052551k@gmail.com  = บัญชีจริงที่เข้าเว็บด้วย Google
// ใส่ทั้งสองไว้กันพลาด
const ADMIN_EMAILS = ['16052551k@gmail.com', '16052551mk@gmail.com'];
const ADMIN_NAME = 'เจ้าของร้าน';

const SHEET_PRODUCTS = 'Products';
const SHEET_ORDERS = 'Orders';
const SHEET_ORDER_ITEMS = 'OrderItems';
const SHEET_PAYMENTS = 'PaymentSubmissions';
const SHEET_CONFIG = 'Config';
const SHEET_USERS = 'user_id';
const SHEET_LIBRARY = 'Library';
const SHEET_FILES = 'Files';
const SHEET_FAVORITES = 'Favorites';

// 🗂️ หมวดหมู่ — ตรงกับ dropdown ในชีต (แก้ในชีตได้ แต่ถ้าเพิ่มค่าใหม่ต้องแจ้ง)
const CATEGORY_LIST = ['ห้อแล้ว', 'หนังสือ', 'Flashcard', 'อื่นๆ'];

/**
 * 📊 สถานะสินค้า — ตรงกับ dropdown ในชีต
 *    published = แสดงบนเว็บ
 *    WIP / Paused / Discontinued = ไม่แสดงบนเว็บ (ยังอยู่ในชีต ประวัติยังอยู่)
 */
const PRODUCT_STATUS_LIST = ['published', 'WIP', 'Paused', 'Discontinued'];

/**
 * Firebase Web API Key
 *
 * ⚠️ นี่คือ "Web API Key" ของ Firebase ซึ่งเป็นค่าสาธารณะ
 *    มันถูกฝังอยู่ในหน้าเว็บของเราอยู่แล้ว (อยู่ในไฟล์ .env.local
 *    ที่ถูก build เข้าไปใน JS) ใครก็เห็นได้
 *    ดังนั้นการใส่ไว้ในโค้ดนี้จึงไม่ทำให้เสียหายอะไร
 *    สิ่งที่ห้ามเปิดเผยคือ Service Account / Private Key เท่านั้น
 *
 * ใช้สำหรับ: ตรวจ Firebase ID Token ฝั่งเซิร์ฟเวอร์ (Identity Toolkit REST)
 */
const FIREBASE_API_KEY = 'AIzaSyClRefKialWmgE1Cp4wucTk--3L-TIhAzo';
const FIREBASE_APP_ID = '1:932991647595:web:3895a9242a57894da0562e';
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
    'rating', 'sales', 'cover_color', 'status', 'created_at'
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
  // เพิ่มคอลัมน์ที่ภายหลังต้องใช้ ให้แท็บเก่าที่สร้างไว้แล้วอัปเดตอัตโนมัติ
  _ensureColumns(SHEET_USERS, ['token', 'login_method']);
  _ensureColumns(SHEET_ORDERS, ['User_id', 'order_token', 'library_granted']);
  _ensureSheet(SHEET_LIBRARY, [
    'grant_id', 'User_id', 'email', 'product_id', 'file_code',
    'order_id', 'granted_at', 'granted_by', 'active'
  ]);
  _ensureSheet(SHEET_FILES, [
    'product_id', 'file_code', 'file_name', 'drive_url', 'file_size', 'updated_at'
  ]);
  // ⭐ แท็บสินค้าที่ถูกใจ — ผูกกับอีเมลผู้ใช้
  //    ล็อกอินใหม่/เปลี่ยนเครื่อง → ดาวยังอยู่
  _ensureSheet(SHEET_FAVORITES, [
    'fav_id', 'email', 'User_id', 'product_id', 'created_at'
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

/**
 * เติมคอลัมน์ที่ยังไม่มีในแท็บเดิม (ใช้ตอนเพิ่มฟีเจอร์ใหม่ ไม่ต้องลบข้อมูลเก่า)
 */
function _ensureColumns(sheetName, newHeaders) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) return;
  const current = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0]
    .map(function (h) { return String(h).trim(); });

  let addCol = current.length;
  newHeaders.forEach(function (h) {
    if (current.indexOf(String(h).trim()) === -1) {
      addCol += 1;
      sh.getRange(1, addCol).setValue(h);
    }
  });
  if (addCol > current.length) {
    sh.getRange(1, addCol - newHeaders.length + 1, 1, newHeaders.length)
      .setFontWeight('bold').setBackground('#e2e8f0');
  }
}

/**
 * ใส่ค่าตั้งค่อประจำร้าน (แก้ได้ภายหลังที่ชีต Config ได้เลย)
 *
 * ⚠️ ไม่ข้ามถ้าชีตมีข้อมูลแล้ว
 *    เดิม return ทันทีถ้ามีข้อมูล → คีย์ใหม่ (เช่น line_oa_link)
 *    จะไม่มีวันถูกเพิ่ม ปุ่ม LINE จะพาไปไม่ได้เลย
 *    ตอนนี้เช็คทีละคีย์: มีแล้วไม่แตะ ไม่มีก็เพิ่ม
 */
function _seedConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = ss.getSheetByName(SHEET_CONFIG);

  // ค่าเริ่มต้นของแต่ละคีย์ (ค่าที่มีอยู่แล้วในชีตจะไม่ถูกทับ)
  const DEFAULTS = [
    ['store_name', 'PDF ให้แม่มึงทำ'],
    ['promptpay_phone', ''],
    ['promptpay_name', ''],
    ['contact_line', ''],
    ['contact_email', ''],
    ['banking_open', 'no'],
    // 🔗 ลิงก์ LINE OA ของร้าน — ใส่ค่าเริ่มต้นไว้เลย
    //    เจ้าของร้านเปลี่ยนได้ที่หน้าเว็บแอดมิน → ตั้งค่าร้าน
    ['line_oa_link', 'https://lin.ee/wVIuHza']
  ];

  const existing = {};
  const data = cfg.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const k = String(data[i][0] || '').trim();
    if (k) existing[k] = true;
  }

  const missing = DEFAULTS.filter(function (d) { return !existing[d[0]]; });
  if (missing.length > 0) {
    cfg.getRange(cfg.getLastRow() + 1, 1, missing.length, 2).setValues(missing);
  }
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
    if (action === 'public.config') return _json(getPublicConfig());

    if (action === 'order.list') {
      // 🛡 GET ที่ต้องล็อกอิน ต้องใช้ POST แทน (token ไม่ควรอยู่ใน URL)
      return _json({ ok: false, error: 'ใช้ POST action=order.list แทน' });
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

    // --- ระบบสมาชิก: เข้าสู่ระบบผ่าน Firebase (ทุกคนเรียกได้) ---
    if (action === 'user.firebase') return _json(_firebaseLogin(body));
    if (action === 'user.session') return _json(_session(body));

    if (action === 'user.check') return _json(_checkUser(body.email));

    // --- ฝั่งลูกค้า (ต้องล็อกอินด้วยอีเมล + token) ---
    if (action === 'library.list') return _json(_myLibrary(body));
    if (action === 'order.mine') return _json(_myOrders(body));

    // --- ⭐ สินค้าที่ถูกใจ (ผูกกับอีเมลผู้ใช้) ---
    if (action === 'favorite.list') return _json(_myFavorites(body));
    if (action === 'favorite.add') return _json(_toggleFavorite(body, true));
    if (action === 'favorite.remove') return _json(_toggleFavorite(body, false));
    if (action === 'favorite.sync') return _json(_syncFavorites(body));

    // --- 🧪 ตรวจโครงสร้างชีต (เฉพาะแอดมิน) ---
    if (action === 'sheet.inspect') {
      const insp = _requireAdmin(body);
      if (!insp.ok) return _json(insp);
      return _json(_sheetInspector());
    }

    // --- 📋 โครงสร้างชีตแบบสาธารณะ (ไม่ต้องล็อกอิน) ---
    //    คืนแค่ "ชื่อแท็บ + ชื่อคอลัมน์ + dropdown" ไม่มีข้อมูลลูกค้า/ยอดขาย
    //    ใช้เพื่อดูว่าเว็บอ่านชีตถูกช่องไหม โดยไม่ต้องเปิดสิทธิ์ admin
    if (action === 'sheet.structure') {
      return _json(_sheetStructure());
    }

    // --- ส่วนแอดมิน (ต้องเป็น session ของเจ้าของร้านที่ยืนยันแล้ว) ---
    const admin = _requireAdmin(body);
    if (!admin.ok) return _json(admin);

    if (action === 'product.upsert') {
      return _json(_upsertProduct(body.product || {}, admin.email));
    }
    if (action === 'product.delete') {
      return _json(_deleteProduct(body.id));
    }
    if (action === 'product.list.all') {
      return _json(_listProductsAll());
    }
    if (action === 'config.set') {
      return _json(_setConfig(body.key, body.value));
    }
    if (action === 'server.url.set') {
      return _json(_setServerUrl(body.url));
    }
    if (action === 'order.verify') {
      return _json(_verifyOrder(body.order_id, true, admin.email));
    }
    if (action === 'order.reject') {
      return _json(_verifyOrder(body.order_id, false, admin.email));
    }
    if (action === 'library.revoke') {
      return _json(_revokeGrant(body.grant_id));
    }
    if (action === 'order.list') return _json(_listOrders());

    return _json({ ok: false, error: 'ไม่รู้จักคำสั่ง: ' + action });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

// ============================ ระบบสมาชิก ============================

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

/** สร้างรหัสผู้ใช้สุ่ม ยาว 64 ตัว (เดายากมาก) */
function _newToken() {
  return Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '');
}

/** วันที่วันนี้ในรูปแบบ yyyy-MM-dd (ใช้ทั้งระบบให้ตรงกัน) */
function _today() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
}

/** คืนข้อมูลสมาชิกกลับไปให้เบราว์เซอร์ (ไม่เคยส่งรหัสผ่านออกไป) */
/**
 * ข้อมูลสมาชิกที่ส่งให้หน้าเว็บ
 *
 * is_admin ถูกคำนวณที่นี่ฝั่งเซิร์ฟเวอร์ ไม่ใช่ให้เบราว์เซอร์ตัดสินใจเอง
 * (ถ้าให้เว็บเปรียบเทียบอีเมลเอง ใครก็แก้โค้ดหน้าเว็บให้ตัวเองเป็นแอดมินได้)
 *
 * ⚠️ ค่านี้ใช้แค่ซ่อน/แสดงปุ่มบนหน้าเว็บเท่านั้น
 *    การตรวจสิทธิ์จริงเกิดที่ _requireAdmin ทุกครั้งที่เขียนข้อมูล
 */
function _publicUser(row) {
  return {
    user_id: row.User_id,
    email: row.email,
    name: row.name,
    created_at: _fmtDate(row['Creation date']),
    login_method: String(row.login_method || '') === 'google' ? 'google' : 'password',
    is_admin: _isAdminEmail(row.email)
  };
}

/**
 * หาแถวของสมาชิกจากอีเมล พร้อมตำแหน่งที่จะเขียนกลับ
 * คืน null ถ้าไม่พบ
 */
function _findUserRow(email) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  const headers = _header(SHEET_USERS);
  const data = sh.getDataRange().getValues();
  const cEmail = headers.indexOf('email');
  const clean = String(email || '').trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][cEmail] || '').toLowerCase() === clean) {
      const obj = {};
      for (let c = 0; c < headers.length; c++) obj[headers[c]] = data[i][c];
      return { row: obj, rowIdx: i + 1, headers: headers, sheet: sh };
    }
  }
  return null;
}

/** เขียนค่าลงช่องหนึ่งช่องของแถวที่ระบุ (เลือกคอลัมน์จากชื่อ ปลอดภัยกว่าเลขตำแหน่ง) */
function _writeUserCell(found, columnName, value) {
  const c = found.headers.indexOf(columnName);
  if (c === -1) return;
  found.sheet.getRange(found.rowIdx, c + 1).setValue(value);
}

/**
 * ออกรหัสผู้ใช้ให้สมาชิก (ถ้ายังไม่มี)
 * ใช้ยืนยันตัวตนเวลาขอดูคลังไฟล์ — ป้องกันคนแอบพิมพ์อีเมลคนอื่นมาดูไฟล์
 */
function _ensureToken(found) {
  const current = String(found.row.token || '').trim();
  if (current.length >= 32) return current;
  const token = _newToken();
  _writeUserCell(found, 'token', token);
  found.row.token = token;
  return token;
}

/** เทียบรหัสผู้ใช้แบบความคงทนต่อเวลา (กันเดาสุ่มทีละตัว) */
function _safeEqual(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  if (x.length !== y.length || x.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) {
    diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * ยืนยันตัวตนด้วยอีเมล + รหัสผู้ใช้ (ไม่ต้องกรอกรหัสผ่านอีก)
 * ใช้ตอนเปิดหน้าเว็บใหม่ และตอนขอดูคลังไฟล์
 */
function _session(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const token = String(body.token || '').trim();
  if (!email || !token) {
    return { ok: false, error: 'ยังไม่ได้เข้าสู่ระบบ' };
  }

  const found = _findUserRow(email);
  if (!found || !_safeEqual(found.row.token, token)) {
    return { ok: false, error: 'การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง' };
  }

  return { ok: true, user: _publicUser(found.row) };
}

/**
 * เช็คว่าอีเมลนี้มีบัญชีไหม
 * ⚠️ ห้ามคืนรหัสผู้ใช้ (token) จากฟังก์ชันนี้เด็ดขาด
 *    ไม่งั้นคนที่รู้อีเมลเพียงอย่างเดียวจะขโมยสิทธิ์ได้
 */
function _checkUser(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  const found = _findUserRow(email);
  if (!found) return { ok: true, exists: false, user: null };
  return { ok: true, exists: true, user: _publicUser(found.row) };
}

// ============================ Firebase (ตรวจตัวตน) ============================

/**
 * อ่านค่า Firebase Project ID จาก Script Properties
 * (ตั้งค่า: ไอคอนเฟือง → Script properties → FIREBASE_PROJECT_ID)
 */
function _firebaseProjectId() {
  try {
    return String(
      PropertiesService.getScriptProperties().getProperty('FIREBASE_PROJECT_ID') || ''
    ).trim();
  } catch (err) {
    return '';
  }
}

/**
 * ตรวจ Firebase ID Token กับเซิร์ฟเวอร์ของ Google โดยตรง
 * คืนข้อมูลที่เชื่อถือได้ (อีเมลที่ยืนยันแล้ว) หรือ null ถ้าไม่ผ่าน
 *
 * 🛡 หลักการสำคัญ:
 *   - ใช้ token แค่ดูว่าเป็นใคร ไม่ใช้ยืนยันตัวตนซ้ำทุกครั้ง
 *   - เก็บ ID Token ไว้ในชีตหรือส่งกลับไปหาเบราว์เซอร์เด็ดขาด
 *   - เมื่อผ่านแล้วออก "รหัสผู้ใช้" ของเราเองไปแทน
 *   - เหตุที่ไม่ผ่าน บันทึกไว้ในบันทึกการดำเนินการของเจ้าของเท่านั้น
 */
function _verifyFirebaseToken(idToken) {
  const token = String(idToken || '').trim();
  const projectId = _firebaseProjectId();
  if (!projectId) {
    throw new Error('เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Firebase (Script Properties: FIREBASE_PROJECT_ID)');
  }
  if (!token) {
    Logger.log('[firebase] ไม่ได้ส่ง token มา');
    return null;
  }

  let verified = null;
  try {
    verified = _verifyFirebaseIdToken(token);
  } catch (err) {
    Logger.log('[firebase] เรียก Google ไม่สำเร็จ: ' + err);
    return { error: 'เรียก Google ไม่สำเร็จ (' + err + ')' };
  }
  if (verified && verified.error) return verified;
  if (!verified) return { error: 'ตรวจไม่ผ่าน (ไม่ทราบสาเหตุ)' };

  Logger.log('[firebase] ผ่านการตรวจ: ' + verified.email +
    ' (วิธีเข้า: ' + verified.provider + ')');
  return { email: verified.email, provider: verified.provider };
}

/**
 * ตรวจ Firebase ID Token กับเซิร์ฟเวอร์ของ Google
 *
 * ใช้ปลายทาย accounts:lookup ของ Identity Toolkit
 * (ปลายทาย tokeninfo / getAccountInfo ถูกปิดไปแล้ว ตอบ 404 ทั้งหมด)
 *
 * 🛡 หลักการ:
 *   - Google ตรวจลายเซ็นดิจิทัลให้เราแล้ว จึงเชื่อถือได้
 *   - ส่ง Web API key ของโปรเจกต์เราไปด้วย token ของโปรเจกต์อื่นจะหาไม่เจอ
 *   - อ่าน payload ของ token มาเทียบ iss/aud อีกชั้นแบบกันพลาด
 *   - ไม่เคยเก็บหรือส่ง token กลับไปไหน
 */
function _verifyFirebaseIdToken(token) {
  const url = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' +
    encodeURIComponent(FIREBASE_API_KEY);

  // ⚠️ Apps Script จะแนบหัว Authorization ของ OAuth ให้เองโดยอัตโนมัติ
  //    ซึ่ง Identity Toolkit ไม่รับ (ต้องใช้ API key เท่านั้น)
  //    การส่ง Authorization ว่างไปจึงจำเป็นต้องทำ
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: token }),
    headers: { 'Authorization': '' },
    muteHttpExceptions: true,
    followRedirects: true,
  });

  const code = res.getResponseCode();
  if (code !== 200) {
    const body = String(res.getContentText()).slice(0, 200);
    Logger.log('[firebase] accounts:lookup ตอบ ' + code + ' : ' + body);
    return { error: 'http' + code, detail: body };
  }

  let data;
  try {
    data = JSON.parse(res.getContentText());
  } catch (err) {
    return { error: 'อ่านผลลัพธ์ไม่ได้' };
  }
  if (!data || !data.users || !data.users.length) {
    return { error: 'Google ไม่พบผู้ใช้จาก token นี้' };
  }

  const u = data.users[0];
  const email = String(u.email || '').trim().toLowerCase();
  if (!email || email.indexOf('@') === -1) {
    return { error: 'ไม่พบอีเมลในบัญชี' };
  }

  const info = u.providerUserInfo && u.providerUserInfo[0];
  const provider = String((info && info.providerId) || 'password').toLowerCase();

  // ชั้นกันพลาด: เทียบ iss/aud ว่าเป็นโปรเจกต์เราจริงไหม
  const payload = _decodeJwtPayload(token);
  if (payload) {
    const projectId = _firebaseProjectId();
    if (String(payload.iss || '') !==
        'https://securetoken.google.com/' + projectId) {
      Logger.log('[firebase] ผิดโปรเจกต์: ' + payload.iss);
      return { error: 'token มาจากโปรเจกต์อื่น (iss ไม่ตรง)' };
    }
    if (payload.aud && String(payload.aud) !== projectId) {
      Logger.log('[firebase] aud ไม่ตรง: ' + payload.aud);
      return { error: 'aud ไม่ตรง (' + payload.aud + ')' };
    }
  }

  // บัญชี Google ต้องยืนยันอีเมลแล้วเสมอ
  // (บัญชีอีเมล+รหัสผ่าน ยังไม่ยืนยันก็ได้ จึงไม่บังคับ)
  if (provider === 'google.com' && u.emailVerified !== true) {
    Logger.log('[firebase] บัญชี Google ยังไม่ได้ยืนยันอีเมล');
    return { error: 'บัญชี Google ยังไม่ได้ยืนยันอีเมล' };
  }

  return {
    email: email,
    provider: provider,
    emailVerified: u.emailVerified === true
  };
}

/**
 * อ่าน payload ของ JWT (อ่านอย่างเดียว ไม่ได้ตรวจลายเซ็น)
 * ใช้ประกอบกับผลจาก Google เท่านั้น ห้ามใช้ยืนยันตัวตนเพียงลำพัง
 */
function _decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length < 2) return null;
  const b64 = parts[1];

  // Apps Script แต่ละรุ่นคืนค่าจาก base64Decode ไม่เหมือนกัน
  // (บางรุ่นคืน byte array บางรุ่นคืน string) จึงต้องลองทั้งสองแบบ
  const attempts = [
    function () {
      let s = b64.replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4 !== 0) s += '=';
      return Utilities.base64Decode(s);
    },
    function () {
      return Utilities.base64DecodeWebSafe(b64);
    },
  ];

  for (let i = 0; i < attempts.length; i++) {
    try {
      let raw = attempts[i]();
      // ถ้าได้ byte array ให้แปลงเป็นข้อความก่อน
      if (Object.prototype.toString.call(raw) === '[object Array]') {
        raw = Utilities.newBlob(raw).getDataAsString('UTF-8');
      }
      const obj = JSON.parse(String(raw));
      if (obj && typeof obj === 'object') return obj;
    } catch (err) {
      // ลองวิธีถัดไป
    }
  }
  return null;
}

/**
 * เข้าสู่ระบบผ่าน Firebase
 * รับ Firebase ID Token → ตรวจกับ Google → ออกรหัสผู้ใช้ของเรา
 * ครั้งแรกที่เข้ามาจะสร้างแถวในชีต user_id พร้อม UID ถัดไป
 */
function _firebaseLogin(body) {
  let verified = null;
  try {
    verified = _verifyFirebaseToken(body.id_token);
  } catch (err) {
    return { ok: false, error: String(err) };
  }
  if (!verified || !verified.email) {
    // ส่งเหตุผลกลับไปด้วยระหว่างตั้งค่า เพื่อให้แก้จุดที่ผิดได้เร็ว
    return {
      ok: false,
      error: 'การยืนยันตัวตนไม่ผ่าน: ' +
        ((verified && verified.error) || 'ไม่ทราบสาเหตุ')
    };
  }

  const email = verified.email;

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // 🛡 ตรวจให้คอลัมน์ที่ต้องใช้มีอยู่จริงก่อนเขียน
    //    ถ้ามองข้ามไว้ ระบบจะเขียนไม่ลงแล้วเงียบ ๆ (session พังเงียบ ๆ ตอนเปิดหน้าใหม่)
    //    ต้องอยู่ใน lock เพราะ _ensureColumns มีการเขียนหัวตาราง
    _ensureColumns(SHEET_USERS, ['token', 'login_method']);

    const found = _findUserRow(email);
    const today = _today();
    let token = '';

    if (found) {
      // บัญชีเดิม → เก็บ UID / ชื่อ / วันที่สร้างไว้ แต้แต่แตะ last_login
      _writeUserCell(found, 'last_login', today);
      _writeUserCell(found, 'login_method', 'firebase');
      token = _ensureToken(found);
      return {
        ok: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        user: _publicUser(found.row),
        token: token,
        isAdmin: _isAdminEmail(email)
      };
    }

    // บัญชีใหม่ → สร้างแถวใหม่
    const userId = _nextUserId();
    if (!userId) return { ok: false, error: 'เต็มจำนวนสมาชิกแล้ว' };

    const headers = _header(SHEET_USERS);
    const cols = headers.length;
    const row = [];
    for (let i = 0; i < cols; i++) row.push('');

    const put = function (name, value) {
      const c = headers.indexOf(name);
      if (c !== -1) row[c] = value;
    };
    put('User_id', userId);
    put('email', email);
    // 🛡 ไม่เก็บรหัสผ่านในชีต — Firebase เป็นผู้เก็บและเข้ารหัสให้
    put('password', '');
    put('name', String(body.name || email.split('@')[0] || 'ลูกค้า'));
    put('Creation date', today);
    put('last_login', today);
    put('token', _newToken());
    put('login_method', 'firebase');

    SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(SHEET_USERS).appendRow(row);

    const created = _findUserRow(email);
    if (created) token = _ensureToken(created);

    return {
      ok: true,
      message: 'สร้างบัญชีใหม่เรียบร้อย',
      user: created
        ? _publicUser(created.row)
        : { user_id: userId, email: email, name: '', created_at: today,
            login_method: 'firebase' },
      token: token,
      isAdmin: _isAdminEmail(email)
    };
  } finally {
    lock.releaseLock();
  }
}

// ============================ ตรวจสิทธิ์ (สำคัญมาก) ============================

/**
 * ตรวจสิทธิ์ผู้ดูแลร้าน
 *
 * หลักการ: อีเมลของผู้ดูแลต้องมาจาก session ที่ยืนยันแล้วเท่านั้น
 * ซึ่ง session นั้นได้มาจากการตรวจ Firebase ID Token ที่เซิร์ฟเวอร์ Google
 * ตรวจสอบเอง (ดูฟังก์ชัน firebaseLogin)
 *
 * ⚠️ ทำไมถึงต้องเป็นแบบนี้:
 *    ถ้า deploy แบบ "Anyone" Session.getActiveUser().getEmail()
 *    จะคืนค่าว่างเสมอ ใช้ระบุตัวตนไม่ได้
 *    เคยทำให้แอดมินเขียนชีตไม่ได้เลย
 */
function _isAdminEmail(email) {
  const target = String(email || '').trim().toLowerCase();
  if (!target) return false;
  return ADMIN_EMAILS.map(function (e) { return String(e).trim().toLowerCase(); })
    .indexOf(target) !== -1;
}

/**
 * ตรวจสิทธิ์ผู้ดูแลจากคำขอ
 * คืน {ok:false} ถ้าไม่มี session หรืออีเมลไม่ใช่เจ้าของร้าน
 */
function _requireAdmin(body) {
  const sess = _session(body);
  if (!sess.ok) {
    return { ok: false, error: 'กรุณาเข้าสู่ระบบก่อน' };
  }
  if (!_isAdminEmail(sess.user.email)) {
    return { ok: false, error: 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลร้าน' };
  }
  sess.email = sess.user.email;
  return sess;
}

/**
 * ค่าที่หน้าเว็บต้องรู้ตอนเริ่มทำงาน
 *
 * 🛡 ค่าชุดนี้เป็นค่าสาธารณะทั้งหมด (Firebase Web config)
 *    ไม่มีรหัสลับอยู่ในนี้ จึงเปิดเผยได้
 *    ทำแบบนี้เพื่อให้ไม่ต้องไปใส่ค่าใน Cloudflare Pages ทีละเว็บ
 *    มีจุดเดียวที่ต้องแก้: ที่โค้ดฝั่งเว็บของ Firebase
 */
function getPublicConfig() {
  return {
    ok: true,
    store_name: String(_getConfig('store_name') || 'PDF ให้แม่มึงทำ'),
    promptpay_phone: String(_getConfig('promptpay_phone') || ''),
    promptpay_name: String(_getConfig('promptpay_name') || ''),
    contact_line: String(_getConfig('contact_line') || ''),
    contact_email: String(_getConfig('contact_email') || ''),
    // 🔗 ลิงก์ LINE OA ของร้าน — ปุ่มสีเขียวบนหน้าเว็บจะพาไปที่นี่
    line_oa_link: String(_getConfig('line_oa_link') || ''),
    banking_open: String(_getConfig('banking_open')) === 'yes',
    firebase: {
      apiKey: FIREBASE_API_KEY,
      authDomain: FIREBASE_API_KEY
        ? (_firebaseProjectId() || '') + '.firebaseapp.com'
        : '',
      projectId: _firebaseProjectId(),
      appId: FIREBASE_APP_ID
    }
  };
}

/** ใช้ตอนทดสอบเท่านั้น: ดูสถานะระบบ */
function adminStatus() {
  return {
    adminEmails: ADMIN_EMAILS,
    firebaseProjectId: _firebaseProjectId() || '(ยังไม่ได้ตั้ง)',
    bankingOpen: _isOpen(),
    users: _readSheet(SHEET_USERS).length
  };
}

/** ร้านเปิดรับคำสั่งซื้อหรือยัง (ตั้งค่าในชีต Config ได้) */
function _isOpen() {
  return String(_getConfig('banking_open')) === 'yes';
}

// ============================ อ่านข้อมูล ============================

function _listProducts() {
  const rows = _readSheet(SHEET_PRODUCTS);
  if (rows.length === 0) return { ok: true, products: [], total: 0, hidden: 0 };

  const out = [];
  // 📊 นับสินค้าที่ถูกซ่อน เพื่อบอกหน้าเว็บว่า "มีของแต่ยังไม่เผยแพร่"
  let hidden = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // ⛔ กรองที่ฝั่งเซิร์ฟเวอร์: คนทั่วไปเห็นเฉพาะสินค้าที่ published เท่านั้น
    if (String(r.status || '') !== 'published') {
      hidden++;
      continue;
    }
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
      status: String(r.status || 'published'),
      createdAt: _fmtDate(r.created_at)
    });
  }
  return { ok: true, products: out, total: rows.length, hidden: hidden };
}

function _productDetail(id) {
  const all = _listProducts();
  const found = all.products.filter(function (p) { return p.id === id; })[0];
  if (!found) return { ok: false, error: 'ไม่พบสินค้า' };
  return { ok: true, product: found };
}

/**
 * 🧪 ดูโครงสร้างชีตทั้งหมด (สำหรับนักพัฒนา / เจ้าของร้านตรวจงาน)
 *
 * คืน: รายชื่อแท็บ + ชื่อคอลัมน์ + สูตร + dropdown + ตัวอย่างข้อมูล
 * 🔒 ต้องเป็นผู้ดูแลร้าน (ต้องมี session)
 */
function _sheetInspector() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = [];

  for (let i = 0; i < ss.getSheets().length; i++) {
    const sh = ss.getSheets()[i];
    const name = sh.getName();
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();

    if (lastRow === 0) {
      sheets.push({ name: name, empty: true });
      continue;
    }

    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
      return String(h || '');
    });

    // 🧮 สูตรในแถว 1-3 (มักเป็นที่ทำ dropdown/สูตรคำนวณ)
    const sampleRows = Math.min(3, lastRow);
    const formulas = sh.getRange(1, 1, sampleRows, lastCol).getFormulas();
    const values = sh.getRange(1, 1, sampleRows, lastCol).getValues();

    // 🔽 dropdown (data validation) ของแต่ละคอลัมน์
    const validations = [];
    for (let c = 0; c < lastCol; c++) {
      try {
        const v = sh.getRange(2, c + 1).getDataValidation();
        if (v) {
          validations.push({
            column: headers[c] || ('col' + (c + 1)),
            type: String(v.getCriteriaType() || ''),
            values: v.getCriteriaValues() || []
          });
        }
      } catch (e) {
        // ช่องนี้ไม่มี validation — ข้าม
      }
    }

    // 📋 แถวตัวอย่าง
    const rows = [];
    for (let r = 1; r < sampleRows; r++) {
      const row = {};
      for (let c = 0; c < lastCol; c++) {
        const key = headers[c] || ('col' + (c + 1));
        const f = String(formulas[r][c] || '');
        const v = values[r][c];
        row[key] = f.charAt(0) === '=' ? f : v;
      }
      rows.push(row);
    }

    sheets.push({
      name: name,
      rowCount: lastRow - 1,
      columnCount: lastCol,
      headers: headers,
      validations: validations,
      sampleRows: rows
    });
  }

  return { ok: true, sheets: sheets };
}

/**
 * 📋 โครงสร้างชีตแบบสาธารณะ (ไม่ต้องล็อกอิน)
 *
 * 🛡 คืนแค่ "ชื่อแท็บ + ชื่อคอลัมน์ + ค่าใน dropdown"
 *    ไม่มีข้อมูลลูกค้า ไม่มียอดขาย ไม่มีอีเมล → เปิดเผยได้
 *    ประโยชน์: เช็คว่าเว็บอ่านชีตตรงช่องไหม โดยไม่ต้องเป็นแอดมิน
 */
function _sheetStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const out = [];

  for (let i = 0; i < ss.getSheets().length; i++) {
    const sh = ss.getSheets()[i];
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastRow === 0) {
      out.push({ name: sh.getName(), empty: true, headers: [], validations: [] });
      continue;
    }

    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
      return String(h || '');
    });

    const validations = [];
    for (let c = 0; c < lastCol; c++) {
      try {
        const v = sh.getRange(2, c + 1).getDataValidation();
        if (v) {
          validations.push({
            column: headers[c] || ('col' + (c + 1)),
            type: String(v.getCriteriaType() || ''),
            values: v.getCriteriaValues() || []
          });
        }
      } catch (e) {
        // ช่องนี้ไม่มี validation
      }
    }

    out.push({
      name: sh.getName(),
      rowCount: lastRow - 1,
      columnCount: lastCol,
      headers: headers,
      validations: validations
    });
  }

  return { ok: true, sheets: out };
}

/**
 * ⭐ สินค้าที่ผู้ใช้กดถูกใจ (ผูกกับอีเมล)
 *
 * 🔒 ต้องยืนยันตัวตนด้วย email + token เสมอ
 *    (ห้ามดูดาวคนอื่นได้ แม้จะรู้อีเมล)
 *
 * เก็บไว้ในชีต → ล็อกอินใหม่ / เปลี่ยนเครื่อง / ล้างเบราว์เซอร์ ดาวยังอยู่
 */
function _myFavorites(body) {
  const sess = _session(body);
  if (!sess.ok) return sess;

  // ℹ️ ถ้ายังไม่มีแท็บ → _readSheet คืน [] อัตโนมัติ ไม่ error
  //    (แท็บจะถูกสร้างตอนกดดาวครั้งแรก ซึ่งอยู่ใน lock)

  const email = sess.user.email.toLowerCase();
  const rows = _readSheet(SHEET_FAVORITES).filter(function (r) {
    return String(r.email || '').toLowerCase() === email;
  });

  const items = rows.map(function (r) {
    return {
      favId: r.fav_id,
      productId: r.product_id,
      createdAt: _fmtDate(r.created_at)
    };
  });

  return {
    ok: true,
    items: items,
    productIds: items.map(function (x) { return x.productId; })
  };
}

/**
 * ⭐ เพิ่ม/ลบดาวถูกใจ
 * @param {boolean} on true = กดถูกใจ, false = เอาออก
 */
function _toggleFavorite(body, on) {
  const sess = _session(body);
  if (!sess.ok) return sess;

  const email = sess.user.email.toLowerCase();
  const productId = String(body.product_id || '').trim();
  if (!productId) return { ok: false, error: 'ไม่ระบุสินค้า' };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    _ensureSheet(SHEET_FAVORITES, [
      'fav_id', 'email', 'User_id', 'product_id', 'created_at'
    ]);
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_FAVORITES);
    const headers = _header(SHEET_FAVORITES);
    const data = sh.getDataRange().getValues();
    const cEmail = headers.indexOf('email');
    const cProduct = headers.indexOf('product_id');
    const cId = headers.indexOf('fav_id');
    const cUser = headers.indexOf('User_id');
    const cAt = headers.indexOf('created_at');

    let found = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][cEmail] || '').toLowerCase() === email &&
          String(data[i][cProduct]) === productId) {
        found = i + 1;
        break;
      }
    }

    if (on) {
      if (found === -1) {
        const row = [];
        for (let i = 0; i < headers.length; i++) row.push('');
        row[cId] = Utilities.getUuid();
        row[cEmail] = email;
        row[cUser] = sess.user.user_id || '';
        row[cProduct] = productId;
        row[cAt] = new Date();
        sh.appendRow(row);
      }
      return { ok: true, on: true, productId: productId, message: 'เพิ่มดาวถูกใจแล้ว' };
    }

    if (found !== -1) {
      sh.deleteRow(found);
    }
    return { ok: true, on: false, productId: productId, message: 'เอาดาวออกแล้ว' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ⭐ รวมดาวถูกใจจากเบราว์เซอร์เข้าบัญชี (ตอนล็อกอินครั้งแรก)
 * ใช้กรณีคนกดดาวตอนยังไม่ได้ล็อกอิน แล้วค่อยมาล็อกอินทีหลัง
 */
function _syncFavorites(body) {
  const sess = _session(body);
  if (!sess.ok) return sess;

  const email = sess.user.email.toLowerCase();
  const list = Array.isArray(body.product_ids) ? body.product_ids : [];
  if (list.length === 0) return { ok: true, merged: 0, productIds: [] };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    _ensureSheet(SHEET_FAVORITES, [
      'fav_id', 'email', 'User_id', 'product_id', 'created_at'
    ]);
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_FAVORITES);
    const headers = _header(SHEET_FAVORITES);
    const data = sh.getDataRange().getValues();
    const cEmail = headers.indexOf('email');
    const cProduct = headers.indexOf('product_id');

    const existing = {};
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][cEmail] || '').toLowerCase() === email) {
        existing[String(data[i][cProduct])] = true;
      }
    }

    let merged = 0;
    for (const pid of list) {
      const productId = String(pid || '').trim();
      if (!productId || existing[productId]) continue;
      const row = [];
      for (let i = 0; i < headers.length; i++) row.push('');
      row[headers.indexOf('fav_id')] = Utilities.getUuid();
      row[cEmail] = email;
      row[headers.indexOf('User_id')] = sess.user.user_id || '';
      row[cProduct] = productId;
      row[headers.indexOf('created_at')] = new Date();
      sh.appendRow(row);
      existing[productId] = true;
      merged++;
    }

    return {
      ok: true,
      merged: merged,
      productIds: Object.keys(existing)
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * รายการสินค้าทั้งหมดรวมที่ยังไม่เผยแพร่ (เฉพาะแอดมิน)
 * ใช้ในหน้าแอดมิน เพื่อให้เห็นสินค้าที่ตั้งเป็น draft ด้วย
 */
function _listProductsAll() {
  const rows = _readSheet(SHEET_PRODUCTS);
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
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
      price: Math.round(Number(r.price_satang || 0) / 100),
      oldPrice: r.old_price_satang === '' || r.old_price_satang == null
        ? undefined
        : Math.round(Number(r.old_price_satang) / 100),
      pages: Number(r.pages || 0),
      fileSize: r.file_size,
      rating: Number(r.rating || 0),
      sales: Number(r.sales || 0),
      coverColor: r.cover_color || '#1d4ed8',
      status: String(r.status || 'published'),
      createdAt: _fmtDate(r.created_at)
    });
  }
  return { ok: true, products: out };
}

/**
 * ตั้งค่า URL ของเซิร์ฟเวอร์เอง (เฉพาะแอดมิน)
 *
 * 🔴 ช่วงชักช่วง: ถ้าเปลี่ยน URL ของ Apps Script (เช่น deploy ใหม่)
 *    เว็บจะเรียก URL เก่า = 404 = ข้อมูลปลอม
 *    → ให้แก้ในหน้าเว็บนี้ได้เลย ไม่ต้องแก้โค้ด
 *
 * ⚠️ ข้อจำกัด: เว็บต้องรู้ URL ก่อนจะไปอ่านชีตได้
 *    → จึงต้องเก็บ URL ไว้ใน localStorage ของเบราว์เซอร์ด้วย
 */
function _setServerUrl(url) {
  const u = String(url || '').trim();
  if (!u) return { ok: false, error: 'ไม่ได้ใส่ URL' };
  if (u.indexOf('script.google.com/macros/') === -1) {
    return { ok: false, error: 'URL ไม่ถูกต้อง — ต้องเป็นลิงก์ /exec ของ Apps Script' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cfg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
    const data = cfg.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === 'server_url') {
        cfg.getRange(i + 1, 2).setValue(u);
        return { ok: true, message: 'บันทึก URL แล้ว', server_url: u };
      }
    }
    cfg.appendRow(['server_url', u]);
    return { ok: true, message: 'เพิ่ม URL แล้ว', server_url: u };
  } finally {
    lock.releaseLock();
  }
}

/**
 * แก้ค่าตั้งร้านในแท็บ Config (เฉพาะแอดมิน)
 * ใช้ตั้งลิงก์ LINE OA / ชื่อร้าน โดยไม่ต้องแก้โค้ด
 */
function _setConfig(key, value) {
  const k = String(key || '').trim();
  if (!k) return { ok: false, error: 'ไม่ระบุคีย์' };

  // 🛡 อนุญาตเฉพาะคีย์ที่กำหนดไว้ กันเขียนทับค่าอื่นมั่ว
  const ALLOWED = [
    'store_name', 'contact_line', 'contact_email', 'line_oa_link',
    'promptpay_phone', 'promptpay_name', 'banking_open'
  ];
  if (ALLOWED.indexOf(k) === -1) {
    return { ok: false, error: 'ไม่อนุญาตให้แก้คีย์นี้' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cfg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
    const data = cfg.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === k) {
        cfg.getRange(i + 1, 2).setValue(String(value || ''));
        return { ok: true, message: 'บันทึกค่าแล้ว', key: k };
      }
    }
    // ยังไม่มีคีย์นี้ → เพิ่มใหม่
    cfg.appendRow([k, String(value || '')]);
    return { ok: true, message: 'เพิ่มค่าใหม่แล้ว', key: k };
  } finally {
    lock.releaseLock();
  }
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
      userId: o.User_id,
      status: o.status,
      total: Math.round(Number(o.total_satang || 0) / 100),
      paymentRef: o.payment_ref,
      libraryGranted: String(o.library_granted) === 'TRUE',
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

/**
 * คลังไฟล์ของสมาชิก
 * 🔒 ต้องยืนยันตัวตนด้วยอีเมล + token เสมอ (ห้ามค้นด้วย UID หรืออีเมลล้วน)
 * คืนลิงก์ไฟล์เฉพาะแถวที่ active = TRUE เท่านั้น
 */
function _myLibrary(body) {
  const sess = _session(body);
  if (!sess.ok) return sess;

  const rows = _readSheet(SHEET_LIBRARY).filter(function (r) {
    return String(r.email || '').toLowerCase() === sess.user.email.toLowerCase();
  });

  const files = _readSheet(SHEET_FILES);
  const items = rows.map(function (r) {
    const f = files.filter(function (x) {
      return String(x.product_id) === String(r.product_id);
    })[0];
    const active = String(r.active).toUpperCase() === 'TRUE';
    return {
      grantId: r.grant_id,
      userId: r.User_id,
      productId: r.product_id,
      title: f ? String(f.file_name || '') : String(r.product_id),
      fileCode: r.file_code,
      fileSize: f ? String(f.file_size || '') : '',
      orderId: r.order_id,
      grantedAt: _fmtDate(r.granted_at),
      active: active,
      // 🛡 คืนลิงก์จริงเฉพาะตอนยังมีสิทธิ์เท่านั้น
      downloadUrl: active && f ? String(f.drive_url || '') : ''
    };
  });

  return { ok: true, user: sess.user, items: items };
}

/**
 * ให้สิทธิ์ดาวน์โหลดไฟล์ทุกชิ้นในออเดอร์
 * เรียกอัตโนมัติเมื่อแอดมินกดยืนยันยอดแล้ว
 */
function _grantLibrary(orderId, adminEmail) {
  const order = _readSheet(SHEET_ORDERS).filter(function (o) {
    return String(o.order_id) === String(orderId);
  })[0];
  if (!order) return 0;

  const lines = _readSheet(SHEET_ORDER_ITEMS).filter(function (x) {
    return String(x.order_id) === String(orderId);
  });
  if (lines.length === 0) return 0;

  const existing = _readSheet(SHEET_LIBRARY);
  const today = _today();
  let added = 0;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // กันให้สิทธิ์ซ้ำแถวเดิม
    const dup = existing.some(function (r) {
      return String(r.order_id) === String(orderId) &&
        String(r.product_id) === String(l.product_id);
    });
    if (dup) continue;

    // ดึง file_code จากแท็บ Files
    const f = _readSheet(SHEET_FILES).filter(function (x) {
      return String(x.product_id) === String(l.product_id);
    })[0];

    _appendRow(SHEET_LIBRARY, [
      Utilities.getUuid(),
      order.User_id,
      order.customer_email,
      l.product_id,
      f ? String(f.file_code || '') : '',
      orderId,
      today,
      adminEmail || '',
      'TRUE'
    ]);
    added++;
  }

  // ทำเครื่องหมายว่าออเดอร์นี้แจกสิทธิ์แล้ว
  _markOrder(orderId, 'library_granted', true);
  return added;
}

/**
 * ถอดสิทธิ์ดาวน์โหลด (แอดมินกดได้จากหน้าเว็บ)
 * แก้คอลัมน์ active เป็น FALSE → ลูกค้าเห็นรายการอยู่แต่กดโหลดไม่ได้
 */
function _revokeGrant(grantId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LIBRARY);
    const headers = _header(SHEET_LIBRARY);
    const data = sh.getDataRange().getValues();
    const cId = headers.indexOf('grant_id');
    const cActive = headers.indexOf('active');

    if (cId === -1 || cActive === -1) {
      return { ok: false, error: 'แท็บ Library ยังไม่มีคอลัมน์ที่ต้องใช้' };
    }

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][cId]) === String(grantId)) {
        sh.getRange(i + 1, cActive + 1).setValue('FALSE');
        return { ok: true, message: 'ถอดสิทธิ์แล้ว' };
      }
    }
    return { ok: false, error: 'ไม่พบรายการที่ต้องการถอดสิทธิ์' };
  } finally {
    lock.releaseLock();
  }
}

/** เขียนค่าลงคอลัมน์ของแถวออเดอร์ โดยเลือกคอลัมน์จากชื่อ */
function _markOrder(orderId, columnName, value) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ORDERS);
  const headers = _header(SHEET_ORDERS);
  const c = headers.indexOf(columnName);
  if (c === -1) return;
  const data = sh.getDataRange().getValues();
  const cId = headers.indexOf('order_id');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][cId]) === String(orderId)) {
      sh.getRange(i + 1, c + 1).setValue(value);
      return;
    }
  }
}

/** ออเดอร์ของสมาชิกที่ล็อกอินอยู่ (ดูสถานะ "รอโอน/รอตรวจสอบ/สำเร็จ") */
function _myOrders(body) {
  const sess = _session(body);
  if (!sess.ok) return sess;

  const email = sess.user.email.toLowerCase();
  const items = _readSheet(SHEET_ORDER_ITEMS);

  const orders = _readSheet(SHEET_ORDERS)
    .filter(function (o) {
      return String(o.customer_email || '').toLowerCase() === email;
    })
    .map(function (o) {
      const lines = items.filter(function (x) {
        return String(x.order_id) === String(o.order_id);
      });
      return {
        orderId: o.order_id,
        createdAt: _fmtDate(o.created_at),
        status: String(o.status || ''),
        total: Math.round(Number(o.total_satang || 0) / 100),
        libraryGranted: String(o.library_granted) === 'TRUE',
        items: lines.map(function (l) {
          return {
            productId: l.product_id,
            title: l.title_snapshot,
            price: Math.round(Number(l.price_satang || 0) / 100),
            qty: Number(l.qty || 0)
          };
        })
      };
    });

  return { ok: true, orders: orders };
}

function _getConfig(key) {
  const rows = _readSheet(SHEET_CONFIG);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].key) === String(key)) return rows[i].value;
  }
  return '';
}

// ============================ เขียนข้อมูล ============================

/**
 * สร้างคำสั่งซื้อ
 * ⚠️ ราคาคิดจากชีตเท่านั้น ไม่เชื่อราคาที่ส่งมาจากเบราว์เซอร์
 */
function _createOrder(body) {
  // 🔒 ต้องล็อกอินจริงถึงจะสั่งซื้อได้ (ยืนยันด้วยอีเมล + token)
  const sess = _session(body);
  if (!sess.ok) return sess;

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return { ok: false, error: 'ตะกร้าว่างเปล่า' };

    const email = sess.user.email;
    const name = String(body.name || sess.user.name || 'ลูกค้า').trim() || 'ลูกค้า';

    const products = _listProducts().products;
    const lines = [];
    let totalSatang = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const p = products.filter(function (x) { return x.id === it.productId; })[0];
      if (!p) return { ok: false, error: 'ไม่พบสินค้า: ' + it.productId };

      const qty = Math.max(1, Math.min(99, Number(it.qty || 1)));
      // 🛡 คิดราคาจากชีตเท่านั้น ยอมรับราคาจากเบราว์เซอร์ไม่ได้
      const priceSatang = Math.round(p.price * 100);
      totalSatang += priceSatang * qty;
      lines.push({
        productId: p.id,
        title: p.title,      // snapshot กันชื่อเปลี่ยนทีหลัง
        priceSatang: priceSatang,
        qty: qty
      });
    }

    const orderId = _newId('ORD');
    const orderToken = _newToken();
    const now = new Date();

    _appendRow(SHEET_ORDERS, [
      orderId, now, name, email, 'password', _hash(orderToken),
      ORDER_STATUS.NEW, totalSatang, '', '', '', '',
      sess.user.user_id, '', ''       // User_id, order_token, library_granted
    ]);

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      _appendRow(SHEET_ORDER_ITEMS, [
        Utilities.getUuid(), orderId, l.productId, l.title, l.priceSatang, l.qty
      ]);
    }

    return {
      ok: true,
      message: 'สร้างคำสั่งซื้อแล้ว กรุณาโอนเงินตามยอดที่แสดง',
      order_id: orderId,
      total: Math.round(totalSatang / 100)
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ลูกค้าแจ้งว่าโอนเงินแล้ว
 * 🔒 ต้องล็อกอินด้วยอีเมลเดียวกับที่สั่งซื้อ ไม่งั้นคนอื่นแจ้งแทนได้
 */
function _submitPayment(body) {
  const sess = _session(body);
  if (!sess.ok) return sess;

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

    // 🛡 ต้องเป็นออเดอร์ของคนที่ล็อกอินอยู่เท่านั้น
    const cEmail = headers.indexOf('customer_email');
    if (String(data[rowIdx - 1][cEmail] || '').toLowerCase() !==
        sess.user.email.toLowerCase()) {
      return { ok: false, error: 'ไม่พบคำสั่งซื้อของคุณ' };
    }

    // แจ้งแล้วต้องยังรอโอนอยู่ ป้องกันส่งซ้ำหลังจ่ายแล้ว
    const cStatus = headers.indexOf('status');
    if (String(data[rowIdx - 1][cStatus]) !== ORDER_STATUS.NEW) {
      return { ok: false, error: 'คำสั่งซื้อนี้ถูกดำเนินการแล้ว' };
    }

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

/**
 * เพิ่ม/แก้สินค้า (เฉพาะแอดมิน)
 *
 * ⚠️ เขียนโดย "ชื่อคอลัมน์" ไม่ใช่ตำแหน่ง
 *    ถ้าเขียนตามตำแหน่ง (index) แล้วเจ้าของสลับคอลัมน์ในชีต
 *    ข้อมูลจะไปลงผิดช่องทันที เช่น ราคาไปลงช่องชื่อสินค้า
 */
function _upsertProduct(p) {
  const id = String(p.id || '').trim();
  const title = String(p.title || '').trim();
  if (!id) return { ok: false, error: 'ไม่มีรหัสสินค้า' };
  if (!title) return { ok: false, error: 'ไม่มีชื่อสินค้า' };

  const priceSatang = Math.round(Number(p.price || 0) * 100);
  if (priceSatang < 0) return { ok: false, error: 'ราคาไม่ถูกต้อง' };

  // 🗺 ค่าที่จะเขียน ผูกกับ "ชื่อคอลัมน์" เท่านั้น
  const values = {
    product_id: id,
    title: title,
    description: String(p.description || ''),
    long_description: String(p.longDescription || ''),
    // ⚠️ ถ้าค่าที่ส่งมาไม่อยู่ในรายการ (เช่นชีตยังมีค่าเก่าอยู่)
    //    → เก็บค่าเดิมไว้ อย่าเดาแทน ไม่งั้นข้อมูลจะเพี้ยนเงียบๆ
    category: CATEGORY_LIST.indexOf(p.category) !== -1 ? p.category : String(p.category || ''),
    document_language: DOC_LANG_LIST.indexOf(p.documentLanguage) !== -1 ? p.documentLanguage : 'th',
    description_language: DOC_LANG_LIST.indexOf(p.descriptionLanguage) !== -1 ? p.descriptionLanguage : 'th',
    document_type: DOC_TYPE_LIST.indexOf(p.documentType) !== -1 ? p.documentType : 'other',
    tags: Array.isArray(p.tags) ? p.tags.join(',') : String(p.tags || ''),
    price_satang: priceSatang,
    old_price_satang: p.oldPrice ? Math.round(Number(p.oldPrice) * 100) : '',
    pages: Math.max(1, Number(p.pages || 1)),
    file_size: String(p.fileSize || 'PDF'),
    rating: Number(p.rating || 0),
    sales: Number(p.sales || 0),
    cover_color: String(p.coverColor || '#1d4ed8'),
    // 📊 สถานะจาก dropdown ในชีต
    //    published = แสดงบนเว็บ / WIP, Paused, Discontinued = ไม่แสดง
    //    ⚠️ ค่าเริ่มต้นต้องเป็น published ไม่ใช่ draft
    //       เพราะ _listProducts กรองเฉพาะ published → ถ้าเป็นอื่น สินค้าจะไม่โผล่บนเว็บเลย
    status: PRODUCT_STATUS_LIST.indexOf(p.status) !== -1 ? p.status : 'published',
    created_at: new Date()
  };

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
      // แก้ไข: เขียนทีละคอลัมน์ตามชื่อ (ไม่ทับ created_at เดิม)
      //
      // 🛡 ข้ามช่องที่มีสูตรอยู่
      //    เจ้าของร้านใช้สูตรในชีต (เช่นคำนวณยอดรวม)
      //    ถ้าเขียนทับ → สูตรหายถาวร แก้ยากมาก
      //    → ให้ระบบข้ามไป แล้วแจ้งว่าข้ามคอลัมน์ไหนบ้าง
      const formulas = sh.getRange(found, 1, 1, headers.length).getFormulas()[0] || [];
      const skipped = [];

      for (const name in values) {
        if (name === 'created_at') continue;
        const c = headers.indexOf(name);
        if (c === -1) continue;

        // 🔒 ช่องนี้มีสูตรอยู่ → ห้ามเขียนทับ
        if (String(formulas[c] || '').charAt(0) === '=') {
          skipped.push(name);
          continue;
        }

        sh.getRange(found, c + 1).setValue(values[name]);
      }

      const note = skipped.length
        ? ' (ข้ามช่องที่มีสูตร: ' + skipped.join(', ') + ')'
        : '';
      return { ok: true, message: 'บันทึกการแก้ไขแล้ว' + note, id: id, skipped: skipped };
    }

    // เพิ่มใหม่: เตรียมแถวตามจำนวนคอลัมน์จริงในชีต แล้วเขียนตามชื่อ
    const cols = headers.length;
    const row = [];
    for (let i = 0; i < cols; i++) row.push('');
    for (const name in values) {
      const c = headers.indexOf(name);
      if (c !== -1) row[c] = values[name];
    }
    sh.appendRow(row);
    return { ok: true, message: 'เพิ่มสินค้าแล้ว', id: id };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ลบสินค้า (เฉพาะแอดมิน)
 * 🛡 ลบจริงจากชีต แต่เก็บประวัติไว้ในคอมเมนต์ช่องข้อมูลเดิม
 */
function _deleteProduct(productId) {
  const id = String(productId || '').trim();
  if (!id) return { ok: false, error: 'ไม่มีรหัสสินค้า' };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUCTS);
    const headers = _header(SHEET_PRODUCTS);
    const data = sh.getDataRange().getValues();
    const cId = headers.indexOf('product_id');
    const cStatus = headers.indexOf('status');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][cId]) === id) {
        // ปัดสถานะเป็น archived แทนการลบแถวทิ้ง
        // → ข้อมูลออเดอร์เก่าที่อ้างถึงสินค้านี้ยังอ้างอิงได้
        if (cStatus !== -1) {
          sh.getRange(i + 1, cStatus + 1).setValue('archived');
          return { ok: true, message: 'ซ่อนสินค้าจากหน้าเว็บแล้ว (เก็บประวัติไว้)', id: id };
        }
        sh.deleteRow(i + 1);
        return { ok: true, message: 'ลบสินค้าแล้ว', id: id };
      }
    }
    return { ok: false, error: 'ไม่พบสินค้านี้' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ยืนยัน / ปฏิเสธการจ่ายเงิน (เฉพาะแอดมิน)
 * ป้องกันการยืนยันซ้ำ: ถ้ายืนยันไปแล้ว จะไม่ทำอะไรอีก
 */
function _verifyOrder(orderId, approve, adminEmail) {
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

    const email = String(adminEmail || '');
    const target = approve ? ORDER_STATUS.PAID : ORDER_STATUS.REJECTED;
    sh.getRange(rowIdx, cStatus + 1).setValue(target);
    sh.getRange(rowIdx, headers.indexOf('verified_by') + 1).setValue(email);
    sh.getRange(rowIdx, headers.indexOf('verified_at') + 1).setValue(new Date());

    let granted = 0;
    if (approve) {
      _increaseSales(String(orderId));
      // ✅ แจกสิทธิ์เข้าคลังไฟล์ของลูกค้าอัตโนมัติ
      granted = _grantLibrary(String(orderId), email);
    }

    return {
      ok: true,
      status: target,
      granted: granted,
      message: approve
        ? 'ยืนยันแล้ว ส่งไฟล์เข้าคลังของลูกค้าเรียบร้อย (' + granted + ' ไฟล์)'
        : 'ปฏิเสธแล้ว'
    };
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

/** ใช้ตอนทดสอบเท่านั้น: ดูสถานะระบบ (ไม่เปิดเผยค่ารหัส) */
function whoAmI() {
  return adminStatus();
}