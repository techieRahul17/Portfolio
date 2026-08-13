/**
 * Shared types for the whole site. Keeping them in one file means a change
 * here surfaces as a type error everywhere the shape is used.
 */

export type Project = {
  slug: string;
  title: string;
  summary: string;
  /** ISO date, e.g. "2025-11-02". Used for sorting and <time> tags. */
  date: string;
  tags: string[];
  /** Short label shown on the stacked home-page cards, e.g. "Hackathon winner". */
  kicker?: string;
  /** One-line outcome, e.g. "1st place · Prayacthon'25". */
  award?: string;
  /** Path under /public, e.g. "/images/projects/foo.png" */
  cover?: string;
  repo?: string;
  demo?: string;
  featured?: boolean;
  order?: number;
};

export type Post = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  draft?: boolean;
};

/** A parsed MDX file: frontmatter + the raw body, ready to compile. */
export type WithContent<T> = T & { content: string };

export type SkillGroup = {
  title: string;
  /** Small caption under the group title. */
  note?: string;
  items: string[];
};

export type ExperienceItem = {
  role: string;
  company: string;
  companyUrl?: string;
  /** Free text, so "Aug 2023 — Present" is as valid as "2025". */
  period: string;
  location?: string;
  kind?: "work" | "education";
  /** Highlighted in the pinned experience rail. */
  featured?: boolean;
  summary?: string;
  points: string[];
  stack?: string[];
};

export type Achievement = {
  title: string;
  project: string;
  year: string;
  detail: string;
};

export type SocialLink = {
  label: string;
  href: string;
  /** Key into the icon map in components/ui/SocialIcon.tsx */
  icon: "github" | "linkedin" | "x" | "mail" | "resume";
};
