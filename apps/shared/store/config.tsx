import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { apiPublicConfig } from '../lib/api';
import type { PublicConfig } from '../lib/api';

/**
 * ค่าตั้งร้านที่หน้าเว็บต้องรู้ (ชื่อร้าน, ลิงก์ LINE OA ฯลฯ)
 *
 * โหลดครั้งเดียว แล้วเก็บไว้ ไม่ต้องยิงซ้ำทุกครั้งที่หน้าเว็บเปลี่ยน
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

export function StoreConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiPublicConfig()
      .then((c) => {
        if (!cancelled) setConfig(c);
      })
      .catch(() => {
        /* โหลดไม่ได้ → ใช้ค่าว่าง */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
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
