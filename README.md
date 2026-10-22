# PDF ให้แม่มึงทำ — ร้านขายไฟล์ดิจิทัล

เว็บไซต์แสดงสินค้า PDF → ลูกค้ากดดาวเก็บ → กดปุ่ม LINE สีเขียว → ไปสั่งซื้อที่ LINE OA
**ชี้ทางเดียว: Google Sheets เป็นแหล่งข้อมูล** — แก้ในชีต เว็บเปลี่ยนเอง

| | |
|---|---|
| เว็บร้าน | https://pdf-digimart.pages.dev |
| ชีต | https://docs.google.com/spreadsheets/d/1oqBm4P-KvkuDBemukSRyCpXDiJJQIdVjsapcDXIH4/edit |
| Apps Script | https://script.google.com/home/projects/18-FRt1vHs0-r91OaCaaHNxQE4KIYfSSMULYfS-xhRcj-pJPiSxui3x/edit |
| เซิร์ฟเวอร์ (URL เดียว ใช้ตลอด) | `https://script.google.com/macros/s/AKfycbw0bNY-QDZU7IEIPkjWkKCsukpiC9sYhJNWIyOpxeW527IxuA3GqbsEWo2M_HO4lcsl/exec` |

---

## 🧠 แนวคิดหลัก

```
╔═══════════════════════════════════════════════════╗
║  ชีต (Products)  =  ข้อมูลชุดเดียวที่จริง          ║
║        ↓ อ่านอัตโนมัติ                              ║
║  เว็บร้าน  →  โชว์สินค้า / ราคา / ยอดขาย / สถานะ  ║
║        ↓ กดปุ่มสีเขียว                              ║
║  LINE OA  →  คุยกันแล้วปิดการขาย                   ║
╚═══════════════════════════════════════════════════╝
```

**ไม่มี** ตะกร้า · ชำระเงินในเว็บ · ระบบออเดอร์ · หน้าแอดมิน (แก้สินค้าในชีทแทน)
เว็บคือ **ป้ายโฆษณา** หน้าที่ของมันคือโชว์สินค้าให้สวยและพาลูกค้าไป LINE

---

## 🗂️ โครงสร้างโปรเจกต์

```
apps/
  shop/          ← เว็บร้าน (ทั้งหมด)
    pages/       Home · Shop · ProductDetail · Favorites · Login · SheetStructure
    components/  Navbar · Footer · ProductCard · OrderLineButton
    store/       shop.tsx (สินค้า + ดาวถูกใจในเครื่อง)
  shared/        ← โค้ดที่ใช้ร่วม
    lib/         api.ts · firebase.ts · fileSize.ts
    store/       auth.tsx (Google login) · config.tsx (ค่าตั้งร้าน)
    types.ts     ชนิดข้อมูลกลาง
apps-script/
  Code.gs        ← เซิร์ฟเวอร์ทั้งหมด (ต้อง Deploy ทุกครั้งที่แก้)
public/          โลโก้ · favicon
```

---

## ⚙️ API ที่เซิร์ฟเวอร์รับ

**GET** `?action=...`
| action | ทำอะไร |
|---|---|
| `products.list` | สินค้าที่ `published` + `WIP` (WIP อยู่ท้ายสุด) |
| `product.detail&id=` | สินค้า 1 ชิ้น |
| `public.config` | ค่าร้าน + ค่า Firebase (หน้าเว็บดึงตอนเปิด) |
| `config` | ค่าทั้งหมดจากแท็บ Config |
| `sheet.structure` | โครงชีต (ชื่อแท็บ/คอลัมน์/dropdown/สูตร) — ไม่มีข้อมูลลูกค้า |

**POST** (JSON)
| action | ทำอะไร |
|---|---|
| `user.firebase` | ยืนยัน token จาก Firebase → สร้าง/อัปเดตผู้ใช้ในแท็บ `user_id` |
| `user.session` | ตรวจ session (อีเมล + token) |
| `user.check` | ดูว่าอีเมลนี้เคยล็อกอินไหม |

> 🛡 ลูกค้าเขียนชีตไม่ได้ (ยกเว้นระบบเรทติ้งในอนาคตที่จะบังคับล็อกอินก่อน)

---

## 🧾 กติกาที่ต้องไม่ละเมิด

1. **ราคา/ยอดขาย/สถานะ = อ่านจากชีตเท่านั้น** ห้ามแต่งตัวเลขในโค้ด
2. **ห้ามเขียนทับช่องที่มีสูตร** (เจ้าของร้านใส่สูตรคำนวณไว้) → ระบบข้ามให้อัตโนมัติ
3. **ห้ามแตะแท็บ Sales Tracker** — อ่านอย่างเดียว
4. **เขียนชีตต้องใช้ `LockService`** (ทำไว้แล้ว)
5. Apps Script ต้องรับ `Content-Type: text/plain` (ใช้ `application/json` แล้วเบราว์เซอร์จะล้ม)
6. **ห้ามเดาเลขพร้อมเพย์/บัญชีธนาคาร** — ต้องมาจากเจ้าของร้านเท่านั้น
7. ห้าม commit/push จากเครื่องนี้โดยไม่ได้รับ PAT จากเจ้าของร้าน

---

## 🛠️ คำสั่ง

| คำสั่ง | ทำอะไร |
|---|---|
| `npm install` | ติดตั้งไลบรารี (ครั้งแรกครั้งเดียว) |
| `npm run dev` | เปิดโหมดพัฒนา (5173) |
| `npm run build` | ตรวจ TypeScript + build เว็บร้าน → `dist/shop` |
| `npm run preview` | ดูผล build แบบ local |

**Cloudflare Pages (เว็บร้าน)**
```
Build command : npm run build:shop
Output        : dist/shop
```

---

## 📚 เอกสารอื่น

- `HANDOFF-SHEET-GUIDE.md` — คู่มือ: คุณต้องทำอะไรในชีต
- `HANDOFF-DEPLOY.md` — ลิงก์ทั้งหมด + วิธี deploy
