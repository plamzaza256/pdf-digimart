# 🔗 ลิงก์ทั้งหมด + วิธี deploy

> อัปเดต 22 ต.ค. 2026

---

## 🔗 ลิงก์ที่ใช้บ่อย

| อะไร | ลิงก์ |
|---|---|
| **เว็บร้าน** | https://pdf-digimart.pages.dev |
| หน้าร้าน (ทุกสินค้า) | https://pdf-digimart.pages.dev/#/shop |
| หน้าโครงสร้างชีต | https://pdf-digimart.pages.dev/#/sheet |
| หน้าล็อกอิน (รอใช้ตอนเรทติ้ง) | https://pdf-digimart.pages.dev/#/login |
| **ชีต** | https://docs.google.com/spreadsheets/d/1oqBm4P-KvkuDBemukSRyCpXDiJJQIdVjsapcDXIH4/edit |
| **Apps Script (โค้ด)** | https://script.google.com/home/projects/18-FRt1vHs0-r91OaCaaHNxQE4KIYfSSMULYfS-xhRcj-pJPiSxui3x/edit |
| หน้า deployments | https://script.google.com/home/projects/18-FRt1vHs0-r91OaCaaHNxQE4KIYfSSMULYfS-xhRcj-pJPiSxui3x/deployments |

### URL เซิร์ฟเวอร์ (ใส่ในโค้ดฝั่งเว็บ — เปลี่ยนเมื่อไหร่ต้องแก้ + push ใหม่)

```
https://script.google.com/macros/s/AKfycbw0bNY-QDZU7IEIPkjWkKCsukpiC9sYhJNWIyOpxeW527IxuA3GqbsEWo2M_HO4lcsl/exec
```

> ไฟล์: `apps/shared/lib/api.ts` → ตัวแปร `DEFAULT_API_URL`
> เว็บมี localStorage `pdfshop_server_url_v1` ไว้สำรอง (เคยใช้ตอนมีหน้าแอดมิน ตอนนี้ไม่ต้องแล้ว)

---

## 🪜 วิธี deploy เซิร์ฟเวอร์ (ทำทุกครั้งที่ผมแก้ `Code.gs`)

### ขั้นที่ 1 — วางโค้ด

```
1. เปิดลิงก์ Apps Script ข้างบน
2. คลิกไฟล์ โค้ด.gs (แท็บซ้าย)
3. Ctrl+A → วางทับ (ไฟล์ล่าสุดอยู่ที่ ~/Desktop/Code.gs)
4. 💾 Save (Ctrl+S)
```

### ขั้นที่ 2 — Deploy

```
จัดการการทำให้ใช้งานได้ (มุมขวาบน) → ✏️ แก้ไข
   → เวอร์ชัน: ใหม่
   → ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน (Anyone)   ← สำคัญมาก
   → ทำให้ใช้งานได้
```

> ⏱️ หลัง deploy ระบบจะตอบ 404 ชั่วคราว 1-2 นาที (ไม่ต้องตกใจ)
> เว็บมีระบบลองซ้ำให้อยู่แล้ว → ไม่ค้าง

### ขั้นที่ 3 — เช็ค

```
เปิด https://pdf-digimart.pages.dev/#/sheet
→ ต้องเห็นชื่อแท็บ + ชื่อคอลัมน์ + สูตร
```

---

## 🪜 วิธี deploy เว็บ (ทำอัตโนมัติ — ไม่ต้องทำเอง)

```
push โค้ดขึ้น GitHub (main) → Cloudflare Pages rebuild อัตโนมัติ ~1-2 นาที
```

**Cloudflare Pages**
```
Build command : npm run build:shop
Output        : dist/shop
```

---

## 🗑️ หน้าแอดมิน — ลบเสร็จแล้ว ✅ (22 ต.ค. 2026)

เจ้าของร้านตัดสินใจยกเลิกหน้าแอดมิน (แก้สินค้าในชีทแทน)
- โปรเจกต์ Cloudflare `pdf-digimart-admin` → **ลบแล้ว**
- โค้ด `apps/admin` → ลบออกจากโปรเจกต์แล้ว
- เซิร์ฟเวอร์ไม่มี endpoint สำหรับแอดมินแล้ว

**ที่เหลือ (เว็บร้านเท่านั้น):** https://pdf-digimart.pages.dev
**หน้าล็อกอิน** (รอใช้ตอนทำระบบเรทติ้ง): https://pdf-digimart.pages.dev/#/login

---

## 📋 ตารางช่วยแก้ปัญหา

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| เว็บค้างที่ "กำลังโหลดสินค้า…" | เซิร์ฟเวอร์ 404 ชั่วคราว | รอ 1-2 นาที → Ctrl+Shift+R |
| เว็บขึ้น "โหลดข้อมูลสินค้าไม่สำเร็จ" | ต่อเซิร์ฟเวอร์ไม่ได้ | ตรวจว่า deploy แล้ว + Access = ทุกคน |
| สินค้าไม่ขึ้นเว็บ | `status` ไม่ใช่ `published`/`WIP` | แก้ในชีต |
| สินค้า WIP ไม่อยู่ท้ายสุด | เซิร์ฟเวอร์เก่า | deploy ใหม่ |
| จำนวนหน้าว่าง | `pages` เป็นข้อความ → ต้อง deploy เวอร์ชันใหม่ | deploy ใหม่ |
| เห็นชื่อคอลัมน์ผิด | deploy เวอร์ชันเก่า | deploy ใหม่ |
| ยอดขายเป็น 0 | คอลัมน์ `sales` ในชีตยังไม่ได้ลิงก์ | แก้สูตรในชีต |

---

## 🔐 เรื่องความปลอดภัยที่ต้องทำ (ทำแล้ว = ดีมาก)

```
⚠️ ลบ GitHub Personal Access Token ที่ใช้ push โค้ด
   GitHub → Settings → Developer settings → Personal access tokens → Delete
   (ใช้ไปหลายครั้งแล้ว — ควรลบทันที)
```
