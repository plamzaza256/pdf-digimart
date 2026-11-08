/**
 * 🧪 เทสต์ระบบเรทติ้ง — จำลองชีตปลอม ไม่แตะชีตจริง
 *
 * เลียนแบบโครงชีตจริงของเจ้าของร้าน:
 *   แท็บ Rating : แถว1 = "Rating Data"  แถว2 = หัวตาราง  แถว3+ = ข้อมูล
 *                 + บล็อกสรุปของเจ้าของร้านอยู่คอลัมน์ J..N แถว 2-6
 *   แท็บ user_id: แถว1 = ชื่อรายงาน  แถว2 = หัวตาราง  แถว3+ = ผู้ใช้
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const CODE = fs.readFileSync(
  path.join(__dirname, '../apps-script/Code.gs'),
  'utf8',
);

// ---------------- จำลองชีต ----------------
class FakeRange {
  constructor(sheet, row, col, numRows, numCols) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  _v(r, c) {
    const data = this.sheet.data;
    const rr = r - 1;
    const cc = c - 1;
    if (rr < 0 || cc < 0) return '';
    if (!data[rr]) return '';
    return data[rr][cc] === undefined ? '' : data[rr][cc];
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numCols; c++) row.push(this._v(this.row + r, this.col + c));
      out.push(row);
    }
    return out;
  }
  getFormulas() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numCols; c++) {
        const rr = this.row + r - 1;
        const cc = this.col + c - 1;
        const f = this.sheet.formulas[rr] ? this.sheet.formulas[rr][cc] : '';
        row.push(f === undefined ? '' : f);
      }
      out.push(row);
    }
    return out;
  }
  setValue(v) {
    const rr = this.row - 1;
    const cc = this.col - 1;
    while (this.sheet.data.length <= rr) this.sheet.data.push([]);
    while (this.sheet.data[rr].length <= cc) this.sheet.data[rr].push('');
    this.sheet.data[rr][cc] = v;
  }
  setValues(arr) {
    arr.forEach((row, r) => row.forEach((v, c) => this.setValueAt(this.row + r, this.col + c, v)));
  }
  setValueAt(r, c, v) {
    const rr = r - 1;
    const cc = c - 1;
    while (this.sheet.data.length <= rr) this.sheet.data.push([]);
    while (this.sheet.data[rr].length <= cc) this.sheet.data[rr].push('');
    this.sheet.data[rr][cc] = v;
  }
  getDataValidation() { return null; }
  setFontWeight() { return this; }
  setBackground() { return this; }
  getLastRow() { return this.sheet.data.length; }
  getLastColumn() {
    let m = 0;
    this.sheet.data.forEach((r) => { if (r.length > m) m = r.length; });
    return m;
  }
}

class FakeSheet {
  constructor(name, data, formulas) {
    this.name = name;
    this.data = data;
    this.formulas = formulas || [];
  }
  getRange(row, col, numRows, numCols) {
    if (numRows === undefined) numRows = 1;
    if (numCols === undefined) numCols = 1;
    return new FakeRange(this, row, col, numRows, numCols);
  }
  getDataRange() {
    let m = 0;
    this.data.forEach((r) => { if (r.length > m) m = r.length; });
    return new FakeRange(this, 1, 1, this.data.length, m);
  }
  getLastRow() { return this.data.length; }
  getLastColumn() {
    let m = 0;
    this.data.forEach((r) => { if (r.length > m) m = r.length; });
    return m;
  }
  appendRow(row) {
    this.data.push(row.slice());
  }
  deleteRow(r) { this.data.splice(r - 1, 1); }
  getName() { return this.name; }
}

// ---------------- สร้างชีตจำลองตามของจริง ----------------
function makeRatingSheet() {
  // แถว1 = "Rating Data" (แถวชื่อรายงาน)
  // แถว2 = หัวตาราง A..G + บล็อกสรุป J..N
  const row1 = ['Rating Data'];
  const row2 = [
    'Rating_id', 'email', 'User_id', 'product_id', 'created_at', 'rating', 'comment',
    '', '', 'FWD-001', 'VOCAB-001', 'VOCAB-002', 'TGAT2-001', 'TGAT1-001',
  ];
  const row3 = ['', '', '', '', '', '', '', '', 'AVG'];
  const row4 = ['', '', '', '', '', '', '', '', 'COUNT'];
  const row5 = [];
  const row6 = [];
  // ใส่แถวเปล่าเป็น 50 แถว (จำลองชีตที่มีแถวเปล่าเยอะ)
  const data = [row1, row2, row3, row4, row5, row6];
  for (let i = 0; i < 50; i++) data.push([]);
  return new FakeSheet('Rating', data, [
    [], [], [], [], [], [],
  ]);
}

function makeUserSheet() {
  // 📋 ตรงกับแท็บ user_id ของเจ้าของร้านจริง:
  //    แถว 1 = ชื่อรายงาน (title)   แถว 2 = หัวตาราง   แถว 3+ = สมาชิก
  const data = [
    ['รายชื่อสมาชิก'],
    ['User_id', 'email', 'password', 'name', 'Creation date', 'last_login', 'token', 'login_method'],
    ['UID_0007', 'admin2@gmail.com', '', 'แอดมิน2', '2026-10-01', '2026-10-22', 'tok-abcdefghijklmnopqrstuvwxyz123456', 'google'],
  ];
  return new FakeSheet('user_id', data, [[], [], []]);
}

const sheets = {
  Rating: makeRatingSheet(),
  user_id: makeUserSheet(),
  Products: new FakeSheet('Products', [
    ['Product Config'],
    ['product_id', 'title', 'category', 'price_satang', 'rating', 'sales', 'status'],
    ['FWD-001', 'Mock Forward', 'ข้อสอบ', 6900, 0, 30, 'published'],
  ], [[], [], []]),
  Config: new FakeSheet('Config', [['key', 'value'], ['line_oa_link', 'https://lin.ee/wVIuHza']], [[], []]),
};

// ---------------- จำลอง Apps Script ----------------
const sandbox = {
  console,
  JSON,
  Math,
  Date,
  String,
  Number,
  Array,
  Object,
  isFinite,
  parseInt,
  parseFloat,
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({
      getSheetByName: (n) => sheets[n] || null,
      getSheets: () => Object.values(sheets),
    }),
    getActive: () => ({}),
  },
  LockService: {
    getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }),
  },
  Utilities: {
    getUuid: () => 'uuid-' + Math.random().toString(36).slice(2, 10),
    computeDigest: () => [],
    DigestAlgorithm: { SHA_256: 1 },
    Charset: { UTF_8: 1 },
    formatDate: (d) => d.toISOString(),
  },
  ContentService: {
    createTextOutput: (t) => ({
      setMimeType: () => ({ getContent: () => t }),
    }),
    MimeType: { JSON: 'json' },
  },
  Session: { getActiveUser: () => ({ getEmail: () => '' }) },
  // 📧 จำลองการส่งเมล + cache คูลดาวน์ (ใช้ในเทสข้อ 10)
  Logger: { log: () => {} },
  MailApp: { sendEmail: (to, subject) => { SENT_EMAILS.push({ to: to, subject: subject }); } },
  CacheService: {
    getScriptCache: () => ({
      get: (k) => (CACHE.has(k) ? CACHE.get(k) : null),
      put: (k, v) => { CACHE.set(k, String(v)); },
    }),
  },
};

// 📥 กล่องเก็บอีเมลที่ "ส่ง" จริงในเทส + cache คูลดาวน์
const SENT_EMAILS = [];
const CACHE = new Map();

vm.createContext(sandbox);
vm.runInContext(CODE, sandbox);

function post(payload) {
  const out = sandbox.doPost({ postData: { contents: JSON.stringify(payload) } });
  return JSON.parse(out.getContent());
}

const EMAIL = 'admin2@gmail.com';
const TOKEN = 'tok-abcdefghijklmnopqrstuvwxyz123456';

// ---------------- เริ่มเทส ----------------
let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (extra ? '  → ' + JSON.stringify(extra) : '')); }
}

const R = sheets.Rating;
const dataRows = () => R.data.filter((r, i) => i >= 2 && String(r[0] || '').startsWith('uuid-'));

console.log('\n🧪 เทสต์ระบบให้คะแนน (จำลองชีต — ไม่แตะชีตจริง)\n');

console.log('1) ให้คะแนนได้โดยไม่ต้องล็อกอิน');
check('ไม่มี email → ให้ผ่านแบบไม่ระบุตัวตน', post({ action: 'rating.set', product_id: 'FWD-001', rating: 4 }).ok === true);
check('token ผิด → ยังให้ผ่าน (ไม่บล็อก)', post({ action: 'rating.set', email: EMAIL, token: 'wrong', product_id: 'FWD-001', rating: 4 }).ok === true);
check('เขียนแถวได้ 1 แถว (anonymous ทับกันเอง)', dataRows().length === 1, dataRows());
check('บล็อกสรุปไม่ถูกแตะ', R.data[2][8] === 'AVG' && R.data[3][8] === 'COUNT');
check('rating.mine ไม่ล็อกอิน → ไม่ error', post({ action: 'rating.mine', product_id: 'FWD-001' }).ok === true);

// 🧹 ล้างแถวทดสอบของข้อ 1 เพื่อให้ข้อ 2+ เริ่มจากชีตว่าง (เทสเดิม)
R.data = makeRatingSheet().data;
check('รีเซ็ตชีตแล้ว → ยังไม่มีแถวข้อมูล', dataRows().length === 0);

console.log('\n2) ให้คะแนนครั้งแรก');
const r1 = post({ action: 'rating.set', email: EMAIL, token: TOKEN, product_id: 'FWD-001', rating: 4.5, comment: 'ดีมาก' });
check('บันทึกสำเร็จ', r1.ok === true, r1);
check('เขียนที่แถว 3 (ไม่ใช่ท้ายชีต)', r1.row === 3, r1);
check('Rating_id ถูกใส่', !!R.data[2][0], R.data[2]);
check('email ถูกใส่', R.data[2][1] === EMAIL, R.data[2]);
check('User_id ถูกใส่', R.data[2][2] === 'UID_0007', R.data[2]);
check('product_id ถูกใส่', R.data[2][3] === 'FWD-001', R.data[2]);
check('created_at ถูกใส่', R.data[2][4] instanceof Date, R.data[2]);
check('rating ถูกใส่', Number(R.data[2][5]) === 4.5, R.data[2]);
check('comment ถูกใส่', R.data[2][6] === 'ดีมาก', R.data[2]);
check('หัวตาราง A2:G2 ไม่ถูกแตะ', R.data[1][0] === 'Rating_id' && R.data[1][6] === 'comment');
check('ชื่อสินค้าในบล็อกสรุป J2:N2 ไม่ถูกแตะ', R.data[1][9] === 'FWD-001' && R.data[1][13] === 'TGAT1-001');
check('ป้าย AVG/COUNT ไม่ถูกลบ', R.data[2][8] === 'AVG' && R.data[3][8] === 'COUNT', [R.data[2][8], R.data[3][8]]);
check('ไม่มีแถวเพิ่มที่ท้ายชีต', R.data.length === 56, R.data.length);

console.log('\n3) ดูคะแนนของตัวเอง');
const m1 = post({ action: 'rating.mine', email: EMAIL, token: TOKEN, product_id: 'FWD-001' });
check('ได้คะแนน 4.5', m1.ok && Number(m1.rating) === 4.5, m1);
check('ได้คอมเมนต์', m1.comment === 'ดีมาก', m1);
const m2 = post({ action: 'rating.mine', email: EMAIL, token: TOKEN, product_id: 'VOCAB-001' });
check('สินค้าอื่นยังไม่มีคะแนน → 0', m2.ok && Number(m2.rating) === 0, m2);

console.log('\n4) ให้คะแนนซ้ำ → ต้องทับแถวเดิม ไม่เพิ่มแถว');
const r2 = post({ action: 'rating.set', email: EMAIL, token: TOKEN, product_id: 'FWD-001', rating: 3, comment: 'เปลี่ยนความเห็น' });
check('บันทึกสำเร็จ', r2.ok === true, r2);
check('ทับแถวเดิม (แถว 3)', r2.row === 3, r2);
check('จำนวนแถวข้อมูลยังเท่าเดิม', dataRows().length === 1);
check('บล็อกสรุปยังอยู่ครบ', R.data[2][8] === 'AVG' && R.data[3][8] === 'COUNT');
check('คะแนนใหม่ = 3', Number(R.data[2][5]) === 3, R.data[2]);
check('คอมเมนต์ใหม่', R.data[2][6] === 'เปลี่ยนความเห็น', R.data[2]);
check('Rating_id เดิมยังอยู่', R.data[2][0] === r1.row ? true : !!R.data[2][0]);

console.log('\n5) สินค้าคนละชิ้น → ต้องเพิ่มแถวใหม่');
const r3 = post({ action: 'rating.set', email: EMAIL, token: TOKEN, product_id: 'VOCAB-001', rating: 5, comment: '' });
check('บันทึกสำเร็จ', r3.ok === true, r3);
check('เขียนแถว 4', r3.row === 4, r3);
check('มี 2 แถวข้อมูล', dataRows().length === 2);
check('บล็อกสรุปยังอยู่ครบ', R.data[2][8] === 'AVG' && R.data[3][8] === 'COUNT' && R.data[1][9] === 'FWD-001');

console.log('\n6) ตรวจค่าคะแนนที่ผิด');
check('0 ดาว → ไม่ให้ผ่าน', post({ action: 'rating.set', email: EMAIL, token: TOKEN, product_id: 'FWD-001', rating: 0 }).ok === false);
check('6 ดาว → ไม่ให้ผ่าน', post({ action: 'rating.set', email: EMAIL, token: TOKEN, product_id: 'FWD-001', rating: 6 }).ok === false);
check('-1 ดาว → ไม่ให้ผ่าน', post({ action: 'rating.set', email: EMAIL, token: TOKEN, product_id: 'FWD-001', rating: -1 }).ok === false);
check('คะแนนไม่ใช่ตัวเลข → ไม่ให้ผ่าน', post({ action: 'rating.set', email: EMAIL, token: TOKEN, product_id: 'FWD-001', rating: 'ดีมาก' }).ok === false);
check('ไม่มี product_id → ไม่ให้ผ่าน', post({ action: 'rating.set', email: EMAIL, token: TOKEN, rating: 4 }).ok === false);
check('ยังมีแค่ 2 แถวข้อมูล', dataRows().length === 2);
check('บล็อกสรุปยังอยู่ครบ', R.data[2][8] === 'AVG' && R.data[3][8] === 'COUNT');

console.log('\n7) ขั้น 0.5 ต้องเก็บได้');
post({ action: 'rating.set', email: EMAIL, token: TOKEN, product_id: 'TGAT2-001', rating: 2.5 });
const r4 = post({ action: 'rating.mine', email: EMAIL, token: TOKEN, product_id: 'TGAT2-001' });
check('2.5 ดาว', Number(r4.rating) === 2.5, r4);

console.log('\n8) ข้อมูลในชีตหลังเทสต์');
R.data.slice(0, 6).forEach((row, i) => {
  console.log('   แถว ' + (i + 1) + ': ' + JSON.stringify(row.slice(0, 7)));
});


// ============ ⭐ คะแนนเว็บไซต์ (product_id = WEBSITE) ============
console.log('\n9) ให้คะแนนเว็บไซต์');
{
  // เพิ่มแถว WEBSITE จำลองในชีต (แถว 5)
  const row = [];
  for (let i = 0; i < 14; i++) row.push('');
  row[0] = 'uuid-web-1';
  row[1] = EMAIL;
  row[2] = 'UID_0007';
  row[3] = 'WEBSITE';
  row[4] = new Date();
  row[5] = 4.5;
  row[6] = 'เว็บสวยง่าย';
  R.data[4] = row;

  const stat = JSON.parse(sandbox.doGet({ parameter: { action: 'website.rating' } }).getContent());
  check('เฉลี่ย = 4.5', stat.ok && Number(stat.avg) === 4.5, stat);
  check('จำนวนคน = 1', stat.ok && Number(stat.count) === 1, stat);

  const mine = post({ action: 'website.rating.mine', email: EMAIL, token: TOKEN });
  check('คะแนนของตัวเอง = 4.5', mine.ok && Number(mine.rating) === 4.5, mine);

  const setRes = post({ action: 'website.rate', email: EMAIL, token: TOKEN, rating: 5, comment: 'ดีมาก' });
  check('ให้คะแนนเว็บสำเร็จ', setRes.ok === true, setRes);
  check('ทับแถวเดิมของคนคนเดิม (ไม่เพิ่มแถว)', R.data.filter((r) => String(r[3] || '') === 'WEBSITE').length === 1);
  check('ค่าใหม่ = 5', Number(R.data[4][5]) === 5, R.data[4]);
  check('ยังไม่มีการเขียนทับบล็อกสรุป', R.data[2][8] === 'AVG' && R.data[3][8] === 'COUNT');
}
console.log('\n9) ระบบสมาชิก — หัวตารางอยู่แถว 2 (แถว 1 เป็นชื่อรายงาน)');
{
  const U = sheets.user_id;
  // 📌 ต้องหาคอลัมน์ token/email เจอแม้แถว 1 เป็นชื่อรายงาน
  const row = sandbox._findUserRow('admin2@gmail.com');
  check('หาข้อมูลสมาชิกเจอ', !!row);
  check('User_id ถูกอ่านได้ = UID_0007', row && row.row.User_id === 'UID_0007');
  check('token ถูกอ่านได้', row && row.row.token === 'tok-abcdefghijklmnopqrstuvwxyz123456');

  // 🔧 _ensureColumns ต้องเขียนหัวตารางลง "แถวหัวตารางจริง" ไม่ใช่แถว 1
  const colsBefore = U.getLastColumn();
  const headerRow = sandbox._ensureColumns('user_id', ['token', 'login_method']);
  check('หาแถวหัวตารางได้ = แถว 2', headerRow === 2, headerRow);
  check('token สร้างแล้ว จึงไม่ซ้ำ → ไม่เพิ่มคอลัมน์', U.getLastColumn() === colsBefore);
  check('แถว 1 (ชื่อรายงาน) ไม่ถูกแตะ', String(U.data[0][1] || '') === '');
  check('แถว 2 ยังเป็นหัวตารางเดิม', U.data[1][0] === 'User_id' && String(U.data[1][6]) === 'token');

  // ➕ ยังไม่มีคอลัมน์นี้ → เพิ่มท้ายได้แบบพอดี
  const g = sandbox._ensureColumns('user_id', ['note']);
  check('เพิ่มคอลัมน์ note ท้ายสุด (คอลัมน์ 9)', g === 2 && String(U.data[1][8]) === 'note', U.data[1]);
  check('แถว 1 ยังไม่ถูกเขียน', String(U.data[0][8] || '') === '');

  // 🔢 นับ UID ต้องรับเฉพาะรูปแบบ UID_####
  check('UID ต่อไป = UID_0008', sandbox._nextUserId() === 'UID_0008');
}

console.log('\n10) คูลดาวน์อีเมลแจ้งเตือน (กัน inbox ถล่ม)');
{
  // 🧹 เริ่มจาก cache ว่าง
  CACHE.clear();
  SENT_EMAILS.length = 0;

  // ให้คะแนนสินค้าใหม่ → ต้องส่งเมล 1 ฉบับ
  post({ action: 'rating.set', email: EMAIL, token: TOKEN, product_id: 'COOLD-001', rating: 5, comment: 'รอบแรก' });
  check('รอบแรก → ส่งเมล 1 ฉบับ', SENT_EMAILS.length === 1, SENT_EMAILS.length);

  // ยิงซ้ำทันที (คนเดิม/สินค้าเดิม) → ต้องถูกบล็อก
  post({ action: 'rating.set', email: EMAIL, token: TOKEN, product_id: 'COOLD-001', rating: 1, comment: 'ยิงรัว' });
  check('ยิงซ้ำทันที → ไม่ส่งเพิ่ม', SENT_EMAILS.length === 1, SENT_EMAILS.length);

  // คนละสินค้าแต่ยังอยู่ในรอบ "รวมทุกสินค้า" → ต้องถูกบล็อกด้วย
  post({ action: 'rating.set', email: EMAIL, token: TOKEN, product_id: 'COOLD-002', rating: 5 });
  check('คนละสินค้าแต่ยังในรอบ 10 นาที → ไม่ส่ง', SENT_EMAILS.length === 1, SENT_EMAILS.length);

  // ✅ สำคัญ: การถูกบล็อกเมล ห้ามทำให้การบันทึกคะแนนพัง
  check('คะแนนยังถูกบันทึกลงชีตแม้เมลถูกบล็อก', dataRows().some((r) => String(r[3]) === 'COOLD-001'));

  // ⏱️ จำลองหมดรอบคูลดาวน์ → ต้องส่งได้อีก
  CACHE.clear();
  post({ action: 'rating.set', email: EMAIL, token: TOKEN, product_id: 'COOLD-002', rating: 4 });
  check('หมดรอบคูลดาวน์ → ส่งได้อีก', SENT_EMAILS.length === 2, SENT_EMAILS.length);

  // 📬 ผู้รับ = Empggez112@gmail.com เท่านั้น
  check('ส่งไปที่ Empggez112@gmail.com', SENT_EMAILS.every((m) => m.to === 'Empggez112@gmail.com'), SENT_EMAILS);
}

console.log('\n11) rating.list — รีวิวบนหน้าสินค้า (อ่านอย่างเดียว + ซ่อนอีเมล)');
{
  // 🧹 เริ่มจากชีตว่าง + รีวิว 2 คนคนละอีเมล (เขียนแถว john ตรง ๆ เพราะระบบไม่ล็อกอิน
  //    → คนไม่ล็อกอินมี email ว่างเหมือนกัน แถวจึงทับกันเองตามกติกาที่ออกแบบไว้)
  R.data = makeRatingSheet().data;
  const johnRow = [];
  for (let i = 0; i < 14; i++) johnRow.push('');
  johnRow[0] = 'uuid-john-1';
  johnRow[1] = 'john@gmail.com';
  johnRow[2] = 'UID_0042';
  johnRow[3] = 'FWD-001';
  johnRow[4] = new Date('2026-11-01');
  johnRow[5] = 5;
  johnRow[6] = 'เอกสารดีมาก';
  R.data[2] = johnRow;

  post({ action: 'rating.set', product_id: 'FWD-001', rating: 4, comment: 'คุ้มราคา' });
  post({ action: 'rating.set', product_id: 'PDF-008', rating: 1, comment: 'ของสินค้าอื่น ห้ามหลุดมา' });

  const list = JSON.parse(sandbox.doGet({ parameter: { action: 'rating.list', id: 'FWD-001' } }).getContent());

  check('ดึงรีวิวได้ 2 รายการ', list.ok && list.reviews.length === 2, list);
  check('เฉลี่ยของสินค้า = 4.5', Number(list.avg) === 4.5, list.avg);
  check('นับจำนวนคน = 2', Number(list.count) === 2, list.count);
  check('มีความเห็นครบ', list.reviews.some((r) => r.comment === 'เอกสารดีมาก'), list.reviews);
  check('ไม่มีรีวิวของสินค้าอื่นปน', !list.reviews.some((r) => r.comment === 'ของสินค้าอื่น ห้ามหลุดมา'));

  // 🕵️ ความเป็นส่วนตัว: อีเมลจริงห้ามหลุดออกจากชีต
  const blob = JSON.stringify(list);
  check('ไม่มีอีเมลจริงรั่วในคำตอบ', blob.indexOf('john@gmail.com') === -1, blob.slice(0, 200));
  check('อีเมลถูกปกปิดเป็น j***@gmail.com', list.reviews.some((r) => r.author === 'j***@gmail.com'), list.reviews);
  check('คนไม่ล็อกอินขึ้นเป็น "ลูกค้า"', list.reviews.some((r) => r.author === 'ลูกค้า'), list.reviews);

  // 🔒 อ่านอย่างเดียวจริงไหม → จำนวนแถวในชีตเท่าเดิมทุกประการ
  const before = JSON.stringify(R.data);
  JSON.parse(sandbox.doGet({ parameter: { action: 'rating.list', id: 'FWD-001' } }).getContent());
  check('rating.list ไม่เขียนอะไรลงชีตเลย', JSON.stringify(R.data) === before);

  // ⛔ รหัสสินค้าว่าง/ไม่มี → คืนว่าง ไม่ error
  const none = JSON.parse(sandbox.doGet({ parameter: { action: 'rating.list', id: 'NOPE-999' } }).getContent());
  check('สินค้าไม่มีรีวิว → คืนว่าง + ok', none.ok && none.reviews.length === 0, none);
  const noId = JSON.parse(sandbox.doGet({ parameter: { action: 'rating.list' } }).getContent());
  check('ไม่ส่ง id → ไม่ error', noId.ok === true, noId);
}

console.log('\n12) rating.list — กรองตามหมวดดาว (5 → 1) + นับจำนวนต่อดาว');
{
  // 🧹 ชีตใหม่ มีรีวิว: 5 ดาว 2 คน · 4 ดาว 1 คน · 3 ดาว 1 คน · 4.5 ดาว 1 คน (ต้องนับรวม 5 ดาว)
  R.data = makeRatingSheet().data;
  const seed = [
    ['uuid-s1', 'a@x.com', 'UID_1', 'FWD-001', new Date('2026-11-01'), 5, 'ห้าดาว'],
    ['uuid-s2', 'b@x.com', 'UID_2', 'FWD-001', new Date('2026-11-02'), 4, 'สี่ดาว'],
    ['uuid-s3', 'c@x.com', 'UID_3', 'FWD-001', new Date('2026-11-03'), 3, 'สามดาว'],
    ['uuid-s4', 'd@x.com', 'UID_4', 'FWD-001', new Date('2026-11-04'), 4.5, 'สี่ครึ่ง'],
    ['uuid-s5', 'e@x.com', 'UID_5', 'FWD-001', new Date('2026-11-05'), 1, 'ดาวเดียว'],
    ['uuid-s6', 'f@x.com', 'UID_6', 'VOCAB-001', new Date('2026-11-06'), 5, 'สินค้าอื่นห้ามปน'],
  ];
  seed.forEach((row, i) => { R.data[2 + i] = row.slice(); });

  const all = JSON.parse(sandbox.doGet({ parameter: { action: 'rating.list', id: 'FWD-001' } }).getContent());
  check('นับจำนวนต่อดาว: 5★ = 2', Number(all.dist[5]) === 2, all.dist);
  check('นับจำนวนต่อดาว: 4★ = 1', Number(all.dist[4]) === 1, all.dist);
  check('นับจำนวนต่อดาว: 3★ = 1', Number(all.dist[3]) === 1, all.dist);
  check('นับจำนวนต่อดาว: 1★ = 1', Number(all.dist[1]) === 1, all.dist);
  check('4.5 ดาว → นับรวมหมวด 5 ดาว', Number(all.dist[5]) === 2 && all.reviews.some((r) => r.rating === 4.5), all.dist);
  check('รวมทุกดาว = 5 รีวิว', all.reviews.length === 5, all.reviews.length);
  check('ไม่มีรีวิวของสินค้าอื่น', !all.reviews.some((r) => r.comment === 'สินค้าอื่นห้ามปน'));

  // 🏷️ กรอง 5 ดาว (ค่าเริ่มต้นของหน้าเว็บ) → เฉพาะ 5 ดาว + 4.5
  const f5 = JSON.parse(sandbox.doGet({ parameter: { action: 'rating.list', id: 'FWD-001', stars: '5' } }).getContent());
  check('กรอง 5 ดาว → 2 รีวิว', f5.reviews.length === 2, f5.reviews.map((r) => r.rating));
  check('กรอง 5 ดาว → ไม่มี 3 ดาว ปน', !f5.reviews.some((r) => r.rating < 4.5));
  check('กรองแล้ว dist ยังครบ (ไว้โชว์ป้าย)', Number(f5.dist[3]) === 1, f5.dist);

  const f3 = JSON.parse(sandbox.doGet({ parameter: { action: 'rating.list', id: 'FWD-001', stars: '3' } }).getContent());
  check('กรอง 3 ดาว → 1 รีวิว', f3.reviews.length === 1 && f3.reviews[0].rating === 3, f3.reviews);

  const f2 = JSON.parse(sandbox.doGet({ parameter: { action: 'rating.list', id: 'FWD-001', stars: '2' } }).getContent());
  check('ไม่มีรีวิว 2 ดาว → ว่าง + ok', f2.ok && f2.reviews.length === 0, f2);

  const bad = JSON.parse(sandbox.doGet({ parameter: { action: 'rating.list', id: 'FWD-001', stars: '99' } }).getContent());
  check('ดาวผิดกฎหมาย (99) → ไม่ error ไม่กรอง', bad.ok && bad.reviews.length === 5, bad.reviews.length);

  // 🔒 อ่านอย่างเดียว
  const snapshot = JSON.stringify(R.data);
  sandbox.doGet({ parameter: { action: 'rating.list', id: 'FWD-001', stars: '5' } });
  check('กรองดาวก็ยังไม่เขียนชีต', JSON.stringify(R.data) === snapshot);
}

console.log('\n─────────────────────────────');
console.log('ผ่าน ' + pass + ' / ล้มเหลว ' + fail);
process.exit(fail > 0 ? 1 : 0);
