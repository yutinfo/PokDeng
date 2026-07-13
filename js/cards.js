import { rankLabel } from './pokdeng.js';
export const FACE_EMOJI = { 11: '💂', 12: '👸', 13: '🤴' };
const SUIT_EMOJI = { s: '♠️', h: '♥️', d: '♦️', c: '♣️' };
const RED = new Set(['h', 'd']);
const PIPS = {
  2:[[2,1],[2,7]], 3:[[2,1],[2,4],[2,7]], 4:[[1,1],[3,1],[1,7],[3,7]], 5:[[1,1],[3,1],[2,4],[1,7],[3,7]],
  6:[[1,1],[3,1],[1,4],[3,4],[1,7],[3,7]], 7:[[1,1],[3,1],[2,2],[1,4],[3,4],[1,7],[3,7]],
  8:[[1,1],[3,1],[2,2],[1,4],[3,4],[2,6],[1,7],[3,7]], 9:[[1,1],[3,1],[1,3],[3,3],[2,4],[1,5],[3,5],[1,7],[3,7]],
  10:[[1,1],[3,1],[2,2],[1,3],[3,3],[1,5],[3,5],[2,6],[1,7],[3,7]],
};
function front(card) {
  const el = document.createElement('div'); el.className = 'cface cfront'; if (!card) return el;
  const suit = SUIT_EMOJI[card.s]; const color = RED.has(card.s) ? 'red' : 'blk';
  for (const position of ['tl', 'br']) { const corner = document.createElement('div'); corner.className = `cnr ${position} ${color}`; corner.innerHTML = `<b>${rankLabel(card.r)}</b><i>${suit}</i>`; el.append(corner); }
  const center = document.createElement('div');
  if (card.r === 1) { center.className = 'c-ace'; center.textContent = suit; }
  else if (card.r >= 11) { center.className = 'c-face-frame'; center.innerHTML = `<span class="fsuit">${suit}</span><span class="femoji">${FACE_EMOJI[card.r]}</span><span class="fsuit fflip">${suit}</span>`; }
  else { center.className = 'c-pips'; for (const [column, row] of PIPS[card.r]) { const pip = document.createElement('span'); pip.style.gridColumn = column; pip.style.gridRow = row; if (row > 4) pip.classList.add('pflip'); pip.textContent = suit; center.append(pip); } }
  el.append(center); return el;
}
export function renderCard(card, { size = 'md', faceUp = true } = {}) {
  const root = document.createElement('div'); root.className = `cardflip ${size}${faceUp ? ' faceup' : ''}`;
  const inner = document.createElement('div'); inner.className = 'cfinner';
  const back = document.createElement('div'); back.className = 'cface cback'; back.innerHTML = '<div class="cback-frame">🎴</div>';
  inner.append(front(card), back); root.append(inner); return root;
}
