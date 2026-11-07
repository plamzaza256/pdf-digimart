import { Link, NavLink } from 'react-router-dom';
import { useShop } from '../store/shop';

export default function Navbar() {
  const { favoriteCount } = useShop();

  return (
    <header className="nav-wrap">
      <nav className="nav">
        <Link to="/" className="brand">
          <img src="Line02.png" alt="โลโก้ร้านให้แม่มึงทำ" className="brand-logo" />
          <span className="brand-text">
            Mock Test By ให้แม่มึงทำ
          </span>
        </Link>
        <div className="nav-links">
          <NavLink to="/" end>หน้าแรก</NavLink>
          <NavLink to="/shop">ค้นหา</NavLink>
        </div>
        <div className="nav-actions">
          {/* ⭐ ดาวถูกใจ — กดได้ พาไปหน้าสินค้าที่ถูกใจ */}
          <Link to="/favorites" className="fav-chip" title="สินค้าที่คุณกดถูกใจ">
            <span className="star-icon">⭐</span> ถูกใจ ({favoriteCount})
          </Link>
        </div>
      </nav>
    </header>
  );
}
