import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  browserPopupRedirectResolver,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { apiPublicConfig } from './api';

/**
 * Firebase Authentication — เข้าสู่ระบบด้วย Google อย่างเดียว
 *
 * ผู้ใช้ไม่ต้องตั้งรหัสผ่านเลย Firebase จัดการทั้งหมด
 * ครั้งแรกที่กดปุ่ม = สร้างบัญชีให้อัตโนมัติ
 *
 * ค่าตั้ง Firebase ดึงจากเซิร์ฟเวอร์ก่อนใช้
 * → ไม่ต้องใส่ค่าใน Cloudflare Pages ทีละเว็บ
 * → ถ้ามีค่าใน .env จะใช้ค่านั้นแทน (เร็วกว่า ไม่ต้องรอเครือข่าย)
 */

interface FirebaseOptions {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

const envConfig: FirebaseOptions | null =
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
    ? {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      }
    : null;

/** โหลดค่าตั้งครั้งเดียว แล้วจำไว้ */
let configPromise: Promise<FirebaseOptions> | null = null;

async function loadConfig(): Promise<FirebaseOptions> {
  if (!configPromise) {
    configPromise = envConfig
      ? Promise.resolve(envConfig)
      : apiPublicConfig()
          .then((c) => c.firebase)
          .catch((e) => {
            // ล้าง cache เพื่อให้ลองใหม่ได้
            configPromise = null;
            // 🛡 throw แบบ Error object เสมอ — เดิม throw เป็นสตริง
            //     ทำให้ผู้ใช้ไม่เห็นสาเหตุจริง (เจอแต่ "เข้าสู่ระบบไม่สำเร็จ")
            throw new Error(
              e instanceof Error
                ? e.message
                : 'โหลดค่าตั้ง Firebase ไม่สำเร็จ',
            );
          });
  }
  return configPromise;
}

/**
 * พร้อมใช้งานหรือยัง
 * true = ตั้งค่าใน .env ไว้ (ใช้ได้ทันที)
 * false = ต้องรอดึงจากเซิร์ฟเวอร์ (ยังใช้ได้ แค่ช้ากว่าเล็กน้อย)
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(envConfig);
}

let authInstance: ReturnType<typeof getAuth> | null = null;

async function getFirebaseAuth() {
  const config = await loadConfig();
  if (!authInstance) {
    // เรียกได้หลายครั้งโดยไม่ error (Fast Refresh / หลาย entry)
    const app = getApps().length ? getApp() : initializeApp(config);
    authInstance = getAuth(app);
    // 📦 เปลี่ยนที่เก็บสถานะเป็น IndexedDB เสมอ
    //    เดิมใช้ sessionStorage (ที่ในบางเบราว์เซอร์มือถือ/in-app browser ถูกบล็อก)
    //    ทำให้ป๊อปอัพล็อกอินฟ้องว่า "ไม่สามารถเข้าถึง sessionStorage"
    try {
      await setPersistence(authInstance, indexedDBLocalPersistence);
    } catch {
      /* บางเบราว์เซอร์บล็อก IndexedDB ด้วย — ไม่เป็นไร Firebase หาที่เก็บให้เอง */
    }
  }
  return authInstance;
}

/** เดาว่าเป็นมือถือไหม — มือถือมักบล็อก popup + sessionStorage ของ Firebase */
function isMobileBrowser(): boolean {
  try {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

/** แปลงรหัสผิดของ Firebase เป็นข้อความไทยที่เข้าใจง่าย */
function thaiError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'อีเมลไม่ถูกต้อง';
    case 'auth/user-disabled':
      return 'บัญชีนี้ถูกปิดการใช้งาน';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    case 'auth/email-already-in-use':
      return 'อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบ';
    case 'auth/weak-password':
      return 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร';
    case 'auth/popup-closed-by-user':
      return 'ปิดหน้าต่างก่อนเลือกบัญชี ลองใหม่อีกครั้ง';
    case 'auth/popup-blocked':
      return 'เบราว์เซอร์บล็อกหน้าต่าง ลองกดอีกครั้ง';
    case 'auth/too-many-requests':
      return 'ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
    case 'auth/network-request-failed':
      return 'ต่อเน็ตไม่ได้ ลองเช็คอินเทอร์เน็ต';
    case 'auth/cancelled-popup-request':
      return 'เปิดหน้าต่างซ้อนกันเกิน ลองใหม่อีกครั้ง';
    case 'auth/unauthorized-domain':
      return 'โดเมนเว็บนี้ยังไม่ได้เปิดให้ล็อกอินด้วย Google ฝั่ง Firebase';
    case 'auth/operation-not-allowed':
      return 'ยังไม่ได้เปิดวิธีนี้ใน Firebase (ต้องเปิด Google)';
    default:
      return 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
  }
}

/** ดึงรหัส error ของ Firebase ออกมาแบบไม่พังเมื่อ error เป็นชนิดอื่น */
function errorCode(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    return String((e as { code: unknown }).code || '');
  }
  return '';
}

export interface FirebaseAccount {
  idToken: string;
  email: string;
  name: string;
}

