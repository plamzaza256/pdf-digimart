import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@shared/store/auth';
import { formatPrice } from '../data/products';
import { apiMyOrders } from '@shared/lib/api';

interface MyOrder {
  orderId: string;
  createdAt: string;
  status: string;
  adminNote?: string;
  total: number;
  libraryGranted: boolean;
  items: { title: string; price: number; qty: number }[];
}

const STATUS_TEXT: Record<string, string> = {
  P: 'รอตรวจสอบ',
  S: 'สำเร็จ',
  F: 'ไม่สำเร็จ',
};

export default function Orders() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) {
      setLoading(false);
      return;
    }
    apiMyOrders(user.email, token)
      .then((r) => {
        if (!r.ok) setErr(r.error || 'โหลดคำสั่งซื้อไม่สำเร็จ');
        else if (Array.isArray(r.orders)) setOrders(r.orders as MyOrder[]);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'โหลดคำสั่งซื้อไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [user, token]);

  if (!user) {
    return (
      <div className="container page narrow">
        <h1>คำสั่งซื้อของฉัน</h1>
        <div className="notice warn-box">กรุณาเข้าสู่ระบบก่อนดูคำสั่งซื้อ</div>
        <Link to="/login" className="btn btn-primary">ไปเข้าสู่ระบบ</Link>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1>คำสั่งซื้อของฉัน</h1>
      <p className="muted">บัญชี {user.email}</p>

      {loading && <p className="muted">กำลังโหลด…</p>}
      {err && <p className="error">{err}</p>}

      {!loading && orders.length === 0 && (
        <div className="empty">
          ยังไม่มีคำสั่งซื้อ <br /><br />
          <Link to="/shop" className="btn btn-primary">เริ่มเลือกไฟล์ PDF</Link>
        </div>
      )}

      <div className="order-list">
        {orders.map((o) => (
          <div key={o.orderId} className="order-card">
            <div className="order-head">
              <b>{o.orderId}</b>
              <span className={`pill st-${o.status}`}>{STATUS_TEXT[o.status] || o.status}</span>
            </div>
            <div className="muted small">{o.createdAt}</div>
            <ul>
              {o.items.map((it, i) => (
                <li key={i}>{it.title} × {it.qty} — {formatPrice(it.price * it.qty)}</li>
              ))}
            </ul>
            <div className="total-row"><span>ยอดรวม</span><strong>{formatPrice(o.total)}</strong></div>
            {o.adminNote && <p className="muted small">หมายเหตุจากร้าน: {o.adminNote}</p>}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to={`/pay/${o.orderId}`} className="btn btn-outline btn-sm">
                {o.status === 'P' ? 'ชำระเงิน / แนบสลิป' : 'ดูแชท'}
              </Link>
              {o.libraryGranted && (
                <Link to="/library" className="btn btn-primary btn-sm">ไปที่คลังไฟล์</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
