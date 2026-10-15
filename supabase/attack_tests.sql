-- =====================================================================
-- PDF ดิจิมาร์ท — attack_tests.sql (สคริปต์ทดสอบเจาะระบบ)
-- ใช้บน "โปรเจกต์ทดสอบที่ทิ้งได้" เท่านั้น ห้ามรันบนฐานข้อมูลจริง
-- ต้องรัน 0001_init.sql + seed.sql บนโปรเจกต์ทดสอบก่อน
-- ขั้นเตรียม: สมัครผู้ใช้ 3 บัญชีผ่าน Dashboard Auth (userA, userB, admin)
--   แล้ว promote admin ด้วย: UPDATE profiles SET role='admin' WHERE email='...';
--   จากนั้น find/replace: USER_A / USER_B / ADMIN_ID ด้วย UUID จริงทั้งไฟล์
-- เทคนิค: SET ROLE authenticated + ปลอม JWT claims เพื่อทดสอบ RLS
--   ฝั่งหน้านำไปใช้จริงต้องทดสอบซ้ำผ่าน API ด้วย JWT จริงอีกชั้น
-- วิธีรัน: รันทั้งไฟล์รวดเดียวได้ — ทุกบล็อกที่ "คาด error" มี ROLLBACK; + RESET ROLE;
--   ตามท้ายเพื่อล้างสถานะ (ถ้า error ตามคาดจะล้าง transaction ที่พัง;
--   ถ้าดันผ่านเฉย ๆ จะเหลือแค่ WARNING "no transaction" แล้วไปต่อ — นั่นคือสัญญาณช่องโหว่)
--   หมายเหตุ: ยังตรวจสอบไม่ได้ว่า SQL Editor จะหยุดที่ error แรกหรือไม่
--   ถ้าหยุด ให้รันทีละบล็อก T0–T12 แทน
-- ตารางความต้องการรายกรณี:
--   T0 setup/ล้างข้อมูล: ต้องเป็น postgres (bypass RLS) + UUID ของ userA จาก Dashboard Auth
--   T1–T6, T9–T12: SET ROLE authenticated + claims ปลอม (ไม่ต้องมี JWT จริง)
--   T7: SET ROLE anon (มีใน Supabase ทุกโปรเจกต์)
--   T8 ครึ่งหลัง: ต้อง promote ADMIN_ID เป็น admin ผ่าน SQL Editor ก่อน
-- =====================================================================

-- ---------- T0: เตรียมออเดอร์ของ userA ไว้เป็นเป้า (รันเป็น postgres) ----------
BEGIN;
INSERT INTO orders (id, user_id, total_satang)
  VALUES ('ORD-VICTIM-1', 'USER_A', 9900);
INSERT INTO order_items (order_id, product_id, title, price_satang, qty)
  VALUES ('ORD-VICTIM-1', 'pdf-004', 'เอกสารสรุปภาษีบุคคลธรรมดา + Excel คำนวณภาษี', 9900, 1);
COMMIT;

-- ---------- T1: ลูกค้าแก้ราคาสินค้าในรายการ (คาด: error ราคาไม่ตรง catalog) ----------
BEGIN;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
INSERT INTO orders (id, user_id, total_satang) VALUES ('ORD-ATTACK-1', 'USER_A', 1);
INSERT INTO order_items (order_id, product_id, title, price_satang, qty)
  VALUES ('ORD-ATTACK-1', 'pdf-004', 'ของถูก', 1, 1);
COMMIT; -- ❌ ต้อง error ตรงนี้
ROLLBACK; RESET ROLE;

-- ---------- T2: ลูกค้าส่งยอดรวมมั่ว (คาด: error ตอน COMMIT) ----------
BEGIN;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
INSERT INTO orders (id, user_id, total_satang) VALUES ('ORD-ATTACK-2', 'USER_A', 100);
INSERT INTO order_items (order_id, product_id, title, price_satang, qty)
  VALUES ('ORD-ATTACK-2', 'pdf-004', 'x', 9900, 1);
COMMIT; -- ❌ ต้อง error "ยอดรวมไม่ตรงรายการ" ตรงนี้
ROLLBACK; RESET ROLE;

-- ---------- T3a: ลูกค้าตั้ง paid ตั้งแต่ตอนสร้าง (คาด: RLS deny) ----------
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
INSERT INTO orders (id, user_id, total_satang, status)
  VALUES ('ORD-ATTACK-3', 'USER_A', 9900, 'paid'); -- ❌ ต้อง error policy
RESET ROLE;

-- ---------- T3b: ลูกค้าเปลี่ยน pending → paid (คาด: deny + trigger) ----------
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
UPDATE orders SET status = 'paid' WHERE id = 'ORD-VICTIM-1'; -- ❌ ต้อง error
RESET ROLE;

-- ---------- T4: อ่านออเดอร์คนอื่น (คาด: ได้ 0 แถว ไม่ error) ----------
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_B"}', true);
SELECT count(*) FROM orders WHERE id = 'ORD-VICTIM-1'; -- ต้องได้ 0
SELECT count(*) FROM order_items WHERE order_id = 'ORD-VICTIM-1'; -- ต้องได้ 0
RESET ROLE;

-- ---------- T5a: ยกระดับตัวเองเป็นแอดมิน (คาด: error permission/policy) ----------
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
UPDATE profiles SET role = 'admin' WHERE id = 'USER_A'; -- ❌ ต้อง error
RESET ROLE;

-- ---------- T5b: แก้ชื่อตัวเอง (คาด: สำเร็จ 1 แถว) ----------
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
UPDATE profiles SET name = 'ชื่อใหม่' WHERE id = 'USER_A'; -- ✅ ต้องผ่าน
RESET ROLE;

