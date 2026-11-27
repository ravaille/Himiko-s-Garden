import { nextRandom, shuffle } from "./rng";
import type { CardDef, Config, GameState, PlayerState, Target, Unit } from "./types";

export const BOARD_SIZE = 7;
/** Central slots in priority order: middle, then left, then right. */
export const CENTER_SLOTS = [3, 2, 4] as const;

export const DEFAULT_CONFIG: Config = {
  kingHp: 150,
  deckSize: 30,
  handSize: 7,
  maxRounds: 60,
};

function newPlayer(deck: CardDef[], state: { rngState: number }, cfg: Config): PlayerState {
  const shuffled = shuffle(deck, state);
  return {
    kingHp: cfg.kingHp,
    deck: shuffled.slice(cfg.handSize),
    hand: shuffled.slice(0, cfg.handSize),
    board: new Array<Unit | null>(BOARD_SIZE).fill(null),
    maxEnergy: 0,
    energy: 0,
    turnsPlayed: 0,
    offered: false,
  };
}

export function newGame(
  decks: [CardDef[], CardDef[]],
  seed: number,
  cfg: Config = DEFAULT_CONFIG,
): GameState {
  const holder = { rngState: seed >>> 0 };
  const p0 = newPlayer(decks[0], holder, cfg);
  const p1 = newPlayer(decks[1], holder, cfg);
  return {
    players: [p0, p1],
    current: 0,
    turn: 0,
    rngState: holder.rngState,
    nextUid: 1,
    winner: null,
    stats: { attacks: 0 },
    events: [],
  };
}

// ---------------------------------------------------------------- turn flow

/** Start of the active player's turn: draw (except the very first turn), refill energy. */
export function beginTurn(state: GameState): void {
  const p = state.players[state.current];
  p.turnsPlayed++;
  if (state.turn > 0) {
    const card = p.deck.shift();
    if (card) p.hand.push(card);
  }
  p.energy = p.maxEnergy;
  // Second player's compensation: +1 temporary energy on their first turn.
  if (state.current === 1 && p.turnsPlayed === 1) p.energy += 1;
  p.offered = false;
}

export function endTurn(state: GameState, cfg: Config = DEFAULT_CONFIG): void {
  state.turn++;
  if (state.winner === null && state.turn >= cfg.maxRounds * 2) state.winner = "draw";
  state.current = state.current === 0 ? 1 : 0;
}

/** Sacrifice a hand card: permanent +energy (1 per turn unless an effect says otherwise). */
export function offer(state: GameState, handIndex: number): void {
  const p = state.players[state.current];
  if (p.offered) throw new Error("Already offered this turn");
  const [card] = p.hand.splice(handIndex, 1);
  if (!card) throw new Error("No such card in hand");
  const gain = card.offering ?? 1;
  p.maxEnergy += gain;
  p.energy += gain;
  p.offered = true;
}

export function playCard(state: GameState, handIndex: number, slot: number): void {
  const p = state.players[state.current];
  const card = p.hand[handIndex];
  if (!card) throw new Error("No such card in hand");
  if (slot < 0 || slot >= BOARD_SIZE || p.board[slot]) throw new Error("Slot unavailable");
  if (card.cost > p.energy) throw new Error("Not enough energy");
  p.hand.splice(handIndex, 1);
  p.energy -= card.cost;
  p.board[slot] = {
    uid: state.nextUid++,
    def: card,
    hp: card.hp,
    deployedOn: p.turnsPlayed,
    lastAttackerUid: null,
  };
}

// ---------------------------------------------------------------- targeting

const isCoward = (u: Unit) => u.def.personality === "coward";

/** Cards an attacker at `slot` can reach by default: facing card, then centre cards. */
export function reachableCards(slot: number, enemy: PlayerState): Extract<Target, { kind: "unit" }>[] {
  const out: Extract<Target, { kind: "unit" }>[] = [];
  const seen = new Set<number>();
  const add = (s: number) => {
    const unit = enemy.board[s];
    if (unit && !seen.has(s)) {
      seen.add(s);
      out.push({ kind: "unit", slot: s, unit });
    }
  };
  add(slot);
  for (const c of CENTER_SLOTS) add(c);
  return preferNonCowards(out);
}

