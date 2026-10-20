// ตัวเชื่อมต่อไปยัง Google Apps Script (ตัวกลางคุยกับ Google Sheets)
//
// หมายเหตุ: URL นี้เปิดสาธารณะได้ ไม่ใช่ข้อมูลลับ
// ความปลอดภัยมาจากการตรวจสิทธิ์ฝั่ง Apps Script ไม่ใช่การซ่อน URL

const API_URL =
  'https://script.google.com/macros/s/AKfycbw0bNY-QDZU7IEIPkjWkKCsukpiC9sYhJNWIyOpxeW527IxuA3GqbsEWo2M_HO4lcsl/exec';

export interface ApiUser {
  user_id: string;
  email: string;
  name: string;
  created_at?: string;
  login_method?: 'password' | 'google';
  /** สิทธิ์ผู้ดูแลร้าน — คำนวณจากเซิร์ฟเวอร์ ไม่ควรเชื่อค่าจากเบราว์เซอร์ */
  is_admin?: boolean;
}

interface ApiResult {
  ok: boolean;
  error?: string;
  message?: string;
  user?: ApiUser;
  token?: string;
  [k: string]: unknown;
}

/**
 * เรียก Apps Script
 * - ใช้ Content-Type: text/plain เท่านั้น ถ้าใช้ application/json
 *   เบราว์เซอร์จะส่งคำขอ preflight แล้ว Apps Script จะไม่ตอบ
 *   ทำให้ error "No action with the given name" หรือ CORS
 */
async function call(action: string, payload: Record<string, unknown> = {}): Promise<ApiResult> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch {
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองเช็คอินเทอร์เน็ตอีกครั้ง');
  }

  const text = await res.text();
  let data: ApiResult;
  try {
    data = JSON.parse(text) as ApiResult;
  } catch {
    throw new Error('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (อาจยังไม่ได้ Deploy ล่าสุด)');
  }
  return data;
}

// ============================ สมาชิก ============================

/**
 * เข้าสู่ระบบผ่าน Firebase
 * รับ Firebase ID Token ที่หน้าเว็บได้มา → ส่งให้เซิร์ฟเวอร์ตรวจกับ Google
 * เซิร์ฟเวอร์จะคืน "รหัสผู้ใช้" ของเรามาให้เก็บในเบราว์เซอร์
 */
export function apiFirebaseLogin(idToken: string, name?: string) {
  return call('user.firebase', { id_token: idToken, name: name || '' });
}

/** ดึงข้อมูลเดิมของสมาชิก (ใช้ตอนกลับมาเข้าเว็บอีกครั้ง) */
export function apiCheckUser(email: string) {
  return call('user.check', { email });
}

/**
 * ยืนยันตัวตนด้วยอีเมล + รหัสผู้ใช้ โดยไม่ต้องกรอกรหัสผ่าน
 * นี่คือตัวที่ยืนยันว่า "คนนี้คือคนที่ล็อกอินไว้จริง" ก่อนดึงคลังไฟล์
 */
export function apiSession(email: string, token: string) {
  return call('user.session', { email, token });
}


// ============================ ออเดอร์ / คลังไฟล์ ============================

export interface ApiOrder {
  orderId: string;
  createdAt: string;
  customerName?: string;
  customerEmail?: string;
  userId?: string;
  status: string;
  total: number;
  paymentRef?: string;
  libraryGranted?: boolean;
  items: { productId: string; title: string; price: number; qty: number }[];
}

/** ออเดอร์ทั้งหมด (เฉพาะผู้ดูแล) */
export function apiOrderList(email: string, token: string) {
  return call('order.list', { email, token });
}

/** ยืนยันว่าจ่ายเงินแล้ว → ระบบแจกสิทธิ์เข้าคลังไฟล์อัตโนมัติ */
export function apiVerifyOrder(email: string, token: string, orderId: string) {
  return call('order.verify', { email, token, order_id: orderId });
}

