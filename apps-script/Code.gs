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
const SHEET_CONFIG = 'Config';
const SHEET_USERS = 'user_id';
const SHEET_RATING = 'Rating';

// 🗂️ หมวดหมู่ — ตรงกับ dropdown ในชีต (แก้ในชีตได้ แต่ถ้าเพิ่มค่าใหม่ต้องแจ้ง)
const CATEGORY_LIST = ['ข้อสอบ', 'หนังสือ', 'Flashcard', 'อื่นๆ'];

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




  _ensureSheet(SHEET_CONFIG, ['key', 'value']);
  _ensureSheet(SHEET_USERS, [
    'User_id', 'email', 'password', 'name', 'Creation date', 'last_login'
  ]);
  // เพิ่มคอลัมน์ที่ภายหลังต้องใช้ ให้แท็บเก่าที่สร้างไว้แล้วอัปเดตอัตโนมัติ
  _ensureColumns(SHEET_USERS, ['token', 'login_method']);
  // ⭐ แท็บสินค้าที่ถูกใจ — ผูกกับอีเมลผู้ใช้
  //    ล็อกอินใหม่/เปลี่ยนเครื่อง → ดาวยังอยู่
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
    // 📋 โครงสร้างชีต (อ่านอย่างเดียว ไม่ต้องล็อกอิน) — รองรับทั้ง GET และ POST
    if (action === 'sheet.structure') return _json(_sheetStructure());

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

    // --- ระบบสมาชิก: เข้าสู่ระบบผ่าน Firebase (ทุกคนเรียกได้) ---
    if (action === 'user.firebase') return _json(_firebaseLogin(body));
    if (action === 'user.session') return _json(_session(body));

    if (action === 'user.check') return _json(_checkUser(body.email));

    // --- 📋 โครงสร้างชีตแบบสาธารณะ (ไม่ต้องล็อกอิน) ---
    //    คืนแค่ "ชื่อแท็บ + ชื่อคอลัมน์ + dropdown" ไม่มีข้อมูลลูกค้า/ยอดขาย
    if (action === 'sheet.structure') {
      return _json(_sheetStructure());
    }

    // --- ⭐ ให้คะแนนสินค้า (ต้องล็อกอิน — กันสแปมแบบไม่ระบุตัวตน) ---
    if (action === 'rating.set') {
      const sess = _session(body);
      if (!sess.ok) return _json({ ok: false, error: 'กรุณาเข้าสู่ระบบก่อนให้คะแนน' });
      return _json(_setRating(sess.user, body));
    }
    if (action === 'rating.mine') {
      const sess = _session(body);
      if (!sess.ok) return _json({ ok: false, error: 'กรุณาเข้าสู่ระบบก่อน' });
      return _json(_myRating(sess.user, body.product_id));
    }

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
  const hIdx = _findHeaderRow(data);
  const cEmail = _colIndex(headers, 'email');
  const clean = String(email || '').trim().toLowerCase();

  for (let i = hIdx + 1; i < data.length; i++) {
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
  const c = _colIndex(found.headers, columnName);
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
      const c = _colIndex(headers, name);
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

// ============================ อ่านข้อมูล ============================

function _listProducts() {
  const rows = _readSheet(SHEET_PRODUCTS);
  if (rows.length === 0) return { ok: true, products: [], total: 0, hidden: 0, salesTotal: 0 };

  const published = [];
  const wip = [];
  // 📊 นับสินค้าที่ถูกซ่อน เพื่อบอกหน้าเว็บว่า "มีของแต่ยังไม่เผยแพร่"
  let hidden = 0;
  let salesTotal = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const status = String(r.status || 'published');

    // 📊 สถานะจาก dropdown ในชีต (เจ้าของร้านตั้งเอง)
    //    Published        → แสดง
    //    WIP              → แสดง แต่ไปท้ายสุด + ป้าย "WIP"
    //    Paused/Discontinued → ซ่อน
    if (status === 'Paused' || status === 'Discontinued') {
      hidden++;
      continue;
    }
    if (status !== 'published' && status !== 'WIP') {
      hidden++;
      continue;
    }

    const item = {
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
      price: Math.round(_num(r.price_satang) / 100),
      oldPrice: r.old_price_satang === '' || r.old_price_satang == null
        ? undefined
        : Math.round(_num(r.old_price_satang)),
      pages: _pagesVal(r.pages),
      fileSize: r.file_size,
      // ⭐ คะแนนเฉลี่ย (สูตรในชีตอาจติด error เช่น #DIV/0! → ให้เป็น 0)
      rating: _num(r.rating),
      // 🧾 ยอดขาย: อ่านจากคอลัมน์ sales ในแท็บ Products
      //    (เจ้าของร้านลิงก์สูตร COUNTIF มาจาก Sales Tracker ไว้แล้ว)
      sales: _num(r.sales),
      coverColor: r.cover_color || '#1d4ed8',
      // 📝 หมายเหตุจากเจ้าของร้าน (คอลัมน์ admin_note)
      adminNote: String(r.admin_note || '').trim(),
      // 🖼️ ลิงก์รูปปก (คอลัมน์ cover_url) — ถ้าว่าง เว็บจะใช้ไฟล์ public/covers/{id}.jpg แทน
      coverUrl: String(r.cover_url || '').trim(),
      status: status,
      createdAt: _fmtDate(r.created_at)
    };

    salesTotal += item.sales;

    // 📍 WIP ไปท้ายสุดเสมอ
    if (status === 'WIP') wip.push(item);
    else published.push(item);
  }

  // ⭐ WIP ต้องอยู่ท้ายสุดเสมอ (ไม่ว่าจะเรียงตามอะไร)
  const out = published.concat(wip);

  return {
    ok: true,
    products: out,
    total: rows.length,
    hidden: hidden,
    salesTotal: salesTotal
  };
}

