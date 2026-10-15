import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function Login() {
  const { login, loginAsAdminDemo } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const msg = login(email, password);
    if (msg) setErr(msg);
    else nav('/orders');
  };

  return (
    <div className="container page narrow">
      <h1>เข้าสู่ระบบ</h1>
      <div className="notice warn-box">
        ⚠️ <b>ระบบจำลองเท่านั้น — ยังไม่ปลอดภัยจริง</b>
        ข้อมูลเก็บในเบราว์เซอร์ของคุณเอง ห้ามใช้รหัสผ่านเดียวกับอีเมล ธนาคาร หรือบัญชีสำคัญ
      </div>
      <form className="form" onSubmit={submit}>
        <label>อีเมล<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
        <label>รหัสผ่าน (สำหรับทดลอง)<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" required /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn btn-primary btn-lg" type="submit">เข้าสู่ระบบ (จำลอง)</button>
      </form>
      <div className="form-foot">
        <button className="btn btn-outline" onClick={() => { loginAsAdminDemo(); nav('/admin'); }}>
          ทดลองเข้าเป็นแอดมิน (admin@example.com)
        </button>
        <p>ยังไม่มีบัญชี? <Link to="/register" className="link">สมัครสมาชิก</Link></p>
      </div>
    </div>
  );
}
