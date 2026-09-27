"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * A seamless ticker whose speed — and direction — answer to the scroll.
 *
 * Scroll down and the words rush along; scroll up and they run backwards.
 * The track holds two identical copies and wraps at -50%, so the loop has no
 * seam regardless of content width.
 */
export function Marquee({
  items,
  speed = 40,
  reverse = false,
  className,
  separator = "/",
}: {
  items: string[];
  /** Pixels per second at rest. */
  speed?: number;
  reverse?: boolean;
  className?: string;
  separator?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const track = root.current!.querySelector<HTMLElement>("[data-track]")!;
      const half = track.scrollWidth / 2;
      if (!half) return;

      const direction = reverse ? 1 : -1;
      const wrap = gsap.utils.wrap(-half, 0);
      let offset = reverse ? -half : 0;
      let scrollBoost = 0;

      const tick = (_t: number, delta: number) => {
        offset += ((direction * speed + scrollBoost) * delta) / 1000;
        gsap.set(track, { x: wrap(offset) });
        // Bleed the scroll impulse away so it eases back to the resting speed.
        scrollBoost *= 0.94;
      };

      gsap.ticker.add(tick);

      const st = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          scrollBoost = gsap.utils.clamp(-1400, 1400, self.getVelocity() * 0.35);
        },
      });

      return () => {
        gsap.ticker.remove(tick);
        st.kill();
      };
    },
    { scope: root, dependencies: [speed, reverse] },
  );

  const row = (key: string) => (
    <div key={key} className="flex shrink-0 items-center" aria-hidden={key === "b"}>
      {items.map((item, i) => (
        <span key={`${key}-${i}`} className="flex shrink-0 items-center">
          <span className="px-5 whitespace-nowrap">{item}</span>
          <span className="text-accent/50 px-1 text-[0.6em]">{separator}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div ref={root} className={cn("overflow-hidden", className)}>
      <div data-track className="flex w-max will-change-transform">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
