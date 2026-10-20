import { Link } from 'react-router-dom';
import { useStoreConfig } from '@shared/store/config';

export default function Footer() {
  const { config } = useStoreConfig();
  const storeName = config?.store_name || 'PDF ให้แม่มึงทำ';

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <strong>{storeName}</strong>
          <p>
            ร้านขายไฟล์ดิจิทัล — หนังสือ เอกสาร และข้อสอบ
            ในรูปแบบ PDF สำหรับคนไทย
          </p>
          <p className="muted small">
            ดูตัวอย่างสินค้าได้ฟรี กดสั่งซื้อเพื่อไปสั่งซื้อที่ LINE OA ของร้าน
            เจ้าของร้านเป็นผู้ส่งไฟล์ให้หลังยืนยันยอด
          </p>
        </div>
        <div>
          <strong>เมนู</strong>
          <ul className="footer-links">
            <li><Link to="/">หน้าแรก</Link></li>
            <li><Link to="/shop">หน้าร้าน</Link></li>
            <li><Link to="/favorites">สินค้าที่ถูกใจ</Link></li>
            <li><Link to="/login">เข้าสู่ระบบ</Link></li>
          </ul>
        </div>
        <div>
          <strong>ติดต่อเรา</strong>
          <ul className="footer-links">
            {config?.contact_line && <li>LINE: {config.contact_line}</li>}
            {config?.contact_email && <li>อีเมล: {config.contact_email}</li>}
            <li>สั่งซื้อผ่าน LINE OA ของร้าน</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        © 2026 {storeName} — สร้างด้วย React + Vite • งบ 0 บาท • อ่านเพลิน สอบผ่าน แม่ภูมิใจ
      </div>
    </footer>
  );
}
