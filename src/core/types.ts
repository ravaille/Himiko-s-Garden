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
  | "passive"
  | "demolisher";

export type Rank = "general" | "colonel" | "lieutenant";

/** Races (docs/design/02-cards.md). Types are free-form strings (open list, docs/design/09-archetypes.md). */
export type Race = "human" | "henge" | "yurei" | "tsukumogami" | "oni" | "beast" | "demon" | "robot";

/** Recurring behaviours (docs/design/07-keywords-and-effects.md). Values are parameters where noted. */
export interface Keywords {
  /** Acts the turn it is placed (ignores the deployment delay). */
  haste?: boolean;
  /** Only strikes the facing card (else the king). A clean kill heals it fully. */
  bushido?: boolean;
  /** Only targetable by other ghostly cards (and by spells). */
  ghostly?: boolean;
  /** Strikes per attack (2 to 5): multihit 3 = three blows, the next ones going to the next targets if the first dies. */
  multihit?: number;
  /** Excess damage carries over to the next target, then the king. */
  piercing?: boolean;
  /** Heals itself for half the damage it deals. */
  lifesteal?: boolean;
  /** Heals N HP at the start of its owner's turn. */
  regen?: number;
}

/** When an effect fires (docs/design/07-keywords-and-effects.md, "Déclencheurs"). */
export type Trigger =
  | "play" // when placed
  | "turnStart" // start of its owner's turn
  | "attack" // when it attacks
  | "damaged" // when it is hit
  | "death" // when it dies
  | "allyDeath" // when another card of its side dies
  | "enemyDeath" // when a card of the other side dies
  | "kingHit" // when its owner's king is hit
  | "draw" // when its owner draws a card
  | "sacrifice" // when its owner sacrifices a card
  | "spell" // when its owner casts a spell
  | "anySpell" // when anyone casts a spell
  | "slotAttacked" // when an enemy attacks this slot (buildings)
  | "allyDamaged" // when one of its owner's cards (itself included) is hit; narrow it with `subject`
  | "drawFailed" // when its owner has to draw from an empty deck
  | "passive"; // always on: recomputed continuously (auras), never "fires"

/** Who an action applies to, relative to the card carrying the effect. */
export type Selector =
  | "self"
  | "facing" // the enemy card in front
  | "enemies" // all enemy cards
  | "allies" // all other friendly cards
  | "adjacent" // friendly cards next to it
  | "randomEnemy"
  | "strongestEnemy"
  | "enemyKing"
  | "ownKing"
  | "source" // the card that just damaged it
  | "chosen" // the target picked by the player when casting a spell
  | "slotUnit"; // the friendly card on the same slot as this building

/** Things that can be counted (docs/design/08-effects-format.md: conditions and scaling). */
export type Counter =
  | "allyUnits"
  | "enemyUnits"
  | "allyBuildings"
  | "enemyBuildings"
  | "ownGraveyard"
  | "enemyGraveyard"
  | "ownHand"
  | "ownDeck"
  | "ownKingHp"
  | "enemyKingHp"
  /** % of the starting king HP (can exceed 100 after healing). */
  | "ownKingPct"
  | "enemyKingPct"
  /** Equipment worn by the card carrying the effect. */
  | "selfEquipment";

/** Restricts which cards are counted or affected. */
export interface CardFilter {
  race?: Race;
  /** Counts cards that have this type, including types granted by auras. */
  type?: string;
  rank?: Rank;
  minCost?: number;
  maxCost?: number;
}

/** "How many ...": a counter, optionally filtered; `others` leaves the card carrying the effect out. */
export interface Measure {
  of: Counter;
  filter?: CardFilter;
  others?: boolean;
}

/** A number, or one that depends on the game: base + per x (count), or a % of the damage that triggered the effect. */
export type Amount = number | { base?: number; per: number; of: Measure } | { pct: number; of: "eventDamage" };

export type Comparison = "<" | "<=" | ">" | ">=" | "==";

