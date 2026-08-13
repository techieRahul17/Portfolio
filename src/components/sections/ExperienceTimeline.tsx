"use client";

import { useRef } from "react";
import type { ExperienceItem } from "@/types";
import { gsap, useGSAP } from "@/lib/gsap";
import { Badge } from "@/components/ui/Badge";

/**
 * A vertical timeline whose spine draws itself as you read down it, and whose
 * entries brighten as the line reaches them.
 */
export function ExperienceTimeline({ items }: { items: ExperienceItem[] }) {
  const root = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-spine]",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "top center",
            scrollTrigger: {
              trigger: root.current,
              start: "top 70%",
              end: "bottom 75%",
              scrub: 0.5,
            },
          },
        );

        gsap.utils.toArray<HTMLElement>("[data-xp-entry]", root.current).forEach((entry) => {
          gsap.from(entry, {
            opacity: 0,
            y: 28,
            duration: 0.9,
            scrollTrigger: { trigger: entry, start: "top 85%", once: true },
          });
          gsap.from(entry.querySelector("[data-dot]"), {
            scale: 0,
            duration: 0.5,
            ease: "back.out(2.5)",
            scrollTrigger: { trigger: entry, start: "top 80%", once: true },
          });
        });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <ol ref={root} className="relative pl-8 sm:pl-10">
      {/* Track + the accent spine that draws over it. */}
      <span aria-hidden className="bg-line absolute top-2 bottom-2 left-0 w-px" />
      <span data-spine aria-hidden className="bg-accent absolute top-2 bottom-2 left-0 w-px" />

      {items.map((item) => (
        <li key={`${item.company}-${item.role}`} data-xp-entry className="mb-14 last:mb-0">
          <span
            data-dot
            aria-hidden
            className="bg-accent absolute left-0 mt-2.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full"
            style={{ boxShadow: "0 0 0 4px var(--bg), 0 0 20px var(--accent)" }}
          />

          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h3 className="font-display text-xl leading-tight sm:text-2xl">{item.role}</h3>
            <p className="text-faint font-mono text-[0.65rem] tracking-[0.18em] uppercase">
              {item.period}
            </p>
          </div>

          <p className="text-accent mt-1.5 text-sm">
            {item.companyUrl ? (
              <a href={item.companyUrl} target="_blank" rel="noreferrer" className="hover:underline">
                {item.company}
              </a>
            ) : (
              item.company
            )}
            {item.location && <span className="text-faint"> · {item.location}</span>}
          </p>

          {item.summary && <p className="text-muted mt-4 max-w-2xl">{item.summary}</p>}

          <ul className="mt-4 space-y-3">
            {item.points.map((point) => (
              <li key={point} className="text-muted flex max-w-2xl gap-3 text-sm leading-relaxed">
                <span aria-hidden className="bg-line-strong mt-2 h-1 w-1 shrink-0 rounded-full" />
                {point}
              </li>
            ))}
          </ul>

          {item.stack && item.stack.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {item.stack.map((tech) => (
                <Badge key={tech}>{tech}</Badge>
              ))}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
