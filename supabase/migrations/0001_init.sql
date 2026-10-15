-- =====================================================================
-- PDF ดิจิมาร์ท — Migration 0001: schema เริ่มต้น (Phase 0)
-- สถานะ: ไฟล์เตรียมการสำหรับตรวจทานเท่านั้น
--   ⛔ ห้ามรันกับฐานข้อมูลจริงในรอบนี้ (รอคำสั่ง)
--   ไม่มี secret / ไม่มี service_role key ในไฟล์นี้
-- หน่วยเงิน: price_satang / total_satang เป็น "สตางค์" (บาท × 100)
--   ของเดิมในโค้ดเป็นหน่วยบาท (ดูหลักฐานใน supabase/PHASE0.md ข้อ 2)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------
-- 0) ฟังก์ชันช่วย (SECURITY DEFINER ไว้อ่าน role ตัวเอง เลี่ยง RLS recursion)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.my_role() = 'admin' $$;

-- สร้างแถว profiles อัตโนมัติหลังสมัคร Auth (role เริ่ม customer เสมอ)
-- ไม่มี policy ให้ INSERT profiles เอง จึงไม่มีช่องยัด role='admin' ผ่าน API
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'name', ''), 'ลูกค้าใหม่')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 1) profiles — ผูกกับ auth.users.id (UUID)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email      text NOT NULL UNIQUE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  role       text NOT NULL DEFAULT 'customer'
             CHECK (role IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2) products — คง id 'pdf-001' เดิม; ราคาเป็นสตางค์; มี status
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          text PRIMARY KEY,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',
  long_description text NOT NULL DEFAULT '',
  category    text NOT NULL CHECK (category IN ('หนังสือ', 'เอกสาร', 'ข้อสอบ')),

  document_language    text NOT NULL DEFAULT 'th'
    CHECK (document_language IN ('en', 'th', 'other')),
  description_language text NOT NULL DEFAULT 'th'
    CHECK (description_language IN ('th', 'en', 'other')),
  document_type        text NOT NULL DEFAULT 'other'
    CHECK (document_type IN ('exam', 'worksheet', 'book', 'study_guide', 'other')),
  tags        text[] NOT NULL DEFAULT '{}',

  -- ราคา/ยอดเป็นสตางค์ (integer กันทศนิยมเพี้ยน)
  price_satang     integer NOT NULL CHECK (price_satang >= 0),
  old_price_satang integer CHECK (old_price_satang IS NULL OR old_price_satang >= 0),
  pages       integer NOT NULL CHECK (pages > 0),
  file_size   text NOT NULL DEFAULT '',
  rating      numeric NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  sales       integer NOT NULL DEFAULT 0 CHECK (sales >= 0),
  cover_color text NOT NULL DEFAULT '#1d4ed8',
  featured    boolean NOT NULL DEFAULT false,

  -- สถานะเผยแพร่: คนทั่วไปเห็นเฉพาะ published
  status      text NOT NULL DEFAULT 'draft'
              CHECK (status IN ('published', 'draft', 'archived')),

  is_sample         boolean NOT NULL DEFAULT false,
  language_verified boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 3) cart_items — ตะกร้าของแต่ละ user (ลบ user/sินค้าหลุดแล้วทิ้งได้)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cart_items (
  user_id    uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  qty        integer NOT NULL CHECK (qty > 0 AND qty <= 99),
  PRIMARY KEY (user_id, product_id)
);

-- ---------------------------------------------------------------------
-- 4) orders + order_items — ประวัติห้ามเสียเมื่อลบสินค้า
--    - order_items ใช้ surrogate key (id) แทน composite PK:
--      เดิม PRIMARY KEY (order_id, product_id) ขัดกับ ON DELETE SET NULL
--      เพราะคอลัมน์ใน PK ห้ามเป็น NULL → Postgres จะ error ตอนลบสินค้า
--    - กันรายการซ้ำด้วย UNIQUE แบบมีเงื่อนไข (เฉพาะแถวที่ product_id ไม่ NULL)
--    - ลบสินค้าแล้ว product_id เป็น NULL แต่ title/price snapshot ยังอยู่ครบ
--    - ตะกร้า (cart_items) ปล่อย CASCADE ได้เพราะตะกร้าไม่ใช่ประวัติ
--    - แนะนำ: ใช้ status='archived' แทนการลบสินค้าจริง (ดู PHASE0.md)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id           text PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  total_satang integer NOT NULL CHECK (total_satang >= 0),
  status       text NOT NULL DEFAULT 'pending_payment'
               CHECK (status IN ('pending_payment', 'paid', 'cancelled')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id     text NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id   text REFERENCES products (id) ON DELETE SET NULL,
  title        text NOT NULL,      -- snapshot ชื่อตอนสั่งซื้อ
  price_satang integer NOT NULL CHECK (price_satang >= 0),  -- snapshot ราคาตอนสั่งซื้อ
  qty          integer NOT NULL CHECK (qty > 0 AND qty <= 99)
);

