import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, child, get, set, update, remove, onValue, off, onDisconnect, runTransaction, serverTimestamp, push, onChildAdded } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { firebaseConfig } from '../firebase-config.js';

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
