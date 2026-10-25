import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { apiFirebaseLogin, apiSession } from '../lib/api';
import { consumeGoogleRedirect, isFirebaseConfigured, signInWithGoogle } from '../lib/firebase';

// เก็บในเบราว์เซอร์ของผู้ใช้เพื่อคงสถานะ "เข้าสู่ระบบแล้ว" ข้ามหน้า
const SESSION_EMAIL = 'pdfshop_session_v1';
// รหัสผู้ใช้ — ห้ามหาย ใช้ยืนยันตัวตนตอนดูคลังไฟล์
const SESSION_TOKEN = 'pdfshop_token_v1';

function toUser(u: {
  user_id: string;
  email: string;
  name: string;
  created_at?: string;
  login_method?: string;
  is_admin?: boolean;
}): User {
  return {
    name: u.name || '',
    email: u.email,
    userId: u.user_id,
    loginMethod: 'google',
    // สิทธิ์ผู้ดูแลมาจากเซิร์ฟเวอร์เท่านั้น ไม่ควรเดาจากอีเมลในเบราว์เซอร์
    role: u.is_admin === true ? 'admin' : 'customer',
    createdAt: u.created_at || '',
  };
}

export function readSession(): { email: string; token: string } | null {
  const email = localStorage.getItem(SESSION_EMAIL) || '';
  const token = localStorage.getItem(SESSION_TOKEN) || '';
  if (!email || !token) return null;
  return { email, token };
}

function saveSession(email: string, token: string) {
  localStorage.setItem(SESSION_EMAIL, email);
  localStorage.setItem(SESSION_TOKEN, token);
}

function clearSession() {
  localStorage.removeItem(SESSION_EMAIL);
  localStorage.removeItem(SESSION_TOKEN);
}

interface AuthState {
  user: User | null;
  /** รหัสผู้ใช้ปัจจุบัน — ส่งไปพร้อมทุกคำขอที่ต้องยืนยันตัวตน */
  token: string | null;
  /** true = ตั้งค่า Firebase ครบแล้วหรือยัง */
  ready: boolean;
  /** เข้าสู่ระบบด้วย Google (ครั้งแรก = สมัครสมาชิกอัตโนมัติ) */
  loginWithGoogle: () => Promise<string | null>;
  logout: () => void;
  busy: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const ready = isFirebaseConfigured();

  // คืนสถานะล็อกอินเดิมเมื่อเปิดหน้าเว็บใหม่
  useEffect(() => {
    // 📱 มือถือใช้ redirect: ถ้าเพิ่งกลับมาจากหน้า Google → รับผลทันที
    //    (ต้องทำก่อนอย่างอื่น เพราะ Firebase ให้ผลรอบเดียว)
    consumeGoogleRedirect()
      .then(async (acc) => {
        if (!acc || cancelledRedirect) return;
        try {
          const r = await apiFirebaseLogin(acc.idToken, acc.name);
          if (r.ok && r.user && r.token) {
            saveSession(r.user.email, r.token);
            setToken(r.token);
            setUser(toUser(r.user));
          }
        } catch {
          /* ปล่อยผ่าน — ผู้ใช้กดปุ่มล็อกอินใหม่ได้ */
        }
      })
      .catch(() => {});

    const saved = readSession();
    if (!saved) {
      // เก็บกวาดอีเมลค้างเมื่อรหัสผู้ใช้หาย
      if (localStorage.getItem(SESSION_EMAIL)) clearSession();
      return;
    }
    let cancelled = false;
    let cancelledRedirect = false;
    setToken(saved.token);
    apiSession(saved.email, saved.token)
      .then((r) => {
        if (cancelled) return;
        if (r.ok && r.user) setUser(toUser(r.user));
        else {
          clearSession();
          setToken(null);
        }
      })
      .catch(() => {
        /* ออฟไลน์อยู่ — คงสถานะเดิมไว้ */
      });
    return () => {
      cancelled = true;
      cancelledRedirect = true;
    };
  }, []);

  const [busy, setBusy] = useState(false);

  // 🛡 กันปุ่มหมุนค้าง: ถ้า redirect ไป Google แล้วถูกเน็ต/ไฟร์วอลล์ขวาง
  //    หน้าจะไม่ออก → busy ค้าง true ตลอด ให้ปลดอัตโนมัติหลัง 12 วินาที
  //    เพื่อผู้ใช้กดปุ่มซ้ำได้ (กรณีเกิดจริง เช่นอาการ Failed to fetch)
  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => setBusy(false), 12000);
    return () => clearTimeout(t);
  }, [busy]);

  const loginWithGoogle = useCallback(async (): Promise<string | null> => {
    setBusy(true);
    try {
      const acc = await signInWithGoogle();
      // ส่ง ID Token ให้เซิร์ฟเวอร์ตรวจ แล้วจึงได้รหัสผู้ใช้ของเรา
      const r = await apiFirebaseLogin(acc.idToken, acc.name);
      if (!r.ok || !r.user || !r.token) {
        return r.error || 'เข้าสู่ระบบไม่สำเร็จ';
      }
      saveSession(r.user.email, r.token);
      setToken(r.token);
      setUser(toUser(r.user));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'เข้าสู่ระบบไม่สำเร็จ';
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, token, ready, loginWithGoogle, logout, busy }),
    [user, token, ready, loginWithGoogle, logout, busy],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth ต้องใช้ภายใน AuthProvider');
  return ctx;
}