# Handoff Brief — PDF DigiMart (ร้านขายไฟล์ PDF)

จัดทำ: 18 ต.ค. 2026 · สำหรับส่งต่อให้ผู้ช่วย AI อื่น

---

## 1. สรุปสั้นที่สุด

เว็บร้านขายไฟล์ PDF ภาษาไทย สร้างเสร็จและขึ้นออนไลน์แล้ว
ระบบสมัครสมาชิก/เข้าสู่ระบบ **เชื่อมกับ Google Sheets ผ่าน Google Apps Script แล้ว** และทดสอบผ่านบนเว็บจริง
ส่วนที่เหลือคือระบบชำระเงิน ยังไม่ได้เริ่ม

---

## 2. สิ่งที่ทำเสร็จแล้ว (ทดสอบผ่านจริง)

### 2.1 เว็บไซต์ — ขึ้นจริงที่ https://pdf-digimart.pages.dev

| หน้า | ไฟล์ | สถานะ |
|---|---|---|
| หน้าแรก | `src/pages/Home.tsx` | เสร็จ |
| หน้าร้าน + ค้นหา/กรอง/เรียง | `src/pages/Shop.tsx` | เสร็จ |
| รายละเอียดสินค้า | `src/pages/ProductDetail.tsx` | เสร็จ |
| เข้าสู่ระบบ | `src/pages/Login.tsx` | ✅ เชื่อมชีตแล้ว |
| สมัครสมาชิก | `src/pages/Register.tsx` | ✅ เชื่อมชีตแล้ว |
| ตะกร้า | `src/pages/Cart.tsx` | เสร็จ (ยังใช้ localStorage) |
| คำสั่งซื้อของฉัน | `src/pages/Orders.tsx` | เสร็จ (ยังใช้ localStorage) |
| หน้าแอดมิน | `src/pages/Admin.tsx` | เสร็จ (ยังตรวจสิทธิ์ฝั่งเบราว์เซอร์) |

- Responsive มือถือ, มีโลโก้ `public/logo.png`, แบรนด์ "ให้แม่มึงทำ"
- Hash router (`/#/login`)

### 2.2 Google Sheets + Apps Script — ทำงานจริง

**ชีตชื่อ `PDF-DigiMart-Data`** มี 6 แท็บ:

| แท็บ | หัวคอลัมน์ |
|---|---|
| `Products` | product_id, title, description, long_description, category, document_language, description_language, document_type, tags, price_satang, old_price_satang, pages, file_size, rating, sales, cover_color, featured, status, created_at |
| `user_id` | User_id, email, password, name, Creation date, last_login |
| `Orders` | order_id, created_at, customer_name, customer_email, identity_provider, token_hash, status, total_satang, payment_ref, verified_by, verified_at, admin_note |
| `OrderItems` | item_id, order_id, product_id, title_snapshot, price_satang, qty |
| `PaymentSubmissions` | submission_id, order_id, submitted_at, amount_claimed_satang, payer_name, payer_note, review_result, reviewed_by, reviewed_at |
| `Config` | key, value |

- โค้ด Apps Script อยู่ที่ `apps-script/Code.gs` (ไฟล์เดียว)
- ช่องสินค้ามี 8 รายการตัวอย่างที่ seed มา
- `admin_emails` ยังไม่ได้ตั้งใน Config — ตอนนี้ใช้ `ADMIN_EMAIL` ในโค้ดแทน

**Apps Script Web App URL** (ไม่ใช่ข้อมูลลับ ความปลอดภัยมาจาก server-side check):
```
https://script.google.com/macros/s/AKfycbzz3-ldqt2ZiLbSGkV-bQ-K-OKAHjv9E60c3eKm0BsIevqsG-q7NdmHiFo9jCk77kHS/exec
```
ตั้งค่า deploy: Execute as = Me, Who has access = Anyone

### 2.3 API endpoints ที่เขียนเสร็จ

