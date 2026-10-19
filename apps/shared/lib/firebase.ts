import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';

/**
 * Firebase Authentication
 *
 * หน้าที่ของไฟล์นี้: จัดการการเข้าสู่ระบบทั้ง 2 แบบ
 *   1. อีเมล + รหัสผ่าน
 *   2. ปุ่ม "เข้าสู่ระบบด้วย Google"
 *
 * Firebase จัดการรหัสผ่านให้ (เก็บแบบเข้ารหัส)
 * เว็บไม่เก็บรหัสผ่านไว้ที่ใดเลย
 *
 * หลังจากเข้าสู่ระบบสำเร็จ จะได้ ID Token มาส่งให้ Apps Script
 * ตรวจสอบต่อ (ดู auth.tsx และ lib/api.ts)
 */

// ค่าจากไฟล์ .env.local (หรือ Environment variables ของ Cloudflare Pages)
// ดูตัวอย่างใน .env.example
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** ตั้งค่าครบไหม — ถ้าไม่ครบจะแสดงคำอธิบายแทนหน้าล็อกอิน */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

let authInstance: ReturnType<typeof getAuth> | null = null;

function getFirebaseAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error('ยังไม่ได้ตั้งค่า Firebase บนเว็บนี้');
  }
  if (!authInstance) {
    // เรียกได้หลายครั้งโดยไม่ error (Fast Refresh / หลาย entry)
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
  }
  return authInstance;
}

/** ดึงรหัส error ของ Firebase ออกมาแบบไม่พังเมื่อ error เป็นชนิดอื่น */
function errorCode(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    return String((e as { code: unknown }).code || '');
  }
  return '';
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
    default:
      return 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
  }
}

export interface FirebaseAccount {
  idToken: string;
  email: string;
  name: string;
  isNew: boolean;
}

/** สมัครด้วยอีเมล + รหัสผ่าน */
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
): Promise<FirebaseAccount> {
  const auth = getFirebaseAuth();
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    return {
      idToken: await cred.user.getIdToken(),
      email: cred.user.email || email.trim(),
      name: name.trim() || cred.user.displayName || '',
      isNew: true,
    };
  } catch (e) {
    throw new Error(thaiError(errorCode(e)));
  }
}

/** เข้าสู่ระบบด้วยอีเมล + รหัสผ่าน */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<FirebaseAccount> {
  const auth = getFirebaseAuth();
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return {
      idToken: await cred.user.getIdToken(),
      email: cred.user.email || email.trim(),
      name: cred.user.displayName || '',
      isNew: false,
    };
  } catch (e) {
    throw new Error(thaiError(errorCode(e)));
  }
}

/** เข้าสู่ระบบด้วย Google (เปิดหน้าต่างป็อปอัพ) */
export async function signInWithGoogle(): Promise<FirebaseAccount> {
  const auth = getFirebaseAuth();
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
      isNew: false, // ให้เซิร์ฟเวอร์เป็นผู้ตัดสินว่าบัญชีนี้ใหม่หรือไม่
    };
  } catch (e) {
    const msg = thaiError(errorCode(e));
    if (msg !== 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่') {
      throw new Error(msg);
    }
    throw new Error('เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่');
  }
}

/** ส่งอีเมลให้ตั้งรหัสผ่านใหม่ */
export async function requestPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (e) {
    throw new Error(thaiError(errorCode(e)));
  }
}