import { BOARD_SIZE, SUMMON_ORDER, canTarget, drawCard, healUnit, hurtBuilding, hurtKing, hurtUnit, kw, playFree, summonUnit } from "./engine";
import { onEvent, onSettled } from "./events";
import { nextRandom } from "./rng";
import type {
  Action,
  Amount,
  Building,
  CardDef,
  CardFilter,
  Choice,
  Condition,
  Effect,
  GameEvent,
  GameState,
  Measure,
  Selector,
  Unit,
} from "./types";

/**
 * Card effects (docs/design/08-effects-format.md): trigger -> (conditions) -> action(s), resolved synchronously
 * on the event bus. Resolution order when several cards react to the same event: the active player's cards left
 * to right (a card, then the building on its slot), then the opponent's. Effects of cards and buildings cannot
 * target ghostly enemy cards; spells can.
 *
 * Passive effects (`on: "passive"`) are not triggered: auras are recomputed after every resolved event chain.
 */

/** Where an action comes from: a card or a building on the board, or a spell. */
interface Ctx {
  side: 0 | 1;
  /** The card the effect belongs to (a card on the board, a building, a card in the deck list, or the spell). */
  def: CardDef;
  /** True for effects working from the deck list rather than from the board. */
  deck: boolean;
  slot: number;
  unit: Unit | null;
  building: Building | null;
  spell: boolean;
  /** The target the player picked when casting a spell. */
  chosen: Choice | null;
}

type Ref =
  | { kind: "unit"; side: 0 | 1; unit: Unit }
  | { kind: "building"; side: 0 | 1; slot: number; building: Building }
  | { kind: "king"; side: 0 | 1 };

function matches(e: Effect, c: Ctx, ev: GameEvent): boolean {
  const uid = c.unit?.uid ?? c.building?.uid;
  switch (e.on) {
    case "passive":
      return false;
    case "drawFailed":
      return ev.type === "draw" && ev.failed && ev.side === c.side;
    case "allyDamaged":
      return ev.type === "damaged" && ev.side === c.side;
    case "play":
      return (ev.type === "played" || ev.type === "buildingPlaced") && ev.uid === uid;
    case "turnStart":
      return ev.type === "turnStart" && ev.side === c.side;
    case "attack":
      return ev.type === "attack" && ev.uid === uid;
    case "damaged":
      return ev.type === "damaged" && ev.uid === uid;
    case "death":
      return (ev.type === "died" || ev.type === "buildingDestroyed") && ev.uid === uid;
    case "allyDeath":
      return ev.type === "died" && ev.side === c.side && ev.uid !== uid;
    case "enemyDeath":
      return ev.type === "died" && ev.side !== c.side;
    case "kingHit":
      return ev.type === "kingHit" && ev.side === c.side;
    case "draw":
      return ev.type === "draw" && !ev.failed && ev.side === c.side;
    case "sacrifice":
      return ev.type === "sacrificed" && ev.side === c.side;
    case "spell":
      return ev.type === "spell" && ev.side === c.side;
    case "anySpell":
      return ev.type === "spell";
    case "slotAttacked":
      return !!c.building && ev.type === "attack" && ev.side !== c.side && ev.target === c.slot;
  }
}

const units = (state: GameState, side: 0 | 1): Unit[] => state.players[side].board.filter((u): u is Unit => u !== null);
const buildings = (state: GameState, side: 0 | 1): Ref[] =>
  state.players[side].buildings.flatMap((b, slot) => (b ? [{ kind: "building" as const, side, slot, building: b }] : []));

/** Types a card has right now: its own plus the ones granted by passive effects. */
export const effectiveTypes = (u: Unit): string[] => [...(u.def.types ?? []), ...(u.auraTypes ?? [])];