**GET** (`?action=...`)
- `products.list` — คืนเฉพาะสินค้า `status='published'`
- `product.detail&id=`
- `config`
- `order.list` — เฉพาะแอดมิน

**POST** (JSON body)
- `user.signup` — สร้าง `UID_0001`…`UID_9999`, กันอีเมลซ้ำ, คืน user
- `user.login` — ต้องตรงทั้งอีเมล+รหัสในแถวเดียวกัน, อัปเดต last_login
- `user.check` — ดึงข้อมูลเดิมด้วยอีเมล
- `payment.submit`
- `product.upsert` — เฉพาะแอดมิน
- `order.verify` / `order.reject` — เฉพาะแอดมิน

### 2.4 ผลทดสอบ (ผ่านหมด)

| ทดสอบ | ผล |
|---|---|
| สมัครสมาชิกจากหน้าเว็บจริง | ✅ ลงชีตจริง |
| สมัครอีเมลซ้ำ | ✅ ถูกปฏิเสธ |
| ล็อกอินรหัสผิด | ✅ ถูกปฏิเสธ ยังอยู่หน้า login |
| ล็อกอินรหัสถูก | ✅ เข้าได้ |
| คงสถานะล็อกอินหลังรีเฟรช | ✅ (เก็บแค่อีเมลใน localStorage) |
| อ่านสินค้าจากชีต | ✅ คืน 8 รายการ |

---

## 3. ข้อมูลสำคัญที่ต้องรู้

### 3.1 บัญชี/ทรัพยากร

| อะไร | ค่า |
|---|---|
| เว็บจริง | https://pdf-digimart.pages.dev |
| GitHub repo | `https://github.com/plamzaza256/pdf-digimart.git` (private) |
| โฮสต์ Cloudflare | Cloudflare Pages (ฟรี) deploy อัตโนมัติจาก push ไป `main` |
| อีเมลเจ้าของร้าน (ที่ใช้ตอนนี้) | `16052551mk@gmail.com` — **ยังไม่ยืนยันว่าถูกต้อง** |
| Stack | React 19 + TypeScript + Vite, ไม่มี framework เพิ่ม, ไม่มี UI library |
| local dev | `npm run dev` (5173) · `npm run build` · `npm run preview` (4173) |
| commit ล่าสุด | `a06bc6e` |

### 3.2 localStorage keys ที่ยังใช้อยู่

| Key | สถานะ |
|---|---|
| `pdfshop_session_v1` | ✅ ใช้เก็บอีเมลเพื่อคงล็อกอิน — ตัวนี้จำเป็น |
| `pdfshop_users_v1` | ❌ เลิกใช้แล้ว (บัญชีเก่าในเครื่องคุณจะล็อกอินไม่ได้ แต่ข้อมูลยังไม่ถูกลบ) |
| `pdfshop_cart_v1` | ❌ ยังใช้ — ตะกร้ายังไม่ได้ย้ายเข้าชีต |
| `pdfshop_orders_v1` | ❌ ยังใช้ — คำสั่งซื้อยังเป็นจำลอง |
| `pdfshop_custom_products_v1` | ❌ ยังใช้ — สินค้าบนเว็บยังมาจากที่นี่ ไม่ใช่ชีต |
| `pdfshop_deleted_ids_v1` | ❌ ยังใช้ |

### 3.3 ไฟล์สำคัญที่ต้องแก้ต่อ

| ไฟล์ | หน้าที่ | หมายเหตุ |
|---|---|---|
| `apps-script/Code.gs` | ฝั่งเซิร์ฟเวอร์ทั้งหมด | แก้ตรงนี้ต้อง **Deploy ใหม่** ทุกครั้ง |
| `src/lib/api.ts` | ตัวเชื่อม API + URL | เพิ่ม endpoint ใหม่ต้องมาเพิ่มตรงนี้ |
| `src/store/auth.tsx` | สมัคร/ล็อกอิน | มี `ADMIN_EMAILS` ที่ต้องแก้ถ้าเปลี่ยนอีเมลแอดมิน |
| `src/store/shop.tsx` | สินค้า/ตะกร้า/ออเดอร์ | **ยังเป็น localStorage ทั้งหมด** — ไฟล์นี้คืองานหลักของรอบหน้า |
| `src/types.ts` | type กลาง | |
| `src/pages/Admin.tsx` | UI แอดมิน | |

