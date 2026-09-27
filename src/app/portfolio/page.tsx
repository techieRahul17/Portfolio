import { Hero } from "@/components/sections/Hero";
import { Intro } from "@/components/sections/Intro";
import { ExperienceRail } from "@/components/sections/ExperienceRail";
import { FeaturedProjects } from "@/components/sections/FeaturedProjects";
import { SkillsGrid } from "@/components/sections/SkillsGrid";
import { Achievements } from "@/components/sections/Achievements";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { UniverseCanvas } from "@/components/three/UniverseCanvas";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Portfolio",
  description: "Rahul V S — frontend developer building 3D, motion-driven interfaces with Three.js and GSAP.",
  path: "/portfolio",
});
import { personJsonLd } from "@/lib/seo";
import { socials } from "@/data/profile";

export default function PortfolioPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd(socials.map((s) => s.href))),
        }}
      />
      <UniverseCanvas />
      <Hero />
      <Intro />
      <ExperienceRail />
      <FeaturedProjects />
      <SkillsGrid />
      <Achievements />
      <ContactCTA />
    </>
  );
}