function _productDetail(id) {
  const all = _listProducts();
  const found = all.products.filter(function (p) { return p.id === id; })[0];
  if (!found) return { ok: false, error: 'ไม่พบสินค้า' };
  return { ok: true, product: found };
}


/**
 * ⭐ บันทึกคะแนนสินค้าลงแท็บ "Rating"
 *
 * โครงชีต (เจ้าของร้านสร้างเอง):
 *   แถว 1 = "Rating Data"   แถว 2 = หัวตาราง   แถว 3+ = ข้อมูล
 *   Rating_id | email | User_id | product_id | created_at | rating | comment
 *
 * 🛡 เขียนตาม "ชื่อคอลัมน์" เท่านั้น (เจ้าของร้านจัดโครงชีตเองได้)
 * 🛡 1 คน = 1 แถวต่อ 1 สินค้า → บันทึกซ้ำจะทับแถวเดิม
 * 🛡 ใช้ LockService กันเขียนชนกัน
 */
function _setRating(user, body) {
  const productId = String(body.product_id || '').trim();
  if (!productId) return { ok: false, error: 'ไม่รู้จักสินค้าที่ให้คะแนน' };

  // ⭐ คะแนน: 0 – 5 ขั้นละ 0.5
  const raw = Number(body.rating);
  if (!isFinite(raw) || raw <= 0 || raw > 5) {
    return { ok: false, error: 'คะแนนต้องอยู่ระหว่าง 0.5 ถึง 5 ดาว' };
  }
  const rating = Math.round(raw * 2) / 2;

  const comment = String(body.comment || '').trim().slice(0, 500);
  const email = String(user.email || '').toLowerCase();

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RATING);
    if (!sh) return { ok: false, error: 'ไม่พบแท็บ Rating ในชีต' };

    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastCol < 1) {
      return { ok: false, error: 'แท็บ Rating ยังไม่มีคอลัมน์ กรุณาสร้างหัวตารางก่อน' };
    }
    const all = sh.getRange(1, 1, Math.max(lastRow, 2), lastCol).getValues();
    const hIdx = _findHeaderRow(all);
    const headers = all[hIdx].map(function (h) { return String(h || '').trim(); });

    const cEmail = _colIndex(headers, 'email');
    const cProduct = _colIndex(headers, 'product_id');
    const cId = _colIndex(headers, 'Rating_id');
    const cUser = _colIndex(headers, 'User_id');
    const cAt = _colIndex(headers, 'created_at');
    const cRating = _colIndex(headers, 'rating');
    const cComment = _colIndex(headers, 'comment');

    if (cProduct === -1 || cRating === -1) {
      return { ok: false, error: 'หัวตารางแท็บ Rating ไม่ครบ (ต้องมี product_id และ rating)' };
    }

    // 🔎 หาแถวเดิมของคนคนนี้ + สินค้านี้
    let foundRow = -1;
    for (let r = hIdx + 1; r < all.length; r++) {
      const row = all[r];
      if (!row[0]) continue;
      const rowEmail = String(cEmail !== -1 ? row[cEmail] || '' : '').trim().toLowerCase();
      const rowProduct = String(row[cProduct] || '').trim();
      if (rowEmail === email && rowProduct === productId) { foundRow = r + 1; break; }
    }

    const values = {};
    if (cId !== -1) values[cId] = Utilities.getUuid();
    if (cEmail !== -1) values[cEmail] = email;
    if (cUser !== -1) values[cUser] = user.user_id || '';
    if (cProduct !== -1) values[cProduct] = productId;
    if (cAt !== -1) values[cAt] = new Date();
    if (cRating !== -1) values[cRating] = rating;
    if (cComment !== -1) values[cComment] = comment;

    if (foundRow > 0) {
      // ✏️ แก้แถวเดิม (คง Rating_id เดิมไว้)
      for (const c in values) {
        if (Number(c) === cId) continue;
        sh.getRange(foundRow, Number(c) + 1).setValue(values[c]);
      }
      return { ok: true, message: 'บันทึกคะแนนแล้ว (อัปเดตของเดิม)', rating: rating, row: foundRow };
    }

    // ➕ เพิ่มแถวใหม่
    // 🛡 เขียนต่อท้าย "ข้อมูล" ไม่ใช่ท้ายชีต
    //    (ชีตอาจมีแถวเปล่าเป็นร้อยแถว → appendRow จะไปตกแถว 1000+)
    const dataCols = [];
    for (const name of ['Rating_id', 'email', 'User_id', 'product_id', 'created_at', 'rating', 'comment']) {
      const c = _colIndex(headers, name);
      if (c !== -1) dataCols.push(c);
    }
    if (dataCols.length === 0) dataCols.push(0);

    // หาแถวข้อมูลสุดท้าย (นับจากคอลัมน์ข้อมูล ไม่นับแถวสรุปของเจ้าของร้าน)
    let lastData = hIdx;
    for (let r = hIdx; r < all.length; r++) {
      let has = false;
      for (const c of dataCols) {
        const v = all[r][c];
        if (v !== '' && v !== null && v !== undefined) { has = true; break; }
      }
      if (has) lastData = r;
    }
    let targetRow = lastData + 1;

    // ถ้าแถวนั้นยังมีข้อมูลค้าง (กรณีแท็บมีแถวสรุปของเจ้าของร้านทับ) → เลื่อนลง
    while (targetRow <= all.length) {
      let occupied = false;
      for (const c of dataCols) {
        const v = all[targetRow - 1][c];
        if (v !== '' && v !== null && v !== undefined) { occupied = true; break; }
      }
      if (!occupied) break;
      targetRow++;
    }

    // 🛡 เขียนเฉพาะคอลัมน์ข้อมูลคะแนน (A-G) ทีละช่อง
    //    ห้ามเขียนทับทั้งแถว — เจ้าของร้านมีบล็อกสรุป/สูตรอยู่คอลัมน์อื่น
    for (const c in values) {
      sh.getRange(targetRow, Number(c) + 1).setValue(values[c]);
    }

    return { ok: true, message: 'ขอบคุณสำหรับคะแนน!', rating: rating, row: targetRow };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
}

