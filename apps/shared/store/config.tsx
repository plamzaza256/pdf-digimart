import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { apiPublicConfig } from '../lib/api';
import type { PublicConfig } from '../lib/api';

/**
 * ค่าตั้งร้านที่หน้าเว็บต้องรู้ (ชื่อร้าน, ลิงก์ LINE OA ฯลฯ)
 *
 * ⚠️ โหลดครั้งเดียว แล้วเก็บใน localStorage
 *    เพราะถ้าโหลดช้า ปุ่ม "สั่งซื้อ" จะพาไป LINE OA ไม่ได้
 *    ลูกค้ากดเร็วๆ = เสียลูกค้า
 */
interface StoreConfigState {
  config: PublicConfig | null;
  loading: boolean;
  /** ลิงก์ LINE OA ที่ใช้ในปุ่มสั่งซื้อ */
  lineOaLink: string;
}

const StoreConfigContext = createContext<StoreConfigState>({
  config: null,
  loading: true,
  lineOaLink: '',
});

// 💾 เก็บค่าไว้ในเบราว์เซอร์ เพื่อให้หน้าเว็บเปิดได้ปุ๊บปัดโดยไม่ต้องรอเซิร์ฟเวอร์
const CACHE_KEY = 'pdfshop_config_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 ชั่วโมง

function readCache(): PublicConfig | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as { at: number; data: PublicConfig };
    if (!obj || !obj.data) return null;
    if (Date.now() - obj.at > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return obj.data;
  } catch {
    return null;
  }
}

function writeCache(data: PublicConfig) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* โหมดส่วนตัว บันทึกไม่ได้ — ไม่เป็นไร */
  }
}

export function StoreConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicConfig | null>(() => readCache());
  const [loading, setLoading] = useState<boolean>(() => !readCache());

  useEffect(() => {
    let cancelled = false;

    // 1) ลองอ่านจากเซิร์ฟเวอร์ (พร้อมลองซ้ำ 3 ครั้ง ถ้าพังชั่วคราว)
    let tries = 0;
    const fetchConfig = () => {
      apiPublicConfig()
        .then((c) => {
          if (cancelled) return;
          setConfig(c);
          writeCache(c);
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          tries += 1;
          if (tries < 3) {
            // 🔄 ลองใหม่อีกครั้ง (เซิร์ฟเวอร์อาจค้างชั่วคราว)
            setTimeout(fetchConfig, 800 * tries);
          } else {
            // 😔 ล้มเหลว — ใช้ค่าจาก cache ถ้ามี ถ้าไม่มีก็ปล่อยให้ว่าง
            const cached = readCache();
            if (cached) setConfig(cached);
            setLoading(false);
          }
        });
    };
    fetchConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StoreConfigContext.Provider
      value={{
        config,
        loading,
        lineOaLink: config?.line_oa_link || '',
      }}
    >
      {children}
    </StoreConfigContext.Provider>
  );
}

export function useStoreConfig(): StoreConfigState {
  return useContext(StoreConfigContext);
}
