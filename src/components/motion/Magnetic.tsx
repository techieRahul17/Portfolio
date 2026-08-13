"use client";

import { useRef } from "react";
import { gsap, useGSAP, hasFinePointer, prefersReducedMotion } from "@/lib/gsap";

/**
 * Pulls its child toward the pointer while hovered, then springs back.
 * The inner element moves further than the wrapper, which is what sells the
 * effect — the label appears to lead the button.
 */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: React.ReactNode;
  /** 0 = inert, 1 = the element sticks to the cursor. */
  strength?: number;
  className?: string;
}) {
  const wrap = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!hasFinePointer() || prefersReducedMotion()) return;

      const el = wrap.current!;
      const inner = el.firstElementChild as HTMLElement | null;

      const xTo = gsap.quickTo(el, "x", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
      const ixTo = inner && gsap.quickTo(inner, "x", { duration: 0.9, ease: "elastic.out(1, 0.4)" });
      const iyTo = inner && gsap.quickTo(inner, "y", { duration: 0.9, ease: "elastic.out(1, 0.4)" });

      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * strength;
        const dy = (e.clientY - (r.top + r.height / 2)) * strength;
        xTo(dx);
        yTo(dy);
        ixTo?.(dx * 0.35);
        iyTo?.(dy * 0.35);
      };

      const onLeave = () => {
        xTo(0);
        yTo(0);
        ixTo?.(0);
        iyTo?.(0);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: wrap, dependencies: [strength] },
  );

  return (
    <span ref={wrap} className={className} style={{ display: "inline-block" }}>
      {children}
    </span>
  );
}
