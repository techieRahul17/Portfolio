import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { profile } from "@/data/profile";

type SeoInput = {
  title?: string;
  description?: string;
  /** Root-relative path, e.g. "/projects/attendez" */
  path?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  tags?: string[];
};

/**
 * One helper so every page gets consistent title/OG/Twitter tags.
 * Pages call it from their exported `metadata`.
 */
export function buildMetadata({
  title,
  description = profile.tagline,
  path = "/",
  image,
  type = "website",
  publishedTime,
  tags,
}: SeoInput = {}): Metadata {
  const url = `${SITE_URL}${path}`;
  const fullTitle = title ? `${title} — ${profile.name}` : `${profile.name} — ${profile.role}`;

  /* When a page has its own artwork we point at it. Otherwise we say nothing
     about images and let `app/opengraph-image.tsx` supply the site card —
     Next injects those tags itself, and overriding here would suppress it. */
  const images = image
    ? [{ url: `${SITE_URL}${image}`, width: 1200, height: 630, alt: fullTitle }]
    : undefined;

  return {
    title: fullTitle,
    description,
    keywords: [
      profile.name,
      "Frontend Developer",
      "Three.js",
      "GSAP",
      "Software Engineer",
      "SSN College of Engineering",
      "Full-Stack Developer",
      "React",
      "Spring Boot",
      "AWS",
      "Chennai",
    ],
    authors: [{ name: profile.name, url: SITE_URL }],
    creator: profile.name,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: profile.name,
      locale: "en_IN",
      type,
      ...(images ? { images } : {}),
      ...(publishedTime ? { publishedTime } : {}),
      ...(tags ? { tags } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      ...(image ? { images: [`${SITE_URL}${image}`] } : {}),
    },
  };
}

/**
 * JSON-LD for the home page. Helps Google treat Rahul as a Person entity
 * rather than as another page of text.
 */
export function personJsonLd(socialUrls: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: SITE_URL,
    jobTitle: profile.role,
    email: `mailto:${profile.email}`,
    telephone: profile.phone,
    description: profile.tagline,
    address: {
      "@type": "PostalAddress",
      addressLocality: profile.location.split(",")[0].trim(),
      addressCountry: "IN",
    },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: profile.university,
    },
    knowsAbout: ["React", "Java", "Spring Boot", "AWS", "FastAPI", "React Native", "GenAI"],
    sameAs: socialUrls.filter((url) => url.startsWith("http")),
  };
}
