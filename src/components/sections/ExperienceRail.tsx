"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
import { experience, education } from "@/data/experience";
import type { ExperienceItem } from "@/types";
import { Badge } from "@/components/ui/Badge";

const items: ExperienceItem[] = [...experience, ...education];

/**
 * The experience rail.
 *
 * On desktop the section pins and the track slides sideways as you scroll —
 * a résumé you travel along rather than scan. Cards reveal themselves against
 * that horizontal motion using GSAP's `containerAnimation`, which maps their
 * position inside the moving track back onto the page's scroll.
 *
 * Below `lg`, and for anyone who prefers reduced motion, it degrades to an
 * ordinary vertical stack. Same markup, no pinning.
 */
export function ExperienceRail() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-xp-card]", track.current);
      const mm = gsap.matchMedia();

      /* ------------------------------- desktop ------------------------------ */
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.set(cards, { opacity: 0, yPercent: 8 });

        // Recomputed on every refresh so a resize or font swap can't leave the
        // track short (dead scroll) or long (a blank tail).
        const distance = () => Math.max(0, track.current!.scrollWidth - window.innerWidth);

        const slide = gsap.to(track.current, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        cards.forEach((card) => {
          gsap.to(card, {
            opacity: 1,
            yPercent: 0,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              containerAnimation: slide,
              start: "left 88%",
              once: true,
            },
          });
        });

        // Progress readout under the rail.
        const bar = section.current!.querySelector<HTMLElement>("[data-xp-bar]");
        const st = ScrollTrigger.create({
          trigger: section.current,
          start: "top top",
          end: () => `+=${distance()}`,
          onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
        });

        return () => {
          st.kill();
        };
      });

      /* ----------------------- mobile / reduced motion ---------------------- */
      mm.add(
        "(max-width: 1023px), (prefers-reduced-motion: reduce)",
        () => {
          gsap.set(cards, { opacity: 0, y: 30 });
          cards.forEach((card) => {
            gsap.to(card, {
              opacity: 1,
              y: 0,
              duration: 0.8,
              scrollTrigger: { trigger: card, start: "top 88%", once: true },
            });
          });
        },
      );

      return () => mm.revert();
    },
    { scope: section },
  );

  return (
    <section
      id="experience"
      ref={section}
      className="border-line relative scroll-mt-24 border-t lg:h-[100svh] lg:overflow-hidden"
    >
      <div
        ref={track}
        className="flex flex-col gap-6 px-5 py-24 sm:px-8 lg:h-full lg:w-max lg:flex-row lg:items-center lg:gap-8 lg:px-[7vw] lg:py-0 lg:will-change-transform"
      >
        {/* ------------------------------ lead panel ------------------------- */}
        <div className="lg:mr-8 lg:w-[32rem] lg:shrink-0">
          <div className="flex items-center gap-4">
            <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] whitespace-nowrap uppercase">
              <span className="text-accent">02 — </span>Experience
            </p>
            <span aria-hidden className="bg-line-strong h-px flex-1" />
          </div>

          <h2 className="font-display mt-6 text-[clamp(2rem,5.5vw,4.25rem)] leading-[0.95] tracking-[-0.035em]">
            Where I&apos;ve
            <br />
            <span className="text-accent">shipped</span> things
          </h2>

          <p className="text-muted mt-6 max-w-md leading-relaxed">
            Two internships, one campus pilot, and a habit of measuring what changed after I
            showed up.
          </p>

          <p className="text-faint mt-8 hidden font-mono text-[0.65rem] tracking-[0.2em] uppercase lg:block">
            Scroll to travel →
          </p>
        </div>

        {/* -------------------------------- cards ---------------------------- */}
        {items.map((item, i) => (
          <article
            key={`${item.company}-${item.role}`}
            data-xp-card
            className={[
              "panel relative flex flex-col rounded-2xl p-7 sm:p-9",
              "lg:h-[min(34rem,68vh)] lg:w-[min(40rem,80vw)] lg:shrink-0",
              item.featured ? "border-accent/40" : "",
            ].join(" ")}
          >
            {item.featured && (
              <span
                aria-hidden
                className="bg-accent absolute -top-px left-8 h-px w-24"
                style={{ boxShadow: "0 0 24px 2px var(--accent)" }}
              />
            )}

            <header className="flex items-start justify-between gap-6">
              <div>
                <p className="text-faint font-mono text-[0.65rem] tracking-[0.22em] uppercase">
                  {item.kind === "education" ? "Education" : `Role ${String(i + 1).padStart(2, "0")}`}
                </p>
                <h3 className="font-display mt-3 text-2xl leading-tight sm:text-3xl">
                  {item.role}
                </h3>
                <p className="text-accent mt-1.5 text-sm">{item.company}</p>
              </div>
              <div className="text-muted shrink-0 text-right font-mono text-[0.65rem] tracking-[0.15em] uppercase">
                <p>{item.period}</p>
                {item.location && <p className="text-faint mt-1">{item.location}</p>}
              </div>
            </header>

            {item.summary && (
              <p className="text-muted mt-6 leading-relaxed">{item.summary}</p>
            )}

            <ul className="mt-6 flex-1 space-y-3.5 overflow-y-auto" data-lenis-prevent>
              {item.points.map((point) => (
                <li key={point} className="text-muted flex gap-3 text-sm leading-relaxed">
                  <span aria-hidden className="bg-accent mt-2 h-1 w-1 shrink-0 rounded-full" />
                  {point}
                </li>
              ))}
            </ul>

            {item.stack && item.stack.length > 0 && (
              <div className="border-line mt-7 flex flex-wrap gap-2 border-t pt-6">
                {item.stack.map((tech) => (
                  <Badge key={tech}>{tech}</Badge>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {/* ------------------------------ rail progress ------------------------ */}
      <div
        aria-hidden
        className="bg-line pointer-events-none absolute inset-x-[7vw] bottom-10 hidden h-px lg:block"
      >
        <div data-xp-bar className="bg-accent h-px w-full origin-left scale-x-0" />
      </div>
    </section>
  );
}
