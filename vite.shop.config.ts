import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * เว็บร้าน (ฝั่งลูกค้า)
 * ผลลัพธ์อยู่ที่ dist/shop → Cloudflare Pages โปรเจกต์ "shop"
 */
export default defineConfig({
  root: r('./apps/shop'),
  // ให้ Vite อ่านไฟล์ .env.local จากรากโปรเจกต์ (ไม่ใช่จากโฟลเดอร์ของแต่ละเว็บ)
  envDir: r('.'),
  publicDir: r('./apps/shop/public'),
  plugins: [react()],
  resolve: {
    alias: { '@shared': r('./apps/shared') },
  },
  build: {
    outDir: r('./dist/shop'),
    emptyOutDir: true,
  },
});