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
  status: 'P' | 'S' | 'F' | string;
  adminNote?: string;
  verifiedAt?: string;
  total: number;
  libraryGranted?: boolean;
  items: { productId: string; title: string; price: number; qty: number }[];
}

/** สร้างคำสั่งซื้อจริง (ต้องล็อกอิน) */
export function apiCreateOrder(
  email: string,
  token: string,
  items: { productId: string; qty: number }[],
  name?: string,
) {
  return call('order.create', { email, token, items, name: name || '' });
}

/** ออเดอร์ของตัวเอง */
export function apiMyOrders(email: string, token: string) {
  return call('order.mine', { email, token });
}

/** คลังไฟล์ของตัวเอง */
export function apiMyLibrary(email: string, token: string) {
  return call('library.list', { email, token });
}

/** แจ้งชำระเงิน / ส่งข้อความหาผู้ดูแล พร้อมแนบรูปสลิปได้ */
export function apiSendMessage(
  email: string,
  token: string,
  orderId: string,
  message: string,
  image?: { base64: string; name: string; type: string },
) {
  return call('message.send', {
    email,
    token,
    order_id: orderId,
    message,
    image_base64: image?.base64,
    image_name: image?.name,
    image_type: image?.type,
  });
}

/** ข้อความในออเดอร์ของตัวเอง */
export function apiMyMessages(email: string, token: string, orderId: string) {
  return call('message.list', { email, token, order_id: orderId });
}

/** ออเดอร์ทั้งหมด (เฉพาะผู้ดูแล) */
export function apiOrderList(email: string, token: string) {
  return call('order.list', { email, token });
}

/** ยืนยันว่าจ่ายเงินแล้ว → ระบบแจกสิทธิ์เข้าคลังไฟล์อัตโนมัติ */
export function apiVerifyOrder(email: string, token: string, orderId: string, note?: string) {
  return call('order.verify', { email, token, order_id: orderId, admin_note: note || '' });
}

/** ปฏิเสธคำสั่งซื้อ (เฉพาะผู้ดูแล) */
export function apiRejectOrder(email: string, token: string, orderId: string, note?: string) {
  return call('order.reject', { email, token, order_id: orderId, admin_note: note || '' });
}

/** inbox ของผู้ดูแล */
export function apiAdminInbox(email: string, token: string) {
  return call('admin.inbox', { email, token });
}

/** เปิดกระทู้ + ทำเครื่องหมายอ่านแล้ว */
export function apiAdminThread(email: string, token: string, orderId: string) {
  return call('admin.thread', { email, token, order_id: orderId });
}

/** ผู้ดูแลตอบกลับ */
export function apiAdminReply(
  email: string,
  token: string,
  orderId: string,
  message: string,
  image?: { base64: string; name: string; type: string },
) {
  return call('admin.reply', {
    email,
    token,
    order_id: orderId,
    message,
    image_base64: image?.base64,
    image_name: image?.name,
    image_type: image?.type,
  });
}

/**
 * อ่านไฟล์รูปเป็น base64 แล้วย่อขนาดก่อนส่ง
 * - ย่อด้านยาวสุดเหลือ 1,200px เพื่อไม่ให้คำขอใหญ่เกิน Apps Script
 */
export function readImageAsBase64(file: File): Promise<{ base64: string; name: string; type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพ'));
      img.onload = () => {
        const max = 1200;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve({ base64: dataUrl, name: file.name, type: file.type });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({
          base64: canvas.toDataURL('image/jpeg', 0.82),
          name: file.name,
          type: 'image/jpeg',
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
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

export async function apiGetConfig() {
  const res = await fetch(`${API_URL}?action=config`);
  return (await res.json()) as Record<string, string>;
}