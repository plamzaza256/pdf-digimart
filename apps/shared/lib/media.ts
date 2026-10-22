/**
 * 🖼️ รูปปก + 👁️ ตัวอย่างไฟล์
 *
 * รูปปกสินค้า (2 วิธี — เลือกอันไหนก็ได้)
 *   1) คอลัมน์ cover_url ในชีต Products (ลิงก์ Google Drive แบบตรง)
 *      เช่น https://drive.google.com/uc?export=view&id=XXXX
 *   2) วางไฟล์ไว้ที่ public/covers/{รหัสสินค้า}.jpg  (ตัวพิมพ์เล็กทั้งหมด)
 *      เช่น FWD-001 → public/covers/fwd-001.jpg
 *
 * ตัวอย่างไฟล์ PDF
 *   วางไฟล์ไว้ที่ public/samples/{รหัสสินค้า}.pdf
 *   เช่น FWD-001 → public/samples/fwd-001.pdf
 */

/** แปลงรหัสสินค้าเป็นชื่อไฟล์ (ตัวพิมพ์เล็ก ใช้ _ แทนช่องว่าง) */
export function mediaKey(productId: string): string {
  return String(productId || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-]/g, '');
}

/** ลิงก์รูปปกจากชีต (ถ้ามี) */
export function coverUrlFromSheet(product: { coverUrl?: string; adminNote?: string; id: string }): string {
  return String(product.coverUrl || '').trim();
}

/** ลิงก์รูปปกจากไฟล์ในเว็บ (public/covers/{id}.jpg) */
export function coverUrlFromFiles(productId: string): string {
  return '/covers/' + mediaKey(productId) + '.jpg';
}

/** ลิงก์ไฟล์ตัวอย่าง PDF */
export function sampleUrl(productId: string): string {
  return '/samples/' + mediaKey(productId) + '.pdf';
}

/** ลิงก์ไฟล์จริงที่ลูกค้าจะได้หลังยืนยันยอด (จากคอลัมน์ file_size ถ้าเป็น URL) */
export function fileLinkFromSheet(fileSize: string | undefined): string {
  const v = String(fileSize || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return '';
}
