import { db, F, uid, serverNow } from './firebase.js';
import * as ui from './ui.js';
import { dealerTick, dealerCommand } from './dealer.js';

export const S = {
  code: null,
  uid: null,
  meta: { hostUid: null, state: 'lobby', round: 0, minBet: 10, maxBet: 200, turnDeadline: null },
  players: {},
  bets: {},
  actions: {},
  hands: {},
  handCounts: {},
  revealed: {},
  results: {},
  deck: null,
  dealerDrew: false,
  amHost: false,
  amParticipant: false,
  hostStale: false,
};

const ROUND_STATES = ['dealing', 'acting', 'dealerTurn', 'reveal', 'settled'];

let roundUnsubs = [];
let allHandsUnsub = null;
let deckUnsub = null;
let attachedRound = null;
let pokSubs = new Set();
let lastState = null;
let summaryRound = null;
let timerStarted = false;
let lastReactAt = 0;
let myPokRound = 0;

function handCounts() {
  const counts = {};
  const active = ROUND_STATES.includes(S.meta.state);
  for (const id of Object.keys(S.bets)) {
    counts[id] = S.hands[id]?.length ?? (active ? 2 + (S.actions[id] === 'hit' ? 1 : 0) : 0);
  }
  if (S.meta.hostUid) {
    counts[S.meta.hostUid] = S.hands[S.meta.hostUid]?.length ?? (active ? 2 + (S.dealerDrew ? 1 : 0) : 0);
  }
  S.handCounts = counts;
}

function recompute() {
  S.amHost = S.meta.hostUid === S.uid;
  const me = S.players[S.uid];
  S.amParticipant = Boolean(me && me.joinedRound <= S.meta.round);
  handCounts();
  if (S.revealed[S.uid] && myPokRound !== S.meta.round) {
    myPokRound = S.meta.round;
    ui.sfx('pok');
  }
  ui.renderAll(S);
  transition();
  // results มาจาก listener แยกทีหลัง state=settled — จึงต้องลองเปิดสรุปซ้ำทุก recompute
  // (มี summaryRound กันเปิดซ้ำอยู่ใน showRoundSummary แล้ว)
  if (S.meta.state === 'settled') showRoundSummary();
  dealerTick(S);
}

function transition() {
  if (S.meta.state === lastState) return;
  lastState = S.meta.state;
  if (lastState === 'dealing') ui.sfx('deal');
  if (lastState === 'reveal') ui.sfx('flip');
  if (lastState === 'settled') {
    showRoundSummary();
    const result = S.results[S.uid];
    if (result) ui.sfx(result.delta > 0 ? 'win' : result.delta < 0 ? 'lose' : 'flip');
  }
  if (lastState === 'betting') ui.hideModals();
}

function resetRound() {
  summaryRound = null;
  Object.assign(S, {
    bets: {}, actions: {}, hands: {}, handCounts: {},
    revealed: {}, results: {}, deck: null, dealerDrew: false,
  });
}

function sub(path, apply) {
  return F.onValue(
    F.ref(db, `rooms/${S.code}/${path}`),
    (snap) => { apply(snap.val()); recompute(); },
    (error) => console.warn('listener denied', path, error.code),
  );
}

function subscribePokHand(n, id) {
  if (id === S.uid) return;
  const key = `${n}:${id}`;
  if (pokSubs.has(key)) return;
  pokSubs.add(key);
  roundUnsubs.push(sub(`rounds/${n}/hands/${id}`, (value) => {
    if (value) S.hands = { ...S.hands, [id]: value };
  }));
}

