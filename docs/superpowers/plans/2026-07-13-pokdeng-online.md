# Pok Deng Online — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เกมป๊อกเด้งออนไลน์หลายผู้เล่นผ่านเบราว์เซอร์ — ห้องแบบ room code บน Firebase Realtime Database, ไพ่หน้าตาเหมือนจริงวาดด้วย CSS + emoji ล้วน, ชิปเสมือน

**Architecture:** Vanilla JS (ES Modules) ไม่มี build step, Firebase Anonymous Auth + Realtime Database เป็น backend เดียว, เครื่องเจ้ามือ (host client) เป็น game engine แบบ reactive-idempotent (อ่าน state → ทำสิ่งที่ขาด → เขียนกลับ) ทำให้รีเฟรชแล้วเล่นต่อได้เอง, ผู้เล่นอื่นเขียนได้แค่ bet/action ของตัวเอง บังคับด้วย security rules

**Tech Stack:** HTML5, CSS3, Vanilla JS ES2022, Firebase JS SDK v10.12.2 (CDN แบบ ES module), `node --test` สำหรับ unit tests (Node ≥ 20), Python `http.server` สำหรับ dev server

**Spec:** `docs/superpowers/specs/2026-07-13-pokdeng-online-design.md` — กติกา/ดีไซน์/สถาปัตยกรรมทั้งหมดอ้างอิงจากไฟล์นี้

## Global Constraints

- **ไม่มี build step / ไม่มี npm dependency ใด ๆ** — เปิดด้วย static server ได้เลย, Firebase SDK โหลดจาก `https://www.gstatic.com/firebasejs/10.12.2/…` เท่านั้น
- **ไม่มีไฟล์รูปภาพ** — กราฟิกทั้งหมดคือ CSS + emoji (ดอกไพ่ ♠️♥️♦️♣️, หน้าไพ่ J=💂 Q=👸 K=🤴, หลังไพ่ 🎴)
- **ไม่มีเงินจริง** — ชิปเสมือนเท่านั้น ห้ามมีคำว่าเงินบาท/จ่ายเงินจริงใน UI
- **ภาษา UI = ไทยทั้งหมด**
- **`js/pokdeng.js` ห้าม import Firebase หรือแตะ DOM เด็ดขาด** (pure logic, ต้อง test ได้ด้วย node)
- ไพ่แทนด้วย object `{r: 1-13, s: 's'|'h'|'d'|'c'}` ทุกที่ในระบบ
- state ของรอบ: `lobby | betting | dealing | acting | dealerTurn | reveal | settled` เท่านั้น
- ห้องสูงสุด 9 คน (เจ้ามือ 1 + ผู้เล่น 8), ชิปเริ่ม 1,000, เติมครั้งละ 1,000 เมื่อชิป < minBet, ค่าเริ่มต้น minBet=10 maxBet=200
- `firebase-config.js` (ของจริง) ต้องอยู่ใน `.gitignore` — commit เฉพาะ `firebase-config.example.js`
- ทดสอบ logic: `node --test tests/` ต้องผ่าน 100% ก่อน commit ทุกครั้งที่แตะ `js/pokdeng.js`
- Dev server: `python3 -m http.server 8080` แล้วเปิด `http://localhost:8080`

## File Structure (เป้าหมายสุดท้าย)

```
PokDeng/
├── index.html                    หน้าเดียว: landing + โต๊ะเกม (สลับด้วย JS)
├── css/style.css                 สไตล์ทั้งหมด รวมไพ่ emoji + โต๊ะ + responsive
├── js/
│   ├── main.js                   bootstrap: auth → parse ?room= → landing/enterGame
│   ├── firebase.js               init SDK, anonymous auth, server clock offset, F helper
│   ├── room.js                   สร้าง/เข้าห้อง, presence heartbeat, host takeover/transfer
│   ├── dealer.js                 engine ฝั่งเจ้ามือ (reactive: ทำงานเมื่อ uid === hostUid)
│   ├── game.js                   state store + listeners ฝั่งทุก client + ส่ง bet/action
│   ├── pokdeng.js                ★ pure logic: deck/shuffle/evaluate/compare/settleRound
│   ├── cards.js                  {r,s} → DOM ไพ่ emoji (sm/md/lg, faceUp/faceDown, flip)
│   └── ui.js                     render โต๊ะ/seat/action bar/modal/toast/timer/เสียง
├── tests/
│   ├── pokdeng.test.js           unit tests ทั้งหมดของ pokdeng.js
│   └── cards.html                หน้า eyeball-test วาดไพ่ครบ 52 ใบ + หลังไพ่
├── firebase-config.example.js
├── database.rules.json
├── .gitignore
└── README.md                     คู่มือ setup Firebase + deploy ทีละขั้น
```

**ผังการพึ่งพา (ห้ามวนกลับ):** `pokdeng.js` ← ไม่พึ่งใคร · `cards.js` ← pokdeng (rankLabel) · `firebase.js` ← config · `room.js`/`game.js`/`dealer.js` ← firebase, pokdeng · `ui.js` ← cards, pokdeng · `main.js` ← ทุกตัว

---

## Phase 1: Foundation + Pure Logic

### Task 1: ล้างโปรเจกต์เดิม + วางโครง

**Files:**
- Delete: `index.html`, `script.js`, `style.css`, `README.md` (เว็บ Education Green เดิม — user อนุมัติให้ลบแล้ว, กู้ได้จาก git history)
- Create: `.gitignore`, `index.html`, `css/style.css`, `js/pokdeng.js`, `tests/pokdeng.test.js`

**Interfaces:**
- Produces: โครงโฟลเดอร์ + หน้า placeholder ที่เปิดได้จริง

- [ ] **Step 1: ลบไฟล์เว็บเดิม**

```bash
cd /Users/kittisakinthisaen/Project-Dev/PokDeng
git rm index.html script.js style.css README.md
```

- [ ] **Step 2: สร้าง .gitignore**

สร้าง `.gitignore`:

```
firebase-config.js
.DS_Store
```

- [ ] **Step 3: สร้างโครงไฟล์ขั้นต่ำ**

สร้าง `index.html`:

```html
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ป๊อกเด้งออนไลน์ 🃏</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<main id="app">
  <h1>🃏 ป๊อกเด้งออนไลน์</h1>
  <p>กำลังก่อสร้าง…</p>
</main>
</body>
</html>
```

สร้าง `css/style.css`:

```css
:root {
  --felt: #2f6b4f;
  --felt-dark: #24543e;
  --card-face: #fffdf6;
  --card-border: #d9d4c5;
  --red: #c2242c;
  --black: #26262e;
  --gold: #c5ad62;
  --bg: #1b2430;
  --panel: #243144;
  --text: #eef2f7;
  --muted: #9fb0c3;
  --accent: #4f9dfa;
  --win: #3dd68c;
  --lose: #f26d6d;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Sarabun', -apple-system, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}
```

สร้าง `js/pokdeng.js` และ `tests/pokdeng.test.js` เป็นไฟล์ว่าง (จะเติมใน Task 2):

```bash
mkdir -p js tests
touch js/pokdeng.js tests/pokdeng.test.js
```

- [ ] **Step 4: ตรวจว่าเปิดได้**

Run: `cd /Users/kittisakinthisaen/Project-Dev/PokDeng && python3 -m http.server 8080` แล้วเปิด `http://localhost:8080`
Expected: เห็นหัวข้อ "🃏 ป๊อกเด้งออนไลน์" พื้นน้ำเงินเข้ม ไม่มี error ใน console

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove legacy site, scaffold Pok Deng project structure"
```

---

### Task 2: pokdeng.js — สำรับ, สับไพ่, นับแต้ม

**Files:**
- Modify: `js/pokdeng.js`
- Test: `tests/pokdeng.test.js`

**Interfaces:**
- Produces (ทุก task หลังจากนี้ใช้):
  - `SUITS: ['s','h','d','c']`
  - `rankLabel(r:number): string` — 1→'A', 11→'J', 12→'Q', 13→'K', อื่น→'2'..'10'
  - `newDeck(): Card[]` — 52 ใบ `{r,s}`
  - `shuffle(deck: Card[], rng?: ()=>number): Card[]` — Fisher-Yates, คืน array ใหม่ ไม่แก้ต้นฉบับ, default rng ใช้ `crypto.getRandomValues`
  - `cardPoints(c: Card): number` — A=1, 2-9 ตามหน้า, 10/J/Q/K=0
  - `handPoints(cards: Card[]): number` — ผลรวม mod 10

- [ ] **Step 1: เขียน failing tests**

เขียนทับ `tests/pokdeng.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUITS, rankLabel, newDeck, shuffle, cardPoints, handPoints } from '../js/pokdeng.js';

// helper: 'Ah' '10s' 'Kd' → {r,s}
export function C(str) {
  const s = str.slice(-1);
  const rt = str.slice(0, -1);
  const r = { A: 1, J: 11, Q: 12, K: 13 }[rt] ?? Number(rt);
  return { r, s };
}
export function H(...strs) { return strs.map(C); }

test('newDeck: 52 ใบ ไม่ซ้ำ ครบ 13 อันดับ × 4 ดอก', () => {
  const d = newDeck();
  assert.equal(d.length, 52);
  const keys = new Set(d.map(c => `${c.r}${c.s}`));
  assert.equal(keys.size, 52);
  for (const s of SUITS) {
    assert.equal(d.filter(c => c.s === s).length, 13);
  }
});

test('rankLabel', () => {
  assert.equal(rankLabel(1), 'A');
  assert.equal(rankLabel(10), '10');
  assert.equal(rankLabel(11), 'J');
  assert.equal(rankLabel(12), 'Q');
  assert.equal(rankLabel(13), 'K');
});

test('shuffle: ได้ multiset เดิม ไม่แก้ input และสุ่มตาม rng ที่ inject', () => {
  const d = newDeck();
  const snapshot = JSON.stringify(d);
  let i = 0;
  const fakeRng = () => (i++ % 10) / 10;
  const out = shuffle(d, fakeRng);
  assert.equal(JSON.stringify(d), snapshot, 'ต้องไม่แก้ input');
  assert.equal(out.length, 52);
  assert.equal(new Set(out.map(c => `${c.r}${c.s}`)).size, 52);
  assert.notEqual(JSON.stringify(out), snapshot, 'ลำดับต้องเปลี่ยน');
  const out2 = shuffle(d, (() => { let j = 0; return () => (j++ % 10) / 10; })());
  assert.equal(JSON.stringify(out2), JSON.stringify(out), 'rng เดิม → ผลเดิม (deterministic)');
});

test('shuffle: default rng ใช้งานได้และครบ 52', () => {
  const out = shuffle(newDeck());
  assert.equal(new Set(out.map(c => `${c.r}${c.s}`)).size, 52);
});

test('cardPoints: A=1, เลขตามหน้า, 10/J/Q/K=0', () => {
  assert.equal(cardPoints(C('Ah')), 1);
  assert.equal(cardPoints(C('9d')), 9);
  assert.equal(cardPoints(C('10s')), 0);
  assert.equal(cardPoints(C('Jc')), 0);
  assert.equal(cardPoints(C('Qh')), 0);
  assert.equal(cardPoints(C('Kd')), 0);
});

test('handPoints: mod 10', () => {
  assert.equal(handPoints(H('4h', '5d')), 9);
  assert.equal(handPoints(H('Ah', '9d')), 0);      // 10 → 0 (บอด)
  assert.equal(handPoints(H('Kh', 'Qd')), 0);
  assert.equal(handPoints(H('7h', '8d', '9s')), 4); // 24 → 4
  assert.equal(handPoints(H('10h', 'Jd', 'Qs')), 0);
});
```

- [ ] **Step 2: รันให้ fail**

Run: `node --test tests/`
Expected: FAIL — `SyntaxError ... does not provide an export named 'SUITS'` (ไฟล์ยังว่าง)

- [ ] **Step 3: implement**

เขียนทับ `js/pokdeng.js`:

```js
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
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardPoints(c) {
  return c.r >= 10 ? 0 : c.r;
}

