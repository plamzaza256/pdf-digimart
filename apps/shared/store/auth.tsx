import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { apiFirebaseLogin, apiSession } from '../lib/api';
import {
  isFirebaseConfigured,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  requestPasswordReset,
} from '../lib/firebase';

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
}): User {
  return {
    name: u.name || '',
    email: u.email,
    userId: u.user_id,
    loginMethod: 'firebase',
    role: 'customer', // เดี๋ยวเซิร์ฟเวอร์เป็นผู้กำหนดสิทธิ์จริง
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

/**
 * ส่ง ID Token จาก Firebase ไปให้เซิร์ฟเวอร์ตรวจ
 * เซิร์ฟเวอร์จะคืนรหัสผู้ใช้ที่ใช้กับชีตจริง
 */
async function exchangeWithServer(
  idToken: string,
  name: string,
): Promise<{ user: User; token: string }> {
  const r = await apiFirebaseLogin(idToken, name);
  if (!r.ok || !r.user || !r.token) {
    throw new Error(r.error || 'เข้าสู่ระบบไม่สำเร็จ');
  }
  const user = toUser(r.user);
  saveSession(r.user.email, r.token);
  return { user, token: r.token };
}

interface AuthState {
  user: User | null;
  token: string | null;
  /** true = ตั้งค่า Firebase ครบแล้วหรือยัง */
  ready: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  loginWithGoogle: () => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  forgotPassword: (email: string) => Promise<string | null>;
  logout: () => void;
  busy: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = isFirebaseConfigured();

  // คืนสถานะล็อกอินเดิมเมื่อเปิดหน้าเว็บใหม่
  useEffect(() => {
    const saved = readSession();
    if (!saved) {
      // เก็บกวาดอีเมลค้างเมื่อรหัสผู้ใช้หาย (เช่น ล้างข้อมูลบางส่วน)
      if (localStorage.getItem(SESSION_EMAIL)) clearSession();
      return;
    }
    let cancelled = false;
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
    };
  }, []);

  const run = useCallback(
    async (fn: () => Promise<string | null>): Promise<string | null> => {
      setBusy(true);
      try {
        return await fn();
      } catch (e) {
        return e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ';
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const login = useCallback(
    (email: string, password: string) =>
      run(async () => {
        const acc = await signInWithEmail(email, password);
        const { user: u, token: t } = await exchangeWithServer(acc.idToken, acc.name);
        setUser(u);
        setToken(t);
        return null;
      }),
    [run],
  );

  const loginWithGoogle = useCallback(
    () =>
      run(async () => {
        const acc = await signInWithGoogle();
        const { user: u, token: t } = await exchangeWithServer(acc.idToken, acc.name);
        setUser(u);
        setToken(t);
        return null;
      }),
    [run],
  );

  const register = useCallback(
    (name: string, email: string, password: string) =>
      run(async () => {
        const acc = await signUpWithEmail(email, password, name);
        const { user: u, token: t } = await exchangeWithServer(acc.idToken, acc.name);
        setUser(u);
        setToken(t);
        return null;
      }),
    [run],
  );

  const forgotPassword = useCallback(
    (email: string) =>
      run(async () => {
        await requestPasswordReset(email);
        return null;
      }),
    [run],
  );

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      ready,
      login,
      loginWithGoogle,
      register,
      forgotPassword,
      logout,
      busy,
    }),
    [user, token, ready, login, loginWithGoogle, register, forgotPassword, logout, busy],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth ต้องใช้ภายใน AuthProvider');
  return ctx;
}