import { Link } from 'react-router-dom';
import { useShop } from '../store/shop';
import { useAuth } from '../store/auth';
import { formatPrice } from '../data/products';

export default function Orders() {
  const { myOrders } = useShop();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container page narrow">
        <h1>คำสั่งซื้อของฉัน</h1>
        <div className="notice warn-box">กรุณาเข้าสู่ระบบ (จำลอง) ก่อนดูคำสั่งซื้อ</div>
        <Link to="/login" className="btn btn-primary">ไปเข้าสู่ระบบ</Link>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1>คำสั่งซื้อของฉัน</h1>
      <p className="muted">บัญชี {user.email} • รายการทั้งหมดเป็นข้อมูลจำลองในเบราว์เซอร์ ยังไม่มีการชำระเงินจริง</p>
      {myOrders.length === 0 ? (
        <div className="empty">
          ยังไม่มีคำสั่งซื้อ <br /><br />
          <Link to="/shop" className="btn btn-primary">เริ่มเลือกไฟล์ PDF</Link>
        </div>
      ) : (
        <div className="order-list">
          {myOrders.map((o) => (
            <div key={o.id} className="order-card">
              <div className="order-head">
                <b>{o.id}</b>
                <span className="pill">{o.status}</span>
              </div>
              <div className="muted small">{new Date(o.createdAt).toLocaleString('th-TH')}</div>
              <ul>
                {o.items.map((it) => (
                  <li key={it.productId}>
                    {it.title} × {it.qty} — {formatPrice(it.price * it.qty)}
                  </li>
                ))}
              </ul>
              <div className="total-row"><span>ยอดรวม</span><strong>{formatPrice(o.total)}</strong></div>
              <p className="muted small">🔒 รุ่นนี้ยังไม่เปิดดาวน์โหลดไฟล์ฉบับเต็ม หลังเชื่อมระบบชำระเงินจริงจะแสดงปุ่มดาวน์โหลดตรงนี้</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
