import type { CardDef, Personality, Rank } from "../core/types";

/**
 * TEST POOL ONLY: placeholder cards used to validate rules and balance by simulation.
 * Budget: ~20 stat points per energy (docs/design/01-rules.md); `share` = fraction going to attack.
 */
function unit(
  id: string,
  name: string,
  cost: number,
  share: number,
  personality: Personality,
  extra: { rank?: Rank; offering?: number } = {},
): CardDef {
  const total = 20 * cost;
  const attack = Math.round(total * share);
  return { id, name, cost, attack, hp: total - attack, personality, ...extra };
}

export const TEST_POOL: CardDef[] = [
  // cost 1
  unit("c1-recruit", "Recrue", 1, 0.5, "brave"),
  unit("c1-scout", "Éclaireur", 1, 0.6, "assassin"),
  unit("c1-gatekeeper", "Garde de porte", 1, 0.35, "guardian"),
  unit("c1-novice", "Novice", 1, 0.3, "passive"),
  // cost 2
  unit("c2-samurai", "Samouraï errant", 2, 0.55, "brave"),
  unit("c2-ashigaru", "Ashigaru", 2, 0.5, "defensive"),
  unit("c2-avenger", "Vengeur masqué", 2, 0.5, "vengeful"),
  unit("c2-kunoichi", "Kunoichi", 2, 0.55, "assassin"),
  // cost 3
  unit("c3-oni", "Oni enragé", 3, 0.6, "berserk"),
  unit("c3-temple", "Garde du temple", 3, 0.4, "guardian"),
  unit("c3-companion", "Compagnon fidèle", 3, 0.5, "faithful"),
  unit("c3-archer", "Archer en retrait", 3, 0.55, "coward"),
  // cost 4
  unit("c4-captain", "Capitaine", 4, 0.5, "brave", { rank: "colonel", offering: 2 }),
  unit("c4-ronin", "Ronin", 4, 0.6, "vengeful"),
  unit("c4-tactician", "Tacticien", 4, 0.45, "strategist"),
  unit("c4-sentinel", "Sentinelle", 4, 0.4, "defensive"),
  // cost 5
  unit("c5-daimyo", "Daimyo", 5, 0.5, "brave", { rank: "colonel", offering: 2 }),
  unit("c5-shadow", "Ninja d'ombre", 5, 0.6, "assassin"),
  unit("c5-guardian", "Gardien sacré", 5, 0.35, "guardian"),
  unit("c5-hunter", "Chasseur de démons", 5, 0.55, "faithful"),
  // cost 6
  unit("c6-dragon", "Dragon", 6, 0.5, "brave"),
  unit("c6-demon", "Démon", 6, 0.6, "berserk"),
  unit("c6-tengu", "Tengu", 6, 0.5, "defensive"),
  unit("c6-colossus", "Colosse", 6, 0.3, "passive"),
];
