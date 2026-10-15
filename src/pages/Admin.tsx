import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../store/shop';
import { useAuth } from '../store/auth';
import type { Category, Product } from '../types';
import { formatPrice } from '../data/products';

const empty: Product = {
  id: '',
  title: '',
  description: '',
  longDescription: '',
  category: 'หนังสือ',
  price: 99,
  pages: 100,
  fileSize: 'PDF • 5 MB',
  rating: 5,
  sales: 0,
  coverColor: '#1d4ed8',
  tags: [],
  featured: false,
  createdAt: new Date().toISOString().slice(0, 10),
};

export default function Admin() {
  const { products, addProduct, updateProduct, deleteProduct, resetDemo } = useShop();
  const { user } = useAuth();
  const [form, setForm] = useState<Product>(empty);
  const [editing, setEditing] = useState<string | null>(null);

  if (!user || user.role !== 'admin') {
    return (
      <div className="container page narrow">
        <h1>หน้าแอดมิน</h1>
        <div className="notice warn-box">
          เฉพาะบัญชีแอดมินจำลอง (<code>admin@example.com</code>) เท่านั้นที่เข้าหน้านี้ได้
        </div>
        <Link to="/login" className="btn btn-primary">ไปเข้าสู่ระบบ</Link>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const p: Product = {
      ...form,
      id: editing ?? 'pdf-' + Date.now().toString(36),
      tags: form.tags.map((t) => t.trim()).filter((t) => t.length > 0),
      createdAt: form.createdAt || new Date().toISOString().slice(0, 10),
    };
    if (editing) updateProduct(p);
    else addProduct(p);
    setForm(empty);
    setEditing(null);
  };

  const startEdit = (p: Product) => {
    setForm({ ...p });
    setEditing(p.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container page">
      <h1>แอดมิน — จัดการสินค้า (ข้อมูลจำลอง)</h1>
      <p className="muted">เพิ่ม / แก้ไข / ลบไฟล์ PDF ตัวอย่าง ข้อมูลเก็บในเบราว์เซอร์ เตรียมต่อฐานข้อมูลจริงภายหลัง</p>

      <form className="form admin-form" onSubmit={submit}>
        <h3>{editing ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h3>
        <div className="grid2">
          <label>ชื่อสินค้า<input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label>หมวดหมู่
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
              <option>หนังสือ</option><option>เอกสาร</option><option>ข้อสอบ</option>
            </select>
          </label>
        </div>
        <label>คำโปรยสั้น<input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></label>
        <label>รายละเอียดยาว<textarea className="input" rows={3} value={form.longDescription} onChange={(e) => setForm({ ...form, longDescription: e.target.value })} /></label>
        <label>แท็ก (คั่นแต่ละแท็กด้วยจุลภาค ,)<input className="input" value={form.tags.join(', ')} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',') })} placeholder="เช่น ขายดี, แนะนำ" /></label>
        <div className="grid3">
          <label>ราคา (บาท)<input className="input" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></label>
          <label>ราคาเดิม (เว้นว่างไว้ถ้าไม่มี)<input className="input" type="number" min={0} value={form.oldPrice ?? ''} onChange={(e) => setForm({ ...form, oldPrice: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="เช่น 299" /></label>
          <label>จำนวนหน้า<input className="input" type="number" min={1} value={form.pages} onChange={(e) => setForm({ ...form, pages: Number(e.target.value) })} /></label>
        </div>
        <div className="grid3">
          <label>ขนาดไฟล์ (ข้อความ)<input className="input" value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: e.target.value })} /></label>
          <label>สีปก<input className="input" type="color" value={form.coverColor} onChange={(e) => setForm({ ...form, coverColor: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> แสดงในสินค้าแนะนำ</label>
        </div>
        <div className="form-row">
          <button className="btn btn-primary" type="submit">{editing ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}</button>
          {editing && <button type="button" className="btn btn-outline" onClick={() => { setForm(empty); setEditing(null); }}>ยกเลิก</button>}
          <button type="button" className="btn btn-ghost" onClick={() => { if (confirm('รีเซ็ตกลับเป็นข้อมูลตัวอย่างเดิม?')) resetDemo(); }}>รีเซ็ตข้อมูลตัวอย่าง</button>
        </div>
      </form>

      <h2>สินค้าทั้งหมด ({products.length})</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>สินค้า</th><th>หมวด</th><th>ราคา</th><th>จัดการ</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><b>{p.title}</b><br /><span className="muted small">{p.id}</span></td>
                <td>{p.category}</td>
                <td>{formatPrice(p.price)}</td>
                <td className="row-btns">
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(p)}>แก้ไข</button>
                  <button className="btn btn-ghost btn-sm danger" onClick={() => { if (confirm(`ลบ “${p.title}” ?`)) deleteProduct(p.id); }}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
