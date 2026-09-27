import Link from "next/link";
import { FootballGame } from "@/components/game/FootballGame";
import { getFeaturedProjects, toCards } from "@/lib/mdx";
import { personJsonLd } from "@/lib/seo";
import { profile, socials } from "@/data/profile";
import { experience } from "@/data/experience";
import { achievements } from "@/data/achievements";

/**
 * Home: the portfolio as a playable football match.
 *
 * The pitch is a canvas, so everything it reveals is also written out here as
 * plain, visually-hidden HTML — search engines and screen readers get the
 * whole portfolio without having to score a goal first.
 */
export default async function HomePage() {
  const projects = toCards(await getFeaturedProjects(4));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd(socials.map((s) => s.href))),
        }}
      />

      <div className="sr-only">
        <h1>
          {profile.name} — {profile.role}
        </h1>
        <p>{profile.headline}</p>
        <p>{profile.tagline}</p>
        <p>
          <Link href="/portfolio">Skip the game and view the portfolio</Link>
        </p>
        <h2>Experience</h2>
        <ul>
          {experience.map((x) => (
            <li key={x.company}>
              {x.role} at {x.company}, {x.period}
            </li>
          ))}
        </ul>
        <h2>Selected work</h2>
        <ul>
          {projects.map((p) => (
            <li key={p.slug}>
              <Link href={`/projects/${p.slug}`}>{p.title}</Link> — {p.summary}
            </li>
          ))}
        </ul>
        <h2>Recognition</h2>
        <ul>
          {achievements.map((a) => (
            <li key={a.title}>{a.title}</li>
          ))}
        </ul>
        <p>
          <Link href="/contact">Contact</Link> · <a href={profile.resumeUrl}>Résumé</a>
        </p>
      </div>

      <FootballGame projects={projects} />
    </>
  );
}
