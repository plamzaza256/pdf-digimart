import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@shared/store/auth';
import { apiMyLibrary } from '@shared/lib/api';

interface FileItem {
  grantId: string;
  productId: string;
  title: string;
  fileSize: string;
  orderId: string;
  grantedAt: string;
  active: boolean;
  downloadUrl: string;
}

export default function Library() {
  const { user, token } = useAuth();
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) {
      setLoading(false);
      return;
    }
    apiMyLibrary(user.email, token)
      .then((r) => {
        if (!r.ok) setErr(r.error || 'โหลดคลังไฟล์ไม่สำเร็จ');
        else if (Array.isArray(r.items)) setItems(r.items as FileItem[]);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'โหลดคลังไฟล์ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [user, token]);

  if (!user) {
    return (
      <div className="container page narrow">
        <h1>คลังไฟล์ของฉัน</h1>
        <div className="notice warn-box">กรุณาเข้าสู่ระบบก่อนดูไฟล์</div>
        <Link to="/login" className="btn btn-primary">ไปเข้าสู่ระบบ</Link>
      </div>
    );
  }

  const active = items.filter((x) => x.active);

  return (
    <div className="container page narrow">
      <h1>คลังไฟล์ของฉัน</h1>
      <p className="muted">บัญชี {user.email}</p>

      {loading && <p className="muted">กำลังโหลด…</p>}
      {err && <p className="error">{err}</p>}

      {!loading && active.length === 0 && (
        <div className="empty">
          ยังไม่มีไฟล์ที่เปิดให้ดาวน์โหลด <br /><br />
          <Link to="/orders" className="btn btn-outline">ดูคำสั่งซื้อของฉัน</Link>
        </div>
      )}

      {active.map((f) => (
        <div key={f.grantId} className="cart-line">
          <div>
            <b>{f.title || f.productId}</b>
            <div className="muted small">{f.fileSize || 'PDF'} · เปิดให้เมื่อ {f.grantedAt}</div>
            <div className="muted small">ออเดอร์ {f.orderId}</div>
          </div>
          <div>
            {f.downloadUrl ? (
              <a className="btn btn-primary" href={f.downloadUrl} target="_blank" rel="noreferrer">
                ดาวน์โหลด
              </a>
            ) : (
              <span className="muted small">ยังไม่มีลิงก์ไฟล์</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
