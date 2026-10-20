import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '@shared/types';
import { mockProducts } from '../data/products';
import { apiListProducts } from '@shared/lib/api';

const FAVORITES_KEY = 'pdfshop_favorites_v1';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface ShopState {
  products: Product[];
  /** true = ดึงข้อมูลจากชีตจริง, false = ยังใช้รายการตัวอย่างในโค้ด */
  fromSheet: boolean;
  loading: boolean;
  /** รหัสสินค้าที่ลูกค้ากดถูกใจ */
  favorites: string[];
  favoriteCount: number;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

const ShopContext = createContext<ShopState | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [fromSheet, setFromSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadJSON<string[]>(FAVORITES_KEY, []),
  );

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  // 📡 ดึงสินค้าจากชีตจริง — เพื่อให้ที่แอดมินแก้ เว็บร้านเปลี่ยนตามทันที
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
        /* ต่อเซิร์ฟเวอร์ไม่ได้ → ใช้รายการตัวอย่าง */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const value = useMemo<ShopState>(
    () => ({
      products,
      fromSheet,
      loading,
      favorites,
      favoriteCount: favorites.length,
      isFavorite: (id: string) => favorites.includes(id),
      toggleFavorite,
    }),
    [products, fromSheet, loading, favorites],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopState {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop ต้องใช้ภายใน ShopProvider');
  return ctx;
}
