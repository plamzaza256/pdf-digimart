import { Link } from 'react-router-dom';
import { useShop } from '../store/shop';
import { formatPrice } from '../data/products';
import OrderLineButton from '@shared/components/OrderLineButton';

/**
 * หน้า "สินค้าที่ถูกใจ"
 *
 * ⭐ ดาวถูกใจเก็บในเบราว์เซอร์ของผู้ใช้เท่านั้น (ไม่เขียนลงชีต)
 *    → เปลี่ยนเครื่อง / ล้างข้อมูลเบราว์เซอร์ = ดาวหาย
 *    → ไม่ต้องล็อกอินก็กดได้
 */
export default function Favorites() {
  const { favorites, products, toggleFavorite } = useShop();

  const items = favorites
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="container page narrow">
      <h1>สินค้าที่ถูกใจ ({items.length})</h1>
      <p className="muted">
        สินค้าที่คุณกดถูกใจไว้ — กดสั่งซื้อเพื่อไปที่ LINE OA ของร้าน
      </p>

      <div className="notice">
        ⭐ ดาวที่กดไว้อยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น — ไม่ถูกส่งไปที่เซิร์ฟเวอร์
        (เปลี่ยนเครื่องหรือล้างข้อมูลเบราว์เซอร์ = ดาวหาย)
      </div>

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
