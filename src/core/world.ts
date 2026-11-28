/**
 * Overworld rules (docs/design/12-world-and-campaign.md): a character walks on tile maps, Pokémon style.
 * Pure logic, no DOM: the UI (ui/overworld.ts) draws the map and feeds key presses to these functions.
 */

export type Dir = "up" | "down" | "left" | "right";

export const DIRS: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export interface TileDef {
  name: string;
  walkable: boolean;
  /** Placeholder look: background colour and optional emoji. */
  color: string;
  icon?: string;
}

/** Tile alphabet used by the map rows. */
export const TILES: Record<string, TileDef> = {
  ".": { name: "herbe", walkable: true, color: "#4f8f4a" },
  ",": { name: "chemin", walkable: true, color: "#c9b27a" },
  F: { name: "fleurs", walkable: true, color: "#4f8f4a", icon: "🌼" },
  T: { name: "arbre", walkable: false, color: "#3a6b38", icon: "🌲" },
  "~": { name: "eau", walkable: false, color: "#3b78c4", icon: "🌊" },
  "#": { name: "mur", walkable: false, color: "#5a4a3a" },
  H: { name: "bâtiment", walkable: false, color: "#a0523d", icon: "🧱" },
  D: { name: "porte", walkable: true, color: "#6b4a2a", icon: "🚪" },
  f: { name: "sol", walkable: true, color: "#d8c8a8" },
  c: { name: "tapis", walkable: true, color: "#b04a5a" },
};

export type NpcKind = "trainer" | "talk" | "sign" | "pc" | "shop" | "vending" | "script";

/** Story markers (set by scenes). */
export type Flags = Record<string, boolean | number>;

export interface Npc {
  id: string;
  name: string;
  x: number;
  y: number;
  dir: Dir;
  kind: NpcKind;
  /** Emoji used as placeholder sprite. */
  icon: string;
  lines: string[];
  /** Trainers: how many tiles ahead they see the player (they challenge on sight). */
  sight?: number;
  /** Trainers: what they say once beaten. */
  defeatedLines?: string[];
  /** kind "script": id of the scene (src/data/scenes.ts) played when the player talks to them. */
  script?: string;
  /** Only present while this story flag is set / while it is NOT set. */
  when?: string;
  unless?: string;
}

/** Stepping on this tile moves the player to another map (or another place on the same one). */
export interface Warp {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  /** Facing after the warp (defaults to the walking direction). */
  dir?: Dir;
}

export interface WorldMap {
  id: string;
  name: string;
  /** One string per row; each character is a key of `TILES`. */
  rows: string[];
  npcs: Npc[];
  warps: Warp[];
}

export type Maps = Record<string, WorldMap>;

/** Where the player is, and what has happened (this is what gets saved). */
export interface WorldState {
  map: string;
  x: number;
  y: number;
  dir: Dir;
  /** Ids of the trainers already beaten. */
  defeated: string[];
  /** Story markers, shared with the story state (not saved here). Decide which characters are present. */
  flags?: Flags;
}

/** What the UI must do after an interaction. Dialogs can chain into another event (`then`). */
export type WorldEvent =
  | { type: "dialog"; speaker?: string; lines: string[]; then?: WorldEvent }
  | { type: "duel"; npcId: string }
  | { type: "script"; id: string }
  | { type: "openDeck" }
  | { type: "shop" }
  | { type: "vending" };

export const width = (m: WorldMap): number => m.rows[0]?.length ?? 0;
export const height = (m: WorldMap): number => m.rows.length;

export function tileAt(m: WorldMap, x: number, y: number): TileDef | null {
  const ch = m.rows[y]?.[x];
  return ch === undefined ? null : (TILES[ch] ?? null);
}

/** Is this character on the map given the story so far? */
export const present = (n: Npc, flags?: Flags): boolean => (!n.when || !!flags?.[n.when]) && (!n.unless || !flags?.[n.unless]);

export const visibleNpcs = (m: WorldMap, flags?: Flags): Npc[] => m.npcs.filter((n) => present(n, flags));

export function npcAt(m: WorldMap, x: number, y: number, flags?: Flags): Npc | undefined {
  return m.npcs.find((n) => n.x === x && n.y === y && present(n, flags));
}

/** Can the player stand on (x, y)? Out of the map, blocked tiles and characters stop them. */
export function isWalkable(m: WorldMap, x: number, y: number, flags?: Flags): boolean {
  return !!tileAt(m, x, y)?.walkable && !npcAt(m, x, y, flags);
}

export interface MoveResult {
  moved: boolean;
  warped: boolean;
}