export function handPoints(cards) {
  return cards.reduce((t, c) => t + cardPoints(c), 0) % 10;
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `node --test tests/`
Expected: PASS ทั้งหมด (6 tests)

- [ ] **Step 5: Commit**

```bash
git add js/pokdeng.js tests/pokdeng.test.js
git commit -m "feat: pokdeng core - deck, crypto shuffle, point counting"
```

---

### Task 3: pokdeng.js — evaluate() มือ 2 ใบ (ป๊อก + เด้ง)

**Files:**
- Modify: `js/pokdeng.js`
- Test: `tests/pokdeng.test.js` (ต่อท้าย)

**Interfaces:**
- Produces:
  - `CATEGORY = { NORMAL:1, SIAN:2, STRAIGHT:3, STRAIGHT_FLUSH:4, TONG:5, POK8:6, POK9:7 }` (เลขมาก = ชนะ)
  - `evaluate(cards: Card[]): { category:number, points:number, deng:number, tiebreak:number, rankName:string }`
  - มือ 2 ใบ: ป๊อกเมื่อแต้ม ≥ 8; เด้ง 2 เมื่อดอกเดียวกันหรือเลขเดียวกัน; `rankName`: 'ป๊อกเก้า' | 'ป๊อกแปด' | 'X แต้ม' | 'บอด' (0 แต้ม)

- [ ] **Step 1: เขียน failing tests (ต่อท้ายไฟล์เทสต์)**

เพิ่มที่ท้าย `tests/pokdeng.test.js` (เพิ่ม `CATEGORY, evaluate` เข้า import บรรทัดแรกด้วย):

```js
import { CATEGORY, evaluate } from '../js/pokdeng.js';

test('evaluate 2 ใบ: ป๊อกเก้า/ป๊อกแปด + เด้ง', () => {
  const t = [
    // [มือ, category, points, deng, rankName]
    [H('4h', '5h'), CATEGORY.POK9, 9, 2, 'ป๊อกเก้า'],   // ดอกเดียวกัน = สองเด้ง
    [H('4h', '5d'), CATEGORY.POK9, 9, 1, 'ป๊อกเก้า'],
    [H('4h', '4d'), CATEGORY.POK8, 8, 2, 'ป๊อกแปด'],    // คู่ = สองเด้ง
    [H('Ah', '7d'), CATEGORY.POK8, 8, 1, 'ป๊อกแปด'],
    [H('9h', 'Ks'), CATEGORY.POK9, 9, 1, 'ป๊อกเก้า'],   // K = 0
  ];
  for (const [hand, cat, pts, deng, name] of t) {
    const e = evaluate(hand);
    assert.deepEqual(
      [e.category, e.points, e.deng, e.rankName],
      [cat, pts, deng, name],
      JSON.stringify(hand)
    );
  }
});

test('evaluate 2 ใบ: ธรรมดา + เด้ง + บอด', () => {
  const t = [
    [H('2h', '3d'), CATEGORY.NORMAL, 5, 1, '5 แต้ม'],
    [H('7s', '9s'), CATEGORY.NORMAL, 6, 2, '6 แต้ม'],    // ดอกเดียวกัน
    [H('Kh', 'Kd'), CATEGORY.NORMAL, 0, 2, 'บอด'],       // คู่ K, 0 แต้ม
    [H('10h', 'Jd'), CATEGORY.NORMAL, 0, 1, 'บอด'],
  ];
  for (const [hand, cat, pts, deng, name] of t) {
    const e = evaluate(hand);
    assert.deepEqual(
      [e.category, e.points, e.deng, e.rankName],
      [cat, pts, deng, name],
      JSON.stringify(hand)
    );
  }
});

test('evaluate 2 ใบ: tiebreak = points', () => {
  assert.equal(evaluate(H('4h', '5d')).tiebreak, 9);
  assert.equal(evaluate(H('2h', '3d')).tiebreak, 5);
});
```

- [ ] **Step 2: รันให้ fail**

Run: `node --test tests/`
Expected: FAIL — `does not provide an export named 'CATEGORY'`

- [ ] **Step 3: implement (ต่อท้าย js/pokdeng.js)**

```js
export const CATEGORY = {
  NORMAL: 1,
  SIAN: 2,
  STRAIGHT: 3,
  STRAIGHT_FLUSH: 4,
  TONG: 5,
  POK8: 6,
  POK9: 7,
};

function pointsName(p) {
  return p === 0 ? 'บอด' : `${p} แต้ม`;
}

export function evaluate(cards) {
  const points = handPoints(cards);
  if (cards.length === 2) {
    const [x, y] = cards;
    const deng = (x.s === y.s || x.r === y.r) ? 2 : 1;
    if (points >= 8) {
      return {
        category: points === 9 ? CATEGORY.POK9 : CATEGORY.POK8,
        points, deng, tiebreak: points,
        rankName: points === 9 ? 'ป๊อกเก้า' : 'ป๊อกแปด',
      };
    }
    return { category: CATEGORY.NORMAL, points, deng, tiebreak: points, rankName: pointsName(points) };
  }
  return evaluate3(cards, points);
}

function evaluate3(cards, points) {
  // เติมเต็มใน Task 4 — ตอนนี้รองรับเฉพาะมือธรรมดาก่อน
  return { category: CATEGORY.NORMAL, points, deng: 1, tiebreak: points, rankName: pointsName(points) };
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `node --test tests/`
Expected: PASS ทั้งหมด (9 tests)

- [ ] **Step 5: Commit**

```bash
git add js/pokdeng.js tests/pokdeng.test.js
git commit -m "feat: evaluate 2-card hands - pok, deng, points"
```

---

### Task 4: pokdeng.js — evaluate() มือ 3 ใบ (ตอง/สเตรทฟลัช/เรียง/เซียน/สามเด้ง)

**Files:**
- Modify: `js/pokdeng.js` (แทนที่ฟังก์ชัน `evaluate3`)
- Test: `tests/pokdeng.test.js` (ต่อท้าย)

**Interfaces:**
- Produces: `evaluate()` รองรับ 3 ใบครบ:
  - ตอง → deng 5, tiebreak = ค่าไพ่ (A=1 ต่ำสุด, K=13 สูงสุด), rankName `ตอง X`
  - สเตรทฟลัช → deng 5, เรียง → deng 3; tiebreak = ไพ่สูงสุดของลำดับ โดย Q-K-A นับ 14, J-Q-K = 13, A-2-3 = 3; K-A-2 ไม่ใช่เรียง; rankName 'สเตรทฟลัช' | 'เรียง'
  - เซียน (JQK ล้วน คละได้ และไม่เข้าเงื่อนไขสูงกว่า) → deng 3, tiebreak 0, rankName 'เซียน'
  - 3 ใบดอกเดียวกันที่ไม่เข้า category ใด → NORMAL deng 3 (สามเด้ง)
  - ลำดับความสำคัญเมื่อทับซ้อน: TONG > STRAIGHT_FLUSH > STRAIGHT > SIAN > NORMAL (เช่น J-Q-K ดอกเดียวกัน = สเตรทฟลัช, J-Q-K คละดอก = เรียง ไม่ใช่เซียน)

- [ ] **Step 1: เขียน failing tests (ต่อท้าย)**

```js
test('evaluate 3 ใบ: ตอง', () => {
  const e = evaluate(H('7h', '7d', '7s'));
  assert.equal(e.category, CATEGORY.TONG);
  assert.equal(e.deng, 5);
  assert.equal(e.tiebreak, 7);
  assert.equal(e.rankName, 'ตอง 7');
  assert.equal(evaluate(H('Ah', 'Ad', 'As')).tiebreak, 1);   // ตอง A ต่ำสุด
  assert.equal(evaluate(H('Kh', 'Kd', 'Ks')).tiebreak, 13);  // ตอง K สูงสุด
  assert.equal(evaluate(H('Kh', 'Kd', 'Ks')).rankName, 'ตอง K');
});

test('evaluate 3 ใบ: เรียง / สเตรทฟลัช / ขอบเคส A', () => {
  const sf = evaluate(H('4h', '5h', '6h'));
  assert.deepEqual([sf.category, sf.deng, sf.tiebreak], [CATEGORY.STRAIGHT_FLUSH, 5, 6]);
  assert.equal(sf.rankName, 'สเตรทฟลัช');

  const st = evaluate(H('4h', '5d', '6s'));
  assert.deepEqual([st.category, st.deng, st.tiebreak], [CATEGORY.STRAIGHT, 3, 6]);
  assert.equal(st.rankName, 'เรียง');

  assert.equal(evaluate(H('Ah', '2d', '3s')).category, CATEGORY.STRAIGHT); // A-2-3 ได้
  assert.equal(evaluate(H('Ah', '2d', '3s')).tiebreak, 3);                 // ต่ำสุด
  assert.equal(evaluate(H('Qh', 'Kd', 'As')).category, CATEGORY.STRAIGHT); // Q-K-A ได้
  assert.equal(evaluate(H('Qh', 'Kd', 'As')).tiebreak, 14);                // สูงสุด
  assert.equal(evaluate(H('Kh', 'Ad', '2s')).category, CATEGORY.NORMAL);   // K-A-2 ไม่ได้
  assert.equal(evaluate(H('Jh', 'Qd', 'Ks')).category, CATEGORY.STRAIGHT); // JQK = เรียง ไม่ใช่เซียน
  assert.equal(evaluate(H('Jh', 'Qd', 'Ks')).tiebreak, 13);
  assert.equal(evaluate(H('Jh', 'Qh', 'Kh')).category, CATEGORY.STRAIGHT_FLUSH); // JQK ดอกเดียว
});

test('evaluate 3 ใบ: เซียน', () => {
  for (const hand of [H('Jh', 'Jd', 'Qs'), H('Qh', 'Qd', 'Ks'), H('Kh', 'Kd', 'Js'), H('Jh', 'Qd', 'Qs')]) {
    const e = evaluate(hand);
    assert.equal(e.category, CATEGORY.SIAN, JSON.stringify(hand));
    assert.equal(e.deng, 3);
    assert.equal(e.tiebreak, 0);
    assert.equal(e.rankName, 'เซียน');
    assert.equal(e.points, 0);
  }
  // ตอง J = ตอง ไม่ใช่เซียน
  assert.equal(evaluate(H('Jh', 'Jd', 'Js')).category, CATEGORY.TONG);
});

test('evaluate 3 ใบ: สามเด้ง (ดอกเดียวกัน = NORMAL deng 3) และธรรมดา', () => {
  const e = evaluate(H('2h', '7h', '9h')); // 18 → 8 แต้ม สามเด้ง
  assert.deepEqual([e.category, e.points, e.deng], [CATEGORY.NORMAL, 8, 3]);
  assert.equal(e.rankName, '8 แต้ม');

  const p = evaluate(H('2h', '7d', '9s'));
  assert.deepEqual([p.category, p.points, p.deng], [CATEGORY.NORMAL, 8, 1]);

  // 3 ใบได้ 8/9 แต้ม ไม่ใช่ป๊อก (ป๊อกเฉพาะ 2 ใบแรก)
  assert.equal(evaluate(H('2h', '3d', '4s')).category, CATEGORY.STRAIGHT); // กันสับสน: อันนี้เรียง
  assert.equal(evaluate(H('2h', '3d', '3s')).points, 8);
  assert.equal(evaluate(H('2h', '3d', '3s')).category, CATEGORY.NORMAL);
});
```

- [ ] **Step 2: รันให้ fail**

Run: `node --test tests/`
Expected: FAIL — เทสต์กลุ่ม 3 ใบพัง (evaluate3 ยังคืน NORMAL อย่างเดียว)

- [ ] **Step 3: แทนที่ evaluate3 ใน js/pokdeng.js**

ลบฟังก์ชัน `evaluate3` เดิม แล้วใส่:

```js
function straightHigh(rs) {
  // rs = อันดับเรียงจากน้อยไปมาก; คืนไพ่สูงสุดของลำดับ หรือ 0 ถ้าไม่เรียง
  const [a, b, c] = rs;
  if (b === a + 1 && c === b + 1) return c;
  if (a === 1 && b === 12 && c === 13) return 14; // Q-K-A (A นับสูง)
  return 0;
}

function evaluate3(cards, points) {
  const rs = cards.map(c => c.r).sort((p, q) => p - q);
  const sameSuit = cards.every(c => c.s === cards[0].s);

  if (rs[0] === rs[2]) {
    return { category: CATEGORY.TONG, points, deng: 5, tiebreak: rs[0], rankName: `ตอง ${rankLabel(rs[0])}` };
  }
  const high = straightHigh(rs);
  if (high > 0) {
    if (sameSuit) {
      return { category: CATEGORY.STRAIGHT_FLUSH, points, deng: 5, tiebreak: high, rankName: 'สเตรทฟลัช' };
    }
    return { category: CATEGORY.STRAIGHT, points, deng: 3, tiebreak: high, rankName: 'เรียง' };
  }
  if (cards.every(c => c.r >= 11)) {
    return { category: CATEGORY.SIAN, points, deng: 3, tiebreak: 0, rankName: 'เซียน' };
  }
  return { category: CATEGORY.NORMAL, points, deng: sameSuit ? 3 : 1, tiebreak: points, rankName: pointsName(points) };
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `node --test tests/`
Expected: PASS ทั้งหมด (13 tests)

- [ ] **Step 5: Commit**

```bash
git add js/pokdeng.js tests/pokdeng.test.js
git commit -m "feat: evaluate 3-card hands - tong, straights, sian, three-deng"
```

### Task 5: pokdeng.js — compare()

**Files:**
- Modify: `js/pokdeng.js`
- Test: `tests/pokdeng.test.js` (ต่อท้าย)

**Interfaces:**
- Produces: `compare(a: Eval, b: Eval): 1 | 0 | -1` — เทียบ category ก่อน (มาก = ชนะ) แล้วค่อย tiebreak; เท่ากันทุกอย่าง = 0 (เสมอ ไม่สน deng)

- [ ] **Step 1: เขียน failing tests (ต่อท้าย, เพิ่ม `compare` เข้า import)**

```js
import { compare } from '../js/pokdeng.js';

test('compare: ลำดับ category ครบตามกติกา', () => {
  // ป๊อก9 > ป๊อก8 > ตอง > สเตรทฟลัช > เรียง > เซียน > ธรรมดา
  const ladder = [
    evaluate(H('4h', '5d')),        // POK9
    evaluate(H('4h', '4d')),        // POK8
    evaluate(H('7h', '7d', '7s')),  // TONG
    evaluate(H('4h', '5h', '6h')),  // STRAIGHT_FLUSH
    evaluate(H('4h', '5d', '6s')),  // STRAIGHT
    evaluate(H('Jh', 'Jd', 'Qs')),  // SIAN
    evaluate(H('2h', '5d')),        // NORMAL 7 แต้ม
  ];
  for (let i = 0; i < ladder.length; i++) {
    for (let j = 0; j < ladder.length; j++) {
      if (i < j) assert.equal(compare(ladder[i], ladder[j]), 1, `${i} ต้องชนะ ${j}`);
      if (i > j) assert.equal(compare(ladder[i], ladder[j]), -1, `${i} ต้องแพ้ ${j}`);
    }
  }
});

test('compare: tiebreak ภายใน category เดียวกัน', () => {
  // ตอง K > ตอง 7 > ตอง A
  assert.equal(compare(evaluate(H('Kh', 'Kd', 'Ks')), evaluate(H('7h', '7d', '7s'))), 1);
  assert.equal(compare(evaluate(H('Ah', 'Ad', 'As')), evaluate(H('7h', '7d', '7s'))), -1);
  // เรียง: Q-K-A > J-Q-K > A-2-3
  assert.equal(compare(evaluate(H('Qh', 'Kd', 'As')), evaluate(H('Jh', 'Qd', 'Ks'))), 1);
  assert.equal(compare(evaluate(H('Ah', '2d', '3s')), evaluate(H('Jh', 'Qd', 'Ks'))), -1);
  // แต้มธรรมดา: 7 > 3
  assert.equal(compare(evaluate(H('2h', '5d')), evaluate(H('Ah', '2d'))), 1);
});

test('compare: เสมอ — ไม่สนเด้ง', () => {
  // ป๊อก 9 สองเด้ง vs ป๊อก 9 เด้งเดียว = เสมอ
  assert.equal(compare(evaluate(H('4h', '5h')), evaluate(H('3d', '6s'))), 0);
  // เซียน ชน เซียน = เสมอเสมอ
  assert.equal(compare(evaluate(H('Jh', 'Jd', 'Qs')), evaluate(H('Kh', 'Kd', 'Qc'))), 0);
  // แต้มเท่า เด้งต่าง = เสมอ
  assert.equal(compare(evaluate(H('3h', '4h')), evaluate(H('2d', '5s'))), 0);
  // เรียงแต้มเดียวกัน (4-5-6 ทั้งคู่ คนละดอกผสม)
  assert.equal(compare(evaluate(H('4h', '5d', '6s')), evaluate(H('4c', '5s', '6d'))), 0);
});
```

- [ ] **Step 2: รันให้ fail**

Run: `node --test tests/`
Expected: FAIL — `does not provide an export named 'compare'`

- [ ] **Step 3: implement (ต่อท้าย js/pokdeng.js)**

```js
export function compare(a, b) {
  if (a.category !== b.category) return a.category > b.category ? 1 : -1;
  if (a.tiebreak !== b.tiebreak) return a.tiebreak > b.tiebreak ? 1 : -1;
  return 0;
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `node --test tests/`
Expected: PASS ทั้งหมด (16 tests)

- [ ] **Step 5: Commit**

```bash
git add js/pokdeng.js tests/pokdeng.test.js
git commit -m "feat: hand comparison with category ladder and tiebreaks"
```

---

### Task 6: pokdeng.js — settleRound()

**Files:**
- Modify: `js/pokdeng.js`
- Test: `tests/pokdeng.test.js` (ต่อท้าย)

**Interfaces:**
- Produces:
  - `settleRound({ bets, hands, dealerHand, playerChips }): { playerDeltas, dealerDelta, evals, dealerEval }`
  - `bets: {uid: number}`, `hands: {uid: Card[]}`, `dealerHand: Card[]`, `playerChips: {uid: number}`
  - ชนะ: `+bet × deng ของผู้เล่น` · แพ้: `-min(bet × deng เจ้ามือ, chips ผู้เล่น)` (all-in cap) · เสมอ: 0
  - `dealerDelta = -Σ playerDeltas` (zero-sum เสมอ; เจ้ามือติดลบได้)
  - Task 15 (dealer settle) ใช้ฟังก์ชันนี้ตรง ๆ

- [ ] **Step 1: เขียน failing tests (ต่อท้าย, เพิ่ม `settleRound` เข้า import)**

```js
import { settleRound } from '../js/pokdeng.js';

test('settleRound: ชนะคูณเด้งผู้เล่น แพ้คูณเด้งเจ้ามือ เสมอเป็นศูนย์', () => {
  const r = settleRound({
    bets:  { a: 50, b: 100, c: 20 },
    hands: {
      a: H('4h', '5h'),          // ป๊อกเก้า สองเด้ง → ชนะ → +50×2
      b: H('2h', '3d'),          // 5 แต้ม → แพ้ 7 แต้ม → -100×1
      c: H('3c', '4d'),          // 7 แต้ม = เสมอเจ้ามือ → 0
    },
    dealerHand: H('2s', '5c'),   // 7 แต้ม เด้งเดียว
    playerChips: { a: 1000, b: 1000, c: 1000 },
  });
  assert.deepEqual(r.playerDeltas, { a: 100, b: -100, c: 0 });
  assert.equal(r.dealerDelta, 0); // +100 จาก b, -100 ให้ a
  assert.equal(r.evals.a.rankName, 'ป๊อกเก้า');
  assert.equal(r.dealerEval.points, 7);
});

test('settleRound: เด้งเจ้ามือคูณฝั่งแพ้ + all-in cap', () => {
  const r = settleRound({
    bets:  { a: 100, b: 30 },
    hands: {
      a: H('2h', '3d'),          // 5 แต้ม → แพ้สเตรทฟลัช → โดน ×5 = 500 แต่มี 1000 → -500
      b: H('Ah', '2d'),          // 3 แต้ม → โดน ×5 = 150 แต่มีแค่ 30 → -30 (all-in cap)
    },
    dealerHand: H('4h', '5h', '6h'), // สเตรทฟลัช เด้ง 5
    playerChips: { a: 1000, b: 30 },
  });
  assert.deepEqual(r.playerDeltas, { a: -500, b: -30 });
  assert.equal(r.dealerDelta, 530);
});

test('settleRound: เจ้ามือแพ้ทุกขา → ติดลบได้ และ zero-sum เสมอ', () => {
  const r = settleRound({
    bets:  { a: 200, b: 200 },
    hands: {
      a: H('4h', '4d'),           // ป๊อกแปด สองเด้ง → +200×2
      b: H('7h', '7d', '7s'),     // ตอง เด้ง 5 → +200×5
    },
    dealerHand: H('Kh', 'Qd'),    // บอด
    playerChips: { a: 100, b: 50 },  // ชิปผู้เล่นน้อยไม่เกี่ยว — cap เฉพาะตอนแพ้
  });
  assert.deepEqual(r.playerDeltas, { a: 400, b: 1000 });
  assert.equal(r.dealerDelta, -1400);
  const sum = Object.values(r.playerDeltas).reduce((x, y) => x + y, 0) + r.dealerDelta;
  assert.equal(sum, 0);
});

test('settleRound: zero-sum invariant กับมือสุ่มหลายชุด', () => {
  let seed = 42;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
  for (let round = 0; round < 200; round++) {
    const deck = shuffle(newDeck(), rng);
    const n = 1 + Math.floor(rng() * 8);
    const bets = {}, hands = {}, playerChips = {};
    let pos = 0;
    for (let i = 0; i < n; i++) {
      const uid = `p${i}`;
      const take = rng() < 0.5 ? 2 : 3;
      hands[uid] = deck.slice(pos, pos + take); pos += take;
      bets[uid] = 10 + Math.floor(rng() * 190);
      playerChips[uid] = Math.floor(rng() * 300);
    }
    const dealerHand = deck.slice(pos, pos + (rng() < 0.5 ? 2 : 3));
    const r = settleRound({ bets, hands, dealerHand, playerChips });
    const sum = Object.values(r.playerDeltas).reduce((x, y) => x + y, 0) + r.dealerDelta;
    assert.equal(sum, 0, `รอบ ${round} ไม่ zero-sum`);
    for (const uid of Object.keys(bets)) {
      assert.ok(r.playerDeltas[uid] >= -playerChips[uid], `รอบ ${round}: ${uid} เสียเกินชิปที่มี`);
    }
  }
});
```

- [ ] **Step 2: รันให้ fail**

Run: `node --test tests/`
Expected: FAIL — `does not provide an export named 'settleRound'`

- [ ] **Step 3: implement (ต่อท้าย js/pokdeng.js)**

```js
export function settleRound({ bets, hands, dealerHand, playerChips }) {
  const dealerEval = evaluate(dealerHand);
  const playerDeltas = {};
  const evals = {};
  let dealerDelta = 0;
  for (const uid of Object.keys(bets)) {
    const ev = evaluate(hands[uid]);
    evals[uid] = ev;
    const cmp = compare(ev, dealerEval);
    let delta = 0;
    if (cmp > 0) delta = bets[uid] * ev.deng;
    else if (cmp < 0) delta = -Math.min(bets[uid] * dealerEval.deng, playerChips[uid]);
    playerDeltas[uid] = delta;
    dealerDelta -= delta;
  }
  return { playerDeltas, dealerDelta, evals, dealerEval };
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `node --test tests/`
Expected: PASS ทั้งหมด (20 tests) — logic เกมสมบูรณ์แล้ว

- [ ] **Step 5: Commit**

```bash
git add js/pokdeng.js tests/pokdeng.test.js
git commit -m "feat: settleRound with winner-deng payout, all-in cap, zero-sum"
```

---

## Phase 2: Room System

### Task 7: firebase.js + config plumbing

**Files:**
- Create: `js/firebase.js`, `firebase-config.example.js`, `database.rules.json` (ฉบับ baseline — ฉบับเต็มใน Task 21)

**Interfaces:**
- Consumes: `firebase-config.js` (ผู้ใช้ก็อปจาก example — **ไม่ commit**)
- Produces (ทุก task ที่แตะ Firebase ใช้):
  - `db` — instance ของ Realtime Database
  - `F` — รวมฟังก์ชัน SDK: `{ ref, child, get, set, update, remove, onValue, off, onDisconnect, runTransaction, serverTimestamp, push, onChildAdded }`
  - `authReady(): Promise<string>` — sign in anonymous แล้วคืน uid (เรียกซ้ำได้)
  - `uid(): string|null` — uid ปัจจุบัน
  - `serverNow(): number` — เวลาปัจจุบันชดเชย offset จาก server (ใช้กับ turnDeadline)

- [ ] **Step 1: สร้าง firebase-config.example.js**

```js
// ก็อปไฟล์นี้เป็น firebase-config.js แล้วใส่ค่าจาก Firebase Console ของคุณ
// (Project settings → General → Your apps → SDK setup and configuration)
export const firebaseConfig = {
  apiKey: 'AIza....................................',
  authDomain: 'your-project.firebaseapp.com',
  databaseURL: 'https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'your-project',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx',
};
```

- [ ] **Step 2: สร้าง js/firebase.js**

```js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInAnonymously, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getDatabase, ref, child, get, set, update, remove, onValue, off,
  onDisconnect, runTransaction, serverTimestamp, push, onChildAdded,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { firebaseConfig } from '../firebase-config.js';

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
const auth = getAuth(app);

export const F = {
  ref, child, get, set, update, remove, onValue, off,
  onDisconnect, runTransaction, serverTimestamp, push, onChildAdded,
};

let _uid = null;
export function uid() { return _uid; }

let _authPromise = null;
export function authReady() {
  if (_authPromise) return _authPromise;
  _authPromise = new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) { _uid = user.uid; resolve(user.uid); }
    });
    signInAnonymously(auth).catch(reject);
  });
  return _authPromise;
}

let _clockOffset = 0;
export function watchClock() {
  onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
    _clockOffset = snap.val() || 0;
  });
}
export function serverNow() {
  return Date.now() + _clockOffset;
}
```

- [ ] **Step 3: สร้าง database.rules.json (baseline — คนล็อกอินเท่านั้น, จะ harden ใน Task 21)**

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

- [ ] **Step 4: ตั้ง Firebase project จริง (ทำครั้งเดียว — ถ้ามีอยู่แล้วข้ามได้)**

ขั้นตอนนี้ต้องให้ **ผู้ใช้ (เจ้าของโปรเจกต์) ทำเองใน Firebase Console** — engine ทำแทนไม่ได้:
1. https://console.firebase.google.com → Add project (ชื่ออะไรก็ได้ เช่น `pokdeng-online`), ปิด Analytics ได้
2. Build → Authentication → Get started → Sign-in method → เปิด **Anonymous**
3. Build → Realtime Database → Create database → โซน `asia-southeast1` → Start in **locked mode**
4. Realtime Database → Rules → วางเนื้อหา `database.rules.json` → Publish
5. Project settings → General → Your apps → ปุ่ม `</>` (Web) → Register app → ก็อป `firebaseConfig`
6. ในเครื่อง: `cp firebase-config.example.js firebase-config.js` แล้ววางค่าจริงลงไป

- [ ] **Step 5: ทดสอบต่อจริง**

เพิ่มใน `index.html` ก่อนปิด `</body>` (โค้ดชั่วคราว จะแทนที่ใน Task 9):

```html
<script type="module">
  import { authReady, watchClock, serverNow } from './js/firebase.js';
  authReady().then((uid) => {
    watchClock();
    console.log('auth OK, uid =', uid);
    setTimeout(() => console.log('serverNow =', new Date(serverNow()).toISOString()), 1500);
  });
</script>
```

Run: `python3 -m http.server 8080` → เปิด `http://localhost:8080` → ดู DevTools console
Expected: `auth OK, uid = <string ~28 ตัว>` และ `serverNow = <เวลาปัจจุบัน ISO>` ไม่มี error สีแดง

- [ ] **Step 6: Commit**

```bash
git add js/firebase.js firebase-config.example.js database.rules.json index.html
git commit -m "feat: firebase init - anonymous auth, server clock, baseline rules"
```

---

### Task 8: room.js — สร้าง/เข้าห้อง + presence

**Files:**
- Create: `js/room.js`

**Interfaces:**
- Consumes: `F, db, uid, serverNow` จาก `js/firebase.js`
- Produces:
  - `ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'` (ตัด 0/O/1/I)
  - `createRoom({name, avatar}): Promise<string>` — สร้างห้อง คืน code 6 ตัว, ผู้สร้าง = host (เจ้ามือ), state='lobby', round=0, minBet=10, maxBet=200
  - `joinRoom(code, {name, avatar}): Promise<void>` — throw `Error` ที่มี `.reason` เป็น `'not-found'` | `'full'`; ผู้เล่นเดิม (uid ซ้ำ) เข้าซ้ำได้เสมอไม่นับที่นั่งเพิ่ม; คำนวณ `joinedRound` ตามกฎ spectator
  - `startPresence(code): void` — heartbeat ทุก 25 วิ อัพเดต `online:true, lastSeen`, ตั้ง `onDisconnect → online:false`
  - `stopPresence(): void`
  - kek `joinedRound` กติกา: state `lobby` → 1, `betting` → round ปัจจุบัน (ทันรอบนี้), อื่น ๆ → round+1 (รอรอบหน้า)

- [ ] **Step 1: สร้าง js/room.js**

```js
import { db, F, uid, serverNow } from './firebase.js';

export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 9;
export const START_CHIPS = 1000;

function randomCode() {
  let code = '';
  const u = new Uint32Array(6);
  crypto.getRandomValues(u);
  for (let i = 0; i < 6; i++) code += ROOM_CODE_CHARS[u[i] % ROOM_CODE_CHARS.length];
  return code;
}

export function normalizeCode(raw) {
  return (raw || '').trim().toUpperCase();
}

function playerEntry({ name, avatar }) {
  return {
    name: name.slice(0, 12),
    avatar,
    chips: START_CHIPS,
    online: true,
    lastSeen: serverNow(),
    joinedAt: serverNow(),
    rebuys: 0,
    joinedRound: 1,
  };
}

export async function createRoom({ name, avatar }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const metaRef = F.ref(db, `rooms/${code}/meta`);
    const snap = await F.get(metaRef);
    if (snap.exists()) continue; // code ชน — สุ่มใหม่
    await F.update(F.ref(db, `rooms/${code}`), {
      meta: {
        createdAt: serverNow(),
        hostUid: uid(),
        state: 'lobby',
        round: 0,
        minBet: 10,
        maxBet: 200,
        turnDeadline: null,
      },
      [`players/${uid()}`]: playerEntry({ name, avatar }),
    });
    return code;
  }
  throw Object.assign(new Error('สุ่มรหัสห้องไม่สำเร็จ'), { reason: 'code-collision' });
}

export async function joinRoom(code, { name, avatar }) {
  const roomRef = F.ref(db, `rooms/${code}`);
  const [metaSnap, playersSnap] = await Promise.all([
    F.get(F.child(roomRef, 'meta')),
    F.get(F.child(roomRef, 'players')),
  ]);
  if (!metaSnap.exists()) {
    throw Object.assign(new Error('ไม่พบห้องนี้'), { reason: 'not-found' });
  }
  const meta = metaSnap.val();
  const players = playersSnap.val() || {};
  const isReturning = Boolean(players[uid()]);
  if (!isReturning && Object.keys(players).length >= MAX_PLAYERS) {
    throw Object.assign(new Error('ห้องเต็ม (9 คน)'), { reason: 'full' });
  }
  if (isReturning) {
    // กลับเข้าห้องเดิม — อัพเดตชื่อ/รูป คงชิปและ joinedRound เดิม
    await F.update(F.child(roomRef, `players/${uid()}`), {
      name: name.slice(0, 12), avatar, online: true, lastSeen: serverNow(),
    });
    return;
  }
  const entry = playerEntry({ name, avatar });
  entry.joinedRound =
    meta.state === 'lobby' ? 1 :
    meta.state === 'betting' ? meta.round :
    meta.round + 1;
  await F.set(F.child(roomRef, `players/${uid()}`), entry);
}

let _presenceTimer = null;
export function startPresence(code) {
  stopPresence();
  const meRef = F.ref(db, `rooms/${code}/players/${uid()}`);
  const beat = () => F.update(meRef, { online: true, lastSeen: serverNow() });
  beat();
  F.onDisconnect(meRef).update({ online: false });
  _presenceTimer = setInterval(beat, 25000);
}

export function stopPresence() {
  if (_presenceTimer) { clearInterval(_presenceTimer); _presenceTimer = null; }
}
```

- [ ] **Step 2: ทดสอบผ่าน console**

เปลี่ยน script ท้าย `index.html` เป็น (ชั่วคราว):

```html
<script type="module">
  import { authReady, watchClock } from './js/firebase.js';
  import * as room from './js/room.js';
  window.room = room;
  authReady().then((uid) => { watchClock(); console.log('uid', uid); });
</script>
```

เปิด `http://localhost:8080` → ใน console พิมพ์:

```js
const code = await room.createRoom({ name: 'ทดสอบ', avatar: '🦊' }); code
```

Expected: ได้ code 6 ตัวอักษร เช่น `"K7Q2NX"` — เช็คใน Firebase Console → Realtime Database เห็น `rooms/K7Q2NX/meta` (hostUid, state='lobby') และ `players/<uid>` (chips: 1000)

พิมพ์ต่อ: `await room.joinRoom('XXXXXX', { name: 'ก', avatar: '🐱' })` (code มั่ว)
Expected: โยน Error ที่ `.reason === 'not-found'`

พิมพ์ต่อ: `room.startPresence(code)` แล้วปิดแท็บ เปิดใหม่ ดูใน Firebase Console
Expected: `online` เปลี่ยนเป็น `false` ภายในไม่กี่วินาทีหลังปิดแท็บ

- [ ] **Step 3: Commit**

```bash
git add js/room.js index.html
git commit -m "feat: room create/join with code, capacity, presence heartbeat"
```

---

### Task 9: Landing UI + main.js bootstrap

**Files:**
- Modify: `index.html` (โครงจริงทั้งหมด — ทับของเดิม), `css/style.css` (ต่อท้าย)
- Create: `js/main.js`

**Interfaces:**
- Consumes: `authReady, watchClock` (firebase.js), `createRoom, joinRoom, normalizeCode, startPresence` (room.js)
- Produces:
  - `index.html` มี element id หลักที่ทุก task UI หลังจากนี้อ้างถึง: `#screen-landing, #screen-table, #inp-name, #avatar-grid, #btn-create, #inp-code, #btn-join, #landing-error, #hdr-room, #hdr-code, #btn-copy, #btn-sound, #dealer-zone, #table-status, #timer-ring, #seats, #action-bar, #modal-summary, #modal-settings, #toasts`
  - `main.js` export `enterRoom(code)` — เซฟชื่อ/avatar ลง localStorage (`pd_name`, `pd_avatar`), เรียก `startPresence`, สลับหน้าจอ, อัพเดต URL เป็น `?room=CODE`, แล้วเรียก `game.enterGame(code)` (มีจริงใน Task 12)
  - `AVATARS` — 24 emoji preset (โค้ดเต็มใน Step 3)

- [ ] **Step 1: เขียนทับ index.html ด้วยโครงเต็ม**

```html
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ป๊อกเด้งออนไลน์ 🃏</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>

<header id="hdr">
  <div class="hdr-brand">🃏 ป๊อกเด้ง</div>
  <div id="hdr-room" class="hidden">
    <span id="hdr-code" title="รหัสห้อง"></span>
    <button id="btn-copy" title="ก็อปลิงก์ชวนเพื่อน">📋</button>
  </div>
  <button id="btn-sound" title="เปิด/ปิดเสียง">🔊</button>
</header>

<main id="screen-landing">
  <section class="landing-card">
    <h1>🃏 ป๊อกเด้งออนไลน์</h1>
    <p class="sub">เล่นกับเพื่อนด้วยชิปเสมือน — ไม่ใช่เงินจริง</p>
    <label for="inp-name">ชื่อของคุณ</label>
    <input id="inp-name" maxlength="12" placeholder="เช่น ต้น" autocomplete="off">
    <label>เลือกตัวแทน</label>
    <div id="avatar-grid"></div>
    <button id="btn-create" class="btn-primary">สร้างห้องใหม่ (เป็นเจ้ามือ)</button>
    <div class="join-row">
      <input id="inp-code" maxlength="6" placeholder="รหัสห้อง 6 ตัว" autocomplete="off">
      <button id="btn-join" class="btn-secondary">เข้าห้อง</button>
    </div>
    <p id="landing-error" class="error hidden"></p>
  </section>
</main>

<main id="screen-table" class="hidden">
  <section id="table">
    <div id="dealer-zone"></div>
    <div id="table-center">
      <div id="timer-ring" class="hidden"><span id="timer-num"></span></div>
      <div id="table-status">รอเริ่มเกม…</div>
    </div>
    <div id="seats"></div>
  </section>
  <div id="action-bar"></div>
</main>

<div id="modal-summary" class="modal hidden"></div>
<div id="modal-settings" class="modal hidden"></div>
<div id="toasts"></div>

<script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: ต่อท้าย css/style.css — สไตล์ header + landing**

```css
/* ===== layout ===== */
.hidden { display: none !important; }
#hdr {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; background: var(--panel);
  position: sticky; top: 0; z-index: 20;
}
.hdr-brand { font-weight: 700; font-size: 18px; }
#hdr-room {
  display: flex; align-items: center; gap: 6px; margin-left: auto;
  background: rgba(255,255,255,.08); border-radius: 8px; padding: 4px 10px;
}
#hdr-code { font-family: ui-monospace, monospace; letter-spacing: 2px; font-weight: 700; }
#btn-copy, #btn-sound {
  background: none; border: none; font-size: 18px; cursor: pointer;
}
#btn-sound { margin-left: 8px; }
#hdr-room.hidden + #btn-sound { margin-left: auto; }

