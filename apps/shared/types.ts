// ประเภทข้อมูลกลาง เตรียมไว้เชื่อมฐานข้อมูลจริงในอนาคต
export type Category = 'หนังสือ' | 'เอกสาร' | 'ข้อสอบ';

export interface Product {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  category: Category;
  price: number;
  oldPrice?: number;
  pages: number;
  fileSize: string;
  rating: number;
  sales: number;
  coverColor: string;
  tags: string[];
  featured?: boolean;
  /** สถานะการเผยแพร่ — เว็บร้านแสดงเฉพาะ published */
  status?: 'published' | 'draft' | 'archived';
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

export interface CartLine {
  productId: string;
  qty: number;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  email: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
}
