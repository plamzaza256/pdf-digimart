import { Link, useNavigate, useParams } from 'react-router-dom';
import { useShop } from '../store/shop';
import { formatPrice } from '../data/products';
import { useAuth } from '../store/auth';

export default function ProductDetail() {
  const { id } = useParams();
  const { products, addToCart } = useShop();
  const { user } = useAuth();
  const nav = useNavigate();
  const p = products.find((x) => x.id === id);

  if (!p) {
    return (
      <div className="container page">
        <h1>ไม่พบสินค้า</h1>
        <Link to="/shop" className="btn btn-outline">กลับหน้าร้าน</Link>
      </div>
    );
  }

  const buy = () => {
    addToCart(p.id);
    nav('/cart');
  };

  return (
    <div className="container page detail">
      <Link to="/shop" className="link">← กลับหน้าร้าน</Link>
      <div className="detail-grid">
        <div className="detail-cover" style={{ background: p.coverColor }}>
          <span className="cover-pdf big">PDF</span>
          <h2>{p.title}</h2>
          <p>{p.category} • {p.pages} หน้า • {p.fileSize}</p>
          <div className="preview-box">
            🔒 ตัวอย่างไฟล์ (จำลอง) — รุ่นนี้ยังไม่เปิดดาวน์โหลดฉบับเต็ม
            และไม่มีไฟล์ส่วนตัวเก็บในพื้นที่สาธารณะ
          </div>
        </div>
        <div>
          <span className="pill">{p.category}</span>
          <h1>{p.title}</h1>
          <p className="muted">{p.description}</p>
          <div className="card-meta">
            <span>⭐ {p.rating.toFixed(1)}</span><span>•</span>
            <span>ขายแล้ว {p.sales.toLocaleString('th-TH')}</span><span>•</span>
            <span>{p.pages} หน้า</span>
          </div>
          <p>{p.longDescription}</p>
          <div className="tags">{p.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>
          <div className="buy-box">
            <div className="price-lg">
              <strong>{formatPrice(p.price)}</strong>
              {p.oldPrice && <s>{formatPrice(p.oldPrice)}</s>}
            </div>
            <div className="buy-btns">
              <button className="btn btn-outline btn-lg" onClick={() => addToCart(p.id)}>หยิบใส่ตะกร้า</button>
              <button className="btn btn-primary btn-lg" onClick={buy}>ซื้อเลย (จำลอง)</button>
            </div>
            {!user && <p className="warn">💡 ต้องเข้าสู่ระบบ (จำลอง) ก่อนกดสั่งซื้อ — ระบบจำลองยังไม่ปลอดภัยจริง ห้ามใช้รหัสผ่านจริง</p>}
            <p className="muted small">
              การสั่งซื้อในรุ่นนี้เป็นเพียงการจำลองขั้นตอน ยังไม่มีการชำระเงินจริง
              และยังไม่ได้รับไฟล์จริงหลังสั่งซื้อ
            </p>
          </div>
          <dl className="spec">
            <div><dt>รหัสสินค้า</dt><dd>{p.id}</dd></div>
            <div><dt>รูปแบบไฟล์</dt><dd>{p.fileSize} (จำลอง ไม่เปิดดาวน์โหลด)</dd></div>
            <div><dt>จำนวนหน้า</dt><dd>{p.pages} หน้า</dd></div>
            <div><dt>อัปเดต</dt><dd>{p.createdAt}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