---

## 4. กฎความปลอดภัยที่ต้องไม่ละเมิด

1. **ราคาต้องคิดจากชีตเท่านั้น** ห้ามรับราคาจากเบราว์เซอร์ (โค้ด `_createOrder` ทำถูกแล้ว)
2. **ห้ามค้นข้อมูลด้วย UID** — ต้องใช้ email ที่ยืนยันตัวตนแล้วเสมอ (นี่คือเหตุผลที่ UID เรียง 0001–9999 ยังไม่เป็นปัญหา)
3. **Apps Script ต้องรับ `Content-Type: text/plain`** ถ้าใช้ `application/json` เบราว์เซอร์จะส่ง preflight แล้วล้ม
4. **Google Sheets ไม่มี transactions** → ใช้ `LockService` ทุกฟังก์ชันที่เขียนข้อมูล (ทำไว้แล้ว)
5. `Session.getActiveUser().getEmail()` คืนค่าว่างเสมอสำหรับคนที่ไม่ล็อกอิน Google → ตรวจแอดมินด้วยวิธีนี้ไม่ได้ ถ้าต้องการ admin จริงต้องใช้ Google Sign-In
6. **PromptPay เลข/ชื่อบัญชีต้องมาจากเจ้าของร้านเท่านั้น ห้ามแต่งเอง**

---

## 5. ที่ตัดสินใจไปแล้ว (อย่าเปลี่ยนเอง)

| เรื่อง | การตัดสินใจ | เหตุผล |
|---|---|---|
| ฐานข้อมูล | ใช้ Google Sheets + Apps Script | เจ้าของร้านใช้ชีตได้เอง ต้นทุน 0 บาท |
| Supabase / PocketBase | **พักไว้** (มีไฟล์เตรียมไว้ใน `supabase/` แต่ไม่ได้ใช้) | ยังไม่จำเป็นที่ขนาดนี้ |
| รหัสผ่าน | **เก็บเป็นข้อความธรรมดา ไม่ hash** | เจ้าของร้านตัดสินใจเอง — บอกความเสี่ยงแล้ว แต่ยอมรับ |
| UID | เรียงลำดับ `UID_0001`–`UID_9999` | ใช้แค่แสดงผล ไม่ใช่ตัวยืนยันตัวตน |
| Google Sign-In | ยังไม่ได้ทำ | ตัดสินใจจะทำ "ทั้งแบบ Google Sign-In และอีเมล+รหัสผ่าน" |
| Guest checkout | ตัดออก | ต้องบังคับให้มีบัญชี |
| การโอนเงิน | PromptPay แบบมือ — เจ้าของเช็คยอดจริงในแอปธนาคารแล้วกดยืนยันเอง | ตอนนี้ปิดรับซื้ออยู่ |
| การดาวน์โหลด PDF | ยังไม่ทำ | รอบแรกไม่ต้อง |

---

## 6. ยังทำไม่เสร็จ (เรียงตามลำดับที่ควรทำ)

### ระดับ 1 — ต่อยอดจากที่มี
1. **ดึงสินค้าในเว็บมาจากชีต** — ตอนนี้หน้าร้านยังอ่านจาก `products.ts` (mock) ต้องเปลี่ยน `src/store/shop.tsx` ไปเรียก `products.list` ตอนเปิดเว็บ
2. **ให้แอดมินเพิ่ม/แก้สินค้าผ่านหน้า Admin** → `product.upsert` (โค้ดฝั่งเซิร์ฟเวอร์เขียนรออยู่แล้ว แต่หน้าเว็บยังไม่เรียก)
3. **ยืนยันอีเมลแอดมิน** — ตอนนี้ยังไม่รู้ว่าอีเมลไหนจริง ถ้าไม่แก้จะเข้าหน้าแอดมินไม่ได้
4. **ป้องกันหน้าแอดมินจริง** — ปัจจุบันตรวจฝั่งเบราว์เซอร์ แก้โค้ดได้ง่ายมาก

