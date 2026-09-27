"use client";

import { useRef } from "react";
import { gsap, useGSAP, hasFinePointer, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Tilts its child toward the pointer in real 3D, with a specular glare that
 * follows the cursor across the surface — the card feels like an object you
 * could pick up rather than a rectangle on a page.
 *
 * Only on devices with a precise pointer; touch and reduced-motion visitors
 * get the flat card.
 */
export function Tilt({
  children,
  className,
  max = 8,
  glare = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** Maximum tilt, in degrees. */
  max?: number;
  glare?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const shine = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      if (!hasFinePointer() || prefersReducedMotion()) return;

      gsap.set(el, { transformPerspective: 1100, transformStyle: "preserve-3d" });

      const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3" });

      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        rx((0.5 - py) * max * 2);
        ry((px - 0.5) * max * 2);
        if (shine.current) {
          shine.current.style.setProperty("--gx", `${px * 100}%`);
          shine.current.style.setProperty("--gy", `${py * 100}%`);
        }
      };

      const onEnter = () => gsap.to(shine.current, { opacity: 1, duration: 0.4 });
      const onLeave = () => {
        rx(0);
        ry(0);
        gsap.to(shine.current, { opacity: 0, duration: 0.5 });
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerenter", onEnter);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: root, dependencies: [max] },
  );

  return (
    <div ref={root} className={cn("relative will-change-transform", className)}>
      {children}
      {glare && (
        <div
          ref={shine}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 mix-blend-soft-light"
          style={{
            background:
              "radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.55), rgba(255,255,255,0.08) 35%, transparent 65%)",
          }}
        />
      )}
    </div>
  );
}