function attachRound(n) {
  roundUnsubs.forEach((unsubscribe) => unsubscribe());
  roundUnsubs = [];
  if (allHandsUnsub) allHandsUnsub();
  if (deckUnsub) deckUnsub();
  allHandsUnsub = null;
  deckUnsub = null;
  attachedRound = n;
  resetRound();
  pokSubs = new Set();
  if (n < 1) return;
  roundUnsubs.push(
    sub(`rounds/${n}/bets`, (v) => { S.bets = v || {}; }),
    sub(`rounds/${n}/actions`, (v) => { S.actions = v || {}; }),
    sub(`rounds/${n}/revealed`, (v) => {
      S.revealed = v || {};
      Object.keys(S.revealed).forEach((id) => subscribePokHand(n, id));
    }),
    sub(`rounds/${n}/results`, (v) => { S.results = v || {}; }),
    sub(`rounds/${n}/dealerDrew`, (v) => { S.dealerDrew = Boolean(v); }),
    sub(`rounds/${n}/hands/${S.uid}`, (v) => {
      if (v) S.hands = { ...S.hands, [S.uid]: v };
    }),
  );
  syncPrivateListeners();
}

function syncPrivateListeners() {
  const n = attachedRound;
  if (n < 1) return;
  if ((['reveal', 'settled'].includes(S.meta.state) || S.amHost) && !allHandsUnsub) {
    allHandsUnsub = sub(`rounds/${n}/hands`, (v) => { S.hands = v || {}; });
  }
  if (S.amHost && !deckUnsub) {
    deckUnsub = sub(`rounds/${n}/deck`, (v) => { S.deck = v || []; });
  }
}

function computeHostStale() {
  const host = S.players[S.meta.hostUid];
  return Boolean(host && !S.amHost && S.meta.state !== 'lobby' && serverNow() - (host.lastSeen || 0) > 60000);
}

function startTimer() {
  if (timerStarted) return;
  timerStarted = true;
  setInterval(() => {
    const total = { acting: 30000, dealerTurn: 45000 }[S.meta.state];
    const deadline = S.meta.turnDeadline;
    ui.updateTimer(deadline && total ? Math.max(0, deadline - serverNow()) : null, total || 0);
    const stale = computeHostStale();
    if (stale !== S.hostStale) {
      S.hostStale = stale;
      ui.renderAll(S);
    }
  }, 250);
}

export function enterGame(code) {
  S.code = code;
  S.uid = uid();
  F.onValue(F.ref(db, `rooms/${code}/meta`), (snap) => {
    if (!snap.exists()) { ui.toast('ห้องถูกปิดแล้ว'); return; }
    S.meta = snap.val();
    S.amHost = S.meta.hostUid === S.uid;
    if (S.meta.round !== attachedRound) attachRound(S.meta.round);
    else syncPrivateListeners();
    recompute();
  });
  F.onValue(F.ref(db, `rooms/${code}/players`), (snap) => {
    S.players = snap.val() || {};
    recompute();
  });
  ui.onAction(handleAction);
  ui.initSoundButton();
  ui.initReactions();
  F.onChildAdded(F.ref(db, `rooms/${code}/reactions`), (snap) => {
    const reaction = snap.val();
    if (reaction && serverNow() - (reaction.ts || 0) < 10000) ui.floatReaction(reaction.uid, reaction.emoji);
  });
  startTimer();
}

function netOf(player) {
  return player.chips - 1000 * (1 + (player.rebuys || 0));
}

function showRoundSummary() {
  const host = S.meta.hostUid;
  if (!S.results[host] || summaryRound === S.meta.round) return;
  summaryRound = S.meta.round;
  const row = (id, label) => {
    const result = S.results[id];
    const player = S.players[id];
    if (!result || !player) return '';
    const sign = result.delta > 0 ? `+${result.delta}` : result.delta === 0 ? 'เสมอ' : String(result.delta);
    const net = netOf(player);
    return `<tr>
      <td>${label}</td>
      <td>${result.rankName}${result.deng > 1 ? ` ×${result.deng}` : ''}</td>
      <td class="num ${result.delta > 0 ? 'pos' : result.delta < 0 ? 'neg' : ''}">${sign}</td>
      <td class="num">${player.chips.toLocaleString()}</td>
      <td class="num ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}">${net > 0 ? '+' : ''}${net.toLocaleString()}${player.rebuys ? `<br><small>เติม ${player.rebuys} ครั้ง</small>` : ''}</td>
    </tr>`;
  };
  const rows = Object.keys(S.results)
    .filter((id) => id !== host)
    .sort((a, b) => (S.results[b]?.delta || 0) - (S.results[a]?.delta || 0))
    .map((id) => row(id, `${S.players[id]?.avatar || ''} ${S.players[id]?.name || '?'}`))
    .join('');
  const hostActions = S.amHost
    ? '<div class="mrow"><button class="btn-secondary" data-action="to-lobby">🏠 กลับล็อบบี้</button><button class="btn-primary" data-action="next-round">▶️ รอบต่อไป</button></div>'
    : '<p style="margin-top:10px;color:var(--muted);font-size:13px;">รอเจ้ามือเริ่มรอบต่อไป</p>';
  ui.showSummary(`<h2>สรุปรอบที่ ${S.meta.round} 🃏</h2>
    <table>
      <tr><th>ผู้เล่น</th><th>มือ</th><th>ได้/เสีย</th><th>ชิป</th><th>สุทธิ</th></tr>
      ${rows}
      ${row(host, `🎩 ${S.players[host]?.name || 'เจ้ามือ'}`)}
    </table>
    ${hostActions}`);
}