-- กันสินค้าซ้ำในออเดอร์เดียว (เฉพาะแถวที่ยังผูกสินค้าอยู่;
-- แถวที่สินค้าถูกลบแล้ว product_id=NULL ได้หลายแถวโดยไม่ขัดกัน)
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_items_line
  ON order_items (order_id, product_id) WHERE product_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 5) Trigger กัน client โกงราคา/ยอด (ตรวจฝั่ง DB ไม่พึ่ง frontend)
-- ---------------------------------------------------------------------
-- 5.1 ราคาใน order_items ต้องตรงราคาปัจจุบันใน catalog ตอนบันทึก
CREATE OR REPLACE FUNCTION public.verify_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE catalog_price integer;
BEGIN
  -- กรณี SET NULL จาก ON DELETE CASCADE (ลบสินค้า):
  -- OLD มีสินค้า → NEW เป็น NULL = เก็บ title/price snapshot ไว้เป็นประวัติ อนุญาต
  -- (เจ้าของไม่มี policy UPDATE order_items อยู่แล้ว ทางนี้เกิดได้เฉพาะ cascade/แอดมิน)
  IF NEW.product_id IS NULL THEN
    IF TG_OP = 'INSERT' OR OLD.product_id IS NULL THEN
      RAISE EXCEPTION 'order_items.product_id ห้ามเป็น NULL ตอนสร้างรายการ';
    END IF;
    RETURN NEW;
  END IF;
  -- อ่านผ่าน RLS ของผู้เรียก: สินค้า draft/archived มองไม่เห็น
  -- catalog_price จึงเป็น NULL → สั่งซื้อสินค้าที่ยังไม่เผยแพร่ไม่ได้
  SELECT price_satang INTO catalog_price FROM public.products WHERE id = NEW.product_id;
  IF catalog_price IS NULL THEN
    RAISE EXCEPTION 'ไม่พบสินค้า % ใน catalog', NEW.product_id;
  END IF;
  IF NEW.price_satang IS DISTINCT FROM catalog_price THEN
    RAISE EXCEPTION 'ราคาไม่ตรง catalog สำหรับสินค้า %', NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verify_order_item_price ON order_items;
CREATE TRIGGER trg_verify_order_item_price
  BEFORE INSERT OR UPDATE OF price_satang, product_id ON order_items
  FOR EACH ROW EXECUTE FUNCTION public.verify_order_item_price();

-- 5.2 ยอดรวม orders.total_satang ต้อง = ผลรวมรายการ (ตรวจตอน commit)
CREATE OR REPLACE FUNCTION public.verify_order_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_oid   text;
  v_total integer;
  v_sum   integer;
  v_cnt   integer;
BEGIN
  -- ตรวจ "ทั้งออเดอร์ปลายทางและต้นทาง" กันย้ายรายการข้ามออเดอร์:
  -- ถ้าย้ายรายการสุดท้ายออกจากออเดอร์ A ไป B แล้วตรวจแค่ B
  -- A จะเหลือยอด/รายการไม่ตรงโดยไม่มีใครดัก
  FOR v_oid IN
    SELECT DISTINCT x FROM unnest(ARRAY[NEW.order_id, OLD.order_id]) AS x
    WHERE x IS NOT NULL
  LOOP
    SELECT total_satang INTO v_total FROM public.orders WHERE id = v_oid;
    -- ถ้าแถวออเดอร์ไม่อยู่แล้ว = กำลังลบทั้งออเดอร์ (cascade ลบรายการตาม)
    -- ไม่มีอะไรต้องตรวจต่อ ข้ามได้ (กัน cleanup/ลบเทสพังโดยไม่จำเป็น)
    IF v_total IS NULL THEN
      CONTINUE;
    END IF;
    SELECT COALESCE(SUM(price_satang * qty), 0), COUNT(*)
      INTO v_sum, v_cnt
      FROM public.order_items WHERE order_id = v_oid;
    IF v_total IS DISTINCT FROM v_sum THEN
      RAISE EXCEPTION 'ยอดรวมไม่ตรงรายการ (order %)', v_oid;
    END IF;
    -- กันลบ/ย้ายรายการทั้งหมดจนออเดอร์ว่าง (รวมกรณีสินค้าราคา 0 ที่เช็กยอดจับไม่ได้)
    IF v_cnt = 0 THEN
      RAISE EXCEPTION 'คำสั่งซื้อต้องมีอย่างน้อย 1 รายการ (order %)', v_oid;
    END IF;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_verify_order_total ON order_items;
