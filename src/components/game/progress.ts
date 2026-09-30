import { ACHIEVEMENTS, CHALLENGES, MEDAL_RANK, type AchievementId, type ChallengeId, type Medal } from "@/lib/game/challenges";

/**
 * Medals and achievements survive between visits. Storage can be blocked
 * (private mode), so every read falls back to "nothing earned yet".
 */

const MEDALS_KEY = "rvs:game:medals";
const ACH_KEY = "rvs:game:achievements";

export type Medals = Partial<Record<ChallengeId, Medal>>;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — just won't persist */
  }
}

export function loadMedals(): Medals {
  const v = read<Medals>(MEDALS_KEY, {});
  const out: Medals = {};
  for (const id of Object.keys(CHALLENGES) as ChallengeId[]) {
    if (v[id] === "gold" || v[id] === "silver" || v[id] === "bronze") out[id] = v[id];
  }
  return out;
}

/** Keeps the better of the stored and new medal; returns the merged set and whether it improved. */
export function recordMedal(medals: Medals, id: ChallengeId, medal: Medal) {
  const prev = medals[id];
  const better = !prev || MEDAL_RANK[medal] > MEDAL_RANK[prev];
  const next = better ? { ...medals, [id]: medal } : medals;
  if (better) write(MEDALS_KEY, next);
  return { medals: next, improved: better, first: !prev };
}

export function loadAchievements(): AchievementId[] {
  const v = read<string[]>(ACH_KEY, []);
  const known = new Set(ACHIEVEMENTS.map((a) => a.id));
  return Array.isArray(v) ? (v.filter((x) => known.has(x as AchievementId)) as AchievementId[]) : [];
}

export function saveAchievements(list: Iterable<AchievementId>) {
  write(ACH_KEY, [...list]);
}

export function clearProgressExtras() {
  for (const key of [MEDALS_KEY, ACH_KEY, "rvs:game:stars", "rvs:game:keepie-best"]) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/**
 * A match rating out of 10, like a player's rating in a match report:
 * 6.0 for turning up, then medals, achievements and stars on top.
 */
export function matchRating(medals: Medals, achievements: number, stars: number) {
  let r = 6;
  for (const m of Object.values(medals)) r += m === "gold" ? 0.45 : m === "silver" ? 0.28 : 0.12;
  r += achievements * 0.12 + stars * 0.04;
  return Math.min(10, Math.round(r * 10) / 10);
}