### ระดับ 2 — ระบบเงินจริง
5. ตะกร้า/ออเดอร์ย้ายเข้าเซิร์ฟเวอร์ (`order.create` เขียนรอแล้ว)
6. หน้าแจ้งโอน + กรอกเลขอ้างอิง (`payment.submit` เขียนรอแล้ว)
7. หน้าแอดมินดูออเดอร์ + ปุ่มยืนยัน/ปฏิเสธ (`order.verify` เขียนรอแล้ว)
8. ตั้งค่าเปิดรับซื้อในแท็บ `Config` (คีย์ `banking_open` = `yes`) — ตอนนี้เป็น `no`
9. ใส่เลขพร้อมเพย์/ชื่อบัญชีจริงในแท็บ `Config`

### ระดับ 3 — ภายหลัง
10. Google Sign-In
11. ส่งลิงก์ดาวน์โหลด PDF หลังยืนยันยอด
12. หน้า "ไฟล์ของฉัน" ดูสินค้าที่ซื้อแล้ว (ดึงด้วย email ที่ล็อกอิน)

---

## 7. สิ่งที่ควรระวัง

- **รหัสผ่านเก็บเป็นข้อความธรรมดาในชีต** เจ้าของชีต (และคนที่ชีตหลุด) อ่านได้ทั้งหมด — ถ้าจะเปลี่ยน แก้ฟังก์ชัน `_hashPassword()` ใน `Code.gs` จุดเดียว
- **ตัวเลขยอดขายในสินค้า 8 รายการเป็นตัวเลขปั้น** (2314, 1872 ฯลฯ) — ยังไม่ใช่ยอดขายจริง อย่าแสดงเป็นของจริง
- ยังมีข้อความ "รุ่นทดลอง / ระบบจำลอง" หลายจุดในเว็บ เพราะยังไม่มีระบบเงินจริง — **เหมาะกับตอนนี้ ยังไม่ต้องแก้**
- ถ้าจะล้าง localStorage ต้องสำรองก่อน (โดยเฉพาะ `pdfshop_cart_v1`)
- แก้ `apps-script/Code.gs` แล้วต้อง **Deploy ใหม่** ทุกครั้ง ไม่งั้นเว็บยังเรียกโค้ดเก่า
- เครื่องไม่มี `gh` CLI และไม่ได้เก็บ GitHub token ไว้ → การ push ต้องขอ PAT ใหม่ทุกครั้ง (ควรลบ token หลังใช้)
- โฟลเดอร์มีชื่อภาษาไทย → เวลาใช้คำสั่ง shell ให้อ้างอิง path ในเครื่องหมายคำพูด

---

## 8. ลูกค้าที่ใช้งานจริง

คน 2 คนทำงานร่วมกัน (เรียกกันว่า admin กับ admin2) ทั้งคนเป็นคนไม่ใช่โปรแกรมเมอร์มืออาชีพ
ต้องอธิบายเป็นภาษาไทยเรียบง่าย แบ่งงานเป็นขั้นเล็ก ๆ บอกผลที่คาดหวังและเกณฑ์ว่าผ่านหรือไม่

---

## 9. ข้อมูลทดสอบที่ควรล้าง

ชีต `user_id` มีบัญชีทดสอบจากระหว่างพัฒนา:

| User_id | email |
|---|---|
| UID_0001 | test1@gmail.com |
| UID_0002 | webtest1@gmail.com |
| UID_0004 | livetest1@gmail.com |

UID_0003 คือบัญชีทดสอบของเจ้าของเอง