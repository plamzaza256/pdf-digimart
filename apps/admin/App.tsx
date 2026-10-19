import { useState } from 'react';
import type { FormEvent } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@shared/store/auth';
import Admin from './pages/Admin';
import { AdminShopProvider } from './store/products';

/**
 * หน้าล็อกอินของเว็บแอดมิน (คนละชุดกับเว็บร้าน)
 * ใช้ session คนละที่ → ล็อกอินเว็บร้านอยู่ ไม่ได้เข้าแอดมินอัตโนมัติ
 */
function LoginGate() {
  const { login, user, busy } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  if (user?.role === 'admin') {
    return <Navigate to="/orders" replace />;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const msg = await login(email, password);
    if (msg) setErr(msg);
  };

  return (
    <div className="container page narrow">
      <h1>ผู้ดูแลร้าน</h1>
      <p className="muted">เข้าสู่ระบบด้วยอีเมลเจ้าของร้านเพื่อจัดการสินค้าและคำสั่งซื้อ</p>
      <form className="form" onSubmit={submit}>
        <label>อีเมล<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>รหัสผ่าน<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
          {busy ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบผู้ดูแล'}
        </button>
      </form>
      {user && <p className="muted">บัญชี {user.email} ไม่มีสิทธิ์ผู้ดูแล</p>}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AdminShopProvider>
          <main className="main">
            <Routes>
              <Route path="/login" element={<LoginGate />} />
              <Route path="/products" element={<Admin />} />
              <Route path="/orders" element={<Admin />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </AdminShopProvider>
      </AuthProvider>
    </HashRouter>
  );
}