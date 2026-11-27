import type { Action, Amount, CardDef, CardFilter, Condition, Counter, Effect, Keywords, Measure, Personality, Race, Rank, Selector, Trigger } from "../core/types";

const TRIGGER: Record<Trigger, string> = {
  play: "À la pose",
  turnStart: "Début de tour",
  attack: "Quand elle attaque",
  damaged: "Quand elle est touchée",
  death: "À sa mort",
  allyDeath: "Quand un allié meurt",
  enemyDeath: "Quand un ennemi meurt",
  kingHit: "Quand ton Roi est touché",
  draw: "Quand tu pioches",
  sacrifice: "Quand tu sacrifies une carte",
  spell: "Quand tu lances un sort",
  anySpell: "Quand un sort est lancé",
  slotAttacked: "Quand cette case est attaquée",
  passive: "Passif",
};

const SELECTOR: Record<Selector, string> = {
  self: "elle-même",
  facing: "l'ennemi en face",
  enemies: "tous les ennemis",
  allies: "tous les alliés",
  adjacent: "les alliés adjacents",
  randomEnemy: "un ennemi au hasard",
  strongestEnemy: "l'ennemi le plus fort",
  enemyKing: "le Roi adverse",
  ownKing: "ton Roi",
  source: "l'attaquant",
  chosen: "la cible",
  slotUnit: "la carte sur cette case",
};

const COUNTER: Record<Counter, string> = {
  allyUnits: "carte alliée",
  enemyUnits: "carte ennemie",
  allyBuildings: "bâtiment allié",
  enemyBuildings: "bâtiment ennemi",
  ownGraveyard: "carte dans ton cimetière",
  enemyGraveyard: "carte dans le cimetière adverse",
  ownHand: "carte dans ta main",
  ownDeck: "carte dans ta pioche",
  ownKingHp: "PV de ton Roi",
  enemyKingHp: "PV du Roi adverse",
  ownKingPct: "% de PV de ton Roi",
  enemyKingPct: "% de PV du Roi adverse",
};

function filterText(f: CardFilter | undefined): string {
  if (!f) return "";
  const parts = [f.type ? `[${f.type}]` : "", f.race ? RACE[f.race] : "", f.rank ? RANK[f.rank] : "", f.maxCost !== undefined ? `coût ≤ ${f.maxCost}` : "", f.minCost !== undefined ? `coût ≥ ${f.minCost}` : ""];
  return parts.filter(Boolean).join(" ");
}

function measureText(m: Measure): string {
  const f = filterText(m.filter);
  return `${COUNTER[m.of]}${f ? ` ${f}` : ""}${m.others ? " (autres)" : ""}`;
}

function amountText(a: Amount): string {
  if (typeof a === "number") return String(a);
  if ("pct" in a) return `${a.pct} % des dégâts reçus`;
  return `${a.base ? `${a.base} + ` : ""}${a.per} par ${measureText(a.of)}`;
}

function conditionText(c: Condition): string {
  return `${measureText(c.of)} ${c.op === "<=" ? "≤" : c.op === ">=" ? "≥" : c.op === "==" ? "=" : c.op} ${c.value}`;
}

function actionText(a: Action): string {
  switch (a.kind) {
    case "damage":
      return `${amountText(a.amount)} dégâts à ${SELECTOR[a.to]}`;
    case "heal":
      return `soigne ${SELECTOR[a.to]} de ${amountText(a.amount)}`;
    case "buff":
    case "aura": {
      const sign = (v: Amount | undefined, icon: string) => (v === undefined ? "" : typeof v === "number" ? `${v > 0 ? "+" : ""}${v}${icon}` : `+${amountText(v)} ${icon}`);
      const parts = [sign(a.attack, "⚔"), sign(a.hp, "♥")].filter(Boolean);
      const where = a.kind === "aura" && a.where ? ` ${filterText(a.where)}` : "";
      return `${SELECTOR[a.to]}${where} : ${parts.join(" ")}`;
    }
    case "grantType":
      return `${SELECTOR[a.to]}${a.where ? ` ${filterText(a.where)}` : ""} comptent comme [${a.type}]`;
    case "destroy":
      return `détruit ${SELECTOR[a.to]}`;
    case "summon":
      return `invoque ${a.count !== undefined && a.count !== 1 ? `${amountText(a.count)} ` : ""}${a.card.name}`;
    case "draw":
      return `pioche ${amountText(a.count)}`;
    case "energy":
      return `+${amountText(a.amount)}⚡ ce tour`;
  }
}

