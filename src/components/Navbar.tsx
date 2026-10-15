import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useShop } from '../store/shop';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useShop();
  const nav = useNavigate();

  return (
    <header className="nav-wrap">
      <div className="demo-strip">
        ร้านจำลองเพื่อทดลองระบบ (Demo) — ยังไม่มีชำระเงินจริง / ยังไม่เปิดดาวน์โหลดไฟล์ฉบับเต็ม
      </div>
      <nav className="nav">
        <Link to="/" className="brand">
          <img src="logo.png" alt="โลโก้ร้านให้แม่มึงทำ" className="brand-logo" />
          <span className="brand-text">
            ให้แม่มึงทำ
            <small>ร้านไฟล์ PDF อังกฤษ</small>
          </span>
        </Link>
        <div className="nav-links">
          <NavLink to="/" end>หน้าแรก</NavLink>
          <NavLink to="/shop">หน้าร้าน</NavLink>
          <NavLink to="/orders">คำสั่งซื้อของฉัน</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin">แอดมิน</NavLink>}
        </div>
        <div className="nav-actions">
          <button
            className="btn btn-ghost"
            onClick={() => nav('/cart')}
            aria-label="ตะกร้า"
          >
            🛒 ตะกร้า ({cartCount})
          </button>
          {user ? (
            <>
              <span className="user-chip" title={user.email}>
                {user.name} {user.role === 'admin' ? '(แอดมินจำลอง)' : ''}
              </span>
              <button
                className="btn btn-outline"
                onClick={() => {
                  logout();
                  nav('/');
                }}
              >
                ออกจากระบบ
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-outline" onClick={() => nav('/login')}>
                เข้าสู่ระบบ
              </button>
              <button className="btn btn-primary" onClick={() => nav('/register')}>
                สมัครสมาชิก
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
