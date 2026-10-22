import { Link } from 'react-router-dom';
import { useShop } from '../store/shop';
import { useAuth } from '@shared/store/auth';
import { formatPrice } from '../data/products';
import OrderLineButton from '@shared/components/OrderLineButton';

/**
 * หน้า "สินค้าที่ถูกใจ"
 *
 * ⭐ ดาวถูกใจจะผูกกับอีเมลของผู้ใช้ (เก็บในชีต)
 *    → ล็อกอินใหม่ / เปลี่ยนเครื่อง / ล้างเบราว์เซอร์ ดาวยังอยู่
 */
export default function Favorites() {
  const { favorites, products, toggleFavorite } = useShop();
  const { user } = useAuth();

  const items = favorites
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="container page narrow">
      <h1>สินค้าที่ถูกใจ ({items.length})</h1>
      <p className="muted">
        สินค้าที่คุณกดถูกใจไว้ — กดสั่งซื้อเพื่อไปที่ LINE OA ของร้าน
      </p>

      {!user && (
        <div className="notice warn-box">
          ⭐ ดาวที่กดไว้อยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น (ไม่ถูกส่งไปเซิร์ฟเวอร์)
          <br />
          <Link to="/login" className="link">เข้าสู่ระบบ</Link> เพื่อให้ดาวผูกกับอีเมลของคุณ
          (ล็อกอินใหม่หรือเปลี่ยนเครื่องก็ยังเห็นดาวเดิม)
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          ยังไม่มีสินค้าที่ถูกใจ <br /><br />
          <Link to="/shop" className="btn btn-primary">ไปเลือกดูสินค้า</Link>
        </div>
      ) : (
        <>
          {items.map((p) => (
            <div key={p.id} className="cart-line">
              <div>
                <b>{p.title}</b>
                <div className="muted small">{formatPrice(p.price)} / ไฟล์</div>
              </div>
              <div className="cart-ctrl">
                <OrderLineButton size="sm" productTitle={p.title} />
                <button className="link danger" onClick={() => toggleFavorite(p.id)}>
                  เอาออก
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