/** Turns toward `dir` and walks one tile if it is free; walking onto a warp tile changes map. Mutates `state`. */
export function move(maps: Maps, state: WorldState, dir: Dir): MoveResult {
  const m = maps[state.map];
  state.dir = dir;
  const nx = state.x + DIRS[dir].dx;
  const ny = state.y + DIRS[dir].dy;
  if (!isWalkable(m, nx, ny, state.flags)) return { moved: false, warped: false };
  state.x = nx;
  state.y = ny;
  const warp = m.warps.find((w) => w.x === nx && w.y === ny);
  if (!warp) return { moved: true, warped: false };
  state.map = warp.to;
  state.x = warp.tx;
  state.y = warp.ty;
  state.dir = warp.dir ?? dir;
  return { moved: true, warped: true };
}

export const isDefeated = (state: WorldState, npcId: string): boolean => state.defeated.includes(npcId);

/** What happens when a trainer challenges the player: they talk, then the duel starts. */
export function challenge(npc: Npc): WorldEvent {
  return { type: "dialog", speaker: npc.name, lines: npc.lines, then: { type: "duel", npcId: npc.id } };
}

/** Action key: talks to whoever is in front of the player (or reads the sign, uses the PC...). */
export function interact(maps: Maps, state: WorldState): WorldEvent | null {
  const m = maps[state.map];
  const npc = npcAt(m, state.x + DIRS[state.dir].dx, state.y + DIRS[state.dir].dy, state.flags);
  if (!npc) return null;
  switch (npc.kind) {
    case "trainer":
      return isDefeated(state, npc.id)
        ? { type: "dialog", speaker: npc.name, lines: npc.defeatedLines ?? ["..."] }
        : challenge(npc);
    case "pc":
      return { type: "dialog", lines: npc.lines, then: { type: "openDeck" } };
    case "shop":
      return { type: "dialog", speaker: npc.name, lines: npc.lines, then: { type: "shop" } };
    case "vending":
      return { type: "dialog", lines: npc.lines, then: { type: "vending" } };
    case "script":
      return { type: "script", id: npc.script ?? "" };
    case "talk":
    case "sign":
      return { type: "dialog", speaker: npc.kind === "sign" ? undefined : npc.name, lines: npc.lines };
  }
}

/** A trainer who has not been beaten sees the player standing in the straight line they face, within their sight. */
export function spotter(maps: Maps, state: WorldState): Npc | null {
  const m = maps[state.map];
  for (const npc of visibleNpcs(m, state.flags)) {
    if (npc.kind !== "trainer" || !npc.sight || isDefeated(state, npc.id)) continue;
    const { dx, dy } = DIRS[npc.dir];
    for (let k = 1; k <= npc.sight; k++) {
      const x = npc.x + dx * k;
      const y = npc.y + dy * k;
      if (x === state.x && y === state.y) return npc;
      if (!isWalkable(m, x, y, state.flags)) break; // something blocks the view
    }
  }
  return null;
}

/** Problems in map data (used by tests): rows of different lengths, unknown tiles, bad warps, characters in walls... */
export function validateMaps(maps: Maps, start: WorldState): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const m of Object.values(maps)) {
    const w = width(m);
    if (w === 0) issues.push(`${m.id}: empty map`);
    m.rows.forEach((r, y) => {
      if (r.length !== w) issues.push(`${m.id}: row ${y} has ${r.length} tiles, expected ${w}`);
      for (const ch of r) if (!TILES[ch]) issues.push(`${m.id}: unknown tile "${ch}" in row ${y}`);
    });
    for (const n of m.npcs) {
      if (ids.has(n.id)) issues.push(`${m.id}: duplicate character id ${n.id}`);
      ids.add(n.id);
      if (!tileAt(m, n.x, n.y)?.walkable) issues.push(`${m.id}: ${n.id} stands on a blocked or missing tile`);
    }
    for (const wp of m.warps) {
      if (!tileAt(m, wp.x, wp.y)?.walkable) issues.push(`${m.id}: warp at ${wp.x},${wp.y} is on a blocked tile`);
      const target = maps[wp.to];
      if (!target) {
        issues.push(`${m.id}: warp to unknown map ${wp.to}`);
        continue;
      }
      if (!isWalkable(target, wp.tx, wp.ty)) issues.push(`${m.id}: warp to ${wp.to} lands on a blocked tile (${wp.tx},${wp.ty})`);
      if (target.warps.some((t) => t.x === wp.tx && t.y === wp.ty)) issues.push(`${m.id}: warp to ${wp.to} lands on another warp (would loop)`);
    }
  }
  const sm = maps[start.map];
  if (!sm) issues.push(`start map ${start.map} does not exist`);
  else if (!isWalkable(sm, start.x, start.y)) issues.push("start position is blocked");
  return issues;
}
