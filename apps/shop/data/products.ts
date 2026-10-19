// ค่าคงที่ที่ใช้ทั่วหน้าเว็บ
// (ข้อมูลสินค้าจริงดึงจาก Google Sheets แล้ว — ไม่มีข้อมูลจำลองในโค้ดอีก)
export const CATEGORIES = ['ทั้งหมด', 'หนังสือ', 'เอกสาร', 'ข้อสอบ'] as const;

export function formatPrice(n: number): string {
  return n.toLocaleString('th-TH') + ' ฿';
}
