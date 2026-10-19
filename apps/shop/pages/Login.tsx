import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/store/auth';

export default function Login() {
  const { loginWithGoogle, busy } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);

  const google = async () => {
    setErr(null);
    const msg = await loginWithGoogle();
    if (msg) setErr(msg);
    else nav('/orders');
  };

  return (
    <div className="container page narrow">
      <h1>เข้าสู่ระบบ</h1>
      <p className="muted">
        เข้าด้วยบัญชี Google ครั้งแรก = สมัครสมาชิกอัตโนมัติ ไม่ต้องตั้งรหัสผ่านเพิ่ม
      </p>

      <button
        type="button"
        className="btn btn-outline btn-lg btn-block btn-google"
        onClick={google}
        disabled={busy}
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.5 2.6 30.1 0 24 0 14.6 0 6.1 5.4 2.5 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.9-.4-4.3H24v8.5h12.4c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.4-4.1 6.8-10.1 6.8-17.4z" />
          <path fill="#FBBC05" d="M10.3 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.8l7.8-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2 1.4-4.8 2.4-8.3 2.4-6.3 0-11.7-3.7-13.7-9.1l-7.8 6.1C6.1 42.6 14.6 48 24 48z" />
        </svg>
        {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบด้วย Google'}
      </button>

      {err && <p className="error">{err}</p>}

      <p className="muted small" style={{ marginTop: 20 }}>
        ต้องมีบัญชี Google (Gmail หรือบัญชี Google อื่น) หากยังไม่มี
        สมัครได้ที่ <Link to="https://accounts.google.com/signup" target="_blank" rel="noreferrer" className="link">accounts.google.com</Link>
      </p>
    </div>
  );
}