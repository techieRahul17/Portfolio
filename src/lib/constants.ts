/**
 * The canonical URL of the deployed site.
 *
 * Order matters: an explicit NEXT_PUBLIC_SITE_URL wins, then Vercel's
 * auto-injected production URL, then localhost for `npm run dev`.
 * Used for absolute OG image URLs, the sitemap and robots.txt.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const NAV_LINKS = [
  { href: "/", label: "Play", num: "01" },
  { href: "/portfolio", label: "Index", num: "02" },
  { href: "/about", label: "About", num: "03" },
  { href: "/projects", label: "Work", num: "04" },
  { href: "/contact", label: "Contact", num: "05" },
] as const;

/** Anchors used by the home page's in-section nav. */
export const HOME_SECTIONS = [
  { id: "intro", label: "Intro" },
  { id: "experience", label: "Experience" },
  { id: "work", label: "Work" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
] as const;
