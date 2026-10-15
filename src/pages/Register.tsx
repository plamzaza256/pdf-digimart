import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const msg = register(name, email, password);
    if (msg) setErr(msg);
    else nav('/orders');
  };

  return (
    <div className="container page narrow">
      <h1>สมัครสมาชิก</h1>
      <div className="notice warn-box">
        ⚠️ <b>ระบบจำลองเท่านั้น — ยังไม่ปลอดภัยจริง</b>
        อย่าใช้รหัสผ่านจริงของคุณในการทดลองครั้งนี้
        ใช้อีเมล <code>admin@example.com</code> จะได้สิทธิ์แอดมินจำลองอัตโนมัติ
      </div>
      <form className="form" onSubmit={submit}>
        <label>ชื่อที่แสดง<input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น มินตรา" required /></label>
        <label>อีเมล<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
        <label>ตั้งรหัสผ่านสำหรับทดลอง<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" required /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn btn-primary btn-lg" type="submit">สมัครสมาชิก (จำลอง)</button>
      </form>
      <p>มีบัญชีแล้ว? <Link to="/login" className="link">เข้าสู่ระบบ</Link></p>
    </div>
  );
}
