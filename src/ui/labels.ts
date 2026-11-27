import type { Keywords, Personality, Race, Rank } from "../core/types";

/** Display text of the keywords a card has. */
export function keywordLabels(k: Keywords | undefined): string[] {
  if (!k) return [];
  const out: string[] = [];
  if (k.haste) out.push("Célérité");
  if (k.bushido) out.push("Bushido");
  if (k.ghostly) out.push("Spectral");
  if (k.multihit) out.push(k.multihit === 1 ? "Double frappe" : `Frappe ×${k.multihit + 1}`);
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
  "Double frappe": "Frappe une fois de plus.",
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
  strategist: { icon: "🧠", label: "Stratège", help: "Suivra tes ordres (bientôt)." },
  defensive: { icon: "🏯", label: "Défensif", help: "N'attaque que s'il est sûr de tuer sa cible." },
  passive: { icon: "🍃", label: "Passif", help: "N'attaque pas." },
};
