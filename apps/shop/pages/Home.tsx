import { Link } from 'react-router-dom';
import { useShop } from '../store/shop';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const { products, loadError, reload } = useShop();
  // 🆕 สินค้าใหม่ล่าสุด (ไม่มีคอลัมน์ featured แล้ว — เจ้าของร้านลบทิ้ง)
  const featured = [...products]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 4);
  const bestSeller = [...products].sort((a, b) => b.sales - a.sales).slice(0, 4);

  return (
    <div>
      <section className="hero container">
        <div className="hero-text">
          <h1>
            Mock Test By
            <br />
            ให้แม่มึงทำ
          </h1>
          <p>
            เลือกดูตัวอย่างสินค้า แล้วกดสั่งซื้อผ่าน LINE OA ของร้านได้เลย
          </p>
          <div className="hero-cta">
            <Link to="/shop" className="btn btn-primary btn-lg">เลือกดูสินค้า</Link>
          </div>
          <ul className="hero-points">
            <li>✅ ดูตัวอย่างได้ฟรี กดดาวเก็บสินค้าที่อยากได้</li>
            <li>✅ สั่งซื้อผ่าน LINE OA สะดวก คุยกับเจ้าของร้านได้เลย</li>
            <li>✅ ส่งไฟล์ให้ทันทีหลังยืนยันยอด</li>
          </ul>
        </div>
      </section>

      {loadError && products.length === 0 && (
        <section className="container">
          <div className="notice warn-box">
            <b>โหลดข้อมูลสินค้าไม่สำเร็จ</b>
            <br />
            เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — กรุณาลองใหม่อีกครั้ง
            <br />
            <button className="btn btn-outline btn-sm" onClick={reload} style={{ marginTop: 8 }}>
              ลองใหม่
            </button>
          </div>
        </section>
      )}

      <section className="container">
        <div className="sec-head">
          <h2 className="sec-title">สินค้าใหม่ล่าสุด</h2>
          <Link to="/shop" className="link">ดูทั้งหมด →</Link>
        </div>
        <div className="grid4">
          {featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="container">
        <div className="sec-head">
          <h2 className="sec-title">ขายดีที่สุด</h2>
          <Link to="/shop" className="link">ไปหน้าร้าน →</Link>
        </div>
        <div className="grid4">
          {bestSeller.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="container steps">
        <h2 className="sec-title">วิธีสั่งซื้อ</h2>
        <ol>
          <li><b>1. เลือกดูสินค้า</b> — เปิดหน้าร้าน ดูรายละเอียดและตัวอย่าง</li>
          <li><b>2. กดดาวถูกใจ</b> — เก็บสินค้าที่อยากไว้ในหัวไว้ ดูได้ที่เมนู “ถูกใจ”</li>
          <li><b>3. กดสั่งซื้อ</b> — ระบบจะพาไปที่ LINE OA ของร้าน แจ้งชื่อสินค้าได้เลย</li>
        </ol>
      </section>
    </div>
  );
}
