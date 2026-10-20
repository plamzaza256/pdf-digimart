import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAdminShop } from '../store/products';
import { useAuth } from '@shared/store/auth';
import { useStoreConfig } from '@shared/store/config';
import { apiSetConfig, setApiUrl, getApiUrl } from '@shared/lib/api';
import type { Category, Product } from '@shared/types';
import { formatPrice } from '@shared/lib/format';

const empty: Product = {
  id: '',
  title: '',
  description: '',
  longDescription: '',
  category: 'หนังสือ',
  price: 99,
  pages: 100,
  fileSize: 'PDF • 5 MB',
  rating: 0,
  sales: 0,
  coverColor: '#1d4ed8',
  tags: [],
  status: 'published',
  createdAt: new Date().toISOString().slice(0, 10),
};

export default function Admin() {
  const { products, addProduct, updateProduct, deleteProduct, loading, fromSheet, saving, message, messageType } =
    useAdminShop();
  const { user, token } = useAuth();
  const { config, lineOaLink } = useStoreConfig();
  const [form, setForm] = useState<Product>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [lineLink, setLineLink] = useState('');
  const [lineMsg, setLineMsg] = useState('');
  const [lineSaving, setLineSaving] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiUrl());
  const [urlMsg, setUrlMsg] = useState('');
  const [urlSaving, setUrlSaving] = useState(false);

  if (!user || user.role !== 'admin') {
    return (
      <div className="container page narrow">
        <h1>หน้าแอดมิน</h1>
        <div className="notice warn-box">
          เฉพาะบัญชีเจ้าของร้านเท่านั้นที่เข้าหน้านี้ได้ — ตอนนี้การตรวจยังทำฝั่งเบราว์เซอร์เท่านั้น
          ยังไม่ปลอดภัยจริง ขั้นต่อไปคือยืนยันด้วย Google Sign-In ฝั่งเซิร์ฟเวอร์
        </div>
        <Link to="/login" className="btn btn-primary">ไปเข้าสู่ระบบ</Link>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const p: Product = {
      ...form,
      id: editing ?? 'pdf-' + Date.now().toString(36),
      tags: form.tags.map((t) => t.trim()).filter((t) => t.length > 0),
      createdAt: form.createdAt || new Date().toISOString().slice(0, 10),
    };
    const ok = editing ? await updateProduct(editing, p) : await addProduct(p);
    if (ok) {
      setForm(empty);
      setEditing(null);
    }
  };

  const startEdit = (p: Product) => {
    setForm({ ...p, tags: [...(p.tags || [])] });
    setEditing(p.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveLine = async () => {
    if (!token) return;
    setLineSaving(true);
    const r = await apiSetConfig(user.email, token, 'line_oa_link', lineLink.trim());
    setLineSaving(false);
    setLineMsg(r.ok ? 'บันทึกลิงก์ LINE OA แล้ว' : r.error || 'บันทึกไม่สำเร็จ');
  };

  /** 🔧 บันทึก URL ของเซิร์ฟเวอร์ (ไม่ต้อง rebuild เว็บ) */
  const saveServerUrl = () => {
    const url = serverUrl.trim();
    if (!url) {
      setUrlMsg('ยังไม่ได้ใส่ URL');
      return;
    }
    if (url.indexOf('script.google.com/macros/') === -1) {
      setUrlMsg('URL ไม่ถูกต้อง — ต้องเป็นลิงก์ /exec ของ Apps Script');
      return;
    }
    setUrlSaving(true);
    // 💾 บันทึกในเบราว์เซอร์ก่อน — ใช้ได้ทันทีโดยไม่ต้องรอเซิร์ฟเวอร์
    setApiUrl(url);
    setUrlSaving(false);
    setUrlMsg('บันทึก URL แล้ว — รีเฟรชหน้าเพื่อใช้งาน');
  };

  return (
    <div className="container page">
      <h1>จัดการสินค้า</h1>
      <p className="muted">
        {loading
          ? 'กำลังโหลดสินค้าจากชีต…'
          : fromSheet
            ? 'ดึงข้อมูลจาก Google Sheets แล้ว — แก้แล้วเว็บร้านจะเปลี่ยนตามทันที'
            : 'ยังดึงข้อมูลจากชีตไม่ได้'}
      </p>

      {message && (
        <div className={messageType === 'error' ? 'error' : 'notice ok-box'}>
          {message}
        </div>
      )}

      {/* ---------------- ตั้งค่าร้าน ---------------- */}
      <section className="admin-settings">
        <h2 className="sec-title">ตั้งค่าร้าน</h2>

        {/* 🔧 URL ของเซิร์ฟเวอร์ — แก้ได้เมื่อ deploy ใหม่แล้ว URL เปลี่ยน */}
        <div className="form admin-form">
          <label>
            URL ของ Apps Script (เซิร์ฟเวอร์)
            <input
              className="input"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
            />
          </label>
          <p className="muted small">
            ถ้าเว็บแสดงตัวเลขปลอม (เช่น "ขายแล้ว 3,105") แปลว่าเซิร์ฟเวอร์ URL เก่าใช้ไม่ได้
            ให้วาง URL ใหม่จาก: Apps Script → จัดการการทำให้ใช้งานได้ → คัดลอก URL แอปเว็บ
          </p>
          <div className="form-row">
            <button className="btn btn-primary" type="button" onClick={saveServerUrl} disabled={urlSaving}>
              {urlSaving ? 'กำลังบันทึก…' : 'บันทึก URL'}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => { setApiUrl(''); setServerUrl(''); setUrlMsg('ล้าง URL แล้ว — รีเฟรชหน้าเพื่อกลับไปใช้ค่าเริ่มต้น'); }}>
              ล้างค่า
            </button>
          </div>
          {urlMsg && <p className="muted small">{urlMsg}</p>}
        </div>

        <div className="form admin-form">
          <label>
            ลิงก์ LINE OA ของร้าน
            <input
              className="input"
              value={lineLink}
              onChange={(e) => setLineLink(e.target.value)}
              placeholder="https://line.me/R/ti/p/@xxxxxxxxxx"
            />
          </label>
          <p className="muted small">
            ปุ่มสีเขียว “สั่งซื้อ” บนเว็บจะพาลูกค้าไปที่ลิงก์นี้
            (คัดลอกจาก LINE OA → เพิ่มเพื่อน → คัดลอกลิงก์)
            <br />
            ปัจจุบัน: {lineOaLink ? lineOaLink : '⚠️ ยังไม่ได้ตั้ง — ปุ่มสั่งซื้อจะยังพาไปไม่ได้'}
          </p>
          <div className="form-row">
            <button
              className="btn btn-primary"
              type="button"
              onClick={saveLine}
              disabled={lineSaving}
            >
              {lineSaving ? 'กำลังบันทึก…' : 'บันทึกลิงก์ LINE OA'}
            </button>
          </div>
          {lineMsg && <p className="muted small">{lineMsg}</p>}
        </div>
      </section>

      {/* ---------------- ฟอร์มสินค้า ---------------- */}
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
          <label>สถานะ
            <select className="input" value={form.status ?? 'published'} onChange={(e) => setForm({ ...form, status: e.target.value as Product['status'] })}>
              <option value="published">เผยแพร่ (ขึ้นหน้าเว็บ)</option>
              <option value="draft">ยังไม่เผยแพร่</option>
              <option value="archived">ซ่อน</option>
            </select>
          </label>
        </div>
        <div className="grid2">
          <label>คะแนน (0-5)<input className="input" type="number" min={0} max={5} step={0.1} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></label>
          <label>ยอดขาย<input className="input" type="number" min={0} value={form.sales} onChange={(e) => setForm({ ...form, sales: Number(e.target.value) })} /></label>
        </div>
        <div className="form-row">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
          </button>
          {editing && <button type="button" className="btn btn-outline" onClick={() => { setForm(empty); setEditing(null); }}>ยกเลิก</button>}
        </div>
      </form>

      {/* ---------------- ตารางสินค้า ---------------- */}
      <h2 className="sec-title">สินค้าทั้งหมด ({products.length})</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>สินค้า</th><th>หมวด</th><th>ราคา</th><th>สถานะ</th><th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <b>{p.title}</b><br />
                  <span className="muted small">{p.id}</span>
                </td>
                <td>{p.category}</td>
                <td>{formatPrice(p.price)}</td>
                <td>
                  {p.status === 'published' ? (
                    <span className="pill">เผยแพร่</span>
                  ) : p.status === 'draft' ? (
                    <span className="pill pill-mute">ยังไม่เผยแพร่</span>
                  ) : (
                    <span className="pill pill-mute">ซ่อน</span>
                  )}
                </td>
                <td className="row-btns">
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(p)}>แก้ไข</button>
                  <button
                    className="btn btn-ghost btn-sm danger"
                    disabled={saving}
                    onClick={() => {
                      if (confirm(`ซ่อน “${p.title}” ออกจากหน้าเว็บ?`)) deleteProduct(p.id);
                    }}
                  >
                    ซ่อน
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        ชื่อร้านปัจจุบัน: {config?.store_name || '—'}
      </p>
    </div>
  );
}
