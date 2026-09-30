/**
 * Mission challenges and achievements — pure data, shared by the engine
 * (which measures) and the HUD (which briefs, times and awards).
 *
 * Every mission can always be completed; medals are the mastery layer on top.
 */

export type Medal = "gold" | "silver" | "bronze";

export type ChallengeId = "about" | "experience" | "work" | "skills" | "trophies";

type Challenge = {
  title: string;
  brief: string;
  /** What's measured; lower is always better. */
  stat: "shots" | "seconds" | "saves";
  gold: number;
  silver: number;
};

export const CHALLENGES: Record<ChallengeId, Challenge> = {
  about: {
    title: "Warm-up strike",
    brief: "Score in the net. Fewest shots wins.",
    stat: "shots",
    gold: 1,
    silver: 2,
  },
  experience: {
    title: "Slalom",
    brief: "Dribble through all three gates, in order, against the clock.",
    stat: "seconds",
    gold: 3.4,
    silver: 5,
  },
  work: {
    title: "Sharpshooter",
    brief: "Hit all four targets. Every miss counts against you.",
    stat: "shots",
    gold: 4,
    silver: 6,
  },
  skills: {
    title: "Orb rush",
    brief: "Grab all seven orbs as fast as you can.",
    stat: "seconds",
    gold: 16,
    silver: 26,
  },
  trophies: {
    title: "Shoot-out",
    brief: "Score four past the keeper. Every save costs you.",
    stat: "saves",
    gold: 0,
    silver: 2,
  },
};

export function medalFor(id: ChallengeId, value: number): Medal {
  const c = CHALLENGES[id];
  if (value <= c.gold) return "gold";
  if (value <= c.silver) return "silver";
  return "bronze";
}

export function formatStat(id: ChallengeId, value: number) {
  const c = CHALLENGES[id];
  if (c.stat === "seconds") return `${value.toFixed(1)}s`;
  if (c.stat === "saves") return `${value} ${value === 1 ? "save" : "saves"}`;
  return `${value} ${value === 1 ? "shot" : "shots"}`;
}

/** "Gold ≤ 3.4s · Silver ≤ 5s" — the targets, in words. */
export function targetsLine(id: ChallengeId) {
  const c = CHALLENGES[id];
  if (c.stat === "saves") return `Gold: no saves · Silver: ${c.silver} or fewer`;
  if (c.stat === "seconds") return `Gold under ${c.gold}s · Silver under ${c.silver}s`;
  return c.gold === 1 ? `Gold: first time · Silver: ${c.silver} shots` : `Gold: ${c.gold} shots · Silver: ${c.silver}`;
}

export const MEDAL_RANK: Record<Medal, number> = { gold: 3, silver: 2, bronze: 1 };

export type AchievementId =
  | "crossbar"
  | "hattrick"
  | "sniper"
  | "marathon"
  | "strike"
  | "goldenboot"
  | "juggler"
  | "perfectionist";

export const ACHIEVEMENTS: { id: AchievementId; title: string; detail: string }[] = [
  { id: "crossbar", title: "Crossbar Challenge", detail: "Hit the bar. On purpose, obviously." },
  { id: "hattrick", title: "Hat-trick", detail: "Three past the keeper in a row, no saves." },
  { id: "sniper", title: "Sniper", detail: "A bullseye from 20 metres or more." },
  { id: "strike", title: "Strike", detail: "All ten pins down." },
  { id: "marathon", title: "Box to box", detail: "Run 500 metres in one match." },
  { id: "goldenboot", title: "Golden Boot", detail: "Find all ten golden stars." },
  { id: "juggler", title: "Juggler", detail: "Ten keepie-uppies on the loading screen." },
  { id: "perfectionist", title: "Perfectionist", detail: "Gold on every mission." },
];
