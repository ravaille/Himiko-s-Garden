import { cardMatchesFilter } from "./effects";
import { BOARD_SIZE, DEFAULT_CONFIG, actionPhase, beginTurn, endTurn, offer, playCard, playFree, spellTargets } from "./engine";
import type { CardDef, Choice, Config, GameState } from "./types";

/** Slot preference: centre first (most exposed but most protective), outer slots last. */
const SLOT_ORDER = [3, 2, 4, 1, 5, 0, 6];

const isCreature = (c: CardDef) => !c.kind || c.kind === "creature";

/** Rough worth of a card in hand, in stat points: creatures by their stats, other cards by what their cost buys (~20/energy). */
const value = (c: CardDef) => (isCreature(c) ? c.attack + c.hp : 20 * c.cost);

/**
 * Board standing of `side`, in stat points: my cards, buildings, king and hand minus the opponent's.
 * Used to judge spells by simulating them on a copy of the game.
 */
function standing(state: GameState, side: 0 | 1): number {
  const worth = (s: 0 | 1) => {
    const p = state.players[s];
    const cards = p.board.reduce((n, u) => n + (u ? u.attack + u.hp : 0), 0);
    const buildings = p.buildings.reduce((n, b) => n + (b ? b.hp / 2 : 0), 0);
    return cards + buildings + p.kingHp / 2 + p.hand.length * 6;
  };
  return worth(side) - worth(side === 0 ? 1 : 0);
}

interface SpellMove {
  index: number;
  choice?: Choice;
  gain: number;
}

/** Casts every affordable spell (on every legal target) on a copy of the game; returns the moves ordered by gain. */
function spellMoves(state: GameState): SpellMove[] {
  const side = state.current;
  const p = state.players[side];
  const before = standing(state, side);
  const moves: SpellMove[] = [];
  p.hand.forEach((card, index) => {
    if (card.kind !== "spell" || card.cost > p.energy) return;
    const targets: (Choice | undefined)[] = card.spell?.target ? spellTargets(state, side, card) : [undefined];
    for (const choice of targets) {
      const copy = structuredClone(state);
      try {
        playCard(copy, index, 0, choice);
      } catch {
        continue;
      }
      const gain = copy.winner === side ? 1e6 : copy.winner !== null ? -1e6 : standing(copy, side) - before;
      moves.push({ index, choice, gain });
    }
  });
  return moves.sort((a, b) => b.gain - a.gain);
}

/** Where to put a building: on one of our cards (so "card on this slot" effects work), centre first; else any free slot. */
function buildingSlot(state: GameState): number | undefined {
  const p = state.players[state.current];
  const free = SLOT_ORDER.filter((s) => !p.buildings[s]);
  return free.find((s) => p.board[s]) ?? free[0];
}

/** Gain from which a spell is clearly worth casting before developing the board / worth casting at all. */
const GREAT = 10;
const WORTH = 5;

/**
 * Baseline pose-phase AI (used for simulation and as the opponent): sacrifice a card until energy reaches 6,
 * then, with the energy available: cast clearly good spells, deploy the strongest affordable creatures,
 * put down buildings, and finally cast any spell that still improves the position.
 * Spells are judged by simulating them on a copy of the game.
 */
export function poseAI(state: GameState): void {
  const p = state.players[state.current];

  if (!p.offered && p.hand.length >= 2 && p.maxEnergy < 6) {
    let best = 0;
    p.hand.forEach((c, i) => {
      const b = p.hand[best];
      const better = (c.offering ?? 1) > (b.offering ?? 1) || ((c.offering ?? 1) === (b.offering ?? 1) && value(c) < value(b));
      if (better) best = i;
    });
    offer(state, best);
  }

  // Free placements granted by effects (e.g. a Professor General): use them on the strongest matching cards.
  while (p.freePlays.length > 0) {
    const slot = SLOT_ORDER.find((s) => !p.board[s]);
    const pick = p.hand
      .map((card, index) => ({ card, index }))
      .filter((o) => isCreature(o.card) && p.freePlays.some((f) => cardMatchesFilter(o.card, f)))
      .sort((a, b) => value(b.card) - value(a.card))[0];
    if (slot === undefined || !pick) break;
    playFree(state, pick.index, slot);
  }

  while (state.winner === null) {
    const spells = spellMoves(state);
    const top = spells[0];
    if (top && top.gain >= GREAT) {
      playCard(state, top.index, 0, top.choice);
      continue;
    }
    const slot = SLOT_ORDER.find((s) => !p.board[s]);
    if (slot !== undefined) {
      const creature = p.hand
        .map((card, index) => ({ card, index }))
        .filter((o) => o.card.cost <= p.energy && isCreature(o.card))
        .sort((a, b) => value(b.card) - value(a.card))[0];
      if (creature) {
        playCard(state, creature.index, slot);
        continue;
      }
    }
    const bSlot = buildingSlot(state);
    if (bSlot !== undefined) {
      const building = p.hand
        .map((card, index) => ({ card, index }))
        .filter((o) => o.card.kind === "building" && o.card.cost <= p.energy)
        .sort((a, b) => b.card.hp - a.card.hp)[0];
      if (building) {
        playCard(state, building.index, bSlot);
        continue;
      }
    }
    if (top && top.gain >= WORTH) {
      playCard(state, top.index, 0, top.choice);
      continue;
    }
    break;
  }
}

export interface DuelResult {
  winner: 0 | 1 | "draw";
  /** Rounds played (one round = one turn each). */
  rounds: number;
  attacks: number;
  kingHp: [number, number];
}

export function playDuel(state: GameState, cfg: Config = DEFAULT_CONFIG): DuelResult {
  while (state.winner === null) {
    beginTurn(state);
    poseAI(state);
    actionPhase(state);
    endTurn(state, cfg);
  }
  return {
    winner: state.winner,
    rounds: Math.ceil(state.turn / 2),
    attacks: state.stats.attacks,
    kingHp: [state.players[0].kingHp, state.players[1].kingHp],
  };
}

export { BOARD_SIZE };