/** ⭐ คะแนนของผู้ใช้เอง (ใช้เติมช่องตอนเปิดป๊อปอัพครั้งแรก) */
function _myRating(user, productId) {
  const pid = String(productId || '').trim();
  if (!pid) return { ok: false, error: 'ไม่รู้จักสินค้า' };

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RATING);
  if (!sh) return { ok: true, rating: 0, comment: '' };

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return { ok: true, rating: 0, comment: '' };

  const all = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const hIdx = _findHeaderRow(all);
  const headers = all[hIdx].map(function (h) { return String(h || '').trim(); });
  const cEmail = _colIndex(headers, 'email');
  const cProduct = _colIndex(headers, 'product_id');
  const cRating = _colIndex(headers, 'rating');
  const cComment = _colIndex(headers, 'comment');
  if (cProduct === -1 || cRating === -1) return { ok: true, rating: 0, comment: '' };

  const email = String(user.email || '').toLowerCase();
  for (let r = hIdx + 1; r < all.length; r++) {
    const row = all[r];
    if (!row[0]) continue;
    const rowEmail = String(cEmail !== -1 ? row[cEmail] || '' : '').trim().toLowerCase();
    if (rowEmail !== email) continue;
    if (String(row[cProduct] || '').trim() !== pid) continue;
    return {
      ok: true,
      rating: Number(row[cRating] || 0),
      comment: cComment !== -1 ? String(row[cComment] || '') : ''
    };
  }
  return { ok: true, rating: 0, comment: '' };
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

  // 🛡 แท็บที่มีข้อมูลลูกค้า → ไม่แสดงค่า แสดงแค่โครงสร้าง
  const PRIVATE_TABS = ['user_id', 'Favorites', 'Library'];

  for (let i = 0; i < ss.getSheets().length; i++) {
    const sh = ss.getSheets()[i];
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastRow === 0) {
      out.push({ name: sh.getName(), empty: true, headers: [], validations: [] });
      continue;
    }

    // 🔎 หาแถวหัวตารางจริงอัตโนมัติ (บางชีตมีแถวชื่อรายงานที่แถว 1)
    const all = sh.getRange(1, 1, lastRow, lastCol).getValues();
    const hIdx = _findHeaderRow(all);
    const headers = (all[hIdx] || []).map(function (h) {
      return String(h || '');
    });

    // 📋 ตัวอย่างข้อมูล 3 แถว (ไม่แสดงในแท็บที่มีข้อมูลลูกค้า)
    const isPrivate = PRIVATE_TABS.indexOf(sh.getName()) !== -1;
    const sampleRows = Math.min(hIdx + 4, lastRow);

    // 🧮 สูตรใน 4 แถวแรก (มักเป็นที่ทำ dropdown/สูตรคำนวณ)
    //    สูตรไม่ใช่ข้อมูลลูกค้า → แสดงได้ (ช่วยให้เขียนโค้ดให้ตรง)
    const formulas = sh.getRange(1, 1, sampleRows, lastCol).getFormulas();
    const formulaCells = [];
    for (let r = 0; r < formulas.length; r++) {
      for (let c = 0; c < lastCol; c++) {
        const f = String(formulas[r][c] || '');
        if (f.charAt(0) === '=') {
          formulaCells.push({
            cell: _cellRef(r + 1, c + 1),
            column: headers[c] || ('col' + (c + 1)),
            formula: f.length > 300 ? f.slice(0, 300) + ' …' : f
          });
        }
      }
    }

    // 🔽 ตรวจ dropdown (data validation) — ดูทั้งแถวหัวตารางและ 3 แถวข้อมูลแรก
    const validations = [];
    for (let c = 0; c < lastCol; c++) {
      let found = null;
      for (let r = hIdx; r < Math.min(hIdx + 4, lastRow); r++) {
        try {
          const v = sh.getRange(r + 1, c + 1).getDataValidation();
          if (v) {
            found = {
              column: headers[c] || ('col' + (c + 1)),
              type: String(v.getCriteriaType() || ''),
              values: v.getCriteriaValues() || []
            };
            break;
          }
        } catch (e) {
          // ช่องนี้ไม่มี validation
        }
      }
      if (found) validations.push(found);
    }

    const sampleValues = [];
    if (!isPrivate && lastRow > hIdx + 1) {
      for (let r = hIdx + 1; r < Math.min(hIdx + 3, lastRow); r++) {
        const row = {};
        for (let c = 0; c < lastCol; c++) {
          const key = headers[c] || ('col' + (c + 1));
          const f = String(formulas[r][c] || '');
          const v = all[r][c];
          row[key] = f.charAt(0) === '=' ? f : v;
        }
        sampleValues.push(row);
      }
    }

    out.push({
      name: sh.getName(),
      rowCount: lastRow - hIdx - 1,
      columnCount: lastCol,
      headers: headers,
      validations: validations,
      formulas: formulaCells,
      sampleValues: sampleValues,
      hasPrivateData: isPrivate
    });
  }

  return { ok: true, sheets: out };
}

