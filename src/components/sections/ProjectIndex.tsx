"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { gsap, useGSAP, hasFinePointer } from "@/lib/gsap";
import type { Project } from "@/types";
import { ProceduralCover } from "@/components/ui/ProceduralCover";
import { formatDate } from "@/lib/utils";

/**
 * The full project list as an index rather than a grid: one row per project,
 * with a preview panel that trails the cursor and swaps as you move down the
 * list. The rows carry all the information on their own, so the panel is a
 * bonus for pointer users and simply never appears on touch.
 */
export function ProjectIndex({ projects }: { projects: Project[] }) {
  const root = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useGSAP(
    () => {
      if (!hasFinePointer()) return;

      const el = preview.current!;
      gsap.set(el, { xPercent: -50, yPercent: -50, scale: 0.85, opacity: 0 });

      const xTo = gsap.quickTo(el, "x", { duration: 0.7, ease: "power3" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.7, ease: "power3" });

      const onMove = (e: PointerEvent) => {
        xTo(e.clientX);
        yTo(e.clientY);
      };

      root.current!.addEventListener("pointermove", onMove, { passive: true });
      return () => root.current?.removeEventListener("pointermove", onMove);
    },
    { scope: root },
  );

  /* Fade the panel in and out as rows take and lose focus. */
  useGSAP(
    () => {
      if (!hasFinePointer()) return;
      gsap.to(preview.current, {
        opacity: active === null ? 0 : 1,
        scale: active === null ? 0.85 : 1,
        duration: 0.45,
        ease: "voltage",
      });
    },
    { dependencies: [active] },
  );

  return (
    <div ref={root} className="relative">
      {/* ------------------------------ hover panel ------------------------- */}
      <div
        ref={preview}
        aria-hidden
        className="border-line pointer-events-none fixed top-0 left-0 z-30 hidden h-64 w-96 overflow-hidden rounded-xl border opacity-0 lg:block"
      >
        {active !== null &&
          (projects[active].cover ? (
            <Image
              src={projects[active].cover!}
              alt=""
              fill
              sizes="24rem"
              className="object-cover"
            />
          ) : (
            <ProceduralCover index={active} title={projects[active].title} />
          ))}
      </div>

      {/* -------------------------------- rows ------------------------------ */}
      <div className="border-line border-t">
        {projects.map((project, i) => (
          <Link
            key={project.slug}
            href={`/projects/${project.slug}`}
            data-reveal
            data-reveal-delay={String(i * 0.05)}
            data-cursor="open"
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive((cur) => (cur === i ? null : cur))}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="group border-line hover:text-accent-ink relative block overflow-hidden border-b transition-colors duration-500"
          >
            <span
              aria-hidden
              className="bg-accent absolute inset-0 origin-left scale-x-0 transition-transform duration-600 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:scale-x-100"
            />

            <div className="relative flex flex-col gap-4 px-1 py-8 sm:flex-row sm:items-center sm:gap-8 sm:px-4">
              <span className="text-faint group-hover:text-accent-ink w-10 shrink-0 font-mono text-[0.7rem] tracking-[0.2em] transition-colors duration-500">
                {String(i + 1).padStart(2, "0")}
              </span>

              <h2 className="font-display flex-1 text-[clamp(1.6rem,4.5vw,3rem)] leading-none tracking-[-0.03em] transition-transform duration-500 group-hover:translate-x-3">
                {project.title}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:max-w-sm sm:justify-end">
                <p className="text-muted group-hover:text-accent-ink/80 font-mono text-[0.68rem] tracking-[0.12em] transition-colors duration-500">
                  {project.tags?.slice(0, 3).join(" · ")}
                </p>
                <time
                  dateTime={project.date}
                  className="text-faint group-hover:text-accent-ink/70 font-mono text-[0.68rem] tracking-[0.12em] transition-colors duration-500"
                >
                  {formatDate(project.date).split(" ").slice(-1)}
                </time>
              </div>

              <ArrowUpRight className="h-5 w-5 shrink-0 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
