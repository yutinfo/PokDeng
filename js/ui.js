import { renderCard } from './cards.js';
import { evaluate, CATEGORY } from './pokdeng.js';

const $ = (selector) => document.querySelector(selector);

let actionHandler = () => {};
export function onAction(handler) { actionHandler = handler; }

/* ===== primitives ===== */

export function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 2500);
}

function button(label, action, payload = null, klass = 'btn-secondary') {
  const el = document.createElement('button');
  el.className = klass;
  el.textContent = label;
  el.onclick = () => actionHandler(action, payload);
  return el;
}

function hint(text) {
  const el = document.createElement('span');
  el.className = 'dock-hint';
  el.textContent = text;
  return el;
}

export function hideModals() {
  $('#modal-summary').classList.add('hidden');
  $('#modal-settings').classList.add('hidden');
}

export function showSummary(html) {
  const modal = $('#modal-summary');
  modal.innerHTML = `<div class="modal-card">${html}</div>`;
  modal.querySelectorAll('[data-action]').forEach((el) => {
    el.onclick = () => actionHandler(el.dataset.action);
  });
  modal.classList.remove('hidden');
  modal.onclick = (event) => { if (event.target === modal) hideModals(); };
}

/* ===== แถบสถานะกลางโต๊ะ ===== */

const LABEL = {
  lobby: 'ล็อบบี้ — รอเจ้ามือเริ่มเกม',
  betting: 'วางเดิมพันได้เลย!',
  dealing: 'กำลังแจกไพ่…',
  acting: 'ผู้เล่นเลือก จั่ว หรือ อยู่',
  dealerTurn: 'ตาเจ้ามือตัดสินใจ',
  reveal: 'เปิดไพ่!',
  settled: 'จบรอบ — ดูผลได้เลย',
};

export function setStatus(text) { $('#table-status').textContent = text; }

function statusText(S) {
  const label = LABEL[S.meta.state] || S.meta.state;
  if (S.meta.state === 'lobby') return label;
  const pot = Object.values(S.bets).reduce((sum, bet) => sum + bet, 0);
  const parts = [`รอบ ${S.meta.round}`, label];
  if (pot > 0) parts.push(`กองกลาง 🔵 ${pot.toLocaleString()}`);
  return parts.join(' · ');
}

/* ===== ไพ่บนโต๊ะ (พร้อม animation แจก/พลิก กันเล่นซ้ำด้วย key) ===== */

let animRound = -1;
const dealt = new Set();
const flipped = new Set();

function visibleCards(S, playerId) {
  const isMe = playerId === S.uid;
  const canSee = isMe || ['reveal', 'settled'].includes(S.meta.state) || S.revealed[playerId];
  const cards = canSee ? S.hands[playerId] : null;
  const count = S.hands[playerId]?.length ?? S.handCounts[playerId] ?? 0;
  return { cards, count };
}

