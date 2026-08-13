# Portfolio

Personal portfolio built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4 and MDX.

**Location:** `D:\portfolio`

---

## Quick start

```bash
cd /d D:\portfolio      # cmd
cd D:\portfolio         # PowerShell
npm run dev
```

Open http://localhost:3000.

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                    |
| `npm run build`     | Production build (run before every deploy)    |
| `npm start`         | Serve the production build locally            |
| `npm run typecheck` | TypeScript, no emit                           |
| `npm run lint`      | ESLint                                        |
| `npm run format`    | Prettier, with automatic Tailwind class order |

---

## Folder structure

```
D:\portfolio
├─ .github/workflows/ci.yml      CI: typecheck + lint + build on every push
├─ public/                       Served at the site root, as-is
│  ├─ images/
│  │  ├─ avatar.jpg              ← replace with your photo (square, 400px+)
│  │  └─ projects/               ← project cover images (1200×750)
│  └─ resume/resume.pdf          ← drop your résumé here
│
├─ src/
│  ├─ app/                       Routes. A folder = a URL.
│  │  ├─ layout.tsx              Shell: fonts, nav, footer, no-flash theme script
│  │  ├─ page.tsx                /
│  │  ├─ globals.css             ⭐ All design tokens live here
│  │  ├─ about/page.tsx          /about
│  │  ├─ projects/page.tsx       /projects
│  │  ├─ projects/[slug]/        /projects/anything  (generated from MDX)
│  │  ├─ blog/page.tsx           /blog
│  │  ├─ blog/[slug]/            /blog/anything      (generated from MDX)
│  │  ├─ contact/page.tsx        /contact
│  │  ├─ api/contact/route.ts    Contact form endpoint
│  │  ├─ api/og/route.tsx        Generates social preview images on the fly
│  │  ├─ sitemap.ts              /sitemap.xml
│  │  ├─ robots.ts               /robots.txt
│  │  ├─ not-found.tsx           404
│  │  ├─ error.tsx               Error boundary
│  │  └─ loading.tsx             Loading skeleton
│  │
│  ├─ components/
│  │  ├─ layout/                 Navbar, Footer, ThemeToggle
│  │  ├─ sections/               Big page blocks (Hero, SkillsGrid, …)
│  │  ├─ ui/                     Small reusable pieces (Button, Badge, Card…)
│  │  └─ mdx/Mdx.tsx             Renders MDX + maps custom components
│  │
│  ├─ content/                   ⭐ Your writing. No database, no CMS.
│  │  ├─ projects/*.mdx
│  │  └─ blog/*.mdx
│  │
│  ├─ data/                      ⭐ Your facts, as typed TS
│  │  ├─ profile.ts              Name, role, bio, socials, résumé link
│  │  ├─ skills.ts
│  │  └─ experience.ts           Jobs + education
│  │
│  ├─ lib/
│  │  ├─ mdx.ts                  Reads and sorts content files
│  │  ├─ seo.ts                  Metadata + JSON-LD helpers
│  │  ├─ utils.ts                cn(), formatDate(), readingTime()
│  │  └─ constants.ts            Site URL, nav links
│  │
│  └─ types/index.ts             Shared types
│
├─ .env.example                  Copy to .env.local
└─ .prettierrc, eslint.config.mjs, tsconfig.json
```

**The rule:** `data/` is who you are, `content/` is what you wrote, `components/` is
how it looks, `app/` is where it lives. Anything you'd change monthly belongs in the
first two — you should almost never need to touch `app/` again.

---

## Making it yours — in order

### 1. Your details (10 minutes)

Edit `src/data/profile.ts`. Name, role, tagline, bio, location, email, socials.
Everything else on the site reads from this file.

Then `src/data/skills.ts` and `src/data/experience.ts`.

### 2. Your assets

- `public/images/avatar.jpg` — your photo, square, 400×400 or larger
- `public/resume/resume.pdf` — your résumé (exact filename)
- `public/images/projects/` — one cover per project, 1200×750

### 3. Your projects

Create `src/content/projects/my-project.mdx`. The **filename becomes the URL**.

```mdx
---
title: "Project Name"
summary: "One sentence a recruiter can understand."
date: "2026-02-01"
tags: ["Next.js", "PostgreSQL"]
cover: "/images/projects/my-project.png"
repo: "https://github.com/you/repo"
demo: "https://live-demo.com"
featured: true # shows on the home page
order: 1 # position among featured
---

## The problem

...

## What I built

...
```

Save it — the page exists. Delete the two sample projects when you're done with them.

Inside MDX you can use `<Callout>text</Callout>`, and code blocks get syntax
highlighting automatically. Add your own components in `src/components/mdx/Mdx.tsx`.

### 4. Your blog

Same idea in `src/content/blog/`. Set `draft: true` to keep a post visible locally but
out of the production build.

### 5. Your colours

Every colour is a token at the top of `src/app/globals.css`. Change `--accent` in both
`:root` and `.dark` and the whole site re-themes — buttons, links, glows, focus rings.

---

## Deploying to Vercel (free)

1. Push to GitHub:

   ```bash
   git add -A
   git commit -m "Initial portfolio"
   gh repo create portfolio --public --source=. --push
   ```

   (Or create the repo on github.com and `git remote add origin <url>` + `git push -u origin main`.)

2. Go to [vercel.com/new](https://vercel.com/new), import the repo, click **Deploy**.
   No configuration needed — Vercel detects Next.js.

3. Once it's live, add an environment variable in **Settings → Environment Variables**:

   ```
   NEXT_PUBLIC_SITE_URL = https://your-domain.vercel.app
   ```

   Redeploy. This makes sitemap, canonical URLs and social previews correct.

4. Optional: **Settings → Domains** to attach a custom domain.

Every `git push` after this deploys automatically.

---

## Contact form

Works out of the box — it validates, blocks bots with a honeypot, and logs the message
to the server console.

To receive real emails: get a free key at [resend.com](https://resend.com), then copy
`.env.example` to `.env.local` and set `RESEND_API_KEY`. Add the same variable in
Vercel for production. No code changes needed.

---

## Before you share the link

- [ ] `npm run build` passes
- [ ] Every placeholder in `src/data/` replaced with real details
- [ ] Sample projects deleted, real ones added
- [ ] `public/resume/resume.pdf` is your actual résumé
- [ ] Social links go to your real profiles
- [ ] Tested on a phone
- [ ] Toggled light and dark mode
- [ ] Ran Lighthouse (DevTools → Lighthouse) — aim for 95+ across the board

---

## Built with

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · MDX · Motion · Shiki
