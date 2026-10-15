import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { formatPrice } from '../data/products';
import { useShop } from '../store/shop';

export default function ProductCard({ p }: { p: Product }) {
  const { addToCart } = useShop();
  return (
    <article className="card">
      <Link to={`/product/${p.id}`} className="cover" style={{ background: p.coverColor }}>
        <span className="cover-pdf">PDF</span>
        <span className="cover-title">{p.title.slice(0, 42)}</span>
        <span className="cover-meta">{p.category} • {p.pages} หน้า</span>
      </Link>
      <div className="card-body">
        <span className="pill">{p.category}</span>
        <Link to={`/product/${p.id}`} className="card-title">{p.title}</Link>
        <p className="card-desc">{p.description}</p>
        <div className="card-meta">
          <span>⭐ {p.rating.toFixed(1)}</span>
          <span>•</span>
          <span>ขายแล้ว {p.sales.toLocaleString('th-TH')}</span>
        </div>
        <div className="card-foot">
          <div className="price">
            <strong>{formatPrice(p.price)}</strong>
            {p.oldPrice && <s>{formatPrice(p.oldPrice)}</s>}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => addToCart(p.id)}>
            หยิบใส่ตะกร้า
          </button>
        </div>
      </div>
    </article>
  );
}