function handCards(S, playerId, size) {
  const wrap = document.createElement('div');
  wrap.className = 'cards';
  const { cards, count } = visibleCards(S, playerId);
  for (let index = 0; index < count; index++) {
    const card = cards ? cards[index] : null;
    const key = `${S.meta.round}:${playerId}:${index}`;
    let el;
    if (card && dealt.has(key) && !flipped.has(key)) {
      // เคยเห็นเป็นหลังไพ่มาก่อน → สร้างคว่ำแล้วสั่งเปิด ให้ CSS เล่น flip 3D
      flipped.add(key);
      el = renderCard(card, { size, faceUp: false });
      el.querySelector('.cfinner').style.transitionDelay = `${index * .15}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('faceup')));
    } else {
      el = renderCard(card, { size, faceUp: Boolean(card) });
      if (card) flipped.add(key);
    }
    if (!dealt.has(key)) {
      dealt.add(key);
      el.classList.add('deal-in');
      el.style.animationDelay = `${index * .12}s`;
    }
    wrap.append(el);
  }
  return wrap;
}

/* ===== ป้ายแต้ม — คำนวณสดจากไพ่ที่มองเห็น ไม่ต้องรอผลจากเจ้ามือ ===== */

function pointsPill(cards) {
  if (!cards || cards.length < 2 || cards.length > 3) return null;
  const hand = evaluate(cards);
  const el = document.createElement('span');
  const isPok = hand.category === CATEGORY.POK8 || hand.category === CATEGORY.POK9;
  el.className = `pill-points${isPok ? ' pok' : ''}`;
  el.textContent = `${hand.rankName}${hand.deng > 1 ? ` ×${hand.deng}` : ''}`;
  return el;
}

function resultBadge(result) {
  const cls = result.delta > 0 ? 'win' : result.delta < 0 ? 'lose' : 'draw';
  const delta = result.delta > 0 ? `+${result.delta}` : result.delta || 'เสมอ';
  const el = document.createElement('span');
  el.className = `badge ${cls}`;
  el.textContent = `${result.rankName}${result.deng > 1 ? ` ×${result.deng}` : ''} · ${delta}`;
  return el;
}

/* ===== ที่นั่งคู่แข่ง (ทุกคนที่ไม่ใช่เรา) ===== */

function seatBadges(S, playerId, isDealer) {
  const wrap = document.createElement('div');
  wrap.className = 'badges';
  const state = S.meta.state;
  const player = S.players[playerId];
  const result = S.results[playerId];

  if (S.revealed[playerId] && ['dealing', 'acting', 'dealerTurn'].includes(state)) {
    const pok = document.createElement('span');
    pok.className = 'badge pok';
    pok.textContent = 'ป๊อก!';
    wrap.append(pok);
    const pill = pointsPill(S.hands[playerId]);
    if (pill) wrap.append(pill);
  } else if (state === 'acting' && !isDealer && S.bets[playerId] != null) {
    const el = document.createElement('span');
    el.className = 'badge';
    el.textContent = S.actions[playerId] ? (S.actions[playerId] === 'hit' ? 'จั่วแล้ว' : 'อยู่') : 'กำลังคิด…';
    wrap.append(el);
  } else if (['reveal', 'settled'].includes(state)) {
    if (result) wrap.append(resultBadge(result));
    else {
      const pill = pointsPill(S.hands[playerId]);
      if (pill) wrap.append(pill);
    }
  } else if (!isDealer && S.meta.round > 0 && player.joinedRound > S.meta.round) {
    const el = document.createElement('span');
    el.className = 'badge';
    el.textContent = 'รอรอบหน้า';
    wrap.append(el);
  }
  return wrap.childNodes.length ? wrap : null;
}

function opponentSeat(S, playerId) {
  const player = S.players[playerId];
  const isDealer = playerId === S.meta.hostUid;
  const el = document.createElement('div');
  el.className = `seat${isDealer ? ' dealer-seat' : ''}`;
  el.dataset.pid = playerId;
  if (!player.online) el.classList.add('offline');
  const result = S.results[playerId];
  if (['reveal', 'settled'].includes(S.meta.state) && result?.delta) {
    el.classList.add(result.delta > 0 ? 'result-win' : 'result-lose');
  }

  el.append(handCards(S, playerId, 'md'));

  const who = document.createElement('div');
  who.className = 'who';
  who.innerHTML = `<span class="av">${isDealer ? '🎩' : player.avatar}</span> ${player.name}`;
  el.append(who);

  const chips = document.createElement('div');
  chips.className = `chips${player.chips < 0 ? ' neg' : ''}`;
  chips.textContent = `💰 ${player.chips.toLocaleString()}`;
  el.append(chips);

  if (!isDealer && S.bets[playerId] != null && S.meta.state !== 'lobby') {
    const bet = document.createElement('div');
    bet.className = 'bet';
    bet.textContent = `🔵 เดิมพัน ${S.bets[playerId]}`;
    el.append(bet);
  }

  const badges = seatBadges(S, playerId, isDealer);
  if (badges) el.append(badges);
  return el;
}

function ghostSeat() {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'seat ghost';
  el.setAttribute('aria-label', 'ก็อปลิงก์ชวนเพื่อนเข้าห้อง');
  el.innerHTML = '<span class="ghost-icon">🪑</span><span>ที่นั่งว่าง<br>แตะเพื่อชวนเพื่อน 📋</span>';
  el.onclick = () => actionHandler('invite');
  return el;
}

const MAX_PLAYERS = 9;

function renderOpponents(S) {
  const zone = $('#opponents');
  zone.innerHTML = '';
  const order = Object.keys(S.players)
    .filter((id) => id !== S.uid)
    .sort((a, b) => {
      if (a === S.meta.hostUid) return -1;
      if (b === S.meta.hostUid) return 1;
      return (S.players[a].joinedAt || 0) - (S.players[b].joinedAt || 0);
    });
  for (const id of order) zone.append(opponentSeat(S, id));
  if (['lobby', 'betting'].includes(S.meta.state)) {
    const free = MAX_PLAYERS - Object.keys(S.players).length;
    for (let i = 0; i < Math.min(2, free); i++) zone.append(ghostSeat());
  }
}

/* ===== dock ของเรา: ไพ่ + ข้อมูล + ปุ่มตัดสินใจ ===== */

function myTurn(S) {
  const state = S.meta.state;
  if (S.amHost) {
    return state === 'dealerTurn' || (state === 'betting' && Object.keys(S.bets).length > 0);
  }
  if (state === 'betting') return S.amParticipant && S.bets[S.uid] == null;
  if (state === 'acting') return S.bets[S.uid] != null && !S.revealed[S.uid] && !S.actions[S.uid];
  return false;
}

function dockActions(S) {
  const wrap = document.createElement('div');
  wrap.className = 'dock-actions';
  const state = S.meta.state;
  const me = S.players[S.uid];

  if (S.amHost) {
    if (state === 'lobby' || state === 'settled') {
      wrap.append(button(state === 'lobby' ? '▶️ เริ่มเกม' : '▶️ รอบต่อไป', state === 'lobby' ? 'start-betting' : 'next-round', null, 'btn-primary'));
      if (state === 'settled') wrap.append(button('🏠 กลับล็อบบี้', 'to-lobby'));
      wrap.append(button('⚙️ ตั้งค่า', 'open-settings'), button('🎩 ส่งต่อเจ้ามือ', 'transfer-host'));
    } else if (state === 'betting') {
      const count = Object.keys(S.bets).length;
      const deal = button(`🃏 แจกไพ่ (${count} คนวางแล้ว)`, 'deal', null, 'btn-primary');
      deal.disabled = !count;
      wrap.append(deal);
      if (!count) wrap.append(hint('รอผู้เล่นวางเดิมพัน…'));
    } else if (state === 'dealerTurn') {
      wrap.append(button('🃏 จั่ว', 'dealer-hit', null, 'btn-primary'), button('✋ อยู่', 'dealer-stay'));
    } else if (state === 'acting') {
      wrap.append(hint('รอผู้เล่นตัดสินใจ…'));
    } else if (state === 'dealing' || state === 'reveal') {
      wrap.append(hint(state === 'dealing' ? 'กำลังแจกไพ่…' : 'เปิดไพ่…'));
    }
  } else if (state === 'betting') {
    if (!S.amParticipant) {
      wrap.append(hint('คุณเพิ่งเข้าห้อง — ร่วมเล่นได้รอบถัดไป'));
    } else if (S.bets[S.uid] == null) {
      const controls = document.createElement('div');
      controls.className = 'bet-controls';
      const input = document.createElement('input');
      input.type = 'number';
      input.min = S.meta.minBet;
      input.max = Math.min(S.meta.maxBet, me.chips);
      input.value = Math.min(S.meta.minBet * 2, me.chips);
      input.setAttribute('aria-label', 'จำนวนเดิมพัน');
      for (const amount of [10, 20, 50, 100]) {
        if (amount >= S.meta.minBet && amount <= Math.min(S.meta.maxBet, me.chips)) {
          const preset = button(String(amount), 'noop');
          preset.onclick = () => { input.value = amount; };
          controls.append(preset);
        }
      }
      const place = button('วางเดิมพัน 🔵', 'bet', null, 'btn-primary');
      place.onclick = () => actionHandler('bet', Number(input.value));
      controls.append(input, place);
      wrap.append(controls);
    } else {
      wrap.append(hint('วางเดิมพันแล้ว — รอเจ้ามือแจกไพ่…'));
    }
  } else if (state === 'acting') {
    if (S.revealed[S.uid]) wrap.append(hint('คุณป๊อก! รอเปิดไพ่ 🎉'));
    else if (S.bets[S.uid] == null) wrap.append(hint('คุณไม่ได้เล่นรอบนี้'));
    else if (S.actions[S.uid]) wrap.append(hint('รอคนอื่นตัดสินใจ…'));
    else wrap.append(button('🃏 จั่ว', 'hit', null, 'btn-primary'), button('✋ อยู่', 'stay'));
  } else if (state === 'lobby') {
    wrap.append(hint('รอเจ้ามือเริ่มเกม…'));
  } else if (state === 'dealerTurn') {
    wrap.append(hint('ตาเจ้ามือตัดสินใจ…'));
  } else if (state === 'dealing' || state === 'reveal') {
    wrap.append(hint(state === 'dealing' ? 'กำลังแจกไพ่…' : 'เปิดไพ่…'));
  } else if (state === 'settled') {
    wrap.append(hint('รอเจ้ามือเริ่มรอบต่อไป'));
  }

  if (me.chips < S.meta.minBet && ['lobby', 'betting', 'settled'].includes(state)) {
    wrap.append(button('➕ เติมชิป 1,000', 'rebuy'));
  }
  if (!S.amHost && S.hostStale) {
    wrap.append(button('🎩 รับเป็นเจ้ามือแทน', 'claim-host', null, 'btn-primary'));
  }
  return wrap;
}

function renderDock(S) {
  const dock = $('#my-dock');
  const me = S.players[S.uid];
  if (!me) { dock.classList.add('hidden'); return; }
  dock.classList.remove('hidden');
  dock.innerHTML = '';
  dock.dataset.pid = S.uid;
  dock.className = '';
  if (myTurn(S)) dock.classList.add('my-turn');
  const result = S.results[S.uid];
  if (['reveal', 'settled'].includes(S.meta.state) && result?.delta) {
    dock.classList.add(result.delta > 0 ? 'result-win' : 'result-lose');
  }

  dock.append(handCards(S, S.uid, 'lg'));

  const info = document.createElement('div');
  info.className = 'dock-info';
  const who = document.createElement('div');
  who.className = 'who';
  who.innerHTML = `<span class="av">${me.avatar}</span> ${me.name}${S.amHost ? ' <span class="dealer-tag">🎩 เจ้ามือ</span>' : ''}`;
  info.append(who);
  const chips = document.createElement('div');
  chips.className = `chips${me.chips < 0 ? ' neg' : ''}`;
  chips.textContent = `💰 ${me.chips.toLocaleString()}`;
  info.append(chips);
  if (!S.amHost && S.bets[S.uid] != null && S.meta.state !== 'lobby') {
    const bet = document.createElement('div');
    bet.className = 'bet';
    bet.textContent = `🔵 เดิมพัน ${S.bets[S.uid]}`;
    info.append(bet);
  }
  const badges = document.createElement('div');
  badges.className = 'badges';
  if (['reveal', 'settled'].includes(S.meta.state) && result) {
    badges.append(resultBadge(result));
  } else {
    if (S.revealed[S.uid] && ['dealing', 'acting', 'dealerTurn'].includes(S.meta.state)) {
      const pok = document.createElement('span');
      pok.className = 'badge pok';
      pok.textContent = 'ป๊อก!';
      badges.append(pok);
    }
    const pill = pointsPill(S.hands[S.uid]);
    if (pill) badges.append(pill);
  }
  if (badges.childNodes.length) info.append(badges);
  dock.append(info);

  dock.append(dockActions(S));
}

/* ===== จุดเข้า render หลัก ===== */

export function renderAll(S) {
  if (S.meta.round !== animRound) {
    animRound = S.meta.round;
    dealt.clear();
    flipped.clear();
  }
  setStatus(statusText(S));
  renderOpponents(S);
  renderDock(S);
}

export function updateTimer(left, total) {
  const ring = $('#timer-ring');
  if (left == null) { ring.classList.add('hidden'); return; }
  ring.classList.remove('hidden');
  ring.style.setProperty('--pct', `${Math.max(0, Math.min(100, left / total * 100))}%`);
  $('#timer-num').textContent = String(Math.ceil(left / 1000));
}

/* ===== modals ===== */

export function showSettings(S) {
  const m = $('#modal-settings');
  m.innerHTML = `<div class="modal-card">
    <h2>⚙️ ตั้งค่าห้อง</h2>
    <label class="mlabel">เดิมพันขั้นต่ำ <input id="set-min" type="number" min="1" value="${S.meta.minBet}"></label>
    <label class="mlabel">เดิมพันสูงสุด <input id="set-max" type="number" min="1" value="${S.meta.maxBet}"></label>
    <div class="mrow">
      <button class="btn-primary" id="set-save">บันทึก</button>
      <button class="btn-secondary" id="set-cancel">ยกเลิก</button>
    </div>
  </div>`;
  m.classList.remove('hidden');
  m.querySelector('#set-save').onclick = () => {
    actionHandler('save-settings', {
      minBet: Number(m.querySelector('#set-min').value),
      maxBet: Number(m.querySelector('#set-max').value),
    });
    hideModals();
  };
  m.querySelector('#set-cancel').onclick = hideModals;
  m.onclick = (event) => { if (event.target === m) hideModals(); };
}

export function showTransfer(S) {
  const m = $('#modal-settings');
  const candidates = Object.keys(S.players).filter((id) => id !== S.meta.hostUid && S.players[id].online);
  const list = candidates
    .map((id) => `<button class="btn-secondary mwide" data-pid="${id}">${S.players[id].avatar} ${S.players[id].name}</button>`)
    .join('') || '<p>ไม่มีผู้เล่นออนไลน์ให้ส่งต่อ</p>';
  m.innerHTML = `<div class="modal-card">
    <h2>🎩 ส่งต่อบทเจ้ามือให้…</h2>
    <div class="mcol">${list}</div>
    <div class="mrow"><button class="btn-secondary" id="tr-cancel">ยกเลิก</button></div>
  </div>`;
  m.classList.remove('hidden');
  m.querySelectorAll('[data-pid]').forEach((b) => {
    b.onclick = () => { actionHandler('transfer-host-to', b.dataset.pid); hideModals(); };
  });
  m.querySelector('#tr-cancel').onclick = hideModals;
  m.onclick = (event) => { if (event.target === m) hideModals(); };
}

/* ===== เสียงสังเคราะห์ (ไม่มีไฟล์เสียง) ===== */

let soundOn = localStorage.getItem('pd_sound') !== '0';
let audio;

function beep(freq, duration = .08, delay = 0, type = 'triangle', volume = .05) {
  if (!soundOn) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + duration + .02);
  } catch { /* บาง browser บล็อกเสียงก่อน user gesture */ }
}

export function sfx(name) {
  if (name === 'deal') { beep(520, .05); beep(520, .05, .12); }
  else if (name === 'flip') beep(700, .07);
  else if (name === 'win') { beep(523, .1); beep(659, .1, .12); beep(784, .18, .24); }
  else if (name === 'lose') beep(180, .25, 0, 'sawtooth', .04);
  else if (name === 'pok') { beep(880, .09); beep(1175, .14, .1); }
}

export function initSoundButton() {
  const b = $('#btn-sound');
  b.textContent = soundOn ? '🔊' : '🔇';
  b.onclick = () => {
    soundOn = !soundOn;
    localStorage.setItem('pd_sound', soundOn ? '1' : '0');
    b.textContent = soundOn ? '🔊' : '🔇';
  };
}

/* ===== emoji reactions ===== */

export function initReactions() {
  const bar = $('#reaction-bar');
  bar.innerHTML = '';
  for (const emoji of ['👍', '😂', '😭', '🔥', '😱', '🎉']) {
    const b = document.createElement('button');
    b.textContent = emoji;
    b.setAttribute('aria-label', `ส่งอิโมจิ ${emoji}`);
    b.onclick = () => actionHandler('react', emoji);
    bar.append(b);
  }
}

export function floatReaction(pid, emoji) {
  const anchor = document.querySelector(`[data-pid="${pid}"]`) || $('#table-center');
  const el = document.createElement('div');
  el.className = 'float-emoji';
  el.textContent = emoji;
  anchor.append(el);
  setTimeout(() => el.remove(), 1900);
}