/** Rules text generated from the effect data, so the card text can never disagree with what it does. */
export function effectLines(def: CardDef): string[] {
  const lines: string[] = [];
  if (def.kind === "spell" && def.spell) {
    const who = {
      enemyUnit: "Cible : un ennemi.",
      allyUnit: "Cible : un allié.",
      enemyBuilding: "Cible : un bâtiment ennemi.",
      enemyAny: "Cible : un ennemi, un bâtiment ou le Roi adverse.",
    };
    const first = def.spell.target ? who[def.spell.target] : "Se joue n'importe où.";
    lines.push(`${first} ${def.spell.do.map(actionText).join(", ")}.`);
  }
  return lines.concat((def.effects ?? []).map((e: Effect) => `${TRIGGER[e.on]}${e.if?.length ? ` (si ${e.if.map(conditionText).join(" et ")})` : ""} : ${e.do.map(actionText).join(", ")}.`));
}

/** Display text of the keywords a card has. */
export function keywordLabels(k: Keywords | undefined): string[] {
  if (!k) return [];
  const out: string[] = [];
  if (k.haste) out.push("Célérité");
  if (k.bushido) out.push("Bushido");
  if (k.ghostly) out.push("Spectral");
  if (k.multihit) out.push(`Multihit (${k.multihit})`);
  if (k.piercing) out.push("Perforant");
  if (k.lifesteal) out.push("Vol de vie");
  if (k.regen) out.push(`Régén. (${k.regen})`);
  return out;
}

/** One-line explanations, shown as tooltips in the deck-builder. */
export const KEYWORD_HELP: Record<string, string> = {
  "Célérité": "Agit dès le tour où elle est posée.",
  Bushido: "Ne frappe que la carte en face (sinon le Roi). Tuer une cible que personne d'autre n'a touchée la soigne entièrement.",
  Spectral: "Ne peut être ciblée que par des cartes spectrales (et par des sorts).",
  Multihit: "Frappe plusieurs fois (le nombre est indiqué). Si la cible meurt, les coups suivants vont à la cible suivante.",
  Perforant: "Les dégâts en trop passent à la carte suivante, puis au Roi.",
  "Vol de vie": "Se soigne de la moitié des dégâts infligés.",
};

export const RACE: Record<Race, string> = {
  human: "Humain",
  henge: "Henge",
  yurei: "Yurei",
  tsukumogami: "Tsukumogami",
  oni: "Oni",
  beast: "Bête",
  demon: "Démon",
  robot: "Robot",
};

export const RANK: Record<Rank, string> = { general: "Général", colonel: "Colonel", lieutenant: "Lieutenant" };

export const PERSONALITY: Record<Personality, { icon: string; label: string; help: string }> = {
  none: { icon: "▫️", label: "Neutre", help: "Frappe en face, sinon au centre, sinon le Roi." },
  brave: { icon: "⚔️", label: "Brave", help: "Attaque la cible à portée la plus costaude." },
  coward: { icon: "🐇", label: "Lâche", help: "Dernier survivant de son équipe : ciblé en dernier." },
  guardian: { icon: "🛡️", label: "Gardien", help: "Prioritaire sur les alliés des cases adjacentes." },
  assassin: { icon: "🗡️", label: "Assassin", help: "Vise directement le Roi adverse." },
  vengeful: { icon: "😠", label: "Rancunier", help: "Frappe celui qui l'a touché en dernier." },
  berserk: { icon: "💢", label: "Berzerk", help: "Frappe un ennemi au hasard." },
  faithful: { icon: "🤝", label: "Fidèle", help: "Attaque la même cible qu'un allié." },
  strategist: { icon: "🧠", label: "Stratège", help: "Clique dessus pendant ton tour pour lui désigner une cible (carte, bâtiment ou Roi). Sans ordre, il agit comme un Brave." },
  defensive: { icon: "🏯", label: "Défensif", help: "N'attaque que s'il est sûr de tuer sa cible." },
  passive: { icon: "🍃", label: "Passif", help: "N'attaque pas." },
  demolisher: { icon: "🔨", label: "Démolisseur", help: "Détruit les bâtiments ennemis (sur case vide, sinon la carte dessus). Sans bâtiment : riposte seulement." },
};