/** A condition on the game state; an effect with several conditions needs all of them. */
export interface Condition {
  of: Measure;
  op: Comparison;
  value: number;
}

export type Action =
  | { kind: "damage"; to: Selector; amount: Amount }
  | { kind: "heal"; to: Selector; amount: Amount }
  /** Permanent stat change (docs: stat changes are permanent by default). */
  | { kind: "buff"; to: Selector; attack?: Amount; hp?: Amount }
  /** Passive effects only: a stat bonus that lives as long as the effect's conditions hold (recomputed continuously). */
  | { kind: "aura"; to: Selector; where?: CardFilter; attack?: Amount; hp?: Amount }
  /** Passive effects only: the affected cards count as having this type (for synergies and counting). */
  | { kind: "grantType"; to: Selector; where?: CardFilter; type: string }
  /** Kills cards outright (not kings). */
  | { kind: "destroy"; to: Selector }
  /** Puts copies of a card (a token) on free slots of the owner's side; fails silently when the side is full. */
  | { kind: "summon"; card: CardDef; count?: Amount }
  | { kind: "draw"; count: Amount }
  /** Temporary energy for this turn. */
  | { kind: "energy"; amount: Amount }
  /** The effect's owner wins the duel on the spot. */
  | { kind: "win" }
  /**
   * Puts a card matching `filter` on the board for free. `from: "deck"` (the default) takes a random matching creature
   * from the owner's deck at once (the deck shrinks). `from: "hand"` lets the player pick one in hand during the
   * placement phase (unused picks expire at the end of the turn), or a random one with `random`.
   */
  | { kind: "freePlay"; filter: CardFilter; random?: boolean; from?: "hand" | "deck" };

/** What a spell asks the player to pick when it is cast (none = it can be dropped on any slot). */
/** enemyAny = an enemy card, an enemy building or the enemy king (spells may hit buildings unless a card says otherwise). */
export type SpellTarget = "enemyUnit" | "allyUnit" | "enemyBuilding" | "enemyAny";

export interface Spell {
  target?: SpellTarget;
  do: Action[];
}

/** A target picked by the player. */
export type Choice =
  | { kind: "unit"; side: 0 | 1; slot: number }
  | { kind: "building"; side: 0 | 1; slot: number }
  | { kind: "king"; side: 0 | 1 };

export interface Effect {
  on: Trigger;
  /** The effect only happens (or, for passives, only applies) while all of these hold. */
  if?: Condition[];
  /**
   * Where the card must be for the effect to work: "board" (default) or "deck": active as soon as the card is part of
   * the player's deck, wherever it currently is (docs/design/07: Demon General).
   */
  zone?: "board" | "deck";
  /** For effects about another card (allyDamaged...): only when that card matches. */
  subject?: CardFilter;
  /** The effect replaces a default rule: "fatigue" = the king no longer loses 10 HP when drawing from an empty deck. */
  replaces?: "fatigue";
  do: Action[];
}


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
  keywords?: Keywords;
  /** `spell` cards are cast from the hand and go to the graveyard; equipment is a spell that buffs a card. Default: creature. */
  kind?: "creature" | "spell" | "building";
  /** A spell that buffs a card and counts as equipment worn by it. */
  equipment?: boolean;
  spell?: Spell;
  /** Tokens are summoned by effects and never appear in the collection. */
  token?: boolean;
  /** Triggered effects (see core/effects.ts). */
  effects?: Effect[];
  /** Deck-building constraint (see docs/design/10-deckbuilding.md). */
  deckRule?: DeckRule;
  /** Energy gained when sacrificed. Defaults to 1. */
  offering?: number;
  /** Optional rules text shown on the card (effects come later). */
  text?: string;
}

/** A Strategist's standing order: who it attacks (by uid, so it follows the target around). */
export type Order = { kind: "unit" | "building"; uid: number } | { kind: "king" };

