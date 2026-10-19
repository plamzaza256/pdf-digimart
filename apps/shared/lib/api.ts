// ตัวเชื่อมต่อไปยัง Google Apps Script (ตัวกลางคุยกับ Google Sheets)
//
// หมายเหตุ: URL นี้เปิดสาธารณะได้ ไม่ใช่ข้อมูลลับ
// ความปลอดภัยมาจากการตรวจสิทธิ์ฝั่ง Apps Script ไม่ใช่การซ่อน URL

const API_URL =
  'https://script.google.com/macros/s/AKfycbzz3-ldqt2ZiLbSGkV-bQ-K-OKAHjv9E60c3eKm0BsIevqsG-q7NdmHiFo9jCk77kHS/exec';

export interface ApiUser {
  user_id: string;
  email: string;
  name: string;
  created_at?: string;
  login_method?: 'password' | 'google';
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

/** สมัครสมาชิกใหม่ — ชีตจะกันอีเมลซ้ำให้อัตโนมัติ */
export function apiSignup(name: string, email: string, password: string) {
  return call('user.signup', { name, email, password });
}

/** เข้าสู่ระบบ — ต้องตรงทั้งอีเมลและรหัสผ่านในแถวเดียวกัน */
export function apiLogin(email: string, password: string) {
  return call('user.login', { email, password });
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

/** เปลี่ยนรหัสผ่าน */
export function apiChangePassword(email: string, oldPassword: string, newPassword: string) {
  return call('user.change_password', {
    email,
    old_password: oldPassword,
    new_password: newPassword,
  });
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