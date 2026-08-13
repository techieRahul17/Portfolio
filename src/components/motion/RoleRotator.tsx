"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Cycles a list of titles inside a fixed-height mask — each one slides up and
 * out as the next arrives. Every word is in the DOM, so screen readers and
 * crawlers see the full list; only one is visible at a time.
 */
export function RoleRotator({ items, className }: { items: readonly string[]; className?: string }) {
  const root = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || items.length < 2) return;

      const words = gsap.utils.toArray<HTMLElement>("[data-role]", root.current);
      gsap.set(words, { yPercent: 110 });
      gsap.set(words[0], { yPercent: 0 });

      const tl = gsap.timeline({ repeat: -1, defaults: { duration: 0.8, ease: "voltage" } });

      words.forEach((_, i) => {
        const next = words[(i + 1) % words.length];
        tl.to({}, { duration: 2.1 })
          .to(words[i], { yPercent: -110 })
          .fromTo(next, { yPercent: 110 }, { yPercent: 0 }, "<");
      });

      return () => tl.kill();
    },
    { scope: root, dependencies: [items] },
  );

  return (
    <span
      ref={root}
      className={cn("relative block overflow-hidden", className)}
      // Height comes from the first item so the mask never collapses before JS.
      style={{ height: "1.15em" }}
    >
      {items.map((item, i) => (
        <span
          key={item}
          data-role
          aria-hidden={i !== 0}
          className={cn("block whitespace-nowrap", i !== 0 && "absolute inset-x-0 top-0")}
        >
          {item}
        </span>
      ))}
    </span>
  );
}
