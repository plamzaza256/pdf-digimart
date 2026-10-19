import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '../store/shop';
import { useAuth } from '@shared/store/auth';
import { formatPrice } from '../data/products';
import { apiCreateOrder } from '@shared/lib/api';

export default function Cart() {
  const { cart, products, loading, setQty, removeFromCart, clearCart, cartTotal } = useShop();
  const { user, token } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lines = cart
    .map((l) => ({ ...l, p: products.find((x) => x.id === l.productId) }))
    .filter((l) => l.p);

  const doCheckout = async () => {
    if (!user || !token) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await apiCreateOrder(
        user.email,
        token,
        cart.map((l) => ({ productId: l.productId, qty: l.qty })),
        user.name,
      );
      if (!r.ok || !r.order_id) {
        setErr(r.error || 'สร้างคำสั่งซื้อไม่สำเร็จ');
        return;
      }
      clearCart();
      nav(`/pay/${r.order_id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'สร้างคำสั่งซื้อไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page narrow">
      <h1>ตะกร้าสินค้า</h1>
      {lines.length === 0 ? (
        <div className="empty">
          {loading ? 'กำลังโหลด…' : 'ตะกร้าว่างเปล่า'} <br /><br />
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
            <span>ยอดรวม</span>
            <strong>{formatPrice(cartTotal)}</strong>
          </div>
          {!user ? (
            <div className="notice warn-box">
              กรุณา <Link to="/login" className="link">เข้าสู่ระบบ</Link> ก่อนสั่งซื้อ
            </div>
          ) : (
            <button className="btn btn-primary btn-lg full" onClick={doCheckout} disabled={busy}>
              {busy ? 'กำลังสร้างคำสั่งซื้อ…' : 'ยืนยันคำสั่งซื้อ →'}
            </button>
          )}
          {err && <p className="error">{err}</p>}
          <p className="muted small">
            ขั้นต่อไปคือหน้าแจ้งชำระเงิน — โอนเงินแล้วแนบสลิปในแชทได้เลยครับ
          </p>
        </>
      )}
    </div>
  );
}
