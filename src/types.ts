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
  createdAt: string;
}

export interface User {
  name: string;
  email: string;
  /** เลขสมาชิกจากชีต (UID_0001 ถึง UID_9999) ใช้แสดงผลอย่างเดียว ใช้ล็อกอินไม่ได้ */
  userId?: string;
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
  /** รุ่นแรกเป็นสถานะจำลองทั้งหมด ยังไม่มีชำระเงินจริง */
  status: 'คำสั่งซื้อจำลอง — ยังไม่ชำระเงิน';
  createdAt: string;
}