/** ชื่อเซลล์แบบ A1 (ใช้บอกตำแหน่งสูตร) */
function _cellRef(row, col) {
  let letters = '';
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters + row;
}

function _getConfig(key) {
  const rows = _readSheet(SHEET_CONFIG);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].key) === String(key)) return rows[i].value;
  }
  return '';
}

// ============================ เขียนข้อมูล ============================

// ============================ ตัวช่วยเล็ก ๆ ============================

/**
 * 🏷️ ชื่อคอลัมน์มาตรฐาน + ชื่อสำรองที่ยอมรับได้
 *
 * เจ้าของร้านเขียนชื่อคอลัมน์เองได้หลายแบบ (product_id / Product ID / Product-ID)
 * → ระบบหาคอลัมน์แบบยืดหยุ่น ไม่ต้องแก้โค้ดทุกครั้ง
 */
const SHEET_FIELD_ALIASES = {
  product_id: ['productid', 'productcode', 'sku', 'id'],
  title: ['name', 'productname'],
  long_description: ['longdescription', 'descriptionlong', 'detail'],
  document_language: ['documentlang', 'doclang', 'lang'],
  description_language: ['descriptionlang', 'desclang'],
  document_type: ['documenttype', 'doctype'],
  price_satang: ['pricesatang', 'price', 'pricethb'],
  old_price_satang: ['oldpricesatang', 'oldprice'],
  file_size: ['filesize'],
  cover_color: ['covercolor'],
  created_at: ['createdat'],
  user_id: ['userid'],
  favorite_id: ['favoriteid'],
  product_name: ['productname'],
  admin_note: ['adminnote', 'note', 'adminnotes'],
  cover_url: ['coverurl', 'coverimage', 'imageurl', 'image']
};

