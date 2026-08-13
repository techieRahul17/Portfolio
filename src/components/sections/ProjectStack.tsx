"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import type { Project } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { ProceduralCover } from "@/components/ui/ProceduralCover";

/**
 * A deck of case studies. Each card sticks to the top of the viewport and the
 * next one slides over it, pressing the one below back in space — so the work
 * reads as a stack you're leafing through rather than a grid you're skimming.
 *
 * The sticky behaviour is plain CSS, which means it still works with JS off;
 * GSAP only adds the depth cue on top.
 */
export function ProjectStack({ projects }: { projects: Project[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const wrappers = gsap.utils.toArray<HTMLElement>("[data-stack-item]", root.current);

        wrappers.forEach((wrapper, i) => {
          const next = wrappers[i + 1];
          if (!next) return;

          gsap.to(wrapper.querySelector("[data-stack-card]"), {
            scale: 0.93,
            opacity: 0.35,
            ease: "none",
            scrollTrigger: {
              trigger: next,
              start: "top bottom",
              end: "top top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
        });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="mt-14">
      {projects.map((project, i) => (
        <div
          key={project.slug}
          data-stack-item
          className="sticky"
          // Each card parks a little lower than the last, so the edges of the
          // deck stay visible underneath the top card.
          style={{ top: `calc(var(--nav-h) + 1.5rem + ${i * 0.9}rem)` }}
        >
          <article
            data-stack-card
            className="panel group relative mb-8 overflow-hidden rounded-3xl will-change-transform"
          >
            <div className="grid lg:grid-cols-12">
              {/* ------------------------------ visual ----------------------- */}
              <div className="relative min-h-[13rem] overflow-hidden lg:col-span-5 lg:min-h-[28rem]">
                {project.cover ? (
                  <Image
                    src={project.cover}
                    alt={project.title}
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <ProceduralCover index={i} title={project.title} />
                )}
              </div>

              {/* ------------------------------ content ---------------------- */}
              <div className="flex flex-col justify-between gap-8 p-7 sm:p-10 lg:col-span-7">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-faint font-mono text-[0.65rem] tracking-[0.25em] uppercase">
                      {String(i + 1).padStart(2, "0")} / {project.kicker ?? "Project"}
                    </p>
                    {project.award && <Badge tone="accent">{project.award}</Badge>}
                  </div>

                  <h3 className="font-display mt-6 text-[clamp(1.9rem,4vw,3.25rem)] leading-[1] tracking-[-0.035em]">
                    {project.title}
                  </h3>

                  <p className="text-muted mt-5 max-w-xl leading-relaxed">{project.summary}</p>
                </div>

                <div>
                  <div className="flex flex-wrap gap-2">
                    {project.tags?.slice(0, 6).map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>

                  <Link
                    href={`/projects/${project.slug}`}
                    data-cursor="open"
                    className="group/cta text-fg hover:text-accent mt-8 inline-flex items-center gap-3 text-sm font-medium transition-colors"
                  >
                    <span className="border-line group-hover/cta:border-accent group-hover/cta:bg-accent group-hover/cta:text-accent-ink grid h-11 w-11 place-items-center rounded-full border transition-all duration-300">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                    Read the case study
                    <span className="sr-only"> for {project.title}</span>
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}