async function handleAction(action, payload) {
  const code = S.code;
  const n = S.meta.round;
  try {
    switch (action) {
      case 'bet': {
        const me = S.players[S.uid];
        const amount = Math.floor(Number(payload));
        const cap = Math.min(S.meta.maxBet, me.chips);
        if (!Number.isFinite(amount) || amount < S.meta.minBet || amount > cap) {
          ui.toast(`เดิมพันต้องอยู่ระหว่าง ${S.meta.minBet}–${cap}`);
          return;
        }
        if (S.bets[S.uid] != null) return;
        await F.set(F.ref(db, `rooms/${code}/rounds/${n}/bets/${S.uid}`), amount);
        break;
      }
      case 'hit':
      case 'stay':
        if (!S.actions[S.uid]) await F.set(F.ref(db, `rooms/${code}/rounds/${n}/actions/${S.uid}`), action);
        break;
      case 'rebuy':
        await F.runTransaction(F.ref(db, `rooms/${code}/players/${S.uid}`), (player) =>
          !player || player.chips >= S.meta.minBet
            ? undefined
            : { ...player, chips: player.chips + 1000, rebuys: (player.rebuys || 0) + 1 });
        ui.toast('เติมชิป +1,000 แล้ว 🎉');
        break;
      case 'open-settings':
        if (S.amHost) ui.showSettings(S);
        break;
      case 'save-settings':
        if (S.amHost) {
          const minBet = Math.max(1, Math.floor(payload.minBet));
          const maxBet = Math.max(minBet, Math.floor(payload.maxBet));
          await F.update(F.ref(db, `rooms/${code}/meta`), { minBet, maxBet });
          ui.toast(`ตั้งเดิมพัน ${minBet}–${maxBet} แล้ว`);
        }
        break;
      case 'transfer-host':
        if (S.amHost) ui.showTransfer(S);
        break;
      case 'transfer-host-to':
        if (S.amHost && ['lobby', 'settled'].includes(S.meta.state)) {
          await F.update(F.ref(db, `rooms/${code}/meta`), { hostUid: payload, state: 'lobby', turnDeadline: null });
        }
        break;
      case 'claim-host':
        if (S.hostStale) {
          await F.update(F.ref(db, `rooms/${code}/meta`), { hostUid: S.uid, state: 'lobby', turnDeadline: null });
          if (n >= 1) await F.remove(F.ref(db, `rooms/${code}/rounds/${n}`));
          ui.toast('คุณเป็นเจ้ามือแล้ว — รอบที่ค้างถูกยกเลิก');
        }
        break;
      case 'react':
        if (Date.now() - lastReactAt >= 1000) {
          lastReactAt = Date.now();
          await F.push(F.ref(db, `rooms/${code}/reactions`), { uid: S.uid, emoji: payload, ts: serverNow() });
        }
        break;
      case 'noop':
        break;
      default:
        if (S.amHost) await dealerCommand(action, payload, S);
    }
  } catch (error) {
    console.error(action, error);
    ui.toast('ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง');
  }
}
