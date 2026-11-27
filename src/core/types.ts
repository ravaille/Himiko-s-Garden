export type Personality =
  | "none"
  | "brave"
  | "coward"
  | "guardian"
  | "assassin"
  | "vengeful"
  | "berserk"
  | "faithful"
  | "strategist"
  | "defensive"
  | "passive";

export type Rank = "general" | "colonel" | "lieutenant";

/** Races (docs/design/02-cards.md). Types are free-form strings (open list, docs/design/09-archetypes.md). */
export type Race = "human" | "henge" | "yurei" | "tsukumogami" | "oni" | "beast" | "demon" | "robot";

/** Deck constraint carried by a card (typically a General): every other card must match. */
export interface DeckRule {
  /** Only these races are allowed in the deck. */
  races?: Race[];
  /** Only cards having at least one of these types are allowed. */
  types?: string[];
}

/** Static definition of a card (data, not code). */
export interface CardDef {
  id: string;
  name: string;
  cost: number;
  attack: number;
  hp: number;
  personality: Personality;
  /** Optional rank. Any card may have any rank for now (see docs/design/05-hierarchy.md). */
  rank?: Rank;
  race?: Race;
  /** Archetype types, shared across races (e.g. "samurai", "mage"). */
  types?: string[];
  /** Deck-building constraint (see docs/design/10-deckbuilding.md). */
  deckRule?: DeckRule;
  /** Energy gained when sacrificed. Defaults to 1. */
  offering?: number;
  /** Optional rules text shown on the card (effects come later). */
  text?: string;
}

/** A card on the board. */
export interface Unit {
  uid: number;
  def: CardDef;
  hp: number;
  /** Owner's turnsPlayed value when the unit was placed (deployment delay). */
  deployedOn: number;
  lastAttackerUid: number | null;
}

export interface PlayerState {
  kingHp: number;
  deck: CardDef[];
  hand: CardDef[];
  /** Dead and sacrificed cards. */
  graveyard: CardDef[];
  /** True if the last draw failed (empty deck: -10 king HP). */
  fatigued: boolean;
  board: (Unit | null)[];
  maxEnergy: number;
  energy: number;
  turnsPlayed: number;
  offered: boolean;
}

/** One attack, recorded so a UI can replay it. */
export interface AttackEvent {
  side: 0 | 1;
  from: number;
  to: number | "king";
  damage: number;
  killed: boolean;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  current: 0 | 1;
  /** Number of player-turns already finished. */
  turn: number;
  rngState: number;
  nextUid: number;
  winner: 0 | 1 | "draw" | null;
  stats: { attacks: number };
  /** Attacks of the last action phase (reset at the start of each one). */
  events: AttackEvent[];
}

export type Target =
  | { kind: "king" }
  | { kind: "unit"; slot: number; unit: Unit };

export interface Config {
  kingHp: number;
  deckSize: number;
  handSize: number;
  /** Max rounds (one round = one turn each) before a draw. */
  maxRounds: number;
}
