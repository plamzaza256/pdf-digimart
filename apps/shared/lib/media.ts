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

/**
 * 🔗 แปลงลิงก์ไฟล์ให้ฝังในหน้าเว็บได้
 *
 * Google Drive  → https://drive.google.com/file/d/ID/preview  (ฝังใน iframe ได้)
 * ลิงก์อื่น      → ใช้ตามเดิม
 */
export function embedUrl(url: string): string {
  const v = String(url || '').trim();
  if (!v) return '';
  const m = v.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
  const m2 = v.match(/drive\.google\.com\/uc\?export=view&id=([a-zA-Z0-9_-]+)/);
  if (m2) return 'https://drive.google.com/file/d/' + m2[1] + '/preview';
  return v;
}

/**
 * 👁️ ลิงก์ไฟล์ตัวอย่างที่จะเอาไปฝัง
 *   1) จากชีต (file_sample_url) → ใช้ลิงก์ Drive
 *   2) ไม่มี → ใช้ไฟล์ในเว็บ public/samples/{id}.pdf
 */
export function sampleEmbedUrl(product: { sampleUrl?: string; id: string }): string {
  const fromSheet = String(product.sampleUrl || '').trim();
  if (fromSheet) return embedUrl(fromSheet);
  return sampleUrl(product.id);
}

/** 🔗 ลิงก์ไฟล์จริงที่ลูกค้าจะได้หลังยืนยันยอด (จากคอลัมน์ file_size ถ้าเป็น URL) */
export function fileLinkFromSheet(fileSize: string | undefined): string {
  const v = String(fileSize || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return '';
}
