import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <strong>PDF ดิจิมาร์ท (รุ่นทดลอง)</strong>
          <p>
            ร้านขายไฟล์ดิจิทัล — หนังสือ เอกสาร และข้อสอบ
            ในรูปแบบ PDF สำหรับคนไทย
          </p>
          <p className="muted small">
            เว็บไซต์นี้เป็นระบบจำลองเพื่อทดสอบหน้าตาและขั้นตอนการใช้งานเท่านั้น
            ยังไม่มีการชำระเงินจริง ยังไม่เก็บข้อมูลสำคัญจริง
            และยังไม่เปิดดาวน์โหลดไฟล์ฉบับเต็ม
          </p>
        </div>
        <div>
          <strong>เมนู</strong>
          <ul className="footer-links">
            <li><Link to="/">หน้าแรก</Link></li>
            <li><Link to="/shop">หน้าร้าน</Link></li>
            <li><Link to="/orders">คำสั่งซื้อของฉัน</Link></li>
            <li><Link to="/login">เข้าสู่ระบบ</Link></li>
          </ul>
        </div>
        <div>
          <strong>แผนในอนาคต (ยังไม่เปิดใช้)</strong>
          <ul className="footer-links">
            <li>เชื่อมฐานข้อมูล + ระบบสมาชิกจริง</li>
            <li>ชำระเงินผ่าน PromptPay / บัตร</li>
            <li>ระบบส่งลิงก์ดาวน์โหลดอัตโนมัติ</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        © 2026 PDF ดิจิมาร์ท — สร้างด้วย React + Vite • งบ 0 บาท • โค้ดเปิดดูได้ใน README
      </div>
    </footer>
  );
}
