/**
 * 🧪 เทสต์ระบบเรทติ้ง — จำลองชีตปลอม ไม่แตะชีตจริง
 *
 * เลียนแบบโครงชีตจริงของเจ้าของร้าน:
 *   แท็บ Rating : แถว1 = "Rating Data"  แถว2 = หัวตาราง  แถว3+ = ข้อมูล
 *                 + บล็อกสรุปของเจ้าของร้านอยู่คอลัมน์ J..N แถว 2-6
 *   แท็บ user_id: แถว1 = หัวตาราง  แถว2+ = ผู้ใช้
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
  const data = [
    ['User_id', 'email', 'password', 'name', 'Creation date', 'last_login', 'token', 'login_method'],
    ['UID_0007', 'admin2@gmail.com', '', 'แอดมิน2', '2026-10-01', '2026-10-22', 'tok-abcdefghijklmnopqrstuvwxyz123456', 'google'],
  ];
  return new FakeSheet('user_id', data, [[], []]);
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
};

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

console.log('1) ปฏิเสธเมื่อยังไม่ล็อกอิน');
check('ไม่มี email → ต้องไม่ให้ผ่าน', post({ action: 'rating.set', product_id: 'FWD-001', rating: 4 }).ok === false);
check('token ผิด → ต้องไม่ให้ผ่าน', post({ action: 'rating.set', email: EMAIL, token: 'wrong', product_id: 'FWD-001', rating: 4 }).ok === false);
check('ไม่ล็อกอิน → ยังไม่มีแถวถูกเขียน', dataRows().length === 0);
check('ไม่ล็อกอิน → บล็อกสรุปไม่ถูกแตะ', R.data[2][8] === 'AVG' && R.data[3][8] === 'COUNT');

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

console.log('\n─────────────────────────────');
console.log('ผ่าน ' + pass + ' / ล้มเหลว ' + fail);
process.exit(fail > 0 ? 1 : 0);
