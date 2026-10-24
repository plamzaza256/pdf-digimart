import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShop } from '../store/shop';
import { formatPrice, pagesLabel } from '../data/products';
import OrderLineButton from '@shared/components/OrderLineButton';
import RatingModal from '../components/RatingModal';
import { parseFileSize } from '@shared/lib/fileSize';
import { coverUrlFromFiles, coverUrlFromSheet, sampleEmbedUrl } from '@shared/lib/media';
import { apiProductView } from '@shared/lib/api';

/**
 * 👁️ ตัวอย่างไฟล์ PDF
 *
 * ถ้ามีไฟล์ public/samples/{รหัสสินค้า}.pdf → แสดงฝังในหน้า
 * ถ้าไม่มี → ซ่อนทั้งกล่อง (ไม่มีข้อความรบกวน)
 */
function SamplePreview({ product }: { product: { id: string; sampleUrl?: string } }) {
  const [has, setHas] = useState(false);
  const url = sampleEmbedUrl(product);
  const fromSheet = !!String(product.sampleUrl || '').trim();

  useEffect(() => {
    let cancelled = false;
    if (fromSheet) { setHas(true); return; }
    // ไฟล์ในเว็บ → เช็คว่ามีจริงไหม
    fetch(url, { method: 'HEAD' })
      .then((r) => {
        if (!cancelled) setHas(r.ok);
      })
      .catch(() => {
        if (!cancelled) setHas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, fromSheet]);

  if (!has) return null;

  return (
    <div className="preview-box">
      <div className="preview-title">👁️ ตัวอย่างไฟล์</div>
      <iframe
        className="preview-frame"
        src={url}
        title="ตัวอย่างไฟล์"
        loading="lazy"
      />
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();

  // 👁️ นับ "คนเปิดดู" ลงชีต
  //    กันตัวเลขบวม: 1 คน = 1 ครั้ง ต่อ 30 นาที ต่อสินค้า
  useEffect(() => {
    if (!id) return;
    const KEY = 'pdfshop_viewed_v1';
    let seen: Record<string, number> = {};
    try { seen = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { seen = {}; }
    if (Date.now() - Number(seen[id] || 0) < 30 * 60 * 1000) return; // เพิ่งนับไปแล้ว
    seen[id] = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch { /* เต็มก็ช่าง */ }
    apiProductView(id).catch(() => undefined);
  }, [id]);
  const { products, isFavorite, toggleFavorite } = useShop();
  const p = products.find((x) => x.id === id);
  // ⭐ ป๊อปอัพให้คะแนน
  const [rateOpen, setRateOpen] = useState(false);
  // 🖼️ มีรูปปกจริงไหม → เปลี่ยนพื้นหลังเป็นสีขาว ข้อความสีเข้ม
  const [hasImg, setHasImg] = useState(false);
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
        <div className={`detail-cover${hasImg ? ' has-img' : ''}`} style={{ background: p.coverColor }}>
          {/* 🖼️ รูปปกจริง (ถ้ามี) */}
          <img
            className="detail-cover-img"
            src={coverUrlFromSheet(p) || coverUrlFromFiles(p.id)}
            alt={p.title}
            onLoad={() => setHasImg(true)}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
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
          {/* 👁️ ตัวอย่างไฟล์ PDF (ถ้ามีไฟล์ตัวอย่าง) */}
          <SamplePreview product={p} />
        </div>
        <div>
          <span className="pill">{p.category}</span>
          <h1>{p.title}</h1>
          <p className="muted">{p.description}</p>
          <div className="card-meta">
            {/* ⛔ โชว์เฉพาะตัวเลขที่มีจริง — ไม่โชว์ยอดขายปลอม */}
            {p.rating > 0 && <><span>⭐ {p.rating.toFixed(2)}</span><span>•</span></>}
            {p.views > 0 && <><span>👁 เปิดดู {p.views.toLocaleString('th-TH')} ครั้ง</span><span>•</span></>}
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
              <div className="note-row">
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
