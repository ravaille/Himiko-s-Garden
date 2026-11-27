import { castSpell } from "./effects";
import { emit } from "./events";
import { nextRandom, shuffle } from "./rng";
import type { Building, CardDef, Choice, Config, GameState, Keywords, Order, PlayerState, Target, Unit } from "./types";

export const BOARD_SIZE = 7;
export const FATIGUE_DAMAGE = 10;
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
    graveyard: [],
    fatigued: false,
    board: new Array<Unit | null>(BOARD_SIZE).fill(null),
    buildings: new Array<Building | null>(BOARD_SIZE).fill(null),
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
    trace: [],
  };
}

// ---------------------------------------------------------------- turn flow

/** Start of the active player's turn: draw (except the very first turn), refill energy. */
export function beginTurn(state: GameState): void {
  const p = state.players[state.current];
  p.turnsPlayed++;
  p.fatigued = false;
  state.trace = [];
  p.energy = p.maxEnergy;
  // Second player's compensation: +1 temporary energy on their first turn.
  if (state.current === 1 && p.turnsPlayed === 1) p.energy += 1;
  p.offered = false;
  emit(state, { type: "turnStart", side: state.current });
  for (const u of p.board) if (u && kw(u).regen) healUnit(state, state.current, u, kw(u).regen!);
  if (state.turn > 0) drawCard(state, state.current);
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
  p.graveyard.push(card);
  const gain = card.offering ?? 1;
  p.maxEnergy += gain;
  p.energy += gain;
  p.offered = true;
  emit(state, { type: "sacrificed", side: state.current, card });
}

/** Slots used for summoned cards, in order: centre first. */
export const SUMMON_ORDER = [3, 2, 4, 1, 5, 0, 6] as const;

function placeUnit(state: GameState, side: 0 | 1, card: CardDef, slot: number): Unit {
  const p = state.players[side];
  const unit: Unit = {
    uid: state.nextUid++,
    def: card,
    attack: card.attack,
    maxHp: card.hp,
    hp: card.hp,
    deployedOn: p.turnsPlayed,
    lastAttackerUid: null,
  };
  p.board[slot] = unit;
  emit(state, { type: "played", side, slot, uid: unit.uid });
  return unit;
}

/** Puts a card (token) on the first free slot of `side`; returns null when the side is full (nothing happens). */
export function summonUnit(state: GameState, side: 0 | 1, card: CardDef): Unit | null {
  const slot = SUMMON_ORDER.find((s) => !state.players[side].board[s]);
  return slot === undefined ? null : placeUnit(state, side, card, slot);
}

/** Valid targets for a spell cast by `side` (spells may target ghostly cards). Empty list = no target needed or none available. */
export function spellTargets(state: GameState, side: 0 | 1, card: CardDef): Choice[] {
  const kind = card.spell?.target;
  if (!kind) return [];
  const foe = side === 0 ? 1 : 0;
  const unitsOf = (s: 0 | 1): Choice[] =>
    state.players[s].board.flatMap((u, slot) => (u ? [{ kind: "unit" as const, side: s, slot }] : []));
  const buildingsOf = (s: 0 | 1): Choice[] =>
    state.players[s].buildings.flatMap((b, slot) => (b ? [{ kind: "building" as const, side: s, slot }] : []));
  if (kind === "allyUnit") return unitsOf(side);
  if (kind === "enemyUnit") return unitsOf(foe);
  if (kind === "enemyBuilding") return buildingsOf(foe);
  return [...unitsOf(foe), ...buildingsOf(foe), { kind: "king", side: foe }];
}

const sameChoice = (a: Choice, b: Choice): boolean =>
  a.kind === b.kind && a.side === b.side && (a.kind === "king" || (b.kind !== "king" && a.slot === b.slot));

/** What a Strategist may be ordered to attack: any enemy card it can target, any enemy building, or the enemy king. */
export function orderTargets(state: GameState, side: 0 | 1, unit: Unit): Choice[] {
  const foe = side === 0 ? 1 : 0;
  const p = state.players[foe];
  const out: Choice[] = [];
  p.board.forEach((u, slot) => {
    if (u && canTarget(unit, u)) out.push({ kind: "unit", side: foe, slot });
  });
  p.buildings.forEach((b, slot) => {
    if (b) out.push({ kind: "building", side: foe, slot });
  });
  out.push({ kind: "king", side: foe });
  return out;
}

