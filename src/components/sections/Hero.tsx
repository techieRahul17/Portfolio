import { ArrowDown, ArrowUpRight } from "lucide-react";
import { profile } from "@/data/profile";
import { marqueeWords } from "@/data/skills";
import { HeroName } from "@/components/three/HeroName";
import { RoleRotator } from "@/components/motion/RoleRotator";
import { Marquee } from "@/components/motion/Marquee";
import { Magnetic } from "@/components/motion/Magnetic";
import { ButtonLink } from "@/components/ui/Button";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-between overflow-x-clip pt-[var(--nav-h)]"
    >
      {/* The backdrop is the WebGL universe (<UniverseCanvas>), fixed behind the page.
          This soft shadow just keeps the name legible where it crosses the planet. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 -left-1/4 -z-10 h-[70vh] w-[min(110vw,60rem)] rounded-[50%] opacity-70 blur-[120px]"
        style={{ background: "radial-gradient(closest-side, rgba(7,7,10,0.9), transparent)" }}
      />

      {/* ------------------------------- top meta ----------------------------- */}
      <div className="mx-auto flex w-full max-w-[110rem] items-start justify-between gap-6 px-5 pt-8 sm:px-8">
        <p
          data-reveal
          className="text-muted flex items-center gap-2.5 font-mono text-[0.68rem] tracking-[0.2em] uppercase"
        >
          <span className="bg-accent relative flex h-1.5 w-1.5 rounded-full">
            <span className="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" />
          </span>
          {profile.availabilityNote}
        </p>

        <p
          data-reveal
          data-reveal-delay="0.1"
          className="text-faint hidden text-right font-mono text-[0.68rem] tracking-[0.2em] uppercase sm:block"
        >
          {profile.location}
          <br />
          <span className="text-muted">{profile.university}</span>
        </p>
      </div>

      {/* --------------------------------- name ------------------------------- */}
      <div className="mx-auto w-full max-w-[110rem] px-5 sm:px-8">
        <h1 className="sr-only">
          {profile.name} — {profile.role}
        </h1>

        <HeroName
          first={profile.nameParts[0]}
          second={profile.nameParts[1]}
          aside={
            <div data-reveal data-reveal-delay="0.55" className="mb-3 hidden flex-1 lg:block">
              <span className="text-faint block font-mono text-[0.65rem] tracking-[0.25em] uppercase">
                Currently
              </span>
              <RoleRotator
                items={profile.roles}
                className="font-sans text-lg font-normal tracking-normal"
              />
            </div>
          }
        />
      </div>

      {/* ------------------------------ intro block --------------------------- */}
      <div className="mx-auto w-full max-w-[110rem] px-5 sm:px-8">
        <div className="border-line grid gap-8 border-t py-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <p data-reveal data-reveal-delay="0.5" className="text-fg text-lg leading-snug">
              {profile.headline}
            </p>
            <p data-reveal data-reveal-delay="0.6" className="text-muted mt-3 max-w-xl leading-relaxed">
              {profile.tagline}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:col-span-4 lg:col-start-9 lg:justify-end">
            <div data-reveal data-reveal-delay="0.7">
              <Magnetic strength={0.3}>
                <ButtonLink href="/projects" size="lg" data-cursor="view">
                  See the work
                  <ArrowUpRight className="h-4 w-4" />
                </ButtonLink>
              </Magnetic>
            </div>
            <div data-reveal data-reveal-delay="0.78">
              <Magnetic strength={0.3}>
                <ButtonLink href={profile.resumeUrl} size="lg" variant="secondary" external>
                  Résumé
                </ButtonLink>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------- ticker ------------------------------ */}
      <div className="border-line relative border-y py-3">
        <Marquee
          items={marqueeWords}
          speed={38}
          className="text-muted font-mono text-[0.7rem] tracking-[0.25em] uppercase"
        />
      </div>

      <div className="mx-auto flex w-full max-w-[110rem] items-center justify-between px-5 py-5 sm:px-8">
        <a
          href="#intro"
          data-reveal
          data-reveal-delay="0.9"
          className="group text-faint hover:text-accent flex items-center gap-3 font-mono text-[0.65rem] tracking-[0.25em] uppercase transition-colors"
        >
          <span className="border-line group-hover:border-accent grid h-9 w-9 place-items-center rounded-full border transition-colors">
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
          </span>
          Scroll
        </a>

        <p
          data-reveal
          data-reveal-delay="0.9"
          className="text-faint text-right font-mono text-[0.65rem] tracking-[0.25em] uppercase"
        >
          Three.js <span className="text-accent">×</span> GSAP{" "}
          <span className="text-muted">· ex-Amazon</span>
        </p>
      </div>
    </section>
  );
}
