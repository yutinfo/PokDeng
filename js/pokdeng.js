// Pure Pok Deng logic — ห้าม import Firebase หรือแตะ DOM
export const SUITS = ['s', 'h', 'd', 'c'];

const RANK_LABELS = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
export function rankLabel(r) {
  return RANK_LABELS[r] ?? String(r);
}

export function newDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (let r = 1; r <= 13; r++) deck.push({ r, s });
  }
  return deck;
}

function cryptoRng() {
  const u = new Uint32Array(1);
  globalThis.crypto.getRandomValues(u);
  return u[0] / 2 ** 32;
}

export function shuffle(deck, rng = cryptoRng) {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function cardPoints(card) {
  return card.r >= 10 ? 0 : card.r;
}

export function handPoints(cards) {
  return cards.reduce((total, card) => total + cardPoints(card), 0) % 10;
}

export const CATEGORY = {
  NORMAL: 1,
  SIAN: 2,
  STRAIGHT: 3,
  STRAIGHT_FLUSH: 4,
  TONG: 5,
  POK8: 6,
  POK9: 7,
};

function pointsName(points) {
  return points === 0 ? 'บอด' : `${points} แต้ม`;
}

function straightHigh(ranks) {
  const [a, b, c] = ranks;
  if (b === a + 1 && c === b + 1) return c;
  if (a === 1 && b === 12 && c === 13) return 14; // Q-K-A
  return 0;
}

function evaluate3(cards, points) {
  const ranks = cards.map((card) => card.r).sort((a, b) => a - b);
  const sameSuit = cards.every((card) => card.s === cards[0].s);
  if (ranks[0] === ranks[2]) {
    return { category: CATEGORY.TONG, points, deng: 5, tiebreak: ranks[0], rankName: `ตอง ${rankLabel(ranks[0])}` };
  }
  const high = straightHigh(ranks);
  if (high) {
    return sameSuit
      ? { category: CATEGORY.STRAIGHT_FLUSH, points, deng: 5, tiebreak: high, rankName: 'สเตรทฟลัช' }
      : { category: CATEGORY.STRAIGHT, points, deng: 3, tiebreak: high, rankName: 'เรียง' };
  }
  if (cards.every((card) => card.r >= 11)) {
    return { category: CATEGORY.SIAN, points, deng: 3, tiebreak: 0, rankName: 'เซียน' };
  }
  return { category: CATEGORY.NORMAL, points, deng: sameSuit ? 3 : 1, tiebreak: points, rankName: pointsName(points) };
}

export function evaluate(cards) {
  const points = handPoints(cards);
  if (cards.length === 2) {
    const [first, second] = cards;
    const deng = first.s === second.s || first.r === second.r ? 2 : 1;
    if (points >= 8) {
      return {
        category: points === 9 ? CATEGORY.POK9 : CATEGORY.POK8,
        points, deng, tiebreak: points,
        rankName: points === 9 ? 'ป๊อกเก้า' : 'ป๊อกแปด',
      };
    }
    return { category: CATEGORY.NORMAL, points, deng, tiebreak: points, rankName: pointsName(points) };
  }
  if (cards.length === 3) return evaluate3(cards, points);
  throw new RangeError('evaluate รองรับไพ่ 2 หรือ 3 ใบเท่านั้น');
}

export function compare(a, b) {
  if (a.category !== b.category) return a.category > b.category ? 1 : -1;
  if (a.tiebreak !== b.tiebreak) return a.tiebreak > b.tiebreak ? 1 : -1;
  return 0;
}

export function settleRound({ bets, hands, dealerHand, playerChips }) {
  const dealerEval = evaluate(dealerHand);
  const playerDeltas = {};
  const evals = {};
  let dealerDelta = 0;
  for (const playerId of Object.keys(bets)) {
    const playerEval = evaluate(hands[playerId]);
    evals[playerId] = playerEval;
    const outcome = compare(playerEval, dealerEval);
    const bet = bets[playerId];
    let delta = 0;
    if (outcome > 0) delta = bet * playerEval.deng;
    if (outcome < 0) delta = -Math.min(bet * dealerEval.deng, playerChips[playerId]);
    playerDeltas[playerId] = delta;
    dealerDelta -= delta;
  }
  return { playerDeltas, dealerDelta, evals, dealerEval };
}
