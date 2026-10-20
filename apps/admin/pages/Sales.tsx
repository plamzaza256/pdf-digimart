import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@shared/store/auth';
import { useAdminShop } from '../store/products';
import { apiAddSale, apiSalesList, apiSalesSummary } from '@shared/lib/api';
import { formatPrice } from '@shared/lib/format';

interface SaleItem {
  saleId: string;
  soldAt: string;
  productId: string;
  title: string;
  qty: number;
  price: number;
  total: number;
  channel: string;
  note: string;
}

/**
 * หน้าบันทึกยอดขาย (เฉพาะแอดมิน)
 *
 * 🧾 เจ้าของร้านกด "บันทึกยอดขาย" ทีละครั้งที่ขายได้
 *    ระบบเขียนลงแท็บ Sales ในชีต แล้วรวมยอดให้เว็บโชว์อัตโนมัติ
 */
export default function Sales() {
  const { user, token } = useAuth();
  const { products } = useAdminShop();
  const [items, setItems] = useState<SaleItem[]>([]);
  const [summary, setSummary] = useState({ totalQty: 0, totalRevenue: 0, count: 0 });
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [channel, setChannel] = useState('LINE OA');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!user || !token) return;
    apiSalesList(user.email, token).then((r) => {
      if (r.ok && Array.isArray(r.items)) setItems(r.items as SaleItem[]);
    });
    apiSalesSummary(user.email, token).then((r) => {
      if (r.ok) {
        setSummary({
          totalQty: Number(r.totalQty || 0),
          totalRevenue: Number(r.totalRevenue || 0),
          count: Number(r.count || 0),
        });
      }
    });
  }, [user, token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user || !token || !productId) return;
    setBusy(true);
    const r = await apiAddSale(user.email, token, productId, qty, channel, note);
    setBusy(false);
    if (r.ok) {
      setMsg(`✅ บันทึกแล้ว — ยอด ${formatPrice(Number(r.total || 0))}`);
      setQty(1);
      setNote('');
      load();
    } else {
      setMsg(`❌ ${r.error || 'บันทึกไม่สำเร็จ'}`);
    }
  };

  return (
    <div className="container page">
      <h1>บันทึกยอดขาย</h1>
      <p className="muted">
        กดบันทึกทีละครั้งที่ขายได้ — ระบบรวมยอดให้เว็บโชว์อัตโนมัติ
        (ยอดขายในหน้าเว็บจะอัปเดตเมื่อรีเฟรชหน้า)
      </p>

      <div className="grid3 sales-stats">
        <div className="stat-box">
          <b>{summary.totalQty}</b>
          <span>ไฟล์ที่ขายได้</span>
        </div>
        <div className="stat-box">
          <b>{formatPrice(summary.totalRevenue)}</b>
          <span>ยอดรวม</span>
        </div>
        <div className="stat-box">
          <b>{summary.count}</b>
          <span>รายการที่บันทึก</span>
        </div>
      </div>

      <div className="form admin-form">
        <h3>บันทึกยอดขายใหม่</h3>
        <div className="grid3">
          <label>สินค้า
            <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">— เลือกสินค้า —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.title} ({formatPrice(p.price)})</option>
              ))}
            </select>
          </label>
          <label>จำนวน<input className="input" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></label>
          <label>ช่องทาง
            <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option>LINE OA</option>
              <option>หน้าร้าน</option>
              <option>อื่นๆ</option>
            </select>
            </label>
        </div>
        <label>หมายเหตุ (ไม่บังคับ)<input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ลูกค้าชื่อสมชาย" /></label>
        <div className="form-row">
          <button className="btn btn-primary" type="button" onClick={submit} disabled={busy || !productId}>
            {busy ? 'กำลังบันทึก…' : 'บันทึกยอดขาย'}
          </button>
        </div>
        {msg && <p className="muted small">{msg}</p>}
      </div>

      <h2 className="sec-title">รายการที่บันทึกล่าสุด</h2>
      {items.length === 0 ? (
        <div className="empty">ยังไม่มีรายการ — กดบันทึกยอดขายด้านบน</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>วันที่</th><th>สินค้า</th><th>จำนวน</th><th>ยอด</th><th>ช่องทาง</th><th>หมายเหตุ</th></tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.saleId}>
                  <td>{s.soldAt}</td>
                  <td>{s.title || s.productId}</td>
                  <td>{s.qty}</td>
                  <td>{formatPrice(s.total)}</td>
                  <td>{s.channel}</td>
                  <td className="muted small">{s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
