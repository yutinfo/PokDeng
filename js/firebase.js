import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, child, get, set, update, remove, onValue, off, onDisconnect, runTransaction, serverTimestamp, push, onChildAdded } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
// โหลด Firebase config ตามลำดับ:
// 1. firebase-config.js ในเครื่อง (ไฟล์นี้ถูก gitignore ใช้ตอน dev)
// 2. /api/config บน Vercel ซึ่งอ่านค่าจาก environment variables
async function loadFirebaseConfig() {
  try {
    const mod = await import('../firebase-config.js');
    if (mod.firebaseConfig && mod.firebaseConfig.apiKey) return mod.firebaseConfig;
  } catch (e) {
    // ไม่มีไฟล์ในเครื่อง ลองดึงจาก Vercel แทน
  }
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('โหลด Firebase config ไม่สำเร็จ (' + res.status + ')');
  const config = await res.json();
  if (!config || !config.apiKey || !config.databaseURL) {
    throw new Error('ยังไม่ได้ตั้งค่า Firebase ใน environment variables ของ Vercel');
  }
  return config;
}

const firebaseConfig = await loadFirebaseConfig();
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
const auth = getAuth(app);
export const F = { ref, child, get, set, update, remove, onValue, off, onDisconnect, runTransaction, serverTimestamp, push, onChildAdded };

let currentUid = null;
export function uid() { return currentUid; }
let authPromise;
export function authReady() {
  if (authPromise) return authPromise;
  authPromise = new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      currentUid = user.uid;
      unsubscribe();
      resolve(user.uid);
    });
    signInAnonymously(auth).catch(reject);
  });
  return authPromise;
}
let clockOffset = 0;
export function watchClock() { onValue(ref(db, '.info/serverTimeOffset'), (snap) => { clockOffset = snap.val() || 0; }); }
export function serverNow() { return Date.now() + clockOffset; }
