import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '@shared/types';
import { apiListProducts } from '@shared/lib/api';

/**
 * รายการสินค้าของเว็บแอดมิน
 *
 * ตอนนี้ยังเป็นรายการจำลองในหน้าเว็บ (ต้องมีรหัสผู้ดูแลถึงจะเขียนลงชีตได้)
 * ขั้นต่อไปคือย้ายการเพิ่ม/แก้/ลบไปเรียกชีตจริง
 */
const MOCK: Product[] = [];

interface AdminShopState {
  products: Product[];
  loading: boolean;
  /** true = ข้อมูลมาจากชีตจริง, false = ยังเป็นข้อมูลจำลอง */
  fromSheet: boolean;
  addProduct: (p: Product) => void;
  updateProduct: (id: string, p: Product) => void;
  deleteProduct: (id: string) => void;
}

const AdminShopContext = createContext<AdminShopState | null>(null);

export function AdminShopProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(MOCK);
  const [loading, setLoading] = useState(true);
  const [fromSheet, setFromSheet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiListProducts()
      .then((r) => {
        if (cancelled) return;
        if (r.ok && Array.isArray(r.products) && r.products.length > 0) {
          setProducts(r.products as Product[]);
          setFromSheet(true);
        }
      })
      .catch(() => {
        /* ต่อเซิร์ฟเวอร์ไม่ได้ → ใช้รายการจำลอง */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addProduct = useCallback((p: Product) => {
    setProducts((old) => [p, ...old]);
  }, []);

  const updateProduct = useCallback((id: string, p: Product) => {
    setProducts((old) => old.map((x) => (x.id === id ? p : x)));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((old) => old.filter((x) => x.id !== id));
  }, []);

  const value = useMemo<AdminShopState>(
    () => ({ products, loading, fromSheet, addProduct, updateProduct, deleteProduct }),
    [products, loading, fromSheet, addProduct, updateProduct, deleteProduct],
  );

  return <AdminShopContext.Provider value={value}>{children}</AdminShopContext.Provider>;
}

export function useAdminShop(): AdminShopState {
  const ctx = useContext(AdminShopContext);
  if (!ctx) throw new Error('useAdminShop ต้องใช้ภายใน AdminShopProvider');
  return ctx;
}