/** Cowards are targeted last: dropped from the list unless they are the only option. */
function preferNonCowards<T extends { unit: Unit }>(list: T[]): T[] {
  const others = list.filter((t) => !isCoward(t.unit));
  return others.length > 0 ? others : list;
}

/** Strongest = most HP, then most attack; ties keep the list's priority order. */
function beefiest<T extends { unit: Unit }>(list: T[]): T | undefined {
  return list.slice().sort((a, b) => b.unit.hp - a.unit.hp || b.unit.def.attack - a.unit.def.attack)[0];
}

const KING: Target = { kind: "king" };

function chooseTarget(
  state: GameState,
  pi: 0 | 1,
  slot: number,
  attacker: Unit,
  acted: Target[],
): Target | null {
  const enemy = state.players[pi === 0 ? 1 : 0];
  const cards = reachableCards(slot, enemy);
  const atk = attacker.def.attack;

  const defensive = (): Target | null => {
    const killable = cards.filter((t) => t.unit.hp <= atk);
    if (killable.length > 0) return beefiest(killable) ?? null;
    if (cards.length === 0 && enemy.kingHp <= atk) return KING;
    return null;
  };
  const vengeful = (): Target | null => {
    if (attacker.lastAttackerUid !== null) {
      for (let s = 0; s < BOARD_SIZE; s++) {
        const u = enemy.board[s];
        if (u && u.uid === attacker.lastAttackerUid) return { kind: "unit", slot: s, unit: u };
      }
    }
    return defensive();
  };

  switch (attacker.def.personality) {
    case "passive":
      return null;
    case "assassin":
      return KING;
    case "brave":
    case "strategist": // provisional: the player's order is not implemented yet
      return cards.length > 0 ? (beefiest(cards) ?? KING) : KING;
    case "berserk": {
      const all: Extract<Target, { kind: "unit" }>[] = [];
      enemy.board.forEach((unit, s) => {
        if (unit) all.push({ kind: "unit", slot: s, unit });
      });
      const pool = preferNonCowards(all);
      if (pool.length === 0) return KING;
      return pool[Math.floor(nextRandom(state) * pool.length)];
    }
    case "defensive":
      return defensive();
    case "vengeful":
      return vengeful();
    case "faithful": {
      for (const t of acted) {
        if (t.kind === "king") return t;
        if (enemy.board[t.slot] === t.unit) return t;
      }
      return vengeful();
    }
    case "guardian":
    case "coward":
    case "none":
    default:
      return cards[0] ?? KING;
  }
}

/** Guardian: adjacent allies of a guardian are shielded by it. */
function redirectToGuardian(enemy: PlayerState, t: Target): Target {
  if (t.kind !== "unit" || t.unit.def.personality === "guardian") return t;
  for (const s of [t.slot - 1, t.slot + 1]) {
    const u = enemy.board[s];
    if (u && u.def.personality === "guardian") return { kind: "unit", slot: s, unit: u };
  }
  return t;
}

function hit(state: GameState, pi: 0 | 1, from: number, attacker: Unit, t: Target): void {
  const enemy = state.players[pi === 0 ? 1 : 0];
  state.stats.attacks++;
  if (t.kind === "king") {
    enemy.kingHp -= attacker.def.attack;
    state.events.push({ side: pi, from, to: "king", damage: attacker.def.attack, killed: false });
    if (enemy.kingHp <= 0) state.winner = pi;
    return;
  }
  t.unit.hp -= attacker.def.attack;
  t.unit.lastAttackerUid = attacker.uid;
  const killed = t.unit.hp <= 0;
  if (killed) enemy.board[t.slot] = null;
  state.events.push({ side: pi, from, to: t.slot, damage: attacker.def.attack, killed });
}

/** Action phase: the active player's deployed cards act left to right. */
export function actionPhase(state: GameState): void {
  const pi = state.current;
  const me = state.players[pi];
  const enemy = state.players[pi === 0 ? 1 : 0];
  const acted: Target[] = [];
  state.events = [];
  for (let slot = 0; slot < BOARD_SIZE; slot++) {
    if (state.winner !== null) return;
    const unit = me.board[slot];
    if (!unit || unit.deployedOn >= me.turnsPlayed) continue; // still deploying
    const chosen = chooseTarget(state, pi, slot, unit, acted);
    if (!chosen) continue;
    const target = redirectToGuardian(enemy, chosen);
    acted.push(target);
    hit(state, pi, slot, unit, target);
  }
}