/**
 * 📝 เพิ่มคอลัมน์ admin_note ในแท็บ Products (ถ้ายังไม่มี)
 *
 * ⚠️ ให้เจ้าของร้านรันเองครั้งเดียว (เลือกฟังก์ชันนี้ใน Apps Script → Run)
 *    เพิ่มคอลัมน์ท้ายสุด → ไม่แตะข้อมูลเดิมในชีต
 */
function setupAdminNote() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUCTS);
  if (!sh) return 'ไม่พบแท็บ Products';

  const lastCol = sh.getLastColumn();
  const lastRow = sh.getLastRow();

  // 🔎 หาแถวหัวตารางจริง (ชีตนี้มีแถวชื่อรายงานที่แถว 1 → หัวตารางอยู่แถว 2)
  const all = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const hIdx = _findHeaderRow(all);
  const headers = all[hIdx].map(function (h) { return String(h || '').trim(); });

  // มีคอลัมน์ admin_note แล้วไหม
  for (let i = 0; i < headers.length; i++) {
    if (_normKey(headers[i]) === 'adminnote') {
      return 'มีคอลัมน์ admin_note อยู่แล้ว (คอลัมน์ที่ ' + (i + 1) + ') — ไม่ต้องทำอะไร ✅';
    }
  }

  // คอลัมน์สุดท้ายยังว่างอยู่ไหม → ใช้ที่เดิม (เผื่อรอนก่อนที่จะเขียนผิดแถว)
  let targetCol = -1;
  for (let i = headers.length - 1; i >= 0; i--) {
    if (headers[i] === '') { targetCol = i + 1; break; }
  }
  if (targetCol === -1) {
    sh.insertColumnAfter(lastCol);
    targetCol = lastCol + 1;
  }

  // ✍️ เขียนชื่อคอลัมน์ลง "แถวหัวตารางจริง" (ไม่ใช่แถว 1)
  sh.getRange(hIdx + 1, targetCol).setValue('admin_note');

  // 🧹 ล้างค่าที่อาจถูกเขียนผิดแถว (แถว 1) ของคอลัมน์นี้
  if (hIdx > 0) {
    const stray = String(sh.getRange(1, targetCol).getValue() || '').trim();
    if (stray === 'admin_note') sh.getRange(1, targetCol).setValue('');
  }

  return 'เพิ่มคอลัมน์ admin_note ที่คอลัมน์ ' + targetCol +
    ' แถวหัวตาราง ' + (hIdx + 1) + ' เรียบร้อย ✅';
}