/** The active player orders their Strategist at `slot` to attack `choice` (null clears the order). */
export function giveOrder(state: GameState, slot: number, choice: Choice | null): void {
  const side = state.current;
  const unit = state.players[side].board[slot];
  if (!unit || unit.def.personality !== "strategist") throw new Error("Not a strategist");
  if (choice === null) {
    unit.order = undefined;
    return;
  }
  if (!orderTargets(state, side, unit).some((t) => sameChoice(t, choice))) throw new Error("Invalid target");
  const foeP = state.players[side === 0 ? 1 : 0];
  let order: Order;
  if (choice.kind === "king") order = { kind: "king" };
  else if (choice.kind === "unit") order = { kind: "unit", uid: foeP.board[choice.slot]!.uid };
  else order = { kind: "building", uid: foeP.buildings[choice.slot]!.uid };
  unit.order = order;
}

/**
 * Plays a card from the hand. Creatures need a free `slot`. Spells that need a target take a `choice`
 * (one of `spellTargets`); spells without target ignore both (the UI lets the player drop them anywhere).
 */
export function playCard(state: GameState, handIndex: number, slot: number, choice?: Choice): void {
  const side = state.current;
  const p = state.players[side];
  const card = p.hand[handIndex];
  if (!card) throw new Error("No such card in hand");
  if (card.cost > p.energy) throw new Error("Not enough energy");
  if (card.kind === "spell") {
    let chosen: Choice | null = null;
    if (card.spell?.target) {
      const ok = choice && spellTargets(state, side, card).some((t) => sameChoice(t, choice));
      if (!ok) throw new Error("Invalid target");
      chosen = choice!;
    }
    p.hand.splice(handIndex, 1);
    p.energy -= card.cost;
    castSpell(state, side, card, chosen);
    p.graveyard.push(card);
    emit(state, { type: "spell", side, card });
    return;
  }
  if (card.kind === "building") {
    // A building goes on one of our own slots, whether or not a card stands there; one per slot.
    if (slot < 0 || slot >= BOARD_SIZE || p.buildings[slot]) throw new Error("Slot unavailable");
    p.hand.splice(handIndex, 1);
    p.energy -= card.cost;
    const building: Building = { uid: state.nextUid++, def: card, hp: card.hp, maxHp: card.hp };
    p.buildings[slot] = building;
    emit(state, { type: "buildingPlaced", side, slot, uid: building.uid });
    return;
  }
  if (slot < 0 || slot >= BOARD_SIZE || p.board[slot]) throw new Error("Slot unavailable");
  p.hand.splice(handIndex, 1);
  p.energy -= card.cost;
  placeUnit(state, side, card, slot);
}

// ---------------------------------------------------------------- keywords

/** The keywords a unit has right now. */
export const kw = (u: Unit): Keywords => u.keywords ?? u.def.keywords ?? {};

/** Deployment delay: a unit placed this turn does not act, unless it has Haste. */
export const isDeploying = (p: PlayerState, u: Unit): boolean => u.deployedOn >= p.turnsPlayed && !kw(u).haste;

/** Ghostly units can only be targeted by other ghostly units. */
export const canTarget = (attacker: Unit, victim: Unit): boolean => !kw(victim).ghostly || !!kw(attacker).ghostly;

/** Heals a unit up to its max HP; returns the HP actually recovered. */
export function healUnit(state: GameState, side: 0 | 1, unit: Unit, amount: number): number {
  const slot = state.players[side].board.indexOf(unit);
  const real = Math.min(amount, unit.maxHp - unit.hp);
  if (slot < 0 || real <= 0) return 0;
  unit.hp += real;
  emit(state, { type: "healed", side, slot, uid: unit.uid, amount: real });
  return real;
}

// ---------------------------------------------------------------- targeting

const isCoward = (u: Unit) => u.def.personality === "coward";

type UnitTarget = Extract<Target, { kind: "unit" }>;

/**
 * Cards an attacker at `slot` can reach by default: facing card, then centre cards.
 * With `attacker`: ghostly enemies are skipped (unless it is ghostly too) and Bushido only sees the facing card.
 */