/* ===== landing ===== */
#screen-landing { display: grid; place-items: center; min-height: calc(100vh - 52px); padding: 16px; }
.landing-card {
  width: min(420px, 100%); background: var(--panel);
  border-radius: 16px; padding: 28px 24px;
  display: flex; flex-direction: column; gap: 10px;
}
.landing-card h1 { font-size: 26px; text-align: center; }
.landing-card .sub { color: var(--muted); text-align: center; margin-bottom: 8px; font-size: 14px; }
.landing-card label { font-size: 13px; color: var(--muted); margin-top: 6px; }
.landing-card input {
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.15);
  border-radius: 10px; padding: 12px; color: var(--text); font-size: 16px; width: 100%;
}
.landing-card input:focus { outline: 2px solid var(--accent); border-color: transparent; }
#avatar-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
#avatar-grid button {
  font-size: 22px; padding: 6px 0; background: rgba(255,255,255,.06);
  border: 2px solid transparent; border-radius: 10px; cursor: pointer;
}
#avatar-grid button.sel { border-color: var(--accent); background: rgba(79,157,250,.18); }
.btn-primary, .btn-secondary {
  border: none; border-radius: 10px; padding: 13px 16px;
  font-size: 16px; font-weight: 700; cursor: pointer; font-family: inherit;
}
.btn-primary { background: var(--accent); color: #08121f; margin-top: 10px; }
.btn-primary:disabled, .btn-secondary:disabled { opacity: .45; cursor: not-allowed; }
.btn-secondary { background: rgba(255,255,255,.12); color: var(--text); }
.join-row { display: flex; gap: 8px; }
.join-row input { flex: 1; text-transform: uppercase; letter-spacing: 3px; font-family: ui-monospace, monospace; }
.error { color: var(--lose); font-size: 14px; text-align: center; }
```

- [ ] **Step 3: สร้าง js/main.js**

```js
import { authReady, watchClock } from './firebase.js';
import { createRoom, joinRoom, normalizeCode, startPresence } from './room.js';

export const AVATARS = [
  '😀','😎','🥳','🤠','😇','🤓','😜','🥸',
  '🐱','🐶','🦊','🐸','🐼','🐯','🦁','🐵',
  '🐷','🐙','🦄','👻','🐨','🐰','🦉','🤖',
];

const $ = (sel) => document.querySelector(sel);
let selectedAvatar = localStorage.getItem('pd_avatar') || AVATARS[0];

function renderAvatarGrid() {
  const grid = $('#avatar-grid');
  grid.innerHTML = '';
  for (const a of AVATARS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = a;
    if (a === selectedAvatar) b.classList.add('sel');
    b.onclick = () => {
      selectedAvatar = a;
      grid.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
    };
    grid.appendChild(b);
  }
}

function showError(msg) {
  const el = $('#landing-error');
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
}

function myProfile() {
  const name = $('#inp-name').value.trim();
  if (!name) { showError('กรุณาใส่ชื่อก่อน'); return null; }
  localStorage.setItem('pd_name', name);
  localStorage.setItem('pd_avatar', selectedAvatar);
  return { name, avatar: selectedAvatar };
}

export async function enterRoom(code) {
  history.replaceState(null, '', `?room=${code}`);
  $('#hdr-code').textContent = code;
  $('#hdr-room').classList.remove('hidden');
  $('#screen-landing').classList.add('hidden');
  $('#screen-table').classList.remove('hidden');
  startPresence(code);
  const { enterGame } = await import('./game.js'); // มีจริงใน Task 12
  enterGame(code);
}

async function onCreate() {
  const profile = myProfile();
  if (!profile) return;
  $('#btn-create').disabled = true;
  try {
    const code = await createRoom(profile);
    await enterRoom(code);
  } catch (e) {
    showError(e.message);
    $('#btn-create').disabled = false;
  }
}

async function onJoin() {
  const profile = myProfile();
  if (!profile) return;
  const code = normalizeCode($('#inp-code').value);
  if (code.length !== 6) { showError('รหัสห้องต้องมี 6 ตัวอักษร'); return; }
  $('#btn-join').disabled = true;
  try {
    await joinRoom(code, profile);
    await enterRoom(code);
  } catch (e) {
    showError(e.message);
    $('#btn-join').disabled = false;
  }
}

async function boot() {
  renderAvatarGrid();
  $('#inp-name').value = localStorage.getItem('pd_name') || '';
  $('#btn-create').onclick = onCreate;
  $('#btn-join').onclick = onJoin;
  $('#btn-copy').onclick = () => {
    navigator.clipboard.writeText(location.href);
    $('#btn-copy').textContent = '✅';
    setTimeout(() => { $('#btn-copy').textContent = '📋'; }, 1200);
  };
  await authReady();
  watchClock();
  const codeFromUrl = normalizeCode(new URLSearchParams(location.search).get('room'));
  if (codeFromUrl.length === 6) $('#inp-code').value = codeFromUrl;
}

boot();
```

หมายเหตุ: `import('./game.js')` เป็น dynamic import — ก่อนถึง Task 12 ให้สร้างไฟล์ `js/game.js` ขั้นต่ำกันพัง:

```js
export function enterGame(code) {
  console.log('enterGame stub:', code);
  document.querySelector('#table-status').textContent = `อยู่ในห้อง ${code} (โต๊ะจะมาใน Task 12)`;
}
```

- [ ] **Step 4: ทดสอบ manual**

Run: `python3 -m http.server 8080` → เปิด `http://localhost:8080`
Expected ทีละข้อ:
1. เห็นฟอร์ม landing มี avatar 16 ตัว เลือกแล้วขึ้นกรอบฟ้า
2. กด "สร้างห้องใหม่" โดยไม่ใส่ชื่อ → ข้อความแดง "กรุณาใส่ชื่อก่อน"
3. ใส่ชื่อ + กดสร้าง → สลับไปหน้าโต๊ะ, header โชว์รหัส 6 ตัว, URL เปลี่ยนเป็น `?room=CODE`, status "อยู่ในห้อง CODE"
4. กด 📋 → เปลี่ยนเป็น ✅ แล้ววางลิงก์ใน notepad ได้ URL เต็ม
5. เปิดแท็บใหม่วาง URL → ช่องรหัสห้องถูก prefill → ใส่ชื่อ กดเข้าห้อง → เข้าได้
6. ใส่รหัสมั่ว `ZZZZZZ` → ข้อความแดง "ไม่พบห้องนี้"

- [ ] **Step 5: Commit**

```bash
git add index.html css/style.css js/main.js js/game.js
git commit -m "feat: landing screen - name/avatar, create/join room, share link"
```

## Phase 3: Card Renderer + Table UI

### Task 10: cards.js — วาดไพ่ emoji

**Files:**
- Create: `js/cards.js`, `tests/cards.html`
- Modify: `css/style.css` (ต่อท้าย)

**Interfaces:**
- Consumes: `rankLabel` จาก `js/pokdeng.js`
- Produces:
  - `renderCard(card: Card|null, { size = 'md', faceUp = true } = {}): HTMLElement`
    - โครง DOM (รองรับ flip animation ใน Task 19): `div.cardflip.{sm|md|lg}[.faceup] > div.cfinner > (div.cface.cfront + div.cface.cback)`
    - `card = null` + `faceUp:false` = หลังไพ่ล้วน (ไม่รู้หน้า) — front ว่าง
    - toggle เปิดไพ่ภายหลัง: `el.classList.add('faceup')` (CSS transition จัดการเอง)
  - `FACE_EMOJI = { 11: '💂', 12: '👸', 13: '🤴' }`
  - ขนาด: sm=46×64px, md=66×92px, lg=88×123px (คุมด้วย CSS class)

- [ ] **Step 1: สร้าง js/cards.js**

```js
import { rankLabel } from './pokdeng.js';

export const FACE_EMOJI = { 11: '💂', 12: '👸', 13: '🤴' };
const SUIT_EMOJI = { s: '♠️', h: '♥️', d: '♦️', c: '♣️' };
const RED_SUITS = new Set(['h', 'd']);

// ตำแหน่ง pip บน grid 3 คอลัมน์ × 7 แถว ตามผังไพ่จริง
const PIP_LAYOUT = {
  2: [[2,1],[2,7]],
  3: [[2,1],[2,4],[2,7]],
  4: [[1,1],[3,1],[1,7],[3,7]],
  5: [[1,1],[3,1],[2,4],[1,7],[3,7]],
  6: [[1,1],[3,1],[1,4],[3,4],[1,7],[3,7]],
  7: [[1,1],[3,1],[2,2],[1,4],[3,4],[1,7],[3,7]],
  8: [[1,1],[3,1],[2,2],[1,4],[3,4],[2,6],[1,7],[3,7]],
  9: [[1,1],[3,1],[1,3],[3,3],[2,4],[1,5],[3,5],[1,7],[3,7]],
  10: [[1,1],[3,1],[2,2],[1,3],[3,3],[1,5],[3,5],[2,6],[1,7],[3,7]],
};

function buildFront(card) {
  const front = document.createElement('div');
  front.className = 'cface cfront';
  if (!card) return front;
  const { r, s } = card;
  const colorClass = RED_SUITS.has(s) ? 'red' : 'blk';
  const suit = SUIT_EMOJI[s];

  for (const pos of ['tl', 'br']) {
    const cnr = document.createElement('div');
    cnr.className = `cnr ${pos} ${colorClass}`;
    cnr.innerHTML = `<b>${rankLabel(r)}</b><i>${suit}</i>`;
    front.appendChild(cnr);
  }

  const center = document.createElement('div');
  if (r === 1) {
    center.className = 'c-ace';
    center.textContent = suit;
  } else if (r >= 11) {
    center.className = 'c-face-frame';
    center.innerHTML =
      `<span class="fsuit">${suit}</span>` +
      `<span class="femoji">${FACE_EMOJI[r]}</span>` +
      `<span class="fsuit fflip">${suit}</span>`;
  } else {
    center.className = 'c-pips';
    for (const [col, row] of PIP_LAYOUT[r]) {
      const pip = document.createElement('span');
      pip.style.gridColumn = col;
      pip.style.gridRow = row;
      if (row > 4) pip.classList.add('pflip');
      pip.textContent = suit;
      center.appendChild(pip);
    }
  }
  front.appendChild(center);
  return front;
}

export function renderCard(card, { size = 'md', faceUp = true } = {}) {
  const root = document.createElement('div');
  root.className = `cardflip ${size}${faceUp ? ' faceup' : ''}`;
  const inner = document.createElement('div');
  inner.className = 'cfinner';
  const back = document.createElement('div');
  back.className = 'cface cback';
  back.innerHTML = '<div class="cback-frame">🎴</div>';
  inner.appendChild(buildFront(card));
  inner.appendChild(back);
  root.appendChild(inner);
  return root;
}
```

- [ ] **Step 2: ต่อท้าย css/style.css — สไตล์ไพ่**

```css
/* ===== playing cards (emoji) ===== */
.cardflip { perspective: 600px; flex: none; }
.cardflip.sm { width: 46px; height: 64px; --cfs: 0.52; }
.cardflip.md { width: 66px; height: 92px; --cfs: 0.75; }
.cardflip.lg { width: 88px; height: 123px; --cfs: 1; }
.cfinner {
  position: relative; width: 100%; height: 100%;
  transform-style: preserve-3d; transform: rotateY(180deg);
  transition: transform .45s ease;
}
.cardflip.faceup .cfinner { transform: rotateY(0deg); }
.cface {
  position: absolute; inset: 0; backface-visibility: hidden;
  border-radius: calc(8px * var(--cfs) + 3px);
  display: flex; align-items: center; justify-content: center;
}
.cfront { background: var(--card-face); border: 1px solid var(--card-border); }
.cback {
  background: #2c4a86; border: 1px solid #1e3767; transform: rotateY(180deg);
}
.cback-frame {
  border: calc(1.5px) solid #7d94c4; border-radius: 5px;
  width: 82%; height: 87%;
  display: flex; align-items: center; justify-content: center;
  font-size: calc(34px * var(--cfs));
}
.cnr { position: absolute; text-align: center; line-height: 1.05; }
.cnr.tl { top: calc(5px * var(--cfs)); left: calc(6px * var(--cfs)); }
.cnr.br { bottom: calc(5px * var(--cfs)); right: calc(6px * var(--cfs)); transform: rotate(180deg); }
.cnr b { display: block; font-size: calc(14px * var(--cfs) + 3px); font-weight: 700; }
.cnr i { font-style: normal; display: block; font-size: calc(10px * var(--cfs) + 2px); }
.cnr.red b { color: var(--red); }
.cnr.blk b { color: var(--black); }
.c-ace { font-size: calc(42px * var(--cfs) + 6px); }
.c-pips {
  display: grid; width: 58%; height: 74%;
  grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(7, 1fr);
  place-items: center;
  font-size: calc(13px * var(--cfs) + 3px); line-height: 1;
}
.c-pips .pflip { transform: rotate(180deg); }
.c-face-frame {
  border: 1.5px solid var(--gold); border-radius: 4px;
  width: 68%; height: 78%; padding: calc(4px * var(--cfs)) 0;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
}
.c-face-frame .femoji { font-size: calc(34px * var(--cfs) + 4px); }
.c-face-frame .fsuit { font-size: calc(11px * var(--cfs) + 2px); }
.c-face-frame .fflip { transform: rotate(180deg); }
```

- [ ] **Step 3: สร้าง tests/cards.html (eyeball test)**

```html
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>ทดสอบไพ่ทั้งสำรับ</title>
<link rel="stylesheet" href="../css/style.css">
<style>
  body { padding: 20px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
  h2 { margin: 12px 0; font-size: 16px; }
</style>
</head>
<body>
<h1>ไพ่ครบสำรับ 52 ใบ + หลังไพ่ (คลิกไพ่เพื่อพลิก)</h1>
<div id="all"></div>
<script type="module">
  import { newDeck } from '../js/pokdeng.js';
  import { renderCard } from '../js/cards.js';
  const all = document.getElementById('all');
  const bySuit = { s: [], h: [], d: [], c: [] };
  for (const c of newDeck()) bySuit[c.s].push(c);
  for (const s of ['s', 'h', 'd', 'c']) {
    const h2 = document.createElement('h2');
    h2.textContent = { s: '♠️ โพดำ', h: '♥️ หัวใจ', d: '♦️ ข้าวหลามตัด', c: '♣️ ดอกจิก' }[s];
    all.appendChild(h2);
    const row = document.createElement('div');
    row.className = 'row';
    for (const c of bySuit[s]) row.appendChild(renderCard(c, { size: 'md' }));
    all.appendChild(row);
  }
  const h2 = document.createElement('h2');
  h2.textContent = 'หลังไพ่ 3 ขนาด + คลิกพลิก';
  all.appendChild(h2);
  const row = document.createElement('div');
  row.className = 'row';
  for (const size of ['sm', 'md', 'lg']) {
    const el = renderCard({ r: 12, s: 'h' }, { size, faceUp: false });
    el.style.cursor = 'pointer';
    el.onclick = () => el.classList.toggle('faceup');
    row.appendChild(el);
  }
  all.appendChild(row);
</script>
</body>
</html>
```

- [ ] **Step 4: ทดสอบด้วยตา**

Run: `python3 -m http.server 8080` → เปิด `http://localhost:8080/tests/cards.html`
Expected:
1. เห็นไพ่ครบ 52 ใบ แยก 4 ดอก — เลขแดงเฉพาะ ♥️♦️
2. pip ไพ่ 2–10 จำนวนตรงกับเลข และครึ่งล่างกลับหัว
3. A เป็นดอกใหญ่กลางใบ, J=💂 Q=👸 K=🤴 อยู่ในกรอบทอง มีดอกเล็กบน-ล่าง
4. แถวล่าง: หลังไพ่น้ำเงิน 🎴 สามขนาด คลิกแล้วพลิกเปิดอย่างนุ่มนวล (หมุน 3D)
5. ไม่มี error ใน console

- [ ] **Step 5: Commit**

```bash
git add js/cards.js css/style.css tests/cards.html
git commit -m "feat: emoji card renderer - pips, face cards, flip structure"
```

---

### Task 11: โต๊ะเกม + ui.js (lobby state)

**Files:**
- Create: `js/ui.js`
- Modify: `css/style.css` (ต่อท้าย), `js/game.js` (ยังเป็น stub — ทำให้ render จริง)

**Interfaces:**
- Consumes: `renderCard` (cards.js), `evaluate, rankLabel` (pokdeng.js)
- Produces (game.js/dealer.js เรียกใน Task 12-18):
  - `ui.renderAll(S)` — วาดทุกโซนจาก state `S` (โครง `S` นิยามด้านล่าง)
  - `ui.toast(msg: string)` — ข้อความลอย 2.5 วิ
  - `ui.setStatus(text: string)` — แถบสถานะกลางโต๊ะ
  - `ui.showSummary(html: string)` / `ui.hideModals()`
  - `ui.onAction(handler)` — ปุ่มใน action bar ทั้งหมดยิง `handler(actionName, payload)` — ชื่อ action: `'start-betting' | 'deal' | 'bet' | 'hit' | 'stay' | 'dealer-hit' | 'dealer-stay' | 'next-round' | 'to-lobby' | 'rebuy' | 'claim-host' | 'transfer-host' | 'open-settings' | 'save-settings'`
- **โครง state กลาง `S`** (สร้าง/อัพเดตโดย game.js — อ่านอย่างเดียวจาก ui):

```js
S = {
  code: 'K7Q2NX',
  uid: '<my uid>',
  meta: { hostUid, state, round, minBet, maxBet, turnDeadline },
  players: { [uid]: { name, avatar, chips, online, lastSeen, rebuys, joinedRound, joinedAt } },
  bets: { [uid]: number },
  actions: { [uid]: 'hit'|'stay' },
  hands: { [uid]: Card[] },      // เท่าที่ตัวเองมีสิทธิ์เห็น (ของตัวเอง + ตอน reveal ทุกคน)
  handCounts: { [uid]: number }, // จำนวนใบของแต่ละคน (นับจาก actions + สถานะ — ดู Task 13/14)
  revealed: { [uid]: true },     // ใครป๊อก/ถูกเปิดก่อน reveal
  results: { [uid]: { delta, rankName, deng, points } },
  amHost: boolean,
  amParticipant: boolean,        // joinedRound <= meta.round และวางเดิมพันได้
}
```

- [ ] **Step 1: ต่อท้าย css/style.css — โต๊ะ + seat**

```css
/* ===== table ===== */
#screen-table { display: flex; flex-direction: column; min-height: calc(100vh - 52px); }
#table {
  flex: 1; margin: 12px; padding: 16px;
  background: var(--felt); border: 3px solid var(--felt-dark); border-radius: 24px;
  display: flex; flex-direction: column; gap: 14px;
  max-width: 980px; width: calc(100% - 24px); align-self: center;
}
#dealer-zone { display: flex; justify-content: center; }
#table-center { display: flex; flex-direction: column; align-items: center; gap: 8px; min-height: 66px; }
#table-status {
  background: rgba(0,0,0,.28); color: #f2f7f2;
  padding: 6px 16px; border-radius: 99px; font-size: 14px; text-align: center;
}
#seats {
  display: grid; gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}
.seat {
  background: rgba(0,0,0,.18); border-radius: 14px; padding: 10px;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  border: 2px solid transparent; min-height: 150px;
}
.seat.me { border-color: rgba(79,157,250,.55); }
.seat.offline { opacity: .45; }
.seat.dealer-seat { background: rgba(0,0,0,.3); min-width: 200px; }
.seat .cards { display: flex; gap: 4px; min-height: 64px; align-items: center; }
.seat .who { font-size: 13px; color: #eef5ee; display: flex; align-items: center; gap: 4px; }
.seat .who .av { font-size: 18px; }
.seat .chips { font-size: 12px; color: #cfe3cf; }
.seat .chips.neg { color: var(--lose); font-weight: 700; }
.seat .bet { font-size: 12px; color: #ffd76e; }
.badge {
  font-size: 11px; padding: 2px 8px; border-radius: 99px;
  background: rgba(255,255,255,.14); color: #fff;
}
.badge.pok { background: #ffd76e; color: #4a3800; font-weight: 700; }
.badge.win { background: var(--win); color: #06331d; font-weight: 700; }
.badge.lose { background: var(--lose); color: #3d0a0a; font-weight: 700; }
.badge.draw { background: rgba(255,255,255,.3); }

/* ===== action bar ===== */
#action-bar {
  position: sticky; bottom: 0; padding: 10px 16px 14px;
  background: linear-gradient(transparent, rgba(0,0,0,.35) 30%);
  display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
}
#action-bar .btn-primary, #action-bar .btn-secondary { min-width: 110px; }
#action-bar .bet-controls { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: center; }
#action-bar .bet-controls input {
  width: 90px; text-align: center;
  background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2);
  border-radius: 8px; padding: 10px; color: var(--text); font-size: 16px;
}

/* ===== modal & toast ===== */
.modal {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  display: grid; place-items: center; z-index: 50; padding: 16px;
}
.modal .modal-card {
  background: var(--panel); border-radius: 16px; padding: 22px;
  width: min(460px, 100%); max-height: 80vh; overflow-y: auto;
}
.modal h2 { font-size: 18px; margin-bottom: 12px; }
.modal table { width: 100%; border-collapse: collapse; font-size: 14px; }
.modal td, .modal th { padding: 6px 4px; text-align: left; border-bottom: 1px solid rgba(255,255,255,.08); }
.modal td.num { text-align: right; font-variant-numeric: tabular-nums; }
.modal .pos { color: var(--win); } .modal .neg { color: var(--lose); }
#toasts { position: fixed; top: 60px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; z-index: 60; pointer-events: none; }
.toast {
  background: rgba(20,26,36,.95); border: 1px solid rgba(255,255,255,.15);
  padding: 8px 18px; border-radius: 99px; font-size: 14px;
  animation: toast-in .2s ease;
}
@keyframes toast-in { from { opacity: 0; transform: translateY(-8px); } }

/* ===== timer ring ===== */
#timer-ring {
  width: 44px; height: 44px; border-radius: 50%;
  display: grid; place-items: center;
  background: conic-gradient(var(--accent) var(--pct, 100%), rgba(255,255,255,.15) 0);
}
#timer-ring span {
  width: 34px; height: 34px; border-radius: 50%; background: var(--felt-dark);
  display: grid; place-items: center; font-size: 13px; font-weight: 700;
}

/* ===== mobile ===== */
@media (max-width: 620px) {
  #table { padding: 10px; margin: 8px; }
  #seats { grid-template-columns: repeat(2, 1fr); }
  .cardflip.lg { width: 66px; height: 92px; --cfs: 0.75; }
}
```

- [ ] **Step 2: สร้าง js/ui.js**

```js
import { renderCard } from './cards.js';

const $ = (sel) => document.querySelector(sel);
let actionHandler = () => {};
export function onAction(h) { actionHandler = h; }

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

export function setStatus(text) { $('#table-status').textContent = text; }

export function showSummary(html) {
  const m = $('#modal-summary');
  m.innerHTML = `<div class="modal-card">${html}</div>`;
  m.classList.remove('hidden');
  m.onclick = (e) => { if (e.target === m) hideModals(); };
}
export function hideModals() {
  $('#modal-summary').classList.add('hidden');
  $('#modal-settings').classList.add('hidden');
}

function btn(label, action, payload, cls = 'btn-secondary') {
  const b = document.createElement('button');
  b.className = cls;
  b.textContent = label;
  b.onclick = () => actionHandler(action, payload);
  return b;
}

const STATE_LABEL = {
  lobby: 'ล็อบบี้ — รอเจ้ามือเริ่มเกม',
  betting: 'วางเดิมพันได้เลย!',
  dealing: 'กำลังแจกไพ่…',
  acting: 'ผู้เล่นเลือก จั่ว หรือ อยู่',
  dealerTurn: 'ตาเจ้ามือตัดสินใจ',
  reveal: 'เปิดไพ่!',
  settled: 'จบรอบ — ดูผลได้เลย',
};

function seatCards(S, pid) {
  const wrap = document.createElement('div');
  wrap.className = 'cards';
  const isMe = pid === S.uid;
  const canSee = isMe || ['reveal', 'settled'].includes(S.meta.state) || S.revealed[pid];
  const cards = S.hands[pid];
  const count = cards ? cards.length : (S.handCounts[pid] || 0);
  for (let i = 0; i < count; i++) {
    const card = canSee && cards ? cards[i] : null;
    wrap.appendChild(renderCard(card, { size: isMe ? 'lg' : 'md', faceUp: Boolean(card) }));
  }
  return wrap;
}

function seatEl(S, pid, isDealerSeat) {
  const p = S.players[pid];
  const seat = document.createElement('div');
  seat.className = 'seat';
  if (isDealerSeat) seat.classList.add('dealer-seat');
  if (pid === S.uid) seat.classList.add('me');
  if (!p.online) seat.classList.add('offline');

  seat.appendChild(seatCards(S, pid));

  const who = document.createElement('div');
  who.className = 'who';
  who.innerHTML = `<span class="av">${isDealerSeat ? '🎩' : p.avatar}</span> ${p.name}${pid === S.uid ? ' (คุณ)' : ''}`;
  seat.appendChild(who);

  const chips = document.createElement('div');
  chips.className = 'chips' + (p.chips < 0 ? ' neg' : '');
  chips.textContent = `💰 ${p.chips.toLocaleString()}`;
  seat.appendChild(chips);

  const st = S.meta.state;
  const badges = document.createElement('div');
  if (!isDealerSeat && S.bets[pid] != null && ['betting','dealing','acting','dealerTurn','reveal','settled'].includes(st)) {
    const bet = document.createElement('div');
    bet.className = 'bet';
    bet.textContent = `🔵 เดิมพัน ${S.bets[pid]}`;
    seat.appendChild(bet);
  }
  if (S.revealed[pid] && ['dealing','acting','dealerTurn'].includes(st)) {
    badges.innerHTML = '<span class="badge pok">ป๊อก!</span>';
  } else if (st === 'acting' && !isDealerSeat && S.bets[pid] != null && !S.revealed[pid]) {
    badges.innerHTML = S.actions[pid]
      ? `<span class="badge">${S.actions[pid] === 'hit' ? 'จั่วแล้ว' : 'อยู่'}</span>`
      : '<span class="badge">กำลังคิด…</span>';
  } else if (['reveal','settled'].includes(st) && S.results[pid]) {
    const r = S.results[pid];
    const cls = r.delta > 0 ? 'win' : r.delta < 0 ? 'lose' : 'draw';
    const sign = r.delta > 0 ? `+${r.delta}` : r.delta < 0 ? `${r.delta}` : 'เสมอ';
    badges.innerHTML = `<span class="badge ${cls}">${r.rankName}${r.deng > 1 ? ` ×${r.deng}` : ''} · ${sign}</span>`;
  } else if (st === 'lobby' && !p.online) {
    badges.innerHTML = '<span class="badge">ออฟไลน์</span>';
  } else if (!isDealerSeat && S.meta.round > 0 && p.joinedRound > S.meta.round) {
    badges.innerHTML = '<span class="badge">รอรอบหน้า</span>';
  }
  if (badges.innerHTML) seat.appendChild(badges);
  return seat;
}

function renderSeats(S) {
  const dz = $('#dealer-zone');
  dz.innerHTML = '';
  if (S.players[S.meta.hostUid]) dz.appendChild(seatEl(S, S.meta.hostUid, true));

  const seats = $('#seats');
  seats.innerHTML = '';
  const others = Object.keys(S.players)
    .filter((pid) => pid !== S.meta.hostUid)
    .sort((a, b) => (S.players[a].joinedAt || 0) - (S.players[b].joinedAt || 0));
  for (const pid of others) seats.appendChild(seatEl(S, pid, false));
}

function renderActionBar(S) {
  const bar = $('#action-bar');
  bar.innerHTML = '';
  const st = S.meta.state;
  const me = S.players[S.uid];
  if (!me) return;

  if (S.amHost) {
    if (st === 'lobby' || st === 'settled') {
      bar.appendChild(btn(st === 'lobby' ? '▶️ เริ่มเกม' : '▶️ รอบต่อไป', st === 'lobby' ? 'start-betting' : 'next-round', null, 'btn-primary'));
      if (st === 'settled') bar.appendChild(btn('🏠 กลับล็อบบี้', 'to-lobby'));
      bar.appendChild(btn('⚙️ ตั้งค่า', 'open-settings'));
      bar.appendChild(btn('🎩 ส่งต่อเจ้ามือ', 'transfer-host'));
    } else if (st === 'betting') {
      const betCount = Object.keys(S.bets).length;
      const b = btn(`🃏 แจกไพ่ (${betCount} คนวางแล้ว)`, 'deal', null, 'btn-primary');
      b.disabled = betCount === 0;
      bar.appendChild(b);
    } else if (st === 'dealerTurn') {
      bar.appendChild(btn('🃏 จั่ว', 'dealer-hit', null, 'btn-primary'));
      bar.appendChild(btn('✋ อยู่', 'dealer-stay'));
    }
  } else {
    if (st === 'betting' && S.amParticipant && S.bets[S.uid] == null) {
      const wrap = document.createElement('div');
      wrap.className = 'bet-controls';
      const input = document.createElement('input');
      input.type = 'number';
      input.min = S.meta.minBet; input.max = Math.min(S.meta.maxBet, me.chips);
      input.value = Math.min(S.meta.minBet * 2, me.chips);
      for (const v of [10, 20, 50, 100]) {
        if (v <= Math.min(S.meta.maxBet, me.chips) && v >= S.meta.minBet) {
          wrap.appendChild(btn(String(v), 'noop', null)).onclick = () => { input.value = v; };
        }
      }
      wrap.appendChild(input);
      const go = btn('วางเดิมพัน 🔵', 'bet', null, 'btn-primary');
      go.onclick = () => actionHandler('bet', Number(input.value));
      wrap.appendChild(go);
      bar.appendChild(wrap);
    } else if (st === 'acting' && S.bets[S.uid] != null && !S.revealed[S.uid] && !S.actions[S.uid]) {
      bar.appendChild(btn('🃏 จั่ว', 'hit', null, 'btn-primary'));
      bar.appendChild(btn('✋ อยู่', 'stay'));
    }
  }
  // ปุ่มร่วมทุกบท
  if (me.chips < S.meta.minBet && ['lobby', 'betting', 'settled'].includes(st)) {
    bar.appendChild(btn('➕ เติมชิป 1,000', 'rebuy'));
  }
  if (!S.amHost && S.hostStale) {
    bar.appendChild(btn('🎩 รับเป็นเจ้ามือแทน', 'claim-host', null, 'btn-primary'));
  }
}

export function renderAll(S) {
  setStatus(STATE_LABEL[S.meta.state] || S.meta.state);
  renderSeats(S);
  renderActionBar(S);
}
```

หมายเหตุ interface เพิ่ม: `S.hostStale: boolean` (game.js คำนวณจาก lastSeen เจ้ามือ > 60 วิ — Task 18) และ action `'noop'` ไม่ต้อง handle

- [ ] **Step 3: อัพเดต js/game.js stub ให้ render lobby จริง**

เขียนทับ `js/game.js` (ยังไม่มี game loop — แค่ subscribe meta/players แล้ววาด):

```js
import { db, F, uid, serverNow } from './firebase.js';
import * as ui from './ui.js';

export const S = {
  code: null, uid: null,
  meta: { hostUid: null, state: 'lobby', round: 0, minBet: 10, maxBet: 200, turnDeadline: null },
  players: {},
  bets: {}, actions: {}, hands: {}, handCounts: {}, revealed: {}, results: {},
  amHost: false, amParticipant: false, hostStale: false,
};

function recompute() {
  S.amHost = S.meta.hostUid === S.uid;
  const me = S.players[S.uid];
  S.amParticipant = Boolean(me && me.joinedRound <= S.meta.round);
  ui.renderAll(S);
}

export function enterGame(code) {
  S.code = code;
  S.uid = uid();
  F.onValue(F.ref(db, `rooms/${code}/meta`), (snap) => {
    if (!snap.exists()) return;
    S.meta = snap.val();
    recompute();
  });
  F.onValue(F.ref(db, `rooms/${code}/players`), (snap) => {
    S.players = snap.val() || {};
    recompute();
  });
  ui.onAction(handleAction);
}

function handleAction(action, payload) {
  console.log('action:', action, payload); // ต่อจริงใน Task 12-18
}
```

- [ ] **Step 4: ทดสอบ manual (2 แท็บ)**

Run: เปิด `http://localhost:8080` สองแท็บ — แท็บแรกสร้างห้อง, แท็บสองเข้าห้องด้วยรหัส
Expected:
1. แท็บแรก: เห็นตัวเองใน dealer-zone มี 🎩, action bar มีปุ่ม "เริ่มเกม / ตั้งค่า / ส่งต่อเจ้ามือ"
2. แท็บสอง: เห็นเจ้ามือบน + ตัวเองเป็น seat ล่าง (ขอบฟ้า มีคำว่า "(คุณ)"), ไม่มีปุ่มเจ้ามือ
3. เข้าคนที่ 3 → ทุกแท็บเห็น seat ใหม่โผล่แบบ realtime ไม่ต้องรีเฟรช
4. ปิดแท็บสอง → seat นั้นจางลง (offline) ภายใน ~5 วิ
5. กดปุ่มใด ๆ → console log `action: ...` (ยังไม่ทำงานจริง — ถูกต้อง)
6. ย่อจอมือถือ (DevTools) → seat เรียง 2 คอลัมน์ อ่านง่าย

- [ ] **Step 5: Commit**

```bash
git add js/ui.js js/game.js css/style.css
git commit -m "feat: game table UI - felt, seats, dealer zone, action bar (lobby)"
```

## Phase 4: Game Loop

**ภาพรวม 4 tasks นี้:** game.js เป็น "ตา" ของทุก client (subscribe ทุก path ที่มีสิทธิ์ → อัพเดต `S` → `ui.renderAll`) ส่วน dealer.js เป็น "มือ" ที่ทำงานเฉพาะเครื่องเจ้ามือแบบ **reactive-idempotent**: ทุกครั้งที่ `S` เปลี่ยน (และทุก 1 วิ) จะเช็คว่า state ปัจจุบันขาดอะไรแล้วเขียนเติม — ออกแบบแบบนี้ทำให้เจ้ามือรีเฟรชหน้าแล้ว engine เดินต่อเองได้ (Task 16 แค่ทดสอบซ้ำ ไม่ต้องเขียนโค้ด resume พิเศษ)

### Task 12: game.js — subscribe ครบทุก path + คำสั่งฝั่งผู้เล่น

**Files:**
- Modify: `js/game.js` (เขียนทับทั้งไฟล์), `js/ui.js` (เพิ่ม `updateTimer`)

**Interfaces:**
- Consumes: `F, db, uid, serverNow` (firebase.js), `ui.*`, `dealerTick, dealerCommand` (dealer.js — สร้าง stub ในไฟล์ใหม่)
- Produces:
  - `S` (export) — state กลางตามนิยาม Task 11 + เพิ่ม `deck: Card[]|null` (เจ้ามือเท่านั้น), `dealerDrew: boolean`
  - `enterGame(code)` — attach listeners: `meta`, `players` ตลอดชีพ; ต่อรอบ: `bets, actions, revealed, results, dealerDrew, hands/<uid ตัวเอง>`; เมื่อ state เป็น `reveal|settled` attach `hands` ทั้งก้อน; เมื่อเป็นเจ้ามือ attach `deck`
  - การเขียนฝั่งผู้เล่น: `bet` (set ครั้งเดียว), `hit|stay` (set ครั้งเดียว), `rebuy` (transaction +1,000 เมื่อ chips < minBet)
  - `ui.updateTimer(msLeft: number|null, msTotal: number)` — วงแหวนนับถอยหลัง (null = ซ่อน)

- [ ] **Step 1: เพิ่ม updateTimer ใน js/ui.js (ต่อท้าย)**

```js
export function updateTimer(msLeft, msTotal) {
  const ring = $('#timer-ring');
  if (msLeft == null) { ring.classList.add('hidden'); return; }
  ring.classList.remove('hidden');
  const pct = Math.max(0, Math.min(100, (msLeft / msTotal) * 100));
  ring.style.setProperty('--pct', `${pct}%`);
  $('#timer-num').textContent = String(Math.ceil(msLeft / 1000));
}
```

- [ ] **Step 2: เขียนทับ js/game.js ทั้งไฟล์**

```js
import { db, F, uid, serverNow } from './firebase.js';
import * as ui from './ui.js';
import { dealerTick, dealerCommand } from './dealer.js';

export const S = {
  code: null, uid: null,
  meta: { hostUid: null, state: 'lobby', round: 0, minBet: 10, maxBet: 200, turnDeadline: null },
  players: {},
  bets: {}, actions: {}, hands: {}, handCounts: {}, revealed: {}, results: {},
  deck: null, dealerDrew: false,
  amHost: false, amParticipant: false, hostStale: false,
};

const IN_ROUND_STATES = ['dealing', 'acting', 'dealerTurn', 'reveal', 'settled'];

function computeHandCounts() {
  const counts = {};
  const past = IN_ROUND_STATES.includes(S.meta.state);
  for (const pid of Object.keys(S.bets)) {
    counts[pid] = S.hands[pid]?.length ?? (past ? 2 + (S.actions[pid] === 'hit' ? 1 : 0) : 0);
  }
  const host = S.meta.hostUid;
  if (host) {
    counts[host] = S.hands[host]?.length ?? (past ? 2 + (S.dealerDrew ? 1 : 0) : 0);
  }
  S.handCounts = counts;
}

let lastRenderedState = null;
function recompute() {
  S.amHost = S.meta.hostUid === S.uid;
  const me = S.players[S.uid];
  S.amParticipant = Boolean(me && me.joinedRound <= S.meta.round);
  computeHandCounts();
  ui.renderAll(S);
  onStateTransition();
  dealerTick(S);
}

function onStateTransition() {
  if (S.meta.state === lastRenderedState) return;
  lastRenderedState = S.meta.state;
  if (S.meta.state === 'settled') showRoundSummary();
  if (S.meta.state === 'betting') ui.hideModals();
}

function showRoundSummary() {
  // เติมเต็มใน Task 15 (ต้องมี results ครบก่อน)
}

// ---------- listeners ----------
let roundUnsubs = [];
let attachedRound = null;
let handsAllUnsub = null;
let deckUnsub = null;

function resetRoundData() {
  Object.assign(S, {
    bets: {}, actions: {}, hands: {}, handCounts: {}, revealed: {},
    results: {}, deck: null, dealerDrew: false,
  });
}

function sub(path, apply) {
  return F.onValue(F.ref(db, `rooms/${S.code}/${path}`), (snap) => {
    apply(snap.val());
    recompute();
  }, (err) => console.warn('listener denied:', path, err.code));
}

function attachRound(n) {
  roundUnsubs.forEach((u) => u());
  roundUnsubs = [];
  if (handsAllUnsub) { handsAllUnsub(); handsAllUnsub = null; }
  if (deckUnsub) { deckUnsub(); deckUnsub = null; }
  attachedRound = n;
  resetRoundData();
  if (n < 1) return;
  roundUnsubs.push(sub(`rounds/${n}/bets`, (v) => { S.bets = v || {}; }));
  roundUnsubs.push(sub(`rounds/${n}/actions`, (v) => { S.actions = v || {}; }));
  roundUnsubs.push(sub(`rounds/${n}/revealed`, (v) => { S.revealed = v || {}; }));
  roundUnsubs.push(sub(`rounds/${n}/results`, (v) => { S.results = v || {}; }));
  roundUnsubs.push(sub(`rounds/${n}/dealerDrew`, (v) => { S.dealerDrew = Boolean(v); }));
  roundUnsubs.push(sub(`rounds/${n}/hands/${S.uid}`, (v) => {
    if (v) S.hands = { ...S.hands, [S.uid]: v };
  }));
  syncPrivilegedListeners();
}

function syncPrivilegedListeners() {
  const n = attachedRound;
  if (n < 1) return;
  // เปิดไพ่ทุกคนเมื่อถึง reveal/settled (rules เพิ่งอนุญาตให้อ่าน)
  if (['reveal', 'settled'].includes(S.meta.state) && !handsAllUnsub) {
    handsAllUnsub = sub(`rounds/${n}/hands`, (v) => { S.hands = v || {}; });
  }
  // เจ้ามือเห็น deck + ไพ่ทุกคนตลอดรอบ
  if (S.amHost && !deckUnsub) {
    deckUnsub = sub(`rounds/${n}/deck`, (v) => { S.deck = v || []; });
    if (!handsAllUnsub) {
      handsAllUnsub = sub(`rounds/${n}/hands`, (v) => { S.hands = v || {}; });
    }
  }
}

export function enterGame(code) {
  S.code = code;
  S.uid = uid();
  F.onValue(F.ref(db, `rooms/${code}/meta`), (snap) => {
    if (!snap.exists()) { ui.toast('ห้องถูกปิดแล้ว'); return; }
    S.meta = snap.val();
    S.amHost = S.meta.hostUid === S.uid;
    if (S.meta.round !== attachedRound) attachRound(S.meta.round);
    else syncPrivilegedListeners();
    recompute();
  });
  F.onValue(F.ref(db, `rooms/${code}/players`), (snap) => {
    S.players = snap.val() || {};
    recompute();
  });
  ui.onAction(handleAction);
  startTimerLoop();
}

// ---------- countdown ----------
const STATE_DURATION = { acting: 30000, dealerTurn: 45000 };
function startTimerLoop() {
  setInterval(() => {
    const dl = S.meta.turnDeadline;
    const total = STATE_DURATION[S.meta.state];
    if (!dl || !total) { ui.updateTimer(null, 0); return; }
    ui.updateTimer(Math.max(0, dl - serverNow()), total);
  }, 250);
}

// ---------- actions ----------
async function handleAction(action, payload) {
  const code = S.code;
  const n = S.meta.round;
  try {
    switch (action) {
      case 'bet': {
        const me = S.players[S.uid];
        const amt = Math.floor(Number(payload));
        const cap = Math.min(S.meta.maxBet, me.chips);
        if (!Number.isFinite(amt) || amt < S.meta.minBet || amt > cap) {
          ui.toast(`เดิมพันต้องอยู่ระหว่าง ${S.meta.minBet}–${cap}`);
          return;
        }
        await F.set(F.ref(db, `rooms/${code}/rounds/${n}/bets/${S.uid}`), amt);
        break;
      }
      case 'hit':
      case 'stay':
        if (S.actions[S.uid]) return; // กันกดซ้ำ
        await F.set(F.ref(db, `rooms/${code}/rounds/${n}/actions/${S.uid}`), action);
        break;
      case 'rebuy':
        await F.runTransaction(F.ref(db, `rooms/${code}/players/${S.uid}`), (p) => {
          if (!p || p.chips >= S.meta.minBet) return; // abort
          return { ...p, chips: p.chips + 1000, rebuys: (p.rebuys || 0) + 1 };
        });
        ui.toast('เติมชิป +1,000 แล้ว 🎉');
        break;
      case 'noop':
        break;
      default:
        if (S.amHost) await dealerCommand(action, payload, S);
    }
  } catch (e) {
    console.error(action, e);
    ui.toast('ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง');
  }
}
```

- [ ] **Step 3: สร้าง js/dealer.js เป็น stub (เติมจริง Task 13)**

```js
export function dealerTick(S) {}
export async function dealerCommand(action, payload, S) {
  console.log('dealerCommand stub:', action, payload);
}
```

- [ ] **Step 4: ทดสอบ manual**

เปิด 2 แท็บ (เจ้ามือ + ผู้เล่น) — ยังเริ่มเกมไม่ได้ (dealer เป็น stub) แต่ต้องเช็ค:
1. ไม่มี error ใน console ทั้งสองแท็บ
2. แท็บผู้เล่น: กด "เติมชิป" ไม่ได้เพราะชิป 1,000 ≥ minBet → ปุ่มไม่ขึ้น (ถูกต้อง)
3. console แท็บเจ้ามือ: พิมพ์ `(await import('./js/game.js')).S` → เห็น meta/players ครบ

- [ ] **Step 5: Commit**

```bash
git add js/game.js js/ui.js js/dealer.js
git commit -m "feat: full state sync, player commands (bet/hit/stay/rebuy), countdown UI"
```

---

### Task 13: dealer.js — เริ่มรอบ, แจกไพ่, เช็คป๊อก

**Files:**
- Modify: `js/dealer.js` (เขียนทับทั้งไฟล์)

**Interfaces:**
- Consumes: `newDeck, shuffle, evaluate, settleRound, CATEGORY` (pokdeng.js), `F, db, serverNow` (firebase.js), `S` ผ่าน parameter (ห้าม import game.js — กัน circular import)
- Produces:
  - `dealerTick(S)` — เก็บ S ล่าสุด + เรียก `maybeAdvance()`; มี `setInterval(maybeAdvance, 1000)` ในโมดูล
  - `dealerCommand(action, payload, S)` — รับ: `start-betting, next-round, deal, dealer-hit, dealer-stay, to-lobby` (host tools อื่นมาใน Task 17)
  - พฤติกรรม `deal`: สับ → แจก 2 ใบ (ผู้วางเดิมพัน + เจ้ามือ) → state `dealing` (โชว์ animation 900ms) → ป๊อกถูก mark ใน `revealed` → ต่อเป็น `acting`(+30 วิ) หรือถ้าเจ้ามือป๊อก/ผู้เล่นป๊อกครบทุกคน ข้ามไป reveal เลย (ฟังก์ชัน `revealAndSettle` เป็น stub ใน task นี้ — เติม Task 15)
  - ค่าคงที่: `ACT_MS = 30000`, `DEALER_MS = 45000`, `REVEAL_HOLD_MS = 2400`, `KEEP_ROUNDS = 5`

- [ ] **Step 1: เขียนทับ js/dealer.js**

```js
import { db, F, serverNow } from './firebase.js';
import { newDeck, shuffle, evaluate, settleRound, CATEGORY } from './pokdeng.js';

const ACT_MS = 30000;
const DEALER_MS = 45000;
const REVEAL_HOLD_MS = 2400;
const KEEP_ROUNDS = 5;

let lastS = null;
let busy = false;

export function dealerTick(S) {
  lastS = S;
  maybeAdvance();
}
setInterval(maybeAdvance, 1000);

const roomPath = (S) => `rooms/${S.code}`;
const rPath = (S) => `${roomPath(S)}/rounds/${S.meta.round}`;

function isPok(hand) {
  const cat = evaluate(hand).category;
  return cat === CATEGORY.POK8 || cat === CATEGORY.POK9;
}

export async function dealerCommand(action, payload, S) {
  switch (action) {
    case 'start-betting':
    case 'next-round': return startBetting(S);
    case 'deal': return dealCards(S);
    case 'dealer-hit': return dealerHit(S);
    case 'dealer-stay': return revealAndSettle(S);
    case 'to-lobby':
      return F.update(F.ref(db, `${roomPath(S)}/meta`), { state: 'lobby', turnDeadline: null });
    default:
      console.warn('unknown dealer command', action);
  }
}

async function startBetting(S) {
  if (!['lobby', 'settled'].includes(S.meta.state)) return;
  const n = S.meta.round + 1;
  const updates = {
    'meta/state': 'betting',
    'meta/round': n,
    'meta/turnDeadline': null,
  };
  const old = n - KEEP_ROUNDS;
  if (old >= 1) updates[`rounds/${old}`] = null; // prune รอบเก่า
  await F.update(F.ref(db, roomPath(S)), updates);
}

async function dealCards(S) {
  if (S.meta.state !== 'betting') return;
  const bettors = Object.keys(S.bets);
  if (bettors.length === 0) return;

  let deck = shuffle(newDeck());
  const hands = {};
  for (const pid of bettors) hands[pid] = [deck.pop(), deck.pop()];
  const host = S.meta.hostUid;
  hands[host] = [deck.pop(), deck.pop()];

  const revealed = {};
  for (const pid of bettors) if (isPok(hands[pid])) revealed[pid] = true;
  const dealerPok = isPok(hands[host]);
  if (dealerPok) revealed[host] = true;

  await F.update(F.ref(db, roomPath(S)), {
    [`rounds/${S.meta.round}/deck`]: deck,
    [`rounds/${S.meta.round}/hands`]: hands,
    [`rounds/${S.meta.round}/revealed`]: Object.keys(revealed).length ? revealed : null,
    'meta/state': 'dealing',
    'meta/turnDeadline': null,
  });

  const everyPlayerPok = bettors.every((pid) => revealed[pid]);
  setTimeout(async () => {
    if (dealerPok || everyPlayerPok) {
      await revealAndSettle(lastS);
    } else {
      await F.update(F.ref(db, `${roomPath(S)}/meta`), {
        state: 'acting',
        turnDeadline: serverNow() + ACT_MS,
      });
    }
  }, 900); // รอ animation แจกไพ่
}

async function dealerHit(S) {
  // เติมจริงใน Task 14
}

export async function revealAndSettle(S) {
  // เติมจริงใน Task 15
  console.log('revealAndSettle stub');
}

async function maybeAdvance() {
  // เติมจริงใน Task 14 (auto-advance acting/dealerTurn ตาม deadline)
}
```

- [ ] **Step 2: ทดสอบ manual (2 แท็บ)**

1. เจ้ามือกด "เริ่มเกม" → ทั้งสองแท็บ status เปลี่ยนเป็น "วางเดิมพันได้เลย!" และแท็บผู้เล่นเห็นช่องวางเดิมพัน + ปุ่ม preset
2. ผู้เล่นใส่ 50 กด "วางเดิมพัน" → แท็บเจ้ามือเห็น "🔵 เดิมพัน 50" ใต้ seat และปุ่มแจกไพ่ขึ้น "(1 คนวางแล้ว)"
3. ผู้เล่นใส่เดิมพัน 5,000 → toast แดงเตือน ไม่ถูกเขียน
4. เจ้ามือกด "แจกไพ่" → ผู้เล่นเห็นไพ่ตัวเอง 2 ใบ **หงายหน้า**, เห็นไพ่เจ้ามือ 2 ใบ **คว่ำ**, เจ้ามือเห็นไพ่ทุกคน (ตัวเองหงาย — dealer อ่าน hands ได้หมดจึง render หงายฝั่งเจ้ามือ: ยอมรับได้เพราะเป็นเครื่องเจ้ามือเอง)
5. ถ้าผู้เล่นได้ป๊อก → badge "ป๊อก!" สีทองขึ้นทุกแท็บ
6. status เปลี่ยนเป็น "ผู้เล่นเลือก จั่ว หรือ อยู่" + วงแหวนนับถอยหลังจาก 30 เดินลง (ยังไม่ auto-advance — Task 14)
7. เช็ค Firebase Console: `rounds/1/{deck, hands, bets}` ครบ, `meta.state = 'acting'`

- [ ] **Step 3: Commit**

```bash
git add js/dealer.js
git commit -m "feat: dealer engine - start betting, shuffle, deal, pok detection"
```

---

### Task 14: dealer.js — จั่วใบสาม + ตาเจ้ามือ + auto-advance

**Files:**
- Modify: `js/dealer.js` (แทนที่ `dealerHit` และ `maybeAdvance`)

**Interfaces:**
- Consumes: โครงจาก Task 13
- Produces:
  - `maybeAdvance()` ฉบับจริง: แจกไพ่ใบ 3 ให้คนที่กด hit ทันทีที่เห็น action, ปิดเฟส acting เมื่อ (ทุกคนตอบ/ป๊อก และไพ่แจกครบ) หรือหมดเวลา → `dealerTurn`; หมดเวลา dealerTurn → เจ้ามือ "อยู่" อัตโนมัติ (revealAndSettle)
  - `dealerHit(S)`: แจกใบ 3 ให้ตัวเอง + เขียน flag สาธารณะ `rounds/{n}/dealerDrew: true` → แล้ว reveal ทันที
  - `busy` flag กัน re-entrancy (interval + tick ยิงพร้อมกัน)

- [ ] **Step 1: แทนที่ maybeAdvance และ dealerHit ใน js/dealer.js**

```js
async function dealThirdCards(S) {
  const pending = Object.keys(S.actions).filter(
    (pid) => S.actions[pid] === 'hit' && (S.hands[pid]?.length ?? 2) < 3
  );
  if (pending.length === 0 || !S.deck) return false;
  const deck = [...S.deck];
  const updates = {};
  for (const pid of pending) {
    if (deck.length === 0) break;
    updates[`${rPath(S)}/hands/${pid}/2`] = deck.pop();
  }
  updates[`${rPath(S)}/deck`] = deck;
  await F.update(F.ref(db), updates);
  return true;
}

async function maybeAdvance() {
  const S = lastS;
  if (!S || !S.amHost || busy) return;
  if (!['acting', 'dealerTurn'].includes(S.meta.state)) return;
  busy = true;
  try {
    const now = serverNow();
    if (S.meta.state === 'acting') {
      await dealThirdCards(S);
      const bettors = Object.keys(S.bets);
      const everyoneAnswered = bettors.every((pid) => S.revealed[pid] || S.actions[pid]);
      const expired = S.meta.turnDeadline && now >= S.meta.turnDeadline;
      const cardsPending = bettors.some(
        (pid) => S.actions[pid] === 'hit' && (S.hands[pid]?.length ?? 2) < 3
      );
      if ((everyoneAnswered || expired) && !cardsPending) {
        await F.update(F.ref(db, `${roomPath(S)}/meta`), {
          state: 'dealerTurn',
          turnDeadline: serverNow() + DEALER_MS,
        });
      }
    } else if (S.meta.state === 'dealerTurn') {
      if (S.meta.turnDeadline && now >= S.meta.turnDeadline) {
        await revealAndSettle(S); // หมดเวลา = เจ้ามืออยู่อัตโนมัติ
      }
    }
  } catch (e) {
    console.error('maybeAdvance', e);
  } finally {
    busy = false;
  }
}

async function dealerHit(S) {
  if (S.meta.state !== 'dealerTurn') return;
  const host = S.meta.hostUid;
  if ((S.hands[host]?.length ?? 2) >= 3 || !S.deck?.length) return;
  const deck = [...S.deck];
  const card = deck.pop();
  await F.update(F.ref(db), {
    [`${rPath(S)}/hands/${host}/2`]: card,
    [`${rPath(S)}/deck`]: deck,
    [`${rPath(S)}/dealerDrew`]: true,
  });
  await revealAndSettle(lastS);
}
```

- [ ] **Step 2: ทดสอบ manual (3 แท็บ: เจ้ามือ + ผู้เล่น 2)**

1. เริ่มรอบ วางเดิมพันทั้งคู่ แจกไพ่
2. ผู้เล่น A กด "จั่ว" → ไพ่ใบ 3 โผล่ทันที (ของตัวเองหงาย), แท็บอื่นเห็นไพ่ใบ 3 คว่ำ + badge "จั่วแล้ว"
3. ผู้เล่น B กด "อยู่" → badge "อยู่" — พอครบทุกคน status เปลี่ยนเป็น "ตาเจ้ามือตัดสินใจ" + นาฬิกา 45 วิ
4. รอบใหม่: ผู้เล่น B ไม่กดอะไรเลย → พอครบ 30 วิ เข้าตาเจ้ามือเอง (B = อยู่อัตโนมัติ)
5. เจ้ามือกด "จั่ว" → เจ้ามือได้ใบ 3, ทุกแท็บเห็นไพ่เจ้ามือใบ 3 (คว่ำ), console log `revealAndSettle stub` (ถูกต้อง — Task 15 ต่อ)
6. กันกดรัว: ผู้เล่นดับเบิลคลิก "จั่ว" เร็ว ๆ → ได้ไพ่ใบเดียว (actions เขียนได้ครั้งเดียว)

- [ ] **Step 3: Commit**

```bash
git add js/dealer.js
git commit -m "feat: third-card dealing, dealer turn, deadline auto-advance"
```

---

### Task 15: reveal + settle + สรุปผลรอบ

**Files:**
- Modify: `js/dealer.js` (แทนที่ `revealAndSettle`), `js/game.js` (แทนที่ `showRoundSummary`)

**Interfaces:**
- Consumes: `settleRound` (pokdeng.js — Task 6)
- Produces:
  - `revealAndSettle(S)`: เขียน `state:'reveal'` (ทุก client เปิดไพ่+animation) → รอ `REVEAL_HOLD_MS` → เขียนก้อนเดียว atomic: ชิปทุกคน (จาก `settleRound`), `results/*`, `state:'settled'`
  - `results/{uid}` shape: `{ delta, rankName, deng, points }` — ของเจ้ามือเก็บใต้ uid เจ้ามือเหมือนกัน
  - `showRoundSummary()` ใน game.js: เปิด modal ตารางผลเมื่อ state เปลี่ยนเป็น settled (ผู้เล่นทุกคนเห็นเอง)

- [ ] **Step 1: แทนที่ revealAndSettle ใน js/dealer.js**

```js
let settling = false;
export async function revealAndSettle(S) {
  if (!S || !S.amHost || settling) return;
  if (['reveal', 'settled'].includes(S.meta.state) && S.meta.state === 'settled') return;
  settling = true;
  try {
    await F.update(F.ref(db, `${roomPath(S)}/meta`), { state: 'reveal', turnDeadline: null });
    await new Promise((r) => setTimeout(r, REVEAL_HOLD_MS));

    const cur = lastS; // state ล่าสุดหลังรอ (hands ครบทุกใบแล้ว)
    const host = cur.meta.hostUid;
    const playerChips = {};
    for (const pid of Object.keys(cur.bets)) playerChips[pid] = cur.players[pid].chips;

    const { playerDeltas, dealerDelta, evals, dealerEval } = settleRound({
      bets: cur.bets,
      hands: cur.hands,
      dealerHand: cur.hands[host],
      playerChips,
    });

    const updates = { 'meta/state': 'settled' };
    for (const [pid, delta] of Object.entries(playerDeltas)) {
      updates[`players/${pid}/chips`] = cur.players[pid].chips + delta;
      updates[`rounds/${cur.meta.round}/results/${pid}`] = {
        delta,
        rankName: evals[pid].rankName,
        deng: evals[pid].deng,
        points: evals[pid].points,
      };
    }
    updates[`players/${host}/chips`] = cur.players[host].chips + dealerDelta;
    updates[`rounds/${cur.meta.round}/results/${host}`] = {
      delta: dealerDelta,
      rankName: dealerEval.rankName,
      deng: dealerEval.deng,
      points: dealerEval.points,
    };
    await F.update(F.ref(db, roomPath(cur)), updates);
  } finally {
    settling = false;
  }
}
```

- [ ] **Step 2: แทนที่ showRoundSummary ใน js/game.js**

```js
function showRoundSummary() {
  const host = S.meta.hostUid;
  if (!S.results[host]) return;
  const dealerR = S.results[host];
  const rows = Object.keys(S.results)
    .filter((pid) => pid !== host && S.players[pid])
    .map((pid) => {
      const r = S.results[pid];
      const p = S.players[pid];
      const cls = r.delta > 0 ? 'pos' : r.delta < 0 ? 'neg' : '';
      const sign = r.delta > 0 ? `+${r.delta}` : r.delta === 0 ? 'เสมอ' : String(r.delta);
      return `<tr>
        <td>${p.avatar} ${p.name}</td>
        <td>${r.rankName}${r.deng > 1 ? ` ×${r.deng}` : ''}</td>
        <td class="num ${cls}">${sign}</td>
        <td class="num">${p.chips.toLocaleString()}</td>
      </tr>`;
    })
    .join('');
  const dCls = dealerR.delta > 0 ? 'pos' : dealerR.delta < 0 ? 'neg' : '';
  ui.showSummary(`
    <h2>สรุปรอบที่ ${S.meta.round} 🃏</h2>
    <table>
      <tr><th>ผู้เล่น</th><th>มือ</th><th>ได้/เสีย</th><th>ชิปคงเหลือ</th></tr>
      ${rows}
      <tr><td>🎩 ${S.players[host]?.name ?? 'เจ้ามือ'} (เจ้ามือ)</td>
        <td>${dealerR.rankName}${dealerR.deng > 1 ? ` ×${dealerR.deng}` : ''}</td>
        <td class="num ${dCls}">${dealerR.delta > 0 ? '+' : ''}${dealerR.delta}</td>
        <td class="num">${(S.players[host]?.chips ?? 0).toLocaleString()}</td></tr>
    </table>
    <p style="margin-top:10px;color:var(--muted);font-size:13px;">แตะพื้นที่ว่างเพื่อปิด — เจ้ามือกด "รอบต่อไป" ได้เลย</p>
  `);
}
```

- [ ] **Step 3: ทดสอบ manual ครบรอบ (3 แท็บ)**

1. เล่นครบ flow: เดิมพัน → แจก → จั่ว/อยู่ → เจ้ามือจั่ว/อยู่ → ทุกแท็บเห็นไพ่ทุกคน**หงายหมด** → modal สรุปเปิดเองทุกแท็บ
2. เช็คเลขให้ตรงกติกา:
   - ผู้เล่นชนะด้วยสองเด้ง เดิมพัน 50 → +100 และชิปเจ้ามือ -100
   - เสมอ (แต้มเท่า) → 0 ทั้งคู่
   - แพ้เจ้ามือที่มีสองเด้ง เดิมพัน 50 → -100
3. ผลรวมชิปทุกคนในห้อง = 1,000 × จำนวนคน เสมอ (zero-sum — บวกลบกันแล้วเท่าเดิม)
4. เจ้ามือกด "รอบต่อไป" → กลับสู่ betting, ไพ่หาย, เดิมพันรีเซ็ต, modal ปิด
5. เล่นจนมีคนป๊อกตั้งแต่แจก: คนป๊อกไม่มีปุ่มจั่ว/อยู่, ตอน settle ป๊อกชนะถูกคิด ×2 เมื่อสองเด้ง
6. รอบที่เจ้ามือป๊อก: ข้าม acting ไป reveal ทันทีทุกแท็บ
7. กด "กลับล็อบบี้" → state lobby, กด "เริ่มเกม" เริ่มรอบใหม่ได้
8. เช็ค Firebase Console: มี `rounds/N/results` ครบทุก uid และ round เก่ากว่า 5 รอบถูกลบ (เล่น 6+ รอบ)

- [ ] **Step 4: รัน unit tests ยืนยันไม่มีอะไรพัง**

Run: `node --test tests/`
Expected: PASS ทั้งหมด (20 tests)

- [ ] **Step 5: Commit**

```bash
git add js/dealer.js js/game.js
git commit -m "feat: reveal, atomic settle with chips update, round summary modal"
```

## Phase 5: Resilience

### Task 16: Reconnect/Resume + auto-rejoin + spectator

**Files:**
- Modify: `js/main.js` (auto-rejoin), `js/dealer.js` (กู้ state ค้าง), `js/game.js` (ไม่แตะ — ทดสอบอย่างเดียว)

**Interfaces:**
- Consumes: ทุกอย่างจาก Phase 4
- Produces:
  - เปิดลิงก์ `?room=CODE` ขณะที่ uid เราอยู่ใน players อยู่แล้ว → เข้าห้องอัตโนมัติ ข้าม landing
  - `maybeAdvance()` กู้ 2 กรณีเจ้ามือรีเฟรชแล้ว setTimeout หาย: ค้างที่ `dealing` → เดินต่อเป็น acting/reveal, ค้างที่ `reveal` → settle ต่อจนจบ
  - แก้ guard `revealAndSettle` ให้เรียกซ้ำได้ปลอดภัย (idempotent)

- [ ] **Step 1: auto-rejoin ใน js/main.js**

เพิ่ม `F, db, uid` เข้า import จาก `./firebase.js` (บรรทัดแรกของไฟล์):

```js
import { authReady, watchClock, F, db, uid } from './firebase.js';
```

แทนที่ท้ายฟังก์ชัน `boot()` ส่วน `codeFromUrl`:

```js
  const codeFromUrl = normalizeCode(new URLSearchParams(location.search).get('room'));
  if (codeFromUrl.length === 6) {
    $('#inp-code').value = codeFromUrl;
    // เคยอยู่ห้องนี้ (uid persist ใน browser) → เข้าต่อทันที ข้าม landing
    const savedName = localStorage.getItem('pd_name');
    if (savedName) {
      const meSnap = await F.get(F.ref(db, `rooms/${codeFromUrl}/players/${uid()}`));
      if (meSnap.exists()) {
        await joinRoom(codeFromUrl, { name: savedName, avatar: selectedAvatar });
        await enterRoom(codeFromUrl);
      }
    }
  }
```

- [ ] **Step 2: กู้ state ค้างใน js/dealer.js**

แทนที่ guard บรรทัดแรก ๆ ของ `revealAndSettle`:

```js
  if (!S || !S.amHost || settling) return;
  if (S.meta.state === 'settled') return;
```

แทนที่เงื่อนไข early-return ใน `maybeAdvance` จาก

```js
  if (!['acting', 'dealerTurn'].includes(S.meta.state)) return;
```

เป็น

```js
  if (!['acting', 'dealerTurn', 'dealing', 'reveal'].includes(S.meta.state)) return;
```

และเพิ่ม 2 เคสต่อจาก `else if (S.meta.state === 'dealerTurn') { ... }`:

```js
    } else if (S.meta.state === 'dealing') {
      // เจ้ามือรีเฟรชค้างกลาง dealing (setTimeout หาย) — เดินต่อจากข้อมูลใน DB
      const host = S.meta.hostUid;
      if (S.hands[host]) {
        const bettors = Object.keys(S.bets);
        const dealerPok = Boolean(S.revealed[host]);
        const everyPlayerPok = bettors.length > 0 && bettors.every((pid) => S.revealed[pid]);
        if (dealerPok || everyPlayerPok) {
          await revealAndSettle(S);
        } else {
          await F.update(F.ref(db, `${roomPath(S)}/meta`), {
            state: 'acting',
            turnDeadline: serverNow() + ACT_MS,
          });
        }
      }
    } else if (S.meta.state === 'reveal') {
      // ค้างที่ reveal โดยยังไม่มี results → settle ให้จบ
      if (!S.results[S.meta.hostUid]) await revealAndSettle(S);
    }
```

- [ ] **Step 3: ทดสอบ manual (3 แท็บ)**

1. **ผู้เล่นรีเฟรชกลาง acting:** วางเดิมพัน แจกไพ่ แล้วรีเฟรชแท็บผู้เล่น → กลับเข้าโต๊ะเอง (ไม่เห็น landing), ไพ่ตัวเอง 2 ใบยังหงายให้เห็น, ยังกดจั่ว/อยู่ได้, นาฬิกาเดินต่อถูกเวลา
2. **เจ้ามือรีเฟรชกลาง acting:** ผู้เล่นกดจั่วระหว่างเจ้ามือหาย → พอแท็บเจ้ามือกลับมา ไพ่ใบ 3 ถูกแจกภายใน ~1 วิ (interval กู้เอง), เกมเดินต่อครบรอบ
3. **เจ้ามือรีเฟรชกลาง dealing:** กดแจกไพ่แล้วรีเฟรชทันที (ภายใน 0.9 วิ) → กลับมาแล้วเกมเดินไป acting เอง ไม่ค้าง
4. **เจ้ามือรีเฟรชกลาง reveal:** รีเฟรชช่วงไพ่กำลังเปิด → กลับมาแล้ว settle จบ มี modal สรุป ชิปถูกต้อง
5. **Spectator:** ให้คนที่ 3 เข้าห้องกลาง acting → เห็น badge "รอรอบหน้า", ไม่มีปุ่มเดิมพัน; พอรอบใหม่เริ่ม วางเดิมพันได้ปกติ
6. **ผู้เล่นหลุดยาว:** ปิดแท็บผู้เล่นถาวรกลางรอบ → หมดเวลา = อยู่อัตโนมัติ, settle ปกติ, seat ขึ้นจาง (offline)

- [ ] **Step 4: Commit**

```bash
git add js/main.js js/dealer.js
git commit -m "feat: auto-rejoin, dealer crash recovery for dealing/reveal states"
```

---

### Task 17: Host tools — ตั้งค่าห้อง, ส่งต่อเจ้ามือ, takeover, ห้องร้าง

**Files:**
- Modify: `js/ui.js` (settings + transfer modal), `js/game.js` (hostStale + host actions), `js/room.js` (ยึดห้องร้าง), `css/style.css` (ฟอร์มใน modal)

**Interfaces:**
- Consumes: โครง action bar (Task 11 มีปุ่มรอไว้แล้ว: `open-settings, transfer-host, claim-host`)
- Produces:
  - `ui.showSettings(S)` → ฟอร์ม minBet/maxBet → action `'save-settings', {minBet, maxBet}`
  - `ui.showTransfer(S)` → รายชื่อผู้เล่น online → action `'transfer-host-to', pid`
  - `S.hostStale` — จริงเมื่อ: ไม่ใช่เจ้ามือเอง, state ≠ lobby, `lastSeen` เจ้ามือเก่ากว่า 60 วิ (คำนวณใน timer loop ทุก 250ms เพื่อให้ปุ่มโผล่เองแม้ไม่มี event)
  - `claim-host`: เขียน 2 จังหวะ — (1) `meta {hostUid: ฉัน, state:'lobby', turnDeadline:null}` (rule อนุญาตเมื่อ host เดิม stale) (2) ลบ `rounds/{n}` — **การลบรอบ = คืนเดิมพันโดยอัตโนมัติ เพราะชิปถูกหักตอน settle เท่านั้น** เดิมพันเป็นแค่ตัวเลขประกาศไว้
  - `room.js resetStaleRoom(code)`: ตอน join ถ้าทุกคนในห้อง `lastSeen` เก่ากว่า 24 ชม. → ผู้เข้าใหม่ยึดเป็น host, ล้าง players/rounds เดิม

- [ ] **Step 1: เพิ่ม modal ฟอร์มใน js/ui.js (ต่อท้าย)**

```js
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
  m.onclick = (e) => { if (e.target === m) hideModals(); };
}

export function showTransfer(S) {
  const m = $('#modal-settings');
  const candidates = Object.keys(S.players)
    .filter((pid) => pid !== S.meta.hostUid && S.players[pid].online);
  const list = candidates.length
    ? candidates.map((pid) =>
        `<button class="btn-secondary mwide" data-pid="${pid}">${S.players[pid].avatar} ${S.players[pid].name}</button>`
      ).join('')
    : '<p style="color:var(--muted)">ไม่มีผู้เล่นออนไลน์ให้ส่งต่อ</p>';
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
  m.onclick = (e) => { if (e.target === m) hideModals(); };
}
```

- [ ] **Step 2: ต่อท้าย css/style.css**

```css
.mlabel { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin: 8px 0; font-size: 14px; }
.mlabel input {
  width: 110px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18);
  border-radius: 8px; padding: 8px; color: var(--text); font-size: 15px; text-align: center;
}
.mrow { display: flex; gap: 8px; margin-top: 14px; justify-content: flex-end; }
.mcol { display: flex; flex-direction: column; gap: 8px; }
.mwide { width: 100%; text-align: left; }
```

- [ ] **Step 3: host actions + hostStale ใน js/game.js**

เพิ่มเคสใน `switch` ของ `handleAction` (ก่อน `default:`):

```js
      case 'open-settings':
        if (S.amHost) ui.showSettings(S);
        break;
      case 'save-settings': {
        if (!S.amHost) break;
        const minBet = Math.max(1, Math.floor(payload.minBet));
        const maxBet = Math.max(minBet, Math.floor(payload.maxBet));
        await F.update(F.ref(db, `rooms/${code}/meta`), { minBet, maxBet });
        ui.toast(`ตั้งเดิมพัน ${minBet}–${maxBet} แล้ว`);
        break;
      }
      case 'transfer-host':
        if (S.amHost) ui.showTransfer(S);
        break;
      case 'transfer-host-to':
        if (!S.amHost || !['lobby', 'settled'].includes(S.meta.state)) break;
        await F.update(F.ref(db, `rooms/${code}/meta`), { hostUid: payload, state: 'lobby', turnDeadline: null });
        ui.toast(`ส่งต่อเจ้ามือให้ ${S.players[payload]?.name ?? ''} แล้ว 🎩`);
        break;
      case 'claim-host': {
        // เขียน 2 จังหวะ: ยึด meta ก่อน (rule เช็ค host เดิม stale) แล้วค่อยล้างรอบ
        await F.update(F.ref(db, `rooms/${code}/meta`), {
          hostUid: S.uid, state: 'lobby', turnDeadline: null,
        });
        if (n >= 1) await F.remove(F.ref(db, `rooms/${code}/rounds/${n}`));
        ui.toast('คุณเป็นเจ้ามือแล้ว — รอบที่ค้างถูกยกเลิก เดิมพันไม่ถูกหัก');
        break;
      }
```

เพิ่มการคำนวณ hostStale ใน `startTimerLoop` (แทนที่ฟังก์ชันเดิมทั้งก้อน):

```js
function computeHostStale() {
  const hostP = S.players[S.meta.hostUid];
  if (!hostP || S.amHost || S.meta.state === 'lobby') return false;
  return serverNow() - (hostP.lastSeen || 0) > 60000;
}

function startTimerLoop() {
  setInterval(() => {
    const dl = S.meta.turnDeadline;
    const total = STATE_DURATION[S.meta.state];
    if (!dl || !total) ui.updateTimer(null, 0);
    else ui.updateTimer(Math.max(0, dl - serverNow()), total);

    const stale = computeHostStale();
    if (stale !== S.hostStale) {
      S.hostStale = stale;
      ui.renderAll(S);
    }
  }, 250);
}
```

- [ ] **Step 4: ยึดห้องร้างใน js/room.js**

เพิ่มใน `joinRoom` หลังเช็ค `not-found` ก่อนเช็คห้องเต็ม:

```js
  const STALE_ROOM_MS = 24 * 60 * 60 * 1000;
  const allStale = Object.keys(players).length > 0 &&
    Object.values(players).every((p) => serverNow() - (p.lastSeen || 0) > STALE_ROOM_MS);
  if (allStale && !players[uid()]) {
    // ห้องร้าง — ยึดเป็นเจ้ามือแล้วรีเซ็ต (rule ยอมเพราะ host เดิม stale เกิน 60 วิแน่นอน)
    await F.update(F.child(roomRef, 'meta'), {
      hostUid: uid(), state: 'lobby', round: 0, turnDeadline: null,
    });
    await Promise.all([
      F.remove(F.child(roomRef, 'players')),
      F.remove(F.child(roomRef, 'rounds')),
    ]);
    await F.set(F.child(roomRef, `players/${uid()}`), playerEntry({ name, avatar }));
    return;
  }
```

- [ ] **Step 5: ทดสอบ manual**

1. **ตั้งค่า:** เจ้ามือเปิด ⚙️ ตั้ง min 20 / max 100 → ผู้เล่นเห็น preset เปลี่ยน, วาง 10 ไม่ได้ (toast เตือน), วาง 20 ได้
2. **ส่งต่อเจ้ามือ:** ที่ lobby เจ้ามือกด 🎩 เลือกผู้เล่น B → แท็บ B กลายเป็นเจ้ามือ (มีปุ่มเริ่มเกม + 🎩 บน seat บนสุด), ชิปทุกคนคงเดิม, host เดิมกลายเป็น seat ผู้เล่น
3. **Takeover:** เริ่มรอบ วางเดิมพัน แล้วปิดแท็บเจ้ามือทิ้งเลย → ~60 วิต่อมา แท็บผู้เล่นขึ้นปุ่ม "🎩 รับเป็นเจ้ามือแทน" → กด → กลับ lobby, toast แจ้งรอบถูกยกเลิก, ชิปทุกคนเท่าเดิม (ไม่มีใครถูกหัก)
4. **ห้องร้าง:** แก้ `lastSeen` ทุกคนใน Firebase Console ให้เป็นเมื่อวาน (ลบ 90000000) แล้วเข้าห้องด้วยคนใหม่ → ได้เป็นเจ้ามือ ห้องว่างรีเซ็ต
5. เช็คว่า host เดิมที่ยัง online อยู่ **ไม่โดนยึด**: เปิดเกมปกติ ผู้เล่นไม่มีปุ่ม claim-host

- [ ] **Step 6: Commit**

```bash
git add js/ui.js js/game.js js/room.js css/style.css
git commit -m "feat: room settings, host transfer, stale-host takeover, stale room reset"
```

## Phase 6: Polish

### Task 18: Animation แจกไพ่ + พลิกเปิด + ไฮไลต์ผู้ชนะ

**Files:**
- Modify: `js/ui.js` (แทนที่ `seatCards`, แก้ `seatEl`, แก้ `renderAll`), `css/style.css` (ต่อท้าย)

**Interfaces:**
- Consumes: โครง `.cardflip > .cfinner` จาก cards.js (Task 10 — transition rotateY มีอยู่แล้ว)
- Produces:
  - ไพ่ที่โผล่ครั้งแรกในรอบ → เล่น animation `deal-in` (stagger ใบละ 0.12 วิ)
  - ไพ่ที่เคยเห็นเป็นหลังไพ่ แล้วเพิ่งเห็นหน้า (ตอน reveal/ป๊อก) → เล่น flip 3D (stagger 0.15 วิ)
  - กันเล่นซ้ำเมื่อ re-render: module-level `Set` จำ key `round:pid:index` (ล้างเมื่อเปลี่ยนรอบ)
  - seat ผู้ชนะ/ผู้แพ้ตอน reveal/settled ได้ขอบเขียว/แดง

- [ ] **Step 1: แทนที่ฟังก์ชัน `seatCards` ใน js/ui.js ทั้งก้อน**

```js
let animRound = -1;
const dealtKeys = new Set();
const flippedKeys = new Set();

function seatCards(S, pid) {
  const wrap = document.createElement('div');
  wrap.className = 'cards';
  const isMe = pid === S.uid;
  const canSee = isMe || ['reveal', 'settled'].includes(S.meta.state) || S.revealed[pid];
  const cards = S.hands[pid];
  const count = cards ? cards.length : (S.handCounts[pid] || 0);
  for (let i = 0; i < count; i++) {
    const card = canSee && cards ? cards[i] : null;
    const faceUp = Boolean(card);
    const key = `${S.meta.round}:${pid}:${i}`;
    const size = isMe ? 'lg' : 'md';
    let el;
    if (faceUp && dealtKeys.has(key) && !flippedKeys.has(key)) {
      // เคยเห็นเป็นหลังไพ่ → สร้างคว่ำแล้วสั่งเปิด ให้ CSS transition เล่น flip
      flippedKeys.add(key);
      el = renderCard(card, { size, faceUp: false });
      el.querySelector('.cfinner').style.transitionDelay = `${i * 0.15}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('faceup')));
    } else {
      el = renderCard(card, { size, faceUp });
      if (faceUp) flippedKeys.add(key);
    }
    if (!dealtKeys.has(key)) {
      dealtKeys.add(key);
      el.classList.add('deal-in');
      el.style.animationDelay = `${i * 0.12}s`;
    }
    wrap.appendChild(el);
  }
  return wrap;
}
```

- [ ] **Step 2: แก้ `renderAll` และ `seatEl` ใน js/ui.js**

`renderAll` — เพิ่มบรรทัดล้าง animation state เมื่อเปลี่ยนรอบ (บรรทัดแรกของฟังก์ชัน):

```js
export function renderAll(S) {
  if (S.meta.round !== animRound) {
    animRound = S.meta.round;
    dealtKeys.clear();
    flippedKeys.clear();
  }
  setStatus(STATE_LABEL[S.meta.state] || S.meta.state);
  renderSeats(S);
  renderActionBar(S);
}
```

`seatEl` — หลังบรรทัด `if (!p.online) seat.classList.add('offline');` เพิ่ม:

```js
  seat.dataset.pid = pid;
  const res = S.results[pid];
  if (['reveal', 'settled'].includes(S.meta.state) && res && res.delta !== 0) {
    seat.classList.add(res.delta > 0 ? 'result-win' : 'result-lose');
  }