/** ปฏิเสธคำสั่งซื้อ (เฉพาะผู้ดูแล) */
export function apiRejectOrder(email: string, token: string, orderId: string) {
  return call('order.reject', { email, token, order_id: orderId });
}

/** ถอดสิทธิ์ดาวน์โหลด (เฉพาะผู้ดูแล) */
export function apiRevokeGrant(email: string, token: string, grantId: string) {
  return call('library.revoke', { email, token, grant_id: grantId });
}

// ============================ ค่าตั้งร้าน ============================

/** ค่าที่หน้าเว็บต้องรู้ก่อนเริ่มทำงาน (Firebase + ข้อมูลร้าน) */
export interface PublicConfig {
  ok: boolean;
  store_name: string;
  promptpay_phone: string;
  promptpay_name: string;
  contact_line: string;
  contact_email: string;
  /** ลิงก์ LINE OA ของร้าน — ปุ่มสีเขียวพาไปที่นี่ */
  line_oa_link: string;
  banking_open: boolean;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
  };
}

let publicConfigCache: PublicConfig | null = null;

/**
 * ดึงค่าตั้งร้านจากเซิร์ฟเวอร์ (โหลดครั้งเดียว เก็บไว้ในหน่วยความจำ)
 * ทำให้ไม่ต้องใส่ค่า Firebase ซ้ำในทุกเว็บที่ deploy
 */
export async function apiPublicConfig(): Promise<PublicConfig> {
  if (publicConfigCache) return publicConfigCache;
  const res = await fetch(`${API_URL}?action=public.config`);
  if (!res.ok) throw new Error('โหลดค่าตั้งร้านไม่สำเร็จ');
  const data = (await res.json()) as PublicConfig;
  if (!data.ok || !data.firebase || !data.firebase.apiKey) {
    throw new Error('เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Firebase');
  }
  publicConfigCache = data;
  return data;
}

// ============================ สินค้า ============================

export async function apiListProducts() {
  const res = await fetch(`${API_URL}?action=products.list`);
  return (await res.json()) as { ok: boolean; products: unknown[] };
}

/** สินค้าทั้งหมดรวม draft (เฉพาะแอดมิน) */
export function apiListProductsAll(email: string, token: string) {
  return call('product.list.all', { email, token });
}

/** เพิ่ม/แก้สินค้าลงชีต (เฉพาะแอดมิน) */
export function apiUpsertProduct(
  email: string,
  token: string,
  product: Record<string, unknown>,
) {
  return call('product.upsert', { email, token, product });
}

/** ซ่อน/ลบสินค้า (เฉพาะแอดมิน) */
export function apiDeleteProduct(email: string, token: string, id: string) {
  return call('product.delete', { email, token, id });
}

/** แก้ค่าตั้งร้าน เช่น ลิงก์ LINE OA (เฉพาะแอดมิน) */
export function apiSetConfig(
  email: string,
  token: string,
  key: string,
  value: string,
) {
  return call('config.set', { email, token, key, value });
}

/** บันทึกยอดขาย 1 รายการ (เฉพาะแอดมิน) */
export function apiAddSale(
  email: string,
  token: string,
  productId: string,
  qty: number,
  channel?: string,
  note?: string,
) {
  return call('sales.add', {
    email,
    token,
    product_id: productId,
    qty,
    channel: channel || 'LINE OA',
    note: note || '',
  });
}

/** รายการยอดขายทั้งหมด (เฉพาะแอดมิน) */
export function apiSalesList(email: string, token: string) {
  return call('sales.list', { email, token });
}

/** สรุปยอดขายรวม (เฉพาะแอดมิน) */
export function apiSalesSummary(email: string, token: string) {
  return call('sales.summary', { email, token });
}

export async function apiGetConfig() {
  const res = await fetch(`${API_URL}?action=config`);
  return (await res.json()) as Record<string, string>;
}