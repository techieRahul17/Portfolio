import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { Project, WithContent } from "@/types";

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

async function readCollection(dir: string) {
  const full = path.join(CONTENT_DIR, dir);

  let files: string[];
  try {
    files = await fs.readdir(full);
  } catch {
    // Folder doesn't exist yet — an empty collection is the right answer,
    // not a build crash.
    return [];
  }

  const mdx = files.filter((f) => f.endsWith(".mdx"));

  return Promise.all(
    mdx.map(async (file) => {
      const raw = await fs.readFile(path.join(full, file), "utf8");
      const { data, content } = matter(raw);
      return {
        // The filename is the slug, so URLs can never drift from frontmatter.
        slug: file.replace(/\.mdx$/, ""),
        ...(data as Record<string, unknown>),
        content,
      };
    }),
  );
}

const byDateDesc = (a: { date: string }, b: { date: string }) =>
  +new Date(b.date) - +new Date(a.date);

export async function getProjects(): Promise<WithContent<Project>[]> {
  const items = (await readCollection("projects")) as WithContent<Project>[];
  return items.sort(byDateDesc);
}

export async function getProject(slug: string) {
  const projects = await getProjects();
  return projects.find((p) => p.slug === slug) ?? null;
}

/** Home-page deck. `order` wins over date so the story can be sequenced. */
export async function getFeaturedProjects(limit = 4) {
  const projects = await getProjects();
  return projects
    .filter((p) => p.featured)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .slice(0, limit);
}

/**
 * Strip the MDX bodies before handing projects to a client component — the
 * card UIs only need frontmatter, and the bodies would otherwise be serialised
 * into the RSC payload for no reason.
 */
export function toCards(projects: WithContent<Project>[]): Project[] {
  return projects.map(({ content, ...card }) => card);
}

/** Every tag used across projects, deduped and alphabetised. */
export async function getProjectTags() {
  const projects = await getProjects();
  return [...new Set(projects.flatMap((p) => p.tags ?? []))].sort();
}
