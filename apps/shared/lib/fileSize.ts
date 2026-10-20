/**
 * 🔗 ตรวจว่าข้อความในเซลล์เป็นลิงก์หรือไม่
 *
 * เจ้าของร้านอาจใส่ลิงก์ Google Drive ในคอลัมน์ file_size
 * เว็บจะแสดงเป็นปุ่มกดได้แทนข้อความธรรมดา
 */
export function parseFileSize(value: string): {
  label: string;
  url: string;
  isLink: boolean;
} {
  const raw = String(value || '').trim();
  if (!raw) return { label: '', url: '', isLink: false };

  // หา URL ในข้อความ (กรณีเขียนว่า "PDF • Google Drive: https://...")
  const match = raw.match(/https?:\/\/[^\s,;]+/);
  if (match) {
    const url = match[0];
    // ข้อความที่เหลือคือคำอธิบาย
    const label = raw.replace(url, '').replace(/[•\-–—:|]\s*$/, '').trim() || 'ดูไฟล์';
    return { label: label, url: url, isLink: true };
  }

  return { label: raw, url: '', isLink: false };
}