```

- [ ] **Step 3: ต่อท้าย css/style.css**

```css
/* ===== animations ===== */
@keyframes deal-in {
  from { opacity: 0; transform: translateY(-26px) scale(.85) rotate(-4deg); }
  to   { opacity: 1; transform: none; }
}
.cardflip.deal-in { animation: deal-in .35s ease backwards; }
.seat { position: relative; transition: border-color .3s ease; }
.seat.result-win { border-color: var(--win); }
.seat.result-lose { border-color: rgba(242, 109, 109, .65); }
```

- [ ] **Step 4: ทดสอบ manual (2 แท็บ)**

1. แจกไพ่ → ไพ่ทยอยโผล่ทีละใบ (ไม่โผล่พรึ่บพร้อมกัน)
2. ผู้เล่นกดจั่ว → เฉพาะใบที่ 3 เล่น animation (สองใบแรกนิ่ง — กันเล่นซ้ำทำงาน)
3. ตอน reveal → ไพ่ที่เคยคว่ำพลิกเปิดไล่จังหวะกัน, ไพ่ตัวเองไม่พลิกซ้ำ
4. seat คนชนะขอบเขียว คนแพ้ขอบแดง เสมอไม่มีขอบ
5. กด "รอบต่อไป" แล้วแจกใหม่ → animation กลับมาเล่นปกติ (Set ถูกล้าง)

- [ ] **Step 5: Commit**

```bash
git add js/ui.js css/style.css
git commit -m "feat: deal-in and 3D flip animations, winner seat highlight"
```

---

### Task 19: เสียง (WebAudio) + emoji reactions + สถิติในสรุปผล

**Files:**
- Modify: `index.html` (เพิ่ม #reaction-bar), `js/ui.js` (เสียง + reactions), `js/game.js` (trigger เสียง + ส่ง/รับ reaction + สถิติ), `js/dealer.js` (ล้าง reactions ต้นรอบ), `css/style.css`

**Interfaces:**
- Consumes: `F.push, F.onChildAdded` (firebase.js)
- Produces:
  - `ui.sfx(name)` — `'deal' | 'flip' | 'win' | 'lose' | 'pok'` เสียงสังเคราะห์จาก oscillator ล้วน (ไม่มีไฟล์เสียง — คุมธีม "ไม่มี asset")
  - `ui.initSoundButton()` / `ui.toggleSound()` — persist ใน localStorage key `pd_sound` ('1'/'0'), ปุ่ม 🔊/🔇 ใน header
  - `ui.initReactions()` — แถบ emoji `['👍','😂','😭','🔥','😱','🎉']` ยิง action `'react', emoji`
  - `ui.floatReaction(pid, emoji)` — emoji ลอยขึ้นจาก seat ของ pid (หาvia `data-pid` จาก Task 18)
  - ข้อมูล reaction: `rooms/{code}/reactions` push `{uid, emoji, ts}` — client ignore ที่เก่ากว่า 10 วิ, เจ้ามือล้างทั้ง node ทุกต้นรอบ, client throttle ส่งไม่ถี่กว่า 1 ครั้ง/วิ
  - สรุปผลรอบเพิ่มคอลัมน์ "สุทธิ" = `chips - 1000 × (1 + rebuys)` และจำนวนครั้งที่เติม

- [ ] **Step 1: เพิ่ม #reaction-bar ใน index.html**

ใน `#table-center` หลัง `<div id="table-status">…</div>` เพิ่ม:

