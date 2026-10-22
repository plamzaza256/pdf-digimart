// ตัวเชื่อมต่อไปยัง Google Apps Script (ตัวกลางคุยกับ Google Sheets)
//
// หมายเหตุ: URL นี้เปิดสาธารณะได้ ไม่ใช่ข้อมูลลับ
// ความปลอดภัยมาจากการตรวจสิทธิ์ฝั่ง Apps Script ไม่ใช่การซ่อน URL

const DEFAULT_API_URL =
  'https://script.google.com/macros/s/AKfycbw0bNY-QDZU7IEIPkjWkKCsukpiC9sYhJNWIyOpxeW527IxuA3GqbsEWo2M_HO4lcsl/exec';

/**
 * 🔗 URL ของเซิร์ฟเวอร์
 *
 * ⚠️ เก็บใน localStorage ได้ เพื่อแก้ URL ได้เร็วเมื่อ deploy ใหม่
 *    (ไม่ต้อง rebuild เว็บใหม่)
 *    เจ้าของร้านตั้งค่าได้ที่: เว็บแอดมิน → จัดการสินค้า → ตั้งค่าร้าน
 */
const SERVER_URL_KEY = 'pdfshop_server_url_v1';

export function getApiUrl(): string {
  try {
    const saved = localStorage.getItem(SERVER_URL_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    /* โหมดส่วนตัว — ใช้ค่าเริ่มต้น */
  }
  return DEFAULT_API_URL;
}

export function setApiUrl(url: string) {
  try {
    localStorage.setItem(SERVER_URL_KEY, url.trim());
  } catch {
    /* บันทึกไม่ได้ — ไม่เป็นไร */
  }
}

function apiUrl(): string {
  return getApiUrl();
}

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
    res = await fetch(apiUrl(), {
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
  const data = await getJson<PublicConfig>(`${apiUrl()}?action=public.config`);
  if (!data.ok || !data.firebase || !data.firebase.apiKey) {
    throw new Error('เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Firebase');
  }
  publicConfigCache = data;
  return data;
}

// ============================ สินค้า ============================


/**
 * 🔁 ยิง GET อย่างปลอดภัย — ลองซ้ำเมื่อเซิร์ฟเวอร์ Apps Script ตอบ 404/429 ชั่วคราว
 *
 * 🛡 ตอน deploy ใหม่ เซิร์ฟเวอร์จะตอบ 404 ประมาณ 1-2 นาที
 *    ถ้าไม่ลองซ้ำ → หน้าเว็บค้างที่ "กำลังโหลดสินค้า…" ตลอด
 */
async function getJson<T>(url: string, tries = 3): Promise<T> {
  let lastErr: unknown = null;
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return (await res.json()) as T;
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('โหลดข้อมูลไม่สำเร็จ');
}

export async function apiListProducts() {
  return getJson<{
    ok: boolean;
    products: unknown[];
    /** จำนวนสินค้าทั้งหมดในชีต (รวมที่ยังไม่เผยแพร่) */
    total?: number;
    /** จำนวนที่ถูกซ่อน (status ไม่ใช่ published) */
    hidden?: number;
    /** ยอดขายรวม (อ่านจากคอลัมน์ sales ในชีต Products) */
    salesTotal?: number;
  }>(`${apiUrl()}?action=products.list`);
}

export async function apiGetConfig() {
  const res = await fetch(`${apiUrl()}?action=config`);
  return (await res.json()) as Record<string, string>;
}

/**
 * 📋 โครงสร้างชีตแบบสาธารณะ (ไม่ต้องล็อกอิน)
 * คืนแค่ชื่อแท็บ/ชื่อคอลัมน์/dropdown — ไม่มีข้อมูลลูกค้า
 */
export async function apiSheetStructure() {
  const res = await fetch(`${apiUrl()}?action=sheet.structure`);
  return (await res.json()) as {
    ok: boolean;
    error?: string;
    sheets?: unknown[];
  };
}

// ============================ ⭐ ให้คะแนนสินค้า ============================

/**
 * ⭐ บันทึกคะแนน (ต้องล็อกอิน — กันสแปมแบบไม่ระบุตัวตน)
 *
 * เขียนลงแท็บ "Rating" แถว 3 ลงไป
 *   Rating_id | email | User_id | product_id | created_at | rating | comment
 *
 * 1 คน = 1 แถวต่อ 1 สินค้า (บันทึกซ้ำ = ทับแถวเดิม)
 */
export function apiRateProduct(
  email: string,
  token: string,
  productId: string,
  rating: number,
  comment: string,
) {
  return call('rating.set', { email, token, product_id: productId, rating, comment });
}

/** ⭐ คะแนนของผู้ใช้เอง (ต้องล็อกอิน) — ใช้เติมช่องให้คะแนนตอนเปิดครั้งแรก */
export function apiMyRating(email: string, token: string, productId: string) {
  return call('rating.mine', { email, token, product_id: productId });
}

// ============================ ⭐ ให้คะแนนเว็บไซต์ ============================

/**
 * ⭐ บันทึกคะแนนเว็บไซต์ (ให้คะแนนร้านทั้งร้าน)
 *
 * เขียนลงแท็บ Rating เดิม โดยใช้ product_id = "WEBSITE"
 * (สูตรเฉลี่ยรายสินค้าในชีตไม่กระทบ เพราะนับเฉพาะรหัสสินค้าจริง)
 */
export function apiRateWebsite(
  email: string,
  token: string,
  rating: number,
  comment: string,
) {
  return call('website.rate', { email, token, rating, comment });
}

/** ⭐ คะแนนเฉลี่ยของเว็บ + จำนวนคนให้คะแนน (อ่านอย่างเดียว) */
export async function apiWebsiteRating() {
  const res = await fetch(`${apiUrl()}?action=website.rating`);
  return (await res.json()) as { ok: boolean; avg?: number; count?: number };
}

/** ⭐ คะแนนเว็บของผู้ใช้เอง (ต้องล็อกอิน) */
export function apiWebsiteRatingMine(email: string, token: string) {
  return call('website.rating.mine', { email, token });
}
