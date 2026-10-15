import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';

const USERS_KEY = 'pdfshop_users_v1';
const SESSION_KEY = 'pdfshop_session_v1';

// หมายเหตุสำคัญ: ระบบสมาชิกนี้เป็น "ระบบจำลอง" เก็บใน localStorage ของเบราว์เซอร์
// ยังไม่มีความปลอดภัยจริง ห้ามใช้รหัสผ่านเดียวกับบัญชีสำคัญ

function hashDemo(s: string): string {
  return btoa(unescape(encodeURIComponent('demo:' + s)));
}

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

interface AuthState {
  user: User | null;
  login: (email: string, password: string) => string | null;
  register: (name: string, email: string, password: string) => string | null;
  loginAsAdminDemo: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const email = localStorage.getItem(SESSION_KEY);
    if (!email) return;
    const found = loadUsers().find((u) => u.email === email);
    if (found) setUser(found);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      login(email, password) {
        const users = loadUsers();
        const found = users.find((u) => u.email === email.trim().toLowerCase());
        if (!found) return 'ไม่พบบัญชีนี้ กรุณาสมัครสมาชิกก่อน';
        if (found.passHash !== hashDemo(password)) return 'รหัสผ่านไม่ถูกต้อง';
        localStorage.setItem(SESSION_KEY, found.email);
        setUser(found);
        return null;
      },
      register(name, email, password) {
        const cleanEmail = email.trim().toLowerCase();
        if (!name.trim()) return 'กรุณากรอกชื่อ';
        if (!cleanEmail.includes('@')) return 'อีเมลไม่ถูกต้อง';
        if (password.length < 6) return 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร (ใช้รหัสสำหรับทดลองเท่านั้น)';
        const users = loadUsers();
        if (users.some((u) => u.email === cleanEmail)) return 'อีเมลนี้สมัครแล้ว ลองเข้าสู่ระบบ';
        const role = cleanEmail === 'admin@example.com' ? 'admin' : 'customer';
        const nu: User = {
          name: name.trim(),
          email: cleanEmail,
          passHash: hashDemo(password),
          role,
          createdAt: new Date().toISOString(),
        };
        users.push(nu);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        localStorage.setItem(SESSION_KEY, nu.email);
        setUser(nu);
        return null;
      },
      loginAsAdminDemo() {
        const users = loadUsers();
        let admin = users.find((u) => u.email === 'admin@example.com');
        if (!admin) {
          admin = {
            name: 'ผู้ดูแลระบบ (จำลอง)',
            email: 'admin@example.com',
            passHash: hashDemo('admin123'),
            role: 'admin',
            createdAt: new Date().toISOString(),
          };
          users.push(admin);
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }
        localStorage.setItem(SESSION_KEY, admin.email);
        setUser(admin);
      },
      logout() {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth ต้องใช้ภายใน AuthProvider');
  return ctx;
}
