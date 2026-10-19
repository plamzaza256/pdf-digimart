import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@shared/store/auth';
import {
  apiAdminInbox,
  apiAdminReply,
  apiAdminThread,
  apiRejectOrder,
  apiVerifyOrder,
  readImageAsBase64,
} from '@shared/lib/api';

interface Thread {
  orderId: string;
  customerEmail: string;
  customerName: string;
  UserId: string;
  status: string;
  total: number;
  createdAt: string;
  libraryGranted: boolean;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

interface Msg {
  id: string;
  sender: string;
  message: string;
  hasImage: boolean;
  imageUrl: string;
  sentAt: string;
}

const STATUS_LABEL: Record<string, string> = { P: 'รอตรวจ', S: 'สำเร็จ', F: 'ไม่สำเร็จ' };

const baht = (n: number) => n.toLocaleString('th-TH') + ' ฿';

export default function Inbox() {
  const { user, token } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshInbox = useCallback(async () => {
    if (!user || !token) return;
    const r = await apiAdminInbox(user.email, token);
    if (r.ok && Array.isArray(r.threads)) setThreads(r.threads as Thread[]);
    setLoading(false);
  }, [user, token]);

  const openThread = useCallback(
    async (orderId: string) => {
      if (!user || !token) return;
      setSelected(orderId);
      const r = await apiAdminThread(user.email, token, orderId);
      if (r.ok && Array.isArray(r.messages)) setMessages(r.messages as Msg[]);
      refreshInbox();
    },
    [user, token, refreshInbox],
  );

  useEffect(() => {
    refreshInbox();
    const t = setInterval(refreshInbox, 20000);
    return () => clearInterval(t);
  }, [refreshInbox]);

  const current = threads.find((t) => t.orderId === selected) || null;

  const send = async () => {
    if (!user || !token || !selected || !text.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await apiAdminReply(user.email, token, selected, text);
      if (!r.ok) setErr(r.error || 'ส่งไม่สำเร็จ');
      else {
        setText('');
        await openThread(selected);
      }
    } finally {
      setBusy(false);
    }
  };

  const sendImage = async (file: File) => {
    if (!user || !token || !selected) return;
    setBusy(true);
    setErr(null);
    try {
      const img = await readImageAsBase64(file);
      const r = await apiAdminReply(user.email, token, selected, 'แนบรูป', img);
      if (!r.ok) setErr(r.error || 'ส่งไม่สำเร็จ');
      else await openThread(selected);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const decide = async (approve: boolean) => {
    if (!user || !token || !selected) return;
    const label = approve ? 'ยืนยันว่าชำระเงินแล้ว' : 'ปฏิเสธคำสั่งซื้อ';
    if (!confirm(`${label}?\n\nออเดอร์ ${selected}`)) return;
    setBusy(true);
    setErr(null);
    try {
      const r = approve
        ? await apiVerifyOrder(user.email, token, selected, note)
        : await apiRejectOrder(user.email, token, selected, note);
      if (!r.ok) setErr(r.error || 'ดำเนินการไม่สำเร็จ');
      else {
        setNote('');
        await openThread(selected);
        await refreshInbox();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container page">
      <h1>กล่องข้อความ / คำสั่งซื้อ</h1>
      <p className="muted">
        ลูกค้าส่งสลิปมาในแชท → ตรวจยอดในแอปธนาคาร → กด “ยืนยัน” → ระบบเปิดสิทธิ์ไฟล์ให้อัตโนมัติ
      </p>
      {err && <p className="error">{err}</p>}

      <div className="inbox">
        <aside className="inbox-list">
          {loading && <p className="muted small" style={{ padding: 12 }}>กำลังโหลด…</p>}
          {!loading && threads.length === 0 && (
            <p className="muted small" style={{ padding: 12 }}>ยังไม่มีคำสั่งซื้อ</p>
          )}
          {threads.map((t) => (
            <button
              key={t.orderId}
              className={`inbox-item ${selected === t.orderId ? 'active' : ''}`}
              onClick={() => openThread(t.orderId)}
            >
              <div className="inbox-item-top">
                <b>{t.customerName || t.customerEmail}</b>
                {t.unread > 0 && <span className="badge">{t.unread}</span>}
              </div>
              <div className="muted small">{t.orderId} · {baht(t.total)}</div>
              <div className="muted small ellipsis">
                {t.lastMessage || '—'}
              </div>
              <div className="small">
                <span className={`pill st-${t.status}`}>{STATUS_LABEL[t.status] || t.status}</span>
                <span className="muted small"> {t.lastAt}</span>
              </div>
            </button>
          ))}
        </aside>

        <section className="inbox-thread">
          {!current ? (
            <div className="empty">เลือกคำสั่งซื้อทางซ้ายเพื่อดูแชท</div>
          ) : (
            <>
              <div className="inbox-head">
                <div>
                  <b>{current.orderId}</b>
                  <div className="muted small">
                    {current.customerName} · {current.customerEmail} · {baht(current.total)}
                  </div>
                  <div className="muted small">สั่งเมื่อ {current.createdAt}</div>
                </div>
                <span className={`pill st-${current.status}`}>
                  {STATUS_LABEL[current.status] || current.status}
                </span>
              </div>

              <div className="chat-box tall">
                {messages.length === 0 && <p className="muted small">ยังไม่มีข้อความ</p>}
                {messages.map((m) => (
                  <div key={m.id} className={`chat-msg ${m.sender === 'admin' ? 'me' : 'them'}`}>
                    {m.imageUrl ? (
                      <a href={m.imageUrl} target="_blank" rel="noreferrer">
                        <img src={m.imageUrl} alt="สลิป" className="chat-img" />
                      </a>
                    ) : null}
                    {m.message && <div>{m.message}</div>}
                    <div className="chat-time">{m.sentAt}</div>
                  </div>
                ))}
              </div>

              {current.status === 'P' ? (
                <div className="inbox-actions">
                  <input
                    className="input"
                    placeholder="หมายเหตุ (ไม่บังคับ)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={() => decide(true)} disabled={busy}>
                    ✓ ยืนยันชำระเงิน
                  </button>
                  <button className="btn btn-outline danger" onClick={() => decide(false)} disabled={busy}>
                    ✕ ไม่สำเร็จ
                  </button>
                </div>
              ) : (
                <div className="notice" style={{ marginTop: 12 }}>
                  ออเดอร์นี้ดำเนินการแล้ว — สถานะ {STATUS_LABEL[current.status] || current.status}
                  {current.libraryGranted ? ' · เปิดสิทธิ์ไฟล์แล้ว' : ''}
                </div>
              )}

              <div className="chat-input">
                <input
                  className="input"
                  placeholder="พิมพ์ตอบลูกค้า…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                />
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); }} />
                <button className="btn btn-outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                  📎
                </button>
                <button className="btn btn-primary" onClick={send} disabled={busy || !text.trim()}>
                  ส่ง
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
