/**
 * Scripted scenes (docs/design/13-intro-story.md). A scene is DATA (a list of steps); this file is the pure interpreter.
 * No DOM here: the UI shows what `advance` returns and calls `answer` for choices and prompts.
 */

export interface StoryState {
  name: string;
  money: number;
  /** Boolean/number markers set by scenes ("introDone", "olgaDuels"...). */
  flags: Record<string, boolean | number>;
  /** What the player should do now, shown in the menu. */
  objective: string | null;
}

export type PromptKind = "name" | "general" | "duel" | "teleport";

export type Step =
  | { t: "say"; who?: string; text: string }
  | { t: "choice"; options: { label: string; then: Step[] }[] }
  | { t: "set"; flag: string; value?: boolean | number }
  | { t: "add"; flag: string; by: number }
  | { t: "gold"; amount: number }
  | { t: "objective"; text: string | null }
  /** A cut: black screen (with optional text), e.g. an ellipsis in time. */
  | { t: "cut"; text?: string }
  /** Hands control to the UI (name entry, card choice, duel, teleport to a map); the scene resumes after. */
  | { t: "prompt"; kind: PromptKind; arg?: string }
  | { t: "if"; flag: string; is?: boolean | number; min?: number; then: Step[]; else?: Step[] };

/** What the UI must show next. */
export type Output = Extract<Step, { t: "say" | "choice" | "cut" | "prompt" }>;

export interface Runner {
  stack: { steps: Step[]; i: number }[];
}

export const newStory = (): StoryState => ({ name: "", money: 50, flags: {}, objective: null });

export const start = (steps: Step[]): Runner => ({ stack: [{ steps, i: 0 }] });

/** Replaces `{name}` in a text by the player's name. */
export const fill = (text: string, s: StoryState): string => text.split("{name}").join(s.name || "…");

function holds(s: StoryState, st: Extract<Step, { t: "if" }>): boolean {
  const v = s.flags[st.flag];
  if (st.min !== undefined) return typeof v === "number" && v >= st.min;
  if (st.is !== undefined) return v === st.is;
  return !!v;
}

/** Runs silent steps (flags, money...) until something must be shown. Returns null when the scene is over. */
export function advance(r: Runner, s: StoryState): Output | null {
  for (;;) {
    const top = r.stack[r.stack.length - 1];
    if (!top) return null;
    if (top.i >= top.steps.length) {
      r.stack.pop();
      continue;
    }
    const st = top.steps[top.i++];
    switch (st.t) {
      case "set":
        s.flags[st.flag] = st.value ?? true;
        break;
      case "add":
        s.flags[st.flag] = ((s.flags[st.flag] as number) || 0) + st.by;
        break;
      case "gold":
        s.money = Math.max(0, s.money + st.amount);
        break;
      case "objective":
        s.objective = st.text;
        break;
      case "if": {
        const branch = holds(s, st) ? st.then : st.else;
        if (branch?.length) r.stack.push({ steps: branch, i: 0 });
        break;
      }
      default:
        return st;
    }
  }
}

/** The player picked option `index` of the choice just returned by `advance`. */
export function choose(r: Runner, choice: Extract<Step, { t: "choice" }>, index: number): void {
  const opt = choice.options[index];
  if (opt?.then.length) r.stack.push({ steps: opt.then, i: 0 });
}
