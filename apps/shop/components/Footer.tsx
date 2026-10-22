import { Link } from 'react-router-dom';
import { useStoreConfig } from '@shared/store/config';

export default function Footer() {
  const { config } = useStoreConfig();
  const storeName = config?.store_name || 'ให้แม่มึงทำ';
  const lineLink = config?.line_oa_link || '';

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <strong>{storeName}</strong>
          <p>
            ดูตัวอย่างสินค้าได้ฟรี กดสั่งซื้อเพื่อไปสั่งซื้อที่ LINE OA ของร้าน
            เจ้าของร้านเป็นผู้ส่งไฟล์ให้หลังยืนยันยอด
          </p>
        </div>
        <div>
          <strong>เมนู</strong>
          <ul className="footer-links">
            <li><Link to="/">หน้าแรก</Link></li>
            <li><Link to="/shop">Search</Link></li>
            <li><Link to="/favorites">สินค้าที่ถูกใจ</Link></li>
            <li><Link to="/login">เข้าสู่ระบบ</Link></li>
            <li><a href="/#rate-website">⭐ ให้คะแนนเว็บไซต์</a></li>
            <li><Link to="/sheet">โครงสร้างชีต</Link></li>
          </ul>
        </div>
        <div>
          <strong>ติดต่อเรา</strong>
          <ul className="footer-links">
            {lineLink && (
              <li>
                <a href={lineLink} target="_blank" rel="noreferrer" className="footer-line-link">
                  LINE OA
                </a>
              </li>
            )}
            {config?.contact_email && <li>อีเมล: {config.contact_email}</li>}
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        © 2026 ให้แม่มึงทำ.co
      </div>
    </footer>
  );
}
