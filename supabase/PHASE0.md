# Phase 0 — เอกสารประกอบไฟล์เตรียมการ (ตรวจทานเท่านั้น ยังไม่รันจริง)

## 1. รายชื่อไฟล์ที่สร้าง/แก้ไขในรอบนี้

| ไฟล์ | สถานะ |
|---|---|
| `.gitignore` | แก้ไข: เพิ่มบรรทัด `.env` ต่อจาก `*.local` (กฎเดิมครบถ้วน) |
| `.env.example` | สร้างใหม่: มีแค่ชื่อตัวแปร + ค่าตัวอย่างที่ไม่ใช่ credentials จริง |
| `supabase/migrations/0001_init.sql` | สร้างใหม่: schema ฉบับเต็ม (canonical — ใช้ไฟล์นี้ตรวจทาน) |
| `supabase/seed.sql` | เขียนใหม่: seed สินค้า 8 รายการจาก `data/products.ts` (ลบแถว `[SAMPLE]` เดิมออกเพื่อให้ตรงสเปก 8 รายการ) |
| `supabase/schema.sql` | ลบออก: ถูกแทนที่โดย `migrations/0001_init.sql` แล้ว (กันสับสนว่ามี schema 2 ฉบับ) |
| `supabase/NOTES.md` | คงเดิม (ประวัติรอบหลายภาษา) |
| ไม่แตะ `src/` ทั้งหมด โดยเฉพาะ `auth.tsx`/`shop.tsx`; ไม่ติดตั้ง dependency; ไม่รัน SQL |

## 2. หน่วยราคาที่ใช้ในโค้ด (ตรวจสอบแล้ว ไม่ได้สมมติ)

- `src/data/products.ts:15-16` ราคาเป็นจำนวนเต็ม เช่น `199`, `299`
- `formatPrice` (`products.ts:150-151`) แสดงผลด้วย `toLocaleString('th-TH') + ' ฿'` ตรง ๆ โดยไม่หาร 100
- ทั้ง `src/` ไม่มีคำว่า "สตางค์"/"satang" เลย (grep ยืนยัน) และราคาต่ำสุด 79 — ถ้าเป็นสตางค์จะเท่ากับ 0.79 บาทซึ่งไม่สมเหตุสมผล
- **สรุป: หน่วยปัจจุบันคือ "บาท"** → seed แปลงเป็นสตางค์ด้วย `×100` (199 → 19900) ถูกต้องแล้ว
- หมายเหตุสำหรับระยะถัดไป: frontend ต้องหาร 100 ตอนแสดงผล และฟังก์ชัน `formatPrice` ต้องรับค่าสตางค์ — เป็นงานของระยะเชื่อม DB ไม่ใช่รอบนี้

## 3. คำอธิบาย RLS policy รายตาราง

- **profiles** — `SELECT` เฉพาะแถวตัวเอง (`auth.uid() = id`) เพราะ Navbar ต้องอ่านชื่อผู้ใช้; `UPDATE` เฉพาะแถวตัวเอง **และ** `WITH CHECK (role = my_role())` บังคับให้ role ใหม่เท่ากับ role เดิมที่ DB จำไว้ → เปลี่ยน `name` ได้ เปลี่ยน `role` ไม่ได้; **ไม่มี policy INSERT/DELETE** แถวสร้างโดย trigger `handle_new_user` เท่านั้น
- **products** — ทุกคน (รวมยังไม่ล็อกอิน) `SELECT` ได้เฉพาะ `status='published'` ตรงกับหน้าร้านปัจจุบัน; แอดมิน (`is_admin()` อ่าน `profiles.role` ใน DB) ทำได้ทุกอย่าง — ไม่มีช่องให้ client ตั้งสิทธิ์ตัวเอง
- **cart_items** — policy เดียว `FOR ALL` แบบเจ้าของเท่านั้น (`user_id = auth.uid()` ทั้ง USING และ WITH CHECK)
- **orders** — เจ้าของ `SELECT` ของตัวเอง; `INSERT` ของตัวเองได้แต่บังคับ `status='pending_payment'` (ตั้ง `paid` เองไม่ได้); `UPDATE` ได้เฉพาะเปลี่ยน `pending_payment → cancelled` (ยกเลิกเองได้อย่างเดียว แก้ยอดไม่ได้); แอดมินจัดการทั้งหมด (ไว้ยืนยัน `paid` ตอนมีชำระเงินจริง)
- **order_items** — อ่าน/เพิ่มได้เฉพาะในออเดอร์ของตัวเอง และบังคับ `product_id IS NOT NULL`; **ไม่มี UPDATE/DELETE ของเจ้าของ** — สั่งแล้วห้ามแก้ รักษาประวัติ; แอดมินจัดการได้เมื่อจำเป็น
- เกราะชั้นที่ 2 (ไม่พึ่ง policy อย่างเดียว): trigger `verify_order_item_price` บังคับราคาตรง catalog; constraint trigger `verify_order_total` (deferred ตรวจตอน commit) บังคับยอดรวมตรงผลรวมรายการ → client ส่งราคามั่ว/ยอดมั่วมายังไง DB ก็ปฏิเสธ

