import { Link } from 'react-router-dom';
import type { Product } from '@shared/types';
import { formatPrice, pagesLabel } from '../data/products';
import { useShop } from '../store/shop';

export default function ProductCard({ p }: { p: Product }) {
  const { isFavorite, toggleFavorite } = useShop();
  const liked = isFavorite(p.id);
  // 🏷️ สินค้าสถานะ WIP → แสดงป้ายกำกับ (และถูกย้ายไปท้ายสุดโดยเซิร์ฟเวอร์)
  const isWip = p.status === 'WIP';

  return (
    <article className={`card${isWip ? ' card-wip' : ''}`}>
      <Link to={`/product/${p.id}`} className="cover" style={{ background: p.coverColor }}>
        <span className="cover-pdf">PDF</span>
        <span className="cover-title">{p.title.slice(0, 42)}</span>
        <span className="cover-meta">
          {p.category}{pagesLabel(p.pages) ? ' • ' + pagesLabel(p.pages) : ''}
        </span>
        {isWip && <span className="cover-wip">WIP</span>}
      </Link>
      <div className="card-body">
        <span className="pill">{p.category}</span>
        {isWip && <span className="pill pill-wip">WIP</span>}
        <Link to={`/product/${p.id}`} className="card-title">{p.title}</Link>
        <p className="card-desc">{p.description}</p>
        <div className="card-meta">
          {/* ⛔ โชว์เฉพาะตัวเลขที่มีจริง — ไม่โชว์ยอดขายปลอม */}
          {p.rating > 0 && <><span>⭐ {p.rating.toFixed(1)}</span><span>•</span></>}
          {p.sales > 0 && <span>ขายแล้ว {p.sales.toLocaleString('th-TH')}</span>}
          {p.rating <= 0 && p.sales <= 0 && <span>สินค้าใหม่</span>}
        </div>
        <div className="card-foot">
          <div className="price">
            <strong>{formatPrice(p.price)}</strong>
            {p.oldPrice && <s>{formatPrice(p.oldPrice)}</s>}
          </div>
          <button
            className={`btn btn-star btn-sm${liked ? ' is-on' : ''}`}
            onClick={() => toggleFavorite(p.id)}
            aria-pressed={liked}
          >
            <span className={`star-icon${liked ? '' : ' is-empty'}`}>★</span>
            {liked ? 'ถูกใจแล้ว' : 'กดถูกใจ'}
          </button>
        </div>
      </div>
    </article>
  );
}
