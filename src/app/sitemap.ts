import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/mdx";
import { SITE_URL } from "@/lib/constants";

/** Served at /sitemap.xml. Submit this URL in Google Search Console. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getProjects();

  const staticRoutes = ["", "/about", "/projects", "/contact"].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const projectRoutes = projects.map((p) => ({
    url: `${SITE_URL}/projects/${p.slug}`,
    lastModified: new Date(p.date),
    priority: 0.7,
  }));

  return [...staticRoutes, ...projectRoutes];
}
