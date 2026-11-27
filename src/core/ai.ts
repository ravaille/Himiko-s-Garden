import { BOARD_SIZE, DEFAULT_CONFIG, actionPhase, beginTurn, endTurn, offer, playCard } from "./engine";
import type { CardDef, Config, GameState } from "./types";

/** Slot preference: centre first (most exposed but most protective), outer slots last. */
const SLOT_ORDER = [3, 2, 4, 1, 5, 0, 6];

const value = (c: CardDef) => c.attack + c.hp;

/**
 * Simple baseline pose-phase AI (used for simulation and as the future opponent baseline):
 * sacrifice a card until energy reaches 6, then deploy the strongest affordable cards.
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

  for (;;) {
    const slot = SLOT_ORDER.find((s) => !p.board[s]);
    if (slot === undefined) break;
    const options = p.hand
      .map((card, index) => ({ card, index }))
      .filter((o) => o.card.cost <= p.energy && (!o.card.kind || o.card.kind === "creature")) // the baseline AI only plays creatures for now
      .sort((a, b) => value(b.card) - value(a.card));
    if (options.length === 0) break;
    playCard(state, options[0].index, slot);
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
