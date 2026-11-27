import type { Personality, Race, Rank } from "../core/types";

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
