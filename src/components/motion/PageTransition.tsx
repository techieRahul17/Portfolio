"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP } from "@/lib/gsap";
import { REDUCED_MOTION, useMediaQuery } from "@/lib/hooks";

/**
 * Route-change reveal.
 *
 * `useGSAP` runs as a layout effect, so the slats are already covering the
 * viewport before the browser paints the new route — then they retract
 * upward and hand it over. That ordering is the whole trick: it reads as one
 * continuous move rather than a page swap followed by an animation.
 *
 * The first render is skipped; on initial load the preloader owns the reveal.
 */
export function PageTransition() {
  const root = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const pathname = usePathname();
  const reduced = useMediaQuery(REDUCED_MOTION);

  useGSAP(
    () => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      if (reduced) return;

      const tl = gsap.timeline();

      tl.set("[data-pt-slat]", { scaleY: 1, transformOrigin: "bottom center" }).to(
        "[data-pt-slat]",
        {
          scaleY: 0,
          transformOrigin: "top center",
          duration: 0.65,
          stagger: 0.045,
          ease: "voltageInOut",
        },
      );

      return () => {
        tl.kill();
      };
    },
    { scope: root, dependencies: [pathname] },
  );

  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9995] flex"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} data-pt-slat className="bg-bg h-full flex-1 origin-top scale-y-0" />
      ))}
    </div>
  );
}
