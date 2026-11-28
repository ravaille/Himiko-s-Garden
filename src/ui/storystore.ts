import { newStory, type StoryState } from "../core/story";

const KEY = "himiko.story.v1";

function load(): StoryState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as StoryState | null;
    if (s && typeof s.name === "string" && typeof s.money === "number" && s.flags) return s;
  } catch {
    /* corrupt save: start over */
  }
  return newStory();
}

/** The one story state of the game (name, money, markers, objective), saved in the browser. */
export const story: StoryState = load();

export function saveStory(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(story));
  } catch {
    /* storage unavailable: progress is simply not kept */
  }
}