-- ---------- T6: แนบยอดใหม่มากับคำสั่งยกเลิก (คาด: trigger error) ----------
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
UPDATE orders SET total_satang = 0, status = 'cancelled'
  WHERE id = 'ORD-VICTIM-1'; -- ❌ ต้อง error "ห้ามแก้ไขยอดรวม"
RESET ROLE;

-- ---------- T7: คนทั่วไปอ่านสินค้า (คาด: เห็นเฉพาะ published = 8 แถว) ----------
SET ROLE anon;
SELECT count(*) FROM products; -- ต้องได้ 8
SELECT count(*) FROM products WHERE status <> 'published'; -- ต้องได้ 0
RESET ROLE;

-- ---------- T8: ลูกค้าเขียนสินค้า (คาด: deny) / แอดมินเขียนได้ (คาด: ผ่าน) ----------
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
INSERT INTO products (id, title, category, price_satang, pages)
  VALUES ('pdf-hack', 'x', 'หนังสือ', 1, 10); -- ❌ ต้อง error
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"ADMIN_ID"}', true);
INSERT INTO products (id, title, category, price_satang, pages)
  VALUES ('pdf-admintest', 'แถวทดสอบแอดมิน', 'หนังสือ', 100, 10); -- ✅ ต้องผ่าน
DELETE FROM products WHERE id = 'pdf-admintest'; -- ล้างร่องรอย ✅ ต้องผ่าน
RESET ROLE;

-- ---------- T9: สร้างออเดอร์เปล่า (คาด: error ตอน COMMIT) ----------
-- กัน 2 ชั้น: 5.4 (ฝั่ง orders) + 5.2 (ฝั่ง order_items)
BEGIN;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
INSERT INTO orders (id, user_id, total_satang) VALUES ('ORD-EMPTY', 'USER_A', 0);
COMMIT; -- ❌ ต้อง error "ต้องมีอย่างน้อย 1 รายการ" ตรงนี้
ROLLBACK; RESET ROLE;

-- ---------- T10: เพิ่มรายการในออเดอร์ที่ยกเลิกแล้ว (คาด: policy deny) ----------
-- setup: สร้างแล้วยกเลิกอย่างถูกต้องก่อน (ทั้ง 3 ขั้นต้องผ่าน)
BEGIN;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
INSERT INTO orders (id, user_id, total_satang) VALUES ('ORD-ATTACK-4', 'USER_A', 9900);
INSERT INTO order_items (order_id, product_id, title, price_satang, qty)
  VALUES ('ORD-ATTACK-4', 'pdf-004', 'x', 9900, 1);
UPDATE orders SET status = 'cancelled' WHERE id = 'ORD-ATTACK-4'; -- ✅ ต้องผ่าน
COMMIT;
RESET ROLE;
-- โจมตี: เติมของลงออเดอร์ที่ยกเลิกแล้ว
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
INSERT INTO order_items (order_id, product_id, title, price_satang, qty)
  VALUES ('ORD-ATTACK-4', 'pdf-005', 'y', 17900, 1); -- ❌ ต้อง error policy
RESET ROLE;

-- ---------- T11: แก้ created_at ระหว่างยกเลิก (คาด: trigger 5.3 error) ----------
BEGIN;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
INSERT INTO orders (id, user_id, total_satang) VALUES ('ORD-ATTACK-5', 'USER_A', 9900);
INSERT INTO order_items (order_id, product_id, title, price_satang, qty)
  VALUES ('ORD-ATTACK-5', 'pdf-004', 'x', 9900, 1);
UPDATE orders SET created_at = now(), status = 'cancelled'
  WHERE id = 'ORD-ATTACK-5'; -- ❌ ต้อง error "ห้ามแก้ไขเวลาสร้าง" (policy ผ่าน แต่ trigger ดัก)
ROLLBACK; RESET ROLE;

-- ---------- T12: ตะกร้าข้ามผู้ใช้ ----------
-- setup ถูกต้อง: userA ใส่ตะกร้าตัวเอง (ต้องผ่าน)
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
INSERT INTO cart_items (user_id, product_id, qty) VALUES ('USER_A', 'pdf-004', 1); -- ✅ ต้องผ่าน
RESET ROLE;
-- โจมตี 1: userA ยัดตะกร้าให้ userB (คาด: error policy)
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_A"}', true);
INSERT INTO cart_items (user_id, product_id, qty) VALUES ('USER_B', 'pdf-004', 1); -- ❌ ต้อง error
RESET ROLE;
-- โจมตี 2: userB แก้ตะกร้า userA (คาด: ได้ 0 แถวแบบเงียบ ไม่ error — พฤติกรรมปกติของ RLS)
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"USER_B"}', true);
UPDATE cart_items SET qty = 99 WHERE user_id = 'USER_A'; -- ต้องกระทบ 0 แถว
SELECT count(*) FROM cart_items WHERE user_id = 'USER_A' AND qty = 99; -- ต้องได้ 0
RESET ROLE;

-- ---------- ล้างข้อมูลทดสอบ (รันเป็น postgres) ----------
DELETE FROM cart_items WHERE user_id IN ('USER_A', 'USER_B');
DELETE FROM order_items WHERE order_id LIKE 'ORD-ATTACK-%' OR order_id = 'ORD-EMPTY';
DELETE FROM orders WHERE id LIKE 'ORD-ATTACK-%' OR id = 'ORD-EMPTY';
DELETE FROM order_items WHERE order_id = 'ORD-VICTIM-1';
DELETE FROM orders WHERE id = 'ORD-VICTIM-1';
UPDATE profiles SET name = 'userA' WHERE id = 'USER_A';
