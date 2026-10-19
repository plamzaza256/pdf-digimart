import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CartLine, Product } from '@shared/types';
import { apiListProducts } from '@shared/lib/api';

const CART_KEY = 'pdfshop_cart_v1';

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
  /** true = กำลังโหลดรายการสินค้าจากชีต */
  loading: boolean;
  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;
}

const ShopContext = createContext<ShopState | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>(() => loadJSON<CartLine[]>(CART_KEY, []));

  // 📦 สินค้ามาจากชีตจริงเท่านั้น (ไม่มีข้อมูลจำลองในโค้ดแล้ว)
  useEffect(() => {
    let cancelled = false;
    apiListProducts()
      .then((r) => {
        if (cancelled) return;
        if (r.ok && Array.isArray(r.products)) {
          setProducts(r.products as Product[]);
        }
      })
      .catch(() => {
        /* ต่อเซิร์ฟเวอร์ไม่ได้ — ปล่อยว่างไว้ หน้าเว็บจะแจ้งเอง */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const priceOf = useCallback(
    (id: string) => products.find((p) => p.id === id)?.price ?? 0,
    [products],
  );

  const cartTotal = cart.reduce((sum, l) => sum + priceOf(l.productId) * l.qty, 0);
  const cartCount = cart.reduce((sum, l) => sum + l.qty, 0);

  const value = useMemo<ShopState>(
    () => ({
      products,
      loading,
      cart,
      cartCount,
      cartTotal,
      addToCart(id) {
        setCart((prev) => {
          const f = prev.find((l) => l.productId === id);
          if (f) return prev.map((l) => (l.productId === id ? { ...l, qty: l.qty + 1 } : l));
          return [...prev, { productId: id, qty: 1 }];
        });
      },
      removeFromCart(id) {
        setCart((prev) => prev.filter((l) => l.productId !== id));
      },
      setQty(id, qty) {
        if (qty <= 0) {
          setCart((prev) => prev.filter((l) => l.productId !== id));
          return;
        }
        setCart((prev) => prev.map((l) => (l.productId === id ? { ...l, qty } : l)));
      },
      clearCart() {
        setCart([]);
      },
    }),
    [products, loading, cart, cartTotal, cartCount],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopState {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop ต้องใช้ภายใน ShopProvider');
  return ctx;
}