export function reachableCards(slot: number, enemy: PlayerState, attacker?: Unit): UnitTarget[] {
  const out: UnitTarget[] = [];
  const seen = new Set<number>();
  const add = (s: number) => {
    const unit = enemy.board[s];
    if (unit && !seen.has(s) && (!attacker || canTarget(attacker, unit))) {
      seen.add(s);
      out.push({ kind: "unit", slot: s, unit });
    }
  };
  add(slot);
  if (!(attacker && kw(attacker).bushido)) for (const c of CENTER_SLOTS) add(c);
  return preferNonCowards(out);
}

/** Cowards are targeted last: dropped from the list unless they are the only option. */
function preferNonCowards<T extends { unit: Unit }>(list: T[]): T[] {
  const others = list.filter((t) => !isCoward(t.unit));
  return others.length > 0 ? others : list;
}

/** Strongest = most HP, then most attack; ties keep the list's priority order. */
function beefiest<T extends { unit: Unit }>(list: T[]): T | undefined {
  return list.slice().sort((a, b) => b.unit.hp - a.unit.hp || b.unit.attack - a.unit.attack)[0];
}

const KING: Target = { kind: "king" };

/** Enemy buildings as targets, left to right. Automatic targeting ignores them, except Demolisher and Berserk. */
function buildingTargets(enemy: PlayerState): Extract<Target, { kind: "building" }>[] {
  return enemy.buildings.flatMap((b, slot) => (b ? [{ kind: "building" as const, slot, building: b }] : []));
}

