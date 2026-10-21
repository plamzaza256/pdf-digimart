import type { Product } from '@shared/types';

/**
 * 🗂️ หมวดหมู่ — ตรงกับ dropdown ในชีต Products
 *
 * ⚠️ ถ้าเจ้าของร้านเพิ่มหมวดหมู่ใหม่ในชีต
 *    ให้เพิ่มที่นี่ด้วย (ชื่อต้องตรงเป๊ะ)
 */
export const CATEGORIES = ['ทั้งหมด', 'ข้อสอบ', 'หนังสือ', 'Flashcard', 'อื่นๆ'] as const;

/**
 * 📦 ข้อมูลสินค้าตัวอย่าง — ไม่ได้ใช้แล้ว
 *
 * เดิมเว็บดึงสินค้าจากที่นี่ตอนต่อเซิร์ฟเวอร์ไม่ได้
 * → ลูกค้าเห็นตัวเลขปลอม (ยอดขาย 2,314 / คะแนน 4.9)
 * → ตอนนี้ดึงจากชีตจริงเท่านั้น ถ้าโหลดไม่ได้ก็บอกลูกค้าตรงๆ
 *    แทนที่จะโชว์ตัวเลขปลอม
 */
export const mockProducts: Product[] = [];

/** 💰 ฟอร์แมตราค่าเงิน */
export function formatPrice(price: number): string {
  return `${Math.round(price).toLocaleString('th-TH')} ฿`;
}

/**
 * 📄 แสดงจำนวนหน้า — เจ้าของร้านเขียนอย่างไรก็แสดงตามนั้น
 *
 *   96              → "96 หน้า"
 *   "150 ข้อ • 61"  → "150 ข้อ • 61 หน้า"
 *   "80 หน้า"       → "80 หน้า"   (ถ้ามีคำว่า "หน้า" อยู่แล้ว ไม่เติมซ้ำ)
 */
export function pagesLabel(pages: number | string | undefined): string {
  if (pages === undefined || pages === null) return '';
  const raw = typeof pages === 'number' ? String(pages) : String(pages).trim();
  if (!raw) return '';
  if (/หน้า/.test(raw)) return raw;
  return raw + ' หน้า';
}
