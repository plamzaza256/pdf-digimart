import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { apiChangePassword, apiLogin, apiSession, apiSignup } from '../lib/api';

// เก็บไว้ในเบราว์เซอร์ของผู้ใช้เท่านั้น เพื่อคงสถานะ "เข้าสู่ระบบแล้ว" ข้ามหน้า
const SESSION_EMAIL = 'pdfshop_session_v1';
// รหัสผู้ใช้ — ห้ามหาย เพราะใช้ยืนยันตัวตนตอนดูคลังไฟล์
const SESSION_TOKEN = 'pdfshop_token_v1';

// รายชื่ออีเมลที่ถือว่าเป็นผู้ดูแลร้าน
// ⚠️ ยังเป็นการตรวจฝั่งเบราว์เซอร์เท่านั้น (แก้โค้ดหน้าเว็บได้) ยังไม่ถือว่าปลอดภัยจริง
const ADMIN_EMAILS = ['16052551mk@gmail.com'];

function toUser(u: {
  user_id: string;
  email: string;
  name: string;
  created_at?: string;
  login_method?: 'password' | 'google';
}): User {
  return {
    name: u.name,
    email: u.email,
    userId: u.user_id,
    loginMethod: u.login_method || 'password',
    role: ADMIN_EMAILS.includes(u.email.toLowerCase()) ? 'admin' : 'customer',
    createdAt: u.created_at || '',
  };
}

/** อ่าน session ที่บันทึกไว้ */
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
  /** รหัสผู้ใช้ปัจจุบัน — ส่งไปพร้อมทุกคำขอที่ต้องยืนยันตัวตน (เช่น ดูคลังไฟล์) */
  token: string | null;
  /** คืน null = สำเร็จ / คืนข้อความ = ล้มเหลว */
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<string | null>;
  logout: () => void;
  /** true = กำลังคุยกับเซิร์ฟเวอร์อยู่ */
  busy: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // คืนสถานะล็อกอินเดิมเมื่อเปิดหน้าเว็บใหม่
  // ใช้ user.session (อีเมล + รหัสผู้ใช้) ไม่ใช่แค่อีเมลอย่างเดียว
  useEffect(() => {
    const saved = readSession();
    if (!saved) return;
    let cancelled = false;
    setToken(saved.token);
    apiSession(saved.email, saved.token)
      .then((r) => {
        if (cancelled) return;
        if (r.ok && r.user) {
          setUser(toUser(r.user));
        } else {
          // รหัสไม่ตรง (เช่น ล้างข้อมูลชีตแล้วสร้างใหม่) → ออกจากระบบ
          clearSession();
          setToken(null);
        }
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
      if (!r.ok || !r.user || !r.token) return r.error || 'เข้าสู่ระบบไม่สำเร็จ';
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

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<string | null> => {
      setBusy(true);
      try {
        const r = await apiSignup(name.trim(), email.trim(), password);
        if (!r.ok || !r.user || !r.token) return r.error || 'สมัครสมาชิกไม่สำเร็จ';
        saveSession(r.user.email, r.token);
        setToken(r.token);
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

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<string | null> => {
      const saved = readSession();
      if (!saved) return 'กรุณาเข้าสู่ระบบก่อน';
      setBusy(true);
      try {
        const r = await apiChangePassword(saved.email, oldPassword, newPassword);
        return r.ok ? null : r.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ';
      } catch (e) {
        return e instanceof Error ? e.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ';
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, token, login, register, changePassword, logout, busy }),
    [user, token, login, register, changePassword, logout, busy],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth ต้องใช้ภายใน AuthProvider');
  return ctx;
}