/**
 * 🔢 อ่านค่าตัวเลขอย่างปลอดภัย
 *
 * ถ้าช่องในชีตเป็นสูตรที่ติด error (เช่น #DIV/0!)
 * → Number() จะได้ NaN → JSON กลายเป็น null → หน้าเว็บพัง
 * → ตรงนี้แปลงเป็น 0 ให้อัตโนมัติ
 */
function _num(v, fallback) {
  const fb = fallback === undefined ? 0 : fallback;
  if (v === '' || v === null || v === undefined) return fb;
  const n = Number(v);
  return isFinite(n) ? n : fb;
}

/**
 * 📄 จำนวนหน้า — รองรับทั้งตัวเลข (80) และข้อความ ("80 ข้อ • 46")
 * เจ้าของร้านเขียนอิสระได้ เว็บก็แสดงตามนั้น
 */
function _pagesVal(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  const n = Number(s);
  return isFinite(n) ? n : s;
}

/** 🧹 ทำให้ชื่อคอลัมน์เทียบกันได้ (ตัดช่องว่าง / _ / - / . และพิมพ์เล็ก) */
function _normKey(s) {
  return String(s == null ? '' : s).trim().toLowerCase().replace(/[\s_\-.]/g, '');
}

/**
 * 🔎 หาแถวหัวตารางอัตโนมัติ
 *
 * เจ้าของร้านอาจใส่แถวชื่อรายงานไว้ก่อนหัวตาราง
 *   แถว 1 = "Product Config"   แถว 2 = ชื่อคอลัมน์   แถว 3+ = ข้อมูล
 *
 * 🛡 เลือกแถวที่ "กว้างที่สุด" ในช่วง 8 แถวแรก (แถวชื่อรายงานมักมีไม่กี่ช่อง)
 * 🛡 ข้ามแถวที่เป็นตัวเลขล้วน (แถวข้อมูล ไม่ใช่หัวตาราง)
 */
