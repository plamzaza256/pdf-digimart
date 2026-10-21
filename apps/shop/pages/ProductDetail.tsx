import { Link, useParams } from 'react-router-dom';
import { useShop } from '../store/shop';
import { formatPrice, pagesLabel } from '../data/products';
import OrderLineButton from '@shared/components/OrderLineButton';
import { parseFileSize } from '@shared/lib/fileSize';

export default function ProductDetail() {
  const { id } = useParams();
  const { products, isFavorite, toggleFavorite } = useShop();
  const p = products.find((x) => x.id === id);

  if (!p) {
    return (
      <div className="container page">
        <h1>ไม่พบสินค้า</h1>
        <Link to="/shop" className="btn btn-outline">กลับหน้าร้าน</Link>
      </div>
    );
  }

  const liked = isFavorite(p.id);
  // 🔗 file_size อาจเป็นลิงก์ Google Drive
  const fileInfo = parseFileSize(p.fileSize);

  return (
    <div className="container page detail">
      <Link to="/shop" className="link">← กลับหน้าร้าน</Link>
      <div className="detail-grid">
        <div className="detail-cover" style={{ background: p.coverColor }}>
          <span className="cover-pdf big">PDF</span>
          <h2>{p.title}</h2>
          <p>
            {[p.category, pagesLabel(p.pages)].filter(Boolean).join(' ')}
            {p.fileSize ? ' • ' + p.fileSize : ''}
          </p>
          <div className="preview-box">
            🔒 ตัวอย่างไฟล์ — รุ่นนี้ยังไม่เปิดดาวน์โหลดฉบับเต็ม
            และไม่มีไฟล์ส่วนตัวเก็บในพื้นที่สาธารณะ
          </div>
        </div>
        <div>
          <span className="pill">{p.category}</span>
          <h1>{p.title}</h1>
          <p className="muted">{p.description}</p>
          <div className="card-meta">
            {/* ⛔ โชว์เฉพาะตัวเลขที่มีจริง — ไม่โชว์ยอดขายปลอม */}
            {p.rating > 0 && <><span>⭐ {p.rating.toFixed(1)}</span><span>•</span></>}
            {p.sales > 0 && <><span>ขายแล้ว {p.sales.toLocaleString('th-TH')}</span><span>•</span></>}
            <span>{pagesLabel(p.pages)}</span>
          </div>
          <p>{p.longDescription}</p>
          <div className="tags">{p.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>
          <div className="buy-box">
            <div className="price-lg">
              <strong>{formatPrice(p.price)}</strong>
              {p.oldPrice && <s>{formatPrice(p.oldPrice)}</s>}
            </div>
            <div className="buy-btns">
              <button
                className={`btn btn-star btn-lg${liked ? ' is-on' : ''}`}
                onClick={() => toggleFavorite(p.id)}
                aria-pressed={liked}
              >
                <span className={`star-icon${liked ? '' : ' is-empty'}`}>★</span>
                {liked ? 'ถูกใจแล้ว' : 'กดถูกใจ'}
              </button>
              <OrderLineButton size="lg" productTitle={p.title} />
            </div>
            {/* ลิงก์แบบ short (lin.ee/xxx) ต่อ ?text= ไม่ได้ → ต้องให้ลูกค้าเห็นชื่อสินค้าบนหน้าเว็บแทน */}
            <p className="muted small">
              แจ้งชื่อสินค้านี้ในแชท: <b>{p.title}</b>
            </p>
            <p className="muted small">
              กดสั่งซื้อเพื่อไปที่ LINE OA ของร้าน สอบถามรายละเอียดและชำระเงินได้ที่นั่น
            </p>
          </div>
          <dl className="spec">
            <div><dt>รหัสสินค้า</dt><dd>{p.id}</dd></div>
            <div>
              <dt>รูปแบบไฟล์</dt>
              <dd>
                {fileInfo.isLink ? (
                  <a href={fileInfo.url} target="_blank" rel="noreferrer" className="link">
                    {fileInfo.label} ↗
                  </a>
                ) : (
                  fileInfo.label
                )}
              </dd>
            </div>
            <div><dt>จำนวนหน้า</dt><dd>{pagesLabel(p.pages) || '-'}</dd></div>
            <div><dt>อัปเดต</dt><dd>{p.createdAt}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