/**
 * ✅ ตรวจว่าเพิ่งกลับมาจาก redirect ล็อกอินไหม (ให้ทำก่อนเรนเดอร์อะไรหนัก ๆ)
 *    ถ้าเพิ่งกลับมา → คืนข้อมูลบัญชีทันที (ไม่ต้องกดปุ่มอีกรอบ)
 *
 * 🎫 ถ้า redirect ล้มเหลว → จดข้อความไว้ที่ sessionStorage
 *    แล้วหน้า Login จะดึงด้วย takeForgetLoginError() มาโชว์ได้
 *    (แก้บั๊ก "กลับมาเงียบ ๆ ผู้ใช้ไม่รู้ว่าเกิดอะไร")
 */
export async function consumeGoogleRedirect(): Promise<FirebaseAccount | null> {
  try {
    const auth = await getFirebaseAuth();
    const cred = await getRedirectResult(auth);
    if (!cred || !cred.user) return null;
    _clearRedirectFailure();
    const email = cred.user.email || '';
    if (!email) return null;
    return {
      idToken: await cred.user.getIdToken(),
      email,
      name: cred.user.displayName || '',
    };
  } catch (e) {
    console.error('firebase/redirect result error:', e);
    _setRedirectFailure('กลับมาจากหน้า Google แล้วแต่ล็อกอินไม่สำเร็จ — ลองกดปุ่มอีกครั้ง');
    return null;
  }
}

/** 🎫 กล่องจดข้อความ "redirect ล้มเหลว" (ใช้ sessionStorage — ปิดแท็บแล้วหาย) */
const REDIRECT_FAIL_KEY = 'pdfshop_login_err_v1';

function _setRedirectFailure(msg: string): void {
  try { sessionStorage.setItem(REDIRECT_FAIL_KEY, msg); } catch { /* บล็อกก็ช่าง */ }
}

function _clearRedirectFailure(): void {
  try { sessionStorage.removeItem(REDIRECT_FAIL_KEY); } catch { /* ช่าง */ }
}

/** 🎫 ดึง+ล้างข้อความพังของ redirect (หน้า Login ใช้มาโชว์ให้ผู้ใช้) */
export function takeForgetLoginError(): string | null {
  try {
    const msg = sessionStorage.getItem(REDIRECT_FAIL_KEY);
    if (!msg) return null;
    sessionStorage.removeItem(REDIRECT_FAIL_KEY);
    return msg;
  } catch {
    return null;
  }
}

export async function signInWithGoogle(): Promise<FirebaseAccount> {
  const auth = await getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    // 📱 มือถือ → ใช้ redirect ตรง ๆ (popup มักโดนบล็อก sessionStorage)
    //    หน้าจะเด้งไปหน้า Google แล้วกลับมาที่เดิม
    //    ผลลัพธ์จะถูกดึงโดย consumeGoogleRedirect() ตอนหน้าโหลดใหม่
    if (isMobileBrowser()) {
      await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
      // redirect จะพาออกจากหน้านี้ — return Promise ที่ไม่จบ กันโค้ดต่อไปวิ่ง
      return new Promise<FirebaseAccount>(() => {});
    }

    // 💻 คอม → popup ตามเดิม (ไวกว่า)
    const cred = await signInWithPopup(auth, provider);
    const email = cred.user.email || '';
    if (!email) throw new Error('บัญชี Google นี้ไม่มีอีเมล ใช้บัญชีอื่นแทน');
    return {
      idToken: await cred.user.getIdToken(),
      email,
      name: cred.user.displayName || '',
    };
  } catch (e) {
    // 🧨 ถ้า Firebase ไม่ให้ล็อกอินด้วยเหตุผลที่เราไม่รู้จัก
    //     บอกต่อฝั่งคอนโซลเสมอ ไม่งั้นหาสาเหตุไม่ได้
    console.error('firebase/Google sign-in error:', e);

    // 🛟 คอมบางเครื่องก็บล็อก popup → ลอง redirect รอบสอง
    const code = errorCode(e);
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      try {
        await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
        return new Promise<FirebaseAccount>(() => {});
      } catch (e2) {
        console.error('firebase/redirect fallback error:', e2);
        throw new Error(thaiError(errorCode(e2)));
      }
    }

    const msg = thaiError(code);
    // 🌐 "Failed to fetch" = ต่อไปยัง Firebase/Google ไม่สำคั ๆ (เน็ตหลุด/ไฟเวอร์วอลบล็อก)
    //    แสดงเป็นไทยให้ผู้ใช้เข้าใจว่าไม่ใช่บัญชีผิด
    if (
      msg === 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่' &&
      e instanceof TypeError &&
      /Failed to fetch|NetworkError|network/i.test(e instanceof Error ? e.message : '')
    ) {
      throw new Error(
        'ต่อเน็ตยัง Google ไม่ได้ตอนนี้ ลองกดอีกครั้ง หรือลองเปลี่ยน Wi-Fi/ใช้เน็ตมือถือ',
      );
    }
    if (msg !== 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่') throw new Error(msg);
    throw new Error('เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่');
  }
}

