import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '../store/shop';
import { useAuth } from '../store/auth';
import { formatPrice } from '../data/products';

export default function Cart() {
  const { cart, products, setQty, removeFromCart, clearCart, cartTotal, checkout } = useShop();
  const { user } = useAuth();
  const nav = useNavigate();

  const lines = cart
    .map((l) => ({ ...l, p: products.find((x) => x.id === l.productId) }))
    .filter((l) => l.p);

  const doCheckout = () => {
    const o = checkout();
    if (o) nav('/orders');
  };

  return (
    <div className="container page narrow">
      <h1>ตะกร้าสินค้า</h1>
      {lines.length === 0 ? (
        <div className="empty">
          ตะกร้าว่างเปล่า <br /><br />
          <Link to="/shop" className="btn btn-primary">ไปเลือกไฟล์ PDF</Link>
        </div>
      ) : (
        <>
          {lines.map((l) => (
            <div key={l.productId} className="cart-line">
              <div>
                <b>{l.p!.title}</b>
                <div className="muted small">{formatPrice(l.p!.price)} / ไฟล์</div>
              </div>
              <div className="cart-ctrl">
                <button className="btn btn-outline btn-sm" aria-label={`ลดจำนวน ${l.p!.title}`} onClick={() => setQty(l.productId, l.qty - 1)}>−</button>
                <span>{l.qty}</span>
                <button className="btn btn-outline btn-sm" aria-label={`เพิ่มจำนวน ${l.p!.title}`} onClick={() => setQty(l.productId, l.qty + 1)}>+</button>
                <button className="link danger" onClick={() => removeFromCart(l.productId)}>ลบ</button>
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'right' }}>
            <button
              className="link danger"
              onClick={() => { if (confirm('ล้างสินค้าทั้งหมดในตะกร้า?')) clearCart(); }}
            >
              ล้างตะกร้า
            </button>
          </div>
          <div className="total-row">
            <span>ยอดรวม (จำลอง)</span>
            <strong>{formatPrice(cartTotal)}</strong>
          </div>
          {!user ? (
            <div className="notice warn-box">
              กรุณา <Link to="/login" className="link">เข้าสู่ระบบ (จำลอง)</Link> ก่อนสั่งซื้อ
            </div>
          ) : (
            <button className="btn btn-primary btn-lg full" onClick={doCheckout}>
              ยืนยันคำสั่งซื้อจำลอง — ยังไม่จ่ายเงินจริง
            </button>
          )}
          <p className="muted small">รุ่นนี้ไม่มีระบบชำระเงินจริง กดสั่งซื้อเพื่อดูรายการในหน้า “คำสั่งซื้อของฉัน” เท่านั้น</p>
        </>
      )}
    </div>
  );
}
