import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { apiCheckUser, apiLogin, apiSignup } from '../lib/api';

const SESSION_KEY = 'pdfshop_session_v1';

// รายชื่ออีเมลที่ถือว่าเป็นผู้ดูแลร้าน
// ⚠️ ยังเป็นการตรวจฝั่งเบราว์เซอร์เท่านั้น (แก้ได้ง่าย) ยังไม่ถือว่าปลอดภัยจริง
//    ขั้นต่อไปคือยืนยันด้วย Google Sign-In ฝั่ง Apps Script
const ADMIN_EMAILS = ['16052551mk@gmail.com'];

function toUser(u: { user_id: string; email: string; name: string; created_at?: string }): User {
  return {
    name: u.name,
    email: u.email,
    userId: u.user_id,
    role: ADMIN_EMAILS.includes(u.email.toLowerCase()) ? 'admin' : 'customer',
    createdAt: u.created_at || new Date().toISOString().slice(0, 10),
  };
}

interface AuthState {
  user: User | null;
  /** คืน null = สำเร็จ / คืนข้อความ = ล้มเหลว */
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => void;
  /** true = กำลังคุยกับเซิร์ฟเวอร์อยู่ (หน้าจะปิดปุ่มระหว่างรอ) */
  busy: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  // คืนสถานะล็อกอินเดิมเมื่อเปิดหน้าเว็บใหม่ (ดึงข้อมูลล่าสุดจากชีต)
  useEffect(() => {
    const email = localStorage.getItem(SESSION_KEY);
    if (!email) return;
    let cancelled = false;
    apiCheckUser(email)
      .then((r) => {
        if (cancelled) return;
        if (r.ok && r.exists && r.user) setUser(toUser(r.user));
        else localStorage.removeItem(SESSION_KEY);
      })
      .catch(() => {
        /* ออฟไลน์อยู่ — คงสถานะเดิมไว้ ไม่ทำอะไร */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    setBusy(true);
    try {
      const r = await apiLogin(email.trim(), password);
      if (!r.ok || !r.user) return r.error || 'เข้าสู่ระบบไม่สำเร็จ';
      localStorage.setItem(SESSION_KEY, r.user.email);
      setUser(toUser(r.user));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'เข้าสู่ระบบไม่สำเร็จ';
    } finally {
      setBusy(false);
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<string | null> => {
      setBusy(true);
      try {
        const r = await apiSignup(name.trim(), email.trim(), password);
        if (!r.ok || !r.user) return r.error || 'สมัครสมาชิกไม่สำเร็จ';
        localStorage.setItem(SESSION_KEY, r.user.email);
        setUser(toUser(r.user));
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'สมัครสมาชิกไม่สำเร็จ';
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, login, register, logout, busy }),
    [user, login, register, logout, busy],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth ต้องใช้ภายใน AuthProvider');
  return ctx;
}