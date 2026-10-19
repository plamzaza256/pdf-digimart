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
  const { loginWithGoogle, user, busy } = useAuth();
  const [err, setErr] = useState<string | null>(null);

  if (user?.role === 'admin') {
    return <Navigate to="/products" replace />;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const msg = await loginWithGoogle();
    if (msg) setErr(msg);
  };

  return (
    <div className="container page narrow">
      <h1>ผู้ดูแลร้าน</h1>
      <p className="muted">เข้าสู่ระบบด้วยบัญชี Google ของเจ้าของร้าน</p>
      <form className="form" onSubmit={submit}>
        <button className="btn btn-outline btn-lg btn-block btn-google" type="submit" disabled={busy}>
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.5 2.6 30.1 0 24 0 14.6 0 6.1 5.4 2.5 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.9-.4-4.3H24v8.5h12.4c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.4-4.1 6.8-10.1 6.8-17.4z" />
            <path fill="#FBBC05" d="M10.3 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.8l7.8-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2 1.4-4.8 2.4-8.3 2.4-6.3 0-11.7-3.7-13.7-9.1l-7.8 6.1C6.1 42.6 14.6 48 24 48z" />
          </svg>
          {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบด้วย Google'}
        </button>
        {err && <p className="error">{err}</p>}
      </form>
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
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </AdminShopProvider>
      </AuthProvider>
    </HashRouter>
  );
}