function matchesFilter(def: CardDef, types: string[], f?: CardFilter): boolean {
  if (!f) return true;
  if (f.race && def.race !== f.race) return false;
  if (f.type && !types.includes(f.type)) return false;
  if (f.rank && def.rank !== f.rank) return false;
  if (f.minCost !== undefined && def.cost < f.minCost) return false;
  if (f.maxCost !== undefined && def.cost > f.maxCost) return false;
  return true;
}

const unitMatches = (u: Unit, f?: CardFilter) => matchesFilter(u.def, effectiveTypes(u), f);
const cardMatches = (d: CardDef, f?: CardFilter) => matchesFilter(d, d.types ?? [], f);

/** Does a card in hand / deck / graveyard match a filter? (printed types only) */
export const cardMatchesFilter = cardMatches;

/** How many of `m` there are, from the point of view of the card carrying the effect. */
function measure(state: GameState, c: Ctx, m: Measure): number {
  const foe = c.side === 0 ? 1 : 0;
  const me = state.players[c.side];
  const op = state.players[foe];
  const pct = (hp: number) => Math.round((100 * hp) / state.startKingHp);
  switch (m.of) {
    case "allyUnits":
      return units(state, c.side).filter((u) => !(m.others && u === c.unit) && unitMatches(u, m.filter)).length;
    case "enemyUnits":
      return units(state, foe).filter((u) => unitMatches(u, m.filter)).length;
    case "allyBuildings":
      return me.buildings.filter((b) => b && !(m.others && b === c.building) && cardMatches(b.def, m.filter)).length;
    case "enemyBuildings":
      return op.buildings.filter((b) => b && cardMatches(b.def, m.filter)).length;
    case "ownGraveyard":
      return me.graveyard.filter((d) => cardMatches(d, m.filter)).length;
    case "enemyGraveyard":
      return op.graveyard.filter((d) => cardMatches(d, m.filter)).length;
    case "ownHand":
      return me.hand.filter((d) => cardMatches(d, m.filter)).length;
    case "ownDeck":
      return me.deck.filter((d) => cardMatches(d, m.filter)).length;
    case "selfEquipment":
      return c.unit?.equipped ?? 0;
    case "ownKingHp":
      return me.kingHp;
    case "enemyKingHp":
      return op.kingHp;
    case "ownKingPct":
      return pct(me.kingHp);
    case "enemyKingPct":
      return pct(op.kingHp);
  }
}

function amount(state: GameState, c: Ctx, a: Amount | undefined, ev: GameEvent | null): number {
  if (a === undefined) return 0;
  if (typeof a === "number") return a;
  if ("pct" in a) return ev?.type === "damaged" ? Math.floor((ev.amount * a.pct) / 100) : 0;
  return (a.base ?? 0) + a.per * measure(state, c, a.of);
}

function holds(state: GameState, c: Ctx, conditions: Condition[] | undefined): boolean {
  return (conditions ?? []).every((k) => {
    const n = measure(state, c, k.of);
    switch (k.op) {
      case "<":
        return n < k.value;
      case "<=":
        return n <= k.value;
      case ">":
        return n > k.value;
      case ">=":
        return n >= k.value;
      case "==":
        return n === k.value;
    }
  });
}

function findByUid(state: GameState, uid: number): Ref | null {
  for (const side of [0, 1] as const) {
    const unit = units(state, side).find((u) => u.uid === uid);
    if (unit) return { kind: "unit", side, unit };
  }
  return null;
}