```html
      <div id="reaction-bar"></div>
```

- [ ] **Step 2: ต่อท้าย js/ui.js — เสียง + reactions**

```js
/* ===== เสียงสังเคราะห์ (ไม่มีไฟล์เสียง) ===== */
let soundOn = localStorage.getItem('pd_sound') !== '0';
let _actx = null;
function actx() {
  if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  return _actx;
}
function beep(freq, dur = 0.08, delay = 0, type = 'triangle', vol = 0.05) {
  if (!soundOn) return;
  try {
    const ctx = actx();
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch { /* บาง browser บล็อก audio ก่อน user gesture — เงียบไว้ */ }
}
export function sfx(name) {
  if (name === 'deal') { beep(520, 0.05); beep(520, 0.05, 0.12); }
  else if (name === 'flip') beep(700, 0.07);
  else if (name === 'win') { beep(523, 0.1); beep(659, 0.1, 0.12); beep(784, 0.18, 0.24); }
  else if (name === 'lose') beep(180, 0.25, 0, 'sawtooth', 0.04);
  else if (name === 'pok') { beep(880, 0.09); beep(1175, 0.14, 0.1); }
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
export const REACTIONS = ['👍', '😂', '😭', '🔥', '😱', '🎉'];
export function initReactions() {
  const bar = $('#reaction-bar');
  bar.innerHTML = '';
  for (const e of REACTIONS) {
    const b = document.createElement('button');
    b.textContent = e;
    b.onclick = () => actionHandler('react', e);
    bar.appendChild(b);
  }
}
export function floatReaction(pid, emoji) {
  const anchor = document.querySelector(`.seat[data-pid="${pid}"]`) || $('#table-center');
  const f = document.createElement('div');
  f.className = 'float-emoji';
  f.textContent = emoji;
  anchor.appendChild(f);
  setTimeout(() => f.remove(), 1900);
}
```

