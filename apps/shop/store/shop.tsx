import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CartLine, Order, Product } from '@shared/types';
import { mockProducts } from '../data/products';
import { useAuth } from '@shared/store/auth';

const CUSTOM_PRODUCTS_KEY = 'pdfshop_custom_products_v1';
const DELETED_KEY = 'pdfshop_deleted_ids_v1';
const CART_KEY = 'pdfshop_cart_v1';
const ORDERS_KEY = 'pdfshop_orders_v1';

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
  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;
  checkout: () => Order | null;
  myOrders: Order[];
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  resetDemo: () => void;
}

const ShopContext = createContext<ShopState | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [custom, setCustom] = useState<Product[]>(() =>
    loadJSON<Product[]>(CUSTOM_PRODUCTS_KEY, []),
  );
  const [deletedIds, setDeletedIds] = useState<string[]>(() =>
    loadJSON<string[]>(DELETED_KEY, []),
  );
  const [cart, setCart] = useState<CartLine[]>(() =>
    loadJSON<CartLine[]>(CART_KEY, []),
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    loadJSON<Order[]>(ORDERS_KEY, []),
  );

  useEffect(() => {
    localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(custom));
  }, [custom]);
  useEffect(() => {
    localStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds));
  }, [deletedIds]);
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }, [orders]);

  const products = useMemo(() => {
    const customById = new Map(custom.map((p) => [p.id, p]));
    const base = mockProducts
      .filter((p) => !deletedIds.includes(p.id))
      .map((p) => customById.get(p.id) ?? p);
    const brandNew = custom.filter(
      (p) => !mockProducts.some((m) => m.id === p.id),
    );
    return [...brandNew, ...base];
  }, [custom, deletedIds]);

  const priceOf = (id: string) =>
    products.find((p) => p.id === id)?.price ?? 0;

  const cartTotal = cart.reduce(
    (sum, l) => sum + priceOf(l.productId) * l.qty,
    0,
  );
  const cartCount = cart.reduce((sum, l) => sum + l.qty, 0);

  const value = useMemo<ShopState>(
    () => ({
      products,
      cart,
      cartCount,
      cartTotal,
      addToCart(id) {
        setCart((prev) => {
          const f = prev.find((l) => l.productId === id);
          if (f)
            return prev.map((l) =>
              l.productId === id ? { ...l, qty: l.qty + 1 } : l,
            );
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
        setCart((prev) =>
          prev.map((l) => (l.productId === id ? { ...l, qty } : l)),
        );
      },
      clearCart() {
        setCart([]);
      },
      checkout() {
        if (cart.length === 0 || !user) return null;
        const items = cart.map((l) => {
          const p = products.find((x) => x.id === l.productId);
          return {
            productId: l.productId,
            title: p?.title ?? l.productId,
            price: p?.price ?? 0,
            qty: l.qty,
          };
        });
        const order: Order = {
          id: 'ORD-' + Date.now().toString(36).toUpperCase(),
          email: user.email,
          items,
          total: cartTotal,
          status: 'คำสั่งซื้อจำลอง — ยังไม่ชำระเงิน',
          createdAt: new Date().toISOString(),
        };
        setOrders((prev) => [order, ...prev]);
        setCart([]);
        return order;
      },
      myOrders: user
        ? orders.filter((o) => o.email === user.email)
        : [],
      addProduct(p) {
        setCustom((prev) => [p, ...prev.filter((x) => x.id !== p.id)]);
      },
      updateProduct(p) {
        const isBase = mockProducts.some((m) => m.id === p.id);
        if (isBase) {
          setCustom((prev) => {
            const rest = prev.filter((x) => x.id !== p.id);
            return [p, ...rest];
          });
        } else {
          setCustom((prev) => prev.map((x) => (x.id === p.id ? p : x)));
        }
      },
      deleteProduct(id) {
        setCustom((prev) => prev.filter((x) => x.id !== id));
        if (mockProducts.some((m) => m.id === id)) {
          setDeletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        }
        setCart((prev) => prev.filter((l) => l.productId !== id));
      },
      resetDemo() {
        setCustom([]);
        setDeletedIds([]);
      },
    }),
    [products, cart, cartTotal, cartCount, orders, user],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopState {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop ต้องใช้ภายใน ShopProvider');
  return ctx;
}