CREATE CONSTRAINT TRIGGER trg_verify_order_total
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.verify_order_total();

-- 5.3 กันแก้ยอดรวม/สถานะ/เจ้าของของ orders โดยตรง (ปิดช่องที่ RLS มองไม่เห็น)
--     ที่มา: policy orders_cancel_own คุมแค่คอลัมน์ status
--     client จึงอาจแนบ total_satang ใหม่ไปพร้อม status='cancelled' ได้
--     trigger นี้บังคับระดับแถว: คนทั่วไปทำได้แค่ pending_payment -> cancelled
--     และห้ามแตะ total_satang / user_id / id เด็ดขาด (แอดมินเท่านั้นที่พ้น)
CREATE OR REPLACE FUNCTION public.verify_order_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.total_satang IS DISTINCT FROM OLD.total_satang THEN
    RAISE EXCEPTION 'ห้ามแก้ไขยอดรวมคำสั่งซื้อ';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'ห้ามแก้ไขเวลาสร้างคำสั่งซื้อ';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'ห้ามย้ายความเป็นเจ้าของคำสั่งซื้อ';
  END IF;
  IF NOT (OLD.status = 'pending_payment' AND NEW.status = 'cancelled') THEN
    RAISE EXCEPTION 'เปลี่ยนสถานะได้เฉพาะ pending_payment -> cancelled';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verify_order_update ON orders;
CREATE TRIGGER trg_verify_order_update
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.verify_order_update();

-- 5.4 กันสร้างออเดอร์เปล่า (ตรวจฝั่ง orders ตอน commit คู่กับ 5.2)
--     ไม่พึ่ง constraint trigger บน order_items เพียงอย่างเดียว:
--     ออเดอร์ที่ INSERT มาโดยไม่มีรายการเลยจะไม่แตะ order_items
--     trigger 5.2 จึงไม่มีโอกาสทำงาน — ตัวนี้อุดช่องนั้นโดยเฉพาะ
CREATE OR REPLACE FUNCTION public.verify_order_has_items()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = NEW.id) THEN
    RAISE EXCEPTION 'คำสั่งซื้อต้องมีอย่างน้อย 1 รายการ (order %)', NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verify_order_has_items ON orders;
CREATE CONSTRAINT TRIGGER trg_verify_order_has_items
  AFTER INSERT ON orders
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.verify_order_has_items();

-- ---------------------------------------------------------------------
-- 6) Index สำหรับค้นหา/กรอง 2 ภาษา
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_doc_lang_type
  ON products (document_language, document_type);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_tags_gin ON products USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_products_title_trgm
  ON products USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_desc_trgm
  ON products USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items (user_id);

-- =====================================================================
-- 7) RLS — เปิดทุกตาราง (ดูคำอธิบายรายตารางใน PHASE0.md ข้อ 3)
-- =====================================================================
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
-- อ่านโปรไฟล์ตัวเองได้ (หน้า Navbar ต้องใช้ชื่อผู้ใช้)
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);
-- แก้ได้เฉพาะ name ของตัวเอง และห้ามเปลี่ยน role ผ่าน API
-- (WITH CHECK บังคับ role ใหม่ = role เดิมที่ DB จำไว้;
--  ส่วน email/created_at ล็อกด้วย GRANT ระดับคอลัมน์ในข้อ 8 ไม่พึ่ง RLS อย่างเดียว)
DROP POLICY IF EXISTS profiles_update_own_name ON profiles;
CREATE POLICY profiles_update_own_name ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = public.my_role());
-- ไม่มี policy INSERT/DELETE: แถวสร้างโดย trigger handle_new_user เท่านั้น

-- ---- products ----
-- คนทั่วไป (รวมยังไม่ล็อกอิน) อ่านได้เฉพาะสินค้า published
DROP POLICY IF EXISTS products_select_published ON products;
CREATE POLICY products_select_published ON products
  FOR SELECT USING (status = 'published');
-- แอดมิน (สิทธิ์จาก profiles.role ใน DB) เห็น+จัดการทั้งหมด
DROP POLICY IF EXISTS products_admin_all ON products;
CREATE POLICY products_admin_all ON products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- cart_items ----
-- เจ้าของเท่านั้น (อ่าน/เพิ่ม/แก้/ลบของตัวเอง)
DROP POLICY IF EXISTS cart_items_own ON cart_items;
CREATE POLICY cart_items_own ON cart_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- orders ----
-- เจ้าของอ่านออเดอร์ตัวเองได้
DROP POLICY IF EXISTS orders_select_own ON orders;
CREATE POLICY orders_select_own ON orders
  FOR SELECT USING (auth.uid() = user_id);