- [ ] **Step 3: ต่อท้าย css/style.css**

```css
#reaction-bar { display: flex; gap: 6px; justify-content: center; }
#reaction-bar button {
  background: rgba(0,0,0,.22); border: none; border-radius: 99px;
  font-size: 17px; padding: 4px 9px; cursor: pointer;
}
#reaction-bar button:hover { background: rgba(0,0,0,.4); }
.float-emoji {
  position: absolute; left: 50%; bottom: 55%;
  font-size: 26px; pointer-events: none; z-index: 5;
  animation: float-up 1.8s ease-out forwards;
}
@keyframes float-up {
  from { opacity: 1; transform: translate(-50%, 0) scale(.9); }
  to   { opacity: 0; transform: translate(-50%, -70px) scale(1.35); }
}
```

- [ ] **Step 4: js/game.js — trigger เสียง, ส่ง/รับ reaction, สถิติ**

ใน `enterGame` หลัง `ui.onAction(handleAction);` เพิ่ม:

```js
  ui.initSoundButton();
  ui.initReactions();
  F.onChildAdded(F.ref(db, `rooms/${code}/reactions`), (snap) => {
    const r = snap.val();
    if (!r || serverNow() - (r.ts || 0) > 10000) return;
    ui.floatReaction(r.uid, r.emoji);
  });
```