function _findHeaderRow(vals) {
  const maxScan = Math.min(8, vals.length);
  const candidates = [];

  for (let r = 0; r < maxScan; r++) {
    const cells = vals[r] || [];
    let filled = 0;
    let texts = 0;
    for (let c = 0; c < cells.length; c++) {
      const v = cells[c];
      if (v === '' || v === null || v === undefined) continue;
      filled++;
      if (typeof v === 'string') texts++;
    }
    if (filled < 2) continue;                       // แถวชื่อรายงานมีช่องเดียว → ข้าม
    if (texts < filled * 0.6) continue;            // แถวตัวเลขล้วน → ไม่ใช่หัวตาราง

    // แถวถัดไปต้องมีข้อมูล (กันเลือกหัวตารางที่อยู่ท้ายสุด)
    let nextHasData = false;
    if (r + 1 < vals.length) {
      const nrow = vals[r + 1] || [];
      for (let c = 0; c < nrow.length; c++) {
        const v = nrow[c];
        if (v !== '' && v !== null && v !== undefined) { nextHasData = true; break; }
      }
    }
    if (!nextHasData) continue;

    candidates.push({ row: r, score: filled });
  }

  if (candidates.length) {
    let maxScore = 0;
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i].score > maxScore) maxScore = candidates[i].score;
    }

    // เลือกแถวแรกที่ "เกือบกว้างที่สุด" (แถวชื่อรายงานแคบเกินไป → ตกรอบ)
    const floor = maxScore * 0.6;
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i].score >= floor) return candidates[i].row;
    }
    return candidates[0].row;
  }

  // 🆘 ยังไม่มีแถวข้อมูลเลย (เช่นแท็บใหม่ที่เพิ่งสร้าง)
  //    → ใช้แถวหัวตารางที่กว้างที่สุดใน 8 แถวแรกแทน
  let best = 0;
  let bestScore = 0;
  for (let r = 0; r < maxScan; r++) {
    const cells = vals[r] || [];
    let filled = 0;
    let texts = 0;
    for (let c = 0; c < cells.length; c++) {
      const v = cells[c];
      if (v === '' || v === null || v === undefined) continue;
      filled++;
      if (typeof v === 'string') texts++;
    }
    if (filled < 2) continue;
    if (texts < filled * 0.6) continue;
    if (filled > bestScore) { bestScore = filled; best = r; }
  }
  return best;
}

/** 🔎 หาเลขคอลัมน์จากชื่อ (ยืดหยุ่น ไม่สนเครื่องหมาย) */
function _colIndex(headers, name) {
  const n = _normKey(name);
  for (let i = 0; i < headers.length; i++) {
    if (_normKey(headers[i]) === n) return i;
  }
  const al = SHEET_FIELD_ALIASES[name] || [];
  for (let j = 0; j < al.length; j++) {
    const a = _normKey(al[j]);
    for (let i = 0; i < headers.length; i++) {
      if (_normKey(headers[i]) === a) return i;
    }
  }
  return -1;
}

/** 🏷️ เติมค่าตามชื่อคอลัมน์มาตรฐาน (รองรับทั้งชื่อเต็มและชื่อย่อ) */
function _resolveFields(obj, norm) {
  for (const field in SHEET_FIELD_ALIASES) {
    if (obj[field] !== undefined) continue;
    const n = _normKey(field);
    if (norm[n] !== undefined) { obj[field] = norm[n]; continue; }
    const al = SHEET_FIELD_ALIASES[field];
    for (let j = 0; j < al.length; j++) {
      const a = _normKey(al[j]);
      if (norm[a] !== undefined) { obj[field] = norm[a]; break; }
    }
  }
  return obj;
}

/** 📋 หัวตารางของชีต (หาแถวหัวตารางอัตโนมัติ) */
function _header(sheetName) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) return [];
  const vals = sh.getDataRange().getValues();
  if (!vals.length) return [];
  const hIdx = _findHeaderRow(vals);
  return vals[hIdx].map(function (h) { return String(h || '').trim(); });
}

/** 📋 อ่านข้อมูลทั้งชีต (หาแถวหัวตารางอัตโนมัติ + รองรับชื่อคอลัมน์หลายแบบ) */
function _readSheet(sheetName) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) return [];
  const vals = sh.getDataRange().getValues();
  if (vals.length <= 1) return [];

  const hIdx = _findHeaderRow(vals);
  const headers = vals[hIdx].map(function (h) { return String(h || '').trim(); });

  const out = [];
  for (let i = hIdx + 1; i < vals.length; i++) {
    const row = vals[i];
    if (!row[0]) continue; // แถวว่าง
    const obj = {};
    const norm = {};
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c];
      if (!h) continue;
      obj[h] = row[c];
      const n = _normKey(h);
      if (n && norm[n] === undefined) norm[n] = row[c];
    }
    _resolveFields(obj, norm);
    out.push(obj);
  }
  return out;
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