/** `withBuildings`: "all enemies" selectors also reach buildings when damaging or destroying (area spells hit them). */
function resolve(state: GameState, c: Ctx, sel: Selector, ev: GameEvent | null, withBuildings = false): Ref[] {
  const foe = c.side === 0 ? 1 : 0;
  const mine = state.players[c.side];
  // Ghostly enemies are out of reach of card and building effects, but not of spells.
  const reach = (u: Unit) => c.spell || (c.unit ? canTarget(c.unit, u) : !kw(u).ghostly);
  const targetable = () => units(state, foe).filter(reach);
  const asRefs = (side: 0 | 1, list: Unit[]): Ref[] => list.map((unit) => ({ kind: "unit", side, unit }));
  switch (sel) {
    case "self":
      if (c.unit) return [{ kind: "unit", side: c.side, unit: c.unit }];
      return c.building ? [{ kind: "building", side: c.side, slot: c.slot, building: c.building }] : [];
    case "slotUnit": {
      const u = c.unit ?? (c.slot >= 0 ? mine.board[c.slot] : null);
      return u ? asRefs(c.side, [u]) : [];
    }
    case "chosen": {
      const ch = c.chosen;
      if (!ch) return [];
      if (ch.kind === "king") return [{ kind: "king", side: ch.side }];
      if (ch.kind === "building") {
        const b = state.players[ch.side].buildings[ch.slot];
        return b ? [{ kind: "building", side: ch.side, slot: ch.slot, building: b }] : [];
      }
      const u = state.players[ch.side].board[ch.slot];
      return u ? [{ kind: "unit", side: ch.side, unit: u }] : [];
    }
    case "facing": {
      const u = c.slot >= 0 ? state.players[foe].board[c.slot] : null;
      return u && reach(u) ? asRefs(foe, [u]) : [];
    }
    case "enemies":
      return [...asRefs(foe, targetable()), ...(withBuildings ? buildings(state, foe) : [])];
    case "allies":
      return asRefs(c.side, units(state, c.side).filter((u) => u !== c.unit));
    case "adjacent":
      return c.slot >= 0 ? asRefs(c.side, [c.slot - 1, c.slot + 1].map((s) => mine.board[s]).filter((u): u is Unit => !!u)) : [];
    case "randomEnemy": {
      const list = targetable();
      return list.length ? asRefs(foe, [list[Math.floor(nextRandom(state) * list.length)]]) : [];
    }
    case "strongestEnemy": {
      const best = targetable().sort((a, b) => b.hp - a.hp || b.attack - a.attack)[0];
      return best ? asRefs(foe, [best]) : [];
    }
    case "enemyKing":
      return [{ kind: "king", side: foe }];
    case "ownKing":
      return [{ kind: "king", side: c.side }];
    case "source": {
      const uid = ev?.type === "damaged" ? ev.sourceUid : ev?.type === "attack" ? ev.uid : null;
      const r = uid === null || uid === undefined ? null : findByUid(state, uid);
      return r ? [r] : [];
    }
  }
}

function apply(state: GameState, c: Ctx, action: Action, ev: GameEvent | null): void {
  const n = (a: Amount | undefined) => amount(state, c, a, ev);
  switch (action.kind) {
    case "damage": {
      const dmg = n(action.amount);
      for (const r of resolve(state, c, action.to, ev, action.to === "enemies")) {
        if (state.winner !== null) return;
        if (r.kind === "king") hurtKing(state, r.side, dmg);
        else if (r.kind === "building") hurtBuilding(state, r.side, r.building, dmg);
        else hurtUnit(state, r.side, r.unit, dmg, c.unit);
      }
      return;
    }
    case "destroy":
      for (const r of resolve(state, c, action.to, ev, action.to === "enemies")) {
        if (r.kind === "unit") hurtUnit(state, r.side, r.unit, Math.max(1, r.unit.hp), c.unit);
        else if (r.kind === "building") hurtBuilding(state, r.side, r.building, Math.max(1, r.building.hp));
      }
      return;
    case "heal": {
      const amt = n(action.amount);
      for (const r of resolve(state, c, action.to, ev)) {
        if (r.kind === "king") state.players[r.side].kingHp += amt;
        else if (r.kind === "building") r.building.hp = Math.min(r.building.maxHp, r.building.hp + amt);
        else healUnit(state, r.side, r.unit, amt);
      }
      return;
    }
    case "buff": {
      const atk = n(action.attack);
      const hp = n(action.hp);
      for (const r of resolve(state, c, action.to, ev)) {
        if (r.kind === "unit") {
          r.unit.attack += atk;
          r.unit.maxHp += hp;
          r.unit.hp += hp;
        } else if (r.kind === "building") {
          r.building.maxHp += hp;
          r.building.hp += hp;
        }
      }
      return;
    }
    case "draw":
      for (let i = 0, count = n(action.count); i < count && state.winner === null; i++) drawCard(state, c.side);
      return;
    case "energy":
      state.players[c.side].energy += n(action.amount);
      return;
    case "summon":
      for (let i = 0, count = action.count === undefined ? 1 : n(action.count); i < count; i++) summonUnit(state, c.side, action.card);
      return;
    case "win":
      if (state.winner === null) state.winner = c.side;
      return;
    case "freePlay": {
      const p = state.players[c.side];
      p.freePlays.push(action.filter);
      if (!action.random) return; // the player will choose during the placement phase
      const options = p.hand.flatMap((d, i) => (d.kind !== "spell" && (!d.kind || d.kind === "creature") && cardMatches(d, action.filter) ? [i] : []));
      const slot = SUMMON_ORDER.find((s) => !p.board[s]);
      if (options.length && slot !== undefined) playFree(state, options[Math.floor(nextRandom(state) * options.length)], slot, c.side);
      else p.freePlays.pop();
      return;
    }
    case "aura":
    case "grantType":
      return; // passive only: handled by refreshAuras
  }
}