เพิ่มเคสใน `handleAction` (ก่อน `case 'noop'`), พร้อมตัวแปร module-level `let lastReactAt = 0;`:

```js
      case 'react': {
        if (Date.now() - lastReactAt < 1000) break; // throttle 1 ครั้ง/วิ
        lastReactAt = Date.now();
        await F.push(F.ref(db, `rooms/${code}/reactions`), {
          uid: S.uid, emoji: payload, ts: serverNow(),
        });
        break;
      }
```

แทนที่ `onStateTransition` ทั้งก้อน (เพิ่มเสียง) + เพิ่มเสียงป๊อกใน `recompute`:

```js
let myPokSfxRound = 0;
function onStateTransition() {
  if (S.meta.state === lastRenderedState) return;
  lastRenderedState = S.meta.state;
  if (S.meta.state === 'dealing') ui.sfx('deal');
  if (S.meta.state === 'reveal') ui.sfx('flip');
  if (S.meta.state === 'settled') {
    showRoundSummary();
    const r = S.results[S.uid];
    if (r) ui.sfx(r.delta > 0 ? 'win' : r.delta < 0 ? 'lose' : 'flip');
  }
  if (S.meta.state === 'betting') ui.hideModals();
}
```

ใน `recompute()` ก่อน `ui.renderAll(S)` เพิ่ม:

```js
  if (S.revealed[S.uid] && myPokSfxRound !== S.meta.round) {
    myPokSfxRound = S.meta.round;
    ui.sfx('pok');
  }
```

แทนที่ `showRoundSummary` — เพิ่มคอลัมน์สุทธิ (ทับฉบับ Task 15):

```js
function netOf(p) {
  return p.chips - 1000 * (1 + (p.rebuys || 0));
}

function showRoundSummary() {
  const host = S.meta.hostUid;
  if (!S.results[host]) return;
  const row = (pid, label) => {
    const r = S.results[pid];
    const p = S.players[pid];
    if (!r || !p) return '';
    const cls = r.delta > 0 ? 'pos' : r.delta < 0 ? 'neg' : '';
    const sign = r.delta > 0 ? `+${r.delta}` : r.delta === 0 ? 'เสมอ' : String(r.delta);
    const net = netOf(p);
    const netCls = net > 0 ? 'pos' : net < 0 ? 'neg' : '';
    return `<tr>
      <td>${label}</td>
      <td>${r.rankName}${r.deng > 1 ? ` ×${r.deng}` : ''}</td>
      <td class="num ${cls}">${sign}</td>
      <td class="num">${p.chips.toLocaleString()}</td>
      <td class="num ${netCls}">${net > 0 ? '+' : ''}${net.toLocaleString()}${p.rebuys ? `<br><small>เติม ${p.rebuys} ครั้ง</small>` : ''}</td>
    </tr>`;
  };
  const rows = Object.keys(S.results)
    .filter((pid) => pid !== host)
    .sort((a, b) => (S.results[b]?.delta ?? 0) - (S.results[a]?.delta ?? 0))
    .map((pid) => row(pid, `${S.players[pid]?.avatar ?? ''} ${S.players[pid]?.name ?? '?'}`))
    .join('');
  ui.showSummary(`
    <h2>สรุปรอบที่ ${S.meta.round} 🃏</h2>
    <table>
      <tr><th>ผู้เล่น</th><th>มือ</th><th>ได้/เสีย</th><th>ชิป</th><th>สุทธิ</th></tr>
      ${rows}
      ${row(host, `🎩 ${S.players[host]?.name ?? 'เจ้ามือ'}`)}
    </table>
    <p style="margin-top:10px;color:var(--muted);font-size:13px;">แตะพื้นที่ว่างเพื่อปิด — เจ้ามือกด "รอบต่อไป" ได้เลย</p>
  `);
}
```

