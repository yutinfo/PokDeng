import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUITS, CATEGORY, rankLabel, newDeck, shuffle, cardPoints, handPoints, evaluate, compare, settleRound } from '../js/pokdeng.js';

export function C(str) {
  const s = str.slice(-1);
  const token = str.slice(0, -1);
  return { r: ({ A: 1, J: 11, Q: 12, K: 13 }[token] ?? Number(token)), s };
}
export function H(...cards) { return cards.map(C); }

test('newDeck: 52 ใบ ไม่ซ้ำ ครบ 13 อันดับ × 4 ดอก', () => {
  const deck = newDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map((card) => `${card.r}${card.s}`)).size, 52);
  for (const suit of SUITS) assert.equal(deck.filter((card) => card.s === suit).length, 13);
});

test('rankLabel และแต้มไพ่', () => {
  assert.equal(rankLabel(1), 'A'); assert.equal(rankLabel(10), '10'); assert.equal(rankLabel(11), 'J'); assert.equal(rankLabel(12), 'Q'); assert.equal(rankLabel(13), 'K');
  assert.equal(cardPoints(C('Ah')), 1); assert.equal(cardPoints(C('9d')), 9); assert.equal(cardPoints(C('10s')), 0); assert.equal(cardPoints(C('Jc')), 0);
  assert.equal(handPoints(H('4h', '5d')), 9); assert.equal(handPoints(H('Ah', '9d')), 0); assert.equal(handPoints(H('7h', '8d', '9s')), 4);
});

test('shuffle: ไม่แก้ input และ deterministic เมื่อ inject rng', () => {
  const deck = newDeck(); const before = JSON.stringify(deck); let i = 0;
  const rng = () => (i++ % 10) / 10;
  const result = shuffle(deck, rng);
  assert.equal(JSON.stringify(deck), before);
  assert.equal(new Set(result.map((card) => `${card.r}${card.s}`)).size, 52);
  let j = 0; assert.equal(JSON.stringify(result), JSON.stringify(shuffle(deck, () => (j++ % 10) / 10)));
  assert.equal(shuffle(newDeck()).length, 52);
});

test('evaluate: ป๊อก เด้ง และมือธรรมดา', () => {
  assert.deepEqual(evaluate(H('4h', '5h')), { category: CATEGORY.POK9, points: 9, deng: 2, tiebreak: 9, rankName: 'ป๊อกเก้า' });
  assert.deepEqual(evaluate(H('4h', '4d')), { category: CATEGORY.POK8, points: 8, deng: 2, tiebreak: 8, rankName: 'ป๊อกแปด' });
  assert.deepEqual(evaluate(H('Kh', 'Kd')), { category: CATEGORY.NORMAL, points: 0, deng: 2, tiebreak: 0, rankName: 'บอด' });
});

test('evaluate: ตอง สเตรท สเตรทฟลัช เซียน และสามเด้ง', () => {
  assert.deepEqual([evaluate(H('7h', '7d', '7s')).category, evaluate(H('7h', '7d', '7s')).deng, evaluate(H('7h', '7d', '7s')).tiebreak], [CATEGORY.TONG, 5, 7]);
  assert.deepEqual([evaluate(H('4h', '5h', '6h')).category, evaluate(H('4h', '5h', '6h')).deng], [CATEGORY.STRAIGHT_FLUSH, 5]);
  assert.equal(evaluate(H('Ah', '2d', '3s')).tiebreak, 3);
  assert.equal(evaluate(H('Qh', 'Kd', 'As')).tiebreak, 14);
  assert.equal(evaluate(H('Kh', 'Ad', '2s')).category, CATEGORY.NORMAL);
  assert.equal(evaluate(H('Jh', 'Qd', 'Ks')).category, CATEGORY.STRAIGHT);
  assert.equal(evaluate(H('Jh', 'Jd', 'Qs')).category, CATEGORY.SIAN);
  assert.deepEqual([evaluate(H('2h', '7h', '9h')).category, evaluate(H('2h', '7h', '9h')).deng], [CATEGORY.NORMAL, 3]);
});

test('compare: category, tiebreak และเสมอไม่สนเด้ง', () => {
  assert.equal(compare(evaluate(H('4h', '5d')), evaluate(H('4h', '4d'))), 1);
  assert.equal(compare(evaluate(H('Kh', 'Kd', 'Ks')), evaluate(H('7h', '7d', '7s'))), 1);
  assert.equal(compare(evaluate(H('Qh', 'Kd', 'As')), evaluate(H('Jh', 'Qd', 'Ks'))), 1);
  assert.equal(compare(evaluate(H('4h', '5h')), evaluate(H('3d', '6s'))), 0);
});

test('settleRound: เด้ง all-in cap และ zero-sum', () => {
  const result = settleRound({
    bets: { a: 50, b: 100, c: 20 },
    hands: { a: H('4h', '5h'), b: H('2h', '3d'), c: H('3c', '4d') },
    dealerHand: H('2s', '5c'), playerChips: { a: 1000, b: 1000, c: 1000 },
  });
  assert.deepEqual(result.playerDeltas, { a: 100, b: -100, c: 0 }); assert.equal(result.dealerDelta, 0);
  const allIn = settleRound({ bets: { a: 100, b: 30 }, hands: { a: H('2h', '3d'), b: H('Ah', '2d') }, dealerHand: H('4h', '5h', '6h'), playerChips: { a: 1000, b: 30 } });
  assert.deepEqual(allIn.playerDeltas, { a: -500, b: -30 }); assert.equal(allIn.dealerDelta, 530);
  let seed = 42; const rng = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
  for (let round = 0; round < 100; round++) {
    const deck = shuffle(newDeck(), rng); const bets = { a: 10 + Math.floor(rng() * 190) }; const chips = { a: Math.floor(rng() * 300) };
    const random = settleRound({ bets, hands: { a: deck.slice(0, 2 + Math.floor(rng() * 2)) }, dealerHand: deck.slice(4, 6 + Math.floor(rng() * 2)), playerChips: chips });
    assert.equal(random.playerDeltas.a + random.dealerDelta, 0); assert.ok(random.playerDeltas.a >= -chips.a);
  }
});
