import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@shared/store/auth';
import { formatPrice } from '../data/products';
import {
  apiMyMessages,
  apiMyOrders,
  apiPublicConfig,
  apiSendMessage,
  readImageAsBase64,
} from '@shared/lib/api';

interface Msg {
  id: string;
  sender: string;
  message: string;
  hasImage: boolean;
  sentAt: string;
}

const STATUS_TEXT: Record<string, string> = {
  P: 'รอตรวจสอบ',
  S: 'สำเร็จ',
  F: 'ไม่สำเร็จ',
};

export default function Pay() {
  const { orderId = '' } = useParams();
  const { user, token } = useAuth();
  const [order, setOrder] = useState<{
    orderId: string; status: string; total: number; createdAt: string;
    items: { title: string; qty: number; price: number }[];
  } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [config, setConfig] = useState<{ promptpay_phone: string; promptpay_name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user || !token) return;
    const [o, m] = await Promise.all([
      apiMyOrders(user.email, token),
      apiMyMessages(user.email, token, orderId),
    ]);
    if (o.ok && Array.isArray(o.orders)) {
      const found = (o.orders as unknown as typeof order[])?.find((x) => x && x.orderId === orderId);
      if (found) setOrder(found);
    }
    if (m.ok && Array.isArray(m.messages)) setMessages(m.messages as Msg[]);
  };

  useEffect(() => {
    apiPublicConfig().then((c) => setConfig(c)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, user?.email, token]);

  const send = async (file?: File) => {
    if (!user || !token) return;
    setBusy(true);
    setErr(null);
    try {
      let image;
      if (file) image = await readImageAsBase64(file);
      const r = await apiSendMessage(
        user.email,
        token,
        orderId,
        text || (file ? 'แนบสลิปการโอน' : ''),
        image,
      );
      if (!r.ok) {
        setErr(r.error || 'ส่งไม่สำเร็จ');
        return;
      }
      setText('');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ส่งไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="container page narrow">
        <div className="notice warn-box">กรุณาเข้าสู่ระบบก่อน</div>
        <Link to="/login" className="btn btn-primary">ไปเข้าสู่ระบบ</Link>
      </div>
    );
  }

  return (
    <div className="container page narrow">
      <h1>ชำระเงิน</h1>
      {!order ? (
        <p className="muted">กำลังโหลดคำสั่งซื้อ…</p>
      ) : (
        <>
          <div className="order-card">
            <div className="order-head">
              <b>{order.orderId}</b>
              <span className={`pill st-${order.status}`}>{STATUS_TEXT[order.status] || order.status}</span>
            </div>
            <ul>
              {order.items.map((it, i) => (
                <li key={i}>{it.title} × {it.qty} — {formatPrice(it.price * it.qty)}</li>
              ))}
            </ul>
            <div className="total-row"><span>ยอดที่ต้องโอน</span><strong>{formatPrice(order.total)}</strong></div>
          </div>

          {config?.promptpay_phone ? (
            <div className="notice" style={{ marginTop: 16 }}>
              <b>โอนผ่านพร้อมเพย์</b>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0' }}>
                {config.promptpay_phone}
              </div>
              <div>{config.promptpay_name}</div>
              <p className="muted small" style={{ marginTop: 8 }}>
                โอนให้ตรงยอด แล้วแนบสลิปด้านล่าง — ร้านจะตรวจสอบและเปิดสิทธิ์ดาวน์โหลดให้ครับ
              </p>
            </div>
          ) : (
            <div className="notice warn-box" style={{ marginTop: 16 }}>
              ร้านยังไม่ได้ตั้งค่าบัญชีรับเงิน — กรุณาติดต่อร้านทางแชทด้านล่าง
            </div>
          )}

          <h2 style={{ marginTop: 24 }}>แชทกับร้าน</h2>
          <div className="chat-box">
            {messages.length === 0 && <p className="muted small">ยังไม่มีข้อความ</p>}
            {messages.map((m) => (
              <div key={m.id} className={`chat-msg ${m.sender === 'customer' ? 'me' : 'them'}`}>
                <div>{m.message}{m.hasImage && <div className="small">📎 แนบสลิปแล้ว</div>}</div>
                <div className="chat-time">{m.sentAt}</div>
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={text}
              placeholder="พิมพ์ข้อความ…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            />
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) send(f); }} />
            <button className="btn btn-outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              📎 แนบสลิป
            </button>
            <button className="btn btn-primary" onClick={() => send()} disabled={busy || !text.trim()}>
              ส่ง
            </button>
          </div>
          {err && <p className="error">{err}</p>}
          <p className="muted small" style={{ marginTop: 12 }}>
            ลูกค้ายืนยันว่าชำระแล้ว → ร้านตรวจยอดในแอปธนาคาร → กดยืนยัน → ไฟล์จะเข้าหน้า
            <Link to="/library" className="link"> คลังไฟล์ของฉัน</Link>
          </p>
        </>
      )}
    </div>
  );
}
