import { db, F, serverNow } from './firebase.js';
import { newDeck, shuffle, evaluate, settleRound, CATEGORY } from './pokdeng.js';

const ACT_MS=30000, DEALER_MS=45000, REVEAL_HOLD_MS=2400, KEEP_ROUNDS=5;
let latest=null, busy=false, settling=false;
const roomPath=(S)=>`rooms/${S.code}`, roundPath=(S)=>`${roomPath(S)}/rounds/${S.meta.round}`;
const isPok=(hand)=>{const category=evaluate(hand).category;return category===CATEGORY.POK8||category===CATEGORY.POK9;};
export function dealerTick(S){latest=S; void maybeAdvance();}
setInterval(()=>void maybeAdvance(),1000);
export async function dealerCommand(action,payload,S){switch(action){case'start-betting':case'next-round':return startBetting(S);case'deal':return deal(S);case'dealer-hit':return dealerHit(S);case'dealer-stay':return revealAndSettle(S);case'to-lobby':return F.update(F.ref(db,`${roomPath(S)}/meta`),{state:'lobby',turnDeadline:null});default:console.warn('unknown dealer command',action);}}
async function startBetting(S) {
  if (!['lobby', 'settled'].includes(S.meta.state)) return;
  const next = S.meta.round + 1;
  const updates = { 'meta/state': 'betting', 'meta/round': next, 'meta/turnDeadline': null, reactions: null };
  const old = next - KEEP_ROUNDS;
  if (old >= 1) updates[`rounds/${old}`] = null;
  await F.update(F.ref(db, roomPath(S)), updates);

  // Write after the meta update so the existing player-bet security rule sees
  // state=betting and the current round. Only eligible online players are opted in.
  const amount = Number(S.meta.autoBet) || 0;
  if (amount < S.meta.minBet || amount > S.meta.maxBet) return;
  const autoBets = {};
  for (const [id, player] of Object.entries(S.players)) {
    if (id === S.meta.hostUid || !player.online || player.joinedRound > next || player.chips < amount) continue;
    autoBets[`rounds/${next}/bets/${id}`] = amount;
  }
  if (Object.keys(autoBets).length) await F.update(F.ref(db, roomPath(S)), autoBets);
}
async function deal(S){if(S.meta.state!=='betting')return;const bettors=Object.keys(S.bets);if(!bettors.length)return;const deck=shuffle(newDeck()),hands={};for(const id of bettors)hands[id]=[deck.pop(),deck.pop()];const host=S.meta.hostUid;hands[host]=[deck.pop(),deck.pop()];const revealed={};for(const id of bettors)if(isPok(hands[id]))revealed[id]=true;if(isPok(hands[host]))revealed[host]=true;await F.update(F.ref(db,roomPath(S)),{[`rounds/${S.meta.round}/deck`]:deck,[`rounds/${S.meta.round}/hands`]:hands,[`rounds/${S.meta.round}/revealed`]:Object.keys(revealed).length?revealed:null,'meta/state':'dealing','meta/turnDeadline':null,'meta/phaseStartedAt':serverNow()});setTimeout(()=>void maybeAdvance(),950);}
async function thirdCards(S){const pending=Object.keys(S.actions).filter((id)=>S.actions[id]==='hit'&&(S.hands[id]?.length??2)<3);if(!pending.length||!S.deck?.length)return false;const deck=[...S.deck],updates={};for(const id of pending){if(!deck.length)break;updates[`${roundPath(S)}/hands/${id}/2`]=deck.pop();}updates[`${roundPath(S)}/deck`]=deck;await F.update(F.ref(db),updates);return true;}
async function dealerHit(S){if(S.meta.state!=='dealerTurn'||!S.deck?.length)return;const host=S.meta.hostUid;if((S.hands[host]?.length??2)>=3)return;const deck=[...S.deck];await F.update(F.ref(db),{[`${roundPath(S)}/hands/${host}/2`]:deck.pop(),[`${roundPath(S)}/deck`]:deck,[`${roundPath(S)}/dealerDrew`]:true});await revealAndSettle(S);}
export async function revealAndSettle(S) {
  if (!S?.amHost || settling || S.meta.state === 'settled') return;
  settling = true;
  try {
    await F.update(F.ref(db, `${roomPath(S)}/meta`), { state: 'reveal', turnDeadline: null });
    await new Promise((resolve) => setTimeout(resolve, REVEAL_HOLD_MS));

    // The host already subscribes to every path needed for a round. Settling
    // from that local, live state avoids a second Firebase read that can be
    // denied by a more restrictive deployment of RTDB rules.
    const current = latest;
    if (!current?.amHost || current.meta.state === 'settled') return;
    const { meta, players, bets, hands } = current;
    const round = meta.round;
    const host = meta.hostUid;
    if (!hands[host] || Object.keys(bets).some((id) => !hands[id])) return;
    const playerChips = {};
    for (const id of Object.keys(bets)) playerChips[id] = players[id]?.chips ?? 0;
    const settled = settleRound({ bets, hands, dealerHand: hands[host], playerChips });

    const updates = { 'meta/state': 'settled', 'meta/turnDeadline': null };
    for (const [id, delta] of Object.entries(settled.playerDeltas)) {
      updates[`players/${id}/chips`] = (players[id]?.chips ?? 0) + delta;
      updates[`rounds/${round}/results/${id}`] = {
        delta,
        rankName: settled.evals[id].rankName,
        deng: settled.evals[id].deng,
        points: settled.evals[id].points,
      };
    }
    updates[`players/${host}/chips`] = (players[host]?.chips ?? 0) + settled.dealerDelta;
    updates[`rounds/${round}/results/${host}`] = {
      delta: settled.dealerDelta,
      rankName: settled.dealerEval.rankName,
      deng: settled.dealerEval.deng,
      points: settled.dealerEval.points,
    };
    await F.update(F.ref(db, roomPath(S)), updates);
  } catch (error) {
    console.error('settle failed', error);
  } finally {
    settling = false;
  }
}
async function maybeAdvance(){const S=latest;if(!S?.amHost||busy||!['dealing','acting','dealerTurn','reveal'].includes(S.meta.state))return;busy=true;try{const now=serverNow();if(S.meta.state==='dealing'){if(now-(S.meta.phaseStartedAt||0)<900)return;const host=S.meta.hostUid;if(!S.hands[host])return;const bettors=Object.keys(S.bets),dealerPok=Boolean(S.revealed[host]),allPok=bettors.length>0&&bettors.every((id)=>S.revealed[id]);if(dealerPok||allPok)await revealAndSettle(S);else await F.update(F.ref(db,`${roomPath(S)}/meta`),{state:'acting',turnDeadline:now+ACT_MS});}else if(S.meta.state==='acting'){await thirdCards(S);const bettors=Object.keys(S.bets),answered=bettors.every((id)=>S.revealed[id]||S.actions[id]),expired=S.meta.turnDeadline&&now>=S.meta.turnDeadline,pending=bettors.some((id)=>S.actions[id]==='hit'&&(S.hands[id]?.length??2)<3);if((answered||expired)&&!pending)await F.update(F.ref(db,`${roomPath(S)}/meta`),{state:'dealerTurn',turnDeadline:serverNow()+DEALER_MS});}else if(S.meta.state==='dealerTurn'){if(S.meta.turnDeadline&&now>=S.meta.turnDeadline)await revealAndSettle(S);}else if(S.meta.state==='reveal'&&!S.results[S.meta.hostUid])await revealAndSettle(S);}catch(error){console.error('dealer engine',error);}finally{busy=false;}}