## 4. ตั้งแอดมินคนแรกอย่างปลอดภัย (ทำหลังรัน migration + สมัครบัญชีแล้ว)

1. เปิด Supabase Dashboard → Authentication → เพิ่ม/ยืนยันบัญชีเจ้าของร้าน (สมัครผ่านหน้าเว็บปกติ — จะได้ role `customer` ก่อน)
2. เปิด SQL Editor → รันคำสั่งนี้ **ครั้งเดียว** (เปลี่ยนอีเมลให้ตรง):
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'owner@example.com';
   ```
3. ตรวจผล: `SELECT id, email, role FROM profiles WHERE role = 'admin';` ต้องเจอ 1 แถว
4. ห้ามทำสิ่งเหล่านี้: ห้ามเขียนโค้ด/ปุ่มตั้งแอดมินในแอป (ปุ่มเดิม `loginAsAdminDemo` ต้องถูกลบในระยะถัดไป), ห้ามใช้ service_role key, ห้ามแชร์ SQL นี้กับผู้ใช้อื่น
5. แอดมินคนที่สองเป็นต้นไปให้แอดมินคนแรก UPDATE ผ่าน SQL Editor เท่านั้น

## 5. วิธีนำ seed ไปใช้และตรวจสอบผล (ทำรอบหน้าเมื่อสั่ง)

1. รัน `supabase/migrations/0001_init.sql` ใน SQL Editor ก่อน (ครั้งเดียว)
2. รัน `supabase/seed.sql` ตาม (รันซ้ำได้เพราะมี `ON CONFLICT DO NOTHING`)
3. ตรวจจำนวน: `SELECT count(*) FROM products;` → ต้องได้ **8**
4. ตรวจราคา: `SELECT id, price_satang, price_satang/100.0 AS baht FROM products ORDER BY id;`
   → ต้องได้ 19900/14900/12900/9900/17900/15900/7900/18900 และ `old_price_satang` เป็น NULL ใน 4 แถว (pdf-004/005/007/008)
5. ตรวจสถานะ/ตัวอย่าง: `SELECT count(*) FROM products WHERE status='published' AND is_sample=true;` → 8, และ `SELECT count(*) FROM products WHERE language_verified=true;` → **0**
6. ตรวจสิทธิ์คนทั่วไป: เปิดหน้าต่าง private (ไม่ล็อกอิน) รัน `SELECT * FROM products;` ผ่าน anon key ต้องเห็นเฉพาะ 8 แถว published; ลอง `UPDATE products SET price_satang=1;` ต้องถูกปฏิเสธ

## 6. ข้อจำกัดและความเสี่ยงที่ยังเหลือ

1. **ยังไม่รันจริง** — SQL ผ่านแค่การอ่านทวนด้วยตา ยังไม่ผ่าน parser ของ Postgres อาจมี syntax ผิดตอนรันครั้งแรก (ต้องแก้ตอนนั้น)
2. **สิทธิ์สร้าง trigger บน `auth.users` และ extension `pg_trgm`** — ต้องลองบนโปรเจกต์จริง ถ้าแผนฟรีไม่อนุญาต ต้องปรับ (เช่น ย้ายสร้าง profiles ไปไว้ในโค้ดระยะเชื่อม DB แทน)
3. **`my_role()` อ่านตาราง profiles ตรง ๆ** — ถ้า policy อนาคตซับซ้อนขึ้นต้องทบทวน recursion อีกครั้ง
4. **ตะกร้าเดิมใน localStorage จะไม่ย้ายตาม** — ผู้ใช้ต้องเริ่มตะกร้าใหม่หลังเปลี่ยนระบบ (แจ้งล่วงหน้าตอน deploy)
5. **รหัสผ่านเดิม (btoa) ใช้ต่อไม่ได้** — ผู้ทดลองต้องสมัครใหม่บน Supabase Auth
6. **ยังไม่มี rate limiting / email confirmation / reset password** ใน scope นี้ — เปิดใน Auth settings ของ Supabase ตอนสร้างโปรเจกต์
7. **`.env` ยังไม่มีไฟล์จริง** — มีแค่ `.env.example`; ไฟล์ `.env.local` สร้างตอนจะเชื่อม DB (ถูกละเว้นโดย `*.local` อยู่แล้ว ยืนยันจาก pattern)
8. โปรเจกต์นี้ยังไม่ใช่ git repo — `.gitignore` จะมีผลเมื่อ init repo แล้วเท่านั้น

## 7. บันทึกตรวจแก้ migration (review รอบ 2 — ยังไม่ได้รันบน PostgreSQL จริง)

แก้ใน `supabase/migrations/0001_init.sql` เท่านั้น (`seed.sql` ไม่กระทบ เพราะแตะแค่ตาราง products):

1. **PK ขัดกับ SET NULL (แก้แล้ว):** เดิม `PRIMARY KEY (order_id, product_id)` ทำให้ `ON DELETE SET NULL` ใช้งานไม่ได้จริง (คอลัมน์ใน PK ห้ามเป็น NULL → Postgres จะ error ตอนลบสินค้า) → เปลี่ยนเป็น surrogate key `id bigint GENERATED ALWAYS AS IDENTITY` + `UNIQUE (order_id, product_id) WHERE product_id IS NOT NULL` กันรายการซ้ำโดยยังให้แถวที่สินค้าถูกลบแล้วอยู่ได้
2. **ช่องแนบยอดใหม่มากับคำสั่งยกเลิก (แก้แล้ว):** policy เดิมคุมแค่คอลัมน์ status → เพิ่ม trigger `verify_order_update` ล็อก `total_satang`/`user_id`/`id` ห้ามเปลี่ยน และบังคับ transition เดียวคือ `pending_payment → cancelled` (แอดมินเท่านั้นที่พ้น)
3. **ล็อกคอลัมน์ระดับ privilege (แก้แล้ว):** เพิ่มข้อ 8 — `REVOKE ALL` แล้ว `GRANT UPDATE (name)` เฉพาะคอลัมน์ name บน `profiles` ทำให้ `email/role/created_at` แตะผ่าน API ไม่ได้แม้ policy พลาด; พร้อม least-privilege grants ครบทุกตาราง+sequence+function
4. **รันซ้ำ (แก้แล้ว):** เติม `DROP POLICY IF EXISTS` ครบ 12 policies (เดิมรันครั้งที่สองจะ error ว่า policy มีอยู่แล้ว)
5. **สิทธิ์แอดมิน (ยืนยันแล้ว ไม่ต้องแก้):** ไม่มี policy ใดให้ UPDATE `role` ผ่าน API — ตั้งแอดมินได้ทาง SQL Editor/Dashboard เท่านั้น; `is_admin()` อ่าน role จาก DB ผ่าน security-definer function เลี่ยง recursion
6. **ความเสี่ยงที่ยังเหลือ:** ยังไม่ได้รันบน PostgreSQL/Supabase จริง (syntax ทั้งหมดผ่านแค่การอ่านทวน), ชื่อ sequence `order_items_id_seq` อิง convention ของ Postgres (ต้องยืนยันตอนรันครั้งแรก), trigger บน `auth.users` + extension `pg_trgm` ต้องลองบนโปรเจกต์จริง

## 8. บันทึกแพตช์รอบ 3 (ยังไม่ได้รันจริง — ปรับตามคำสั่งก่อนทดสอบ)

แก้ `supabase/migrations/0001_init.sql`:
- เติม `SET search_path = public` + ระบุ `public.` ครบทั้ง 4 trigger functions (`verify_order_item_price/total/update/has_items`)
- revoke `EXECUTE` trigger functions ทั้ง 4 จาก PUBLIC/anon/authenticated (สมมติฐาน: การ fire ของ trigger ตรวจสิทธิ์ที่ตาราง ไม่ตรวจ EXECUTE — ถ้าผิด ทุก DML จะ error ดังทันทีตอนทดสอบครั้งแรก)
- `order_items_insert_own` เพิ่มเงื่อนไขออเดอร์ต้อง `pending_payment` (เติมของลงออเดอร์ที่ยกเลิก/จ่ายแล้วไม่ได้)
- `verify_order_update` ล็อก `created_at` ห้ามเปลี่ยนเพิ่ม
- กันออเดอร์เปล่า 2 ชั้น: trigger ใหม่ `verify_order_has_items` (ฝั่ง orders ตอน commit) + เช็กจำนวนรายการใน `verify_order_total` (กันลบทั้งหมดทิ้ง รวมกรณีสินค้าฟรี total=0)
- trigger ตรวจราคาพึ่ง RLS: สินค้า draft/archived มองไม่เห็น → สั่งซื้อไม่ได้ (พฤติกรรมที่ต้องการ, บันทึกไว้ในคอมเมนต์)
แก้ `supabase/attack_tests.sql`: T9 เปลี่ยนเป็นคาด error, เพิ่ม T10 (เติมของในออเดอร์ที่ยกเลิก) และ T11 (แก้ created_at)
ยังไม่ได้ทดสอบ: ทุก trigger/policy ใหม่ + T9/T10/T11 รอ execute บนโปรเจกต์ทดสอบที่ทิ้งได้

## 9. บันทึกตรวจลึกก่อนทดสอบ Supabase (ยังไม่ได้รันจริง)

แก้ `supabase/migrations/0001_init.sql`:
- `verify_order_item_price` อนุญาต NULL-transition เฉพาะ cascade ลบสินค้า (เดิม cascade จะโดน trigger ตัวเองบล็อก ทำให้ลบสินค้าที่มีประวัติไม่ได้เลย ขัดกับดีไซน์ SET NULL)
- `verify_order_total` ตรวจทั้งออเดอร์ต้นทาง+ปลายทาง (เดิมย้ายรายการข้ามออเดอร์แล้วออเดอร์ต้นทางไม่ถูกตรวจ) และข้ามเมื่อแถวออเดอร์ถูกลบไปแล้ว (เดิมลบออเดอร์จะพังทั้งที่ cascade ถูกต้อง)
แก้ `supabase/seed.sql`: เพิ่ม safety gate — ปฏิเสธถ้าไม่ opt-in ราย session กันรันผิดที่
แก้ `supabase/attack_tests.sql`: ทุกบล็อกคาด error มี ROLLBACK; + RESET ROLE; ตามท้าย รันรวดเดียวได้ + ตารางความต้องการรายกรณีใน header
ยังไม่ได้ทดสอบ: execute จริงทุกข้อ (ไม่มี DB ในเครื่องนี้), พฤติกรรม SQL Editor เมื่อเจอ error แรก, สมมติฐาน trigger-fire-ไม่ตรวจ-EXECUTE (จะพิสูจน์ทันทีตอนรันครั้งแรกเพราะ DML จะพังดังถ้าผิด)