- [ ] **Step 5: js/dealer.js — ล้าง reactions ต้นรอบ**

ใน `startBetting` เพิ่มบรรทัดนี้ใน `updates` (ก่อน `if (old >= 1)`):

```js
  updates['reactions'] = null;
```

- [ ] **Step 6: ทดสอบ manual (2 แท็บ)**

1. กด 🔊 สลับเป็น 🔇 → รีเฟรชแล้วสถานะเสียงจำได้ (localStorage)
2. เปิดเสียง เล่นครบรอบ → ได้ยิน: ติ๊กตอนแจก, เสียงพลิกตอน reveal, arpeggio ตอนชนะ / โทนต่ำตอนแพ้, ตอนได้ป๊อกมีเสียงพิเศษ
3. กด 😂 → emoji ลอยขึ้นจาก seat ตัวเองทุกแท็บ; รัวเร็ว ๆ → ส่งได้ ~1 ครั้ง/วิ
4. modal สรุป: มีคอลัมน์สุทธิ ตัวเลขถูก (เช่น เติม 1 ครั้ง ชิป 1,800 → สุทธิ -200), เรียงคนได้มาก→น้อย
5. รอบใหม่ → reactions เก่าใน DB ถูกล้าง (เช็ค Firebase Console)

- [ ] **Step 7: Commit**

```bash
git add index.html js/ui.js js/game.js js/dealer.js css/style.css
git commit -m "feat: synth sounds with mute, emoji reactions, session net stats"
```

---

## Phase 7: Ship

### Task 20: Security rules ฉบับเต็ม + จุดแก้ client ให้เข้ากับ rules

**Files:**
- Modify: `database.rules.json` (เขียนทับ baseline), `js/game.js` (subscribe ไพ่คนป๊อกราย uid)

**Interfaces:**
- Consumes: โครงข้อมูลทั้งหมด + ตารางสิทธิ์ใน spec §4.3
- Produces:
  - rules บังคับ: มือใครมือมัน (อ่านได้เฉพาะเจ้าของ/เจ้ามือ/ตอน reveal/settled/คนที่ถูก mark `revealed`), deck เจ้ามือเท่านั้น, เดิมพันเขียนครั้งเดียวช่วง betting ไม่เกินชิป, action เขียนครั้งเดียวช่วง acting, ชิปแก้ได้เฉพาะเจ้ามือ/สร้างใหม่ 1,000/rebuy +1,000 ตอนต่ำกว่า minBet, meta แก้ได้เฉพาะเจ้ามือ + takeover เมื่อ stale > 60 วิ
  - **จุดสำคัญของ RTDB:** สิทธิ์อ่านที่ node ลูก **ไม่ทำให้** subscribe node แม่ได้ — client จึงต้อง subscribe `hands/<uid>` รายคน ยกเว้นช่วง reveal/settled ที่เปิดสิทธิ์ระดับ `hands` ทั้ง node แล้ว (game.js Task 12 ทำถูกอยู่แล้ว เหลือเคสไพ่คนป๊อก)

- [ ] **Step 1: เขียนทับ database.rules.json ทั้งไฟล์**

```json
{
  "rules": {
    "rooms": {
      "$room": {
        "meta": {
          ".read": "auth != null",
          ".write": "auth != null && ((!data.exists() && newData.child('hostUid').val() === auth.uid) || (data.child('hostUid').val() === auth.uid) || (newData.child('hostUid').val() === auth.uid && data.child('hostUid').exists() && root.child('rooms').child($room).child('players').child(data.child('hostUid').val()).child('lastSeen').val() < (now - 60000)))"
        },
        "players": {
          ".read": "auth != null",
          ".write": "auth != null && auth.uid === root.child('rooms').child($room).child('meta').child('hostUid').val()",
          "$uid": {
            ".write": "auth != null && auth.uid === $uid",
            "chips": {
              ".validate": "newData.isNumber() && (auth.uid === root.child('rooms').child($room).child('meta').child('hostUid').val() || !data.exists() || newData.val() === data.val() || (newData.val() === data.val() + 1000 && data.val() < root.child('rooms').child($room).child('meta').child('minBet').val()))"
            }
          }
        },
        "reactions": {
          ".read": "auth != null",
          ".write": "auth != null"
        },
        "rounds": {
          ".write": "auth != null && auth.uid === root.child('rooms').child($room).child('meta').child('hostUid').val()",
          "$n": {
            "deck": {
              ".read": "auth != null && auth.uid === root.child('rooms').child($room).child('meta').child('hostUid').val()"
            },
            "bets": {
              ".read": "auth != null",
              "$uid": {
                ".write": "auth != null && auth.uid === $uid && !data.exists() && root.child('rooms').child($room).child('meta').child('state').val() === 'betting'",
                ".validate": "newData.isNumber() && newData.val() >= root.child('rooms').child($room).child('meta').child('minBet').val() && newData.val() <= root.child('rooms').child($room).child('meta').child('maxBet').val() && newData.val() <= root.child('rooms').child($room).child('players').child($uid).child('chips').val()"
              }
            },
            "hands": {
              ".read": "auth != null && (auth.uid === root.child('rooms').child($room).child('meta').child('hostUid').val() || root.child('rooms').child($room).child('meta').child('state').val() === 'reveal' || root.child('rooms').child($room).child('meta').child('state').val() === 'settled')",
              "$uid": {
                ".read": "auth != null && (auth.uid === $uid || root.child('rooms').child($room).child('rounds').child($n).child('revealed').child($uid).val() === true)"
              }
            },
            "revealed": { ".read": "auth != null" },
            "actions": {
              ".read": "auth != null",
              "$uid": {
                ".write": "auth != null && auth.uid === $uid && !data.exists() && root.child('rooms').child($room).child('meta').child('state').val() === 'acting'",
                ".validate": "newData.val() === 'hit' || newData.val() === 'stay'"
              }
            },
            "results": { ".read": "auth != null" },
            "dealerDrew": { ".read": "auth != null" }
          }
        }
      }
    }
  }
}
```

หมายเหตุการอ่าน rules: การเขียนของเจ้ามือทุก path ใต้ `rounds` ผ่าน rule ระดับ `rounds` (คุมทั้ง deck/hands/results/ลบรอบ) ส่วน rule ลูก (`bets/$uid`, `actions/$uid`) เป็นการ **เพิ่มสิทธิ์** ให้ผู้เล่นเขียนของตัวเอง — RTDB ใช้ OR: allow ที่ชั้นไหนก็ได้ชนะ

- [ ] **Step 2: js/game.js — subscribe ไพ่ของคนที่ป๊อกแยกราย uid**

Rules ใหม่ทำให้อ่าน `hands` ทั้ง node ไม่ได้ก่อน reveal — ไพ่คนป๊อกต้องกดอ่านราย uid ผ่านสิทธิ์ `revealed/$uid === true`

เพิ่มตัวแปร + ฟังก์ชัน (วางเหนือ `attachRound`):

```js
let pokSubs = new Set();
function subscribePokHand(n, pid) {
  if (pid === S.uid) return; // ของตัวเองมี listener อยู่แล้ว
  const key = `${n}:${pid}`;
  if (pokSubs.has(key)) return;
  pokSubs.add(key);
  roundUnsubs.push(sub(`rounds/${n}/hands/${pid}`, (v) => {
    if (v) S.hands = { ...S.hands, [pid]: v };
  }));
}
```

ใน `attachRound` เพิ่ม `pokSubs = new Set();` ถัดจาก `resetRoundData();` และแทนที่ listener `revealed` เดิมด้วย:

```js
  roundUnsubs.push(sub(`rounds/${n}/revealed`, (v) => {
    S.revealed = v || {};
    for (const pid of Object.keys(S.revealed)) subscribePokHand(n, pid);
  }));
```

- [ ] **Step 3: Deploy rules**

Firebase Console → Realtime Database → Rules → วางเนื้อหา `database.rules.json` → **Publish**

- [ ] **Step 4: ทดสอบ rules matrix (สำคัญ — ใช้ 2 แท็บ + console)**

เปิดเกมถึงช่วง `acting` แล้วในแท็บ**ผู้เล่น** (ไม่ใช่เจ้ามือ) เปิด DevTools console:

```js
const { db, F, uid } = await import('./js/firebase.js');
const { S } = await import('./js/game.js');
const P = (p) => F.get(F.ref(db, `rooms/${S.code}/${p}`)).then((s) => console.log('OK', p, s.val()), (e) => console.log('DENIED', p, e.code));
const W = (p, v) => F.set(F.ref(db, `rooms/${S.code}/${p}`), v).then(() => console.log('OK-WRITE', p), (e) => console.log('DENIED-WRITE', p, e.code));
const host = S.meta.hostUid, n = S.meta.round;
await P(`rounds/${n}/hands/${host}`);          // คาด: DENIED (แอบดูไพ่เจ้ามือ)
await P(`rounds/${n}/hands/${uid()}`);         // คาด: OK (มือตัวเอง)
await P(`rounds/${n}/deck`);                   // คาด: DENIED (สำรับ)
await W(`rounds/${n}/bets/${uid()}`, 999999);  // คาด: DENIED-WRITE (แก้เดิมพัน/เกินชิป)
await W(`rounds/${n}/actions/${uid()}`, 'hit'); // คาด: DENIED-WRITE ถ้าตอบไปแล้ว
await W(`players/${host}/chips`, 999999);      // คาด: DENIED-WRITE (แก้ชิปคนอื่น)
await W(`meta/state`, 'lobby');                // คาด: DENIED-WRITE (ไม่ใช่เจ้ามือ)
await W(`players/${uid()}/chips`, 999999);     // คาด: DENIED-WRITE (เสกชิปตัวเอง)
```

จากนั้นเล่นจนถึง reveal แล้วรัน `await P('rounds/'+n+'/hands')` → คาด: **OK เห็นครบทุกมือ**

สุดท้าย เล่นครบรอบปกติอีก 1 รอบเต็ม ๆ ทุกแท็บ: ไม่มี error `permission_denied` โผล่ใน console ระหว่าง flow ปกติ (ถ้ามี = listener ไหนแอบอ่านเกินสิทธิ์ ต้องตามแก้)

- [ ] **Step 5: Commit**

```bash
git add database.rules.json js/game.js
git commit -m "feat: hardened security rules - private hands, single-write bets/actions"
```

---

### Task 21: README + ตรวจรับรอบสุดท้าย

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: ทุกอย่างที่เสร็จแล้ว
- Produces: คู่มือครบวงจร setup → เล่น → deploy

- [ ] **Step 1: เขียน README.md**

```markdown
# 🃏 ป๊อกเด้งออนไลน์ (Pok Deng Online)

เกมป๊อกเด้งเล่นกับเพื่อนผ่านเบราว์เซอร์แบบเรียลไทม์ — สร้างห้อง แชร์ลิงก์ เล่นได้เลย
ไพ่ทุกใบวาดด้วย CSS + emoji ล้วน (♠️♥️♦️♣️ / J=💂 Q=👸 K=🤴) ไม่มีไฟล์รูปภาพ
**ใช้ชิปเสมือนเท่านั้น ไม่เกี่ยวข้องกับเงินจริงทุกกรณี**

สถาปัตยกรรมตามแนวทาง [Scrum-Poker-Online](https://github.com/yutinfo/Scrum-Poker-Online):
Vanilla JS + Firebase Realtime Database + Anonymous Auth — ไม่มี server ของตัวเอง ไม่มี build step

## ฟีเจอร์

- ห้องละสูงสุด 9 คน (เจ้ามือ 1 + ผู้เล่น 8) เข้าห้องด้วยรหัส 6 ตัวหรือลิงก์ ไม่ต้องสมัครสมาชิก
- กติกาป๊อกเด้งมาตรฐาน: ป๊อก 8/9, สองเด้ง, ตอง ×5, สเตรทฟลัช ×5, เรียง ×3, เซียน ×3, สามเด้ง ×3
- ชิปเริ่ม 1,000 หมดแล้วเติมได้ (นับสถิติ), เจ้ามือส่งต่อได้, เจ้ามือหลุดมีระบบรับช่วงต่อ
- นาฬิกาจับเวลาตัดสินใจ 30 วิ, รีเฟรช/หลุดแล้วกลับเข้าเล่นต่อได้, มี animation แจก-พลิกไพ่, เสียง, emoji reactions
- ไพ่ของแต่ละคนถูกปิดจากผู้เล่นอื่นด้วย Firebase Security Rules จนกว่าจะถึงตอนเปิดไพ่

## เริ่มใช้งาน (ครั้งแรก)

1. สร้างโปรเจกต์ที่ https://console.firebase.google.com (แพลนฟรี Spark พอ)
2. Build → **Authentication** → Sign-in method → เปิด **Anonymous**
3. Build → **Realtime Database** → Create database (โซน `asia-southeast1`) → Start in locked mode
4. แท็บ **Rules** → วางเนื้อหาไฟล์ `database.rules.json` → Publish
5. Project settings → Your apps → ปุ่ม `</>` → Register app → ก็อปค่า config
6. `cp firebase-config.example.js firebase-config.js` แล้ววางค่า config ของคุณ

## รันในเครื่อง

```bash
python3 -m http.server 8080
# เปิด http://localhost:8080 (เปิดหลายแท็บ = หลายผู้เล่น)
```

รันเทสต์ logic เกม (ต้องมี Node ≥ 20):

```bash
node --test tests/
```

## วิธีเล่น

1. คนแรกตั้งชื่อ เลือก emoji แล้ว "สร้างห้องใหม่" — ได้เป็นเจ้ามือ
2. กด 📋 ก็อปลิงก์ส่งให้เพื่อน (หรือบอกรหัส 6 ตัว)
3. เจ้ามือกด "เริ่มเกม" → ทุกคนวางเดิมพัน → เจ้ามือแจกไพ่
4. ได้ 8/9 จากสองใบแรก = ป๊อก เปิดเลย! ที่เหลือเลือก "จั่ว" หรือ "อยู่" ใน 30 วิ
5. เจ้ามือจั่ว/อยู่ → เปิดไพ่ → ระบบคิดเงินอัตโนมัติ (แพ้จ่ายตามเด้งฝั่งชนะ)
6. ชิปต่ำกว่าขั้นต่ำ? กด "เติมชิป 1,000" ได้เสมอ

## Deploy

**ทางเลือก A — Firebase Hosting (แนะนำ: ไม่ต้อง commit config):**

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # เลือกโปรเจกต์เดิม, public directory = . , ไม่ต้อง SPA rewrite
firebase deploy --only hosting
```

**ทางเลือก B — Vercel:** import repo ใน dashboard (Framework = Other, ไม่มี build command)
ข้อแม้: ไฟล์ `firebase-config.js` ต้องอยู่ใน repo — ให้ลบบรรทัดนั้นออกจาก `.gitignore` แล้ว commit ได้เลย
(ค่า config ของ Firebase web **ไม่ใช่ความลับ** — ความปลอดภัยจริงอยู่ที่ Security Rules)

## ข้อจำกัดที่ตั้งใจ (trust model)

เครื่องของ**เจ้ามือ**เป็นคนสับและแจกไพ่ จึงเห็นข้อมูลรอบนั้นทั้งหมดโดยธรรมชาติ
เหมาะกับเล่นสนุกกับเพื่อน/ทีม ไม่ได้ออกแบบมากันโกงระดับการแข่งขัน

## โครงสร้างโค้ด

| ไฟล์ | หน้าที่ |
|---|---|
| `js/pokdeng.js` | logic เกมล้วน (ไม่มี Firebase/DOM) — มี unit test ครบ |
| `js/dealer.js` | engine ฝั่งเจ้ามือ: สับ แจก จับเวลา คิดเงิน (reactive-idempotent) |
| `js/game.js` | state sync ทุก client + คำสั่งผู้เล่น |
| `js/room.js` | สร้าง/เข้าห้อง presence takeover |
| `js/cards.js` | วาดไพ่ emoji |
| `js/ui.js` | โต๊ะ seat modal เสียง |
| `database.rules.json` | สิทธิ์อ่าน/เขียนทั้งหมด |
```

- [ ] **Step 2: ตรวจรับรอบสุดท้าย (E2E checklist — 3 แท็บ: เจ้ามือ A, ผู้เล่น B, C)**

รันทุกข้อต่อเนื่องกันในเซสชันเดียว:

1. `node --test tests/` → PASS 100%
2. A สร้างห้อง → B เข้าด้วยลิงก์, C เข้าด้วยรหัส
3. เล่น 3 รอบเต็ม: มีทั้งชนะ/แพ้/เสมอ, ชิปรวมทั้งห้อง = 3,000 ตลอด (zero-sum)
4. รอบที่มีป๊อก: badge ทอง + ไพ่คนป๊อกเปิดให้ทุกคนเห็นทันที
5. B รีเฟรชกลางรอบ → กลับมาเล่นต่อได้; A (เจ้ามือ) รีเฟรชกลางรอบ → เกมเดินต่อ
6. B ปล่อยหมดเวลา 30 วิ → อยู่อัตโนมัติ
7. C เล่นจนชิป < ขั้นต่ำ → เติมชิป → เล่นต่อ, สุทธิใน summary ถูกต้อง
8. A ส่งต่อเจ้ามือให้ B ที่ lobby → B เริ่มรอบได้
9. ปิดแท็บเจ้ามือกลางรอบ → รอ 60 วิ → C กดรับเป็นเจ้ามือ → กลับ lobby ชิปไม่หาย
10. ทดสอบบนมือถือจริง (หรือ DevTools mobile): เล่นครบรอบได้ ปุ่มกดง่าย ไพ่อ่านออก
11. rules matrix จาก Task 20 ผ่านครบ
12. ไม่มี error/permission_denied ใน console ทุกแท็บตลอดการทดสอบ

- [ ] **Step 3: Commit สุดท้าย**

```bash
git add README.md
git commit -m "docs: setup guide, gameplay manual, deploy instructions"
```

---

## Spec Coverage Checklist (สอบทานตอนจบ)

| Spec § | หัวข้อ | Task |
|---|---|---|
| 2.1 | ห้อง 9 คน / ชิป 1,000 / เติม / min-max bet | 8, 12, 17 |
| 2.2–2.5 | แต้ม ป๊อก เด้ง ลำดับชนะ all-in cap | 2–6 |
| 2.6 | state machine ครบ 7 state + timer 30/45 วิ | 13–15 |
| 2.7 | spectator / หลุดกลางรอบ / ส่งต่อเจ้ามือ | 16, 17 |
| 3 | ไพ่ emoji: pip, หน้า 💂👸🤴, หลัง 🎴, flip, 3 ขนาด, โต๊ะเขียว, mobile | 10, 11, 18 |
| 4.2 | โครงข้อมูล + room code ตัด 0/O/1/I + prune 5 รอบ | 8, 13 |
| 4.3 | ตารางสิทธิ์ read/write | 20 |
| 4.4 | dealer engine + crypto shuffle + resume | 13–16 |
| 4.5 | presence heartbeat / takeover / ห้องร้าง / transaction | 8, 12, 17 |
| 5 | unit tests + manual checklist | 2–6, 21 |
| 7 | trust model + ความเสี่ยง → README | 21 |