/** Resolves a spell's actions for `side` (the engine moves the card and emits the `spell` event). */
export function castSpell(state: GameState, side: 0 | 1, def: CardDef, chosen: Choice | null): void {
  const ctx: Ctx = { side, slot: -1, unit: null, building: null, spell: true, chosen, def, deck: false };
  for (const action of def.spell?.do ?? []) {
    if (state.winner !== null) return;
    apply(state, ctx, action, null);
  }
  // Equipment stays counted on the card it was used on.
  if (def.equipment && chosen?.kind === "unit") {
    const u = state.players[chosen.side].board[chosen.slot];
    if (u) u.equipped = (u.equipped ?? 0) + 1;
  }
}

/** For effects about another card: does the card the event is about match the effect's `subject` filter? */
function subjectOk(state: GameState, e: Effect, ev: GameEvent): boolean {
  if (!e.subject) return true;
  const u = ev.type === "damaged" ? findByUid(state, ev.uid) : ev.type === "died" ? { kind: "unit" as const, unit: ev.unit } : null;
  return !!u && u.kind === "unit" && unitMatches(u.unit, e.subject);
}

/** Board effects only work from the board, deck effects only from the deck list. */
const zoneOk = (c: Ctx, e: Effect): boolean => (c.deck ? e.zone === "deck" : e.zone !== "deck");

/** Does the player's side currently replace the fatigue damage (e.g. a Demon General in the deck)? */
export function fatigueReplaced(state: GameState, side: 0 | 1): boolean {
  return carriersOf(state, null).some(
    (c) => c.side === side && (c.def.effects ?? []).some((e) => e.replaces === "fatigue" && e.on === "drawFailed" && zoneOk(c, e) && holds(state, c, e.if)),
  );
}