/** A building: attached to one of its owner's slots, next to (not instead of) the card standing there. */
export interface Building {
  uid: number;
  def: CardDef;
  hp: number;
  maxHp: number;
}

/** A card on the board. */
export interface Unit {
  uid: number;
  def: CardDef;
  /** Current stats: start from the printed ones, effects change them; they vanish when the card leaves the board. */
  attack: number;
  maxHp: number;
  hp: number;
  /** Owner's turnsPlayed value when the unit was placed (deployment delay). */
  deployedOn: number;
  lastAttackerUid: number | null;
  /** Runtime keywords (effects may give/remove some); defaults to the card's own. */
  keywords?: Keywords;
  /** Bonuses currently applied by passive auras (already included in attack / maxHp). */
  auraAtk?: number;
  auraHp?: number;
  /** Types granted by passive effects. */
  auraTypes?: string[];
  /** Equipment spells resolved on this card. */
  equipped?: number;
  /** Strategist only: the target the player picked; kept until the target is gone or a new order is given. */
  order?: Order;
  /** uids of the cards that damaged this one (-1 = something else), for Bushido. */
  touchedBy?: number[];
}

export interface PlayerState {
  kingHp: number;
  deck: CardDef[];
  /** The cards the deck started with (for effects that work "from the deck"). */
  decklist: CardDef[];
  /** Free placements granted this turn (see the freePlay action); they expire at the end of the turn. */
  freePlays: CardFilter[];
  hand: CardDef[];
  /** Dead and sacrificed cards. */
  graveyard: CardDef[];
  /** True if the last draw failed (empty deck: -10 king HP). */
  fatigued: boolean;
  board: (Unit | null)[];
  /** One building per slot at most; it does not block a card from standing on the same slot. */
  buildings: (Building | null)[];
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

/** Things that happen in a duel; effects trigger on them (see core/events.ts). */
export type GameEvent =
  | { type: "turnStart"; side: 0 | 1 }
  | { type: "draw"; side: 0 | 1; failed: boolean }
  | { type: "played"; side: 0 | 1; slot: number; uid: number }
  | { type: "sacrificed"; side: 0 | 1; card: CardDef }
  | { type: "spell"; side: 0 | 1; card: CardDef }
  | { type: "buildingPlaced"; side: 0 | 1; slot: number; uid: number }
  | { type: "buildingDestroyed"; side: 0 | 1; slot: number; uid: number; card: CardDef; building: Building }
  /** `side` attacks; `target` is a slot on the other side or the king. */
  | { type: "attack"; side: 0 | 1; slot: number; uid: number; target: number | "king" }
  /** A card of `side` took damage. */
  | { type: "damaged"; side: 0 | 1; slot: number; uid: number; amount: number; sourceUid: number | null }
  | { type: "died"; side: 0 | 1; slot: number; uid: number; card: CardDef; unit: Unit }
  /** A card of `side` recovered HP. */
  | { type: "healed"; side: 0 | 1; slot: number; uid: number; amount: number }
  /** The king of `side` took damage. */
  | { type: "kingHit"; side: 0 | 1; amount: number };

export interface GameState {
  players: [PlayerState, PlayerState];
  /** King HP at the start of the duel (for "% of HP" conditions). */
  startKingHp: number;
  current: 0 | 1;
  /** Number of player-turns already finished. */
  turn: number;
  rngState: number;
  nextUid: number;
  winner: 0 | 1 | "draw" | null;
  stats: { attacks: number };
  /** Attacks of the last action phase (reset at the start of each one), for UI replay. */
  events: AttackEvent[];
  /** Everything that happened since the start of the current turn (reset by beginTurn). */
  trace: GameEvent[];
}

export type Target =
  | { kind: "king" }
  | { kind: "unit"; slot: number; unit: Unit }
  | { kind: "building"; slot: number; building: Building };

export interface Config {
  kingHp: number;
  deckSize: number;
  handSize: number;
  /** Max rounds (one round = one turn each) before a draw. */
  maxRounds: number;
}
