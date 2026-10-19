import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/store/auth';

export default function Register() {
  const { register, loginWithGoogle, busy } = useAuth();
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

  const google = async () => {
    setErr(null);
    const msg = await loginWithGoogle();
    if (msg) setErr(msg);
    else nav('/orders');
  };

  return (
    <div className="container page narrow">
      <h1>สมัครสมาชิก</h1>

      <button
        type="button"
        className="btn btn-outline btn-lg btn-block"
        onClick={google}
        disabled={busy}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.5 2.6 30.1 0 24 0 14.6 0 6.1 5.4 2.5 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.9-.4-4.3H24v8.5h12.4c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.4-4.1 6.8-10.1 6.8-17.4z" />
          <path fill="#FBBC05" d="M10.3 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.8l7.8-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2 1.4-4.8 2.4-8.3 2.4-6.3 0-11.7-3.7-13.7-9.1l-7.8 6.1C6.1 42.6 14.6 48 24 48z" />
        </svg>
        {busy ? 'กำลังเข้าสู่ระบบ…' : 'สมัครด้วย Google'}
      </button>

      <div className="divider"><span>หรือ</span></div>

      <form className="form" onSubmit={submit}>
        <label>ชื่อที่แสดง<input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น มินตรา" required /></label>
        <label>อีเมล<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
        <label>ตั้งรหัสผ่าน<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" required /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
          {busy ? 'กำลังสร้างบัญชี…' : 'สมัครสมาชิก'}
        </button>
      </form>

      <p>มีบัญชีแล้ว? <Link to="/login" className="link">เข้าสู่ระบบ</Link></p>
    </div>
  );
}