/** Every card and building that carries effects, in resolution order (active player first, left to right). */
function carriersOf(state: GameState, ev: GameEvent | null): Ctx[] {
  const out: Ctx[] = [];
  const order: (0 | 1)[] = state.current === 0 ? [0, 1] : [1, 0];
  const base = (side: 0 | 1, slot: number) => ({ side, slot, spell: false, chosen: null, deck: false });
  for (const side of order) {
    const p = state.players[side];
    for (let slot = 0; slot < BOARD_SIZE; slot++) {
      const unit = p.board[slot];
      if (unit) out.push({ ...base(side, slot), unit, building: null, def: unit.def });
      // A card that just died is already off the board but must still resolve its own "death" effects.
      else if (ev?.type === "died" && ev.side === side && ev.slot === slot) out.push({ ...base(side, slot), unit: ev.unit, building: null, def: ev.unit.def });
      const building = p.buildings[slot];
      if (building) out.push({ ...base(side, slot), unit: null, building, def: building.def });
      else if (ev?.type === "buildingDestroyed" && ev.side === side && ev.slot === slot) out.push({ ...base(side, slot), unit: null, building: ev.building, def: ev.building.def });
    }
    // Cards of the deck list whose effects work from the deck, wherever the card is right now.
    for (const def of p.decklist) {
      if (def.effects?.some((e) => e.zone === "deck")) out.push({ ...base(side, -1), deck: true, unit: null, building: null, def });
    }
  }
  return out;
}

/** The event-bus handler: lets every card and building react to `ev`. */
function runEffects(state: GameState, ev: GameEvent): void {
  for (const c of carriersOf(state, ev)) {
    const effects = c.def.effects;
    if (!effects) continue;
    for (const e of effects) {
      if (state.winner !== null) return;
      if (!zoneOk(c, e)) continue;
      const p = state.players[c.side];
      const alive = c.deck || (c.unit ? p.board[c.slot] === c.unit : p.buildings[c.slot] === c.building);
      if (!alive && e.on !== "death") continue;
      if (matches(e, c, ev) && holds(state, c, e.if) && subjectOk(state, e, ev)) for (const action of e.do) apply(state, c, action, ev);
    }
  }
}

/**
 * Recomputes every passive bonus: granted types first (so filters see them), then stat auras.
 * Stat bonuses are applied as deltas on `attack` / `maxHp` / `hp`, so the rest of the engine needs no special case.
 */
export function refreshAuras(state: GameState): void {
  const all = ([0, 1] as const).flatMap((side) => units(state, side));
  const carriers = carriersOf(state, null).filter((c) => c.def.effects?.some((e) => e.on === "passive"));
  const passives = (c: Ctx) => (c.def.effects ?? []).filter((e) => e.on === "passive" && zoneOk(c, e) && holds(state, c, e.if));

  const types = new Map<Unit, string[]>();
  for (const c of carriers) {
    for (const e of passives(c)) {
      for (const a of e.do) {
        if (a.kind !== "grantType") continue;
        for (const r of resolve(state, c, a.to, null)) {
          if (r.kind === "unit" && unitMatches(r.unit, a.where)) types.set(r.unit, [...(types.get(r.unit) ?? []), a.type]);
        }
      }
    }
  }
  for (const u of all) {
    const granted = types.get(u) ?? [];
    if ((u.auraTypes ?? []).join() !== granted.join()) u.auraTypes = granted;
  }

  const want = new Map<Unit, { atk: number; hp: number }>();
  for (const c of carriers) {
    for (const e of passives(c)) {
      for (const a of e.do) {
        if (a.kind !== "aura") continue;
        for (const r of resolve(state, c, a.to, null)) {
          if (r.kind !== "unit" || !unitMatches(r.unit, a.where)) continue;
          const w = want.get(r.unit) ?? { atk: 0, hp: 0 };
          w.atk += amount(state, c, a.attack, null);
          w.hp += amount(state, c, a.hp, null);
          want.set(r.unit, w);
        }
      }
    }
  }
  for (const u of all) {
    const w = want.get(u) ?? { atk: 0, hp: 0 };
    const dAtk = w.atk - (u.auraAtk ?? 0);
    const dHp = w.hp - (u.auraHp ?? 0);
    if (dAtk === 0 && dHp === 0) continue;
    u.attack += dAtk;
    u.maxHp += dHp;
    u.hp = dHp > 0 ? u.hp + dHp : Math.min(u.hp, u.maxHp);
    u.auraAtk = w.atk;
    u.auraHp = w.hp;
  }
}

onEvent(runEffects);
onSettled(refreshAuras);
