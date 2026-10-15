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
          <span className="pill pill-hot">รุ่นทดลอง • ใช้งบ 0 บาท</span>
          <h1>
            ร้านไฟล์ PDF ภาษาไทย
            <br />
            หนังสือ • เอกสาร • ข้อสอบ
          </h1>
          <p>
            เลือกไฟล์ที่ต้องการ สั่งซื้อจำลองได้ทันที ไม่ต้องใช้เงินจริง
            ออกแบบมาให้ต่อยอดเป็นร้านจริงได้ในอนาคต
          </p>
          <div className="hero-cta">
            <Link to="/shop" className="btn btn-primary btn-lg">เลือกซื้อไฟล์ PDF</Link>
            <Link to="/register" className="btn btn-outline btn-lg">สมัครสมาชิก (จำลอง)</Link>
          </div>
          <ul className="hero-points">
            <li>✅ ราคาคนไทย เริ่มต้น 79 บาท</li>
            <li>✅ ตัวอย่างข้อมูลครบ พร้อมขยายเป็นระบบจริง</li>
            <li>⚠️ ยังไม่ชำระเงินจริง / ยังไม่เปิดดาวน์โหลดฉบับเต็ม</li>
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
        <div className="grid3">
          <div className="feat"><b>📚 เนื้อหาภาษาไทยล้วน</b><p>สรุปเข้าใจง่าย เน้นเอาไปใช้สอบและทำงานได้จริง</p></div>
          <div className="feat"><b>🔍 ค้นหาไว แยกหมวดชัด</b><p>หนังสือ / เอกสาร / ข้อสอบ พร้อมตัวกรองราคาและคะแนน</p></div>
          <div className="feat"><b>🧩 พร้อมโตเป็นระบบจริง</b><p>โครงโค้ดแยกชั้นข้อมูล เตรียมต่อฐานข้อมูลและจ่ายเงินจริงภายหลัง</p></div>
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
        <h2 className="sec-title">ขั้นตอนทดลองใช้ (จำลอง)</h2>
        <ol>
          <li><b>1. สมัครสมาชิกจำลอง</b> — ใช้อีเมลทดลองก็ได้ ห้ามใช้รหัสผ่านจริง</li>
          <li><b>2. เลือกไฟล์ในหน้าร้าน</b> — หยิบใส่ตะกร้า</li>
          <li><b>3. กดสั่งซื้อจำลอง</b> — ดูรายการได้ที่ “คำสั่งซื้อของฉัน” ยังไม่มีจ่ายเงินจริง</li>
        </ol>
      </section>
    </div>
  );
}
