import { renderCard } from './cards.js';
const $ = (selector) => document.querySelector(selector);
let actionHandler = () => {};
export function onAction(handler) { actionHandler = handler; }
export function toast(message) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = message; $('#toasts').append(el); setTimeout(() => el.remove(), 2500); }
export function setStatus(text) { $('#table-status').textContent = text; }
export function showSummary(html) { const modal = $('#modal-summary'); modal.innerHTML = `<div class="modal-card">${html}</div>`; modal.classList.remove('hidden'); modal.onclick = (event) => { if (event.target === modal) hideModals(); }; }
export function hideModals() { $('#modal-summary').classList.add('hidden'); $('#modal-settings').classList.add('hidden'); }
function button(label, action, payload = null, klass = 'btn-secondary') { const el = document.createElement('button'); el.className = klass; el.textContent = label; el.onclick = () => actionHandler(action, payload); return el; }
const LABEL = { lobby:'ล็อบบี้ — รอเจ้ามือเริ่มเกม', betting:'วางเดิมพันได้เลย!', dealing:'กำลังแจกไพ่…', acting:'ผู้เล่นเลือก จั่ว หรือ อยู่', dealerTurn:'ตาเจ้ามือตัดสินใจ', reveal:'เปิดไพ่!', settled:'จบรอบ — ดูผลได้เลย' };
let animRound = -1; const dealt = new Set(); const flipped = new Set();
function seatCards(S, playerId) {
  const wrap = document.createElement('div'); wrap.className = 'cards';
  const isMe = playerId === S.uid; const visible = isMe || ['reveal','settled'].includes(S.meta.state) || S.revealed[playerId];
  const cards = S.hands[playerId]; const count = cards ? cards.length : (S.handCounts[playerId] || 0);
  for (let index = 0; index < count; index++) {
    const card = visible && cards ? cards[index] : null; const key = `${S.meta.round}:${playerId}:${index}`; const size = isMe ? 'lg' : 'md'; let el;
    if (card && dealt.has(key) && !flipped.has(key)) { flipped.add(key); el = renderCard(card, { size, faceUp:false }); el.querySelector('.cfinner').style.transitionDelay = `${index * .15}s`; requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('faceup'))); }
    else { el = renderCard(card, { size, faceUp:Boolean(card) }); if (card) flipped.add(key); }
    if (!dealt.has(key)) { dealt.add(key); el.classList.add('deal-in'); el.style.animationDelay = `${index * .12}s`; }
    wrap.append(el);
  }
  return wrap;
}
function seat(S, playerId, dealer = false) {
  const player = S.players[playerId]; const el = document.createElement('div'); el.className = `seat${dealer ? ' dealer-seat' : ''}`; el.dataset.pid = playerId;
  if (playerId === S.uid) el.classList.add('me'); if (!player.online) el.classList.add('offline');
  const result = S.results[playerId]; if (['reveal','settled'].includes(S.meta.state) && result?.delta) el.classList.add(result.delta > 0 ? 'result-win' : 'result-lose');
  el.append(seatCards(S, playerId));
  const who = document.createElement('div'); who.className = 'who'; who.innerHTML = `<span class="av">${dealer ? '🎩' : player.avatar}</span> ${player.name}${playerId === S.uid ? ' (คุณ)' : ''}`; el.append(who);
  const chips = document.createElement('div'); chips.className = `chips${player.chips < 0 ? ' neg' : ''}`; chips.textContent = `💰 ${player.chips.toLocaleString()}`; el.append(chips);
  if (!dealer && S.bets[playerId] != null && S.meta.state !== 'lobby') { const bet = document.createElement('div'); bet.className = 'bet'; bet.textContent = `🔵 เดิมพัน ${S.bets[playerId]}`; el.append(bet); }
  const badge = document.createElement('div');
  if (S.revealed[playerId] && ['dealing','acting','dealerTurn'].includes(S.meta.state)) badge.innerHTML = '<span class="badge pok">ป๊อก!</span>';
  else if (S.meta.state === 'acting' && !dealer && S.bets[playerId] != null && !S.revealed[playerId]) badge.innerHTML = S.actions[playerId] ? `<span class="badge">${S.actions[playerId] === 'hit' ? 'จั่วแล้ว' : 'อยู่'}</span>` : '<span class="badge">กำลังคิด…</span>';
  else if (['reveal','settled'].includes(S.meta.state) && result) { const cls = result.delta > 0 ? 'win' : result.delta < 0 ? 'lose' : 'draw'; const delta = result.delta > 0 ? `+${result.delta}` : result.delta || 'เสมอ'; badge.innerHTML = `<span class="badge ${cls}">${result.rankName}${result.deng > 1 ? ` ×${result.deng}` : ''} · ${delta}</span>`; }
  else if (!dealer && S.meta.round > 0 && player.joinedRound > S.meta.round) badge.innerHTML = '<span class="badge">รอรอบหน้า</span>';
  if (badge.innerHTML) el.append(badge); return el;
}
function renderActions(S) {
  const bar = $('#action-bar'); bar.innerHTML = ''; const state = S.meta.state; const me = S.players[S.uid]; if (!me) return;
  if (S.amHost) {
    if (state === 'lobby' || state === 'settled') { bar.append(button(state === 'lobby' ? '▶️ เริ่มเกม' : '▶️ รอบต่อไป', state === 'lobby' ? 'start-betting' : 'next-round', null, 'btn-primary'), button('⚙️ ตั้งค่า','open-settings'), button('🎩 ส่งต่อเจ้ามือ','transfer-host')); if (state === 'settled') bar.append(button('🏠 กลับล็อบบี้','to-lobby')); }
    else if (state === 'betting') { const deal = button(`🃏 แจกไพ่ (${Object.keys(S.bets).length} คนวางแล้ว)`,'deal',null,'btn-primary'); deal.disabled = !Object.keys(S.bets).length; bar.append(deal); }
    else if (state === 'dealerTurn') bar.append(button('🃏 จั่ว','dealer-hit',null,'btn-primary'),button('✋ อยู่','dealer-stay'));
  } else if (state === 'betting' && S.amParticipant && S.bets[S.uid] == null) {
    const controls = document.createElement('div'); controls.className='bet-controls'; const input=document.createElement('input'); input.type='number'; input.min=S.meta.minBet; input.max=Math.min(S.meta.maxBet,me.chips); input.value=Math.min(S.meta.minBet*2,me.chips);
    for (const amount of [10,20,50,100]) if (amount >= S.meta.minBet && amount <= Math.min(S.meta.maxBet,me.chips)) { const preset=button(String(amount),'noop'); preset.onclick=()=>{input.value=amount;}; controls.append(preset); }
    const place=button('วางเดิมพัน 🔵','bet',null,'btn-primary'); place.onclick=()=>actionHandler('bet',Number(input.value)); controls.append(input,place); bar.append(controls);
  } else if (state === 'acting' && S.bets[S.uid] != null && !S.revealed[S.uid] && !S.actions[S.uid]) bar.append(button('🃏 จั่ว','hit',null,'btn-primary'),button('✋ อยู่','stay'));
  if (me.chips < S.meta.minBet && ['lobby','betting','settled'].includes(state)) bar.append(button('➕ เติมชิป 1,000','rebuy'));
  if (!S.amHost && S.hostStale) bar.append(button('🎩 รับเป็นเจ้ามือแทน','claim-host',null,'btn-primary'));
}
export function renderAll(S) { if (S.meta.round !== animRound) { animRound=S.meta.round; dealt.clear(); flipped.clear(); } setStatus(LABEL[S.meta.state] || S.meta.state); const dealer=$('#dealer-zone'); dealer.innerHTML=''; if (S.players[S.meta.hostUid]) dealer.append(seat(S,S.meta.hostUid,true)); const seats=$('#seats'); seats.innerHTML=''; Object.keys(S.players).filter((id)=>id!==S.meta.hostUid).sort((a,b)=>(S.players[a].joinedAt||0)-(S.players[b].joinedAt||0)).forEach((id)=>seats.append(seat(S,id,false))); renderActions(S); }
export function updateTimer(left,total) { const ring=$('#timer-ring'); if (left==null) {ring.classList.add('hidden');return;} ring.classList.remove('hidden'); ring.style.setProperty('--pct',`${Math.max(0,Math.min(100,left/total*100))}%`); $('#timer-num').textContent=String(Math.ceil(left/1000)); }
export function showSettings(S) { const m=$('#modal-settings'); m.innerHTML=`<div class="modal-card"><h2>⚙️ ตั้งค่าห้อง</h2><label class="mlabel">เดิมพันขั้นต่ำ <input id="set-min" type="number" min="1" value="${S.meta.minBet}"></label><label class="mlabel">เดิมพันสูงสุด <input id="set-max" type="number" min="1" value="${S.meta.maxBet}"></label><div class="mrow"><button class="btn-primary" id="set-save">บันทึก</button><button class="btn-secondary" id="set-cancel">ยกเลิก</button></div></div>`;m.classList.remove('hidden');m.querySelector('#set-save').onclick=()=>{actionHandler('save-settings',{minBet:Number(m.querySelector('#set-min').value),maxBet:Number(m.querySelector('#set-max').value)});hideModals();};m.querySelector('#set-cancel').onclick=hideModals; }
export function showTransfer(S) { const m=$('#modal-settings'); const candidates=Object.keys(S.players).filter((id)=>id!==S.meta.hostUid&&S.players[id].online); m.innerHTML=`<div class="modal-card"><h2>🎩 ส่งต่อบทเจ้ามือให้…</h2><div class="mcol">${candidates.map((id)=>`<button class="btn-secondary mwide" data-pid="${id}">${S.players[id].avatar} ${S.players[id].name}</button>`).join('') || '<p>ไม่มีผู้เล่นออนไลน์ให้ส่งต่อ</p>'}</div><div class="mrow"><button class="btn-secondary" id="tr-cancel">ยกเลิก</button></div></div>`;m.classList.remove('hidden');m.querySelectorAll('[data-pid]').forEach((b)=>b.onclick=()=>{actionHandler('transfer-host-to',b.dataset.pid);hideModals();});m.querySelector('#tr-cancel').onclick=hideModals; }
let soundOn=localStorage.getItem('pd_sound')!=='0';let audio;function beep(freq,duration=.08,delay=0,type='triangle',volume=.05){if(!soundOn)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+duration+.02);}catch{}}
export function sfx(name){if(name==='deal'){beep(520,.05);beep(520,.05,.12);}else if(name==='flip')beep(700,.07);else if(name==='win'){beep(523,.1);beep(659,.1,.12);beep(784,.18,.24);}else if(name==='lose')beep(180,.25,0,'sawtooth',.04);else if(name==='pok'){beep(880,.09);beep(1175,.14,.1);}}
export function initSoundButton(){const b=$('#btn-sound');b.textContent=soundOn?'🔊':'🔇';b.onclick=()=>{soundOn=!soundOn;localStorage.setItem('pd_sound',soundOn?'1':'0');b.textContent=soundOn?'🔊':'🔇';};}export function initReactions(){const bar=$('#reaction-bar');bar.innerHTML='';for(const emoji of ['👍','😂','😭','🔥','😱','🎉']){const b=document.createElement('button');b.textContent=emoji;b.onclick=()=>actionHandler('react',emoji);bar.append(b);}}export function floatReaction(pid,emoji){const a=document.querySelector(`.seat[data-pid="${pid}"]`)||$('#table-center'),f=document.createElement('div');f.className='float-emoji';f.textContent=emoji;a.append(f);setTimeout(()=>f.remove(),1900);}
