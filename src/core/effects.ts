import { BOARD_SIZE, canTarget, drawCard, healUnit, hurtKing, hurtUnit } from "./engine";
import { onEvent } from "./events";
import { nextRandom } from "./rng";
import type { Action, Effect, GameEvent, GameState, Selector, Unit } from "./types";

/**
 * Card effects (docs/design/08-effects-format.md): trigger -> action(s), resolved synchronously on the event bus.
 * Resolution order when several cards react to the same event: the active player's cards left to right,
 * then the opponent's. Effects cannot target ghostly enemy cards (only attacks by ghostly cards and spells can).
 */

interface Carrier {
  side: 0 | 1;
  slot: number;
  unit: Unit;
}

type Ref = { kind: "unit"; side: 0 | 1; unit: Unit } | { kind: "king"; side: 0 | 1 };

function matches(e: Effect, c: Carrier, ev: GameEvent): boolean {
  switch (e.on) {
    case "play":
      return ev.type === "played" && ev.uid === c.unit.uid;
    case "turnStart":
      return ev.type === "turnStart" && ev.side === c.side;
    case "attack":
      return ev.type === "attack" && ev.uid === c.unit.uid;
    case "damaged":
      return ev.type === "damaged" && ev.uid === c.unit.uid;
    case "death":
      return ev.type === "died" && ev.uid === c.unit.uid;
    case "allyDeath":
      return ev.type === "died" && ev.side === c.side && ev.uid !== c.unit.uid;
    case "enemyDeath":
      return ev.type === "died" && ev.side !== c.side;
    case "kingHit":
      return ev.type === "kingHit" && ev.side === c.side;
    case "draw":
      return ev.type === "draw" && !ev.failed && ev.side === c.side;
    case "sacrifice":
      return ev.type === "sacrificed" && ev.side === c.side;
  }
}

const units = (state: GameState, side: 0 | 1): Unit[] => state.players[side].board.filter((u): u is Unit => u !== null);

function findByUid(state: GameState, uid: number): Ref | null {
  for (const side of [0, 1] as const) {
    const unit = units(state, side).find((u) => u.uid === uid);
    if (unit) return { kind: "unit", side, unit };
  }
  return null;
}

function resolve(state: GameState, c: Carrier, sel: Selector, ev: GameEvent): Ref[] {
  const foe = c.side === 0 ? 1 : 0;
  const mine = state.players[c.side];
  const targetable = () => units(state, foe).filter((u) => canTarget(c.unit, u));
  const asRefs = (side: 0 | 1, list: Unit[]): Ref[] => list.map((unit) => ({ kind: "unit", side, unit }));
  switch (sel) {
    case "self":
      return [{ kind: "unit", side: c.side, unit: c.unit }];
    case "facing": {
      const u = state.players[foe].board[c.slot];
      return u && canTarget(c.unit, u) ? asRefs(foe, [u]) : [];
    }
    case "enemies":
      return asRefs(foe, targetable());
    case "allies":
      return asRefs(c.side, units(state, c.side).filter((u) => u !== c.unit));
    case "adjacent":
      return asRefs(c.side, [c.slot - 1, c.slot + 1].map((s) => mine.board[s]).filter((u): u is Unit => !!u));
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
      if (ev.type !== "damaged" || ev.sourceUid === null) return [];
      const r = findByUid(state, ev.sourceUid);
      return r ? [r] : [];
    }
  }
}

function apply(state: GameState, c: Carrier, action: Action, ev: GameEvent): void {
  switch (action.kind) {
    case "damage":
      for (const r of resolve(state, c, action.to, ev)) {
        if (state.winner !== null) return;
        if (r.kind === "king") hurtKing(state, r.side, action.amount);
        else hurtUnit(state, r.side, r.unit, action.amount, c.unit);
      }
      return;
    case "heal":
      for (const r of resolve(state, c, action.to, ev)) {
        if (r.kind === "king") {
          const p = state.players[r.side];
          p.kingHp = Math.min(p.kingMax, p.kingHp + action.amount);
        } else healUnit(state, r.side, r.unit, action.amount);
      }
      return;
    case "buff":
      for (const r of resolve(state, c, action.to, ev)) {
        if (r.kind !== "unit") continue;
        r.unit.attack += action.attack ?? 0;
        r.unit.maxHp += action.hp ?? 0;
        r.unit.hp += action.hp ?? 0;
      }
      return;
    case "draw":
      for (let i = 0; i < action.count && state.winner === null; i++) drawCard(state, c.side);
      return;
    case "energy":
      state.players[c.side].energy += action.amount;
      return;
  }
}

/** The event-bus handler: lets every card react to `ev`. */
function runEffects(state: GameState, ev: GameEvent): void {
  const carriers: Carrier[] = [];
  const order: (0 | 1)[] = state.current === 0 ? [0, 1] : [1, 0];
  for (const side of order) {
    for (let slot = 0; slot < BOARD_SIZE; slot++) {
      const unit = state.players[side].board[slot];
      if (unit) carriers.push({ side, slot, unit });
      // A card that just died is already off the board but must still resolve its own "death" effects.
      else if (ev.type === "died" && ev.side === side && ev.slot === slot) carriers.push({ side, slot, unit: ev.unit });
    }
  }
  for (const c of carriers) {
    const effects = c.unit.def.effects;
    if (!effects) continue;
    for (const e of effects) {
      if (state.winner !== null) return;
      const alive = state.players[c.side].board[c.slot] === c.unit;
      if (!alive && e.on !== "death") continue;
      if (matches(e, c, ev)) for (const action of e.do) apply(state, c, action, ev);
    }
  }
}

onEvent(runEffects);
