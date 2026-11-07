// ประเภทข้อมูลกลาง เตรียมไว้เชื่อมฐานข้อมูลจริงในอนาคต
export type Category = 'ห้อแล้ว' | 'หนังสือ' | 'Flashcard' | 'อื่นๆ';

export interface Product {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  category: Category;
  price: number;
  oldPrice?: number;
  /** จำนวนหน้า — เลข (80) หรือข้อความ ("80 ข้อ • 46") ตามที่เจ้าของร้านเขียนในชีต */
  pages?: number | string;
  fileSize: string;
  rating: number;
  sales: number;
  /** 👁️ จำนวนคนเปิดดู (นับโดยเซิร์ฟเวอร์) */
  views: number;
  coverColor: string;
  tags: string[];
  /** 📝 หมายเหตุจากเจ้าของร้าน (คอลัมน์ admin_note ในชีต Products) */
  adminNote?: string;
  /** 🖼️ ลิงก์รูปปก (คอลัมน์ cover_url ในชีต Products) */
  coverUrl?: string;
  /** 👁️ ลิงก์ไฟล์ตัวอย่าง (คอลัมน์ file_sample_url ในชีต Products) */
  sampleUrl?: string;
  /**
   * สถานะการเผยแพร่ (จาก dropdown ในชีต)
   *   published  → แสดงบนเว็บ
   *   WIP        → แสดงบนเว็บ แต่ไปท้ายสุด + ป้าย "WIP"
   *   Paused / Discontinued → ไม่แสดง
   */
  status?: 'published' | 'WIP' | 'Paused' | 'Discontinued';
  createdAt: string;
}

