"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Scroll-linked reading light: the paragraph starts dim and each word lifts to
 * full contrast as it passes through the middle of the viewport. Scrubbed, so
 * scrolling back down dims it again — the reader is driving.
 */
export function ScrollText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const split = new SplitText(root.current!, { type: "words" });

      const tween = gsap.fromTo(
        split.words,
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.4,
          scrollTrigger: {
            trigger: root.current,
            start: "top 78%",
            end: "bottom 58%",
            scrub: 0.6,
          },
        },
      );

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        split.revert();
      };
    },
    { scope: root },
  );

  return (
    <p ref={root} className={cn(className)}>
      {children}
    </p>
  );
}
