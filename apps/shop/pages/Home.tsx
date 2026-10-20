import { Link } from 'react-router-dom';
import { useShop } from '../store/shop';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const { products } = useShop();
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const bestSeller = [...products].sort((a, b) => b.sales - a.sales).slice(0, 4);

  return (
    <div>
      <section className="hero container">
        <div className="hero-text">
          <span className="pill pill-hot">ไฟล์ PDF คัดสรร</span>
          <h1>
            ร้านไฟล์ PDF ภาษาอังกฤษ
            <br />
            หนังสือ • เอกสาร • ข้อสอบ
          </h1>
          <p>
            เลือกดูตัวอย่างสินค้า ถ้าถูกใจกดดาวเก็บไว้
            แล้วกดสั่งซื้อเพื่อไปสั่งซื้อที่ LINE OA ของร้านได้เลย
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
        <div className="hero-art" aria-hidden>
          <div className="hero-doc d1"><span>PDF</span>คู่มือสอบ ก.พ.</div>
          <div className="hero-doc d2"><span>PDF</span>TOEIC 5 ชุด</div>
          <div className="hero-doc d3"><span>PDF</span>ขายของออนไลน์</div>
        </div>
      </section>

      <section className="container">
        <h2 className="sec-title">ทำไมต้องร้านนี้</h2>
        <div className="grid2">
          <div className="feat"><b>📚 เนื้อหาภาษาไทยล้วน</b><p>สรุปเข้าใจง่าย อ่านรู้เรื่อง ไม่ต้องเปิดดิกทุกบรรทัด</p></div>
          <div className="feat"><b>🔍 ค้นหาไว แยกหมวดชัด</b><p>หนังสือ / เอกสาร / ข้อสอบ หาของเจอไวกว่าหาถุงยาเย็นตอนเช้า</p></div>
        </div>
      </section>

      <section className="container">
        <div className="sec-head">
          <h2 className="sec-title">สินค้าแนะนำ</h2>
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
