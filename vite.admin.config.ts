import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * เว็บแอดมิน (ฝั่งเจ้าของร้าน)
 * แยกจากเว็บร้านอีกเว็บ — ลูกค้าโหลดโค้ดส่วนนี้ไม่ได้
 * ผลลัพธ์อยู่ที่ dist/admin → Cloudflare Pages โปรเจกต์ "admin"
 */
export default defineConfig({
  root: r('./apps/admin'),
  // ให้ Vite อ่านไฟล์ .env.local จากรากโปรเจกต์ (ไม่ใช่จากโฟลเดอร์ของแต่ละเว็บ)
  envDir: r('.'),
  publicDir: r('./public'),
  plugins: [react()],
  resolve: {
    alias: { '@shared': r('./apps/shared') },
  },
  build: {
    outDir: r('./dist/admin'),
    emptyOutDir: true,
  },
});