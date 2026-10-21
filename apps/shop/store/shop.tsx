import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '@shared/types';
import {
  apiListProducts,
  apiFavoritesList,
  apiFavoriteAdd,
  apiFavoriteRemove,
  apiFavoritesSync,
} from '@shared/lib/api';
import { useAuth } from '@shared/store/auth';

const FAVORITES_KEY = 'pdfshop_favorites_v1';
const PRODUCTS_CACHE_KEY = 'pdfshop_products_cache_v1';
const PRODUCTS_CACHE_TTL = 3 * 60 * 1000; // 3 นาที

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
  /** true = ดึงข้อมูลสดจากชีตสำเร็จ */
  fromSheet: boolean;
  loading: boolean;
  /** true = โหลดไม่สำเร็จ (เครือข่าย/เซิร์ฟเวอร์ล่ม) */
  loadError: boolean;
  /** จำนวนสินค้าทั้งหมดในชีต (รวมที่ยังไม่เผยแพร่) */
  totalInSheet: number;
  /** 🧾 ยอดขายรวม (อ่านจากคอลัมน์ sales ในชีต Products) */
  salesSummary: { total: number };
  /** ลองโหลดใหม่ */
  reload: () => void;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [fromSheet, setFromSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // 📊 จำนวนสินค้าทั้งหมดในชีต (รวมที่ยังไม่เผยแพร่) — ใช้บอกว่า "มีของแต่ยังไม่ขึ้นเว็บ"
  const [totalInSheet, setTotalInSheet] = useState(0);
  // 🧾 ยอดขายรวม (อ่านจากคอลัมน์ sales ในชีต Products)
  const [salesSummary, setSalesSummary] = useState({ total: 0 });
  const [nonce, setNonce] = useState(0);
  // ⭐ เก็บดาวไว้ในเบราว์เซอร์ก่อน (ยังไม่ล็อกอินก็กดได้)
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadJSON<string[]>(FAVORITES_KEY, []),
  );
  // ⭐ ดาวที่มาจากบัญชี (ชีต) — เอาไปรวมกับของ local
  const [cloudFavorites, setCloudFavorites] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  // 📡 ดึงสินค้าจากชีตจริง
  //
  // 🛡 ลดการเรียก API (สำคัญมาก — โควตา Apps Script มีจำกัด)
  //    1) แคชผลลัพธ์ใน localStorage 3 นาที → เปิดหน้าซ้ำไม่ต้องยิง API
  //    2) โหลดจากแคชก่อน แล้วค่อยรีเฟรชเบื้องหลัง
  useEffect(() => {
    let cancelled = false;

    // 1) อ่านจากแคชก่อน (ถ้ายังไม่หมดอายุ) → เว็บแสดงข้อมูลทันที
    const cached = loadJSON<{ at: number; data: Product[] } | null>(
      PRODUCTS_CACHE_KEY,
      null,
    );
    const cacheFresh =
      cached && cached.data && Date.now() - cached.at < PRODUCTS_CACHE_TTL;

    if (cacheFresh) {
      setProducts(cached!.data);
      setFromSheet(true);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 2) ยิง API เพื่อรีเฟรช (พร้อมกัน)
    apiListProducts()
      .then((r) => {
        if (cancelled) return;
        if (r.ok && Array.isArray(r.products)) {
          const list = r.products as Product[];
          setProducts(list);
          setFromSheet(true);
          setLoadError(false);
          setTotalInSheet(Number(r.total || 0));
          setSalesSummary({ total: Number(r.salesTotal || 0) });

          // 🛡 อย่าแคชผลลัพธ์ที่ว่างเปล่า
          //    ถ้าเซิร์ฟเวอร์ตอบว่าไม่มีสินค้าชั่วคราว (เช่นกำลังแก้ชีต)
          //    แคชที่ว่างจะทำให้เว็บโชว์ว่างไป 3 นาทีทั้งที่สินค้ามีอยู่จริง
          if (list.length > 0) {
            try {
              localStorage.setItem(
                PRODUCTS_CACHE_KEY,
                JSON.stringify({ at: Date.now(), data: list }),
              );
            } catch {
              /* โหมดส่วนตัว — แคชไม่ได้ก็ไม่เป็นไร */
            }
          }
        } else {
          setLoadError(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // ❌ โหลดไม่ได้ → ไม่โชว์ข้อมูลปลอม
        //    แสดงแคชเก่าถ้ามี ไม่มีก็ให้หน้าเว็บบอกว่าโหลดไม่ได้
        setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [nonce]);

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
      call
        .then((r) => {
          if (!r.ok) {
            setFavorites((prev) =>
              nowOn ? prev.filter((x) => x !== id) : [...prev, id],
            );
            return;
          }
          setCloudFavorites((prev) =>
            nowOn ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
          );
        })
        .catch(() => {
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
      loadError,
      totalInSheet,
      salesSummary,
      reload: () => {
        setLoading(true);
        setNonce((n) => n + 1);
      },
      favorites: allFavorites,
      favoriteCount: allFavorites.length,
      isFavorite: (id: string) => allFavorites.includes(id),
      toggleFavorite,
    }),
    [products, fromSheet, loading, loadError, totalInSheet, salesSummary, allFavorites],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopState {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop ต้องใช้ภายใน ShopProvider');
  return ctx;
}
