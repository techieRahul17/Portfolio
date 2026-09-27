import { achievements } from "@/data/achievements";
import { education, experience } from "@/data/experience";
import { profile } from "@/data/profile";
import { skills } from "@/data/skills";
import type { ZoneDef } from "@/lib/game/engine";
import type { ExperienceItem, Project } from "@/types";

/**
 * Maps the portfolio data onto the pitch. Every unlockable thing gets a
 * stable id; a zone is complete when all of its ids are unlocked.
 */

export const xpItems: ExperienceItem[] = [...experience, ...education];

export const ids = {
  about: "about",
  xp: (i: number) => `xp-${i}`,
  project: (slug: string) => `project-${slug}`,
  skill: (i: number) => `skill-${i}`,
  trophy: (i: number) => `trophy-${i}`,
  contact: "contact",
};

/** Short names painted next to each dribbling gate. */
export const gateLabels = xpItems.map((item) =>
  item.kind === "education" ? profile.university.split(" ")[0] : item.company.split(" ")[0],
);

export function buildZones(projects: Project[]): ZoneDef[] {
  return [
    { id: "about", name: "ABOUT", task: "Score a goal in the net", ids: [ids.about] },
    {
      id: "experience",
      name: "EXPERIENCE",
      task: "Dribble the ball through every gate",
      ids: xpItems.map((_, i) => ids.xp(i)),
    },
    {
      id: "work",
      name: "WORK",
      task: "Shoot at a target to open a project",
      ids: projects.map((p) => ids.project(p.slug)),
    },
    { id: "skills", name: "SKILLS", task: "Run through the orbs", ids: skills.map((_, i) => ids.skill(i)) },
    {
      id: "trophies",
      name: "TROPHIES",
      task: "Beat the keeper — one goal per trophy",
      ids: achievements.map((_, i) => ids.trophy(i)),
    },
    { id: "contact", name: "CONTACT", task: "Step onto the glowing pad", ids: [ids.contact] },
  ];
}

export type Reveal =
  | { kind: "about" }
  | { kind: "xp"; index: number; item: ExperienceItem }
  | { kind: "project"; project: Project; index: number }
  | { kind: "skill"; index: number }
  | { kind: "trophy"; index: number }
  | { kind: "contact" };

export function resolve(id: string, projects: Project[]): Reveal | null {
  if (id === ids.about) return { kind: "about" };
  if (id === ids.contact) return { kind: "contact" };
  const [kind, ...rest] = id.split("-");
  const key = rest.join("-");
  if (kind === "xp" && xpItems[+key]) return { kind: "xp", index: +key, item: xpItems[+key] };
  if (kind === "skill" && skills[+key]) return { kind: "skill", index: +key };
  if (kind === "trophy" && achievements[+key]) return { kind: "trophy", index: +key };
  if (kind === "project") {
    const index = projects.findIndex((p) => p.slug === key);
    if (index >= 0) return { kind: "project", project: projects[index], index };
  }
  return null;
}

const STORAGE_KEY = "rvs:game:unlocked";

export function loadProgress(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveProgress(unlocked: Iterable<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
  } catch {
    /* private mode — progress just won't survive a reload */
  }
}
