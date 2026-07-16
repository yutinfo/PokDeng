import { db, F, uid, serverNow } from './firebase.js';

export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const START_CHIPS = 1000;
const MAX_PLAYERS = 9;
const STALE_ROOM_MS = 24 * 60 * 60 * 1000;

function randomCode() {
  let code = ''; const bytes = new Uint32Array(6);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) code += ROOM_CODE_CHARS[byte % ROOM_CODE_CHARS.length];
  return code;
}
export function normalizeCode(raw) { return (raw || '').trim().toUpperCase(); }
function playerEntry({ name, avatar }) {
  const now = serverNow();
  return { name: name.slice(0, 12), avatar, chips: START_CHIPS, online: true, lastSeen: now, joinedAt: now, rebuys: 0, joinedRound: 1 };
}
export async function createRoom(profile) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(); const roomRef = F.ref(db, `rooms/${code}`);
    if ((await F.get(F.child(roomRef, 'meta'))).exists()) continue;
    await F.update(roomRef, {
      meta: { createdAt: serverNow(), hostUid: uid(), state: 'lobby', round: 0, minBet: 10, maxBet: 200, autoBet: 0, turnUid: null, turnOrder: null, turnDeadline: null },
      [`players/${uid()}`]: playerEntry(profile),
    });
    return code;
  }
  throw Object.assign(new Error('สุ่มรหัสห้องไม่สำเร็จ'), { reason: 'code-collision' });
}
export async function joinRoom(code, { name, avatar }) {
  const roomRef = F.ref(db, `rooms/${code}`);
  const [metaSnap, playersSnap] = await Promise.all([F.get(F.child(roomRef, 'meta')), F.get(F.child(roomRef, 'players'))]);
  if (!metaSnap.exists()) throw Object.assign(new Error('ไม่พบห้องนี้'), { reason: 'not-found' });
  const meta = metaSnap.val(); const players = playersSnap.val() || {};
  const existing = players[uid()];
  const allStale = Object.keys(players).length > 0 && Object.values(players).every((player) => serverNow() - (player.lastSeen || 0) > STALE_ROOM_MS);
  if (!existing && allStale) {
    await F.update(F.child(roomRef, 'meta'), { hostUid: uid(), state: 'lobby', round: 0, turnDeadline: null });
    await Promise.all([F.remove(F.child(roomRef, 'players')), F.remove(F.child(roomRef, 'rounds'))]);
    await F.set(F.child(roomRef, `players/${uid()}`), playerEntry({ name, avatar }));
    return;
  }
  if (!existing && Object.keys(players).length >= MAX_PLAYERS) throw Object.assign(new Error('ห้องเต็ม (9 คน)'), { reason: 'full' });
  if (existing) {
    await F.update(F.child(roomRef, `players/${uid()}`), { name: name.slice(0, 12), avatar, online: true, lastSeen: serverNow() });
    return;
  }
  const entry = playerEntry({ name, avatar });
  entry.joinedRound = meta.state === 'lobby' ? 1 : meta.state === 'betting' ? meta.round : meta.round + 1;
  await F.set(F.child(roomRef, `players/${uid()}`), entry);
}
let presenceTimer = null;
export function startPresence(code) {
  stopPresence();
  const me = F.ref(db, `rooms/${code}/players/${uid()}`);
  const beat = () => F.update(me, { online: true, lastSeen: serverNow() }).catch(() => {});
  beat(); F.onDisconnect(me).update({ online: false }); presenceTimer = setInterval(beat, 25000);
}
export function stopPresence() { if (presenceTimer) clearInterval(presenceTimer); presenceTimer = null; }
