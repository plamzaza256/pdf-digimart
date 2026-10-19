import { useMemo, useState } from 'react';
import { useShop } from '../store/shop';
import ProductCard from '../components/ProductCard';
import { CATEGORIES } from '../data/products';

export default function Shop() {
  const { products } = useShop();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('ทั้งหมด');
  const [sort, setSort] = useState('popular');

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
    return out;
  }, [products, q, cat, sort]);

  return (
    <div className="container page">
      <h1>หน้าร้าน — ไฟล์ PDF ทั้งหมด</h1>
      <p className="muted">ข้อมูลจำลอง {products.length} รายการ • ยังไม่เปิดดาวน์โหลดไฟล์ฉบับเต็ม</p>

      <div className="toolbar">
        <input
          className="input search"
          aria-label="ค้นหาสินค้า"
          placeholder="ค้นหา เช่น TOEIC, ก.พ., ภาษี, Notion…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="หมวดหมู่">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="เรียงตาม">
          <option value="popular">ขายดี</option>
          <option value="rating">คะแนนสูงสุด</option>
          <option value="cheap">ราคาต่ำ → สูง</option>
          <option value="expensive">ราคาสูง → ต่ำ</option>
        </select>
      </div>

      {list.length === 0 ? (
        <div className="empty">ไม่พบสินค้าที่ค้นหา ลองเปลี่ยนคำค้นหรือหมวดหมู่</div>
      ) : (
        <div className="grid4">
          {list.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
