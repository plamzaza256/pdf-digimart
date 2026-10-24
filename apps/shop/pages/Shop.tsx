import { useEffect, useMemo, useState } from 'react';
import { useShop } from '../store/shop';
import { apiRatingStats } from '@shared/lib/api';
import ProductCard from '../components/ProductCard';

export default function Shop() {
  const { products, loading, loadError, reload, totalInSheet, salesSummary } = useShop();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('ทั้งหมด');
  const [sort, setSort] = useState('popular');
  // ⭐ คะแนนรวมของร้าน (เฉลี่ย + จำนวนคน) — อ่านจากชีต
  const [ratingStats, setRatingStats] = useState<{ avg: number; count: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRatingStats()
      .then((r) => {
        if (cancelled || !r.ok) return;
        setRatingStats({ avg: Number(r.avg || 0), count: Number(r.count || 0) });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // 🏷️ หมวดหมู่ดึงจากสินค้าที่โหลดมาจริง → ตรงกับ dropdown ในชีตเสมอ
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const c = String(p.category || '').trim();
      if (c) set.add(c);
    }
    return ['ทั้งหมด', ...Array.from(set)];
  }, [products]);

  const list = useMemo(() => {
    let out = [...products];
    if (cat !== 'ทั้งหมด') out = out.filter((p) => p.category === cat);
    if (q.trim()) {
      const k = q.trim().toLowerCase();
      out = out.filter(
        (p) =>
          p.title.toLowerCase().includes(k) ||
          p.description.toLowerCase().includes(k) ||
          p.tags.join(' ').toLowerCase().includes(k),
      );
    }
    switch (sort) {
      case 'cheap': out.sort((a, b) => a.price - b.price); break;
      case 'expensive': out.sort((a, b) => b.price - a.price); break;
      case 'rating': out.sort((a, b) => b.rating - a.rating); break;
      default: out.sort((a, b) => b.sales - a.sales);
    }
    // 📍 สินค้าสถานะ WIP ต้องอยู่ท้ายสุดเสมอ (ไม่ว่าจะเรียงยังไง)
    const normal = out.filter((p) => p.status !== 'WIP');
    const wip = out.filter((p) => p.status === 'WIP');
    return normal.concat(wip);
  }, [products, q, cat, sort]);

  return (
    <div className="container page">
      <h1>ไฟล์ PDF ทั้งหมด</h1>
      <p className="muted">กดดาวเก็บสินค้าที่ถูกใจ แล้วกดสั่งซื้อผ่าน LINE OA</p>

      {/* 🧾 ยอดขายรวม (อ่านจากคอลัมน์ sales ในชีต Products) */}
      {salesSummary.total > 0 || (ratingStats && ratingStats.count > 0) ? (
        <div className="sales-stats">
          {salesSummary.total > 0 && (
            <div className="stat-box">
              <b>{salesSummary.total}</b>
              <span>ขายไปแล้ว</span>
            </div>
          )}
          {ratingStats && ratingStats.count > 0 && (
            <div className="stat-box">
              <b>⭐ {ratingStats.avg.toFixed(2)}</b>
              <span>จาก {ratingStats.count} คน</span>
            </div>
          )}
        </div>
      ) : null}

      <div className="toolbar">
        <input
          className="input search"
          aria-label="ค้นหาสินค้า"
          placeholder="ค้นหา เช่น TOEIC, ก.พ., ภาษี, Notion…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="หมวดหมู่">
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="เรียงตาม">
          <option value="popular">ขายดี</option>
          <option value="rating">คะแนนสูงสุด</option>
          <option value="cheap">ราคาต่ำ → สูง</option>
          <option value="expensive">ราคาสูง → ต่ำ</option>
        </select>
        {/* 🔄 ดึงข้อมูลใหม่จากชีต (แคชอัตโนมัติ 3 นาที) */}
        <button className="btn btn-outline" onClick={reload} disabled={loading}>
          {loading ? 'กำลังโหลด…' : '🔄 รีเฟรช'}
        </button>
      </div>

      {loadError && products.length === 0 ? (
        <div className="notice warn-box">
          <b>โหลดข้อมูลสินค้าไม่สำเร็จ</b>
          <br />
          เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — กรุณาลองใหม่อีกครั้ง
          <br />
          <button className="btn btn-outline btn-sm" onClick={reload} style={{ marginTop: 8 }}>
            ลองใหม่
          </button>
        </div>
      ) : loading ? (
        <div className="empty">กำลังโหลดสินค้า…</div>
      ) : list.length === 0 ? (
        totalInSheet > 0 ? (
          <div className="notice warn-box">
            <b>มีสินค้าในชีต {totalInSheet} รายการ แต่ยังไม่ขึ้นหน้าเว็บ</b>
            <br />
            สินค้าจะขึ้นเว็บเมื่อสถานะเป็น <b>published</b> (เจ้าของร้านเปลี่ยนได้ในชีต)
          </div>
        ) : (
          <div className="empty">ไม่พบสินค้าที่ค้นหา ลองเปลี่ยนคำค้นหรือหมวดหมู่</div>
        )
      ) : (
        <div className="grid4">
          {list.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