-- เจ้าของสร้างออเดอร์ตัวเองได้ แต่ status เริ่มต้นต้อง pending_payment เท่านั้น
-- (ห้าม client ตั้ง paid เอง; total ถูก trigger 5.2 ตรวจซ้ำตอน commit)
DROP POLICY IF EXISTS orders_insert_own ON orders;
CREATE POLICY orders_insert_own ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending_payment');
-- เจ้าของยกเลิกออเดอร์ตัวเองที่ยังไม่จ่ายได้เท่านั้น
-- (ยอดรวม/เจ้าของถูกล็อกซ้ำด้วย trigger 5.3 กันแนบ total ใหม่มากับคำสั่งยกเลิก)
DROP POLICY IF EXISTS orders_cancel_own ON orders;
CREATE POLICY orders_cancel_own ON orders
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending_payment')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');
-- แอดมินจัดการทั้งหมด (เช่น ยืนยัน paid ภายหลัง — รอบนี้ยังไม่ใช้)
DROP POLICY IF EXISTS orders_admin_all ON orders;
CREATE POLICY orders_admin_all ON orders
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- order_items ----
-- อ่านได้เฉพาะรายการในออเดอร์ของตัวเอง
DROP POLICY IF EXISTS order_items_select_own ON order_items;
CREATE POLICY order_items_select_own ON order_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
-- เพิ่มได้เฉพาะในออเดอร์ "ของตัวเองที่ยังไม่จ่าย" และต้องผูกสินค้าจริง
-- (ห้ามเติมรายการลงออเดอร์ที่ cancelled/paid แล้ว; ราคา/ยอดถูก trigger ตรวจซ้ำ)
DROP POLICY IF EXISTS order_items_insert_own ON order_items;
CREATE POLICY order_items_insert_own ON order_items
  FOR INSERT WITH CHECK (
    product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
        AND orders.status = 'pending_payment'));
-- ไม่มี policy UPDATE/DELETE ของเจ้าของ: รายการที่สั่งแล้วห้ามแก้ (รักษาประวัติ)
-- แอดมินจัดการได้เมื่อจำเป็น
DROP POLICY IF EXISTS order_items_admin_all ON order_items;
CREATE POLICY order_items_admin_all ON order_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================================
-- 8) SQL privileges — ชั้นบังคับระดับคอลัมน์/ตาราง ไม่พึ่ง RLS อย่างเดียว
--    หลัก: REVOKE ทั้งหมดก่อน แล้ว GRANT เท่าที่จำเป็น (least privilege)
-- =====================================================================
-- ---- profiles: แก้ได้เฉพาะคอลัมน์ name ----
REVOKE ALL ON profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (name) ON profiles TO authenticated;
-- หมายเหตุ: UPDATE(name) ระดับ privilege + WITH CHECK ระดับ RLS (role ห้ามเปลี่ยน)
-- สองชั้นนี้ทำให้ email / role / created_at / id แตะผ่าน API ไม่ได้เลย

-- ---- products: ทั่วไปอ่าน, แอดมิน (authenticated+RLS) เขียน ----
REVOKE ALL ON products FROM PUBLIC, anon, authenticated;
GRANT SELECT ON products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON products TO authenticated;

-- ---- cart_items / orders / order_items: เฉพาะผู้ล็อกอิน ผ่าน RLS เจ้าของ ----
REVOKE ALL ON cart_items FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cart_items TO authenticated;
REVOKE ALL ON orders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO authenticated;
REVOKE ALL ON order_items FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_items TO authenticated;
-- sequence ของ surrogate key (ต้องมี USAGE ไม่งั้น INSERT จะ error)
GRANT USAGE, SELECT ON SEQUENCE order_items_id_seq TO authenticated;

-- ---- functions: ตัดสิทธิ์ PUBLIC/anon คงไว้เฉพาะ authenticated ----
REVOKE ALL ON FUNCTION public.my_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
-- หมายเหตุ: handle_new_user ทำงานผ่าน trigger ระดับ definer อยู่แล้ว
-- ไม่ต้อง GRANT EXECUTE ให้ role ใด (revoke ไว้กันเรียกตรง)

-- ---- trigger functions: ห้ามเรียกตรงเด็ดขาด (ถูกเรียกผ่าน trigger เท่านั้น) ----
-- หมายเหตุ: การ fire ของ trigger ตรวจสิทธิ์ที่ตาราง ไม่ได้ตรวจ EXECUTE ของฟังก์ชัน
-- จึง revoke ได้อย่างปลอดภัย — ถ้าสมมตินี้ผิด ทุก DML จะ error ดังทันทีตอนทดสอบ
REVOKE ALL ON FUNCTION public.verify_order_item_price() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_order_total() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_order_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_order_has_items() FROM PUBLIC, anon, authenticated;
