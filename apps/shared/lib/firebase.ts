import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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
            throw e instanceof Error
              ? e.message
              : 'โหลดค่าตั้ง Firebase ไม่สำเร็จ';
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
  }
  return authInstance;
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
    case 'auth/operation-not-allowed':
      return 'ยังไม่ได้เปิดวิธีนี้ใน Firebase (ต้องเปิด Email/Password หรือ Google)';
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

export async function signInWithGoogle(): Promise<FirebaseAccount> {
  const auth = await getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await signInWithPopup(auth, provider);
    const email = cred.user.email || '';
    if (!email) throw new Error('บัญชี Google นี้ไม่มีอีเมล ใช้บัญชีอื่นแทน');
    return {
      idToken: await cred.user.getIdToken(),
      email,
      name: cred.user.displayName || '',
    };
  } catch (e) {
    const msg = thaiError(errorCode(e));
    if (msg !== 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่') throw new Error(msg);
    throw new Error('เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่');
  }
}

