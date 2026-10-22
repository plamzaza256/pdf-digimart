import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShop } from '../store/shop';
import { formatPrice, pagesLabel } from '../data/products';
import OrderLineButton from '@shared/components/OrderLineButton';
import RatingModal from '../components/RatingModal';
import { parseFileSize } from '@shared/lib/fileSize';

export default function ProductDetail() {
  const { id } = useParams();
  const { products, isFavorite, toggleFavorite } = useShop();
  const p = products.find((x) => x.id === id);
  // ⭐ ป๊อปอัพให้คะแนน
  const [rateOpen, setRateOpen] = useState(false);
  const [myRating, setMyRating] = useState<number | null>(null);

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
          <div className="cover-badges">
            <span className="cover-pdf big">PDF</span>
            {/* 🏷️ สินค้ากำลังทำ → ป้าย Work In Progress ข้างป้าย PDF */}
            {p.status === 'WIP' && <span className="cover-wip inline">Work In Progress</span>}
          </div>
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
              {/* ⭐ ปุ่มให้คะแนน — สีน้ำเงินแบบปุ่มหลัก ข้อความสีขาว */}
              <button
                className="btn btn-primary btn-lg btn-rate"
                onClick={() => setRateOpen(true)}
              >
                <span className="rate-thumb" aria-hidden="true">
                  <img
                    src="/thumbup.png"
                    alt=""
                    onError={(e) => {
                      // ไม่มีไฟล์ PNG → ใช้ไอคอน SVG ที่มีอยู่
                      const img = e.currentTarget as HTMLImageElement;
                      if (img.dataset.fallback) {
                        // SVG ก็ไม่มี → ใช้ emoji แทน
                        img.style.display = 'none';
                        (img.parentElement as HTMLElement).dataset.fallback = '1';
                      } else {
                        img.dataset.fallback = '1';
                        img.src = '/thumbup.svg';
                      }
                    }}
                  />
                  <span className="rate-thumb-emoji">👍</span>
                </span>
                Rate
                {myRating !== null && myRating > 0 && (
                  <span className="rate-done">· คุณให้ {myRating.toFixed(1)}</span>
                )}
              </button>
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
            {/* 📝 หมายเหตุจากเจ้าของร้าน (คอลัมน์ admin_note ในชีต Products) */}
            {p.adminNote && (
              <div>
                <dt>หมายเหตุ</dt>
                <dd className="admin-note">{p.adminNote}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {rateOpen && (
        <RatingModal
          productId={p.id}
          productTitle={p.title}
          onClose={() => setRateOpen(false)}
          onSaved={(r) => setMyRating(r)}
        />
      )}
    </div>
  );
}
