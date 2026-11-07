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

// ============================ ออเดอร์ / คลังไฟล์ ============================

// ============================ ค่าตั้งร้าน ============================

/** ค่าที่หน้าเว็บต้องรู้ก่อนเริ่มทำงาน (ข้อมูลร้าน) */
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
}

let publicConfigCache: PublicConfig | null = null;
/** 🔗 URL ที่ใช้ตอนดึง config — เปลี่ยน URL ต้องดึงใหม่เสมอ (กันค่าเก่าค้าง) */
let publicConfigCacheUrl = '';

/**
 * ดึงค่าตั้งร้านจากเซิร์ฟเวอร์ (โหลดครั้งเดียวเท่าที่ "URL เดิม")
 *
 * 🛡 ทำให้ไม่ต้องใส่ค่า Firebase ซ้ำในทุกเว็บที่ deploy
 * 🛡 เปลี่ยนเซิร์ฟเวอร์ (localStorage pdfshop_server_url_v1) → ดึงใหม่ทันที
 *     เดิมแค้ชข้ามชีวิตตาราง → เปลี่ยน URL แล้วได้ค่าของเซิร์ฟเวอร์เก่าอยู่
 */
export async function apiPublicConfig(): Promise<PublicConfig> {
  const url = getApiUrl();
  if (publicConfigCache && publicConfigCacheUrl === url) return publicConfigCache;
  const data = await getJson<PublicConfig>(`${url}?action=public.config`);
  if (!data.ok) {
    throw new Error('เซิร์ฟเวอร์ยังไม่ตอบสนอง');
  }
  publicConfigCache = data;
  publicConfigCacheUrl = url;
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

// ============================ ⭐ ให้คะแนนสินค้า ============================

/**
 * ⭐ บันทึกคะแนน (ไม่ต้องล็อกอิน — ให้คะแนนแบบไม่ระบุตัวตนได้)
 *
 * เขียนลงแท็บ "Rating" แถว 3 ลงไป
 *   Rating_id | email | User_id | product_id | created_at | rating | comment
 *
 * 1 คน = 1 แถวต่อ 1 สินค้า (บันทึกซ้ำ = ทับแถวเดิม)
 */
export function apiRateProduct(productId: string, rating: number, comment: string) {
  return call('rating.set', { product_id: productId, rating, comment });
}

// ============================ ⭐ ให้คะแนนเว็บไซต์ ============================

/**
 * ⭐ บันทึกคะแนนเว็บไซต์ (ให้คะแนนร้านทั้งร้าน)
 *
 * เขียนลงแท็บ Rating เดิม โดยใช้ product_id = "WEBSITE"
 * (สูตรเฉลี่ยรายสินค้าในชีตไม่กระทบ เพราะนับเฉพาะรหัสสินค้าจริง)
 */
export function apiRateWebsite(rating: number, comment: string) {
  return call('website.rate', { rating, comment });
}

/** ⭐ คะแนนเฉลี่ยของเว็บ + จำนวนคนให้คะแนน (อ่านอย่างเดียว) */
export async function apiWebsiteRating() {
  const res = await fetch(`${apiUrl()}?action=website.rating`);
  return (await res.json()) as { ok: boolean; avg?: number; count?: number };
}

/**
 * ⭐ คะแนนรวมของร้าน (เฉลี่ย + จำนวนคนที่ให้คะแนน)
 *
 * อ่านจากช่อง "AVG All" ในแท็บ Rating (เจ้าของร้านทำสูตรไว้เอง)
 */
export async function apiRatingStats() {
  const res = await fetch(`${apiUrl()}?action=rating.stats`);
  return (await res.json()) as { ok: boolean; avg?: number; count?: number };
}

// ============================ 👁️ นับคนเปิดดูสินค้า ============================

/**
 * 👁️ +1 จำนวนคนเปิดดูสินค้า
 *
 * 🔕 ไม่ต้องล็อกอิน (ทุกคนเปิดดูได้)
 * 🛡 เว็บจะยิงคำสั่งนี้ "คนละ 1 ครั้งต่อ 30 นาที ต่อสินค้า"
 *    กันตัวเลขบวมจากการรีเฟรชหน้า
 * ⚠️ ล้มเหลวก็ปล่อยเลย — ห้ามขึ้น error ให้ลูกค้าเห็น
 */
export async function apiProductView(productId: string) {
  try {
    const res = await fetch(
      `${apiUrl()}?action=product.view&id=${encodeURIComponent(productId)}`,
    );
    return (await res.json()) as { ok: boolean; views?: number };
  } catch {
    return { ok: false } as { ok: boolean; views?: number };
  }
}
