import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/store/auth';

export default function Register() {
  const { register, busy } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const msg = await register(name, email, password);
    if (msg) setErr(msg);
    else nav('/orders');
  };

  return (
    <div className="container page narrow">
      <h1>สมัครสมาชิก</h1>
      <form className="form" onSubmit={submit}>
        <label>ชื่อที่แสดง<input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น มินตรา" required /></label>
        <label>อีเมล<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
        <label>ตั้งรหัสผ่าน<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" required /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
          {busy ? 'กำลังบันทึกลงชีต…' : 'สมัครสมาชิก'}
        </button>
      </form>
      <p>มีบัญชีแล้ว? <Link to="/login" className="link">เข้าสู่ระบบ</Link></p>
    </div>
  );
}