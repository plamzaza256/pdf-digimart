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
