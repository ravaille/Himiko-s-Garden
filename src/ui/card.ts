import type { CardDef } from "../core/types";
import { PERSONALITY } from "./labels";

/**
 * Generic card layout (see docs/design/06-card-layout.md).
 * `hp` overrides the printed HP (damaged unit on the board).
 */
export function cardHtml(def: CardDef, hp: number = def.hp): string {
  const p = PERSONALITY[def.personality];
  const damaged = hp < def.hp ? " damaged" : "";
  const rank = def.rank ? ` rank-${def.rank}` : "";
  return `<div class="card pers-${def.personality}${rank}" title="${p.label} : ${p.help}">
    <div class="cost">${def.cost}</div>
    <div class="name">${def.name}</div>
    <div class="art">${p.icon}</div>
    <div class="pers">${p.label}</div>
    <div class="stats"><span class="atk">⚔ ${def.attack}</span><span class="hp${damaged}">♥ ${hp}</span></div>
  </div>`;
}