function chooseTarget(
  state: GameState,
  pi: 0 | 1,
  slot: number,
  attacker: Unit,
  acted: Target[],
): Target | null {
  const enemy = state.players[pi === 0 ? 1 : 0];
  const cards = reachableCards(slot, enemy, attacker);
  const atk = attacker.attack;

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
        if (u && u.uid === attacker.lastAttackerUid && canTarget(attacker, u)) return { kind: "unit", slot: s, unit: u };
      }
    }
    return defensive();
  };

  switch (attacker.def.personality) {
    case "passive":
      return null;
    case "assassin":
      return KING;
    case "strategist": {
      // Follows the player's order; once the target is gone (or with no order) it fights like a Brave.
      const o = attacker.order;
      if (o) {
        if (o.kind === "king") return KING;
        if (o.kind === "unit") {
          const s = enemy.board.findIndex((u) => u?.uid === o.uid);
          const u = enemy.board[s];
          if (u && canTarget(attacker, u)) return { kind: "unit", slot: s, unit: u };
        } else {
          const s = enemy.buildings.findIndex((b) => b?.uid === o.uid);
          const b = enemy.buildings[s];
          if (b) return { kind: "building", slot: s, building: b };
        }
        attacker.order = undefined;
      }
      return cards.length > 0 ? (beefiest(cards) ?? KING) : KING;
    }
    case "brave":
      return cards.length > 0 ? (beefiest(cards) ?? KING) : KING;
    case "berserk": {
      const all: UnitTarget[] = [];
      enemy.board.forEach((unit, s) => {
        if (unit && canTarget(attacker, unit)) all.push({ kind: "unit", slot: s, unit });
      });
      const pool: Target[] = kw(attacker).bushido ? cards : [...preferNonCowards(all), ...buildingTargets(enemy)];
      if (pool.length === 0) return KING;
      return pool[Math.floor(nextRandom(state) * pool.length)];
    }
    case "demolisher": {
      // Buildings on empty slots first; else the card standing on a building; with none, only retaliates.
      const bs = buildingTargets(enemy);
      const bare = bs.find((b) => !enemy.board[b.slot]);
      if (bare) return bare;
      for (const b of bs) {
        const u = enemy.board[b.slot];
        if (u && canTarget(attacker, u)) return { kind: "unit", slot: b.slot, unit: u };
      }
      if (attacker.lastAttackerUid !== null) {
        for (let s = 0; s < BOARD_SIZE; s++) {
          const u = enemy.board[s];
          if (u && u.uid === attacker.lastAttackerUid && canTarget(attacker, u)) return { kind: "unit", slot: s, unit: u };
        }
      }
      return null;
    }
    case "defensive":
      return defensive();
    case "vengeful":
      return vengeful();
    case "faithful": {
      for (const t of acted) {
        if (t.kind === "king") return t;
        if (t.kind === "building") {
          if (enemy.buildings[t.slot] === t.building) return t;
        } else if (enemy.board[t.slot] === t.unit && canTarget(attacker, t.unit)) return t;
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

/** Guardian: adjacent allies of a guardian are shielded by it, even a ghostly one (attackers blindly hit it). */
function redirectToGuardian(enemy: PlayerState, t: Target, _attacker: Unit): Target {
  if (t.kind === "king" || (t.kind === "unit" && t.unit.def.personality === "guardian")) return t;
  for (const s of [t.slot - 1, t.slot + 1]) {
    const u = enemy.board[s];
    if (u && u.def.personality === "guardian") return { kind: "unit", slot: s, unit: u };
  }
  return t;
}

const isAlive = (enemy: PlayerState, t: Target): boolean =>
  t.kind === "king" || (t.kind === "building" ? enemy.buildings[t.slot] === t.building : enemy.board[t.slot] === t.unit);

/** Next target when the current one is gone (Multihit, Piercing): the attacker's usual pick, else the list, else the king. */
function nextTarget(state: GameState, pi: 0 | 1, slot: number, attacker: Unit): Target {
  const enemy = state.players[pi === 0 ? 1 : 0];
  return chooseTarget(state, pi, slot, attacker, []) ?? reachableCards(slot, enemy, attacker)[0] ?? KING;
}

/** Damages a card. Handles the `damaged`/`died` events and records who touched it. */
export function hurtUnit(
  state: GameState,
  side: 0 | 1,
  unit: Unit,
  amount: number,
  source: Unit | null,
): { before: number; killed: boolean } {
  const p = state.players[side];
  const slot = p.board.indexOf(unit);
  if (slot < 0) return { before: 0, killed: false };
  const before = unit.hp;
  unit.hp -= amount;
  if (source) unit.lastAttackerUid = source.uid;
  (unit.touchedBy ??= []).push(source?.uid ?? -1);
  emit(state, { type: "damaged", side, slot, uid: unit.uid, amount, sourceUid: source?.uid ?? null });
  const killed = unit.hp <= 0;
  if (killed && p.board[slot] === unit) {
    p.board[slot] = null;
    p.graveyard.push(unit.def);
    emit(state, { type: "died", side, slot, uid: unit.uid, card: unit.def, unit });
  }
  return { before, killed };
}

/** Damages a building; destroyed at 0 HP (goes to the graveyard). */
export function hurtBuilding(state: GameState, side: 0 | 1, building: Building, amount: number): { before: number; killed: boolean } {
  const p = state.players[side];
  const slot = p.buildings.indexOf(building);
  if (slot < 0) return { before: 0, killed: false };
  const before = building.hp;
  building.hp -= amount;
  const killed = building.hp <= 0;
  if (killed) {
    p.buildings[slot] = null;
    p.graveyard.push(building.def);
    emit(state, { type: "buildingDestroyed", side, slot, uid: building.uid, card: building.def, building });
  }
  return { before, killed };
}

/** Damages a king; the other side wins when it reaches 0. */
export function hurtKing(state: GameState, side: 0 | 1, amount: number): void {
  const p = state.players[side];
  p.kingHp -= amount;
  emit(state, { type: "kingHit", side, amount });
  if (p.kingHp <= 0 && state.winner === null) state.winner = side === 0 ? 1 : 0;
}

/** Draws a card for `side`. An empty deck costs the king 10 HP (no stalemates). Returns false on a failed draw. */
export function drawCard(state: GameState, side: 0 | 1): boolean {
  const p = state.players[side];
  const card = p.deck.shift();
  if (card) {
    p.hand.push(card);
    emit(state, { type: "draw", side, failed: false });
    return true;
  }
  p.fatigued = true;
  p.kingHp -= FATIGUE_DAMAGE;
  if (p.kingHp <= 0 && state.winner === null) state.winner = side === 0 ? 1 : 0;
  emit(state, { type: "draw", side, failed: true });
  return false;
}

interface Blow {
  killed: boolean;
  /** Damage beyond the target's remaining HP. */
  excess: number;
}

/** One instance of damage from `attacker` to `t`; handles Lifesteal and Bushido on top of the damage. */
function deal(state: GameState, pi: 0 | 1, from: number, attacker: Unit, t: Target, amount: number): Blow {
  const foe = pi === 0 ? 1 : 0;
  if (t.kind === "king") {
    state.events.push({ side: pi, from, to: "king", damage: amount, killed: false });
    hurtKing(state, foe, amount);
    if (kw(attacker).lifesteal) healUnit(state, pi, attacker, Math.floor(amount / 2));
    return { killed: false, excess: 0 };
  }
  if (t.kind === "building") {
    const r = hurtBuilding(state, foe, t.building, amount);
    state.events.push({ side: pi, from, to: t.slot, damage: amount, killed: r.killed });
    if (kw(attacker).lifesteal) healUnit(state, pi, attacker, Math.floor(Math.min(amount, r.before) / 2));
    return { killed: r.killed, excess: r.killed ? amount - r.before : 0 };
  }
  const victim = t.unit;
  const { before, killed } = hurtUnit(state, foe, victim, amount, attacker);
  state.events.push({ side: pi, from, to: t.slot, damage: amount, killed });
  if (kw(attacker).lifesteal) healUnit(state, pi, attacker, Math.floor(Math.min(amount, before) / 2));
  // Bushido: a clean kill (nobody else touched the target) heals the attacker fully.
  if (killed && kw(attacker).bushido && victim.touchedBy!.every((id) => id === attacker.uid)) {
    healUnit(state, pi, attacker, attacker.maxHp);
  }
  return { killed, excess: killed ? amount - before : 0 };
}

/** One strike: the blow, plus Piercing overflow to the next targets. */
function strike(state: GameState, pi: 0 | 1, from: number, attacker: Unit, first: Target): void {
  state.stats.attacks++;
  emit(state, { type: "attack", side: pi, slot: from, uid: attacker.uid, target: first.kind === "king" ? "king" : first.slot });
  let target = first;
  let amount = attacker.attack;
  for (;;) {
    const blow = deal(state, pi, from, attacker, target, amount);
    if (!kw(attacker).piercing || blow.excess <= 0 || state.winner !== null) return;
    target = nextTarget(state, pi, from, attacker);
    amount = blow.excess;
  }
}

/** A unit's whole attack: first target (with Guardian redirect), then Multihit extra strikes. */
function attackWith(state: GameState, pi: 0 | 1, slot: number, attacker: Unit, chosen: Target, acted: Target[]): void {
  const enemy = state.players[pi === 0 ? 1 : 0];
  const first = redirectToGuardian(enemy, chosen, attacker);
  acted.push(first);
  let target = first;
  const strikes = Math.max(1, kw(attacker).multihit ?? 1);
  for (let i = 0; i < strikes; i++) {
    if (state.winner !== null) return;
    if (i > 0 && !isAlive(enemy, target)) target = nextTarget(state, pi, slot, attacker);
    strike(state, pi, slot, attacker, target);
  }
}

/** Action phase: the active player's deployed cards act left to right. */
export function actionPhase(state: GameState): void {
  const pi = state.current;
  const me = state.players[pi];
  state.events = [];
  const acted: Target[] = [];
  for (let slot = 0; slot < BOARD_SIZE; slot++) {
    if (state.winner !== null) return;
    const unit = me.board[slot];
    if (!unit || isDeploying(me, unit)) continue;
    const chosen = chooseTarget(state, pi, slot, unit, acted);
    if (!chosen) continue;
    attackWith(state, pi, slot, unit, chosen, acted);
  }
}

/**
 * Preview for the UI: who would a card of this definition hit if placed at `slot` for player `pi`?
 * Does not consume randomness (Berserk returns every possible enemy).
 */
export function previewTargets(
  state: GameState,
  pi: 0 | 1,
  slot: number,
  def: CardDef,
): { targets: Target[]; note: string | null } {
  const enemy = state.players[pi === 0 ? 1 : 0];
  const ghost: Unit = { uid: -1, def, attack: def.attack, maxHp: def.hp, hp: def.hp, deployedOn: 0, lastAttackerUid: null };
  if (def.personality === "berserk" && !def.keywords?.bushido) {
    const all: Target[] = [];
    enemy.board.forEach((unit, s) => {
      if (unit && canTarget(ghost, unit)) all.push({ kind: "unit", slot: s, unit });
    });
    all.push(...buildingTargets(enemy));
    return { targets: all.length > 0 ? all : [KING], note: "au hasard parmi tous les ennemis" };
  }
  if (def.personality === "passive") return { targets: [], note: "n'attaque pas" };
  const chosen = chooseTarget(state, pi, slot, ghost, []);
  if (!chosen) return { targets: [], note: "n'attaquera pas (aucune cible sûre)" };
  const final = redirectToGuardian(enemy, chosen, ghost);
  const note = def.personality === "faithful" ? "dépend des alliés qui attaquent avant elle" : null;
  return { targets: [final], note };
}
