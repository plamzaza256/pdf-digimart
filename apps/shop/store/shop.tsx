import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '@shared/types';
import { mockProducts } from '../data/products';
import {
  apiListProducts,
  apiFavoritesList,
  apiFavoriteAdd,
  apiFavoriteRemove,
  apiFavoritesSync,
} from '@shared/lib/api';
import { useAuth } from '@shared/store/auth';

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
  /** รหัสสินค้าที่ถูกใจ */
  favorites: string[];
  favoriteCount: number;
  isFavorite: (id: string) => boolean;
  /** สลับดาว (ถูกใจ / เอาออก) */
  toggleFavorite: (id: string) => void;
}

const ShopContext = createContext<ShopState | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [fromSheet, setFromSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  // ⭐ เก็บดาวไว้ในเบราว์เซอร์ก่อน (ยังไม่ล็อกอินก็กดได้)
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadJSON<string[]>(FAVORITES_KEY, []),
  );
  // ⭐ ดาวที่มาจากบัญชี (ชีต) — เอาไปรวมกับของ local
  const [cloudFavorites, setCloudFavorites] = useState<string[]>([]);

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

  // ⭐ ดึงดาวจากบัญชี (ชีต) แล้วรวมกับที่ค้างในเบราว์เซอร์
  useEffect(() => {
    if (!user || !token) {
      setCloudFavorites([]);
      return;
    }
    let cancelled = false;

    apiFavoritesList(user.email, token)
      .then((r) => {
        if (cancelled || !r.ok) return;
        const fromCloud = Array.isArray(r.productIds) ? (r.productIds as string[]) : [];
        setCloudFavorites(fromCloud);

        // 🔄 ถ้ามีดาวที่ค้างในเบราว์เซอร์ (กดก่อนล็อกอิน) → ส่งเข้าบัญชี
        const local = loadJSON<string[]>(FAVORITES_KEY, []);
        const missing = local.filter((id) => !fromCloud.includes(id));
        if (missing.length > 0) {
          apiFavoritesSync(user.email, token, missing).then((sync) => {
            if (cancelled || !sync.ok) return;
            const all = Array.isArray(sync.productIds) ? (sync.productIds as string[]) : fromCloud;
            setCloudFavorites(all);
            setFavorites(all);
          });
        } else {
          setFavorites(fromCloud);
        }
      })
      .catch(() => {
        /* โหลดดาวจากชีตไม่ได้ → ใช้ของในเบราว์เซอร์ไปก่อน */
      });

    return () => {
      cancelled = true;
    };
  }, [user, token]);

  const toggleFavorite = (id: string) => {
    const nowOn = !favorites.includes(id);

    // อัปเดตหน้าจอทันที (ไม่รอเซิร์ฟเวอร์)
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

    // 💾 ถ้าล็อกอินอยู่ → บันทึกลงชีตผูกกับอีเมล
    if (user && token) {
      const call = nowOn
        ? apiFavoriteAdd(user.email, token, id)
        : apiFavoriteRemove(user.email, token, id);
      call.then((r) => {
        if (!r.ok) {
          // ล้มเหลว → คืนค่าเดิม
          setFavorites((prev) =>
            nowOn ? prev.filter((x) => x !== id) : [...prev, id],
          );
          return;
        }
        setCloudFavorites((prev) =>
          nowOn ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
        );
      }).catch(() => {
        setFavorites((prev) =>
          nowOn ? prev.filter((x) => x !== id) : [...prev, id],
        );
      });
    }
  };

  // ✅ ดาวที่แสดง = รวมของในเบราว์เซอร์กับของในบัญชี
  const allFavorites = useMemo(
    () => Array.from(new Set([...favorites, ...cloudFavorites])),
    [favorites, cloudFavorites],
  );

  const value = useMemo<ShopState>(
    () => ({
      products,
      fromSheet,
      loading,
      favorites: allFavorites,
      favoriteCount: allFavorites.length,
      isFavorite: (id: string) => allFavorites.includes(id),
      toggleFavorite,
    }),
    [products, fromSheet, loading, allFavorites],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopState {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop ต้องใช้ภายใน ShopProvider');
  return ctx;
}
