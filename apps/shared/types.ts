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
  coverColor: string;
  tags: string[];
  /**
   * สถานะการเผยแพร่ (จาก dropdown ในชีต)
   *   published  → แสดงบนเว็บ
   *   WIP        → แสดงบนเว็บ แต่ไปท้ายสุด + ป้าย "WIP"
   *   Paused / Discontinued → ไม่แสดง
   */
  status?: 'published' | 'WIP' | 'Paused' | 'Discontinued';
  createdAt: string;
}

export interface User {
  name: string;
  email: string;
  /** เลขสมาชิกจากชีต (UID_0001 ถึง UID_9999) ใช้แสดงผลอย่างเดียว ใช้ล็อกอินไม่ได้ */
  userId?: string;
  /** วิธีที่สมาชิกเข้าสู่ระบบ (ปัจจุบันใช้ Google อย่างเดียว) */
  loginMethod?: 'google';
  role: 'customer' | 'admin';
  createdAt: string;
}

