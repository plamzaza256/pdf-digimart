import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '@shared/types';
import {
  apiListProductsAll,
  apiUpsertProduct,
  apiDeleteProduct,
} from '@shared/lib/api';
import { useAuth } from '@shared/store/auth';

/**
 * รายการสินค้าของเว็บแอดมิน
 *
 * ⚠️ เดิมแก้แล้วแค่ในเบราว์เซอร์ ไม่ได้เขียนลงชีต
 *    → เว็บร้านก็เลยไม่เปลี่ยนตาม
 *    ตอนนี้เขียนลง Google Sheets จริงผ่าน product.upsert
 */
interface AdminShopState {
  products: Product[];
  loading: boolean;
  /** true = ข้อมูลมาจากชีตจริง */
  fromSheet: boolean;
  saving: boolean;
  /** ข้อความแจ้งเตือนล่าสุด */
  message: string;
  messageType: 'ok' | 'error' | '';
  addProduct: (p: Product) => Promise<boolean>;
  updateProduct: (id: string, p: Product) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  clearMessage: () => void;
}

const AdminShopContext = createContext<AdminShopState | null>(null);

export function AdminShopProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromSheet, setFromSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'ok' | 'error' | ''>('');

  const say = (msg: string, type: 'ok' | 'error') => {
    setMessage(msg);
    setMessageType(type);
  };

  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    setLoading(true);

    // 🛡 ลดการยิง API — โควตา Apps Script มีจำกัด
    //    แคชสินค้าไว้ 30 วินาที เพื่อไม่ให้ยิงซ้ำทุกครั้งที่เปิดหน้า
    const CACHE_KEY = 'pdfshop_admin_products_v1';
    const CACHE_TTL = 30 * 1000;
    let cached: { at: number; data: Product[] } | null = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch {
      cached = null;
    }

    if (cached && Date.now() - cached!.at < CACHE_TTL) {
      setProducts(cached!.data);
      setFromSheet(true);
      setLoading(false);
    }

    apiListProductsAll(user.email, token)
      .then((r) => {
        if (cancelled) return;
        if (r.ok && Array.isArray(r.products)) {
          const list = r.products as Product[];
          setProducts(list);
          setFromSheet(true);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: list }));
          } catch {
            /* แคชไม่ได้ก็ไม่เป็นไร */
          }
        } else {
          say(r.error || 'ดึงข้อมูลไม่สำเร็จ', 'error');
        }
      })
      .catch((e) => {
        if (!cancelled) say(e instanceof Error ? e.message : 'ต่อเซิร์ฟเวอร์ไม่ได้', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  const addProduct = useCallback(
    async (p: Product) => {
      if (!user || !token) return false;
      setSaving(true);
      try {
        const r = await apiUpsertProduct(user.email, token, p as unknown as Record<string, unknown>);
        if (!r.ok) {
          say(r.error || 'เพิ่มสินค้าไม่สำเร็จ', 'error');
          return false;
        }
        // ดึงใหม่เพื่อให้ได้ข้อมูลตรงกับชีต (เช่น created_at)
        const fresh = await apiListProductsAll(user.email, token);
        if (fresh.ok && Array.isArray(fresh.products)) {
          setProducts(fresh.products as Product[]);
        }
        say(r.message || 'เพิ่มสินค้าแล้ว', 'ok');
        return true;
      } catch (e) {
        say(e instanceof Error ? e.message : 'เพิ่มสินค้าไม่สำเร็จ', 'error');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [user, token],
  );

  const updateProduct = useCallback(
    async (id: string, p: Product) => {
      if (!user || !token) return false;
      setSaving(true);
      try {
        const r = await apiUpsertProduct(user.email, token, {
          ...(p as unknown as Record<string, unknown>),
          id,
        });
        if (!r.ok) {
          say(r.error || 'บันทึกไม่สำเร็จ', 'error');
          return false;
        }
        const fresh = await apiListProductsAll(user.email, token);
        if (fresh.ok && Array.isArray(fresh.products)) {
          setProducts(fresh.products as Product[]);
        }
        say(r.message || 'บันทึกแล้ว', 'ok');
        return true;
      } catch (e) {
        say(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ', 'error');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [user, token],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      if (!user || !token) return false;
      setSaving(true);
      try {
        const r = await apiDeleteProduct(user.email, token, id);
        if (!r.ok) {
          say(r.error || 'ลบไม่สำเร็จ', 'error');
          return false;
        }
        const fresh = await apiListProductsAll(user.email, token);
        if (fresh.ok && Array.isArray(fresh.products)) {
          setProducts(fresh.products as Product[]);
        }
        say(r.message || 'ลบแล้ว', 'ok');
        return true;
      } catch (e) {
        say(e instanceof Error ? e.message : 'ลบไม่สำเร็จ', 'error');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [user, token],
  );

  const value = useMemo<AdminShopState>(
    () => ({
      products,
      loading,
      fromSheet,
      saving,
      message,
      messageType,
      addProduct,
      updateProduct,
      deleteProduct,
      clearMessage: () => {
        setMessage('');
        setMessageType('');
      },
    }),
    [products, loading, fromSheet, saving, message, messageType, addProduct, updateProduct, deleteProduct],
  );

  return <AdminShopContext.Provider value={value}>{children}</AdminShopContext.Provider>;
}

export function useAdminShop(): AdminShopState {
  const ctx = useContext(AdminShopContext);
  if (!ctx) throw new Error('useAdminShop ต้องใช้ภายใน AdminShopProvider');
  return ctx;
}
